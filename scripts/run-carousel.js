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
let ACCOUNT = arg("--account", ""); // resolved from the pool if not given
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

// run codex once, capture stdout
function codex(promptText, account) {
  return new Promise(async (resolve) => {
    const home = path.join(os.tmpdir(), `rc-${nanoid(8)}`);
    if (account) {
      const { provisionCodexHome } = await import("./accounts.js");
      const { discoverAccounts } = await import("./accounts.js");
      const acc = (await discoverAccounts()).find((a) => a.email === account);
      if (acc) await provisionCodexHome(home, acc);
    }
    const args = [
      "exec", "-m", "gpt-5.5",
      "-c", 'model_reasoning_effort="xhigh"', "-c", 'service_tier="fast"',
      "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check",
      "-C", OUT, "-"
    ];
    const env = { ...process.env, NO_COLOR: "1" };
    if (account) env.CODEX_HOME = home;
    const child = spawn("codex", args, { cwd: OUT, env, stdio: ["pipe", "pipe", "ignore"] });
    let buf = "";
    child.stdout.on("data", (d) => (buf += d.toString()));
    const timer = setTimeout(() => child.kill("SIGKILL"), 6 * 60 * 1000);
    child.on("close", async () => {
      clearTimeout(timer);
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
      resolve(buf);
    });
    child.stdin.end(promptText);
  });
}

// ask codex to write the content plan; returns parsed plan or null
async function writePlan(articles) {
  const planPath = path.join(OUT, "plan.json");
  const prompt = [
    "Write an IBILS Instagram carousel content plan as JSON.",
    `mode = ${MODE}. topic = ${TOPIC || "(choose a fresh, specific finance angle)"}.`,
    `Read these skill references in full and obey them:`,
    `- ${path.join(SKILL, "references/content-rules.md")}`,
    MODE === "marketing" ? `- ${path.join(SKILL, "references/ibils-app.md")}` : "",
    articles ? `Live news articles (cite as sources, never invent figures):\n${articles}` : "",
    `Produce: 1 cover + ${COUNT} content slides + 1 closing.`,
    "Every body must add NEW concrete info (action / number / mechanism) — never",
    "restate the headline. No vague payoff phrases, no teaser headlines.",
    `Use kicker exactly: "${KICKERS[MODE] || "Ibils News"}".`,
    "Each slide: { kind, brief, pose }. brief carries the verbatim copy.",
    "pose = Himel's context-matched action; props presented facing the viewer.",
    "closing slide: { kind:'closing', brief:'HEADLINE: \"<short CTA>\"', pose:'...' }.",
    `Write ONLY the JSON to the file: ${planPath}`,
    "Shape: {mode,topic,kicker,sources:[],slides:[...]}. Reply DONE when written."
  ].filter(Boolean).join("\n");
  await codex(prompt, ACCOUNT);
  try {
    const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
    if (Array.isArray(plan.slides) && plan.slides.length >= 6) return plan;
  } catch {
    /* invalid */
  }
  return null;
}

async function step(name, file, args) {
  const r = await execFileP("node", [path.join(HERE, file), ...args], {
    cwd: OUT, env: process.env
  }).catch((e) => ({ stdout: "", stderr: e.message, failed: true }));
  if (r.failed) throw new Error(`${name} failed: ${r.stderr}`);
  return r.stdout;
}

async function main() {
  await fs.mkdir(path.join(OUT, "slides"), { recursive: true });

  // 0. resolve a pool account — never use the (often unauthed) default ~/.codex
  if (!ACCOUNT) {
    const { listUsableAccounts } = await import("./accounts.js");
    const pool = await listUsableAccounts();
    if (!pool.length) {
      console.error("no usable codex account in the pool");
      process.exit(1);
    }
    ACCOUNT = pool[Math.floor(Math.random() * pool.length)].email;
  }

  // 1. source material
  let articles = "";
  if (MODE === "news") {
    try {
      articles = await step("news", "news.js", ["--topic", TOPIC, "--limit", "8"]);
    } catch (e) {
      console.error(`news fetch failed — ${e.message}`);
      process.exit(1);
    }
  }

  // 2. plan (one codex retry if the linter rejects it)
  let plan = await writePlan(articles);
  if (!plan) {
    console.error("plan write failed");
    process.exit(1);
  }
  let lintOk = false;
  for (let attempt = 1; attempt <= 2 && !lintOk; attempt++) {
    try {
      await step("lint", "lint-plan.js", [path.join(OUT, "plan.json")]);
      lintOk = true;
    } catch {
      if (attempt === 1) {
        await writePlan(articles); // codex rewrites once
      }
    }
  }
  if (!lintOk) {
    console.error("plan failed the copy linter twice");
    process.exit(1);
  }

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

main().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});
