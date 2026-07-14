#!/usr/bin/env node
/**
 * THE PREDICTION PROBE — the gate that decides whether a joke is actually a joke.
 *
 *   node runtime/predict-probe.mjs script.json
 *
 * A laugh is a PREDICTION ERROR. The audience runs a model of where the sentence is going, and the
 * punch is funny exactly to the degree that it isn't where they went. So: give the SETUP ONLY to a
 * fresh model, three times, and ask it what comes next. If it lands on your punchline, your audience
 * will too — and arriving first is the whole game. The joke is dead. Kill it here, before the plates.
 *
 * This kills the third of comedy's six deaths (the setup telegraphs the punch), and it is the only
 * one that cannot be caught by reading the script yourself: YOU already know the punchline, so you
 * can never un-know it and judge whether the setup gives it away. Only a model that has not seen the
 * punch can tell you that. That is what this is for.
 *
 * Each probe is its own codex session with NO knowledge of the punch. 3 sessions, all parallel.
 */
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const N = 3;

const STOP = new Set(("yang dan di ke dari untuk itu ini kamu atau jadi biar dengan pada ada akan tidak juga saat bisa " +
  "sudah lebih masih apa kalau tapi karena saja aja nya gue gw lo lu aku saya kita kami mereka " +
  "the a an and or but so to of in on at by for with from as is are was be it this that you your i my we " +
  "cuma banget sih dong kan deh emang udah lagi").split(" "));

const content = (s) => new Set(String(s || "").toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)
  .filter((w) => w.length > 2 && !STOP.has(w)));

function codex(prompt, i) {
  return new Promise((resolve) => {
    const c = spawn("codex", ["exec", "-m", "gpt-5.5", "-c", 'model_reasoning_effort="low"',
      "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check", "-"],
      { env: { ...process.env, NO_COLOR: "1" }, stdio: ["pipe", "pipe", "pipe"] });
    let buf = "";
    // drain, always. an unread pipe past ~64KB blocks the child forever.
    c.stdout.on("data", (d) => (buf += d));
    c.stderr.on("data", (d) => (buf += d));
    c.on("error", (e) => resolve({ i, err: e.message }));
    const t = setTimeout(() => c.kill("SIGKILL"), 3 * 60 * 1000);
    c.on("close", () => {
      clearTimeout(t);
      const lines = buf.split("\n").map((l) => l.trim())
        .filter((l) => l && !/^\[|^codex|^--|^tokens|^exec|^workdir|^model|^provider|^approval|^sandbox|^reasoning/i.test(l));
      resolve({ i, guess: lines[lines.length - 1] || "" });
    });
    c.stdin.end(prompt);
  });
}

const file = process.argv[2];
if (!file) { console.error("usage: predict-probe.mjs <script.json>"); process.exit(1); }
const s = JSON.parse(await fs.readFile(file, "utf8"));

const beats = s.beats || [];
const upto = [];
for (const b of beats) {
  const name = String(b.beat).toUpperCase();
  if (name === "PUNCH") break;
  for (const l of b.lines || []) upto.push(l.text);
}
const punch = beats.find((b) => String(b.beat).toUpperCase() === "PUNCH")?.lines?.[0];
if (!punch) { console.error("no PUNCH beat in the script"); process.exit(1); }
if (!upto.length) { console.error("no setup lines before the punch"); process.exit(1); }

const prompt =
`This is the opening of a short comedic monologue in casual Jakarta Indonesian (lo/gue register).
It is about personal finance and the lies people tell themselves about their own spending.

${upto.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Write the NEXT line — the punchline. One line. Nothing else. No explanation, no quotes, no preamble.
Output ONLY the line.`;

console.log(`\nTHE PREDICTION PROBE — can a model that has never seen your punchline guess it?\n`);
console.log(`  setup given to the probe:`);
upto.forEach((t) => console.log(`    ${t}`));
console.log(`\n  your punch (hidden from the probe):`);
console.log(`    ${punch.text}\n`);
console.log(`  running ${N} independent probes...\n`);

const res = await Promise.all(Array.from({ length: N }, (_, i) => codex(prompt, i + 1)));

const mine = content(punch.text);
let telegraphed = 0;
for (const r of res) {
  if (r.err) { console.log(`  probe ${r.i}: could not run (${r.err})`); continue; }
  const theirs = content(r.guess);
  const shared = [...mine].filter((w) => theirs.has(w));
  const hit = shared.length > 0;
  if (hit) telegraphed++;
  console.log(`  probe ${r.i}: ${r.guess}`);
  console.log(`           ${hit
    ? `\x1b[31mPREDICTED\x1b[0m — shares ${shared.map((w) => `"${w}"`).join(", ")} with your punch`
    : `\x1b[32mmissed\x1b[0m — no shared content words`}\n`);
}

if (telegraphed > 0) {
  console.log(`\x1b[31mVERDICT: TELEGRAPHED\x1b[0m — ${telegraphed}/${N} probes landed on your punchline.`);
  console.log(`Your setup points straight at the ending. The audience's inner model will get there first,`);
  console.log(`and a joke they have already told themselves is not a joke. Rewrite the SETUP so it is honest`);
  console.log(`testimony for a DIFFERENT ending — the punch stays, the misdirection changes.`);
  process.exit(1);
}
console.log(`\x1b[32mVERDICT: PASS\x1b[0m — no probe found your punchline. The misdirection holds.`);
console.log(`(Borderline paraphrases are not caught by word overlap. If a guess is semantically your`);
console.log(` punch in different words, trust your eyes over this exit code.)`);
