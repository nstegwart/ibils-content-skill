#!/usr/bin/env node
/**
 * THE FRAME GATE.  `node scripts/qc-frame.mjs <script.json> <plates-dir>`
 *
 * The owner, after watching what we shipped:
 *   "Video ga nyambung sama konteks."   (the video does not match the context)
 *   "Story dan comedy per frame harusnya generate image dulu aja, terus REVIEW!!"
 *
 * He is right, and the failure is structural. This pipeline gates the SCRIPT brutally — every slide
 * must carry a receipt, every joke must survive a prediction probe, every scene must escalate — and
 * then it generates the pictures and ASSEMBLES THEM WITHOUT EVER CHECKING THAT THE PICTURE SHOWS
 * WHAT THE LINE SAYS. Nobody ever sat down and asked, frame by frame: does this image actually
 * belong to this sentence?
 *
 * So: a fresh model looks at each plate WITHOUT being told what it is supposed to be, describes what
 * it actually sees, and is then asked whether that matches the brief. A model that did not write the
 * brief has no investment in believing the plate is fine — which is the whole point, because I do.
 *
 * It answers three things per frame:
 *   1. What is ACTUALLY in this picture? (blind description)
 *   2. Does it show what the brief asked for? (MATCH / PARTIAL / MISMATCH)
 *   3. Is there any TEXT in it? (in these films an invented letter is an invented fact)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

function ask(img, brief) {
  return new Promise((resolve) => {
    const p = [
      "Look at the attached image. You did NOT write the brief for it and you have no stake in it.",
      "",
      "Answer these three, in this exact format, nothing else:",
      "",
      "SEE: <one sentence — what is ACTUALLY in this picture. Describe only what you can see.>",
      "TEXT: <YES + quote it, or NO>",
      "MATCH: <MATCH | PARTIAL | MISMATCH> — <one clause saying why>",
      "",
      "The brief this image was supposed to fulfil was:",
      `  "${brief}"`,
      "",
      "Be harsh. MATCH means a viewer would look at this frame and see the thing the brief describes,",
      "without being told. PARTIAL means the subject is there but the specific action or object in the",
      "brief is missing or unclear. MISMATCH means it is a different picture.",
    ].join("\n");

    const c = spawn("codex", [
      "exec", "-m", "gpt-5.5", "-c", 'model_reasoning_effort="low"',
      "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check",
      "-i", img, "-",
    ], { env: { ...process.env, NO_COLOR: "1" }, stdio: ["pipe", "pipe", "pipe"] });

    let buf = "";
    c.stdout.on("data", (d) => (buf += d));   // drain, always
    c.stderr.on("data", (d) => (buf += d));
    c.on("error", (e) => resolve({ err: e.message }));
    const t = setTimeout(() => c.kill("SIGKILL"), 4 * 60 * 1000);
    c.on("close", () => {
      clearTimeout(t);
      // codex echoes the prompt back before its answer, so a naive first-match regex reads MY OWN
      // TEMPLATE ("<one sentence — what is ACTUALLY in this picture>") and reports every frame as a
      // failure. Take the LAST occurrence — the answer — and reject anything still wearing angle
      // brackets, which is the template, not a reply.
      const g = (k) => {
        const all = [...buf.matchAll(new RegExp(`^${k}:\\s*(.+)$`, "gim"))].map((m) => m[1].trim());
        const real = all.filter((v) => !/^</.test(v));
        return real.length ? real[real.length - 1] : "";
      };
      const see = g("SEE"), text = g("TEXT"), match = g("MATCH");
      if (!see && !match) return resolve({ err: "model did not answer in the requested format" });
      resolve({ see, text, match });
    });
    c.stdin.end(p);
  });
}

const [, , scriptPath, platesDir] = process.argv;
if (!scriptPath || !platesDir) {
  console.error("usage: qc-frame.mjs <script.json|ledger.json> <plates-dir>");
  process.exit(1);
}
const s = JSON.parse(await fs.readFile(path.resolve(scriptPath), "utf8"));

// works on either shape: a comedy script (beats/lines) or a story ledger (scenes)
const units = s.scenes
  ? s.scenes.map((x) => ({ id: `s${String(x.n).padStart(2, "0")}`, brief: x.visual, line: x.vo }))
  : s.beats.flatMap((b) => b.lines).map((l, i) => ({
      id: `c${String(i + 1).padStart(2, "0")}`, brief: l.visual, line: l.text }));

const DIR = path.resolve(platesDir);
const files = await fs.readdir(DIR);

console.log("\nTHE FRAME GATE — does the picture show what the line says?\n");

// AN LLM GATE IS NOT DETERMINISTIC, AND A GATE THAT FLIPS ITS ANSWER ON THE SAME INPUT IS NOT A
// GATE — IT IS A SUGGESTION. The comedy punch frame passed, then failed, then passed again, all on
// the same unchanged image. So: ask TWICE, independently, and only FAIL when BOTH passes agree the
// frame is wrong. One dissent means the frame is arguable, and an arguable frame is a WARN for a
// human to look at, not a hard stop.
const results = await Promise.all(units.map(async (u) => {
  const hit = files.find((f) => f.toLowerCase().startsWith(u.id.toLowerCase()) && /\.png$/i.test(f));
  if (!hit) return { ...u, missing: true };
  const [a, b] = await Promise.all([ask(path.join(DIR, hit), u.brief), ask(path.join(DIR, hit), u.brief)]);
  const bad = (r) => !(r.match || "").toUpperCase().startsWith("MATCH");
  const both = bad(a) && bad(b);
  const split = bad(a) !== bad(b);
  const r = bad(a) ? a : b;    // report the harsher read
  return { ...u, file: hit, ...r, verdict: both ? "FAIL" : (split ? "SPLIT" : "OK") };
}));

let bad = 0;
for (const r of results) {
  if (r.missing) { console.log(`  ${r.id}  \x1b[31mNO PLATE\x1b[0m`); bad++; continue; }
  const isBad = r.verdict === "FAIL";
  const split = r.verdict === "SPLIT";
  const hasText = /^YES/i.test(r.text || "");
  if (isBad || hasText) bad++;

  const tag = isBad ? "\x1b[31mFAIL\x1b[0m"
    : (hasText ? "\x1b[31mTEXT\x1b[0m"
    : (split ? "\x1b[33mSPLIT\x1b[0m" : "\x1b[32m ok  \x1b[0m"));
  console.log(`  ${r.id}  ${tag}`);
  console.log(`        line : ${(r.line || "").slice(0, 78)}`);
  console.log(`        brief: ${(r.brief || "").slice(0, 78)}`);
  console.log(`        SEES : ${(r.see || "?").slice(0, 78)}`);
  if (isBad) console.log(`        \x1b[31m>\x1b[0m ${r.match}`);
  if (split) console.log(`        \x1b[33m> the two passes disagreed — arguable. LOOK AT IT.\x1b[0m ${r.match}`);
  if (hasText) console.log(`        \x1b[31m> TEXT IN FRAME:\x1b[0m ${r.text}`);
  console.log("");
}

console.log(bad
  ? `\x1b[31m${bad}/${results.length} frames do not belong to their line.\x1b[0m Re-roll them. ` +
    `A frame that does not match its line is what "video ga nyambung sama konteks" actually is.\n`
  : `\x1b[32mall ${results.length} frames match their lines.\x1b[0m\n`);
process.exit(bad ? 1 : 0);
