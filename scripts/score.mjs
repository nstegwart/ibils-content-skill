#!/usr/bin/env node
/**
 * THE SCORE.  `node scripts/score.mjs <spec.json> <out.wav>`
 *
 * We write the music. We do not licence it, we do not attribute it, we do not discover six months
 * from now that the cue under a paid ad was Content-ID'd. Every note here is ours.
 *
 * The owner has already taught this pipeline the two lessons that matter:
 *
 *   "musik ga cocok sama ACT 1 KEGELAPAN dan ACT 2 TERANG"  — the cue must know what the film is doing
 *   "transisi soundnya ga smooth, lo bisa bikin music sendiri ga?"
 *
 * The fix for the second is the fix for the first: ONE CONTINUOUS PERFORMANCE that CHANGES CHARACTER,
 * never two cues crossfaded. A crossfade is audible because it is two different rooms. A single pedal
 * tone that the arrangement thins out around is not — the harmony carries you across the seam, and
 * nobody hears an edit because there is no edit.
 *
 * SYNTHESIS. One `aevalsrc` per note, harmonics AND the amplitude envelope inside the expression:
 *
 *     aevalsrc='exp(-5*t) * ( sin(2*PI*f*t) + 0.4*sin(2*PI*2*f*t) + ... )'
 *
 * The envelope has to live in the expression, not in a `volume` filter downstream, because a volume
 * filter's clock is the TIMELINE and a note's decay belongs to the NOTE. Put it downstream and every
 * pluck in the piece decays from the same moment — which is silence with a click at the top.
 *
 * The harmonic stack IS the instrument:
 *   pluck  — fast exponential decay, odd+even partials.        a struck string
 *   pad    — slow swell, no decay, near-pure.                   a held breath
 *   bell   — inharmonic partials, very long decay.              a struck object in a room
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SR = 48000;

// equal temperament, A4 = 440. Name -> Hz. (`Eb4`, `F#3`, `D2` ...)
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function hz(name) {
  const m = /^([A-G])([b#]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note: ${name}`);
  const n = SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (+m[3] + 1) * 12;
  return 440 * Math.pow(2, (n - 69) / 12);
}

/**
 * An instrument is a list of [partial, gain] plus an envelope written in ffmpeg's expression
 * language, where `t` is time SINCE THE NOTE STARTED.
 */
const INSTRUMENTS = {
  // struck string. bright at the attack, gone in about a second.
  pluck: {
    partials: [[1, 1.0], [2, 0.42], [3, 0.20], [4, 0.09], [5, 0.05]],
    env: (d) => `exp(-4.2*t)*(1-exp(-220*t))`,   // (1-exp) = a 5ms attack, so it does not CLICK
  },
  // a held breath. swells in, never quite arrives, never quite leaves.
  pad: {
    partials: [[1, 1.0], [2, 0.14], [3, 0.05]],
    env: (d) => `(1-exp(-1.4*t))*exp(-0.10*t)*(0.5+0.5*sin(2*PI*0.13*t))`,  // slow breathing tremolo
  },
  // an object struck in a large room. inharmonic — the partials are NOT integer multiples, which is
  // what makes it read as metal/glass rather than as a musical string.
  bell: {
    partials: [[1, 1.0], [2.76, 0.34], [5.40, 0.16], [8.93, 0.07]],
    env: (d) => `exp(-1.5*t)*(1-exp(-400*t))`,
  },
  // the floor. a sub tone you feel more than hear.
  sub: {
    partials: [[1, 1.0], [2, 0.06]],
    env: (d) => `(1-exp(-2.2*t))*exp(-0.15*t)`,
  },
};

const RELEASE = 0.06;   // 60ms

function noteEnd(n) { return n.at + n.dur + (n.ring ?? 0.6); }

function voice(n) {
  const inst = INSTRUMENTS[n.inst];
  if (!inst) throw new Error(`no instrument: ${n.inst}`);
  const f = hz(n.note);
  const norm = inst.partials.reduce((s, [, g]) => s + g, 0);
  const stack = inst.partials
    .map(([mult, g]) => `${(g / norm).toFixed(4)}*sin(2*PI*${(f * mult).toFixed(3)}*t)`)
    .join("+");
  const gain = (n.gain ?? 1).toFixed(3);
  // release tail: a note is allowed to ring past its written length, which is how a real instrument
  // works and why quantised MIDI sounds like a machine.
  const d = (n.dur + (n.ring ?? 0.6)).toFixed(3);
  // EVERY note gets a 60ms release ramp to zero. `aevalsrc` stops emitting samples the instant its
  // duration is up, so a note still at 19% amplitude when it runs out does not end — it is GUILLOTINED
  // mid-cycle, and a waveform severed mid-cycle is a CLICK. Real envelopes have a release stage for
  // exactly this reason. This also means a note can be written to land precisely on a cut and
  // actually be gone when it gets there, which is what lets a band stop dead.
  const rel = `max(0,min(1,(${d}-t)/${RELEASE}))`;
  return {
    expr: `aevalsrc=exprs='${gain}*(${inst.env(n.dur)})*(${rel})*(${stack})':s=${SR}:d=${d}`,
    delayMs: Math.round(n.at * 1000),
  };
}

const [, , specPath, outPath] = process.argv;
if (!specPath || !outPath) {
  console.error("usage: score.mjs <spec.json|spec.mjs> <out.wav>");
  process.exit(1);
}
// A composition is CODE, not data. A bass figure that repeats eight times is a loop; typing it out
// forty times as JSON is how you end up with a note in the wrong bar and no way to see it.
const spec = /\.mjs$/.test(specPath)
  ? (await import(`file://${path.resolve(specPath)}`)).default
  : JSON.parse(fs.readFileSync(path.resolve(specPath), "utf8"));
const OUT = path.resolve(outPath);
const notes = spec.notes;
if (!notes?.length) throw new Error("a score with no notes is not a score");

// every note must land inside the film. a note that starts after the last frame is a note nobody
// will ever hear, and it is always a spec bug, never a choice.
for (const n of notes) {
  if (n.at >= spec.duration) throw new Error(`note at ${n.at}s is past the ${spec.duration}s end`);
}

// ── SILENCE IS A NOTE, AND IT GETS GATED LIKE ONE ───────────────────────────────────────────────
// The comedy score stops dead at the punch. That is not a mixing preference, it is THE JOKE — the
// viewer has three seconds of nothing in which to notice the receipt roll going out the door. The
// first render of it measured -23.7 dBFS across that window: the bass note before the cut was still
// ringing 0.9 SECONDS INTO IT. A tail bleeding over a punchline is the sound of a comedian talking
// over his own laugh line, and nobody would have been able to say why the joke felt soft.
//
// So a declared silence is checked twice: STATICALLY (no written note may cross into it) and then
// again on the RENDERED FILE (measure it — the echo tail and the envelopes are not in the spec).
for (const [from, to] of spec.silence ?? []) {
  const bleed = notes.filter((n) => n.at < to && noteEnd(n) > from + 0.001);  // adelay is integer-ms
  if (bleed.length) {
    console.error(`\nSILENCE ${from}-${to}s IS NOT SILENT. ${bleed.length} note(s) ring into it:`);
    for (const n of bleed) console.error(`  ${n.inst} ${n.note} at ${n.at}s ends ${noteEnd(n).toFixed(2)}s`);
    process.exit(1);
  }
}
// "the figure must never come back" — a musical fact the story lives or dies on, so it is an assert,
// not a comment. Nothing may re-enter after the turn.
for (const b of spec.banAfter ?? []) {
  const late = notes.filter((n) => n.inst === b.inst && n.at >= b.from);
  if (late.length) {
    console.error(`\n${b.inst} is banned after ${b.from}s (${b.why}) — found ${late.length}`);
    process.exit(1);
  }
}

const parts = [];
const labels = [];
notes.forEach((n, i) => {
  const v = voice(n);
  parts.push(`${v.expr}[n${i}];[n${i}]adelay=${v.delayMs}[d${i}]`);
  labels.push(`[d${i}]`);
});

// normalize=0 — amix's default DIVIDES BY THE NUMBER OF INPUTS, so a 60-note score comes out 60x
// quieter than a 1-note score and the mix gains I wrote above would mean nothing.
const graph = [
  parts.join(";"),
  `${labels.join("")}amix=inputs=${notes.length}:normalize=0:duration=longest[mix]`,
  // a little room. dry-only synthesis sounds like it is inside a phone, because it is.
  `[mix]aecho=0.8:0.85:${spec.room ?? 55}:${spec.roomGain ?? 0.22},` +
    `lowpass=f=${spec.tone ?? 7000},` +
    `atrim=0:${spec.duration},` +
    `afade=t=in:st=0:d=${spec.fadeIn ?? 0.4},` +
    `afade=t=out:st=${(spec.duration - (spec.fadeOut ?? 1.5)).toFixed(2)}:d=${spec.fadeOut ?? 1.5},` +
    // level=disabled. alimiter's DEFAULT IS AUTO MAKE-UP GAIN — `level=true` makes the thing LOUDER,
    // which is the exact opposite of what a limiter is for, and it has caught this project before.
    `alimiter=limit=0.85:level=disabled[out]`,
].join(";");

const r = spawnSync("ffmpeg", ["-nostdin", "-y", "-v", "error", "-filter_complex", graph,
  "-map", "[out]", "-ar", String(SR), "-ac", "1", "-c:a", "pcm_s16le", OUT], { encoding: "utf8" });
if (r.status !== 0) throw new Error(`ffmpeg: ${(r.stderr || "").slice(-500)}`);

// MEASURE it. Do not estimate it. A score that clips is a score that sounds cheap, and true peak is
// measured PER CHANNEL — `-ac 1` on a stereo master downmixes L+R past 1.0 and invents a clip that
// is not there.
const stats = spawnSync("ffmpeg", ["-nostdin", "-v", "error", "-i", OUT,
  "-af", "astats=metadata=1:reset=0", "-f", "null", "-"], { encoding: "utf8" }).stderr || "";
const peak = /Peak level dB:\s*(-?[\d.]+|-inf)/.exec(
  spawnSync("ffmpeg", ["-nostdin", "-i", OUT, "-af", "astats", "-f", "null", "-"],
    { encoding: "utf8" }).stderr || "")?.[1];
const dur = parseFloat(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
  "-of", "csv=p=0", OUT], { encoding: "utf8" }).stdout);

console.log(`${spec.name}`);
console.log(`  ${notes.length} notes  ${dur.toFixed(2)}s  peak ${peak} dBFS  -> ${OUT}`);
if (peak && peak !== "-inf" && parseFloat(peak) > -0.5) {
  console.error(`  CLIPPING at ${peak} dBFS`);
  process.exit(1);
}

// now go and LISTEN to the silence. `-v error` hides astats (it logs at info), which once returned an
// empty string that I very nearly read as "silent" — a muted gauge is not a quiet room.
const FLOOR = -45;
for (const [from, to] of spec.silence ?? []) {
  const out = spawnSync("ffmpeg", ["-nostdin", "-ss", String(from), "-t", String((to - from).toFixed(2)),
    "-i", OUT, "-af", "astats", "-f", "null", "-"], { encoding: "utf8" }).stderr || "";
  const m = /RMS level dB:\s*(-?[\d.]+|-inf)/.exec(out);
  if (!m) { console.error(`  cannot measure ${from}-${to}s — astats said nothing`); process.exit(1); }
  const rms = m[1] === "-inf" ? -Infinity : parseFloat(m[1]);
  const ok = rms < FLOOR;
  console.log(`  silence ${from}-${to}s: ${m[1]} dBFS  ${ok ? "OK" : `NOT SILENT (floor ${FLOOR})`}`);
  if (!ok) process.exit(1);
}
