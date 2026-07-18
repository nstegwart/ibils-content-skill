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

await test("finalize cover-crops native 2:3 output instead of adding side rails", async () => {
  const dir = path.join(TMP, "two-three"); await fs.mkdir(dir, { recursive: true });
  const f = path.join(dir, "03-content.png");
  // Alternating edge stripes make the old pad/extent bug unmistakable. A
  // correct cover crop keeps textured source pixels at both outer edges; the
  // old implementation sampled one corner colour and created uniform rails.
  magick(["-size", "1024x1536", "xc:#0E3B33", "-fill", "#FF0000",
    "-draw", "rectangle 0,0 15,767 rectangle 1008,0 1023,767",
    "-fill", "#F2A93B",
    "-draw", "rectangle 0,768 15,1535 rectangle 1008,768 1023,1535", f]);
  const r = node([path.join(ROOT, "scripts/finalize.js"), dir], {
    env: { ...process.env, FORCE_LOGO: "1" },
  });
  if (r.status !== 0) throw new Error(`finalize failed: ${r.stderr || r.stdout}`);
  const edgeStats = magick([f, "-crop", "12x1000+0+175", "+repage",
    "-format", "%[fx:standard_deviation]", "info:"]).stdout.trim();
  if (Number(edgeStats) < 0.05) {
    throw new Error(`2:3 source became a uniform side rail: stddev=${edgeStats}`);
  }
});

await test("finalize rejects a model-drawn right sidebar", async () => {
  const dir = path.join(TMP, "drawn-rail"); await fs.mkdir(dir, { recursive: true });
  const f = path.join(dir, "03-content.png");
  magick(["-size", "1080x1350", "xc:#0E3B33", "-fill", "#173F38",
    "-draw", "rectangle 920,0 1079,1349", f]);
  const r = node([path.join(ROOT, "scripts/finalize.js"), dir]);
  if (r.status === 0 || !/right-side rail/i.test(r.stdout + r.stderr)) {
    throw new Error("a full-height generated sidebar passed finalization");
  }
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

await test("global footer resolves a real font file", async () => {
  const src = await fs.readFile(path.join(ROOT, "scripts/finalize.js"), "utf8");
  if (!/CAROUSEL_FONT/.test(src) || !/resolveFooterFont/.test(src)) {
    throw new Error("global footer still relies on an unverified ImageMagick font alias");
  }
});

await test("closing keeps the hardened two-column collision gate", async () => {
  const src = await fs.readFile(path.join(ROOT, "scripts/finalize.js"), "utf8");
  if (!/EdgeIn/.test(src) || !/TYPE_COL/.test(src)) {
    throw new Error("closing lost its edge-based phone-zone collision gate");
  }
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

// ---------------------------------------------------------------- the new format gates
const writeJson = async (name, obj) => {
  const f = path.join(TMP, name);
  await fs.writeFile(f, JSON.stringify(obj));
  return f;
};
const lintScript = (kind, f) => node([path.join(ROOT, "runtime/lint-script.mjs"), kind, f]);

await test("comedy gate KILLS an even-timed joke (the metronome death)", async () => {
  const f = await writeJson("c1.json", {
    register: "lo-gue", punch_mechanism: 1, punch_word: "transaksi",
    beats: [
      { beat: "SETUP", lines: [
        { id: "L1", text: "Gue orangnya hemat.", est_seconds: 2.8, visual: "a guy at a warung" },
        { id: "L2", text: "Jajan dikit banget.", est_seconds: 2.7, visual: "bare table" }]},
      { beat: "PRE_PUNCH", lines: [{ id: "L3", text: "Paling kopi doang.", est_seconds: 2.9, visual: "he sips" }]},
      { beat: "PUNCH", lines: [{ id: "L4", text: "Empat puluh tujuh transaksi.", est_seconds: 1.4,
        pause_after_ms: 1000, visual: "a till roll unspooling out the door" }]},
    ],
  });
  const out = lintScript("comedy", f).stdout;
  if (!/C5:.*pre-punch/i.test(out)) throw new Error("an evenly-timed joke passed — the metronome death is unchecked");
});

await test("comedy gate KILLS a picture that illustrates the line (no gap = no joke)", async () => {
  const f = await writeJson("c2.json", {
    register: "lo-gue", punch_mechanism: 1, punch_word: "transaksi",
    beats: [
      { beat: "SETUP", lines: [
        { id: "L1", text: "Gue hemat.", est_seconds: 2.6, visual: "a guy" },
        { id: "L2", text: "Jajan dikit.", est_seconds: 2.9, visual: "bare table" }]},
      { beat: "PRE_PUNCH", lines: [{ id: "L3", text: "Kopi doang.", est_seconds: 4.4, visual: "he freezes" }]},
      { beat: "PUNCH", lines: [{ id: "L4", text: "Empat puluh tujuh transaksi.", est_seconds: 1.4,
        pause_after_ms: 1000, visual: "a phone showing 47 transaksi" }]},   // <- illustrating it
    ],
  });
  const out = lintScript("comedy", f).stdout;
  if (!/C7:.*illustrat/i.test(out)) throw new Error("the punch picture illustrated the punch line and passed");
});

await test("comedy gate PASSES a correctly built joke", async () => {
  const f = await writeJson("c3.json", {
    register: "lo-gue", punch_mechanism: 1, punch_word: "transaksi",
    beats: [
      { beat: "SETUP", lines: [
        { id: "L1", text: "Gue orangnya hemat.", est_seconds: 2.6, visual: "a guy at a warung, calm" },
        { id: "L2", text: "Sebulan ini jajan dikit banget.", est_seconds: 2.9, visual: "he shrugs, table bare" }]},
      { beat: "PRE_PUNCH", lines: [{ id: "L3", text: "Paling cuma kopi sama minimarket.", est_seconds: 4.4,
        visual: "he holds the pose, frozen mid-sip" }]},
      { beat: "PUNCH", lines: [{ id: "L4", text: "Empat puluh tujuh transaksi.", est_seconds: 1.4,
        pause_after_ms: 1000, visual: "a paper till roll unspooling across the floor and out the door" }]},
    ],
  });
  const r = lintScript("comedy", f);
  if (r.status !== 0) throw new Error(`a correct joke was rejected:\n${r.stdout}`);
});

await test("story gate KILLS an isochronous edit (the screensaver rhythm)", async () => {
  const mk = (n, fn, conn, stake, dur) => ({ n, function: fn, connector: conn, stake, dur,
    location: "kos", vo: "x", visual: "she waits" });
  const f = await writeJson("s1.json", {
    want: "Rp 1.2 juta for the kos deposit by Friday", arc_direction: "dark_to_light",
    scenes: [mk(1, "setup", null, 1, 6), mk(2, "escalation", "THEREFORE", 2, 6),
             mk(3, "escalation", "BUT", 3, 6), mk(4, "escalation", "BUT", 4, 6),
             mk(5, "turn", "BUT", 5, 6), mk(6, "resolution", "THEREFORE", 5, 6)],
  });
  const out = lintScript("story", f).stdout;
  if (!/S7:.*coefficient of variation/i.test(out)) throw new Error("every scene the same length and it passed");
});

await test("story gate KILLS 'AND THEN' and a narrated moral", async () => {
  const f = await writeJson("s2.json", {
    want: "Rp 1.2 juta by Friday", arc_direction: "dark_to_light",
    scenes: [
      { n: 1, function: "setup", connector: null, stake: 1, dur: 6, location: "kos", vo: "a", visual: "b" },
      { n: 2, function: "escalation", connector: "AND", stake: 2, dur: 5, location: "kos", vo: "a", visual: "b" },
      { n: 3, function: "escalation", connector: "BUT", stake: 3, dur: 4, location: "kos", vo: "a", visual: "b" },
      { n: 4, function: "turn", connector: "BUT", stake: 5, dur: 8, location: "kos", vo: "a", visual: "b" },
      { n: 5, function: "resolution", connector: "THEREFORE", stake: 5, dur: 7, location: "kos",
        vo: "Sekarang gue sadar semuanya.", visual: "b" },
    ],
  });
  const out = lintScript("story", f).stdout;
  if (!/S1:.*AND/i.test(out)) throw new Error("an AND-THEN connector passed");
  if (!/S10:.*moral/i.test(out)) throw new Error("a narrated moral passed");
});

await test("no generator hardcodes an IG handle (it is surface-derived)", async () => {
  // 48 of the first 64 English slides shipped stamped @ibils.savy — not the English account —
  // because the handle was a string literal and the skill had no concept of a surface.
  const src = await liveCode("scripts/gen-carousel.js");
  if (/@ibils\.savy/.test(src)) throw new Error("gen-carousel.js hardcodes @ibils.savy — English content posts to @ibils.global");
  if (!/IG_HANDLE/.test(src)) throw new Error("gen-carousel.js does not derive the handle from the surface");
  const table = await fs.readFile(path.join(ROOT, "references/surfaces.md"), "utf8").catch(() => "");
  if (!/@ibils\.global/.test(table)) throw new Error("references/surfaces.md does not name the English account");
  // Indonesian content carries NO handle at all (owner, 2026-07-14) — not @ibils.savy, not a blank.
  if (!/Indonesian[\s\S]*?NONE/i.test(table)) throw new Error("surfaces.md does not say Indonesian content carries NO handle");
  if (!/LANG === "id" \? "" :/.test(src)) throw new Error("gen-carousel.js does not drop the handle for Indonesian content");
});

await test("RECEIPT LAW kills a deck with nothing in it", async () => {
  const f = await writeJson("empty.json", { topic:"t", mode:"insight", kicker:"Ibils", sources:[], slides:[
    { kind:"cover",   brief:'HEADLINE: "Why you overspend — and how to stop"' },
    { kind:"content", brief:'HEADLINE: "Your brain forgets"  BODY: "You forget what you spent, so you spend again."' },
    { kind:"content", brief:'HEADLINE: "The fix is awareness"  BODY: "See the pattern and it loses its grip."' },
    { kind:"closing", brief:'HEADLINE: "Start today"' }]});
  const out = node([path.join(ROOT, "scripts/lint-plan.js"), f]).stdout;
  if (!/NO NEW RECEIPT/.test(out)) throw new Error("a deck carrying zero facts passed the gate");
  if (!/defers with no anchor/.test(out)) throw new Error("a cover that defers on nothing passed");
});

await test("RECEIPT LAW passes a deck built on real facts", async () => {
  const f = await writeJson("rich.json", { topic:"paylater", mode:"news", kicker:"Ibils", sources:["OJK"], slides:[
    { kind:"cover",   brief:'HEADLINE: "Paylater lends you Rp2 juta at 0%. So who pays?"  BODY: "OJK logged Rp30,3 triliun in outstanding paylater debt."' },
    { kind:"content", brief:'HEADLINE: "The merchant pays first"  BODY: "The store hands over 2 to 4 percent of your Rp2 juta purchase, because Kredivo brings a buyer who would have walked away."' },
    { kind:"content", brief:'HEADLINE: "Then the late fee arrives"  BODY: "Miss the date and it is 3 percent per month, compounding. On Rp2 juta that is Rp60 ribu a month for doing nothing."' },
    { kind:"content", brief:'HEADLINE: "Your limit is the product"  BODY: "Pay on time and the limit rises. OJK data shows 40 percent of users hit their ceiling within a year."' },
    { kind:"closing", brief:'HEADLINE: "Check your ceiling"' }]});
  const r = node([path.join(ROOT, "scripts/lint-plan.js"), f]);
  if (r.status !== 0) throw new Error(`a journalism-grade deck was REJECTED:\n${r.stdout}`);
});

await test("a cover MAY ask a question — if it shows a receipt first", async () => {
  // The reference account's covers are ALL questions. They work because they show a number and a
  // name BEFORE they withhold. The old blanket ban on questions was half wrong.
  const f = await writeJson("q.json", { topic:"t", mode:"news", kicker:"Ibils", sources:[], slides:[
    { kind:"cover", brief:'HEADLINE: "OJK logged Rp30,3 triliun in paylater debt. Gimana modusnya?"' },
    { kind:"content", brief:'HEADLINE: "The merchant pays"  BODY: "Kredivo takes 4 percent of every Rp2 juta basket, because the store gains a buyer."' },
    { kind:"content", brief:'HEADLINE: "Late fees compound"  BODY: "It is 3 percent per month on the balance, so Rp2 juta costs Rp60 ribu extra."' },
    { kind:"content", brief:'HEADLINE: "The ceiling rises"  BODY: "OJK shows 40 percent of users reach their limit within a year."' },
    { kind:"closing", brief:'HEADLINE: "Check it"' }]});
  const r = node([path.join(ROOT, "scripts/lint-plan.js"), f]);
  if (/defers with no anchor/.test(r.stdout)) throw new Error("an anchored question cover was rejected");
});

await test("slide count is no longer clamped to 5-8", async () => {
  const src = await liveCode("scripts/run-carousel.js");
  if (/Math\.min\(8,/.test(src)) throw new Error("the 5-8 clamp is back — the reference runs 6-14 and pads nothing");
});

await test("AUDIENCE LAW kills a true, sourced, perfectly-gated deck aimed at the wrong people", async () => {
  // This deck passed EVERY other gate. Every fact was verified against a primary OJK document.
  // And a reader in London has never heard of Kredivo.
  const f = await writeJson("wrongaudience.json", {
    topic: "paylater", mode: "news", kicker: "Ibils", surface: "carousel-global-en",
    sources: ["OJK"],
    slides: [
      { kind: "cover",   brief: 'HEADLINE: "Paylater says 0%. Its disclosure says 10% per 30 days."  BODY: "Kredivo uses Rp2.000.000 as its example."' },
      { kind: "content", brief: 'HEADLINE: "Miss one payment"  BODY: "Kredivo stacks 4% plus 6% per 30 days, and publishes no cap."' },
      { kind: "content", brief: 'HEADLINE: "This is not niche"  BODY: "OJK logged Rp30,1 triliun across 31,76 juta accounts in May 2026."' },
      { kind: "closing", brief: 'HEADLINE: "Know the number"' }]});
  const out = node([path.join(ROOT, "scripts/lint-plan.js"), f]).stdout;
  if (!/GLOBAL audience/.test(out)) throw new Error("an Indonesia-only deck shipped to a global surface");
});

await test("EVIDENCE LAW: an artifact with no source footer is REFUSED", async () => {
  const f = await writeJson("noftr.json", { type: "table", title: "x", columns: ["a","b"], rows: [["1","2"]] });
  const out = path.join(TMP, "noftr.png");
  const r = node([path.join(ROOT, "scripts/render-artifact.mjs"), f, out]);
  if (r.status === 0) throw new Error("an artifact with no source shipped — that is decoration pretending to be evidence");
});

await test("EVIDENCE LAW: amber marks only what MOVED", async () => {
  const src = await liveCode("scripts/render-artifact.mjs");
  if (!/String\(row\[i - 1\]/.test(src)) {
    throw new Error("the highlight does not compare against the previous column — a value that stood still would get the accent, and an accent that means nothing stops being trusted");
  }
});

// ---------------------------------------------------------------- the score
// Each of these three caught a real bug in the film it was written for, on the day it was written.
// A gate that is not tested is a gate that quietly stops working, and you find out in the edit.

const scoreSpec = async (name, body) => {
  const f = path.join(TMP, name);
  await fs.writeFile(f, body);
  return f;
};

await test("SILENCE LAW: a note ringing into a declared silence is refused", async () => {
  // the comedy score's band stops dead at the punch. the FIRST render left the bass ringing 0.9s into
  // it — measured -23.7 dBFS across a window that was supposed to be nothing. you would not have heard
  // it consciously. you would only have found the joke flat.
  const f = await scoreSpec("bleed.mjs", `export default {
    name: "bleed", duration: 6, silence: [[3, 5]],
    notes: [{ inst: "sub", note: "F2", at: 2.0, dur: 1.5, gain: 0.3, ring: 0.8 }],  // ends 4.3 — INSIDE
  };`);
  const r = node([path.join(ROOT, "scripts/score.mjs"), f, path.join(TMP, "bleed.wav")]);
  if (r.status === 0) throw new Error("a note rang straight through a declared silence and the score shipped");
  if (!/NOT SILENT/.test(r.stdout + r.stderr)) throw new Error("it failed, but not for the silence — the gate is not the thing that caught it");
});

await test("SILENCE LAW: the rendered file is measured, not just the spec", async () => {
  const src = await fs.readFile(path.join(ROOT, "scripts/score.mjs"), "utf8");
  if (!/astats/.test(src) || !/RMS level dB/.test(src)) {
    throw new Error("the silence is only checked against the note list — the echo tail and the envelopes are not in the note list");
  }
  // and it must not measure through `-v error`, which HIDES astats (it logs at info) and returns an
  // empty string that reads exactly like silence. a muted gauge is not a quiet room.
  const gate = src.slice(src.indexOf("go and LISTEN"));
  if (/"-v", "error"/.test(gate)) throw new Error("the silence gate measures with -v error, which suppresses astats — it will read every score as silent");
});

await test("THE FIGURE DOES NOT SURVIVE THE TURN: banAfter is enforced", async () => {
  const f = await scoreSpec("return.mjs", `export default {
    name: "return", duration: 20,
    banAfter: [{ inst: "pluck", from: 10, why: "the figure does not survive the turn" }],
    notes: [{ inst: "pluck", note: "A4", at: 12, dur: 1, gain: 0.3 }],
  };`);
  const r = node([path.join(ROOT, "scripts/score.mjs"), f, path.join(TMP, "return.wav")]);
  if (r.status === 0) throw new Error("the figure came back after the turn and nothing stopped it");
});

// ---------------------------------------------------------------- the film
await test("LIGHT GATE: a shot too dark to read on a phone is refused", async () => {
  const src = await fs.readFile(path.join(ROOT, "scripts/build-captioned.mjs"), "utf8");
  if (!/const FLOOR = \d+/.test(src) || !/still too dark to read on a phone/.test(src)) {
    throw new Error("nothing stops a black rectangle with a caption on it from shipping — 'sekarang semuanya gelap'");
  }
  if (!/signalstats/.test(src)) throw new Error("the darkness is judged by eye, not measured");
});

await test("THE SCORE IS AIMED AT THE CUT: picture length must equal the script", async () => {
  const src = await fs.readFile(path.join(ROOT, "scripts/build-captioned.mjs"), "utf8");
  // `-t 3.0` gives you "about" three seconds. nine shots of "about" cost half a second, and the score
  // — whose every decision is a timestamp — ends up aimed at the wrong frame.
  if (!/-frames:v/.test(src)) throw new Error("shots are cut by seconds, which drift; a frame count is an integer and does not");
  if (!/the score is aimed here|the score is aimed at/.test(src)) {
    throw new Error("nothing asserts that the assembled picture is as long as the script the music was written against");
  }
});

await test("ENDCARD: the phone may not land on the caption or the logo", async () => {
  // liveCode(), not readFile — this test first FAILED against the comment in make-endcard.mjs that
  // WARNS you not to crop with `identify`. A check that reads prose as code will fail the file that
  // documents the bug and pass the file that commits it.
  const src = await liveCode("scripts/make-endcard.mjs");
  const asserts = (src.match(/throw new Error/g) || []).length;
  if (asserts < 3) throw new Error("the endcard places a phone, a logo and a caption in one frame and does not check that they miss each other — this exact collision shipped a broken closing slide");
  if (/identify/.test(src)) throw new Error("`identify` cannot crop — a check written with it fails every card, including the clean ones");
});

await test("ENDCARD: the app screen is a real screenshot, never drawn", async () => {
  const src = await fs.readFile(path.join(ROOT, "scripts/make-endcard.mjs"), "utf8");
  if (!/app-screens|screenPath|SCREEN/.test(src)) throw new Error("the endcard invents its own app UI");
  if (!/no app screenshot at/.test(src)) throw new Error("a missing screenshot degrades to something instead of stopping");
});

// ---------------------------------------------------------------- the closing slide
// The owner sent this slide back with "phone frame masih terlalu mepet". The phone was pressed
// against the word "number". A gate was supposed to prevent exactly that, and it passed the slide.

await test("CLOSING: the collision gate looks for EDGES, not variance or brightness", async () => {
  const src = await liveCode("scripts/finalize.js");
  const gate = src.slice(src.indexOf("const GUTTER"));
  if (!/EdgeIn|morphology/.test(gate)) {
    // stddev could not see one letter's tail intruding into a big flat rectangle (it shipped).
    // a bright-pixel count then failed a CLEAN slide, because that plate came back as cream newsprint
    // where the EMPTY ground is 100% bright. both measured the palette; only edges measure the ink.
    throw new Error("the phone-collision gate is palette-dependent — it will pass a dark slide with type in the zone, or fail a clean light one");
  }
  if (!/GUTTER/.test(gate)) throw new Error("the gate checks the phone's footprint but not a gutter around it — type stopping 1px short of the bezel is the same collision");
});

await test("CLOSING: the phone is confined to its column, away from the type", async () => {
  const src = await liveCode("scripts/finalize.js");
  if (!/TYPE_COL|PHONE_COL/.test(src)) throw new Error("the closing slide has no column contract — the phone's position is a magic offset and will drift back onto the headline");
});

await test("finalize is IDEMPOTENT — running it twice changes nothing", async () => {
  // Running finalize twice over a finished deck reported "the reserved top-right corner is NOT empty —
  // codex drew in it" for 11 slides in a row. codex had drawn nothing. The artwork in the corner was
  // THIS SCRIPT'S OWN LOGO, from the first run, and the check could not tell its output from a defect.
  //
  // This is a BEHAVIOURAL test and it has to be. The first version of it grepped the source for
  // `isFinalized`, and when I disabled the actual call with `if (false)` to check the test bit, it
  // still passed — the string was right there in the function that no longer ran. A test that reads
  // the source instead of running it will happily certify a gate that has been switched off.
  const dir = await fs.mkdtemp(path.join(TMP, "fin-"));
  const f = path.join(dir, "12-closing.png");
  // a plain plate: empty reserved corner, empty phone column, nothing to collide with
  magick(["-size", "1080x1350", "xc:#0E3B33", f]);

  const fin = path.join(ROOT, "scripts/finalize.js");
  const r1 = node([fin, dir]);
  if (r1.status !== 0) throw new Error(`first finalize failed, so idempotency is untestable: ${r1.stdout}${r1.stderr}`);
  const h1 = magick([f, "-format", "%#", "info:"]).stdout.trim();

  const r2 = node([fin, dir]);
  if (r2.status !== 0) throw new Error(`the SECOND finalize failed — a finished slide must be a no-op, not an error: ${r2.stdout}${r2.stderr}`);
  const h2 = magick([f, "-format", "%#", "info:"]).stdout.trim();

  if (h1 !== h2) throw new Error("the second run CHANGED the slide — it is compositing a second logo/phone/badge set on top of the first");
  if (!/already finalis/i.test(r2.stdout)) throw new Error("the second run did not recognise the slide as finished");
});

// ---------------------------------------------------------------- assets fade to nothing
await test("ASSET: closing-phone reaches alpha=0 at every edge", async () => {
  // "ada shadow". The asset carried a baked shadow that its own `-trim` cropped MID-FALLOFF, leaving
  // alpha 13-115 sitting on the canvas boundary. Any non-zero alpha at the edge of a transparent
  // asset becomes a hard straight line the instant it is composited — the eye reads it as a box, and
  // nothing done at the composite site can undo it.
  const asset = path.join(ROOT, "assets/closing-phone.png");
  for (const [side, crop] of [["north", "100%x1+0+0"], ["south", "100%x1+0+0"],
                              ["east", "1x100%+0+0"], ["west", "1x100%+0+0"]]) {
    const a = parseFloat(magick([asset, "-alpha", "extract", "-gravity", side,
      "-crop", crop, "+repage", "-format", "%[fx:maxima*255]", "info:"]).stdout);
    if (a > 1) throw new Error(`${side} edge is alpha=${a.toFixed(0)} — composited, that edge is a visible straight line`);
  }
});

await test("ASSET: the shadow is NOT baked in — it belongs to the composite", async () => {
  const src = await liveCode("scripts/make-closing-phone.mjs");
  if (/shplate/.test(src)) throw new Error("a shadow is baked into the asset again — it cannot know what surface it will land on, and -trim will crop its falloff into a box");
  const fin = await liveCode("scripts/finalize.js");
  if (!/-shadow/.test(fin)) throw new Error("the asset has no shadow and finalize does not draw one — the phone now sits flat on the slide");
});

await test("CLOSING: the store badges are CENTRED", async () => {
  // "posisi playstore dan appstore berantakan". A +100 x-offset had been sitting in finalize to dodge
  // Himel, who used to stand in the bottom-left of the closing slide. Himel is no longer drawn there.
  // The offset stopped dodging anything years of edits ago and just pushed the badges 100px off-centre.
  // Stale geometry outlives the thing it was avoiding, and it never announces itself.
  const src = await liveCode("scripts/finalize.js");
  const m = /STORE_BADGES[\s\S]{0,200}?"-gravity", "south", "-geometry", "\+(-?\d+)\+/.exec(src);
  if (!m) throw new Error("cannot find the badge placement");
  if (Number(m[1]) !== 0) throw new Error(`the badges are composited ${m[1]}px off-centre`);
  if (!/badges are centred at x=/.test(src)) throw new Error("nothing MEASURES the badge centring on the rendered slide — the offset can drift back silently");
});

console.log(`\n${pass} passed, ${fail} failed\n`);
await fs.rm(TMP, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
