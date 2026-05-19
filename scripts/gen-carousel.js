#!/usr/bin/env node
/**
 * Generate every raw slide of ONE Ibils carousel from a content plan.
 *
 * One carousel rides ONE codex account (an isolated provisioned CODEX_HOME).
 * Each slide is rendered via `codex exec` with the Himel pose references
 * ATTACHED (`-i`) — the proven way to lock the mascot identity.
 *
 * ACCOUNT RESILIENCE: a slide's codex output is scanned for auth-dead /
 * rate-limit markers. When the account dies, it is marked exhausted and the
 * carousel rotates to the next usable account and retries the slide — so a
 * dead account never sinks the run.
 *
 * Usage:
 *   node gen-carousel.js <plan.json> <out-slides-dir> [--account <email>]
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
  listUsableAccounts, provisionCodexHome, markExhausted,
  isAuthDead, isRateLimited
} from "./accounts.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(HERE, "..", "assets");
const HIMEL_REFS = ["hero", "explain", "invite", "alert"].map((p) =>
  path.join(ASSETS, `himel-pose-${p}.png`)
);
const LOGO_REF = path.join(ASSETS, "ibils-icon.svg");

const PLAN_PATH = process.argv[2];
if (!PLAN_PATH || !process.argv[3]) {
  console.error("usage: node gen-carousel.js <plan.json> <out-dir> [--account <email>]");
  process.exit(1);
}
const OUT_DIR = path.resolve(process.argv[3]);
const WANT_ACCOUNT = (() => {
  const i = process.argv.indexOf("--account");
  return i !== -1 ? process.argv[i + 1] : null;
})();

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
  "soft side-swept hair with bangs over one eye, a thin pointed line-crown, a",
  "scarf, a long tunic, puffy trousers, tall cuffed boots, a long cape — clean",
  "BLACK-AND-WHITE manga ink. A gentle young manga BOY, round child face —",
  "NOT a tall teenager, NOT a slender bishounen, NOT a chibi. Redraw THIS exact",
  "character. Do NOT copy a reference pose — use the pose this slide specifies."
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
  "All text is real typography, spelled EXACTLY, in Indonesian.",
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
  "empty (the logo is composited there). Footer only: a small '@ibils.savy' " +
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
    "", HARD_RULE, "", REFERENCE, "", style, "", BRANDING,
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
      "slides (this carousel's style). Draw ONLY: a short closing headline kept",
      "entirely within the TOP ~230px band, and Himel at the BOTTOM-LEFT.",
      "HIMEL POSE for the closing: a friendly SELF-CONTAINED pose inside the",
      "left third of the slide — standing, or a small wave with one hand kept",
      "close to his body. He must NOT reach, point, lean, or extend any arm/leg/",
      "cape toward the centre or right — that whole area is reserved for a phone",
      "composited later and any limb there will be covered.",
      "DO NOT draw a phone, a phone mockup, a logo, the iB mark, the word",
      "'Ibils', or any store badge. The centre / centre-right and the bottom",
      "~190px MUST stay plain empty background. If you draw a phone or logo, let",
      "the headline leave the top band, or let Himel cross into the centre, the",
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

// Run one slide on one provisioned CODEX_HOME. Captures output so the caller
// can tell a genuine failure from an account-death.
function runCodex(slide, plan, total, home) {
  return new Promise((resolve) => {
    const out = path.join(OUT_DIR, `${slide.name}.png`);
    const imgs = [...HIMEL_REFS];
    const iArgs = [];
    for (const img of imgs) iArgs.push("-i", img);
    const args = [
      "exec",
      "-m", "gpt-5.5",
      "-c", 'model_reasoning_effort="xhigh"',
      "-c", 'service_tier="fast"',
      "--dangerously-bypass-approvals-and-sandbox",
      "--skip-git-repo-check", ...iArgs, "-C", OUT_DIR, "-"
    ];
    const child = spawn("codex", args, {
      cwd: OUT_DIR,
      env: { ...process.env, NO_COLOR: "1", CODEX_HOME: home },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let buf = "";
    let killedForLimit = false;
    const grab = (d) => {
      buf += d.toString();
      if (buf.length > 200000) buf = buf.slice(-200000);
      // a rate-limited / auth-dead codex call otherwise hangs until the
      // 9-min SIGKILL — kill it the moment the limit message appears so the
      // carousel rotates to the next account in seconds, not minutes.
      if (!killedForLimit && (isRateLimited(buf) || isAuthDead(buf))) {
        killedForLimit = true;
        child.kill("SIGKILL");
      }
    };
    child.stdout.on("data", grab);
    child.stderr.on("data", grab);
    const timer = setTimeout(() => child.kill("SIGKILL"), 9 * 60 * 1000);
    child.on("close", async () => {
      clearTimeout(timer);
      let ok = false;
      try {
        ok = (await fs.stat(out)).size > 0;
      } catch {
        /* genuine failure */
      }
      // keep this codex home tiny — wipe everything codex wrote this slide,
      // keep only auth.json so the next slide reuses the same account. Without
      // this a 16-slide carousel home grows to multiple GB in /tmp.
      try {
        for (const e of await fs.readdir(home)) {
          if (e !== "auth.json") {
            await fs.rm(path.join(home, e), { recursive: true, force: true });
          }
        }
      } catch {
        /* home already gone */
      }
      resolve({ ok, accountDead: isAuthDead(buf) || isRateLimited(buf) });
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

// pick a random usable account not already tried for the current slide
async function pickAccount(exclude) {
  const pool = (await listUsableAccounts()).filter((a) => !exclude.has(a.email));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
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

  if (!(await listUsableAccounts()).length) {
    console.error("no usable codex account");
    process.exit(1);
  }
  const homeBase = await fs.mkdtemp(path.join(os.tmpdir(), "ibils-carousel-"));
  console.log(`carousel ${plan.mode}/${plan.topic || ""} — parallel slides, per-slide accounts`);

  let homeSeq = 0;
  // generate ONE slide: pick a fresh account, up to 4 tries on different
  // accounts. Each call lands on its own account so a carousel's slides
  // never share — and run concurrently.
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
    const tried = new Set();
    for (let attempt = 1; attempt <= 4; attempt++) {
      const account = await pickAccount(tried);
      if (!account) {
        console.log(`${slide.name}: no usable account left`);
        return false;
      }
      tried.add(account.email);
      const home = path.join(homeBase, `h${homeSeq++}`);
      await provisionCodexHome(home, account);
      const r = await runCodex(slide, plan, total, home);
      await fs.rm(home, { recursive: true, force: true }).catch(() => {});
      if (r.ok) {
        console.log(`${slide.name}: ok`);
        return true;
      }
      if (r.accountDead) await markExhausted(account.email);
      console.log(`${slide.name}: attempt ${attempt} failed (${account.email})`);
    }
    console.log(`${slide.name}: FAILED`);
    return false;
  }

  let ok = 0;
  try {
    // ALL slides of the carousel render IN PARALLEL — one carousel engages
    // ~16 accounts at once and finishes in roughly one slide's time, not 16x.
    const results = await Promise.all(plan.slides.map((s) => genSlide(s)));
    ok = results.filter(Boolean).length;
  } finally {
    await fs.rm(homeBase, { recursive: true, force: true }).catch(() => {});
  }
  console.log(`generated ${ok}/${total} raw slides -> ${OUT_DIR}`);
  if (ok < total) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR", e.message);
  process.exit(1);
});
