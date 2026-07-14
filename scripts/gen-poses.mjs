#!/usr/bin/env node
/**
 * Generate Himel pose sheets — STANDALONE. No carousel, no plan, no slides.
 *
 *   node scripts/gen-poses.mjs                    # all 4 canonical poses -> assets/
 *   node scripts/gen-poses.mjs hero alert         # only these
 *   node scripts/gen-poses.mjs --out /tmp/try     # somewhere else (does not touch assets/)
 *   node scripts/gen-poses.mjs --custom "mid-leap, punching the air" --name jump
 *
 * 1 codex session = 1 image, ALL PARALLEL.
 *
 * TRANSPARENCY: codex cannot emit an alpha channel. So we render the figure on a FLAT WHITE
 * field and floodfill white -> transparent from the corners afterwards. Line art has closed
 * black outlines, so the white INSIDE the tunic and boots survives; only the connected
 * background is removed. This is why the prompt demands a clear margin — a boot touching the
 * frame edge would connect the figure's interior white to the background and punch a hole
 * straight through him.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const ASSETS = path.join(ROOT, "assets");
const REF_NAMES = ["hero", "explain", "invite", "alert"];

// ---------- identity ----------
// The refs are ATTACHED to every call. Without them the model drifts him into a teenager /
// bishounen within one generation. This is not optional.
const IDENTITY = `The FOUR ATTACHED REFERENCE IMAGES are the mascot 'Himel'. Lock his identity exactly:
- a SMALL CHILD-KING. A round, soft CHILD's face — never a teenager, never a bishounen, never chibi.
- soft side-swept hair, bangs falling over one eye
- a pointed crown — a solid band with five ball-tipped points and small dot jewels on the band
- a scarf around his neck
- a long tunic, PUFFY TROUSERS clearly visible, TALL CUFFED BOOTS clearly visible
- a long CAPE that always reads as a CAPE — never a gown, never a dress
- clean black-and-white manga ink: confident linework, crosshatch and screentone shading, no colour

*** HE CARRIES NOTHING. ***
The scepter is RETIRED and must NOT appear. (The original 2026 reference sheets showed one; they
were replaced by this script precisely to remove it. If you are regenerating from those, ignore it.)
NO scepter, NO staff, NO orb, NO wand, NO rod, NO fantasy prop of any kind, in either hand.
BOTH HANDS ARE EMPTY and expressive — they are part of the acting now, not props to hold.`;

// ---------- the fix the owner asked for ----------
const DYNAMISM = `*** THE POSE MUST BE ALIVE. THIS IS THE MOST IMPORTANT INSTRUCTION. ***
The old pose sheets were STATIC: standing straight to camera, shoulders square, both feet flat and
planted, cape hanging dead, arms limp at the sides. That is a shop mannequin, not a character.

This drawing must have MOTION IN IT:
- a clear LINE OF ACTION — one sweeping curve running through the whole body, never a stiff vertical
- CONTRAPPOSTO: weight thrown onto ONE leg, hips and shoulders tilted against each other
- turn him to a THREE-QUARTER view, never flat-on to camera
- the CAPE and SCARF are CAUGHT MID-MOVEMENT — lifting, trailing, snapping, curling with the motion.
  They react to what he just did. A cape hanging straight down is a failed drawing.
- the hands ACT: fingers open, reaching, gesturing, spread. Never limp, never closed by default.
- catch him ON THE BEAT of an action — mid-step, mid-turn, mid-reach — never resting between beats.
It should look like a frame pulled from an animation, not a character-select screen.`;

const RENDER = `RENDER:
- Full body, head to boots, NOTHING cropped.
- Pure FLAT WHITE background. Nothing else in the frame: no floor, no shadow on the ground, no
  scenery, no props, no text, no logo, no signature, no border, no frame.
- IMPORTANT: leave a clear MARGIN of empty white all the way around him. NO part of him — not a boot,
  not the crown, not the tip of the cape — may touch or cross the edge of the image.
- Correct anatomy: two arms, two hands, FIVE clearly separated fingers on each hand, two legs.
- Portrait orientation, roughly 1024x1820.`;

const POSES = {
  hero: `POSE — "HERO". He is striding FORWARD, into the wind, mid-step.
The front boot has just landed and takes his full weight; the back leg is still trailing, heel lifted.
His torso twists, one shoulder driving ahead of the other. The cape is BLOWN OUT WIDE BEHIND HIM in a
big confident arc — it is the biggest shape in the drawing. One arm swings back with the stride, the
other sweeps forward and open. Chin up, half-smile, the visible eye bright and fixed on something ahead.
He looks like he is walking straight into his own future. Low camera angle: we look slightly UP at him.`,

  explain: `POSE — "EXPLAIN". He is mid-sentence, leaning IN toward us, caught making a point.
Weight dropped onto one leg, the other knee bent and relaxed. He is turned three-quarters, torso
rotated back toward camera. One hand is UP and OPEN, fingers spread, hanging in the air exactly where
a teacher's hand hangs when the idea is landing; the other hand is out to the side, palm turned up,
the "you see?" gesture. His head tilts. Eyebrows up, mouth open in speech. The scarf swings across his
chest from the turn and the cape falls in a diagonal fold behind. He is talking TO you, right now.`,

  invite: `POSE — "INVITE". He is STEPPING TOWARD US, reaching out to be taken by the hand.
The leading foot has come forward, the body leans after it, already committed to the move. One arm
reaches straight out to the camera — draw it in FORESHORTENING, the open hand nearest to us and
therefore LARGE, fingers spread wide in welcome. The other arm swings back for balance. The cape
trails behind him, still catching up with the step. He is looking straight at us, warm, delighted,
grinning — the whole drawing pulls the viewer forward.`,

  alert: `POSE — "ALERT". He has WHIPPED AROUND, caught by something behind him.
The turn is violent and off-balance: shoulders wrenched around ahead of his hips, one boot pivoting on
its toe, the other braced wide to catch himself. He is looking sharply BACK OVER HIS SHOULDER. One hand
flies up, fingers splayed, half a flinch and half a warning. The cape and the scarf are SNAPPED OUT
SIDEWAYS by the speed of the turn, still travelling — they trail the motion, they do not hang.
His visible eye is wide, brows up, mouth open. Startled, not scared. He is a beat inside the movement.`,
};

// ---------- args ----------
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(arg("--out", ASSETS));
const CUSTOM = arg("--custom", null);
const CUSTOM_NAME = arg("--name", "custom");
const picked = argv.filter((a) => !a.startsWith("--") && POSES[a]);
const JOBS = CUSTOM
  ? [{ name: CUSTOM_NAME, beat: `POSE — CUSTOM.\n${CUSTOM}` }]
  : (picked.length ? picked : REF_NAMES).map((n) => ({ name: n, beat: POSES[n] }));

function buildPrompt(job) {
  return [
    "Use your built-in NATIVE image-generation tool. Generate ONE character pose sheet.",
    "", IDENTITY, "", DYNAMISM, "", job.beat, "", RENDER, "",
    `Save it to the file named exactly: raw-${job.name}.png (relative to the current directory).`,
    "Reply DONE once the file exists.",
  ].join("\n");
}

function codex(job, tmp) {
  return new Promise((resolve) => {
    const refs = [];
    for (const r of REF_NAMES) refs.push("-i", path.join(ASSETS, `himel-pose-${r}.png`));
    const child = spawn("codex", [
      "exec", "-m", "gpt-5.5", "-c", 'model_reasoning_effort="high"',
      "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check",
      ...refs, "-C", tmp, "-",
    ], { cwd: tmp, env: { ...process.env, NO_COLOR: "1" }, stdio: ["pipe", "pipe", "pipe"] });
    let buf = "";
    child.stdout.on("data", (d) => (buf += d));
    child.stderr.on("data", (d) => (buf += d));
    // If `codex` is not on PATH, ChildProcess emits 'error'. With no listener, EventEmitter THROWS
    // and every retry / soft-fail path below is bypassed.
    child.on("error", (e) => { clearTimeout(t); console.log(`  cannot spawn codex: ${e.message}`); resolve(false); });
    const t = setTimeout(() => child.kill("SIGKILL"), 10 * 60 * 1000);
    child.on("close", async () => {
      clearTimeout(t);
      let ok = false;
      try { ok = (await fs.stat(path.join(tmp, `raw-${job.name}.png`))).size > 0; } catch {}
      resolve(ok);
    });
    child.stdin.end(buildPrompt(job));
  });
}

function magick(args) {
  return new Promise((res, rej) => {
    const c = spawn("magick", args, { stdio: ["ignore", "ignore", "pipe"] });
    let e = ""; c.stderr.on("data", (d) => (e += d));
    c.on("close", (code) => (code === 0 ? res() : rej(new Error(e || `magick exit ${code}`))));
  });
}

/** White field -> transparent, from the CORNERS only. Closed outlines keep his interior white. */
async function keyOut(src, dst) {
  await magick([
    src,
    "-bordercolor", "white", "-border", "1",
    "-alpha", "set", "-channel", "RGBA",
    "-fuzz", "8%", "-fill", "none", "-floodfill", "+0+0", "white",
    "-shave", "1x1",
    "-trim", "+repage",
    dst,
  ]);
}

/** A hole punched through the figure is the classic floodfill failure. Catch it before it ships. */
async function assertNotHollow(file, name) {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync("magick", [file, "-alpha", "extract", "-format", "%[fx:mean]", "info:"], { encoding: "utf8" });
  const opaque = parseFloat(r.stdout);
  // a full-body figure on a trimmed canvas covers roughly 35-75% of it. Far below that means the
  // floodfill leaked through an outline gap and ate him.
  if (!(opaque > 0.25)) throw new Error(`${name}: only ${(opaque * 100).toFixed(1)}% opaque — the key leaked THROUGH the figure`);
  return opaque;
}

async function main() {
  const tmp = await fs.mkdtemp(path.join(process.env.TMPDIR || "/tmp", "himel-"));
  await fs.mkdir(OUT, { recursive: true });
  console.log(`generating ${JOBS.length} pose(s) — 1 codex session each, all parallel`);
  console.log(`out: ${OUT}\n`);

  const results = await Promise.all(JOBS.map(async (job) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (!(await codex(job, tmp))) { console.log(`  ${job.name}: codex try ${attempt} failed`); continue; }
      const raw = path.join(tmp, `raw-${job.name}.png`);
      const out = path.join(OUT, `himel-pose-${job.name}.png`);
      try {
        await keyOut(raw, out);
        const opaque = await assertNotHollow(out, job.name);
        const { spawnSync } = await import("node:child_process");
        const dim = spawnSync("magick", [out, "-format", "%wx%h", "info:"], { encoding: "utf8" }).stdout;
        console.log(`  ${job.name}: ok  ${dim}  ${(opaque * 100).toFixed(0)}% opaque`);
        return true;
      } catch (e) {
        console.log(`  ${job.name}: try ${attempt} REJECTED — ${e.message}`);
      }
    }
    console.log(`  ${job.name}: FAILED after 3 tries`);
    return false;
  }));

  const ok = results.filter(Boolean).length;
  console.log(`\n${ok}/${JOBS.length} poses -> ${OUT}`);
  if (ok < JOBS.length) process.exit(1);
}

main().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
