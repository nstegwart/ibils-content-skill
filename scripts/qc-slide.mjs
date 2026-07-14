#!/usr/bin/env node
/**
 * THE ART GATE.  `node scripts/qc-slide.mjs <slides-dir>`
 *
 * The copy has had a gate for a long time: lint and critic run BEFORE a single image is generated,
 * and a bad plan cannot reach the renderer. The ART has had NO gate at all. Nothing has ever looked
 * at a rendered slide and asked whether it obeys the art direction.
 *
 * So the art direction was a document, and a document is a hope. `references/styles.md` has said,
 * in these words, for the entire life of this skill:
 *
 *     "Amber #F2A93B = ONE point of meaning per frame. Never decoration."
 *
 * And the shipped `why-overspend` cover is 11% amber — a decorative wedge across a third of the
 * canvas. The law was right there. Nothing enforced it, so it drifted, and nobody knew which slides
 * had drifted until someone measured.
 *
 * This is the same move that fixed the ad: the light arc stopped being a vibe the moment it became
 * a number the build asserts. Art direction becomes real when it is measurable.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const AMBER = [0xF2, 0xA9, 0x3B];
const GREEN = [0x0E, 0x3B, 0x33];
const CREAM = [0xFB, 0xF6, 0xE9];

// Amber is the ACCENT. A point of meaning is a lamp, a terminal, a glow — it is SMALL. Past this
// fraction of the canvas it stops being a point and becomes a field, which is decoration, which is
// the one thing the palette doctrine forbids.
const AMBER_MAX = 0.06;
// The brand three should be most of what you see. A slide that is mostly some other colour has
// wandered out of the brand entirely.
const BRAND_MIN = 0.55;
// The top-right corner is reserved: the real logo is composited there afterwards. codex must leave
// it plain, or the logo lands on artwork.
const CORNER = { w: 280, h: 280 };

function pixels(file, w = 200, h = 250) {
  const r = spawnSync("magick", [file, "-alpha", "remove", "-resize", `${w}x${h}!`, "-depth", "8", "rgb:-"],
    { maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`cannot read ${file}`);
  const b = r.stdout;
  const out = [];
  for (let i = 0; i + 2 < b.length; i += 3) out.push([b[i], b[i + 1], b[i + 2]]);
  return out;
}
const near = (px, c, tol = 60) => Math.abs(px[0] - c[0]) + Math.abs(px[1] - c[1]) + Math.abs(px[2] - c[2]) < tol;
const frac = (all, c) => all.filter((p) => near(p, c)).length / all.length;

const DIR = process.argv[2];
if (!DIR) { console.error("usage: qc-slide.mjs <slides-dir>"); process.exit(1); }

const files = (await fs.readdir(DIR)).filter((f) => /\.png$/i.test(f)).sort();
if (!files.length) { console.error(`no slides in ${DIR}`); process.exit(1); }

let bad = 0;
console.log("\nTHE ART GATE — the palette doctrine, as numbers\n");
console.log("  slide                      amber   green   cream   brand   verdict");

for (const f of files) {
  const file = path.join(DIR, f);
  const all = pixels(file);
  const a = frac(all, AMBER), g = frac(all, GREEN), c = frac(all, CREAM);
  const brand = a + g + c;
  const why = [];

  if (a > AMBER_MAX) {
    why.push(`amber is ${(a * 100).toFixed(1)}% of the canvas — that is a FIELD, not a point of meaning. ` +
      `styles.md: "amber = ONE point of meaning per frame, never decoration."`);
  }
  if (brand < BRAND_MIN) {
    why.push(`only ${(brand * 100).toFixed(0)}% of the slide is in the brand palette — it has wandered out of the brand.`);
  }

  // the reserved logo corner must be PLAIN — the real mark is composited into it later
  const r = spawnSync("magick", [file, "-alpha", "remove",
    "-gravity", "northeast", "-crop", `${CORNER.w}x${CORNER.h}+0+0`, "+repage",
    "-format", "%[fx:standard_deviation]", "info:"], { encoding: "utf8" });
  const sd = parseFloat(r.stdout);
  if (Number.isFinite(sd) && sd > 0.12) {
    why.push(`the reserved top-right corner has artwork in it (stddev ${sd.toFixed(3)}) — the composited logo will land on it.`);
  }

  const ok = why.length === 0;
  if (!ok) bad++;
  console.log(`  ${f.padEnd(24)} ${(a * 100).toFixed(1).padStart(5)}%  ${(g * 100).toFixed(1).padStart(5)}%  ` +
    `${(c * 100).toFixed(1).padStart(5)}%  ${(brand * 100).toFixed(0).padStart(4)}%   ` +
    (ok ? "\x1b[32mok\x1b[0m" : "\x1b[31mFAIL\x1b[0m"));
  for (const w of why) console.log(`      \x1b[31m>\x1b[0m ${w}`);
}

console.log(bad
  ? `\n\x1b[31m${bad}/${files.length} slides break the art direction.\x1b[0m Regenerate them — the palette doctrine is not a suggestion.\n`
  : `\n\x1b[32mall ${files.length} slides hold the art direction.\x1b[0m\n`);
process.exit(bad ? 1 : 0);
