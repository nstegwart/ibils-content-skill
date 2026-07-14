#!/usr/bin/env node
/**
 * Build assets/closing-phone.png — the device mockup used on the carousel closing slide and in
 * the video end card.
 *
 * Built PROCEDURALLY, on purpose. A generated phone hallucinates the logo, warps the wordmark and
 * bends the bezel. Here the screen is the REAL App Store icon artwork, so the mark is pixel-exact
 * and the edges stay straight.
 *
 *   node scripts/make-closing-phone.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "assets", "closing-phone.png");

// The single source of truth for the brand mark. Same file the App Store ships.
const APP_ICON = "/Users/user/Project/ibils-orchestrator/ibils-budget-tracker/react-native/assets/icon.png";

// device geometry (2x the old asset, so it downsamples crisp instead of upscaling soft)
const W = 820, H = 1660;          // body
const PAD = 200;                  // room for the shadow
const BEZEL = 26;                 // black frame around the glass
const R_BODY = 118;               // body corner radius
const R_SCREEN = R_BODY - BEZEL + 4;

// screen gradient, sampled from the real app icon
const TEAL_TOP = "#4C8B84";
const TEAL_BOT = "#2F6660";

const sh = (args) => new Promise((res, rej) => {
  const c = spawn("magick", args, { stdio: ["ignore", "ignore", "pipe"] });
  let e = ""; c.stderr.on("data", (d) => (e += d));
  c.on("close", (code) => (code === 0 ? res() : rej(new Error(e || `magick ${code}`))));
});

const CW = W + PAD * 2, CH = H + PAD * 2;
const X = PAD, Y = PAD;
const SX = X + BEZEL, SY = Y + BEZEL;
const SW = W - BEZEL * 2, SH_ = H - BEZEL * 2;

async function main() {
  // The brand mark is read from the real app repo. If that tree isn't here, say so — magick's
  // failure for a missing input is cryptic and would look like an ImageMagick bug.
  const icon = process.env.APP_ICON || APP_ICON;
  if (!fs.existsSync(icon)) {
    throw new Error(`app icon not found: ${icon}\n` +
      `Set APP_ICON=/path/to/icon.png (the 1024x1024 App Store icon).`);
  }
  const T = process.env.TMPDIR || "/tmp";
  const p = (n) => path.join(T, `cp_${n}.png`);

  // 1. screen: vertical teal gradient, rounded
  await sh(["-size", `${SW}x${SH_}`, `gradient:${TEAL_TOP}-${TEAL_BOT}`, p("grad")]);
  await sh(["-size", `${SW}x${SH_}`, "xc:none", "-draw",
    `roundrectangle 0,0,${SW - 1},${SH_ - 1},${R_SCREEN},${R_SCREEN}`, "-alpha", "extract", p("smask")]);
  await sh([p("grad"), p("smask"), "-alpha", "off", "-compose", "CopyOpacity", "-composite", p("screen")]);

  // 2. the mark, lifted straight off the real app icon (white-on-teal -> keep only the white)
  //    threshold the icon so we get the mark alone, then tint it pure white.
  const MARK = Math.round(SW * 0.42);
  await sh([icon, "-colorspace", "gray", "-threshold", "70%",
    "-transparent", "black", "-fill", "white", "-colorize", "100",
    "-trim", "+repage", "-resize", `${MARK}x`, p("mark")]);

  // 3. wordmark
  //    ImageMagick here has ZERO registered fonts (`magick -list font` -> 0), so a font NAME like
  //    "Helvetica-Bold" never resolves. Pass an absolute font FILE and fail loudly if none exist.
  const FS = Math.round(SW * 0.13);
  const FONTS = [
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
  ];
  const font = FONTS.find((f) => fs.existsSync(f));
  if (!font) throw new Error(`no usable font file found; tried:\n  ${FONTS.join("\n  ")}`);
  await sh(["-background", "none", "-fill", "white", "-font", font,
    "-pointsize", String(FS), "label:Ibils", "-trim", "+repage", p("word")]);

  // 4. THE LOCKUP. Build the mark and the wordmark into ONE unit, with an EXPLICIT gap, and then
  //    place that unit — instead of placing the two pieces separately and hoping.
  //
  //    They used to be composited independently, each at its own hardcoded percentage of the screen
  //    height (mark at -6%, word at +11%). But BOTH are `-trim`med, so their heights depend on the
  //    artwork — which means the space between them was never a decision at all. It was arithmetic
  //    left over from two numbers that did not know about each other, and it came out cramped: the
  //    owner could see the wordmark crowding the mark ("text ke logo ibils mepet").
  //
  //    A gap you did not choose is a gap you cannot defend. So: measure both pieces, set the leading
  //    from the wordmark's own type size (which is what optical spacing actually keys off), stack
  //    them, and centre the whole lockup once.
  // sh() runs with stdio ignored — it is for side effects, not for reading. Measuring needs its own
  // call that actually keeps stdout.
  const { spawnSync: ss } = await import("node:child_process");
  const dims = (key) => {
    const out = ss("magick", [p(key), "-format", "%w %h", "info:"], { encoding: "utf8" }).stdout;
    const [a, b] = (out || "").trim().split(/\s+/).map(Number);
    if (!a || !b) throw new Error(`cannot measure ${key}`);
    return [a, b];
  };
  const [mw, mh] = dims("mark");
  const [ww, wh] = dims("word");

  const GAP = Math.round(FS * 0.72);        // leading between mark and wordmark
  const LOCK_W = Math.max(mw, ww);
  const LOCK_H = mh + GAP + wh;
  await sh(["-size", `${LOCK_W}x${LOCK_H}`, "xc:none", "-colorspace", "sRGB",
    p("mark"), "-gravity", "north", "-geometry", "+0+0", "-composite",
    p("word"), "-gravity", "south", "-geometry", "+0+0", "-composite",
    p("lockup")]);

  //    Optical centring: a lockup on the true centre line always reads as SINKING, because the eye
  //    puts the centre of a vertical field slightly above its measured middle. Lift it.
  await sh([p("screen"),
    p("lockup"), "-gravity", "center", "-geometry", `+0-${Math.round(SH_ * 0.03)}`, "-composite",
    p("screen2")]);

  // 5. glass: a WHISPER of light falling from the top-left.
  //    A rotated linear gradient gives a hard-edged diagonal wedge that reads as a rendering
  //    artefact, not glass. Blur it into nothing and keep it under 7% — the eye should register
  //    "this surface catches light" without ever locating the highlight.
  await sh(["-size", `${SW}x${SH_}`, "gradient:white-none", "-rotate", "-20",
    "-resize", `${SW}x${SH_}!`,
    "-blur", `0x${Math.round(SW * 0.16)}`,
    "-alpha", "on", "-channel", "A", "-evaluate", "multiply", "0.07", "+channel", p("sheen")]);
  await sh([p("screen2"), p("sheen"), "-compose", "over", "-composite",
    p("smask"), "-alpha", "off", "-compose", "CopyOpacity", "-composite", p("screen3")]);

  // 6. body: near-black with a lit metal edge (top-left catches light, bottom-right falls off)
  await sh(["-size", `${W}x${H}`, "gradient:#3A3F42-#0B0D0E", "-rotate", "0", p("bodygrad")]);
  await sh(["-size", `${W}x${H}`, "xc:none", "-draw",
    `roundrectangle 0,0,${W - 1},${H - 1},${R_BODY},${R_BODY}`, "-alpha", "extract", p("bmask")]);
  await sh([p("bodygrad"), p("bmask"), "-alpha", "off", "-compose", "CopyOpacity", "-composite", p("body")]);

  // inner black frame so the glass sits INSIDE the metal, not on top of it
  await sh([p("body"), "-fill", "#0A0C0D", "-draw",
    `roundrectangle ${BEZEL - 6},${BEZEL - 6},${W - BEZEL + 5},${H - BEZEL + 5},${R_SCREEN + 6},${R_SCREEN + 6}`,
    p("body2")]);

  // 7. NO SHADOW IS BAKED INTO THIS ASSET. THE SHADOW BELONGS TO THE COMPOSITE.
  //
  //    There used to be one here, and it shipped a visible dark RECTANGLE around the phone on the
  //    closing slide. The cause was the `-trim` on the very last line: trim crops the canvas to the
  //    bounding box of everything non-transparent, so it cropped straight through the shadow's soft
  //    falloff and left the outermost pixels at alpha 13-115 sitting ON the canvas edge. A gradient
  //    that is still 45% opaque when it runs out of canvas is not a shadow. It is a box.
  //
  //    A shadow also cannot be baked at all, on principle: it depends on the surface underneath it,
  //    and this asset does not know what it will be dropped onto. finalize.js draws it at composite
  //    time, where the background is actually known. (make-endcard.mjs already worked this way.)
  //
  //    NEVER touch -colorspace gray anywhere in this file. A grayscale image dragged into the
  //    composite makes ImageMagick adopt a grayscale working colourspace for the WHOLE stack, and
  //    every layer on top of it — including the teal screen — comes out silently DESATURATED. It
  //    shipped grey once.

  // 8. assemble — base canvas is explicitly sRGB
  await sh(["-size", `${CW}x${CH}`, "xc:none", "-colorspace", "sRGB",
    p("body2"), "-geometry", `+${X}+${Y}`, "-composite",
    p("screen3"), "-geometry", `+${SX}+${SY}`, "-composite",
    "-colorspace", "sRGB", p("phone")]);

  // 9. dynamic island — drawn LAST, on top of the glass
  const IW = Math.round(SW * 0.30), IH = Math.round(IW * 0.30);
  const IX = SX + Math.round((SW - IW) / 2), IY = SY + Math.round(SH_ * 0.022);
  await sh([p("phone"), "-fill", "#08090A", "-draw",
    `roundrectangle ${IX},${IY},${IX + IW},${IY + IH},${IH / 2},${IH / 2}`,
    // trim to the body (which is hard-edged, so there is nothing soft to cut through), then give it
    // back a fully-transparent margin. The asset must reach alpha=0 BEFORE the canvas edge, or
    // whatever is at that edge becomes a straight line the moment it is composited.
    "-trim", "+repage", "-bordercolor", "none", "-border", "24", OUT]);

  const { spawnSync } = await import("node:child_process");
  const dim = spawnSync("magick", [OUT, "-format", "%wx%h", "info:"], { encoding: "utf8" }).stdout;

  // ASSERT the screen is actually TEAL. A grey base colourspace silently desaturates the whole
  // composite, and the failure is invisible unless you look. Measure it.
  const px = spawnSync("magick", [OUT, "-crop", "40%x30%+30%+35%", "+repage",
    "-alpha", "remove", "-resize", "1x1", "-format", "%[fx:r*255],%[fx:g*255],%[fx:b*255]", "info:"],
    { encoding: "utf8" }).stdout;
  const [r, g, b] = px.split(",").map(Number);
  const sat = (Math.max(r, g, b) - Math.min(r, g, b));
  if (!(g > r + 12 && sat > 20)) {
    throw new Error(`screen is not teal — got rgb(${r|0},${g|0},${b|0}). ` +
      `A grayscale base canvas desaturates every composite onto it.`);
  }

  // ASSERT THE ASSET FADES TO NOTHING BEFORE ITS OWN EDGE.
  //
  // This is the whole bug the owner just sent back ("ada shadow"): the previous asset carried a baked
  // shadow that `-trim` cropped mid-falloff, leaving alpha 13-115 sitting on the canvas boundary. Any
  // non-zero alpha at the edge of a transparent asset becomes a HARD STRAIGHT LINE the instant it is
  // composited onto anything — the eye reads it as a box, and no amount of care at the composite site
  // can undo it. So the asset itself has to prove it ends in nothing.
  const edge = spawnSync("magick", [OUT, "-alpha", "extract",
    "-format", "%[fx:maxima]", "info:"], { encoding: "utf8" });   // sanity: alpha channel exists
  const maxEdgeAlpha = ["north", "south", "east", "west"].map((side) => {
    const strip = spawnSync("magick", [OUT, "-alpha", "extract", "-gravity", side,
      "-crop", (side === "north" || side === "south") ? "100%x1+0+0" : "1x100%+0+0", "+repage",
      "-format", "%[fx:maxima*255]", "info:"], { encoding: "utf8" }).stdout;
    return { side, a: parseFloat(strip) || 0 };
  });
  const dirty = maxEdgeAlpha.filter((e) => e.a > 1);
  if (dirty.length) {
    throw new Error(
      `the asset does not reach alpha=0 at its edges — ${dirty.map((d) => `${d.side}=${d.a.toFixed(0)}`).join(", ")}. ` +
      `Composited, every one of those edges is a visible straight line. Give it a transparent border.`);
  }

  // ASSERT THE LOCKUP CAN BREATHE. The wordmark used to crowd the mark because nobody had ever
  // DECIDED how far apart they should be — the distance was a by-product of two independent
  // percentages. It is a decision now, so it gets defended: the gap must be at least half the
  // wordmark's own type size, or the two elements are reading as one blob.
  const MIN_GAP = Math.round(FS * 0.5);
  if (GAP < MIN_GAP) {
    throw new Error(`the mark and the wordmark are ${GAP}px apart but the type is ${FS}px — that is crowding, not a lockup`);
  }
  console.log(`closing-phone: ${dim.trim()}  screen rgb(${r|0},${g|0},${b|0}) TEAL ok, edges alpha=0 -> ${OUT}`);
}

main().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
