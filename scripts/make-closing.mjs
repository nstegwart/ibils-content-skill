#!/usr/bin/env node
/**
 * THE CLOSING SLIDE, RENDERED — five layouts, chosen by seed.
 *
 *   node scripts/make-closing.mjs "<headline>" <out.png> [--kicker "..."] [--seed <string>]
 *
 * The closing was the most defective slide in the whole system. Measured across 473 of them:
 * 451 had the headline running into the phone column, 314 still carried a corner logo, and an
 * unknown number had the mascot cropped off at the ankles. It also drove most of the re-rolls —
 * the median deck needed four rounds, and the closing was usually the last one holding out.
 *
 * None of that was necessary. Look at what this slide contains: a brand ground, a headline, a
 * mascot from a fixed set of four poses, a device mockup, two store badges, a kicker. Every element
 * is already ours and already fixed. There is nothing here for a generative model to imagine, so
 * asking one to draw it could only ever ADD variance — which is exactly what it did, over and over,
 * at 60-180 seconds per attempt.
 *
 * So the closing is rendered. Five layouts keep the feed from looking mechanical; the choice is
 * seeded by the item key, so a given carousel always gets the same one (reproducible) while the
 * set spreads across the library. Zero re-rolls, zero codex quota, and the entire defect class is
 * gone rather than gated.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(HERE, "..", "assets");
const NIGHT = "#0E3B33", CREAM = "#FBF6E9";
const W = 1080, H = 1350;

const pick = (c) => c.find((f) => fs.existsSync(f));
// ImageMagick here has ZERO registered fonts: a font NAME silently falls back to something awful,
// so only an absolute FILE path is acceptable.
const DISPLAY = pick([
  "/System/Library/Fonts/Supplemental/Didot.ttc",
  "/System/Library/Fonts/Supplemental/Bodoni 72.ttc",
  "/System/Library/Fonts/Times.ttc",
]);
const SANS = pick(["/System/Library/Fonts/HelveticaNeue.ttc", "/System/Library/Fonts/Helvetica.ttc"]);
if (!DISPLAY || !SANS) throw new Error("no usable font FILE found");

const PHONE = path.join(ASSETS, "closing-phone.png");
const BADGES = path.join(ASSETS, "store-badges.png");
const POSES = ["alert", "explain", "hero", "invite"]
  .map((p) => path.join(ASSETS, `himel-pose-${p}.png`))
  .filter((f) => fs.existsSync(f));

const sh = (a) => {
  const r = spawnSync("magick", a, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`magick: ${(r.stderr || "").slice(-300)}`);
  return r;
};
const wh = (f) => sh([f, "-format", "%w %h", "info:"]).stdout.trim().split(/\s+/).map(Number);

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const [HEADLINE, OUT] = positional;
if (!HEADLINE || !OUT) {
  console.error('usage: make-closing.mjs "<headline>" <out.png> [--kicker "..."] [--seed <string>]');
  process.exit(1);
}
const KICKER = flag("--kicker", "");
const SEED = flag("--seed", HEADLINE);

// A carousel must always get the SAME closing — a layout that changed between runs would make the
// deck unreproducible and any visual diff meaningless.
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); };
const seedN = hash(String(SEED));
const TYPE = seedN % 5;
const POSE = POSES.length ? POSES[Math.floor(seedN / 5) % POSES.length] : null;

const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "cls-"));
const tmp = (n) => path.join(TMP, n);

// Fit the headline INTO its box. `caption:` with both a width and a height does the fitting itself;
// walking the point size by hand was measured at ~50 magick spawns per block and re-implemented a
// built-in, badly.
function headline(text, { w, h, size, align = "left" }) {
  const f = tmp(`h${Math.random().toString(36).slice(2)}.png`);
  const safe = String(text).replace(/"/g, "'");
  // DO NOT PASS -pointsize HERE.
  //
  // `-size WxH caption:` auto-fits the text to the box — but ONLY if no point size is given. Set
  // both, as the first version did, and ImageMagick uses the size you asked for and CLIPS whatever
  // does not fit: "TRUST THE PROCESS, AUDIT THE FIX." rendered as "PROCESS, AUDIT THE" and the
  // command still exited 0. A headline that silently loses its first three words is worse than one
  // that fails, because nothing announces it.
  sh(["-background", "none", "-fill", CREAM, "-font", DISPLAY,
    "-gravity", align === "center" ? "Center" : "West",
    "-size", `${w}x${h}`, `caption:${safe}`,
    "-trim", "+repage", f]);
  return f;
}

const LAYOUTS = [
  // T0 STACK — headline full width, mascot left, device right
  { name: "STACK", head: { x: 72, y: 200, w: 936, h: 270, size: 118 },
    himel: { hpx: 620, footY: 1130, cx: 280 }, phone: { hpx: 620, cx: 820, top: 475 }, badgeCx: 820 },
  // T1 HERO — no mascot; the product is the subject
  { name: "HERO", head: { x: 72, y: 200, w: 936, h: 320, size: 126, align: "center" },
    himel: null, phone: { hpx: 700, cx: 540, top: 560 }, badgeCx: 540 },
  // T2 MIRROR — the stack, flipped
  { name: "MIRROR", head: { x: 72, y: 200, w: 936, h: 270, size: 118 },
    himel: { hpx: 620, footY: 1130, cx: 800 }, phone: { hpx: 620, cx: 280, top: 475 }, badgeCx: 280 },
  // T3 PORTRAIT — mascot carries the frame, type sits beside him
  { name: "PORTRAIT", head: { x: 580, y: 200, w: 428, h: 400, size: 92 },
    himel: { hpx: 900, footY: 1150, cx: 300 }, phone: { hpx: 420, cx: 800, top: 650 }, badgeCx: 800 },
  // T4 TYPELED — the sentence is the whole poster
  { name: "TYPELED", head: { x: 72, y: 220, w: 936, h: 580, size: 150 },
    himel: null, phone: { hpx: 380, cx: 850, top: 830 }, badgeCx: 850 },
];
const L = LAYOUTS[TYPE];

const parts = ["-size", `${W}x${H}`, `xc:${NIGHT}`,
  "+noise", "Gaussian", "-attenuate", "0.05", "-colorspace", "sRGB", "-gravity", "NorthWest"];

if (KICKER) {
  const k = tmp("k.png");
  sh(["-background", "none", "-fill", CREAM, "-font", SANS, "-pointsize", "28",
    "-size", "420x44", `caption:${KICKER}`, "-trim", "+repage", k]);
  parts.push("(", k, ")", "-geometry", "+72+96", "-composite");
}

// mascot first so type can never be painted under him
if (L.himel && POSE) {
  const p = tmp("p.png");
  sh([POSE, "-resize", `x${L.himel.hpx}`, p]);
  const [pw, ph] = wh(p);
  parts.push("(", p, ")", "-geometry", `+${Math.round(L.himel.cx - pw / 2)}+${L.himel.footY - ph}`, "-composite");
}

const ph = tmp("ph.png");
sh([PHONE, "-resize", `x${L.phone.hpx}`, "-background", "black", "-shadow", "40x20+0+14", ph]);
const phc = tmp("phc.png");
sh([PHONE, "-resize", `x${L.phone.hpx}`, phc]);
const [pcw] = wh(phc);
parts.push("(", ph, ")", "-geometry", `+${Math.round(L.phone.cx - pcw / 2) - 12}+${L.phone.top + 10}`, "-composite");
parts.push("(", phc, ")", "-geometry", `+${Math.round(L.phone.cx - pcw / 2)}+${L.phone.top}`, "-composite");

const ht = headline(HEADLINE, { w: L.head.w, h: L.head.h, size: L.head.size, align: L.head.align });
const [hw, hh] = wh(ht);
const hx = L.head.align === "center" ? Math.round(L.head.x + (L.head.w - hw) / 2) : L.head.x;
parts.push("(", ht, ")", "-geometry", `+${hx}+${L.head.y}`, "-composite");

const bg = tmp("bg.png");
sh([BADGES, "-resize", "400x", bg]);
const [bw, bh] = wh(bg);
parts.push("(", bg, ")", "-geometry", `+${Math.round(L.badgeCx - bw / 2)}+${H - 95 - bh}`, "-composite");

parts.push("-colorspace", "sRGB", path.resolve(OUT));
sh(parts);

// PROVE IT, rather than trust that the compositing did what the numbers said.
const ink = (x, y, w, h) => parseFloat(sh([path.resolve(OUT), "-crop", `${w}x${h}+${x}+${y}`, "+repage",
  "-colorspace", "gray", "-threshold", "62%", "-format", "%[fx:mean]", "info:"]).stdout);
if (!(ink(L.head.x, L.head.y, L.head.w, L.head.h) > 0.005)) throw new Error("headline did not render");
// Guard against the clipping above returning: a headline that lost words renders SHORT. Compare the
// rendered block against what this many characters needs at the fitted size.
const [rhw, rhh] = wh(ht);
const areaPerChar = (rhw * rhh) / Math.max(1, HEADLINE.length);
if (areaPerChar < 40) throw new Error(`headline block looks truncated (${rhw}x${rhh} for ${HEADLINE.length} chars)`);
// the kicker band must hold the kicker and nothing else
const band = ink(500, 60, 560, 120);
if (band > 0.01) throw new Error(`something other than the kicker is in the kicker band (${(band * 100).toFixed(1)}%)`);
const [ow, oh] = wh(path.resolve(OUT));
if (ow !== W || oh !== H) throw new Error(`wrong size ${ow}x${oh}`);

console.log(`closing T${TYPE} ${L.name}${L.himel ? " + " + path.basename(POSE || "") : " (no mascot)"} -> ${OUT}`);
fs.rmSync(TMP, { recursive: true, force: true });
