#!/usr/bin/env node
/**
 * Finalise raw carousel slides into uniform, brand-consistent assets.
 *
 * For every *.png in the given directory:
 *   1. PAD (never crop) to a 4:5 box using the slide's own edge colour, then
 *      resize to EXACTLY 1080x1350 — uniform carousel size, zero content lost.
 *   2. Composite the real Ibils App Store icon into the top-RIGHT corner —
 *      pixel-identical branding on every slide.
 *
 * Requires ImageMagick — works with v7 (`magick`) or v6 (`convert`/`identify`).
 *
 * Usage: node finalize.js <slides-dir> [--only <name[,name]>]
 *   --only   finalise just these slides (e.g. 03-statement) — used by a
 *            single-slide regen so finished slides are not double-processed.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));

// ImageMagick 7 has `magick`; v6 has `convert` +
// `identify`. Resolve once so finalize runs on either.
let HAS_MAGICK = false;
try {
  await execFileP("magick", ["-version"]);
  HAS_MAGICK = true;
} catch {
  /* fall back to v6 */
}
// run a convert-style transform
function convert(args) {
  return HAS_MAGICK
    ? execFileP("magick", args)
    : execFileP("convert", args);
}
// run an identify query
function identify(args) {
  return HAS_MAGICK
    ? execFileP("magick", ["identify", ...args])
    : execFileP("identify", args);
}
const LOGO_CARD = path.join(HERE, "..", "assets", "ibils-logo-card.png");

// ON-SLIDE render sizes. The assets are intentionally HI-RES (a big source downsamples crisp; an
// upscaled small one goes soft). So every composite below states the size it wants EXPLICITLY and
// never inherits it from the asset file. Bumping an asset's resolution must NOT change the layout.
const LOGO_PX = 128;     // App Store icon, top-right
const PHONE_H = 778;     // closing-slide device mockup, height on a 1080x1350 slide.
                         // 778 = the OLD asset's exact height, so the new hi-res source lands at
                         // the same on-slide size the shipped decks already use.
const BADGES_W = 480;    // store badge strip, width
const STORE_BADGES = path.join(HERE, "..", "assets", "store-badges.png");
const CLOSING_PHONE = path.join(HERE, "..", "assets", "closing-phone.png");

const DIR = process.argv[2];
if (!DIR || DIR.startsWith("--")) {
  console.error("usage: node finalize.js <slides-dir> [--only <name[,name]>]");
  process.exit(1);
}
// --only: restrict to these slide names. Re-running finalize on an already
// finalised slide would stack a 2nd logo — so a single-slide regen passes
// --only to touch ONLY the freshly rendered slide.
const ONLY = (() => {
  const v = [];
  process.argv.forEach((a, i) => {
    if (a === "--only" && process.argv[i + 1]) v.push(...process.argv[i + 1].split(","));
  });
  return v.map((s) => s.trim().replace(/\.png$/i, "")).filter(Boolean);
})();

async function finalizeOne(file) {
  const id = await identify(["-format", "%w %h", file]);
  const [w, h] = id.stdout.trim().split(/\s+/).map(Number);
  if (!w || !h) throw new Error(`cannot read size: ${file}`);
  // smallest 4:5 box that CONTAINS the image — pad, do not crop
  const boxW = Math.max(w, Math.round(h * 0.8));
  const boxH = Math.max(h, Math.round(w / 0.8));
  const corner = (
    await identify(["-format", "%[pixel:p{4,4}]", file])
  ).stdout.trim();
  await convert([
    file,
    "-background", corner || "white",
    "-gravity", "center",
    "-extent", `${boxW}x${boxH}`,
    "-resize", "1080x1350!",
    file
  ]);
  // App Store icon — always top-RIGHT corner, small.
  // The SOURCE asset is deliberately hi-res (512px) so it downsamples crisp. The ON-SLIDE size is
  // therefore stated EXPLICITLY here and must never be inherited from the asset's own dimensions —
  // swapping in a bigger source once silently pasted a 512px block onto a 1080px slide.
  await convert([
    file, "(", LOGO_CARD, "-resize", `${LOGO_PX}x${LOGO_PX}`, ")",
    "-gravity", "northeast", "-geometry", "+46+46", "-composite",
    file
  ]);
}

async function main() {
  let entries = (await fs.readdir(DIR))
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .sort();
  if (ONLY.length) {
    entries = entries.filter((f) => ONLY.includes(f.replace(/\.png$/i, "")));
    if (!entries.length) {
      console.error(`no PNG matches --only ${ONLY.join(",")} in ${DIR}`);
      process.exit(1);
    }
  }
  if (!entries.length) {
    console.error(`no PNG slides in ${DIR}`);
    process.exit(1);
  }
  let ok = 0;
  for (const name of entries) {
    const file = path.join(DIR, name);
    try {
      await finalizeOne(file);
      // closing slide: composite the real iPhone-splash (real iB logo — never
      // hallucinated) and the store badges into the reserved zones.
      if (name.includes("closing")) {
        // codex often draws a white CTA card in the bottom band despite the
        // prompt. Repaint the badge strip with the slide's own background
        // colour (sampled from a clean right-edge pixel) so the store badges
        // sit on the background, never on a white box.
        // TEXTURE-TILE the bottom band — copy a clean strip of the slide's
        // own paper texture and tile it across the codex-junk zone. A flat
        // fill (even the right colour) shows as a visible patch on textured
        // newsprint; tiling real texture blends invisibly.
        const tag = path.basename(file, ".png");
        const srcStrip = path.join(DIR, `.bg-src-${tag}.png`);
        const patchTile = path.join(DIR, `.bg-patch-${tag}.png`);
        // This strip is asserted to be CLEAN BACKGROUND, and it is then tiled across the closing
        // band. Nothing checked that. It sits at x990-1070, y270-530; the logo sits at x906-1034,
        // y46-174 — they SHARE 44px of x and clear each other in y by only 96px. Raise LOGO_PX to
        // 224 and this strip samples the logo itself and tiles it across the slide, silently, exit
        // code 0. Guard the invariant instead of hoping.
        const STRIP = { x: 990, y: 270, w: 80, h: 260 };
        const logoBox = { x1: 1080 - 46 - LOGO_PX, x2: 1080 - 46, y1: 46, y2: 46 + LOGO_PX };
        const overlaps =
          STRIP.x < logoBox.x2 && STRIP.x + STRIP.w > logoBox.x1 &&
          STRIP.y < logoBox.y2 && STRIP.y + STRIP.h > logoBox.y1;
        if (overlaps) {
          throw new Error(
            `background-sample strip (${STRIP.x},${STRIP.y} ${STRIP.w}x${STRIP.h}) overlaps the ` +
            `${LOGO_PX}px logo — it would tile the LOGO across the closing band. Move the strip.`
          );
        }
        try {
          await convert([file, "-crop", `${STRIP.w}x${STRIP.h}+${STRIP.x}+${STRIP.y}`, "+repage", srcStrip]);
          await convert(["-size", "690x260", "tile:" + srcStrip, patchTile]);
          await convert([
            file, patchTile, "-geometry", "+390+1040", "-composite", file
          ]);
        } finally {
          await fs.rm(srcStrip, { force: true }).catch(() => {});
          await fs.rm(patchTile, { force: true }).catch(() => {});
        }
        await convert([
          file, "(", CLOSING_PHONE, "-resize", `x${PHONE_H}`, ")",
          "-gravity", "center", "-geometry", "+150+70", "-composite",
          file
        ]);
        // store badges — small, composited from the hi-res official asset
        // (downscaled = crisp), sitting on the plain bg, no card behind.
        await convert([
          file, "(", STORE_BADGES, "-resize", `${BADGES_W}x`, ")",
          "-gravity", "south", "-geometry", "+100+95", "-composite",
          file
        ]);
        console.log(`${name}: 1080x1350 + logo + phone + store badges`);
      } else {
        console.log(`${name}: 1080x1350 + logo`);
      }
      ok++;
    } catch (e) {
      console.error(`${name}: FAILED — ${e.message}`);
    }
  }
  console.log(`finalised ${ok}/${entries.length} -> ${DIR}`);
  // A slide that failed to finalise is a RAW slide: wrong size, no logo, no phone, no badges.
  // Exiting 0 here made run-carousel print "CAROUSEL DONE" over a broken deck.
  if (ok < entries.length) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});
