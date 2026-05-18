#!/usr/bin/env node
/**
 * Finalise raw carousel slides into uniform, brand-consistent assets.
 *
 * For every *.png in the given directory:
 *   1. PAD (never crop) to a 4:5 box using the slide's own edge colour, then
 *      resize to EXACTLY 1080x1350 — uniform carousel size, zero content lost.
 *   2. Composite the fixed Ibils glass-card logo into the top-RIGHT corner —
 *      pixel-identical branding on every slide.
 *
 * Requires ImageMagick (`magick`) on PATH.
 *
 * Usage: node finalize.js <slides-dir>
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOGO_CARD = path.join(HERE, "..", "assets", "ibils-logo-card.png");
const STORE_BADGES = path.join(HERE, "..", "assets", "store-badges.png");
const CLOSING_PHONE = path.join(HERE, "..", "assets", "closing-phone.png");

const DIR = process.argv[2];
if (!DIR) {
  console.error("usage: node finalize.js <slides-dir>");
  process.exit(1);
}

async function finalizeOne(file) {
  const id = await execFileP("magick", ["identify", "-format", "%w %h", file]);
  const [w, h] = id.stdout.trim().split(/\s+/).map(Number);
  if (!w || !h) throw new Error(`cannot read size: ${file}`);
  // smallest 4:5 box that CONTAINS the image — pad, do not crop
  const boxW = Math.max(w, Math.round(h * 0.8));
  const boxH = Math.max(h, Math.round(w / 0.8));
  const corner = (
    await execFileP("magick", [file, "-format", "%[pixel:p{4,4}]", "info:"])
  ).stdout.trim();
  await execFileP("magick", [
    file,
    "-background", corner || "white",
    "-gravity", "center",
    "-extent", `${boxW}x${boxH}`,
    "-resize", "1080x1350!",
    file
  ]);
  // glass-card logo — always top-RIGHT corner, small
  await execFileP("magick", [
    file, LOGO_CARD,
    "-gravity", "northeast", "-geometry", "+46+46", "-composite",
    file
  ]);
}

async function main() {
  const entries = (await fs.readdir(DIR))
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .sort();
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
        await execFileP("magick", [
          file, CLOSING_PHONE,
          "-gravity", "center", "-geometry", "+165-30", "-composite",
          file
        ]);
        await execFileP("magick", [
          file, STORE_BADGES,
          "-gravity", "south", "-geometry", "+0+74", "-composite",
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
}

main().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});
