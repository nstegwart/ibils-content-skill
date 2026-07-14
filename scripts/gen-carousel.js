#!/usr/bin/env node
/**
 * Generate every raw slide of ONE Ibils carousel from a content plan.
 *
 * 1 codex session = 1 image, ALL PARALLEL. Each slide is rendered via
 * `codex exec` with the Himel pose references ATTACHED (`-i`) — the proven
 * way to lock the mascot identity.
 *
 * Usage:
 *   node gen-carousel.js <plan.json> <out-slides-dir>
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(HERE, "..", "assets");

// The IG handle is a property of the SURFACE, never a literal in a prompt. The carousel ships in
// ENGLISH to the global account. 48 of the first 64 English slides went out stamped @ibils.savy —
// which is not the English account — because this was a hardcoded string and the skill had no idea
// what a surface was. See references/surfaces.md; that table is the source of truth.
const IG_HANDLE = process.env.IG_HANDLE || "@ibils.global";
const HIMEL_REFS = ["hero", "explain", "invite", "alert"].map((p) =>
  path.join(ASSETS, `himel-pose-${p}.png`)
);

const PLAN_PATH = process.argv[2];
if (!PLAN_PATH || !process.argv[3]) {
  console.error("usage: node gen-carousel.js <plan.json> <out-dir>");
  process.exit(1);
}
const OUT_DIR = path.resolve(process.argv[3]);

// ---- fixed prompt blocks (operative copy — see references/styles.md) ------

const HARD_RULE = [
  "!!! ABSOLUTE RULE — READ FIRST !!!",
  "Do NOT draw a logo, logo mark, brand badge, app-icon badge, or write the",
  "word 'Ibils' as a wordmark ANYWHERE. No corner badge. The",
  "top-RIGHT corner (~280x280 px) MUST stay plain empty background — the real",
  "logo is composited there later. If you draw any logo or 'Ibils' text the",
  "slide is rejected."
].join("\n");

const REFERENCE = [
  "FOUR REFERENCE IMAGES of the mascot 'Himel' are attached — the SAME",
  "character in four poses. Lock his identity EXACTLY: a small child-king,",
  "soft side-swept hair with bangs over one eye, a pointed crown (a solid band with",
    "five ball-tipped points and small dot jewels), a",
  "scarf, a long tunic, puffy trousers, tall cuffed boots, a long cape — clean",
  "BLACK-AND-WHITE manga ink. A gentle young manga BOY, round child face —",
  "NOT a tall teenager, NOT a slender bishounen, NOT a chibi. Redraw THIS exact",
  "character. Do NOT copy a reference pose — use the pose this slide specifies."
].join("\n");

const EXPRESSION = [
  "EXPRESSION — CRITICAL. The reference images lock Himel's IDENTITY ONLY",
  "(face shape, hair, crown, scarf, outfit) — they do NOT lock his mood. Do",
  "NOT copy the reference smile. Himel must ACT this slide: his face and body",
  "language match the slide's emotion.",
  "- slide warns of a risk -> concerned, serious, alert.",
  "- slide exposes a problem or a hard/dark truth (debt, panic, money running",
  "  out, getting trapped) -> worried, alarmed, grim — NOT smiling.",
  "- slide corrects a mistake / gives a firm instruction -> firm, stern.",
  "- slide is genuinely positive or a real win -> then, and only then, a",
  "  confident smile.",
  "A smiling Himel on a slide about debt, panic, loss or hardship is WRONG and",
  "the slide is rejected. Read this slide's copy and pose, then draw the",
  "matching expression."
].join("\n");

const FORMAT = [
  "FORMAT — vertical Instagram carousel slide, portrait 4:5, exactly 1080x1350.",
  "SAFE MARGIN — EVERY important element must sit at least 8% inside every",
  "edge: all text, the footer, the kicker, AND the COMPLETE mascot — his whole",
  "body, both arms, both hands, both boots, crown and cape — plus every prop he",
  "holds. NOTHING may be clipped by the canvas edge: not an arm, not a hand,",
  "not a held object, not a boot, not a letter. If the mascot or a prop does",
  "not fit, draw them SMALLER so the whole figure is inside the frame — a",
  "cut-off mascot or cropped prop means the slide is rejected.",
  "Compose edge-to-edge: the background fills the whole 1080x1350 with no",
  "inner border, frame, or empty margin band around the artwork.",
  "All text is real typography, spelled EXACTLY, in ENGLISH.",
  "No watermark, no signature, no extra text."
].join("\n");

const NO_INVENT = [
  "DATA HONESTY — use ONLY the words and figures in this slide's copy. Do NOT",
  "invent any number, percentage, price, rupiah amount, date, statistic, or",
  "chart with made-up values. If the copy gives no number, show no number."
].join("\n");

const NOT_AI = [
  "QUALITY BAR — must look like a real human-designed poster (Figma/Illustrator",
  "by a senior designer), NOT AI-generated: every letter crisp and correctly",
  "spelled; sharp shapes, real grid, even margins; CORRECT ANATOMY — the mascot",
  "has exactly two arms, two hands, five fingers per hand, never an extra or",
  "duplicated limb; no smudges, no noise, no 3D plastic sheen, no random",
  "artefacts; no empty placeholder boxes; the headline never overlaps the",
  "mascot or his crown. Flat, restrained, editorial."
].join("\n");

const BRANDING =
  "BRANDING — draw NO logo and NO 'Ibils' wordmark. Top-RIGHT corner stays " +
  "empty (the logo is composited there). Footer only: a small '" + IG_HANDLE + "' " +
  "handle bottom-left and the slide number bottom-right.";

const PROP_RULE = [
  "PROP ORIENTATION — when Himel holds a document, receipt, bill, list, paper,",
  "card, phone, chart, or any prop, he PRESENTS it FACING THE VIEWER: the",
  "prop's front/content is turned toward the camera so the audience sees it.",
  "NEVER a reading pose where the prop faces Himel and shows its blank back to",
  "the viewer. He shows it, he does not read it."
].join("\n");

const RELEVANCE = [
  "RELEVANCE — every drawn element (stamps, seals, badges, icons, props,",
  "background motifs, decorations) MUST relate to THIS slide's message. If an",
  "element has no clear connection to the content, omit it. No random crowns,",
  "no meaningless seals, no filler icons — when in doubt, leave it out."
].join("\n");

const NO_FAKE_UI = [
  "APP-UI RULE — there are NO real Ibils app screenshots. NEVER draw a phone",
  "showing a fabricated app screen: no made-up dashboard, no fake charts, no",
  "invented buttons, no fake numbers on a screen. A phone may appear ONLY",
  "showing the Ibils SPLASH — a deep green screen with the iB logo and the word",
  "'Ibils' (exactly like the closing). Prefer drawing NO phone at all on a",
  "content slide: illustrate the user's real-world benefit, or Himel doing the",
  "real action, or a simple symbolic object — not a screen."
].join("\n");

const STYLES = {
  news:
    "VISUAL STYLE — vintage financial NEWSPAPER / broadsheet. Aged off-white " +
    "newsprint, fine halftone texture, bold condensed serif headlines, thin " +
    "column rules, small dateline type. Palette: newsprint cream, black ink, " +
    "deep Ibils green #0E3B33, amber #F2A93B. A red ink-stamp may be used ONLY " +
    "if its symbol clearly fits THIS slide's message (e.g. a downward arrow " +
    "for a weakening rupiah, a price tag for rising prices). If no relevant " +
    "symbol fits, draw NO stamp — never a decorative or random stamp.",
  education:
    "VISUAL STYLE — clean modern STUDY-WORKSHEET. Calm cream paper with a faint " +
    "even grid, generous margins. Large confident headline with ONE tidy accent " +
    "(marker highlight or hand-underline). Body in ONE crisp note card, thin " +
    "border, soft shadow. At most 2-3 small tidy doodle accents. Pastel: warm " +
    "cream, sage green, soft amber. Restrained and premium.",
  marketing:
    "VISUAL STYLE — bold clean modern FINTECH-AD poster. ONE solid background " +
    "(solid deep Ibils green OR solid cream). Big crisp headline, strong " +
    "hierarchy. ONE accent only — one halftone-dot patch or one starburst. " +
    "Flat, disciplined, high contrast, lots of negative space. Palette: deep " +
    "Ibils green, bright amber/yellow, cream, black.",
  insight:
    "VISUAL STYLE — artistic RETRO MANGA, 1980s-90s manga-magazine look. Bold " +
    "black ink linework, heavy screentone halftone shading, dramatic speed " +
    "lines, aged off-register print texture. Palette: deep Ibils green #0E3B33, " +
    "warm cream #FBF6E9, amber #F2A93B, black ink."
};

function buildPrompt(slide, plan, total) {
  const style = STYLES[plan.mode] || STYLES.news;
  const lines = [
    "Use your built-in NATIVE image-generation tool directly (no API key, no",
    "imagegen skill, no python). Generate ONE complete, finished Instagram",
    "carousel SLIDE as a single image — headline, body text and mascot designed in.",
    "", HARD_RULE, "", REFERENCE, "", EXPRESSION, "", style, "", BRANDING,
    `Kicker / section label — render it EXACTLY as written, keep this mixed`,
    `case, do NOT uppercase it: "${plan.kicker}".`,
    "", FORMAT, "", NO_INVENT, "", NOT_AI, "", PROP_RULE, "", NO_FAKE_UI, "",
    RELEVANCE, "",
    `THIS SLIDE (${slide.kind}, ${slide.idx} of ${total}):`,
    slide.brief,
    `HIMEL POSE — draw him FRESH in this pose, do NOT copy a reference pose: ${slide.pose}.`
  ];
  if (slide.kind === "cover") {
    lines.push("This is a COVER — headline only, no body paragraph, no empty placeholder card.");
  }
  if (slide.kind === "closing") {
    lines.push(
      "CLOSING SLIDE — render it in the SAME category visual style as the other",
      "slides (this carousel's style). Draw ONLY: a short closing headline and",
      "Himel at the BOTTOM-LEFT.",
      "CLOSING HEADLINE — ONE single line of large type, kept entirely inside",
      "the TOP ~210px band. It must NOT wrap to a second line: if the words do",
      "not fit on one line, set the type smaller — never stack two lines. The",
      "area below the headline band is reserved for a phone composited later; a",
      "second headline line will be overlapped and the slide is rejected.",
      "HIMEL POSE for the closing: a friendly SELF-CONTAINED pose inside the",
      "left third of the slide — standing, or a small wave with one hand kept",
      "close to his body. He must NOT reach, point, lean, or extend any arm/leg/",
      "cape toward the centre or right — that whole area is reserved for a phone",
      "composited later and any limb there will be covered.",
      "DO NOT draw a phone, a phone mockup, a logo, the iB mark, the word",
      "'Ibils', or any store badge. DO NOT draw any card, panel, box, banner,",
      "button, or CTA strip ANYWHERE — especially not in the bottom third.",
      "The centre / centre-right and the WHOLE bottom third (below Himel's",
      "head height) MUST stay plain, EMPTY, textured background — nothing is",
      "drawn there, no card behind anything; a phone and the store badges are",
      "composited on later. If you draw a phone, a logo, a card/panel, let the",
      "headline leave the top band, or let Himel cross into the centre, the",
      "slide is rejected."
    );
  }
  lines.push(
    "",
    `Save it to the file named exactly: ${slide.name}.png (relative to current dir).`,
    "Reply DONE once the file exists."
  );
  return lines.join("\n");
}

function runCodex(slide, plan, total) {
  return new Promise((resolve) => {
    const out = path.join(OUT_DIR, `${slide.name}.png`);
    const imgs = [...HIMEL_REFS];
    const iArgs = [];
    for (const img of imgs) iArgs.push("-i", img);
    const args = [
      "exec",
      "-m", "gpt-5.5",
      "-c", 'model_reasoning_effort="medium"',
      "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check", ...iArgs, "-C", OUT_DIR, "-"
    ];
    const child = spawn("codex", args, {
      cwd: OUT_DIR,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"]
    });

    // *** DRAIN THE PIPES. THIS IS NOT OPTIONAL. ***
    // We open stdout/stderr as pipes, so SOMETHING must read them. `codex exec` is verbose; once it
    // has written ~64KB the kernel pipe buffer is full, codex blocks forever inside write(), and the
    // only thing that ever happens is the SIGKILL below — 9 minutes later, reported as a mysterious
    // "attempt failed", three times, on every slide at once. (This is exactly what happened when the
    // account-pool removal deleted the old rate-limit sniffer, which had been the only reader.)
    // Keep a TAIL of the output so a failure can say why it failed.
    let buf = "";
    const grab = (d) => { buf += d.toString(); if (buf.length > 60000) buf = buf.slice(-60000); };
    child.stdout.on("data", grab);
    child.stderr.on("data", grab);

    // If `codex` is not on PATH, ChildProcess emits 'error'. With no listener, EventEmitter THROWS,
    // the exception escapes the Promise, and every retry/soft-fail path below is bypassed.
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, limited: false, why: `cannot spawn codex: ${e.message}` });
    });

    const timer = setTimeout(() => child.kill("SIGKILL"), 9 * 60 * 1000);
    child.on("close", async () => {
      clearTimeout(timer);
      let ok = false;
      try {
        ok = (await fs.stat(out)).size > 0;
      } catch {
        /* genuine failure */
      }
      // Surface WHY. A bare "failed" is what made the deadlock invisible for so long.
      const limited = /usage limit|rate.?limit|try again (at|in)|429|quota/i.test(buf);
      const why = ok ? "" : (limited ? "codex usage limit" : (buf.trim().split("\n").pop() || "no output"));
      resolve({ ok, limited, why });
    });
    child.stdin.end(buildPrompt(slide, plan, total));
  });
}

// Hard gate — the copy linter must pass before any image is generated.
function lintGate() {
  return new Promise((resolve) => {
    const child = spawn("node", [path.join(HERE, "lint-plan.js"), PLAN_PATH], {
      stdio: ["ignore", "inherit", "inherit"]
    });
    child.on("close", (code) => resolve(code === 0));
  });
}

async function main() {
  const plan = JSON.parse(await fs.readFile(PLAN_PATH, "utf8"));
  if (!Array.isArray(plan.slides) || !plan.slides.length) {
    console.error("plan has no slides");
    process.exit(1);
  }
  // copy quality gate — refuse to render a plan with vague / dumb copy
  if (!(await lintGate())) {
    console.error("ABORT — plan failed the copy linter. Rewrite the flagged slides, then re-run.");
    process.exit(1);
  }
  await fs.mkdir(OUT_DIR, { recursive: true });
  const total = plan.slides.length;
  plan.slides.forEach((s, i) => {
    s.idx = i + 1;
    s.name = `${String(i + 1).padStart(2, "0")}-${s.kind}`;
  });

  console.log(`carousel ${plan.mode}/${plan.topic || ""} — parallel slides`);

  async function genSlide(slide) {
    const out = path.join(OUT_DIR, `${slide.name}.png`);
    try {
      if ((await fs.stat(out)).size > 0) {
        console.log(`${slide.name}: skip (exists)`);
        return true;
      }
    } catch {
      /* generate */
    }
    // Retry with BACKOFF. Under the old account pool a failure meant "rotate to another account",
    // which was an instant, real remedy. There is one account now, so the dominant failure is a
    // usage limit — and hammering the same account three times in three seconds is not a remedy,
    // it just burns the attempts. Wait, and wait longer if codex actually said "limit".
    const BACKOFF = [30_000, 120_000, 300_000];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const r = await runCodex(slide, plan, total);
      if (r.ok) {
        console.log(`${slide.name}: ok`);
        return true;
      }
      console.log(`${slide.name}: attempt ${attempt} failed — ${r.why}`);
      if (attempt < 3) {
        const wait = r.limited ? BACKOFF[attempt] : 8_000;
        console.log(`${slide.name}: waiting ${Math.round(wait / 1000)}s before retry`);
        await new Promise((r2) => setTimeout(r2, wait));
      }
    }
    console.log(`${slide.name}: FAILED`);
    return false;
  }

  const results = await Promise.all(plan.slides.map((s) => genSlide(s)));
  const ok = results.filter(Boolean).length;
  console.log(`generated ${ok}/${total} raw slides -> ${OUT_DIR}`);
  if (ok < total) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});
