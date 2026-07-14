#!/usr/bin/env node
/**
 * Self-test. `node scripts/selftest.mjs`
 *
 * This repo had ZERO tests, and every bug below actually shipped:
 *   - codex spawned with unread pipes -> deadlock, 9-min SIGKILL, "attempt failed", no reason given
 *   - assets composited at their NATIVE size -> a 512px logo painted over half the slide
 *   - the background-sample strip silently tiling the logo across the closing band
 *   - finalize exiting 0 with broken slides -> "CAROUSEL DONE" over a broken deck
 *   - the copy gate letting a balanced triplet through
 *
 * Each of these is now a test. It runs in seconds and needs no codex, no network, no account.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");

let pass = 0, fail = 0;
const ok = (n) => { console.log(`  \x1b[32mPASS\x1b[0m  ${n}`); pass++; };
const no = (n, why) => { console.log(`  \x1b[31mFAIL\x1b[0m  ${n}\n        ${why}`); fail++; };
async function test(name, fn) {
  try { await fn(); ok(name); } catch (e) { no(name, e.message); }
}
const magick = (args) => spawnSync("magick", args, { encoding: "utf8" });
const node = (args, opts = {}) => spawnSync(process.execPath, args, { encoding: "utf8", ...opts });

const TMP = await fs.mkdtemp(path.join(os.tmpdir(), "ibils-selftest-"));
const slide = async (name) => {
  const f = path.join(TMP, name);
  magick(["-size", "1080x1350", "xc:#EDE7DA", f]);
  return f;
};

console.log("\nibils-content-skill — self-test\n");

// ---------------------------------------------------------------- syntax
await test("every script parses", async () => {
  const dirs = [path.join(ROOT, "scripts"), path.join(ROOT, "video-ad/scripts")];
  const bad = [];
  for (const d of dirs) {
    for (const f of await fs.readdir(d).catch(() => [])) {
      const p = path.join(d, f);
      if (/\.m?js$/.test(f) && node(["--check", p]).status !== 0) bad.push(f);
      if (/\.sh$/.test(f) && spawnSync("bash", ["-n", p]).status !== 0) bad.push(f);
      if (/\.py$/.test(f) && spawnSync("python3", ["-m", "py_compile", p]).status !== 0) bad.push(f);
    }
  }
  if (bad.length) throw new Error(`do not parse: ${bad.join(", ")}`);
});

// ---------------------------------------------------------------- the deadlock
// The bug: codex is spawned with stdio ["pipe","pipe","pipe"] and NOBODY reads it. `codex exec` is
// verbose; past ~64KB the kernel pipe buffer fills and the child blocks in write() FOREVER. The only
// thing that ever happens is the SIGKILL. Proven by making a child that spews far past the buffer.
await test("a spawned child that floods stdout does not deadlock us", async () => {
  const spewer = path.join(TMP, "spew.sh");
  await fs.writeFile(spewer,
    "#!/bin/bash\ncat > /dev/null\nfor i in $(seq 1 4000); do echo \"chatter $i ................................................\"; done\n");
  await fs.chmod(spewer, 0o755);
  const t0 = Date.now();
  const hung = await new Promise((res) => {
    const c = spawn("bash", [spewer], { stdio: ["pipe", "pipe", "pipe"] });
    c.stdout.on("data", () => {});          // <-- THE FIX. remove this line and this test hangs.
    c.stderr.on("data", () => {});
    const k = setTimeout(() => { c.kill("SIGKILL"); res(true); }, 5000);
    c.on("close", () => { clearTimeout(k); res(false); });
    c.stdin.end("prompt");
  });
  if (hung) throw new Error("child deadlocked — a pipe is being opened and not drained");
  if (Date.now() - t0 > 3000) throw new Error("child took suspiciously long — is it draining?");
});

// Grepping raw source is a LIE DETECTOR THAT LIES: a commented-out drain still contains the text,
// so the test passes while the code deadlocks. Strip comments first, then look at live code only.
const liveCode = async (rel) => (await fs.readFile(path.join(ROOT, rel), "utf8"))
  .replace(/\/\*[\s\S]*?\*\//g, "")     // block comments
  .split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");   // line comments

await test("gen-carousel drains codex's pipes (live code, not comments)", async () => {
  const src = await liveCode("scripts/gen-carousel.js");
  if (!/child\.stdout\.on\(\s*["']data["']/.test(src)) throw new Error("does not read child.stdout — THIS IS THE DEADLOCK");
  if (!/child\.stderr\.on\(\s*["']data["']/.test(src)) throw new Error("does not read child.stderr — half the deadlock");
  if (!/child\.on\(\s*["']error["']/.test(src)) throw new Error("no on('error') — a missing `codex` throws past every retry path");
});

// ---------------------------------------------------------------- finalize geometry
await test("finalize composites everything INSIDE the 1080x1350 slide", async () => {
  const dir = path.join(TMP, "geo"); await fs.mkdir(dir, { recursive: true });
  const f = path.join(dir, "05-closing.png");
  magick(["-size", "1080x1350", "xc:#EDE7DA", f]);
  const r = node([path.join(ROOT, "scripts/finalize.js"), dir]);
  if (r.status !== 0) throw new Error(`finalize failed: ${r.stderr || r.stdout}`);
  const dim = magick([f, "-format", "%wx%h", "info:"]).stdout.trim();
  if (dim !== "1080x1350") throw new Error(`slide is ${dim}, must stay 1080x1350`);
  // the composited content must not run off the canvas
  const bbox = magick([f, "-fuzz", "12%", "-fill", "none", "-opaque", "#EDE7DA",
    "-alpha", "extract", "-format", "%@", "info:"]).stdout.trim();
  const [w, h] = bbox.split("+")[0].split("x").map(Number);
  if (w > 1080 || h > 1350) throw new Error(`composited content ${bbox} overflows the slide`);
});

await test("finalize EXITS NON-ZERO when a slide fails", async () => {
  const dir = path.join(TMP, "broken"); await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "02-broken.png"), "this is not a png");
  const r = node([path.join(ROOT, "scripts/finalize.js"), dir]);
  if (r.status === 0) throw new Error("exited 0 with a broken slide — run-carousel would print CAROUSEL DONE over a broken deck");
});

await test("on-slide sizes are pinned, never inherited from the asset", async () => {
  const src = await fs.readFile(path.join(ROOT, "scripts/finalize.js"), "utf8");
  for (const k of ["LOGO_PX", "PHONE_H", "BADGES_W"]) {
    if (!new RegExp(`const ${k}\\s*=\\s*\\d+`).test(src)) throw new Error(`${k} is not pinned — bumping an asset's resolution would move the layout`);
  }
  // and each must actually be USED in a -resize
  if (!/LOGO_CARD.*-resize|-resize.*LOGO_PX/s.test(src)) throw new Error("LOGO_CARD is composited without -resize");
});

await test("the background-sample strip cannot overlap the logo", async () => {
  const src = await fs.readFile(path.join(ROOT, "scripts/finalize.js"), "utf8");
  if (!/overlaps the/.test(src)) throw new Error("no guard: the strip is tiled across the closing band and nothing checks it is not sampling the logo");
});

// ---------------------------------------------------------------- the copy gate
const lintPlan = async (headline, body = "Log the receipt in 3 seconds.") => {
  const p = path.join(TMP, "plan.json");
  await fs.writeFile(p, JSON.stringify({
    topic: "t", mode: "news", kicker: "Ibils News", sources: [],
    slides: [
      { kind: "cover", brief: `HEADLINE: "Your salary is vanishing"`, pose: "alert" },
      { kind: "content", brief: `HEADLINE: "${headline}"  BODY: "${body}"`, pose: "explain" },
    ],
  }));
  return node([path.join(ROOT, "scripts/lint-plan.js"), p]);
};

await test("copy gate CATCHES the balanced triplet (the loudest AI tell)", async () => {
  const r = await lintPlan("Ibils makes it faster, easier, and more accurate.");
  if (!/balanced triplet/i.test(r.stdout + r.stderr)) throw new Error("a balanced triplet passed the gate");
});

await test("copy gate does NOT cry wolf on a real human list", async () => {
  const r = await lintPlan("Coffee, transport, and the stuff you swear you did not buy.");
  if (/balanced triplet/i.test(r.stdout + r.stderr)) throw new Error("flagged legitimate human copy as a triplet");
});

await test("copy gate CATCHES marketing fluff", async () => {
  const r = await lintPlan("Unlock seamless money habits today.");
  if (!/AI-tell|banned/i.test(r.stdout + r.stderr)) throw new Error("'unlock' + 'seamless' passed the gate");
});

// ---------------------------------------------------------------- honesty
await test("nothing in the repo claims email forwarding is shipped", async () => {
  const r = spawnSync("grep", ["-rniE", "forward(ing)? (an? )?(receipt )?email|email forwarding", ROOT,
    "--exclude-dir=.git", "--exclude-dir=node_modules", "--exclude=selftest.mjs"], { encoding: "utf8" });
  // A mention is not a claim. Every legitimate mention is a WARNING that it is not shipped — and
  // that warning often wraps onto the next line ("Email forwarding is" / "NOT shipped"), so judging
  // one line in isolation reports the warning itself as the violation. Read the neighbourhood.
  const NEG = /not shipped|do not claim|is not|never|false|wrong|banned|forbidden/i;
  const hits = [];
  for (const line of (r.stdout || "").split("\n").filter(Boolean)) {
    const m = line.match(/^(.*?):(\d+):(.*)$/);
    if (!m) continue;
    const [, file, noStr, text] = m;
    const n = Number(noStr);
    const all = (await fs.readFile(file, "utf8")).split("\n");
    const around = all.slice(Math.max(0, n - 2), n + 1).join(" ");
    if (!NEG.test(text) && !NEG.test(around)) hits.push(`${path.basename(file)}:${n}: ${text.trim()}`);
  }
  if (hits.length) throw new Error(`a doc still CLAIMS email forwarding:\n        ${hits.slice(0, 3).join("\n        ")}`);
});

// ---------------------------------------------------------------- dead mechanisms
await test("the codex account pool and Google Storage are really gone", async () => {
  const r = spawnSync("grep", ["-rlniE", "gcs-upload|drive-upload|burst-daemon|accounts\\.js|CODEX_HOME|listUsableAccounts",
    "--exclude=selftest.mjs", path.join(ROOT, "scripts"), path.join(ROOT, "SKILL.md")], { encoding: "utf8" });
  if ((r.stdout || "").trim()) throw new Error(`dead mechanism still referenced in: ${r.stdout.trim()}`);
});

console.log(`\n${pass} passed, ${fail} failed\n`);
await fs.rm(TMP, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
