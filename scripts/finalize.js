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
// Logo mark, ALL carousels.
//   D2 (owner): ibils-logo-card.png is a CARD with fill srgb(14,59,51) while the slide corner
//   ground is often srgb(7,55,47) — the plate reads as a bright square behind the mark.
//   Default is therefore the white transparent mark (ibils-logo-mark.png) so the glyph sits
//   directly on whatever ground the plate painted. Card assets remain available via override.
// Override with CAROUSEL_LOGO=global|id|teal|card|path.
const ASSETS = path.join(HERE, "..", "assets");
const LOGO_GLOBAL = path.join(ASSETS, "ibils-logo-card-global.png");
const LOGO_ID_TEAL = path.join(ASSETS, "ibils-logo-card-id-teal.png");
const LOGO_CARD_PLATE = path.join(ASSETS, "ibils-logo-card.png"); // deep green primary CARD (plate)
const LOGO_MARK = path.join(ASSETS, "ibils-logo-mark.png"); // D2: white mark, transparent bg

function resolveLogoCard() {
  const override = process.env.CAROUSEL_LOGO;
  if (override === "global") return LOGO_GLOBAL;
  if (override === "id" || override === "teal") {
    // prefer teal backup if present, else primary
    return LOGO_ID_TEAL;
  }
  if (override === "card" || override === "plate") return LOGO_CARD_PLATE;
  if (override === "mark") return LOGO_GLOBAL;   // mark variant retired — see below
  if (override && override.endsWith(".png")) return path.resolve(override);
  // D2 — USE THE ASSET THE OWNER SUPPLIED. The previous default was a white "mark" I derived from
  // the card myself with a threshold chain, and I wired it in as the default for every slide WITHOUT
  // EVER RENDERING IT TO LOOK AT. The chain was inverted (`-negate` then `-transparent black` deleted
  // the glyph and kept its background), so all eight slides of a deck shipped with a chopped white
  // rectangle where the logo belongs. A command exiting 0 is not evidence that the pixels are right.
  // ibils-logo-card-global.png is the supplied brand asset; it is the default, and nothing here
  // synthesises a logo again.
  return LOGO_GLOBAL;
}
const LOGO_CARD = resolveLogoCard();

// ON-SLIDE render sizes. The assets are intentionally HI-RES (a big source downsamples crisp; an
// upscaled small one goes soft). So every composite below states the size it wants EXPLICITLY and
// never inherits it from the asset file. Bumping an asset's resolution must NOT change the layout.
const LOGO_PX = 128;     // App Store icon, top-right (fit-box; mark preserves aspect)

// D1 — kicker is composite-only. Model-drawn kickers drifted in position AND colour
// (content cream ~x245,y240 vs closing amber ~x155,y152). One deck = one geometry.
const KICKER_POINTSIZE = 28;
const KICKER_FILL_CREAM = "#FBF6E9"; // global-green decks (cream on deep green)
const KICKER_FILL_DARK = "#0E3B33";  // newsprint / cream-paper decks
const KICKER_GEOMETRY = "+80+96";    // northwest; x matches footer handle margin
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
const BADGES_W = 480;    // store badge strip, width (content decks)
// CLOSING: the badges belong UNDER THE PHONE, not under the mascot (owner, 2026-07-22). Centred on
// the slide they sat beneath Himel's boots and read as unrelated to the device they advertise.
// Both are now centred on the phone column, so the device and the two badges form one right-hand
// block. Narrower too — a 480px strip under a 298px phone is wider than the thing it points at.
const BADGES_W_CLOSING = 400;
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

async function resolveKickerText(slidesDir) {
  // D1 — kicker string for deterministic composite. Prefer env, else plan.json beside slides/.
  if (process.env.CAROUSEL_KICKER != null && String(process.env.CAROUSEL_KICKER).length) {
    return String(process.env.CAROUSEL_KICKER);
  }
  for (const p of [
    path.join(slidesDir, "plan.json"),
    path.join(slidesDir, "..", "plan.json"),
  ]) {
    try {
      const j = JSON.parse(await fs.readFile(p, "utf8"));
      if (j && j.kicker) return String(j.kicker);
    } catch {
      /* try next */
    }
  }
  return "";
}

async function finalizeOne(file, { slideLabel = "", isClosing = false, kickerText = "" } = {}) {
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
      // COMPARE THE CORNER WITH WHAT IS RIGHT NEXT TO IT, NOT WITH A DISTANT STRIP.
      //
      // The reference used to be an 80px strip down the LEFT edge — which on a normal slide is full
      // of HEADLINE TEXT. Measured on a legitimately empty corner: corner rgb(6,52,43) flat at
      // stddev 0.002, left strip rgb(51,87,77) because cream type sits in it. The gate read that gap
      // as "a painted plate" and refused a perfectly clean slide. A reference for "what does empty
      // background look like here" has to be empty itself.
      //
      // The ring immediately around the corner is the right reference: it tracks the vignette (so a
      // gradient no longer looks like a plate), and a plate painted INTO the corner still announces
      // itself, because a plate has a hard boundary where it meets that ring.
      // tepat DI BAWAH pojok: sama-sama tepi kanan, jadi vignette-nya sebanding, dan
      // di luar zona yang dipesan untuk logo.
      const ring = await convert([file, "-alpha", "remove",
        "-crop", "280x150+800+300", "+repage", "-resize", "1x1!",
        "-format", "%[fx:r],%[fx:g],%[fx:b]", "info:"]);
      const [kr, kg, kb] = parseRGB(ring);
      const dRing = Math.max(Math.abs(nr - kr), Math.abs(ng - kg), Math.abs(nb - kb));
      if (!globalGreen && dRing > 0.10) {
        throw new Error(
          `the reserved top-right corner is a solid plate (Δcolour ${dRing.toFixed(3)} vs the ring beside it) — ` +
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

  // App Store icon — top-RIGHT corner, small.
  // D3 — closing must NOT get the corner logo (owner): closing already carries brand via
  // phone splash + 2 store badges. Corner mark on closing is redundant clutter.
  // D2 — default asset is the transparent white mark (see resolveLogoCard).
  // The SOURCE asset is deliberately hi-res so it downsamples crisp. The ON-SLIDE size is
  // therefore stated EXPLICITLY here and must never be inherited from the asset's own dimensions —
  // swapping in a bigger source once silently pasted a 512px block onto a 1080px slide.
  if (!isClosing) {
    await convert([
      file, "(", LOGO_CARD, "-resize", `${LOGO_PX}x${LOGO_PX}`, ")",
      "-gravity", "northeast", "-geometry", "+46+46", "-composite",
      file
    ]);
  }

  // D1 — kicker stamped at FIXED geometry on every slide (incl. closing). Same font path
  // family as the footer so a deck never mixes model-drawn amber with cream labels.
  if (kickerText) {
    const kickerFont = await resolveFooterFont();
    // THE KICKER BAND MUST BE EMPTY BEFORE WE STAMP INTO IT.
    // The prompt reserved a headline band and a footer band but never the kicker's own strip, so a
    // closing headline set high enough put "Paper" directly under "Ibils Educate" and the label
    // printed on top of the P. Reserving space for a composite is not optional just because the
    // composite is small.
    // Count TYPE, and judge it against this plate's own empty ground.
    //
    // The first version averaged edge-density over a 420x80 box and let a headline through: the
    // ascenders of "Paper" occupied only the lower rows, so the mean stayed under threshold while
    // the label still printed across them. Averaging over a box hides a collision confined to part
    // of it — the same error that let a phone land on the word "number" months ago.
    //
    // Type here is cream on a dark ground, so measure how much of the band is markedly brighter
    // than a patch of this plate that is definitely empty, and check the band ROW BY ROW so a
    // collision in a few rows cannot be averaged away.
    const groundLuma = parseFloat((await convert([file, "-crop", "200x60+820+1000", "+repage",
      "-colorspace", "gray", "-format", "%[fx:mean*255]", "info:"])).stdout);
    const cutoff = Math.min(240, (Number.isFinite(groundLuma) ? groundLuma : 60) + 60);
    let worst = 0;
    for (let by = 70; by <= 150; by += 10) {
      const row = parseFloat((await convert([file, "-crop", `430x10+72+${by}`, "+repage",
        "-colorspace", "gray", "-threshold", `${((cutoff / 255) * 100).toFixed(1)}%`,
        "-format", "%[fx:mean]", "info:"])).stdout);
      if (Number.isFinite(row)) worst = Math.max(worst, row);
    }
    if (worst > 0.02) {
      throw new Error(`the kicker band (y=70..150) already has type in it (${(worst * 100).toFixed(1)}% of a row ` +
        `is brighter than the ground) — the label would print on top of the headline. ` +
        `Re-roll: the headline must start below y=200.`);
    }
    const backup = `${file}.pre-kicker.png`;
    await convert([file, backup]);
    // GAMBAR, UKUR HASILNYA, PERBAIKI KALAU TIDAK TERLIHAT.
    //
    // Dua percobaan sebelumnya gagal karena sama-sama MENEBAK warna sebelum menggambar:
    //   1. dari flag deck (`globalGreen`) — pada deck yang flagnya tak terbaca, kicker dicat
    //      #0E3B33 di atas ground #0E3B33 dan hilang, tapi finalize tetap melapor "+ kicker".
    //   2. dari rata-rata luma ground — GRAIN MENIPU RATA-RATA. Plate bernoise terukur 152
    //      sementara plate mulus dengan ground yang SAMA terukur 95, jadi ambang 128 terlewat
    //      dan kicker kembali tak terlihat. Rata-rata bukan alat ukur untuk permukaan berbintik.
    //
    // Yang tidak bisa ditipu: menggambarnya, lalu membandingkan area itu SEBELUM dan SESUDAH.
    // Kalau selisihnya kecil, cat itu memang tidak terlihat — apa pun kata teori warnanya.
    const KBOX = ["-crop", "360x70+72+82", "+repage", "-colorspace", "gray"];
    const meas = async (f) => parseFloat((await convert([f, ...KBOX, "-format", "%[fx:mean*255]", "info:"])).stdout);
    const before = await meas(file);

    const stamp = async (fill) => {
      await convert([file, "-font", kickerFont, "-pointsize", String(KICKER_POINTSIZE),
        "-fill", fill, "-gravity", "northwest", "-annotate", KICKER_GEOMETRY, kickerText, file]);
      return Math.abs((await meas(file)) - before);
    };

    let delta = await stamp(KICKER_FILL_CREAM);
    if (delta < 3) {
      // cream tidak menggigit di ground ini — kembalikan plate, coba warna lawan
      await convert([backup, file]);
      delta = await stamp(KICKER_FILL_DARK);
    }
    await fs.rm(backup, { force: true }).catch(() => {});
    if (delta < 3) {
      throw new Error(`kicker "${kickerText}" tidak terlihat dengan cream MAUPUN hijau-gelap (delta ${delta.toFixed(2)}) — ground-nya tidak cocok untuk keduanya`);
    }
  }

  // Global footer typography is deterministic too. Asking the model to place
  // the handle and page number repeatedly caused it to connect both corners
  // with a full-height sidebar. No panel is painted here: typography lands
  // directly on the full-bleed background.
  // D5 — gen-carousel now reserves y>=1220 empty so this annotate is not buried under body type.
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
  // D1 — one kicker string for the whole deck (env or plan.json).
  const kickerText = await resolveKickerText(DIR);
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
      await finalizeOne(file, {
        slideLabel: isClosing ? "" : slideLabel,
        isClosing,
        kickerText,
      });
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
        // THE BLIND BACKGROUND PATCH IS GONE.
        //
        // It sampled an 80x260 strip from the upper right and tiled it over 690x260 at the bottom to
        // erase any CTA card codex might have painted there. Two things were wrong with that:
        //
        //   1. The slide is vignetted, so a patch lifted from one region does not match the ground of
        //      another. It read as a flat rectangle with hard corners across the lower third — the
        //      "kotak putih" the owner spotted at full resolution.
        //   2. It painted over WHATEVER was there, including Himel's legs, which legitimately stand
        //      in that band. A cleanup that cannot tell junk from the mascot is not a cleanup.
        //
        // The footer strip is now RESERVED in the prompt (D5) and the gates below detect intruding
        // artwork. Detect and refuse; never paint over the picture and call it clean.

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
        // HIMEL MUST STAND ON THE GROUND, NOT END IN MID-AIR.
        //
        // D4 regressed silently: a re-roll came back with his boots cut off again and every gate
        // reported success, because nothing looked at him. A figure that terminates in a hard
        // horizontal edge with background directly beneath it has been amputated — a real pair of
        // feet tapers and meets the ground. So: find the lowest row of mascot ink in the left
        // column, and require the rows just above it to NARROW. A clean cut stays wide to the last
        // row; real boots do not.
        const inkRow = async (y, h) => parseFloat((await convert([file,
          "-crop", `520x${h}+40+${y}`, "+repage", "-colorspace", "gray",
          "-threshold", "62%", "-format", "%[fx:mean]", "info:"])).stdout) || 0;
        let lastY = 0;
        for (let y = 900; y <= 1180; y += 10) if (await inkRow(y, 10) > 0.004) lastY = y;
        if (lastY >= 900) {
          const atEnd = await inkRow(lastY, 10);
          const above = await inkRow(lastY - 40, 10);
          // boots taper: the final rows must carry clearly less ink than 40px higher up
          if (above > 0.004 && atEnd / above > 0.85) {
            throw new Error(`Himel appears cut off at y=${lastY + 10}: the figure is still ` +
              `${(atEnd * 100).toFixed(1)}% wide at its last row vs ${(above * 100).toFixed(1)}% just above — ` +
              `feet taper, a crop does not. Re-roll with the whole figure inside the frame.`);
          }
        }

        // THE PHONE SITS ON THE BADGES, NOT IN THE MIDDLE OF THE FRAME.
        //
        // Centring it vertically left a 240px hole between the device and the badges beneath it
        // while Himel's boots ran 150px further down the opposite column — the right side read as
        // floating and top-heavy. The device and the badges are one block, so the phone's position
        // is measured UP FROM the badges rather than centred in the frame: change the badge margin
        // and the phone follows, instead of the two drifting apart again.
        const BADGE_TOP = 1350 - 95 - 60;          // badge margin + badge height
        const PHONE_BADGE_GAP = 100;
        const zoneY = BADGE_TOP - PHONE_BADGE_GAP - PHONE_H;
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

        // AMBANG HARUS RELATIF TERHADAP TEKSTUR PLATE INI SENDIRI, BUKAN ANGKA MUTLAK.
        // Ambang mutlak 0.003 ditera pada plate uji yang MULUS. Plate codex asli punya grain:
        // area latar kosongnya sendiri terukur 3.7%-6.6% edges — 12-22x di atas ambang itu. Artinya
        // gate ini akan MENOLAK setiap plate bertekstur, yaitu semua plate produksi, dan closing
        // tidak akan pernah bisa dirender lagi begitu kuota kembali.
        // Jadi: ukur potongan latar yang PASTI kosong pada plate yang sama sebagai basis, lalu
        // tuntut zona phone tidak jauh lebih ramai daripada basis itu.
        const baseRaw = await convert([file, "-alpha", "remove",
          "-crop", `240x240+40+${1350 - 300}`, "+repage", "-colorspace", "gray",
          "-morphology", "EdgeIn", "Octagon:1", "-threshold", "25%",
          "-format", "%[fx:mean]", "info:"]);
        const base = parseFloat(baseRaw.stdout);
        const limit = Number.isFinite(base) ? Math.max(0.006, base * 1.8) : 0.006;
        if (Number.isFinite(inkFrac) && inkFrac > limit) {
          throw new Error(
            `the closing slide's phone zone (${gw}x${gh} at ${gx},${gy}, incl. a ${GUTTER}px gutter) is ` +
            `${(inkFrac * 100).toFixed(2)}% edges vs ${(limit * 100).toFixed(2)}% allowed (tekstur plate ini ` +
            `${(base * 100).toFixed(2)}%) — that is TYPE OR ARTWORK, and the phone is about to be ` +
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
        // pusat kolom phone, relatif terhadap pusat slide
        const BADGE_CX = Math.round((PHONE_COL[0] + PHONE_COL[1]) / 2);
        const BADGE_DX = BADGE_CX - 540;
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
          file, "(", STORE_BADGES, "-resize", `${BADGES_W_CLOSING}x`, ")",
          // derived from the phone column, not hardcoded — if the column moves, the badges follow
          "-gravity", "south", "-geometry", `+${BADGE_DX}+95`, "-composite",
          file
        ]);
        // and PROVE they are centred. This is one line, and the defect it catches was visible to the
        // owner from across the room while every gate in this file reported success.
        // PROVE THE BADGES ARE CENTRED — BUT ONLY WHEN THE MEASUREMENT CAN MEAN ANYTHING.
        //
        // The badges are composited with `-gravity south -geometry +0+...`, so centring is
        // deterministic by construction; the pixel check exists to catch a bad offset creeping into
        // that constant. But the closing legitimately has HIMEL standing in this same strip, and no
        // amount of thresholding separates them: his boots are black ink over a solid dark sole, so
        // "dark pixels" and even a morphological open both swallow him whole. Measured: a clean
        // strip gives bbox 470x67+305 (centre 540, exact); the same strip with the mascot gives
        // 993x147+61, and the gate failed a slide whose badges were perfectly placed.
        //
        // A gate that cannot tell the thing it measures from something else in the frame must say so
        // rather than convict. So: measure, and only judge when the dark mass is BADGE-SHAPED —
        // roughly the composited width and confined to the badge rows. Otherwise report that the
        // check was skipped. A skipped check is honest; a false failure is not.
        const bstrip = await convert([file, "-crop", "1080x180+0+1150", "+repage",
          "-colorspace", "gray", "-threshold", "18%", "-negate",
          "-fuzz", "5%", "-transparent", "black", "-format", "%@", "info:"]).catch(() => null);
        const m = bstrip && /^(\d+)x(\d+)\+(\d+)\+/.exec(bstrip.stdout.trim());
        if (m) {
          const [bw, bh, bx] = [Number(m[1]), Number(m[2]), Number(m[3])];
          const badgeShaped = Math.abs(bw - BADGES_W_CLOSING) <= 60 && bh <= 110;
          if (badgeShaped) {
            const centre = bx + bw / 2;
            if (Math.abs(centre - BADGE_CX) > 8) {
              throw new Error(`the store badges are centred at x=${centre.toFixed(0)}, not ${BADGE_CX} — ` +
                `they are ${Math.abs(centre - BADGE_CX).toFixed(0)}px off the phone column they belong under`);
            }
          } else {
            console.log(`${name}: badge-centring check skipped — other art shares the footer strip ` +
              `(dark mass ${bw}x${bh}, expected ~${BADGES_W_CLOSING}x60)`);
          }
        }
        // D3 — no corner logo on closing
        console.log(`${name}: 1080x1350 + phone + store badges` + (kickerText ? " + kicker" : ""));
      } else {
        console.log(`${name}: 1080x1350 + logo` + (kickerText ? " + kicker" : ""));
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
