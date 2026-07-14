#!/usr/bin/env node
/**
 * THE ENDCARD.  `node scripts/make-endcard.mjs <app-screen.png> <out.mp4> <seconds>`
 *
 * grok gave us a beautiful final shot for the comedy: a hand holding a phone in the warung. The phone
 * screen was BLANK WHITE. Of course it was — we forbid it from inventing app UI (it would hallucinate
 * a wordmark, bend the type, invent balances), so it did the only other thing it could and handed us
 * a placeholder. A blank white rectangle where the product should be is not an endcard. It is the
 * absence of one.
 *
 * The standing rule has always been: NEVER DRAW APP UI. Composite the real screenshot. So the endcard
 * is not photographed at all — it is RENDERED, from the real App Store screenshot, in a device frame
 * we draw ourselves with straight edges and exact corners.
 *
 * It is also the only cream frame in a film that has been watching a man lie to himself for fifteen
 * seconds. He is in the dark about his own money for the whole picture; the app is where the lights
 * come on. That is not decoration — that is the argument.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CREAM = "#FBF6E9";
const NIGHT = "#0E3B33";
const LOGO = path.join(HERE, "..", "assets", "ibils-logo-card.png");

const sh = (bin, args) => {
  const r = spawnSync(bin, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${bin} failed: ${(r.stderr || "").slice(-400)}`);
  return r;
};

const [, , screenPath, outPath, secs = "2.6"] = process.argv;
if (!screenPath || !outPath) {
  console.error("usage: make-endcard.mjs <app-screen.png> <out.mp4> [seconds]");
  process.exit(1);
}
const SCREEN = path.resolve(screenPath);
const OUT = path.resolve(outPath);
if (!fs.existsSync(SCREEN)) throw new Error(`no app screenshot at ${SCREEN}`);
if (!fs.existsSync(LOGO)) throw new Error(`no logo at ${LOGO}`);

const W = 720, H = 1280, FPS = 60;
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "end-"));
const png = path.join(TMP, "card.png");

// device geometry. The screen keeps the real screenshot's aspect (1290x2796 ≈ 0.4614) so the UI is
// never stretched — a squashed app screenshot reads as fake instantly, and it is the one thing in
// the frame the viewer already knows the true shape of.
const BEZEL = 9;
const SCREEN_H = 640;
const SCREEN_W = Math.round(SCREEN_H * (1290 / 2796));   // 318
const BODY_W = SCREEN_W + BEZEL * 2;
const BODY_H = SCREEN_H + BEZEL * 2;

// RESERVE BOTH VOIDS, THEN PLACE INTO WHAT IS LEFT.
//
// The caption owns the bottom 330px (scrim + type). The logo owns the top 190px. The phone gets the
// band between them and may not touch either — the FIRST render of this card put the logo at y=72
// (ending at 176) and the phone at y=161, so the logo sat squarely on the phone's top bezel. That is
// the same bug, in the same file family, that shipped a broken carousel closing slide with a phone
// composited on top of the headline. The lesson evidently did not take the first time, so it stops
// being a lesson and becomes arithmetic: reserve the voids, derive the position, assert both edges.
const RESERVED = 330;      // bottom: caption
const TOPZONE = 190;       // top: logo
const LOGO_PX = 104;
const band = H - RESERVED - TOPZONE;
if (BODY_H > band) throw new Error(`the phone is ${BODY_H}px but only ${band}px is free between the logo and the caption`);
const phoneY = TOPZONE + Math.round((band - BODY_H) / 2);
if (phoneY < TOPZONE) throw new Error(`the phone at y=${phoneY} is inside the logo's ${TOPZONE}px zone`);
if (phoneY + BODY_H > H - RESERVED) throw new Error(`the phone ends at ${phoneY + BODY_H}, inside the caption's void`);

// 1. the screenshot, resized and rounded to sit inside the bezel
const screen = path.join(TMP, "screen.png");
sh("magick", [SCREEN, "-resize", `${SCREEN_W}x${SCREEN_H}!`,
  "(", "+clone", "-alpha", "extract", "-draw", `fill black polygon 0,0 0,14 14,0`,
  "(", "+clone", "-flip", ")", "-compose", "Multiply", "-composite",
  "(", "+clone", "-flop", ")", "-compose", "Multiply", "-composite", ")",
  "-alpha", "off", "-compose", "CopyOpacity", "-composite", screen]);

// 2. the body: a matte-black slab, real corners, a real shadow
const body = path.join(TMP, "body.png");
sh("magick", ["-size", `${BODY_W}x${BODY_H}`, "xc:none", "-fill", "#141414",
  "-draw", `roundrectangle 0,0 ${BODY_W - 1},${BODY_H - 1} 22,22`,
  screen, "-gravity", "NorthWest", "-geometry", `+${BEZEL}+${BEZEL}`, "-composite", body]);

// 3. the card. CREAM — the only bright frame in the film.
sh("magick", ["-size", `${W}x${H}`, `xc:${CREAM}`, "-gravity", "NorthWest",
  // a soft floor shadow so the device sits ON something instead of floating
  "(", body, "-background", "black", "-shadow", "38x18+0+12", ")",
  "-geometry", `+${Math.round((W - BODY_W) / 2) - 14}+${phoneY + 6}`, "-composite",
  "(", body, ")", "-geometry", `+${Math.round((W - BODY_W) / 2)}+${phoneY}`, "-composite",
  "(", LOGO, "-resize", `${LOGO_PX}x${LOGO_PX}`, ")", "-geometry", `+${Math.round((W - LOGO_PX) / 2)}+56`, "-composite",
  png]);

// PROVE the phone did not land in the caption's zone. The carousel shipped exactly this bug once:
// I knew the fix, and did not apply it to a new deck. So it is an assertion now, not a memory.
// `identify` CANNOT crop — that mistake once failed every slide in a clean deck. Use the convert path.
const strip = path.join(TMP, "strip.png");
sh("magick", [png, "-crop", `${W}x${RESERVED}+0+${H - RESERVED}`, "+repage", strip]);
const dev = +(sh("magick", [strip, "-colorspace", "gray", "-format", "%[fx:standard_deviation]", "info:"]).stdout);
if (dev > 0.06) throw new Error(`something is in the caption's ${RESERVED}px void (stddev ${dev.toFixed(3)}) — it will collide with the type`);

// 4. hold it. An endcard is a card: it does not drift, it does not push in, it does not breathe.
// It is the one moment in the film that stops moving, which is what makes you read it.
sh("ffmpeg", ["-nostdin", "-y", "-v", "error", "-loop", "1", "-i", png, "-t", String(secs),
  "-vf", `scale=${W}:${H},format=yuv420p`, "-r", String(FPS),
  "-frames:v", String(Math.round(parseFloat(secs) * FPS)),
  "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", OUT]);

console.log(`endcard: ${path.basename(SCREEN)} -> ${OUT}  ${secs}s  (caption void clear, stddev ${dev.toFixed(3)})`);
fs.rmSync(TMP, { recursive: true, force: true });
