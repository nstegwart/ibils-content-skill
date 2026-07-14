#!/usr/bin/env node
/**
 * THE CLOSING PLATE — rendered, not generated.
 *
 *   node scripts/make-closing-plate.mjs "<headline>" <out.png> [--light]
 *
 * THE CLOSING SLIDE IS A CARD. IT IS NOT A PHOTOGRAPH. SO STOP ASKING A PHOTOGRAPHER FOR IT.
 *
 * The owner sent this one slide back three times, and it was a different defect every time:
 *
 *   1. the composited phone landed on top of the word "number"
 *   2. the phone was too tight against the type ("terlalu mepet")
 *   3. a baked shadow showed as a hard rectangle, and the store badges sat 100px off-centre
 *
 * Every fix was correct and every re-roll produced a NEW defect, because each one went back to codex
 * for the plate — and codex is a slot machine. It gave a cream newsprint plate for a deep-green deck.
 * It gave green. It gave cream again. It drew an amber dot ornament straight through the headline. The
 * brief got longer and more defensive each time, and the gates got sharper, and none of that could fix
 * the actual problem: WE WERE ROLLING DICE FOR SOMETHING THAT HAS NO UNKNOWNS IN IT.
 *
 * Look at what this slide is: a solid brand background, a headline, a device, two store badges, a
 * logo. Every single element is known, fixed, and ours. There is nothing to imagine. A generative
 * model can only add variance to it — which is exactly what it kept doing.
 *
 * So the plate is rendered here, deterministically, and the voids the phone and badges need are not
 * "reserved" by asking nicely in a prompt and then measured with a gate hoping the model complied.
 * They are EMPTY BECAUSE NOTHING IS DRAWN IN THEM. The gates in finalize.js still run — but they can
 * no longer fail, and a gate that cannot fail is what a solved problem looks like.
 *
 * (The content slides still go to codex. They have real illustration in them. This one never did.)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const NIGHT = "#0E3B33";
const CREAM = "#FBF6E9";

// A high-contrast display serif — the face the deck has always used. ImageMagick on this machine has
// ZERO registered fonts, so a font NAME never resolves and silently falls back to something awful.
// It must be an absolute FILE path, and it must be checked.
const FACES = [
  "/System/Library/Fonts/Supplemental/Didot.ttc",
  "/System/Library/Fonts/Supplemental/Bodoni 72.ttc",
  "/System/Library/Fonts/Supplemental/Baskerville.ttc",
  "/System/Library/Fonts/Times.ttc",
];
const FONT = FACES.find((f) => fs.existsSync(f));
if (!FONT) throw new Error("no display serif found — a font NAME will not resolve here, only a file path");

const sh = (args) => {
  const r = spawnSync("magick", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`magick: ${(r.stderr || "").slice(-300)}`);
  return r;
};

const args = process.argv.slice(2);
const LIGHT = args.includes("--light");
const [HEADLINE, OUT] = args.filter((a) => !a.startsWith("--"));
if (!HEADLINE || !OUT) {
  console.error('usage: make-closing-plate.mjs "<headline>" <out.png> [--light]');
  process.exit(1);
}

const W = 1080, H = 1350;
const BG = LIGHT ? CREAM : NIGHT;
const INK = LIGHT ? NIGHT : CREAM;

// THE COLUMNS. These are the same numbers finalize.js derives the phone position from, and that is
// the point: the void is empty because the type physically cannot reach it, not because a prompt
// asked a model to please leave it alone.
const TYPE_COL = 560;
const MARGIN = 64;
const TEXT_W = TYPE_COL - MARGIN * 2;      // 432px of usable measure
const TOP_RESERVED = 220;                  // the logo's corner
const BOTTOM_RESERVED = 260;               // the store badges

const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "plate-"));
const type = path.join(TMP, "type.png");

// Set the headline as large as it can be while still fitting the measure. `caption:` wraps to the
// given width; we walk the size down until the block also fits the vertical band it is allowed.
const BAND_H = H - TOP_RESERVED - BOTTOM_RESERVED;
let size = 108;
for (; size >= 40; size -= 4) {
  sh(["-background", "none", "-fill", INK, "-font", FONT, "-pointsize", String(size),
    "-interline-spacing", String(Math.round(size * 0.08)),
    "-size", `${TEXT_W}x`, `caption:${HEADLINE}`, "-trim", "+repage", type]);
  const [tw, th] = sh([type, "-format", "%w %h", "info:"]).stdout.trim().split(/\s+/).map(Number);
  if (tw <= TEXT_W && th <= BAND_H) break;
}
const [tw, th] = sh([type, "-format", "%w %h", "info:"]).stdout.trim().split(/\s+/).map(Number);
if (tw > TEXT_W) throw new Error(`the headline is ${tw}px wide and the type column is ${TEXT_W}px — it would run under the phone`);

const ty = TOP_RESERVED + Math.round((BAND_H - th) / 2);

// the ground: solid brand colour, with just enough grain and fall-off that it is a printed surface
// rather than a flat fill. Nothing else. No ornament, no dot grid, no "accent" — every one of those
// is a thing that can land on the headline, and this slide has already done that once.
sh(["-size", `${W}x${H}`, `xc:${BG}`,
  "+noise", "Gaussian", "-attenuate", "0.06", "-colorspace", "sRGB",
  "(", "-size", `${W}x${H}`, `radial-gradient:none-${LIGHT ? "#00000018" : "#00000030"}`, ")",
  "-compose", "over", "-composite",
  type, "-gravity", "NorthWest", "-geometry", `+${MARGIN}+${ty}`, "-composite",
  "-colorspace", "sRGB", OUT]);

// PROVE the voids are empty. Not because I doubt the code — because this exact assertion is what the
// gate in finalize.js is going to run, and if it can fail here it will fail there.
const edges = (x, y, w, h) => parseFloat(sh([OUT, "-crop", `${w}x${h}+${x}+${y}`, "+repage",
  "-colorspace", "gray", "-morphology", "EdgeIn", "Octagon:1", "-threshold", "25%",
  "-format", "%[fx:mean]", "info:"]).stdout);

const phoneCol = edges(TYPE_COL, 0, W - TYPE_COL, H);
const corner = edges(W - 280, 0, 280, 280);
if (phoneCol > 0.003) throw new Error(`the phone column has ${(phoneCol * 100).toFixed(2)}% edges in it`);
if (corner > 0.003) throw new Error(`the logo corner has ${(corner * 100).toFixed(2)}% edges in it`);

console.log(`closing plate: ${W}x${H} ${LIGHT ? "light" : "dark"}  headline ${size}pt (${tw}x${th})  ` +
  `phone column ${(phoneCol * 100).toFixed(2)}% edges, corner ${(corner * 100).toFixed(2)}% -> ${OUT}`);
fs.rmSync(TMP, { recursive: true, force: true });
