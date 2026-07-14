#!/usr/bin/env node
/**
 * THE SCRIPT GATE — for the STORY and COMEDY formats.
 *
 *   node runtime/lint-script.mjs comedy script.json
 *   node runtime/lint-script.mjs story  ledger.json
 *
 * This runs BEFORE a single image is generated, and that is the entire point. A dead script costs
 * nothing. A dead film costs days of codex and grok. The carousel already works this way — lint and
 * critic gate the plan before any render — and it is the single most valuable habit in the repo.
 *
 * These are not style opinions. Each check is a named failure mode of AI-generated video:
 *
 *  STORY  — the AI story is a LIST: things happen, then other things happen, for no reason. So every
 *           scene must declare BUT or THEREFORE. There is no AND. And "rising stakes" is a vibe until
 *           you write the number down — so you write the number down, and the build holds you to it.
 *
 *  COMEDY — the AI joke dies six specific deaths, and five of them are checkable:
 *             1. the joke is explained          -> nothing may follow the punch
 *             2. the timing is even             -> the pre-punch beat must be >=40% off the median
 *             3. the setup telegraphs the punch -> the prediction probe (separate tool)
 *             4. the punch is mis-positioned    -> the funny word must be in the last two words
 *             5. the picture illustrates the line -> zero noun overlap, punch VO vs punch visual
 *             6. the premise is safe            -> the personified-wallet family is banned outright
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const FAIL = [];
const WARN = [];
const fail = (m) => FAIL.push(m);
const warn = (m) => WARN.push(m);

const words = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Indonesian + English function words — stripped before we look for shared CONTENT nouns.
const STOP = new Set(("yang dan di ke dari untuk itu ini kamu atau jadi biar dengan pada ada akan tidak juga saat bisa " +
  "sudah lebih masih apa kalau tapi karena saja aja nya gue gw lo lu aku saya kita kami mereka " +
  "the a an and or but so to of in on at by for with from as is are was be it this that you your i my we").split(" "));

// ============================================================ COMEDY
function comedy(s) {
  const beats = s.beats || [];
  const flat = beats.flatMap((b) => (b.lines || []).map((l) => ({ ...l, beat: b.beat })));
  const byBeat = (n) => beats.filter((b) => String(b.beat).toUpperCase() === n);

  // --- C1: one premise, one punch, short
  const punches = byBeat("PUNCH");
  if (punches.length !== 1) fail(`C1: need exactly ONE punch beat, found ${punches.length}. A second punchline is a second video.`);
  if (byBeat("TAG").length > 1) fail("C1: at most ONE tag.");

  // --- C4: the punch must be BUILT, not wished for
  const MECH = { 1: "escalated specificity", 2: "physical evidence", 3: "quoted self-lie vs cut to reality" };
  if (!MECH[s.punch_mechanism]) {
    fail(`C4: declare punch_mechanism 1|2|3 (${Object.entries(MECH).map(([k, v]) => `${k}=${v}`).join(", ")}). ` +
      `"be funny" is not an instruction — an unconstrained model produces a personified wallet.`);
  }

  // --- C4 banned: the single loudest AI finance-joke tell  (word-level; skip on a skeleton)
  const WALLET = SKELETON ? [] : ["dompet gue nangis", "dompet nangis", "rekening sekarat", "rekening gue sekarat", "saldo pamit",
    "saldo gue pamit", "dompet menjerit", "wallet is crying", "bank account is crying", "wallet filed", "money cries"];
  for (const l of flat) {
    const t = String(l.text || "").toLowerCase();
    for (const b of WALLET) if (t.includes(b)) fail(`C4: "${b}" (${l.id}) — the personified-money joke. Loudest AI finance-comedy tell there is.`);
  }

  // --- C10: register. formal connective tissue = the writer's ear was never in lo/gue.
  if (s.register === "lo-gue" && !SKELETON) {
    const FORMAL = ["namun", "oleh karena itu", "adalah", "tersebut", "anda", "selain itu", "demikian", "para "];
    const DEAD = ["kids jaman now", "generasi micin", "cetar", "ciyus", "miapah", "unyu", "woles", "mantul", "gaes"];
    const CRINGE = ["wkwk", "awokwok", "haha", "ngakak", "gokil sih", "kocak banget"];
    for (const l of flat) {
      const t = " " + String(l.text || "").toLowerCase() + " ";
      for (const f of FORMAL) if (t.includes(" " + f)) fail(`C10: formal "${f}" in a lo/gue script (${l.id}) — boomer-writing-Gen-Z. One formal conjunction means the ear was never in register.`);
      for (const d of DEAD) if (t.includes(d)) fail(`C10: dead slang "${d}" (${l.id}).`);
      for (const c of CRINGE) if (t.includes(c)) fail(`C10: "${c}" (${l.id}) — the narrator is enjoying their own joke. Deadpan is the only legal delivery.`);
    }
  }

  const punchLine = punches[0]?.lines?.[0];
  if (punchLine && !SKELETON) {
    // --- C6: END-WEIGHT. the laugh cannot start while grammar is still arriving.
    const pw = String(s.punch_word || "").toLowerCase();
    const tk = words(punchLine.text);
    if (!pw) fail("C6: declare punch_word — the funny word must be the LAST thing heard.");
    else {
      const at = tk.lastIndexOf(pw);
      if (at < 0) fail(`C6: punch_word "${pw}" is not in the punch line.`);
      else if (at < tk.length - 2) fail(`C6: punch_word "${pw}" sits at token ${at + 1} of ${tk.length}. It must be in the LAST TWO words — the laugh cannot begin while the sentence is still delivering syntax.`);
    }

    // --- C1/C6: nothing may follow the punch except a declared tag
    const after = flat.slice(flat.findIndex((l) => l.id === punchLine.id) + 1)
      .filter((l) => String(l.beat).toUpperCase() !== "TAG" && String(l.beat).toUpperCase() !== "ENDCARD");
    if (after.length) fail(`C1: ${after.length} line(s) after the punch (${after.map((l) => l.id).join(",")}). Explanation is the anti-laugh — the laugh IS the viewer closing the gap.`);

    // --- C7: THE GAP LAW. the picture must CONTRADICT the voice, not illustrate it.
    // (structural — but it needs real words on both sides to compare, so it waits for Gemini)
    const vo = new Set(words(punchLine.text).filter((w) => !STOP.has(w) && w.length > 2));
    const vis = new Set(words(punchLine.visual).filter((w) => !STOP.has(w) && w.length > 2));
    const shared = [...vo].filter((w) => vis.has(w));
    if (!punchLine.visual) fail("C7: the punch line has no `visual` brief. The punch FRAME is the joke.");
    else if (shared.length) {
      fail(`C7: punch VO and punch visual share ${shared.map((w) => `"${w}"`).join(", ")} — the picture is ILLUSTRATING the line. ` +
        `The gap between what is said and what is shown IS the joke. Close the gap and there is nowhere for it to live.`);
    }

    // --- C8: the punch is a confession, not an accusation
    const subj = words(punchLine.text)[0];
    if (["lo", "lu", "kamu", "anda"].includes(subj)) {
      fail(`C8: the punch line's subject is "${subj}" — you are laughing AT the viewer. The setup may say "lo"; the PUNCH lands on "gue".`);
    }
  }

  // --- C8b: THE SCRIPT IS A CONFESSION, NOT AN ACCUSATION.
  //
  // The gate caught two broken laws on Gemini's first draft and MISSED the worst thing about it:
  // every single line pointed at the viewer, and two of them mocked him —
  //   "literasi finansialnya di bawah rata-rata"   ("your financial literacy is below average")
  //   "sisa duit lo yang nggak seberapa"           ("what little money you have left")
  // That is a joke told DOWNWARD, at the person we are asking to trust us. It is the worst thing a
  // brand can do with humour and my gate let it through, because I was only checking the PUNCH's
  // subject.
  //
  // The fix is structural, not another banlist. COUNT WHO THE SCRIPT IS ABOUT. A confession is
  // mostly "gue". An accusation is mostly "lo". The setup may hook with one "lo" — after that,
  // every line belongs to the narrator. If the script points outward more than it points inward,
  // it is not a confession, and no rewording of the individual lines will fix that.
  if (!SKELETON) {
    const YOU = /\b(lo|lu|kamu|anda)\b/i;
    const ME  = /\b(gue|gw|aku|saya)\b/i;
    const body = flat.filter((l) => !["ENDCARD"].includes(String(l.beat).toUpperCase()));
    const youLines = body.filter((l) => YOU.test(l.text || "") && !ME.test(l.text || ""));
    if (youLines.length > 1) {
      fail(
        `C8: ${youLines.length} of ${body.length} lines point at "lo" and never at "gue" ` +
        `(${youLines.map((l) => l.id).join(", ")}). This is an ACCUSATION, not a confession. ` +
        `The setup may hook with ONE "lo"; after that every line belongs to the narrator. ` +
        `We are laughing WITH him at himself — never AT the person we are asking to trust us.`
      );
    }
  }

  // --- C8: strip the endcard and it must still be a joke
  for (const l of flat) {
    if (/ibils/i.test(l.text || "") && String(l.beat).toUpperCase() !== "ENDCARD") {
      fail(`C8: "Ibils" appears in ${l.id} (beat ${l.beat}). The product lives in the ENDCARD ONLY. ` +
        `An ad wearing a joke gets the credibility of neither.`);
    }
  }

  // --- C5: THE GRID IS DEAD. this is the whole timing law, and it is a number.
  const setupBeats = flat.filter((l) => String(l.beat).toUpperCase() === "SETUP");
  const pre = flat.find((l) => String(l.beat).toUpperCase() === "PRE_PUNCH");
  if (setupBeats.length && pre) {
    const durs = setupBeats.map((l) => (l.est_seconds ?? null)).filter((x) => x != null);
    if (durs.length >= 2 && pre.est_seconds != null) {
      const med = median(durs);
      const dev = Math.abs(pre.est_seconds - med) / med;
      if (dev < 0.40) {
        fail(`C5: the pre-punch beat is ${pre.est_seconds}s against a ${med.toFixed(2)}s median setup beat — only ${(dev * 100) | 0}% off. ` +
          `It must be >=40% off, in EITHER direction. Natural phrase jitter is +-15-25%, so anything under 40% reads as sloppy assembly, ` +
          `not intent — the worst outcome: timing that is wrong, but not WRONG. A joke cut to an even grid is delivered by a metronome, ` +
          `and comedy is prediction ERROR.`);
      }
    } else {
      warn("C5: no est_seconds on the setup/pre-punch lines — the timing law cannot be checked until the voice is locked.");
    }
  } else if (!pre) {
    fail("C5: no PRE_PUNCH beat. The beat before the punch is the load-bearing silence of all spoken comedy.");
  }

  // --- C5: dead air. silence is the drum the punch lands on.
  if (punchLine && (punchLine.pause_after_ms ?? 0) < 800) {
    fail(`C5: only ${punchLine.pause_after_ms ?? 0}ms of dead air after the punch. Needs >=800ms. ` +
      `Less reads as the edit fleeing its own joke.`);
  }
}

// ============================================================ STORY
function story(s) {
  const sc = s.scenes || [];
  if (sc.length < 5 || sc.length > 9) fail(`S5: ${sc.length} scenes. Story is 5-9.`);

  // --- S2: a want you cannot film is a theme, and themes cannot be filmed.
  const want = String(s.want || "");
  if (!want) fail("S2: no `want`.");
  else {
    if (words(want).length > 20) fail(`S2: the want is ${words(want).length} words. Max 20.`);
    if (!/\d/.test(want)) {
      warn(`S2: the want has no number in it — "${want}". "Get her finances under control" is a THEME. ` +
        `"Rp 1.2 juta for the kos deposit by Friday" is a want. Themes cannot be filmed.`);
    }
  }

  // --- S1: AND THEN does not exist.
  for (const x of sc.slice(1)) {
    const c = String(x.connector || "").toUpperCase();
    if (!["BUT", "THEREFORE"].includes(c)) {
      fail(`S1: scene ${x.n} connector is "${x.connector}". Only BUT or THEREFORE exist. ` +
        `If two adjacent scenes can be swapped and the story still works, it was never a story — it was b-roll with narration.`);
    }
  }

  // --- S3: escalation is a number the build checks.
  const turnIdx = sc.findIndex((x) => x.function === "turn");
  if (sc.filter((x) => x.function === "turn").length !== 1) fail("S4: exactly ONE scene may be the turn.");
  if (turnIdx > 0) {
    const pre = sc.slice(0, turnIdx);
    let drops = 0, rises = 0;
    for (let i = 1; i < pre.length; i++) {
      if (pre[i].stake < pre[i - 1].stake) drops++;
      if (pre[i].stake > pre[i - 1].stake) rises++;
    }
    if (drops) fail(`S3: stake DROPS ${drops}x before the turn. Escalation is monotonic.`);
    if (rises < 2) fail(`S3: stake rises only ${rises}x before the turn. Needs >=2. A flat stake line is a montage, and montages fail.`);
  }

  // --- S4 + S7: where the turn lands, and how the film breathes
  const durs = sc.map((x) => Number(x.dur) || 0);
  const total = durs.reduce((a, b) => a + b, 0);
  if (total < 30 || total > 60) fail(`S5: runtime ${total.toFixed(1)}s. Story is 30-60s.`);
  for (const x of sc) {
    if (x.dur < 1.6) fail(`S5: scene ${x.n} is ${x.dur}s. Below ~1.6s the viewer registers an image but not an EVENT.`);
    if (x.dur > 6.04) fail(`S5/S8: scene ${x.n} is ${x.dur}s — past grok's verified-clean 6.04s window. Use the two-plate hold: two plates of the SAME moment, different angles, cut together. A cut that does not advance time.`);
  }
  if (turnIdx >= 0 && total > 0) {
    const start = durs.slice(0, turnIdx).reduce((a, b) => a + b, 0);
    const pct = start / total;
    if (pct < 0.55 || pct > 0.75) {
      fail(`S4: the turn lands at ${(pct * 100).toFixed(0)}% of runtime. It must land at 55-75%. ` +
        `Earlier and the back half is a sermon; later and the endcard crashes into the emotion.`);
    }
    const longest = Math.max(...durs);
    if (!(durs[turnIdx] === longest || durs[turnIdx + 1] === longest)) {
      fail(`S7: the longest shot (${longest}s) is neither the turn nor the shot after it. The turn gets the hold.`);
    }
    // escalation compresses. an isochronous edit is the rhythm of a screensaver.
    const esc = sc.filter((x) => x.function === "escalation").map((x) => x.dur);
    for (let i = 1; i < esc.length; i++) {
      if (esc[i] > esc[i - 1] + 0.3) fail(`S7: escalation shot durations must be NON-INCREASING (${esc[i - 1]}s -> ${esc[i]}s). Real escalation compresses.`);
    }
  }
  if (durs.length > 1) {
    const mean = total / durs.length;
    const cov = Math.sqrt(durs.reduce((a, d) => a + (d - mean) ** 2, 0) / durs.length) / mean;
    if (cov < 0.25) fail(`S7: shot-duration coefficient of variation is ${cov.toFixed(2)} (<0.25). Every scene the same length is the rhythm of a screensaver.`);
  }

  // --- S12: THE VOICE OWNS THE CLOCK. A declared duration is a guess until you hear it.
  //
  // I wrote this law in formats/story/SKILL.md and then broke it on the very first script:
  //   "In the ad, shot durations are DECIDED. In a voiced piece they are DISCOVERED from the
  //    performance. That is why plates come AFTER recording."
  // Then I declared 6.0s for a turn whose narration actually runs 15.8 SECONDS. Seven of eight
  // scenes overran, and grok cannot produce a clip past 6.04s — so the ledger was fiction.
  //
  // So MEASURE IT. Synthesise each line and compare. This costs nothing and it is the difference
  // between a script and a wish.
  if (!SKELETON) {
    let measured = 0;
    for (const x of sc) {
      if (!x.vo) continue;
      const f = path.join(os.tmpdir(), `vo-${x.n}-${process.pid}.aiff`);
      const r = spawnSync("say", ["-o", f, x.vo]);
      if (r.status !== 0) break;          // no `say` on this machine — skip, do not pretend
      const d = parseFloat(spawnSync("ffprobe",
        ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
        { encoding: "utf8" }).stdout) || 0;
      try { fsSync.unlinkSync(f); } catch {}
      if (!d) continue;
      measured++;
      if (d > 6.04) {
        fail(`S12: scene ${x.n}'s narration runs ${d.toFixed(1)}s. grok cannot make a clip past ` +
          `6.04s, so this scene CANNOT be one shot. Either cut the line, or declare a TWO-PLATE ` +
          `HOLD (two plates of the same moment, different angles, cut together — a cut that does ` +
          `not advance time).`);
      } else if (d > x.dur + 0.4) {
        fail(`S12: scene ${x.n} is declared ${x.dur}s but its narration actually runs ${d.toFixed(1)}s. ` +
          `In a voiced piece the VOICE OWNS THE CLOCK — you do not get to decide the duration ` +
          `before you have heard the line.`);
      }
    }
    if (measured) {
      const total = sc.reduce((a, x) => a + (Number(x.dur) || 0), 0);
      if (total < 30 || total > 60) { /* already covered by S5 */ }
    }
  }

  // --- S10: the ending is SHOWN. if the film worked, the moral is redundant; if it didn't, it's a confession.
  const MORAL = ["moralnya", "pelajarannya", "intinya", "kesimpulannya", "sekarang gue sadar", "sekarang gue tahu",
    "dari situ gue belajar", "learned", "realized", "the lesson", "that's when i knew"];
  for (const x of sc.slice(-2)) {
    const t = String(x.vo || "").toLowerCase();
    for (const m of MORAL) if (t.includes(m)) fail(`S10: scene ${x.n} narrates the moral ("${m}"). The ending is SHOWN, never stated.`);
  }
  if (sc.length && s.bookend !== false) {
    const a = sc[0].location, b = sc[sc.length - 1].location;
    if (a && b && a !== b) warn(`S10: the film does not bookend (${a} -> ${b}). Default ending returns to scene 1's location with exactly ONE element changed. Set "bookend": false with a reason if that is intended.`);
  }

  // --- S11: OUR app never rescues.
  //
  // This must match the PRODUCT, not the word "app". It fired on a true-crime story whose scene 2
  // reads "the app shows it growing" — the SCAMMER's fake trading platform. Catching that is not
  // protecting the story, it is forbidding the story from having a villain with a phone.
  // Match Ibils by name only.
  const PRODUCT = /\bibils\b|\bour app\b|\baplikasi kita\b/i;
  for (const x of sc) {
    if (["setup", "escalation", "turn"].includes(x.function) && PRODUCT.test(`${x.vo} ${x.visual}`)) {
      fail(`S11: the product appears in scene ${x.n} (${x.function}). The TURN must be the protagonist's own decision, performed on camera. The app may appear in RESOLUTION and endcard only.`);
    }
  }
}

// ============================================================
// TWO PASSES, because you cannot check a word before the word exists.
//
//   --skeleton   run BEFORE Gemini writes the lines. Checks STRUCTURE: the timing skeleton, the
//                declared punch mechanism, the gap between what is said and what is shown, where the
//                product is allowed to appear, the scene ledger's causality and escalation.
//                A dead structure dies here, for free.
//   (default)    run AFTER Gemini writes the lines. Adds the word-level laws: where the punch word
//                sits, the register, the banned phrases.
//
// Running the word-level laws against placeholder prose just fails on the placeholder — which is
// exactly what happened the first time I used this tool on a real skeleton.
const SKELETON = process.argv.includes("--skeleton");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const [kind, file] = args;
if (!kind || !file) {
  console.error("usage: lint-script.mjs <comedy|story> <script.json> [--skeleton]");
  process.exit(1);
}
const s = JSON.parse(await fs.readFile(file, "utf8"));
if (kind === "comedy") comedy(s);
else if (kind === "story") story(s);
else { console.error(`unknown format: ${kind}`); process.exit(1); }

for (const w of WARN) console.log(`\x1b[33mWARN\x1b[0m ${w}`);
for (const f of FAIL) console.log(`\x1b[31mFAIL\x1b[0m ${f}`);
const phase = SKELETON ? "STRUCTURE" : "FULL";
console.log(FAIL.length
  ? `\n\x1b[31mVERDICT: FAIL (${phase})\x1b[0m — ${FAIL.length} law(s) broken. Fix the SCRIPT. It is free here and expensive after the plates.`
  : `\n\x1b[32mVERDICT: PASS (${phase})\x1b[0m${WARN.length ? ` (${WARN.length} warning)` : ""}` +
    (SKELETON ? `\n  Structure holds. Hand it to Gemini for the lines, then re-run WITHOUT --skeleton.` : ""));
process.exit(FAIL.length ? 1 : 0);
