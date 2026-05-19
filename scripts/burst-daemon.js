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

// gen-carousel.js renders a carousel's ~16 slides IN PARALLEL across accounts.
// SUSTAINABLE PACING: a carousel costs ~17 codex calls; the ~104-account pool
// refills ~620 image-calls/hr => a ceiling of ~37 carousels/hr. 4x1=4
// concurrent carousels demand ~510 calls/hr — below the refill rate — so the
// pool never fully drains and the burst produces a steady ~25-30 carousels/hr
// nonstop, instead of sawtoothing between a 1h spike and hours of stall.
const BATCHES = 4;
const SESSIONS_PER_BATCH = 1;
const TOPUP_AT = 0;           // relaunch a batch when its session finishes
const MODES = ["news", "education", "marketing", "insight"];

// what a good topic IS, per mode. Aim BIG and substantive — topics that
// genuinely add perspective, never petty one-off chores.
const TOPIC_BRIEF = {
  news:
    "a fresh Indonesian finance-news angle bent to a YOUNG gen-z/milenial " +
    "reader's wallet — their jajan, langganan, anak-kos budget, paylater, " +
    "gaji pertama — never a homeowner's or a family kitchen's",
  education:
    "a substantive financial-literacy lesson on a concept that genuinely " +
    "changes how someone sees money — bunga majemuk, inflasi menggerus " +
    "tabungan, lifestyle inflation, utang baik vs utang buruk, biaya peluang, " +
    "kenapa nabung saja kalah sama inflasi, financial independence — or the " +
    "core idea of a respected finance book (The Psychology of Money, Die With " +
    "Zero, The Richest Man in Babylon). NOT a petty one-off chore",
  marketing:
    "a real Ibils budgeting-app feature framed by the concrete benefit it " +
    "gives the user",
  insight:
    "a BIG-PICTURE issue that affects millions of Indonesians and genuinely " +
    "adds wawasan — middle income trap, apakah kelas menengah Indonesia " +
    "nyata atau sedang tergerus, kenapa kenaikan gaji selalu kalah sama biaya " +
    "hidup, jebakan kemiskinan antar-generasi, kenapa naik kelas ekonomi " +
    "makin sulit, beban sandwich generation, biaya hidup vs upah riil. A " +
    "weighty, research-grounded topic — never a petty daily habit"
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
      `Generate ${n} content topics for an IBILS "${mode}" Instagram carousel.`,
      `AUDIENCE — IBILS users are YOUNG: gen-z and milenial, ~17-32 — fresh`,
      `grad, first-jobber, mahasiswa, freelancer / pekerja gig, gaji UMR or`,
      `gaji pertama. They RENT or live with parents (anak kos / ngontrak) —`,
      `they do NOT own a house. Money life: jajan & nongkrong, kopi, makan di`,
      `luar, ojol, langganan (Spotify/Netflix), paylater & pinjol, cicilan`,
      `HP/gadget, gaji habis sebelum akhir bulan, FOMO / doom spending, side`,
      `hustle, dana darurat, modal usaha kecil.`,
      `Each topic is ${TOPIC_BRIEF[mode] || TOPIC_BRIEF.education}.`,
      `Every topic MUST hit THAT young life — a real 22-year-old feels "ini`,
      `gue". Write a concrete phrase of 4-9 words.`,
      `HARD-EXCLUDE off-target topics:`,
      `- life-stage too far: KPR / beli rumah, dana pensiun, warisan, biaya`,
      `  sekolah / kuliah anak.`,
      `- demographic mismatch: biaya obat / penyakit / rumah sakit / lansia,`,
      `  dana qurban or kondangan as routine spending.`,
      `- region-locked: KRL / MRT / TransJakarta — Jakarta-only. Frame`,
      `  transport as "ongkos ngantor / ojol" for everyone instead.`,
      `- household-mom framing: budget dapur keluarga, harga sembako buat`,
      `  masak. If a price rises, angle it at jajan / langganan / kos budget.`,
      `AIM BIG: pick issues with real impact and depth that genuinely add`,
      `wawasan. REJECT petty one-off chores — "menyiapkan dana sertifikat`,
      `tanah hilang", "uang kondangan", "widget saldo" are exactly the kind`,
      `of small, low-impact topics to avoid.`,
      `A topic is an ANGLE only — it must NOT contain any specific number,`,
      `price, percentage, rupiah amount, or date. Those are unknown until the`,
      `news is fetched later; a number baked into a topic is fabricated and`,
      `will contradict the real figure. e.g. "rupiah melemah bikin langganan`,
      `makin mahal" is OK; "rupiah Rp17.500 ..." is NOT.`,
      `Do NOT duplicate or closely resemble any already-used topic:`,
      recent || "(none yet)",
      `Output EXACTLY ${n} topics, one per line, no numbering, no extra text.`
    ].join("\n");
    const child = spawn("codex", [
      "exec", "-m", "gpt-5.5", "-c", 'model_reasoning_effort="medium"',
      "--dangerously-bypass-approvals-and-sandbox",
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
