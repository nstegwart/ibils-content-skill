#!/usr/bin/env node
/**
 * Infinite carousel burst daemon.
 *
 * Keeps 4 BATCHES running. One batch = 50 carousel sessions launched within a
 * second, tagged to one codex account. One session = one run-carousel.js =
 * one full carousel uploaded to GCS. When a batch finishes — or drops to <=20
 * live sessions — a fresh batch is launched on the next account. Runs forever.
 *
 * No redundant content: every carousel's topic is recorded in a ledger and new
 * topics are generated to avoid anything already used.
 *
 * Usage: node burst-daemon.js [workdir]   (default ~/ibils-burst)
 * Stop:  touch <workdir>/STOP   (finishes in-flight, then exits)
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { listUsableAccounts, provisionCodexHome } from "./accounts.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKDIR = path.resolve(process.argv[2] || path.join(os.homedir(), "ibils-burst"));
const LEDGER = path.join(WORKDIR, "topics-ledger.jsonl");
const STOP = path.join(WORKDIR, "STOP");

// gen-carousel.js renders a carousel's ~16 slides IN PARALLEL, each on its
// own account — one carousel engages ~16 accounts at once. 4x2=8 concurrent
// carousels x ~16 => ~100-130 codex calls in flight: the whole ~106-account
// pool working simultaneously without pinning/hammering any single account.
// More concurrent carousels oversubscribe the pool; fewer leave it idle.
const BATCHES = 4;
const SESSIONS_PER_BATCH = 2;
const TOPUP_AT = 1;           // relaunch a batch when <=1 session remains
const MODES = ["news", "education", "marketing", "insight"];

// what a good topic IS, per mode — keeps the burst off trivial niche topics
const TOPIC_BRIEF = {
  news:
    "a fresh Indonesian finance-news angle and its concrete impact on an " +
    "ordinary reader's wallet",
  education:
    "a substantive personal-finance LESSON — a real money concept (dana " +
    "darurat, bunga majemuk, inflasi gaya hidup, kebutuhan vs keinginan, " +
    "sinking fund, aturan 50/30/20, bayar diri sendiri dulu, biaya peluang, " +
    "utang baik vs buruk) or the core idea of a well-known finance book (Die " +
    "With Zero, The Psychology of Money, The Richest Man in Babylon, Your " +
    "Money or Your Life) — never a trivial one-off expense",
  marketing:
    "a real Ibils budgeting-app feature framed by the concrete benefit it " +
    "gives the user",
  insight:
    "a reflective look at a common Indonesian money habit or pattern and why " +
    "it happens"
};

let modeCursor = 0;
let acctCursor = 0;
let waveNo = 0;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function readLedgerTopics() {
  try {
    return (await fs.readFile(LEDGER, "utf8"))
      .split("\n").filter(Boolean)
      .map((l) => { try { return JSON.parse(l).topic; } catch { return ""; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}
async function appendLedger(mode, topics) {
  const lines = topics.map((t) =>
    JSON.stringify({ at: new Date().toISOString(), mode, topic: t }) + "\n").join("");
  await fs.appendFile(LEDGER, lines);
}

// one codex call → N fresh, unique topics for a mode (deduped vs the ledger)
function genTopics(mode, n, used, account) {
  return new Promise(async (resolve) => {
    const home = path.join(WORKDIR, `.topgen-${Date.now()}`);
    await provisionCodexHome(home, account).catch(() => {});
    const recent = used.slice(-300).join("\n");
    const prompt = [
      `Generate ${n} content topics for an IBILS "${mode}" Instagram carousel`,
      `aimed at an ordinary Indonesian audience (gajian bulanan, gaji UMR, anak`,
      `kos, cicilan, belanja bulanan, nabung, dana darurat, pinjol).`,
      `Each topic is ${TOPIC_BRIEF[mode] || TOPIC_BRIEF.education}.`,
      `Each must be RELATABLE — a real person feels "ini soal uangku" — and`,
      `worth reading, never a petty niche expense. Write a concrete phrase of`,
      `4-9 words, specific enough to teach ONE clear, useful thing.`,
      `Do NOT duplicate or closely resemble any already-used topic:`,
      recent || "(none yet)",
      `Output EXACTLY ${n} topics, one per line, no numbering, no extra text.`
    ].join("\n");
    const child = spawn("codex", [
      "exec", "-m", "gpt-5.5", "-c", 'model_reasoning_effort="xhigh"',
      "-c", 'service_tier="fast"', "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check", "-"
    ], { env: { ...process.env, NO_COLOR: "1", CODEX_HOME: home }, stdio: ["pipe", "pipe", "ignore"] });
    let buf = "";
    child.stdout.on("data", (d) => (buf += d.toString()));
    const timer = setTimeout(() => child.kill("SIGKILL"), 4 * 60 * 1000);
    child.on("close", async () => {
      clearTimeout(timer);
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
      const usedSet = new Set(used.map((t) => t.toLowerCase()));
      const topics = buf.split("\n")
        .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
        .filter((l) => l.length > 6 && l.length < 90 && !usedSet.has(l.toLowerCase()));
      resolve([...new Set(topics)].slice(0, n));
    });
    child.stdin.end(prompt);
  });
}

// Sweep junk a SIGKILL'd session could not clean up itself: leaked codex
// homes in /tmp, dead topic-gen homes, and orphaned out/ dirs. Age cutoffs are
// generous so nothing in-flight is ever touched.
function sweepStale() {
  return new Promise((resolve) => {
    const cmd = [
      "find /tmp -maxdepth 1 \\( -name 'ibils-carousel-*' -o -name 'rc-*' \\)" +
        " -mmin +75 -exec rm -rf {} + 2>/dev/null",
      `find ${WORKDIR} -maxdepth 1 -name '.topgen-*' -mmin +20` +
        " -exec rm -rf {} + 2>/dev/null",
      `find ${WORKDIR}/out -mindepth 1 -maxdepth 1 -mmin +150` +
        " -exec rm -rf {} + 2>/dev/null"
    ].join("; ");
    const c = spawn("bash", ["-c", cmd]);
    c.on("close", () => resolve());
    c.on("error", () => resolve());
  });
}

async function launchSession(mode, topic, idx) {
  // No --account: each run-carousel self-picks a usable account from the pool.
  // Pinning 50 sessions to one account instantly rate-limits it; spreading
  // them across the ~100-account pool keeps sessions productive.
  const out = path.join(WORKDIR, "out", `w${waveNo}-${mode}-${idx}-${Date.now()}`);
  const logFile = path.join(WORKDIR, "logs", `w${waveNo}-${mode}-${idx}.log`);
  const fh = await fs.open(logFile, "a");
  const child = spawn("node", [
    path.join(HERE, "run-carousel.js"),
    "--mode", mode, "--topic", topic, "--out", out
  ], { stdio: ["ignore", fh.fd, fh.fd] });
  child.on("close", () => fh.close().catch(() => {}));
  return child;
}

async function launchBatch(slot, accounts) {
  waveNo++;
  const mode = MODES[modeCursor++ % MODES.length];
  const account = accounts[acctCursor++ % accounts.length];
  const used = await readLedgerTopics();
  const topics = await genTopics(mode, SESSIONS_PER_BATCH, used, account);
  if (!topics.length) {
    log(`batch slot ${slot}: topic generation empty — retry next tick`);
    return null;
  }
  await appendLedger(mode, topics);
  // launch all sessions near-atomically
  const jobs = await Promise.all(
    topics.map((t, i) => launchSession(mode, t, i))
  );
  let alive = jobs.length;
  jobs.forEach((c) => c.on("close", () => { alive--; }));
  log(`batch slot ${slot} WAVE ${waveNo}: ${jobs.length} sessions [${mode}] on ${account.email}`);
  return { slot, mode, account: account.email, jobs, get alive() { return alive; } };
}

async function main() {
  await fs.mkdir(path.join(WORKDIR, "out"), { recursive: true });
  await fs.mkdir(path.join(WORKDIR, "logs"), { recursive: true });
  log(`burst daemon up — workdir ${WORKDIR}, ${BATCHES} batches x ${SESSIONS_PER_BATCH}`);

  const batches = new Array(BATCHES).fill(null);
  for (;;) {
    if (await fs.access(STOP).then(() => true).catch(() => false)) {
      log("STOP file found — no new batches; daemon exiting.");
      break;
    }
    await sweepStale();
    const accounts = await listUsableAccounts();
    if (!accounts.length) {
      log("no usable account — waiting 60s");
      await new Promise((r) => setTimeout(r, 60000));
      continue;
    }
    for (let i = 0; i < BATCHES; i++) {
      if (!batches[i] || batches[i].alive <= TOPUP_AT) {
        if (batches[i]) log(`batch slot ${i}: ${batches[i].alive} left — topping up`);
        batches[i] = (await launchBatch(i, accounts)) || batches[i];
      }
    }
    await new Promise((r) => setTimeout(r, 20000)); // re-check every 20s
  }
}

main().catch((e) => {
  console.error("DAEMON ERROR", e.message);
  process.exit(1);
});
