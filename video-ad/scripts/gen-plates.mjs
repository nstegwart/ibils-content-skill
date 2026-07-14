#!/usr/bin/env node
/** THE LIGHT ARC — "habis gelap terbitlah terang".
 *  The film was all darkness. The resolution must EMERGE INTO LIGHT.
 *  Re-render shots 5-9 on a rising light curve. 1 codex session per image, all parallel. */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const SKILL = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const OUT = process.env.OUT_DIR || path.resolve(process.cwd(), "ad");
const REFS = ["hero", "explain", "invite", "alert"].map((p) => path.join(SKILL, "assets", `himel-pose-${p}.png`));

const IDENTITY = `FOUR REFERENCE IMAGES of 'Himel' attached. Lock his identity: a small child-king, soft side-swept hair with BANGS OVER ONE EYE, a THIN POINTED LINE-CROWN (delicate, NOT a chunky jewelled crown), a scarf, a long tunic, PUFFY TROUSERS clearly visible, TALL CUFFED BOOTS clearly visible, and a CAPE that always reads as a cape (never a gown or dress). Clean black-and-white manga ink, gentle young boy, round child face.
BANNED: NO scepter, NO orb, NO staff, NO fantasy prop.`;

const ANTIBAIT = `!!! ANTI-TEXT RULE — READ FIRST !!!
This still gets handed to a VIDEO MODEL that animates it. Video models compulsively hallucinate fake letters onto any flat blank printable surface. Give it NOTHING to fill.
- NO blank flat paper. NO crisp empty white rectangles. NO clean printable panels. NO empty screens or displays.
- Any paper must ALREADY be destroyed as a writing surface: crumpled, curled tight, folded, torn, soaked with the ink bled into grey clouds, edge-on, or half-dissolved.
- NO readable letters, words, numbers, signage, labels or typography ANYWHERE except the ONE editorial line specified.
A single flat blank surface will ruin the shot.`;

const TYPO = `TYPOGRAPHY — YOU are the typographer. The type is PART OF THE COMPOSITION, never a caption pasted on. Real negative space, balanced with the subject, never across the light source, never colliding with the mascot. Strong modern editorial CONDENSED GROTESK, confident weight, tight tracking. Warm cream, NEVER pure white, sitting inside the film's grade. NO caption box, NO banner, NO bar.
SPELLING EXACT, character for character, Indonesian. Render ONLY this string:`;

// The arc: 05 is rock bottom. 06 is the first light. 07 grows. 08 is DAWN. 09 is resolved.
const SHOTS = [
  { name: "05-face", text: "Otak lo nyerah.", light: `LIGHT — ROCK BOTTOM, but the FIRST HINT of a turn. The frame is still deep in shadow, the darkest point of the film emotionally. But ONE thin blade of cool light now falls across his visible eye — a single crack of light in a dark room. The rest stays in deep green-black. This is the moment before the change: not hope yet, but the possibility of it.`,
    beat: `SHOT — CLOSE-UP. His face, mostly in shadow, a lantern raking from one side. Bangs fall over one eye; the visible eye is steady, the realisation landing behind it. Screentone shading. Quiet, still.` },

  { name: "06-send", text: "Tinggal kirim chat ke WA,", light: `LIGHT — THE FIRST REAL LIGHT OF THE FILM. This is the break in the darkness. The phone's glow is no longer a small amber point — it is a WARM, GENEROUS LIGHT that floods across him, catching his scarf, his fingers, his face, spilling onto the floor. It is the first warmth we have felt in the whole film. The surrounding dark is still there, but the light is now WINNING. Amber and warm cream, radiant, hopeful.`,
    beat: `SHOT — OVER-THE-SHOULDER. THE PRODUCT MOMENT. He holds a phone whose screen GLOWS WARM (no interface visible, only light). A crumpled receipt in his other hand is DISSOLVING INTO THAT LIGHT — turning into a stream of glowing particles being SENT into the phone, like a message leaving his hands. The gesture is decisive: he is letting it go.` },

  { name: "07-ledger", text: "Ibils otomatis nyatet pengeluaran lo.", light: `LIGHT — THE LIGHT IS GROWING. Noticeably brighter and warmer than anything before it. The lamp is generous now; the open page is BRIGHT, clean, warmly lit, the paper almost glowing. The shadows have retreated to the far edges of the frame. The mood has turned: this is relief, order arriving. Warm cream and gold.`,
    beat: `SHOT — INSERT / TOP-DOWN. An open ledger on a wooden desk. MATTE BLACK INDIA INK is writing itself across the ruled page in fresh wet strokes, no hand present — absorbed into the paper, NEVER glossy, NEVER chrome or metallic. The loose receipts around the book are ALREADY MID-DISSOLVE, liquefying into ink and streaming into the page — curling, translucent, coming apart. NOT ONE shows a flat printable face. Himel stands small at the lower-left, seen from behind, watching his book fill itself.
DIEGETIC HANDWRITING on the ruled page only — real ink handwriting in the page's perspective, human, slightly imperfect, cursive-leaning, fully READABLE, untouched by the flowing ink. Exactly these three lines:
      Kopi. Lagi.
      Minimarket jam 2 pagi.
      Struk yang ilang.` },

  { name: "08-window", text: "Lo jadi punya gambaran penuh soal uang lo", light: `LIGHT — DAWN. THIS IS THE PAYOFF OF THE ENTIRE FILM: "habis gelap terbitlah terang" — after the darkness, the light rises. The night is OVER. WARM GOLDEN MORNING LIGHT FLOODS THROUGH THE WINDOW and pours across the room, across the floorboards, across him. Long soft dawn shadows. The sky beyond is a pale warm gold and soft cream, the city waking, not sleeping. This frame must be the BRIGHTEST, WARMEST, most OPEN image in the film — a genuine sunrise after a long night. Airy. Clean. It should feel like taking a full breath after holding it for 30 seconds. Keep the deep green only as a memory in the far corners.`,
    beat: `SHOT — WIDE. The same room, transformed. The floor is clean, the receipts gone. The ledger sits CLOSED on the desk. Himel stands at the window, back to us, small against the light, cape still, looking out at the city at sunrise. Calm, not triumphant. Peace. Generous negative space. Room to breathe.` },

  { name: "09-endcard", text: "Mulai dengan Ibils sekarang", light: `LIGHT — RESOLVED AND CLEAN. Not the near-black of before. This is the calm AFTER the dawn: a soft, luminous, breathing field — deep Ibils green lifted by warm morning light, gentle gradient, quiet glow, like light coming through a window just out of frame. Settled, confident, premium. It must feel like the end of a story that turned out well, not like a dark void.`,
    beat: `SHOT — END CARD. A quiet, premium end plate. Himel stands SMALL in the LEFT THIRD, seen from behind or three-quarters, calm, at the window with soft dawn light on him; the closed ledger rests on the desk near him. The room is clean.
CRITICAL COMPOSITION: Himel and ALL scene detail stay in the LEFT THIRD (left of x=380 of 1080). The CENTRE-RIGHT region — roughly x=430 to x=1000, y=280 to y=1250 — MUST be COMPLETELY EMPTY, clean, quiet background (soft luminous falloff). Nothing drawn there at all: a real object is composited in later. It must read as intentional, beautiful negative space.
Place the closing line in the LOWER portion of the frame (below y=1320), full width, as premium film end-card typography.` },
];

function buildPrompt(s) {
  const l = [
    "Use your built-in NATIVE image-generation tool. Generate ONE cinematic film frame.",
    "", ANTIBAIT, "",
    "HARD RULES: NO logo, NO brand mark, NO app UI, NO watermark, NO real company names, NO store badges. Correct anatomy: two arms, two hands, five clearly separated fingers. FORMAT: vertical 9:16, exactly 1080x1920.",
    "", IDENTITY, "",
    `LOOK — CINEMATIC MANGA NOIR, a frame from a high-end animated short. Real staged environment with true depth. Motivated lighting from a source in the scene. The ink figure and the environment share ONE rendering language — the same halftone/grain runs THROUGH figure AND ground. Real contact shadows. Film grain, print texture.
BASE PALETTE: deep Ibils green #0E3B33, cream #FBF6E9, amber #F2A93B.`,
    "",
    "=== THE LIGHT OF THIS SHOT — THIS IS THE MOST IMPORTANT INSTRUCTION ===",
    "This film is one continuous journey from DARKNESS INTO LIGHT. Each frame sits at a specific point on that curve, and this one must land EXACTLY here:",
    s.light,
    "",
  ];
  if (s.text) l.push(TYPO, `    ${s.text}`, "");
  l.push(s.beat, "",
    "Compose it like a director and a typographer made it together. A still from an award-winning animated short.",
    `Save it to the file named exactly: ${s.name}.png (relative to current dir).`,
    "Reply DONE once the file exists.");
  return l.join("\n");
}

function runCodex(s) {
  return new Promise((resolve) => {
    const iArgs = []; for (const img of REFS) iArgs.push("-i", img);
    const args = ["exec", "-m", "gpt-5.5", "-c", 'model_reasoning_effort="high"',
      "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check", ...iArgs, "-C", OUT, "-"];
    const c = spawn("codex", args, { cwd: OUT, env: { ...process.env, NO_COLOR: "1" }, stdio: ["pipe","pipe","pipe"] });
    let b = ""; c.stdout.on("data", d => b += d); c.stderr.on("data", d => b += d);
    const t = setTimeout(() => c.kill("SIGKILL"), 10 * 60 * 1000);
    c.on("close", async () => {
      clearTimeout(t);
      let ok = false;
      try { ok = (await fs.stat(path.join(OUT, `${s.name}.png`))).size > 0; } catch {}
      resolve(ok);
    });
    c.stdin.end(buildPrompt(s));
  });
}
async function main() {
  console.log('LIGHT ARC — "habis gelap terbitlah terang"');
  console.log("re-rendering 5 frames on a rising light curve, ALL PARALLEL (1 session = 1 image)\n");
  const res = await Promise.all(SHOTS.map(async (s) => {
    for (let t = 1; t <= 3; t++) {
      if (await runCodex(s)) { console.log(`  ${s.name}: ok (try ${t})`); return true; }
      console.log(`  ${s.name}: try ${t} failed`);
    }
    console.log(`  ${s.name}: FAILED`); return false;
  }));
  console.log(`\n${res.filter(Boolean).length}/${SHOTS.length} re-rendered on the light arc`);
}
main().catch(e => { console.error("ERROR", e.message); process.exit(1); });
