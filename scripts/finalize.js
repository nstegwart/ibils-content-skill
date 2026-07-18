#!/usr/bin/env node
/**
 * Finalise raw carousel slides into uniform, brand-consistent assets.
 *
 * For every *.png in the given directory:
 *   1. COVER-CROP to EXACTLY 1080x1350. Native image generation commonly
 *      returns 1024x1536 even when asked for 4:5; padding that canvas creates
 *      visible vertical rails and shrinks the actual poster to ~900px wide.
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
// Logo card, ALL carousels (owner 2026-07-16, updated 2026-07-17 for the rounded-corner mark):
//   LOGO_DEFAULT (ibils-logo-card.png) is the one actually composited on every carousel — it is
//   NOT gated by CAROUSEL_LANG. That env var is read elsewhere (gen-carousel.js prompt selection)
//   but resolveLogoCard() below only checks CAROUSEL_LOGO. A stale comment here used to claim
//   CAROUSEL_LANG also selected the logo file — it never did, so every CAROUSEL_LANG=en render
//   silently fell through to LOGO_DEFAULT. If you ever want a different logo per-surface again,
//   wire CAROUSEL_LANG into resolveLogoCard() explicitly — don't just add a comment.
// Override with CAROUSEL_LOGO=global|id|path.
const ASSETS = path.join(HERE, "..", "assets");
const LOGO_GLOBAL = path.join(ASSETS, "ibils-logo-card-global.png");
const LOGO_ID_TEAL = path.join(ASSETS, "ibils-logo-card-id-teal.png");
const LOGO_DEFAULT = path.join(ASSETS, "ibils-logo-card.png"); // deep green primary

function resolveLogoCard() {
  const override = process.env.CAROUSEL_LOGO;
  if (override === "global") return LOGO_GLOBAL;
  if (override === "id" || override === "teal") {
    // prefer teal backup if present, else primary
    return LOGO_ID_TEAL;
  }
  if (override && override.endsWith(".png")) return path.resolve(override);
  // Default: deep green global mark for ALL carousels (owner assign 2026-07-16)
  return LOGO_DEFAULT;
}
const LOGO_CARD = resolveLogoCard();

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
const STORE_BADGES = path.join(ASSETS, "store-badges.png");
const CLOSING_PHONE = path.join(ASSETS, "closing-phone.png");
const FOOTER_FONT_CANDIDATES = [
  process.env.CAROUSEL_FONT,
  "/System/Library/Fonts/Helvetica.ttc",
  "/System/Library/Fonts/HelveticaNeue.ttc",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
].filter(Boolean);

async function resolveFooterFont() {
  for (const candidate of FOOTER_FONT_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next installed font
    }
  }
  throw new Error(
    "no footer font found; set CAROUSEL_FONT to an installed .ttf/.otf/.ttc path");
}

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

async function finalizeOne(file, { slideLabel = "", isClosing = false } = {}) {
  const id = await identify(["-format", "%w %h", file]);
  const [w, h] = id.stdout.trim().split(/\s+/).map(Number);
  if (!w || !h) throw new Error(`cannot read size: ${file}`);
  // Fill the target frame, then trim only the overflow. Do NOT use `-extent`
  // before resize: a 1024x1536 source would become 1229x1536, producing ~90px
  // solid rails on both sides after resize. gen-carousel reserves extra
  // vertical safe area so this centre crop cannot cut headline/body/footer.
  await convert([
    file,
    "-resize", "1080x1350^",
    "-gravity", "center",
    "-extent", "1080x1350",
    file
  ]);

  // Global branding is deterministic, but the BACKGROUND IS NEVER REPAINTED.
  // The artwork remains full-bleed beneath the standard 128x128 logo card.
  // Repainting a 200x230 corner created the giant square panel the owner
  // rejected; only the logo asset itself may cover pixels.
  const globalGreen =
    String(process.env.CAROUSEL_LANG || "").toLowerCase() === "en" ||
    ["global-green", "marketing"].includes(String(process.env.CAROUSEL_STYLE || "").toLowerCase());

  // THE RESERVED CORNER CLEAN-CHECK.
  // Owner 2026-07-16: FORCE_LOGO=1 → skip gate, just stamp logo (green typography decks
  // often trip the NE plate detector on solid #0E3B33). Default still guards re-rolls.
  const forceLogo = process.env.FORCE_LOGO === "1" || process.env.SKIP_NE_GATE === "1";
  if (!forceLogo && !isClosing) {
    // codex is told to leave the top-right ~280x280 empty. It ignores that often enough that it has
    // to be checked — and this is the ONLY place it CAN be checked, because a few lines from now the
    // logo is composited there and the evidence is destroyed forever.
    //
    // (Learned by running the art gate AFTER finalize and getting 12/12 failures for "artwork in the
    // reserved corner". The artwork was my own logo.)
    //
    // Owner 2026-07-15 (item-5408 cover): a SOLID green square panel also passes a pure-stddev
    // gate (uniform colour = low variance) and the logo lands on top — "icon merusak". So also
    // compare the NE mean to a reference strip just LEFT of the reserved zone. Big colour delta
    // = codex painted a plate; refuse rather than composite.
    const cnr = await convert([file, "-alpha", "remove",
      "-gravity", "northeast", "-crop", "280x280+0+0", "+repage",
      "-format", "%[fx:standard_deviation]", "info:"]);
    const sd = parseFloat(cnr.stdout);
    if (!globalGreen && Number.isFinite(sd) && sd > 0.13) {
      throw new Error(
        `the reserved top-right corner is NOT empty (stddev ${sd.toFixed(3)}) — codex drew in it, and ` +
        `the logo is about to land on top of that artwork. Re-roll this slide.`);
    }
    // Reference: 80x280 strip immediately left of the NE 280x280 (x=720..800 on a 1080 canvas).
    const refMean = await convert([file, "-alpha", "remove",
      "-crop", "80x280+720+0", "+repage",
      "-resize", "1x1!", "-format", "%[fx:r],%[fx:g],%[fx:b]", "info:"]);
    const neMean = await convert([file, "-alpha", "remove",
      "-gravity", "northeast", "-crop", "280x280+0+0", "+repage",
      "-resize", "1x1!", "-format", "%[fx:r],%[fx:g],%[fx:b]", "info:"]);
    const parseRGB = (s) => s.stdout.trim().split(",").map(Number);
    const [rr, rg, rb] = parseRGB(refMean);
    const [nr, ng, nb] = parseRGB(neMean);
    if ([rr, rg, rb, nr, ng, nb].every(Number.isFinite)) {
      const d = Math.hypot(rr - nr, rg - ng, rb - nb);
      // 0.06 in 0..1 channel space ≈ a clearly different solid plate (item-5408 panel was ~0.09).
      if (!globalGreen && d > 0.06) {
        throw new Error(
          `the reserved top-right corner is a solid plate (Δcolour ${d.toFixed(3)} vs left strip) — ` +
          `codex painted a badge/card there. Logo would land on it. Re-roll this slide.`);
      }
    }

    // A nearly-same-green sidebar can pass the corner gate because it is both
    // uniform and close in colour. Measure the middle of the slide, where the
    // only reserved area is over: a quiet outer strip with a shifted mean is a
    // generated right rail, not continuous full-bleed background.
    const railRef = await convert([file, "-alpha", "remove",
      "-crop", "80x700+0+300", "+repage", "-resize", "1x1!",
      "-format", "%[fx:r],%[fx:g],%[fx:b]", "info:"]);
    const railEdge = await convert([file, "-alpha", "remove",
      "-crop", "80x700+1000+300", "+repage", "-resize", "1x1!",
      "-format", "%[fx:r],%[fx:g],%[fx:b]", "info:"]);
    const railSd = await convert([file, "-alpha", "remove",
      "-crop", "80x700+1000+300", "+repage",
      "-format", "%[fx:standard_deviation]", "info:"]);
    const [ir, ig, ib] = parseRGB(railRef);
    const [er, eg, eb] = parseRGB(railEdge);
    const edgeSd = parseFloat(railSd.stdout);
    if ([ir, ig, ib, er, eg, eb, edgeSd].every(Number.isFinite)) {
      const railDelta = Math.hypot(ir - er, ig - eg, ib - eb);
      // Small texture/lighting drift between the two outer strips is normal;
      // reject only a clearly distinct solid panel.
      if (railDelta > 0.04 && edgeSd < 0.05) {
        throw new Error(
          `generated right-side rail detected (Δcolour ${railDelta.toFixed(3)}, ` +
          `edge stddev ${edgeSd.toFixed(3)}) — below y=230 the background must ` +
          `remain full-width. Re-roll this slide.`);
      }
    }

    // Same failure rotated 90 degrees: the model may draw a full-width footer
    // plate for pagination even when asked not to. Compare a quiet bottom strip
    // with the strip immediately above it. A low-variance colour jump means a
    // generated footer band; deterministic text must land on bare background.
    const footerRef = await convert([file, "-alpha", "remove",
      "-crop", "80x60+0+1170", "+repage", "-resize", "1x1!",
      "-format", "%[fx:r],%[fx:g],%[fx:b]", "info:"]);
    const footerEdge = await convert([file, "-alpha", "remove",
      "-crop", "80x60+0+1290", "+repage", "-resize", "1x1!",
      "-format", "%[fx:r],%[fx:g],%[fx:b]", "info:"]);
    const footerSd = await convert([file, "-alpha", "remove",
      "-crop", "1080x60+0+1290", "+repage",
      "-format", "%[fx:standard_deviation]", "info:"]);
    const [fr, fg, fb] = parseRGB(footerRef);
    const [br, bg, bb] = parseRGB(footerEdge);
    const bottomSd = parseFloat(footerSd.stdout);
    if ([fr, fg, fb, br, bg, bb, bottomSd].every(Number.isFinite)) {
      const footerDelta = Math.hypot(fr - br, fg - bg, fb - bb);
      if (footerDelta > 0.018 && bottomSd < 0.05) {
        throw new Error(
          `generated footer band detected (Δcolour ${footerDelta.toFixed(3)}, ` +
          `bottom stddev ${bottomSd.toFixed(3)}) — y=1231..1349 must remain ` +
          `continuous background. Re-roll this slide.`);
      }
    }
  }

  // App Store icon — always top-RIGHT corner, small (non-closing slides only).
  // The SOURCE asset is deliberately hi-res (512px) so it downsamples crisp. The ON-SLIDE size is
  // therefore stated EXPLICITLY here and must never be inherited from the asset's own dimensions —
  // swapping in a bigger source once silently pasted a 512px block onto a 1080px slide.
  await convert([
    file, "(", LOGO_CARD, "-resize", `${LOGO_PX}x${LOGO_PX}`, ")",
    "-gravity", "northeast", "-geometry", "+46+46", "-composite",
    file
  ]);

  // Global footer typography is deterministic too. Asking the model to place
  // the handle and page number repeatedly caused it to connect both corners
  // with a full-height sidebar. No panel is painted here: typography lands
  // directly on the full-bleed background.
  if (globalGreen && slideLabel) {
    const footerFont = await resolveFooterFont();
    await convert([
      file,
      "-font", footerFont, "-pointsize", "34", "-fill", "#FBF6E9",
      "-gravity", "southwest", "-annotate", "+80+68", "@ibils.global",
      "-gravity", "southeast", "-annotate", "+70+68", slideLabel,
      file
    ]);
  }
}

async function main() {
  let entries = (await fs.readdir(DIR))
    .filter((f) => f.toLowerCase().endsWith(".png") && !/\.raw\.png$/i.test(f))
    .sort();
  const deckTotal = entries.length;
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
    const isClosing = /closing/i.test(name);
    try {
      // already signed? then it is DONE, and running over it again would stack a second logo and then
      // accuse itself of vandalism. Idempotent, without the caller having to remember a flag.
      if (await isFinalized(file)) {
        console.log(`${name}: already finalised — skipped`);
        ok++;
        continue;
      }
      const slideNo = Number((name.match(/^(\d+)/) || [])[1]);
      const slideLabel = slideNo
        ? `${String(slideNo).padStart(2, "0")}/${String(deckTotal).padStart(2, "0")}`
        : "";
      await finalizeOne(file, { slideLabel: isClosing ? "" : slideLabel, isClosing });
      // closing slide: composite the real iPhone-splash (real iB logo — never
      // hallucinated) and the store badges into the reserved zones.
      if (isClosing) {
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
        // Sample strip far from any branding — no top-right logo on closing.
        const STRIP = { x: 990, y: 270, w: 80, h: 260 };
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
        // THE SHADOW IS DRAWN HERE, NOT BAKED INTO THE ASSET.
        //
        // It used to live in closing-phone.png and it shipped a visible dark RECTANGLE around the
        // device, because the asset's own `-trim` cropped the canvas straight through the shadow's
        // falloff — leaving it 45% opaque at the pixel where the image ran out. A gradient cut off
        // mid-fade is a box.
        //
        // A shadow depends on the surface under it, and an asset cannot know what it will be dropped
        // onto. So it is drawn at the composite, where the background is actually known.
        const gx0 = dx >= 0 ? `+${dx}` : `${dx}`;
        const gy0 = dy >= 0 ? `+${dy}` : `${dy}`;
        await convert([
          file,
          "(", CLOSING_PHONE, "-resize", `x${PHONE_H}`,
          "-background", "black", "-shadow", "40x22+0+16", ")",
          "-gravity", "center", "-geometry", `${gx0}${dy + 10 >= 0 ? "+" : ""}${dy + 10}`, "-composite",
          "(", CLOSING_PHONE, "-resize", `x${PHONE_H}`, ")",
          "-gravity", "center", "-geometry", `${gx0}${gy0}`, "-composite",
          file
        ]);
        // store badges — small, composited from the hi-res official asset (downscaled = crisp),
        // sitting on the plain bg, no card behind.
        //
        // CENTRED. The +100 x-offset that used to be here was there to dodge Himel, who stood in the
        // bottom-left of the closing slide. Himel is no longer drawn on this slide at all, so the
        // offset had stopped dodging anything and was simply pushing the badges 100px off-centre —
        // which is what "posisi playstore dan appstore berantakan" actually was. Stale geometry
        // outlives the thing it was avoiding, and it never announces itself.
        await convert([
          file, "(", STORE_BADGES, "-resize", `${BADGES_W}x`, ")",
          "-gravity", "south", "-geometry", "+0+95", "-composite",
          file
        ]);
        // and PROVE they are centred. This is one line, and the defect it catches was visible to the
        // owner from across the room while every gate in this file reported success.
        const bstrip = await convert([file, "-crop", "1080x180+0+1150", "+repage",
          "-fuzz", "12%", "-transparent", "srgb(9,58,32)", "-format", "%@", "info:"]).catch(() => null);
        const m = bstrip && /^(\d+)x(\d+)\+(\d+)\+/.exec(bstrip.stdout.trim());
        if (m) {
          const centre = Number(m[3]) + Number(m[1]) / 2;
          if (Math.abs(centre - 540) > 6) {
            throw new Error(`the store badges are centred at x=${centre.toFixed(0)}, not 540 — they are ` +
              `${Math.abs(centre - 540).toFixed(0)}px off-centre on a 1080px slide`);
          }
        }
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
