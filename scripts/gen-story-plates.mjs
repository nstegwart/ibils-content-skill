#!/usr/bin/env node
/**
 * Story plates — CASTLESS.  `node scripts/gen-story-plates.mjs <ledger.json> <outdir>`
 *
 * 1 codex session = 1 image, ALL PARALLEL.
 *
 * No Himel. No refs attached. The look is `looks/kansas-doc/look.md` and it is a photograph, not an
 * illustration — because the subject is a man who took his daughter's college fund and destroyed his
 * neighbours' bank, and a manga child-king in a crown standing in that frame would make it a joke.
 *
 * THE HARD RULE, and it is doubled here: NO TEXT ANYWHERE IN FRAME. The video model hallucinates
 * letters onto any flat printable surface (that law is inherited and it is not negotiable). But in
 * THIS film it is worse than a rendering bug — a fabricated bank name or a fabricated balance on a
 * screen would be a fabricated FACT, in a film whose entire authority is that every fact is real.
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOOK = fsSync.readFileSync(path.join(HERE, "..", "looks", "kansas-doc", "look.md"), "utf8");

const NO_TEXT = `!!! NO TEXT. NOT ONE LETTER. ANYWHERE IN THIS FRAME. !!!
No signage. No bank name. No shop name. No readable document. No phone interface. No numbers on any
screen. No newspaper, no letter, no notice, no label, no logo, no watermark.
A phone may EMIT LIGHT ONLY — a warm glow, no interface, no digits.
A document may appear ONLY face-down, edge-on, crumpled, or too distant to read.
Every flat, blank, printable-looking surface in this frame must be REMOVED or DESTROYED as a writing
surface. A single blank white rectangle will be filled with invented letters, and in this film an
invented letter is an invented fact.`;

const ETHICS = `NO IDENTIFIABLE FACE. This depicts real, documented events involving real people.
Show BACKS, HANDS, SILHOUETTES, figures at distance, figures cropped at the shoulder. Never a
portrait that could be mistaken for the actual man. This is a legal and ethical line, not a style.`;

function prompt(sc) {
  return [
    "Use your built-in NATIVE image-generation tool. Generate ONE documentary film frame.",
    "", NO_TEXT, "", ETHICS, "",
    "FORMAT: vertical 9:16, exactly 1080x1920.",
    "", "=== THE LOOK ===", LOOK, "",
    "=== THIS SHOT ===",
    sc.visual,
    "",
    `Time of day: ${sc.tod}. Location: ${sc.location}.`,
    "",
    "It is a photograph. Real grain, real lens, natural motivated light. The camera watches and does",
    "not editorialise — the facts are already dramatic, and a camera adding drama is a camera that",
    "does not trust them.",
    "",
    `Save it to the file named exactly: s${String(sc.n).padStart(2, "0")}.png (relative to the current directory).`,
    "Reply DONE once the file exists.",
  ].join("\n");
}

function codex(sc, out) {
  return new Promise((resolve) => {
    const child = spawn("codex", [
      "exec", "-m", "gpt-5.5", "-c", 'model_reasoning_effort="high"',
      "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check", "-C", out, "-",
    ], { cwd: out, env: { ...process.env, NO_COLOR: "1" }, stdio: ["pipe", "pipe", "pipe"] });
    let buf = "";
    // drain, always. an unread pipe past ~64KB blocks the child forever.
    const grab = (d) => { buf += d; if (buf.length > 60000) buf = buf.slice(-60000); };
    child.stdout.on("data", grab);
    child.stderr.on("data", grab);
    child.on("error", (e) => resolve({ ok: false, why: `cannot spawn codex: ${e.message}` }));
    const t = setTimeout(() => child.kill("SIGKILL"), 10 * 60 * 1000);
    child.on("close", async () => {
      clearTimeout(t);
      const f = path.join(out, `s${String(sc.n).padStart(2, "0")}.png`);
      let ok = false;
      try { ok = (await fs.stat(f)).size > 0; } catch {}
      const limited = /usage limit|rate.?limit|429|quota/i.test(buf);
      resolve({ ok, limited, why: ok ? "" : (limited ? "codex usage limit" : (buf.trim().split("\n").pop() || "no output")) });
    });
    child.stdin.end(prompt(sc));
  });
}

const [, , ledgerPath, outDir] = process.argv;
if (!ledgerPath || !outDir) {
  console.error("usage: gen-story-plates.mjs <ledger.json> <outdir>");
  process.exit(1);
}
const OUT = path.resolve(outDir);
await fs.mkdir(OUT, { recursive: true });
const ledger = JSON.parse(await fs.readFile(path.resolve(ledgerPath), "utf8"));

console.log(`castless documentary plates — ${ledger.scenes.length} scenes, 1 codex session each, all parallel\n`);

const BACKOFF = [30_000, 120_000, 300_000];
const res = await Promise.all(ledger.scenes.map(async (sc) => {
  for (let a = 1; a <= 3; a++) {
    const r = await codex(sc, OUT);
    if (r.ok) { console.log(`  s${String(sc.n).padStart(2, "0")}: ok`); return true; }
    console.log(`  s${String(sc.n).padStart(2, "0")}: try ${a} — ${r.why}`);
    if (a < 3) await new Promise((z) => setTimeout(z, r.limited ? BACKOFF[a] : 8000));
  }
  console.log(`  s${String(sc.n).padStart(2, "0")}: FAILED`);
  return false;
}));

const ok = res.filter(Boolean).length;
console.log(`\n${ok}/${ledger.scenes.length} plates -> ${OUT}`);
console.log("NOW LOOK AT THEM. Any text in frame is a fabricated fact and the plate is dead.");
process.exit(ok === ledger.scenes.length ? 0 : 1);
