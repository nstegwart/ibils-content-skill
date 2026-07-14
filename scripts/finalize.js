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
// THE CLOSING SLIDE IS TWO COLUMNS: type on the left, device on the right.
//
// It used to be "headline in a top band, phone in the middle", and codex never once obeyed it — it
// kept setting the headline as three big lines down the left, which is FAR better looking, and then
// the phone got pasted into the middle right up against the word it was colliding with. The layout
// the model kept reaching for was the correct one; the brief was the thing that was wrong.
//
// So the columns are law now, and every number below is derived from them. The phone lives inside
// PHONE_COL and is centred in it, which is what puts real air between the type and the device
// instead of the ~5px the owner (correctly) called "kepepet".
const PHONE_H = 620;     // closing-slide device mockup, height on a 1080x1350 slide.
const TYPE_COL = 560;    // x < this belongs to the headline. The phone may never enter it.
const PHONE_COL = [TYPE_COL, 1080];
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

// A FINISHED SLIDE CARRIES A STAMP, AND FINALIZE REFUSES TO TOUCH IT TWICE.
//
// Until now the only thing standing between this script and a double-composited slide was the caller
// REMEMBERING to pass --only. That is a convention, not a guard, and it broke exactly the way
// conventions break: a re-run over a finished deck reported "the reserved top-right corner is NOT
// empty — codex drew in it" for 11 slides in a row. codex had drawn nothing. The artwork in the
// corner was THIS SCRIPT'S OWN LOGO, from the previous run, and the check could not tell its own
// output from a defect.
//
// So the slide says whether it is done. The stamp lives in the PNG itself, not in a sidecar file that
// can be lost, copied away from, or fall out of sync with the pixels it describes.
const STAMP = "ibils-finalized-v1";

async function isFinalized(file) {
  const r = await identify(["-format", "%[comment]", file]).catch(() => null);
  return !!r && r.stdout.includes(STAMP);
}

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
  // THE RESERVED CORNER MUST BE CLEAN *BEFORE* WE DROP THE LOGO ON IT.
  //
  // codex is told to leave the top-right ~280x280 empty. It ignores that often enough that it has
  // to be checked — and this is the ONLY place it CAN be checked, because a few lines from now the
  // logo is composited there and the evidence is destroyed forever.
  //
  // (Learned by running the art gate AFTER finalize and getting 12/12 failures for "artwork in the
  // reserved corner". The artwork was my own logo.)
  const cnr = await convert([file, "-alpha", "remove",
    "-gravity", "northeast", "-crop", "280x280+0+0", "+repage",
    "-format", "%[fx:standard_deviation]", "info:"]);
  const sd = parseFloat(cnr.stdout);
  if (Number.isFinite(sd) && sd > 0.13) {
    throw new Error(
      `the reserved top-right corner is NOT empty (stddev ${sd.toFixed(3)}) — codex drew in it, and ` +
      `the logo is about to land on top of that artwork. Re-roll this slide.`);
  }

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
      // already signed? then it is DONE, and running over it again would stack a second logo and then
      // accuse itself of vandalism. Idempotent, without the caller having to remember a flag.
      if (await isFinalized(file)) {
        console.log(`${name}: already finalised — skipped`);
        ok++;
        continue;
      }
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
        // *** THE PHONE MUST LAND IN EMPTY SPACE, NOT ON THE TYPE. ***
        //
        // This is the bug the owner called "rusak total", and it has now shipped TWICE — once on the
        // ad's end card, and once here, where the composited phone landed across the word "number".
        // The plate is told to reserve a void. codex does not always obey. So MEASURE IT: work out
        // exactly where the phone will land, look at what is already there, and REFUSE rather than
        // paste a phone over a headline.
        const phoneW = Math.round(PHONE_H * 0.481);      // the mockup's aspect
        // centred inside the phone column — this is what buys the air on BOTH sides of the device
        const zoneX = Math.round((PHONE_COL[0] + PHONE_COL[1] - phoneW) / 2);
        const zoneY = Math.round((1350 - PHONE_H) / 2) - 30;
        const dx = zoneX + Math.round(phoneW / 2) - 540;    // gravity-center offsets
        const dy = zoneY + Math.round(PHONE_H / 2) - 675;

        // LOOK FOR EDGES. NOT VARIANCE, AND NOT BRIGHTNESS.
        //
        // This gate has now been wrong twice, in two different ways, and both failures were the same
        // mistake: measuring a property that type happens to have ON ONE PALETTE instead of the property
        // that MAKES something type.
        //
        //   1. STANDARD DEVIATION. Refused above 0.10, and it passed the slide that shipped with the
        //      phone pressed against the word "number" — because the tail of one letter poking into a
        //      big flat rectangle barely moves that rectangle's standard deviation. A statistic that
        //      averages over the whole zone cannot see a small intrusion at the edge of it.
        //
        //   2. BRIGHT-PIXEL COUNT. Assumed cream type on a deep-green ground. Then the very next plate
        //      came back as cream NEWSPRINT, where the EMPTY background is 100% bright, and the gate
        //      refused a perfectly clean slide. It was measuring the palette, not the ink.
        //
        // What is actually true of type, on any ground, in any palette: IT HAS HARD EDGES. Background —
        // flat, textured, papery, dark, light — does not. So run an edge filter and ask what fraction of
        // the zone has an edge in it. Measured on real plates: an empty column scores 0.00000; a column
        // with a headline in it scores 0.021-0.028. That is not a threshold, that is a chasm.
        //
        // Check a GUTTER around the device too, not just its footprint: type that stops one pixel short
        // of the bezel is not a near miss, it is the collision the owner just sent back.
        const GUTTER = 36;
        const gx = Math.max(0, zoneX - GUTTER);
        const gy = Math.max(0, zoneY - GUTTER);
        const gw = Math.min(1080 - gx, phoneW + GUTTER * 2);
        const gh = Math.min(1350 - gy, PHONE_H + GUTTER * 2);
        const zone = await convert([file, "-alpha", "remove",
          "-crop", `${gw}x${gh}+${gx}+${gy}`, "+repage",
          "-colorspace", "gray",
          "-morphology", "EdgeIn", "Octagon:1", "-threshold", "25%",
          "-format", "%[fx:mean]", "info:"]);
        const inkFrac = parseFloat(zone.stdout);
        if (Number.isFinite(inkFrac) && inkFrac > 0.003) {
          throw new Error(
            `the closing slide's phone zone (${gw}x${gh} at ${gx},${gy}, incl. a ${GUTTER}px gutter) is ` +
            `${(inkFrac * 100).toFixed(2)}% edges — that is TYPE OR ARTWORK, and the phone is about to be ` +
            `pasted on top of it. Re-roll the plate: the headline must stay left of x=${TYPE_COL}.`);
        }
        await convert([
          file, "(", CLOSING_PHONE, "-resize", `x${PHONE_H}`, ")",
          "-gravity", "center", "-geometry", `${dx >= 0 ? "+" : ""}${dx}${dy >= 0 ? "+" : ""}${dy}`, "-composite",
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
      // sign it. this is what makes a second run a no-op instead of a disaster.
      await convert([file, "-set", "comment", STAMP, file]);
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
