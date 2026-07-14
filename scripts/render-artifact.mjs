#!/usr/bin/env node
/**
 * LAW 4 — THE EVIDENCE LAW, made real.
 *
 *   node scripts/render-artifact.mjs <artifact.json> <out.png>
 *
 * A claim is carried by an ARTIFACT — a table, a chart, a before/after — and the text captions the
 * artifact. An artifact that could not exist unless the thing were real is worth ten sentences of
 * assertion.
 *
 * *** THE IMAGE MODEL NEVER DRAWS A CHART. ***
 * Ask codex for "a table of Netflix prices" and it will produce a beautiful table of invented
 * numbers. It has invented numbers before, and it will again — that is what a language model does
 * with a blank cell. So the numbers never pass through the model at all. They are rendered here,
 * from a data file, and composited onto the slide exactly like the logo and the store badges.
 *
 * Same doctrine as every other real mark in this skill: COMPOSITE IT, NEVER GENERATE IT.
 *
 * artifact.json:
 *   { "type": "table", "title": "...", "columns": ["Service","2020","2026"],
 *     "rows": [["Netflix","$12.99","$19.99"], ...],
 *     "highlight_col": 2,            // optional — the column carrying the new fact
 *     "footer": "source + date" }
 *
 *   { "type": "bars", "title": "...", "unit": "$",
 *     "series": [{"label":"Disney+","from":6.99,"to":18.99}, ...],
 *     "footer": "..." }
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// The Ibils palette. An artifact is part of the film, not a spreadsheet screenshot.
const NIGHT = "#0E3B33";
const CREAM = "#FBF6E9";
const AMBER = "#F2A93B";
const DIM   = "#8FA9A2";

const FONTS = [
  "/System/Library/Fonts/HelveticaNeue.ttc",
  "/System/Library/Fonts/Helvetica.ttc",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
];
const FONT = FONTS.find((f) => fs.existsSync(f));
if (!FONT) throw new Error(`no usable font file; tried:\n  ${FONTS.join("\n  ")}`);

const sh = (args) => {
  const r = spawnSync("magick", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`magick failed: ${r.stderr || r.status}`);
};

const W = 900;              // composited onto a 1080-wide slide with margin
const PAD = 40;

function label(text, size, color, out) {
  // magick's `label:` throws on an empty string. A table legitimately has empty cells (the total
  // row's first column, a spacer header) — emit a 1x1 transparent pixel instead of dying.
  const t = String(text ?? "");
  if (!t.trim()) {
    sh(["-size", "1x1", "xc:none", out]);
    return out;
  }
  sh(["-background", "none", "-fill", color, "-font", FONT, "-pointsize", String(size),
    `label:${t}`, "-trim", "+repage", out]);
  return out;
}
const widthOf = (f) => Number(spawnSync("magick", [f, "-format", "%w", "info:"], { encoding: "utf8" }).stdout);
const heightOf = (f) => Number(spawnSync("magick", [f, "-format", "%h", "info:"], { encoding: "utf8" }).stdout);

function table(a, out) {
  const T = process.env.TMPDIR || "/tmp";
  const p = (n) => path.join(T, `art_${n}_${process.pid}.png`);
  const cols = a.columns.length;
  const colW = Math.floor((W - PAD * 2) / cols);
  const rowH = 62;
  const titleH = a.title ? 70 : 0;
  const footH = a.footer ? 46 : 0;
  const H = titleH + rowH * (a.rows.length + 1) + footH + PAD * 2;

  const args = ["-size", `${W}x${H}`, `xc:${NIGHT}`, "-colorspace", "sRGB"];

  if (a.title) {
    label(a.title, 34, CREAM, p("t"));
    args.push(p("t"), "-geometry", `+${PAD}+${PAD}`, "-composite");
  }

  // header row
  let y = PAD + titleH;
  a.columns.forEach((c, i) => {
    label(c, 24, DIM, p(`h${i}`));
    args.push(p(`h${i}`), "-geometry", `+${PAD + i * colW}+${y + 14}`, "-composite");
  });
  y += rowH;

  // a rule under the header — structure, not decoration
  args.push("-fill", DIM, "-draw", `rectangle ${PAD},${y - 12} ${W - PAD},${y - 10}`);

  a.rows.forEach((row, r) => {
    row.forEach((cell, i) => {
      // Amber is the ONE point of meaning (styles.md). It marks WHAT MOVED — never a value that
      // stood still. The first render highlighted iCloud's $2.99 in the 2026 column even though it
      // has not changed since 2015, and iCloud is the CONTROL GROUP of the whole deck. An accent on
      // a number that did not move is an accent that means nothing, and the eye stops trusting it.
      const changed = a.highlight_col === i && i > 0 &&
        String(cell).trim() !== String(row[i - 1] ?? "").trim();
      label(String(cell), 30, changed ? AMBER : CREAM, p(`c${r}_${i}`));
      args.push(p(`c${r}_${i}`), "-geometry", `+${PAD + i * colW}+${y + 16}`, "-composite");
    });
    y += rowH;
  });

  if (a.footer) {
    label(a.footer, 19, DIM, p("f"));
    args.push(p("f"), "-geometry", `+${PAD}+${H - PAD - 24}`, "-composite");
  }
  args.push("-colorspace", "sRGB", out);
  sh(args);
}

function bars(a, out) {
  const T = process.env.TMPDIR || "/tmp";
  const p = (n) => path.join(T, `art_${n}_${process.pid}.png`);
  const max = Math.max(...a.series.flatMap((s) => [s.from, s.to]));
  const rowH = 84;
  const titleH = a.title ? 70 : 0;
  const footH = a.footer ? 46 : 0;
  const H = titleH + rowH * a.series.length + footH + PAD * 2;
  const barX = PAD + 200;
  const barMax = W - barX - PAD - 130;

  const args = ["-size", `${W}x${H}`, `xc:${NIGHT}`, "-colorspace", "sRGB"];
  if (a.title) { label(a.title, 34, CREAM, p("t")); args.push(p("t"), "-geometry", `+${PAD}+${PAD}`, "-composite"); }

  let y = PAD + titleH;
  a.series.forEach((s, i) => {
    label(s.label, 26, CREAM, p(`l${i}`));
    args.push(p(`l${i}`), "-geometry", `+${PAD}+${y + 24}`, "-composite");

    const wFrom = Math.round((s.from / max) * barMax);
    const wTo   = Math.round((s.to   / max) * barMax);
    // the OLD price is a ghost. the NEW price is the amber. the gap between them IS the slide.
    args.push("-fill", DIM,   "-draw", `rectangle ${barX},${y + 16} ${barX + wFrom},${y + 30}`);
    args.push("-fill", AMBER, "-draw", `rectangle ${barX},${y + 38} ${barX + wTo},${y + 60}`);

    label(`${a.unit || ""}${s.from}`, 20, DIM, p(`a${i}`));
    args.push(p(`a${i}`), "-geometry", `+${barX + wFrom + 12}+${y + 14}`, "-composite");
    label(`${a.unit || ""}${s.to}`, 26, AMBER, p(`b${i}`));
    args.push(p(`b${i}`), "-geometry", `+${barX + wTo + 12}+${y + 36}`, "-composite");
    y += rowH;
  });

  if (a.footer) { label(a.footer, 19, DIM, p("f")); args.push(p("f"), "-geometry", `+${PAD}+${H - PAD - 24}`, "-composite"); }
  args.push("-colorspace", "sRGB", out);
  sh(args);
}

const [, , src, out] = process.argv;
if (!src || !out) {
  console.error("usage: render-artifact.mjs <artifact.json> <out.png>");
  process.exit(1);
}
const a = JSON.parse(fs.readFileSync(src, "utf8"));
if (a.type === "table") table(a, out);
else if (a.type === "bars") bars(a, out);
else { console.error(`unknown artifact type: ${a.type} (table | bars)`); process.exit(1); }

// A footer with no source is an artifact pretending to be evidence.
if (!a.footer) {
  console.error("REFUSING: an artifact with no source footer is decoration, not evidence. Add `footer`.");
  fs.unlinkSync(out);
  process.exit(1);
}
const dim = spawnSync("magick", [out, "-format", "%wx%h", "info:"], { encoding: "utf8" }).stdout;
console.log(`${a.type}: ${dim} -> ${out}`);
console.log(`  every number came from ${path.basename(src)}. None of them passed through an image model.`);
