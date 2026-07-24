#!/usr/bin/env node
/**
 * THE QUEUE RUNNER — render carousels until the codex quota runs out, then stop cleanly.
 *
 *   node scripts/run-queue.mjs <queue.txt> <scripts-root> [--conc 3] [--max 9999]
 *
 * Every rule here was paid for by a failure earlier in this project:
 *
 * ONE RUNNER, ENFORCED BY A LOCK. Three copies of the old shell runner once worked the same deck at
 * once. Each wipes slides/ before re-rendering, so they deleted each other's finished work — the
 * completed count rose, then FELL, and I read the noise as progress for an hour.
 *
 * SUCCESS MEANS EIGHT SLIDES ON DISK. The old runner treated "no FAILED lines" as success. An empty
 * directory also produces no FAILED lines, so it cheerfully reported OK for decks with zero images.
 *
 * QUOTA EXHAUSTION IS A STOP, NOT A RETRY. When codex is out, an attempt burns minutes to produce
 * nothing — measured at 699 seconds for zero slides. Detect it and halt, so the run ends with an
 * answer instead of grinding through the queue failing identically 6000 times.
 *
 * NO `nohup &` FROM A BACKGROUNDED SHELL. That reaps the process group and orphans the children,
 * which keep burning quota with nobody reading them. This is a plain foreground loop; the harness
 * does the backgrounding.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const [QUEUE, ROOT] = pos;
const CONC = Number(flag("--conc", "3"));
const MAX = Number(flag("--max", "99999"));
if (!QUEUE || !ROOT) { console.error("usage: run-queue.mjs <queue.txt> <root> [--conc N] [--max N]"); process.exit(1); }

const LOCK = "/tmp/ibils-carousel-queue.lock";
if (fs.existsSync(LOCK)) {
  const pid = Number(fs.readFileSync(LOCK, "utf8").trim());
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch {}
  if (alive) { console.error(`runner lain masih hidup (pid ${pid}) — menolak jalan dobel`); process.exit(1); }
  console.log(`lock basi dari pid mati ${pid} — diambil alih`);
}
fs.writeFileSync(LOCK, String(process.pid));
const release = () => { try { fs.unlinkSync(LOCK); } catch {} };
process.on("exit", release);
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { release(); process.exit(1); });

const slidesDir = (k) => path.join(ROOT, k, "slides");
const count = (k) => { try { return fs.readdirSync(slidesDir(k)).filter((f) => /^\d.*\.png$/.test(f)).length; } catch { return 0; } };
const done = (k) => count(k) >= 8;

// codex routes through the local 9router proxy, whose provider block declares
// `env_key = "ROUTER9_API_KEY"` — meaning codex reads that key from its own PROCESS environment,
// not from config.toml. config.toml only sets it for shells codex spawns, which is the opposite
// direction. Launch codex from a shell that lacks it and every call dies with "Missing environment
// variable" — a failure that looks exactly like exhausted quota unless you read the message.
function routerKey() {
  if (process.env.ROUTER9_API_KEY) return process.env.ROUTER9_API_KEY;
  try {
    const m = /^ROUTER9_API_KEY\s*=\s*"([^"]+)"/m.exec(
      fs.readFileSync(path.join(process.env.HOME || "", ".codex", "config.toml"), "utf8"));
    return m ? m[1] : "";
  } catch { return ""; }
}
const ENV = { ...process.env, CAROUSEL_IMAGE_MODEL: "cx/gpt-5.5", CAROUSEL_IMAGE_REASONING_EFFORT: "low",
              ROUTER9_API_KEY: routerKey() };
let quotaOut = false;

function run(script, a, ms) {
  const r = spawnSync(process.execPath, [path.join(HERE, script), ...a], { encoding: "utf8", env: ENV, timeout: ms });
  return `${r.stdout || ""}${r.stderr || ""}`;
}
function buildDeck(k) {
  for (let round = 1; round <= 4; round++) {
    const g = run("gen-carousel.js", [path.join(ROOT, k, "plan.json"), slidesDir(k)], 15 * 60 * 1000);
    // DISTINGUISH "OUT OF QUOTA" FROM "CANNOT REACH THE MODEL AT ALL".
    // The first version lumped them together and reported "kuota codex habis" when the real fault
    // was a missing ROUTER9_API_KEY and a proxy with no active account. Telling the owner their
    // quota ran out when it did not sends them to fix the wrong thing — and on an unattended run
    // that misdiagnosis is the only thing they would wake up to.
    if (/No active credentials|Missing environment variable|ECONNREFUSED|404 Not Found/i.test(g)) {
      quotaOut = true;
      return { ok: false, why: "codex tak bisa dihubungi (kredensial/proxy), BUKAN kuota" };
    }
    if (/usage limit|rate.?limit|quota|429|Payment Required|out of credits/i.test(g)) { quotaOut = true; return { ok: false, why: "kuota codex habis" }; }
    if (/failed the copy linter/i.test(g)) return { ok: false, why: "copy linter menolak plan" };
    const f = run("finalize.js", [slidesDir(k)], 10 * 60 * 1000);
    const bad = [...f.matchAll(/^(\S+)\.png: FAILED/gm)].map((m) => m[1]);
    if (bad.length === 0 && done(k)) return { ok: true, rounds: round };
    for (const b of bad) fs.rmSync(path.join(slidesDir(k), `${b}.png`), { force: true });
  }
  return { ok: false, why: "4 ronde masih gagal" };
}

const queue = fs.readFileSync(QUEUE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const todo = queue.filter((k) => !done(k) && fs.existsSync(path.join(ROOT, k, "plan.json"))).slice(0, MAX);
console.log(`ANTRIAN: ${todo.length} deck · ${CONC} paralel · gpt-5.5 low`);
console.log(`mulai ${new Date().toISOString()}\n`);

let i = 0, ok = 0, fail = 0;
const started = Date.now();
const LOGJSON = path.join(path.dirname(QUEUE), "queue-progress.json");

async function worker() {
  while (i < todo.length && !quotaOut) {
    const k = todo[i++];
    if (done(k)) continue;
    fs.rmSync(slidesDir(k), { recursive: true, force: true });   // mulai dari keadaan yang diketahui
    const r = buildDeck(k);
    if (r.ok) { ok++; console.log(`  OK    ${k}  ronde${r.rounds}   [${ok} jadi / ${fail} gagal]`); }
    else {
      fail++;
      console.log(`  GAGAL ${k}  ${r.why}   [${ok} jadi / ${fail} gagal]`);
      if (quotaOut) break;
    }
    const mins = (Date.now() - started) / 60000;
    fs.writeFileSync(LOGJSON, JSON.stringify({ ok, fail, menit: +mins.toFixed(1),
      deck_per_menit: +(ok / Math.max(mins, .01)).toFixed(2), sisa: todo.length - i,
      quota_habis: quotaOut, update: new Date().toISOString() }, null, 1));
    if ((ok + fail) % 10 === 0)
      console.log(`  --- ${ok} jadi / ${mins.toFixed(0)} menit = ${(ok / Math.max(mins, .01)).toFixed(1)} deck/menit · sisa ${todo.length - i} ---`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));

const mins = (Date.now() - started) / 60000;
console.log(`\nSELESAI ${new Date().toISOString()}`);
console.log(`  jadi  : ${ok}\n  gagal : ${fail}\n  waktu : ${mins.toFixed(0)} menit`);
console.log(quotaOut ? "  BERHENTI: codex tidak tersedia (lihat baris GAGAL terakhir untuk sebabnya)" : "  antrian selesai / batas tercapai");
release();
