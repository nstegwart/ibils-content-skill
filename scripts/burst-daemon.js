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

const BATCHES = 4;
const SESSIONS_PER_BATCH = 50;
const TOPUP_AT = 20;          // relaunch a batch when <=20 sessions remain
const MODES = ["news", "education", "marketing", "insight"];

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
      `Generate ${n} DISTINCT, specific Indonesian personal-finance content`,
      `topics for an IBILS "${mode}" Instagram carousel. Each topic is a short`,
      `concrete phrase (3-8 words). They must NOT duplicate or closely resemble`,
      `any of these already-used topics:`,
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

function launchSession(mode, topic, account, idx) {
  const out = path.join(WORKDIR, "out", `w${waveNo}-${mode}-${idx}-${Date.now()}`);
  const logFile = path.join(WORKDIR, "logs", `w${waveNo}-${mode}-${idx}.log`);
  const child = spawn("node", [
    path.join(HERE, "run-carousel.js"),
    "--mode", mode, "--topic", topic, "--out", out, "--account", account.email
  ], { stdio: ["ignore", "a", "a"], detached: false });
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
  const jobs = topics.map((t, i) => launchSession(mode, t, account, i));
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
