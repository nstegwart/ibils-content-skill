#!/usr/bin/env node
/**
 * THE VOICE RUNTIME — the axis the engine did not have.
 *
 * The 30s ad is PICTURE-FIRST: shot lengths are decided (whole beats at 90 BPM) and everything
 * conforms. A voiced piece inverts that. The performance decides how long a line takes, so the
 * VOICE OWNS THE CLOCK and the picture is cut to it. This file produces the artifact that inversion
 * needs — a timing manifest — from any of three sources, so nothing downstream cares which.
 *
 *   node runtime/voice/voice.mjs synth   script.json --out work/     # AI TTS (macOS `say`)
 *   node runtime/voice/voice.mjs ingest  script.json --takes takes/  # one file per line, from a human
 *   node runtime/voice/voice.mjs split   script.json --take one.wav  # a single-take human read
 *   node runtime/voice/voice.mjs verify  work/timing.json            # did they read the approved copy?
 *   node runtime/voice/voice.mjs caption work/timing.json --out cues/
 *
 * script.json is written by Gemini (standing owner rule):
 *   { "language":"id", "register":"lo-gue",
 *     "beats":[ { "beat":"SETUP", "lines":[
 *        { "id":"L01", "text":"...", "pause_after_ms":400, "shot":"s1", "delivery":"tired" } ]} ] }
 *
 * The `pause_after_ms` field is not decoration. It is the AUTHORED comic/dramatic beat, and the
 * comedy format's `pre_punch_hold` assert measures the real gap against it. A joke's timing is a
 * number here, checkable in a build.
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const sh = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8" });
const dur = (f) => parseFloat(sh("ffprobe",
  ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).stdout) || 0;

const argv = process.argv.slice(2);
const CMD = argv[0];
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };

function flatten(script) {
  const out = [];
  for (const b of script.beats || []) {
    for (const l of b.lines || []) out.push({ ...l, beat: b.beat });
  }
  if (!out.length) throw new Error("script has no lines");
  return out;
}

/** The one artifact everything downstream consumes. Picture is cut against THIS. */
function manifest(script, lines) {
  let t = 0;
  const cues = lines.map((l) => {
    const t0 = t;
    const t1 = t0 + l.seconds;
    t = t1 + (l.pause_after_ms || 0) / 1000;
    return {
      id: l.id, beat: l.beat, shot: l.shot || null, text: l.text,
      t0: +t0.toFixed(3), t1: +t1.toFixed(3),
      pause_after: +((l.pause_after_ms || 0) / 1000).toFixed(3),
      audio: l.audio,
    };
  });
  return {
    language: script.language, register: script.register,
    timing_master: "voice",
    total: +t.toFixed(3),
    lines: cues,
  };
}

// ---------------------------------------------------------------- AI TTS
// The gift of TTS is that alignment is FREE: synthesise one file per line and the duration IS the
// timing. No aligner, no ASR, no guessing.
//
// THE CEILING, stated plainly so nobody ships past it: macOS has exactly ONE Indonesian voice,
// Damayanti, and she reads FORMAL Indonesian. The owner's locked ad register is lo/gue. Her diction
// against that register is a collision — it sounds broken, not casual. So `say` is good for:
//   - a SCRATCH track (cut the whole picture against it, approve the edit, swap the human in later)
//   - deadpan-robot delivery when the flatness IS the joke
//   - animatics for sign-off before spending codex/grok budget
// It is NOT good enough for sincere narration or any paid ad. Do not ship it as a final track.
async function synth(script, outDir) {
  const voice = script.tts_voice || (script.language === "id" ? "Damayanti" : "Samantha");
  const have = sh("say", ["-v", "?"]).stdout || "";
  if (!have.split("\n").some((l) => l.startsWith(voice + " ") || l.startsWith(voice + "\t")))
    throw new Error(`voice "${voice}" not installed. \`say -v '?'\` to list.`);

  await fs.mkdir(outDir, { recursive: true });
  const lines = flatten(script);
  for (const l of lines) {
    const aiff = path.join(outDir, `${l.id}.aiff`);
    const wav = path.join(outDir, `${l.id}.wav`);
    const r = sh("say", ["-v", voice, "-o", aiff, l.text]);
    if (r.status !== 0) throw new Error(`say failed on ${l.id}: ${r.stderr}`);
    sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-i", aiff, "-ar", "48000", "-ac", "1", wav]);
    l.audio = wav;
    l.seconds = dur(wav);
    console.log(`  ${l.id}  ${l.seconds.toFixed(2)}s  ${l.text}`);
  }
  console.log(`\n  voice: ${voice}  (SCRATCH GRADE — see the ceiling note in this file)`);
  return manifest(script, lines);
}

// ---------------------------------------------------------------- human, one file per line
// This recording protocol IS the alignment strategy. One file per numbered line means:
//   - timing is per-file duration. No ASR needed to CUT.
//   - a retake replaces exactly one file. No re-alignment of anything else.
// Record on a phone. Any format ffmpeg reads.
async function ingest(script, takesDir, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  const lines = flatten(script);
  const files = await fs.readdir(takesDir);
  for (const l of lines) {
    const hit = files.find((f) => f.replace(/\.[^.]+$/, "").toLowerCase() === l.id.toLowerCase());
    if (!hit) throw new Error(`no take for ${l.id} — expected ${takesDir}/${l.id}.<any audio ext>`);
    const wav = path.join(outDir, `${l.id}.wav`);
    // trim dead air at both ends, high-pass the room rumble, normalise
    sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-i", path.join(takesDir, hit),
      "-af", "highpass=f=80,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB," +
             "areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,areverse",
      "-ar", "48000", "-ac", "1", wav]);
    l.audio = wav;
    l.seconds = dur(wav);
    if (l.seconds < 0.15) throw new Error(`${l.id} is ${l.seconds}s after trimming — is the take silent?`);
    console.log(`  ${l.id}  ${l.seconds.toFixed(2)}s  ${l.text}`);
  }
  return manifest(script, lines);
}

// ---------------------------------------------------------------- human, single take
// Fallback when the team records straight through. Split on the pauses they left.
async function split(script, take, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  const lines = flatten(script);
  const probe = sh("ffmpeg", ["-nostdin", "-v", "info", "-i", take,
    "-af", "silencedetect=noise=-38dB:d=0.40", "-f", "null", "-"]);
  const log = probe.stderr || "";
  const starts = [...log.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...log.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => +m[1]);
  const total = dur(take);

  // speech spans = the gaps BETWEEN silences
  const spans = [];
  let cursor = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] > cursor + 0.05) spans.push([cursor, starts[i]]);
    cursor = ends[i] ?? total;
  }
  if (cursor < total - 0.05) spans.push([cursor, total]);

  if (spans.length !== lines.length) {
    throw new Error(
      `found ${spans.length} spoken spans but the script has ${lines.length} lines.\n` +
      `A single-take split is a guess. Re-record ONE FILE PER LINE (voice.mjs ingest) — it is the\n` +
      `protocol this pipeline is built on, and it makes retakes surgical.`);
  }
  for (let i = 0; i < lines.length; i++) {
    const [a, b] = spans[i];
    const wav = path.join(outDir, `${lines[i].id}.wav`);
    sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-ss", String(a), "-to", String(b), "-i", take,
      "-af", "highpass=f=80", "-ar", "48000", "-ac", "1", wav]);
    lines[i].audio = wav;
    lines[i].seconds = b - a;
    console.log(`  ${lines[i].id}  ${(b - a).toFixed(2)}s  ${lines[i].text}`);
  }
  return manifest(script, lines);
}

// ---------------------------------------------------------------- the honesty gate, for audio
// The registry-can-be-wrong doctrine extends to the voice track. A reader ad-libs, drops a clause,
// or says the wrong number — and today nothing would catch it until the piece is cut. Transcribe
// what was ACTUALLY said and diff it against the approved copy, BEFORE plates are ordered.
function verify(man) {
  const model = process.env.WHISPER_MODEL ||
    path.join(process.env.HOME, ".cache/whisper/ggml-base.bin");
  if (!fsSync.existsSync(model)) {
    console.log("  whisper model not found — skipping the audio honesty gate.");
    console.log("  brew install whisper-cpp && curl -sL -o ~/.cache/whisper/ggml-base.bin \\");
    console.log("    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin");
    return 0;
  }
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
  let bad = 0;
  for (const l of man.lines) {
    const w16 = l.audio.replace(/\.wav$/, ".16k.wav");
    sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-i", l.audio, "-ar", "16000", "-ac", "1", w16]);
    const r = sh("whisper-cli", ["-m", model, "-f", w16, "-l", man.language || "auto", "-nt"]);
    const said = norm((r.stdout || "").replace(/\[[^\]]*\]/g, ""));
    const want = norm(l.text);
    // token recall — a reader who drops half the line is what we are hunting, not one wrong vowel
    const wantWords = want.split(" ").filter(Boolean);
    const hit = wantWords.filter((w) => said.includes(w)).length;
    const recall = wantWords.length ? hit / wantWords.length : 1;
    if (recall < 0.7) {
      bad++;
      console.log(`  \x1b[31mMISMATCH\x1b[0m ${l.id} (recall ${(recall * 100) | 0}%)`);
      console.log(`     approved: ${l.text}`);
      console.log(`     spoken  : ${said}`);
    } else {
      console.log(`  ok  ${l.id}  (${(recall * 100) | 0}%)`);
    }
  }
  return bad;
}

// ---------------------------------------------------------------- captions
// LAW 1 says type is BAKED into the plate, never overlaid. Dialogue captions are the ONE sanctioned
// exception — they change faster than shots and cannot be baked. But they are still OUR typography,
// not a subtitle bar:
//
//   - this ffmpeg has NO `subtitles` filter (no libass). The .srt route does not exist here.
//   - so each cue is rendered as a PNG with our own font, and overlaid.
//   - THE TRAP: a naive overlay paints the transparent PNG's alpha OPAQUE BLACK. This has bitten
//     this project before. The fix is to force `format=rgba` on BOTH inputs BEFORE the overlay.
//     That is the `format=rgba` in the filter below and it is not optional.
async function caption(man, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  const FONTS = ["/System/Library/Fonts/HelveticaNeue.ttc", "/System/Library/Fonts/Helvetica.ttc"];
  const font = FONTS.find((f) => fsSync.existsSync(f));
  if (!font) throw new Error("no usable font file");

  const parts = [];
  for (const [i, l] of man.lines.entries()) {
    const png = path.join(outDir, `${l.id}.png`);
    const r = sh("magick", ["-background", "none", "-fill", "#FBF6E9", "-font", font,
      "-pointsize", "46", "-interword-spacing", "4",
      `caption:${l.text}`, "-size", "820x", "-bordercolor", "none", "-border", "12", png]);
    if (r.status !== 0) throw new Error(`caption render failed for ${l.id}: ${r.stderr}`);
    parts.push({ i: i + 1, png, t0: l.t0, t1: l.t1 });
  }

  // the ffmpeg graph, with the alpha fix baked in
  const inputs = parts.map((p) => `-i ${p.png}`).join(" ");
  let chain = "[0:v]format=rgba[base]";
  parts.forEach((p, k) => {
    const src = k === 0 ? "base" : `v${k}`;
    chain += `;[${p.i}:v]format=rgba[c${p.i}]` +
      `;[${src}][c${p.i}]overlay=x=(W-w)/2:y=H-h-140:enable='between(t,${p.t0},${p.t1})'[v${k + 1}]`;
  });
  chain += `;[v${parts.length}]format=yuv420p[vout]`;

  const cmd = `ffmpeg -i <PICTURE.mp4> ${inputs} -filter_complex "${chain}" -map "[vout]" -map 0:a? -c:a copy out.mp4`;
  await fs.writeFile(path.join(outDir, "burn.sh"), `#!/bin/bash\n# generated — captions overlaid with OUR type, alpha-safe\nset -e\n${cmd}\n`);
  console.log(`  ${parts.length} caption cues -> ${outDir}`);
  console.log(`  burn command written to ${path.join(outDir, "burn.sh")}`);
}

// ---------------------------------------------------------------- main
async function main() {
  const OUT = path.resolve(arg("--out", "work"));
  if (!CMD || CMD === "--help") {
    console.log("usage: voice.mjs <synth|ingest|split|verify|caption> ...");
    process.exit(1);
  }

  if (CMD === "verify") {
    const man = JSON.parse(await fs.readFile(path.resolve(argv[1]), "utf8"));
    const bad = verify(man);
    console.log(bad ? `\n  ${bad} line(s) do not match the approved copy.` : "\n  every line matches the approved copy.");
    process.exit(bad ? 1 : 0);
  }
  if (CMD === "caption") {
    const man = JSON.parse(await fs.readFile(path.resolve(argv[1]), "utf8"));
    await caption(man, OUT);
    return;
  }

  const script = JSON.parse(await fs.readFile(path.resolve(argv[1]), "utf8"));
  let man;
  if (CMD === "synth") man = await synth(script, OUT);
  else if (CMD === "ingest") man = await ingest(script, path.resolve(arg("--takes", "takes")), OUT);
  else if (CMD === "split") man = await split(script, path.resolve(arg("--take", "")), OUT);
  else throw new Error(`unknown command: ${CMD}`);

  const mf = path.join(OUT, "timing.json");
  await fs.writeFile(mf, JSON.stringify(man, null, 2) + "\n");
  console.log(`\n  total ${man.total}s across ${man.lines.length} lines`);
  console.log(`  timing manifest -> ${mf}`);
  console.log("  the picture is now cut against THIS. The voice owns the clock.");
}

main().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
