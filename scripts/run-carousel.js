#!/usr/bin/env node
/**
 * Produce ONE complete IBILS carousel end-to-end and upload it to GCS.
 *
 *   topic -> (news fetch) -> codex writes plan.json -> lint gate ->
 *   gen-carousel (per-slide) -> finalize -> gcs-upload
 *
 * This is the unit a burst session runs. burst-daemon.js launches many of
 * these in parallel.
 *
 * Usage:
 *   node run-carousel.js --mode news --topic "rupiah melemah" \
 *        --out <dir> [--account <email>] [--count <4-12>]
 *
 * Output: a finished carousel in <dir> (plan.json + slides/), uploaded to
 * gs://<bucket>/<content-id>/. Prints the content-id on success.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  discoverAccounts, listUsableAccounts, provisionCodexHome,
  markExhausted, isRateLimited, isAuthDead
} from "./accounts.js";

const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.join(HERE, "..");

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const MODE = arg("--mode", "news");
const TOPIC = arg("--topic", "");
const OUT = path.resolve(arg("--out", `./carousel-${MODE}-${Date.now()}`));
let ACCOUNT = arg("--account", ""); // resolved/rotated from the pool
const triedAccounts = new Set();    // accounts already used (or burned) this run
// content slides 4-12 (carousel = count + cover + closing)
const COUNT = Math.max(4, Math.min(12, Number(arg("--count", "")) ||
  (4 + Math.floor(Math.random() * 9))));

const KICKERS = {
  news: "Ibils News", education: "Ibils Education",
  marketing: "Ibils App", insight: "Ibils Insight"
};

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 40) || "carousel";
}
function nanoid(n = 6) {
  const a = "0123456789abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

// pick a usable pool account not already tried this run
async function pickAccount() {
  const pool = (await listUsableAccounts())
    .filter((a) => !triedAccounts.has(a.email));
  const choice = pool[Math.floor(Math.random() * pool.length)];
  return choice ? choice.email : null;
}

// run codex once as the current ACCOUNT; capture output -> { out, dead }.
// `dead` means the account is rate-limited / auth-dead and should be rotated.
function codex(promptText) {
  return new Promise((resolve) => {
    (async () => {
      const home = path.join(os.tmpdir(), `rc-${nanoid(8)}`);
      const acc = (await discoverAccounts()).find((a) => a.email === ACCOUNT);
      if (acc) await provisionCodexHome(home, acc);
      const args = [
        "exec", "-m", "gpt-5.5",
        "-c", 'model_reasoning_effort="xhigh"', "-c", 'service_tier="fast"',
        "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check",
        "-C", OUT, "-"
      ];
      const env = { ...process.env, NO_COLOR: "1", CODEX_HOME: home };
      const child = spawn("codex", args, {
        cwd: OUT, env, stdio: ["pipe", "pipe", "pipe"]
      });
      let buf = "";
      let killedForLimit = false;
      const grab = (d) => {
        buf += d.toString();
        if (buf.length > 200000) buf = buf.slice(-200000);
        // kill a rate-limited / auth-dead call immediately instead of letting
        // it hang to the 6-min timeout — the plan stage then rotates fast.
        if (!killedForLimit && (isRateLimited(buf) || isAuthDead(buf))) {
          killedForLimit = true;
          child.kill("SIGKILL");
        }
      };
      child.stdout.on("data", grab);
      child.stderr.on("data", grab);
      const timer = setTimeout(() => child.kill("SIGKILL"), 6 * 60 * 1000);
      child.on("close", async () => {
        clearTimeout(timer);
        await fs.rm(home, { recursive: true, force: true }).catch(() => {});
        resolve({ out: buf, dead: isRateLimited(buf) || isAuthDead(buf) });
      });
      child.stdin.end(promptText);
    })();
  });
}

// ask codex to write the content plan -> { plan, dead }
async function writePlan(articles) {
  const planPath = path.join(OUT, "plan.json");
  const prompt = [
    "Write an IBILS Instagram carousel content plan as JSON.",
    `mode = ${MODE}. topic = ${TOPIC || "(choose a fresh, specific finance angle)"}.`,
    `Read these skill references IN FULL and obey them:`,
    `- ${path.join(SKILL, "references/example-carousels.md")}  <-- READ FIRST`,
    `- ${path.join(SKILL, "references/content-rules.md")}`,
    MODE === "marketing" ? `- ${path.join(SKILL, "references/ibils-app.md")}` : "",
    articles ? `Live news articles (cite as sources, never invent figures):\n${articles}` : "",
    `Produce: 1 cover + ${COUNT} content slides + 1 closing.`,
    "IMITATE example-carousels.md. Those are real human carousels — your hooks,",
    "voice, and rhythm MUST match their punch. Every headline is a command, a",
    "warning, a myth it kills, a shock number, or a fear question — NEVER a flat",
    "descriptive label. Spoken Bahasa Indonesia, address the reader as 'kamu',",
    "casual (nggak/kalo/doang), a few ALL-CAPS punch words, confrontational,",
    "real emotional stakes. The carousel is ONE argument built slide by slide.",
    "CLEAR THE VALUE BAR in content-rules.md: relatable to an ordinary",
    "Indonesian's money life, teach ONE real lesson with its WHY, clear takeaway.",
    "For education mode, anchor the lesson in a real, well-known finance-book",
    "idea (named plainly).",
    "Every body adds NEW concrete info (action / number / mechanism) — never",
    "restate the headline. No vague payoff phrases, no teaser headlines, no hedge",
    "words, no forced wordplay. Numbers must be consistent everywhere.",
    "FINAL CHECK before you output: re-read every headline — if any is flatter",
    "or more 'AI-generated' than the example carousels, REWRITE it. If you would",
    "not screenshot this and send it to a friend, the angle is too weak.",
    `Use kicker exactly: "${KICKERS[MODE] || "Ibils News"}".`,
    "Each slide: { kind, brief, pose }. brief carries the verbatim copy.",
    "pose = Himel's context-matched action; props presented facing the viewer.",
    "closing slide: { kind:'closing', brief:'HEADLINE: \"<short CTA>\"', pose:'...' }.",
    `Write ONLY the JSON to the file: ${planPath}`,
    "Shape: {mode,topic,kicker,sources:[],slides:[...]}. Reply DONE when written."
  ].filter(Boolean).join("\n");
  const r = await codex(prompt);
  try {
    const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
    if (Array.isArray(plan.slides) && plan.slides.length >= 6) {
      return { plan, dead: false };
    }
  } catch {
    /* invalid */
  }
  return { plan: null, dead: r.dead };
}

async function step(name, file, args) {
  const r = await execFileP("node", [path.join(HERE, file), ...args], {
    cwd: OUT, env: process.env
  }).catch((e) => ({ stdout: "", stderr: e.message, failed: true }));
  if (r.failed) throw new Error(`${name} failed: ${r.stderr}`);
  return r.stdout;
}

// run the copy linter and capture its report -> { ok, report }
async function lintRun() {
  const planPath = path.join(OUT, "plan.json");
  return execFileP("node", [path.join(HERE, "lint-plan.js"), planPath], { cwd: OUT })
    .then((r) => ({ ok: true, report: r.stdout }))
    .catch((e) => ({ ok: false, report: `${e.stdout || ""}${e.stderr || ""}`.trim() }));
}

// hand codex the exact linter failures and fix ONLY the flagged slides —
// the 11 good slides of a 12-slide plan are kept, not thrown away.
async function fixPlan(report, articles) {
  const planPath = path.join(OUT, "plan.json");
  const prompt = [
    "The carousel plan.json failed the copy linter. Fix ONLY the flagged slides.",
    "Keep every other slide byte-identical — do NOT renumber, add, or drop slides.",
    "Linter report (each FAIL block names a slide index and the problem):",
    report,
    "Rewrite rules for the flagged slides:",
    "- A content BODY must add NEW concrete info: a real action to take, a",
    "  number/timeframe, or an explained cause — never restate the headline.",
    "- No vague payoff phrases, no teaser headlines.",
    "- Stay factual; never invent a figure that is not in the sources.",
    articles ? `Sources (cite, never invent figures):\n${articles}` : "",
    `Rewrite ${planPath} in place as valid JSON. Reply DONE when written.`
  ].filter(Boolean).join("\n");
  await codex(prompt);
}

async function main() {
  await fs.mkdir(path.join(OUT, "slides"), { recursive: true });

  // 0. resolve a usable pool account. The daemon no longer pins one account
  //    to a 50-session wave, so each session self-picks — spreading load
  //    across the pool instead of instantly rate-limiting one account.
  if (ACCOUNT) triedAccounts.add(ACCOUNT);
  const usableNow = (await listUsableAccounts()).map((a) => a.email);
  if (!ACCOUNT || !usableNow.includes(ACCOUNT)) ACCOUNT = await pickAccount();
  if (!ACCOUNT) throw new Error("no usable codex account in the pool");

  // 1. source material
  let articles = "";
  if (MODE === "news") {
    articles = await step("news", "news.js", ["--topic", TOPIC, "--limit", "8"]);
  }

  // 2. plan — codex accounts rate-limit, so rotate accounts until one writes a
  //    valid plan (a burned account is marked exhausted so the pool drains).
  let plan = null;
  for (let tryNo = 1; tryNo <= 4 && !plan; tryNo++) {
    triedAccounts.add(ACCOUNT);
    const r = await writePlan(articles);
    plan = r.plan;
    if (!plan && tryNo < 4) {
      if (r.dead) await markExhausted(ACCOUNT).catch(() => {});
      const next = await pickAccount();
      if (!next) break;
      ACCOUNT = next;
    }
  }
  if (!plan) throw new Error("plan write failed");

  // 2b. copy-quality gate — targeted rewrites of only the flagged slides
  let lintOk = false;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const lint = await lintRun();
    if (lint.ok) {
      lintOk = true;
      break;
    }
    if (attempt === 4) break;
    await fixPlan(lint.report, articles);
    try {
      const p = JSON.parse(await fs.readFile(path.join(OUT, "plan.json"), "utf8"));
      if (Array.isArray(p.slides) && p.slides.length >= 6) plan = p;
    } catch {
      /* a broken rewrite will be caught by the next lint pass */
    }
  }
  if (!lintOk) throw new Error("plan failed the copy linter");

  // 3. generate + finalise
  const genArgs = [path.join(OUT, "plan.json"), path.join(OUT, "slides")];
  if (ACCOUNT) genArgs.push("--account", ACCOUNT);
  await step("gen", "gen-carousel.js", genArgs);
  await step("finalize", "finalize.js", [path.join(OUT, "slides")]);

  // 4. upload
  const contentId =
    `${new Date().toISOString().slice(0, 10)}-${slug(plan.topic || TOPIC || MODE)}-${nanoid()}`;
  await step("upload", "gcs-upload.js", [OUT, contentId]);
  console.log(`CAROUSEL DONE: ${contentId}`);
}

main()
  .then(async () => {
    // carousel is safely in GCS — drop the local copy so the burst disk
    // never fills up with finished work.
    await fs.rm(OUT, { recursive: true, force: true }).catch(() => {});
  })
  .catch(async (e) => {
    console.error("ERROR", e.message);
    await fs.rm(OUT, { recursive: true, force: true }).catch(() => {});
    process.exit(1);
  });
