#!/usr/bin/env node
/**
 * Produce ONE complete IBILS carousel end-to-end, locally.
 *
 *   topic -> (news fetch) -> codex writes plan.json -> lint gate ->
 *   plan -> gen-carousel (1 codex session per slide, parallel) -> finalize
 *
 * Every slide gets its own codex session and they all run in parallel, so one carousel is one
 * command — there is no pool, no rotation, no daemon.
 *
 * Usage:
 *   node run-carousel.js --mode news --topic "rupiah slides against the dollar" \
 *        --out <dir> [--count <4-12>]
 *
 * Output: a finished carousel in <dir> (plan.json + slides/), kept on disk.
 * Prints the output directory on success.
 */
import fs from "node:fs/promises";
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
// content slides 5-7 (carousel = count + cover + closing = 7-9 slides).
// Real human carousels run 6-9 slides total; a 14-slide deck on one narrow
// topic turns repetitive and reads as AI padding.
const COUNT = Math.max(5, Math.min(8, Number(arg("--count", "")) ||
  (5 + Math.floor(Math.random() * 3))));

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

function codex(promptText) {
  return new Promise((resolve) => {
    const args = [
      "exec", "-m", "gpt-5.5",
      "-c", 'model_reasoning_effort="medium"',
      "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check",
      "-C", OUT, "-"
    ];
    const child = spawn("codex", args, {
      cwd: OUT, env: { ...process.env, NO_COLOR: "1" }, stdio: ["pipe", "pipe", "pipe"]
    });
    let buf = "";
    const grab = (d) => {
      buf += d.toString();
      if (buf.length > 200000) buf = buf.slice(-200000);
    };
    child.stdout.on("data", grab);
    child.stderr.on("data", grab);
    const timer = setTimeout(() => child.kill("SIGKILL"), 6 * 60 * 1000);
    child.on("close", async () => {
      clearTimeout(timer);
      resolve({ out: buf });
    });
    child.stdin.end(promptText);
  });
}

// ask codex to write the content plan -> { plan }
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
    "descriptive label. Written in ENGLISH — spoken, second person 'you',",
    "contractions, a few ALL-CAPS punch words, confrontational, real emotional",
    "stakes. The carousel is ONE argument built slide by slide.",
    "CLEAR THE VALUE BAR in content-rules.md: relatable to an ordinary person's",
    "money life, teach ONE real lesson with its WHY, clear takeaway.",
    "NEVER write like an AI: no balanced triplets ('faster, easier, and more",
    "accurate'), no 'unlock/seamless/effortlessly/game-changer', no empty payoffs",
    "('peace of mind', 'financial freedom'), no 'In today's fast-paced world'.",
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
    // The linter parses HEADLINE:/BODY: out of `brief` with a regex. If the shape is not stated
    // HERE, it is only obeyed because the model happened to follow a referenced doc — and when it
    // does not, every slide trips "missing HEADLINE" and the run dies in the gate loop.
    "BRIEF SHAPE — exact, mandatory, both fields on content slides:",
    "  content: brief: 'HEADLINE: \"<hook>\"  BODY: \"<new concrete info>\"'",
    "  cover:   brief: 'HEADLINE: \"<hook>\"'",
    "  closing: brief: 'HEADLINE: \"<short CTA>\"'",
    "A content slide with no BODY is rejected by the linter.",
    `Write ONLY the JSON to the file: ${planPath}`,
    "Shape: {mode,topic,kicker,sources:[],slides:[...]}. Reply DONE when written."
  ].filter(Boolean).join("\n");
  await codex(prompt);
  try {
    const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
    if (Array.isArray(plan.slides) && plan.slides.length >= 6) {
      return { plan };
    }
  } catch {
    /* invalid */
  }
  return { plan: null };
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

// AI critic — second-pass copy review by a codex copy editor. Catches dumb /
// awkward / AI-feeling Indonesian that no static banlist can predict.
// Exit codes: 0 = clean, 1 = FAIL (rewrite), 2 = critic itself errored
// (soft-pass to avoid stalling a whole carousel; lint already gated).
async function criticRun() {
  const planPath = path.join(OUT, "plan.json");
  return execFileP("node", [path.join(HERE, "critic-plan.js"), planPath], { cwd: OUT })
    .then((r) => ({ ok: true, report: r.stdout, soft: false }))
    .catch((e) => {
      const code = e.code ?? 1;
      const report = `${e.stdout || ""}${e.stderr || ""}`.trim();
      // exit 2 = critic itself errored — treat as soft-pass, do not block.
      if (code === 2) return { ok: true, report, soft: true };
      return { ok: false, report };
    });
}

// hand codex the exact linter failures and fix ONLY the flagged slides —
// the 11 good slides of a 12-slide plan are kept, not thrown away.
async function fixPlan(report, articles) {
  const planPath = path.join(OUT, "plan.json");
  const prompt = [
    "The carousel plan.json failed a quality gate. Fix ONLY the flagged slides.",
    "Keep every other slide byte-identical — do NOT renumber, add, or drop slides.",
    "Quality report (each FAIL block names a slide index and the problem;",
    "lines from the copy critic also name the exact phrase and a fix suggestion):",
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

  // 1. source material
  let articles = "";
  if (MODE === "news") {
    articles = await step("news", "news.js", ["--topic", TOPIC, "--limit", "8"]);
  }

  // 2. plan
  let plan = null;
  for (let tryNo = 1; tryNo <= 3 && !plan; tryNo++) {
    const r = await writePlan(articles);
    plan = r.plan;
  }
  if (!plan) throw new Error("plan write failed");

  // 2b. copy-quality gate — TWO layers:
  //   (a) mechanical lint  — banlist phrases, deck-level repeats, etc.
  //   (b) AI critic        — codex copy editor catches awkward / AI-feeling
  //                          Indonesian no banlist can predict.
  // Both must pass. fixPlan rewrites only the flagged slides.
  const reloadPlan = async () => {
    try {
      const p = JSON.parse(await fs.readFile(path.join(OUT, "plan.json"), "utf8"));
      if (Array.isArray(p.slides) && p.slides.length >= 6) plan = p;
    } catch {
      /* a broken rewrite will surface in the next gate pass */
    }
  };
  let gateOk = false;
  for (let attempt = 1; attempt <= 4; attempt++) {
    // (a) mechanical lint
    const lint = await lintRun();
    if (!lint.ok) {
      if (attempt === 4) break;
      await fixPlan(lint.report, articles);
      await reloadPlan();
      continue;
    }
    // (b) AI critic — only meaningful once lint already passes
    const critic = await criticRun();
    if (critic.ok) {
      gateOk = true;
      break;
    }
    if (attempt === 4) break;
    await fixPlan(critic.report, articles);
    await reloadPlan();
  }
  if (!gateOk) throw new Error("plan failed the copy quality gates (lint + critic)");

  // 3. generate + finalise
  await step("gen", "gen-carousel.js", [
    path.join(OUT, "plan.json"), path.join(OUT, "slides")
  ]);
  await step("finalize", "finalize.js", [path.join(OUT, "slides")]);

  // Done. The carousel STAYS on disk.
  //
  // There used to be an upload step here (Google Cloud Storage / Drive) and, right after it, a
  // `fs.rm(OUT, {recursive:true})` that deleted the run's own output — correct only because the
  // work had just been shipped to a bucket. With the upload gone, that cleanup would mean
  // "generate a carousel, then throw it away". It is deliberately NOT here. Runs are local and kept.
  console.log(`\nCAROUSEL DONE: ${OUT}`);
}

main().catch((e) => {
  console.error("ERROR", e.message);
  // Do NOT delete OUT on failure either — a half-finished carousel is exactly what you want to
  // look at when diagnosing why it failed.
  process.exit(1);
});
