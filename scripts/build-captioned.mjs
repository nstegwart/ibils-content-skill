#!/usr/bin/env node
/**
 * Build a CAPTIONED film.  `node scripts/build-captioned.mjs <script.json|ledger.json> <dir> <out.mp4>`
 *
 * There is no voiceover. grok has no voice tool (probed and confirmed), and macOS TTS is not
 * shippable — so the caption IS the narration, and the picture has to carry the rest.
 *
 * THE CAPTION TRAP, and it has bitten this project before: ffmpeg paints a transparent PNG's alpha
 * OPAQUE BLACK on a naive overlay. This ffmpeg also has NO `subtitles` filter (no libass), so the
 * .srt route does not exist here either. The fix is to force `format=rgba` on BOTH inputs before the
 * overlay — and that is not a workaround, it is better: we render the type ourselves, in our own
 * face, in the film's own grade. A libass subtitle looks like a subtitle. This looks like the film.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const NIGHT = "#0E3B33";
const CREAM = "#FBF6E9";
const FONTS = [
  "/System/Library/Fonts/HelveticaNeue.ttc",
  "/System/Library/Fonts/Helvetica.ttc",
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
];
const FONT = FONTS.find((f) => fs.existsSync(f));
if (!FONT) throw new Error("no usable font file");

const sh = (bin, args) => {
  const r = spawnSync(bin, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${bin} failed: ${(r.stderr || "").slice(-400)}`);
  return r;
};
const dur = (f) => parseFloat(sh("ffprobe",
  ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).stdout) || 0;

// ── THE LIGHT GATE ──────────────────────────────────────────────────────────────────────────────
// The owner's standing note, given once already and earned again here:
//
//     "habis gelap terbitlah terang — sekarang semuanya gelap"
//
// The first cut of the story had five consecutive shots at Y=31-45 against Y=93-114 for the rest. On
// a laptop in a dark room they read as moody. On a phone, outdoors, which is where every single one
// of these will actually be watched, they are BLACK RECTANGLES WITH A CAPTION ON THEM. And it is not
// even the look we wrote: this film's own art direction says the dominant tone is prairie cream and
// "the horror is that NONE OF IT LOOKS LIKE HORROR." A shot the viewer cannot see is not a dark shot.
// It is a missing shot.
//
// So: measure every shot, lift only the ones that need it, and gate the result. `gamma` (not
// `brightness`) because gamma lifts the shadows and midtones while leaving the highlight alone —
// which is what keeps the phone glow, the one amber in this film, from washing out into cream.
const FLOOR = 55;     // below this, nobody sees the picture
const TARGET = 68;    // a legible night. still night. you can just see the room.

function luma(file, at) {
  const out = sh("ffmpeg", ["-nostdin", "-ss", String(at), "-t", "0.5", "-i", file,
    "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"]).stderr || "";
  const vals = [...out.matchAll(/YAVG=([\d.]+)/g)].map((m) => +m[1]);
  if (!vals.length) throw new Error(`cannot measure luma of ${file} — signalstats said nothing`);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Y_out = 255 * (Y_in/255)^(1/g)  ->  solve for the g that lands Y_in on TARGET.
function gammaFor(y) {
  if (y >= FLOOR) return 1;
  const g = Math.log(y / 255) / Math.log(TARGET / 255);
  return Math.min(1.9, Math.max(1, +g.toFixed(3)));   // past ~1.9 you are amplifying grain, not light
}

const [, , scriptPath, dirPath, outPath] = process.argv;
if (!scriptPath || !dirPath || !outPath) {
  console.error("usage: build-captioned.mjs <script.json> <dir> <out.mp4>");
  process.exit(1);
}
const S = JSON.parse(fs.readFileSync(path.resolve(scriptPath), "utf8"));
const DIR = path.resolve(dirPath);
const OUT = path.resolve(outPath);
const W = 720, H = 1280, FPS = 60;
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "cap-"));

// units: story ledger (scenes) or comedy script (beats/lines)
const units = S.scenes
  ? S.scenes.map((x) => ({ id: `v${String(x.n).padStart(2, "0")}`, dur: x.dur, cap: x.caption ?? x.vo, pause: 0 }))
  : S.beats.flatMap((b) => b.lines).map((l, i) => ({
      id: `v${String(i + 1).padStart(2, "0")}`, dur: l.est_seconds,
      cap: l.caption ?? l.text, pause: (l.pause_after_ms || 0) / 1000 }));

console.log(`\ncutting ${units.length} shots — captions + music, NO voice\n`);

const parts = [];
const lumas = [];
for (const u of units) {
  const src = path.join(DIR, "clips", `${u.id}.mp4`);
  if (!fs.existsSync(src)) throw new Error(`missing clip: ${src}`);
  const shotLen = +(u.dur + u.pause).toFixed(2);
  if (shotLen > 6.04) throw new Error(`${u.id} needs ${shotLen}s but grok only gives 6.04s`);

  const cut = path.join(TMP, `${u.id}.mp4`);
  // CUT BY FRAME COUNT, NOT BY SECONDS.
  //
  // `-t 3.0` asks for "about three seconds" and gives you 2.94, because the trim lands wherever the
  // nearest frame boundary happens to be. Nine shots of "about" cost 0.5s across this film — and the
  // drift is not cosmetic, because THE SCORE IS A GLOBAL TIMELINE. The comedy score goes silent at
  // exactly 12.0s. If the picture arrives at its punch cut at 11.8s, then two tenths of cheerful
  // F-major plays straight over the receipt roll coming out the door: the precise bug I just spent an
  // hour removing from the score, walking back in through the video.
  //
  // A frame count is an integer. It does not drift. round(3.0 * 60) = 180 frames, and 180 frames at
  // 60fps is three seconds, exactly, forever.
  const frames = Math.round(shotLen * FPS);

  // Only interpolate what actually needs it. grok delivers 24fps and must be brought up to 60; the
  // rendered endcard is already 60 and running motion interpolation over it is not merely wasted work
  // — minterpolate hands back one frame FEWER than it was given, so a 156-frame card came out at 155
  // and failed the frame assert. Motion-compensating a still image is asking a filter to invent
  // motion that is definitionally not there.
  const srcFps = (() => {
    const r = sh("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries",
      "stream=r_frame_rate", "-of", "csv=p=0", src]).stdout.trim();
    const [n, d] = r.split("/").map(Number);
    return d ? n / d : n;
  })();
  const interp = srcFps < FPS - 1
    ? `minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,`
    : `fps=${FPS},`;

  sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-i", src,
    "-filter_complex",
    // LAW 4: no time-stretch. LAW 5: no zoompan. grok's motion IS the motion; we only interpolate it
    // up to 60fps and then cut it to length.
    `[0:v]scale=${W}:${H}:flags=lanczos,setsar=1,${interp}setpts=PTS-STARTPTS,format=yuv420p[v]`,
    "-map", "[v]", "-frames:v", String(frames), "-fps_mode", "cfr", "-r", String(FPS),
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", cut]);

  const nf = +sh("ffprobe", ["-v", "error", "-select_streams", "v", "-count_frames",
    "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", cut]).stdout.trim();
  if (nf !== frames) throw new Error(`${u.id} is ${nf} frames, must be exactly ${frames}`);

  // SHOT-MATCH. Measure the shot; lift it only if it is under the floor.
  const y0 = luma(cut, shotLen / 2);
  const g = gammaFor(y0);
  const lit = path.join(TMP, `${u.id}-lit.mp4`);
  if (g > 1) {
    // gamma_weight<1 holds the highlights back, so lifting the room does not also lift the phone
    // screen into a white blob. The phone is the only warm light in this film; it is not spendable.
    sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-i", cut,
      "-vf", `eq=gamma=${g}:gamma_weight=0.82,format=yuv420p`,
      "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", lit]);
  } else {
    fs.copyFileSync(cut, lit);
  }
  const y1 = luma(lit, shotLen / 2);

  // THE CAPTION READS WHAT IS BEHIND IT.
  //
  // Cream type on a black scrim is right for a dark kitchen at 2am and WRONG for the cream endcard —
  // there it is a grey smudge across the bottom of the product. A caption is not a fixed graphic; it
  // is the one element of the film that is obliged to be legible no matter what is under it. So
  // measure the strip it will actually land on, and flip the whole treatment if that strip is bright.
  const stripY = luma(lit, shotLen / 2);       // shot-level luma is close enough to choose polarity
  const bright = stripY > 140;
  const ink = bright ? NIGHT : CREAM;
  const scrim = bright ? "white@0.30" : "black@0.42";

  const png = path.join(TMP, `${u.id}.png`);
  sh("magick", ["-background", "none", "-fill", ink, "-font", FONT, "-pointsize", "44",
    "-interline-spacing", "8", "-size", "600x", `caption:${u.cap}`,
    "-bordercolor", "none", "-border", "24", png]);

  const capped = path.join(TMP, `${u.id}-cap.mp4`);
  // *** format=rgba ON BOTH INPUTS. Without it ffmpeg paints the alpha OPAQUE BLACK. ***
  sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-i", lit, "-i", png,
    "-filter_complex",
    `[0:v]format=rgba[bg];[1:v]format=rgba[fg];` +
    // a scrim, not a slab: it lifts contrast without becoming a graphic in its own right
    `[bg]drawbox=x=0:y=ih-330:w=iw:h=330:color=${scrim}:t=fill[bgs];` +
    `[bgs][fg]overlay=x=(W-w)/2:y=H-h-90:format=auto,format=yuv420p[v]`,
    "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", capped]);

  parts.push(capped);
  lumas.push({ id: u.id, y0, y1, g });
  const lift = g > 1 ? `Y ${y0.toFixed(0)} -> ${y1.toFixed(0)} (gamma ${g})` : `Y ${y0.toFixed(0)}`;
  console.log(`  ${u.id}  ${shotLen}s  ${(u.cap.length / u.dur).toFixed(1)} c/s  ${lift.padEnd(26)} ${u.cap.slice(0, 40)}`);
}

// THE GATE. A shot still under the floor after the lift is a shot the viewer will not see, and it
// ships over my objection or it does not ship.
const dark = lumas.filter((l) => l.y1 < FLOOR);
if (dark.length) {
  console.error(`\n${dark.length} shot(s) are still too dark to read on a phone (floor Y=${FLOOR}):`);
  for (const d of dark) console.error(`  ${d.id}  Y=${d.y1.toFixed(1)} even at gamma ${d.g} — RE-ROLL THE PLATE, it has no light in it`);
  process.exit(1);
}

const list = path.join(TMP, "list.txt");
fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
const picture = path.join(TMP, "picture.mp4");
sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", picture]);

// THE PICTURE AND THE SCORE MUST AGREE ON WHAT TIME IT IS.
// The score's whole architecture is timestamps — the story's figure dies at 17.0s, the comedy's band
// stops at 12.0s. Those numbers were written against the script's declared durations. If the
// assembled picture is not that long, then every musical decision in the film is pointing at the
// wrong frame, and it will feel vaguely wrong in a way nobody can name.
const declared = +units.reduce((s, u) => s + u.dur + u.pause, 0).toFixed(2);
const actual = dur(picture);
if (Math.abs(actual - declared) > 0.02) {
  throw new Error(`picture is ${actual}s but the script says ${declared}s — the score is aimed at ${declared}s`);
}
console.log(`\n  picture ${actual.toFixed(2)}s == script ${declared}s  (the score is aimed here)`);

// grade last, over the whole cut
const graded = path.join(TMP, "graded.mp4");
sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-i", picture, "-filter_complex",
  // the old curve pulled midtones DOWN (0.5->0.47) — it was darkening the film underneath the
  // shot-match that had just brightened it. Now it lifts the toe and leaves the middle alone.
  "[0:v]curves=all='0/0.04 0.25/0.27 0.5/0.51 1/0.96',eq=saturation=0.9,noise=alls=4:allf=t+u,format=yuv420p[v]",
  "-map", "[v]", "-r", String(FPS), "-c:v", "libx264", "-preset", "slow", "-crf", "16",
  "-pix_fmt", "yuv420p", graded]);

const total = dur(graded);
const MUSIC = S.music && fs.existsSync(S.music) ? S.music : null;
if (MUSIC) {
  const m = path.join(TMP, "m.m4a");
  sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-ss", String(S.music_offset ?? 0), "-t", String(total),
    "-i", MUSIC, "-af",
    `afade=t=in:st=0:d=1.0,afade=t=out:st=${(total - 2.0).toFixed(2)}:d=2.0,` +
    // two-pass loudnorm + a limiter with auto-level OFF (its default MAKES IT LOUDER)
    "loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.891:level=disabled",
    "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "192k", m]);
  sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-i", graded, "-i", m,
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", OUT]);
} else {
  console.log("\n  NO MUSIC — shipping picture only. A captioned film with no sound is not finished.");
  fs.copyFileSync(graded, OUT);
}

const d = dur(OUT);
console.log(`\n${OUT}  ${d.toFixed(1)}s  ${MUSIC ? "with music" : "SILENT"}`);
fs.rmSync(TMP, { recursive: true, force: true });
