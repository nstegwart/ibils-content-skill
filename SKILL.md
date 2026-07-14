---
name: ibils-carousel
description: "Generate a finished Ibils Instagram carousel (cover + content + closing) where every slide is fully rendered by the codex native image tool — text, mascot and all. Use when the user asks to create Ibils finance content / carousel / slides, to turn the latest finance news into a posting, OR to regenerate / fix / correct one or more slides of a carousel that already exists. Fetches live Indonesian finance news from valid sources, writes a sourced content plan, then generates and finalises uniform 1080x1350 slides. Four modes: news, education, marketing, insight."
---

# Ibils Carousel — full-bake content generator

Turns a topic (or the latest finance news) into a complete, posting-ready
Instagram carousel. Every slide is ONE image rendered by codex's NATIVE image
tool — headline, body, mascot and layout all baked in. Branding (the Ibils
real Ibils App Store icon) is composited afterwards for pixel-perfect consistency.

This skill uses the codex native image tool — NOT the `imagegen` skill and NOT
the OpenAI Image API. No `OPENAI_API_KEY` is needed.

## When to use

- "Bikin konten / carousel Ibils soal <topik>"
- "Jadiin berita keuangan terbaru jadi slide"
- Any request to produce Ibils finance slides in one of the four modes.
- "Regenerate / perbaiki / fix slide <N>" of a carousel that already exists —
  bad image or wrong copy. → see "Regenerate a slide" below.

## When NOT to use

- Editing one existing image → use the `imagegen` skill.
- Non-Ibils, non-finance image work.

## Inputs

- `mode` — one of: `news`, `education`, `marketing`, `insight` (default `news`).
- `topic` — optional focus phrase.
- `count` — content slides, default 6 (carousel = count + 2). Clamped 5-8: content-rules
  calls a 12-slide deck the #1 'AI-generated' tell, and the code enforces the clamp.
- `outdir` — output directory, default `./carousel-<mode>-<date>`.

## Workflow (do every step in order)

### 1. Get the source material

- **news mode** (or when the user wants live news): run
  `node scripts/news.js --topic "<topic>" --limit 8`.
  It prints a JSON array of real, recent articles (publisher, link, date).
  - If it exits non-zero (no source reachable): **STOP**. Tell the user the
    feeds are unreachable. Offer manual mode. Never fabricate news.
- **manual fallback**: if the user supplies the material directly, or asks for
  `education` / `marketing` / `insight` (which are evergreen, not news-bound),
  skip the fetch and use the user's brief as the source material.

### 2. Read the rules

Read `references/content-rules.md` in full. It is non-negotiable — especially
no hallucination and source citation. For `marketing` mode, also read
`references/ibils-app.md` — marketing copy may only use the real features
listed there, and must never draw a fabricated app screen.

### 3. Write the content plan

Produce the plan JSON described in `content-rules.md` §6: a cover, `count`
content slides, a closing. Save it as `<outdir>/plan.json`.
- Copy in natural ENGLISH (the IG account is global), following the WRITING FORMULA in
  `content-rules.md` §4 — every body adds new concrete information.
- Every factual claim traces to a fetched article; fill the `sources` array.
- Each slide gets a `brief` (verbatim copy + layout hint) and a `pose` (Himel's
  context-matched action — different on every slide).
- Vary content-slide layouts (statement / list / one-big-number / step).

### 3b. Lint the copy — mandatory gate

Run: `node ~/.codex/skills/ibils-carousel/scripts/lint-plan.js <outdir>/plan.json`

If it prints any FAIL, the copy is not good enough — rewrite the flagged
headline/body following the §4 formula, then re-run until it prints `clean`.
Address WARN lines too. Step 4 is hard-gated on this: `gen-carousel.js` runs
the linter itself and refuses to render a plan that fails. Never skip it.

### 4. Generate the slides

Run:
`node ~/.codex/skills/ibils-carousel/scripts/gen-carousel.js <outdir>/plan.json <outdir>/slides`

It renders every slide by spawning `codex exec` per slide with the four Himel
pose references ATTACHED (`-i`). This is the ONLY reliable way to lock the
mascot's identity. Do NOT generate slides with the in-session native image
tool — it cannot honour reference images and Himel drifts off-model (wrong
character, broken anatomy). `references/styles.md` documents the prompt blocks;
`gen-carousel.js` is their executable form.

### 5. Finalise

Run `node scripts/finalize.js <outdir>/slides`. This pads every slide to an
exact 1080x1350 4:5 frame (no content cropped) and composites the fixed
Ibils App Store icon into the TOP-RIGHT corner. On the closing slide it also
composites the Play Store / App Store badges along the bottom strip.

### 6. Verify before reporting

Open the finalised slides and check, slide by slide:
- all are exactly 1080x1350;
- the App Store icon sits identically in the TOP-RIGHT corner of every slide;
- Himel is the same character, in a different pose per slide;
- no codex-drawn logo and no 'Ibils' wordmark text anywhere;
- text is crisp, correctly spelled, no AI artefacts;
- no invented numbers — every figure traces to `plan.json` sources.

Report: output path, slide count, and the cited sources. Flag any slide that
fails so the user can regenerate just that one.

## Regenerate a slide of an existing carousel

Use this when the user already HAS a carousel (a folder holding `plan.json` +
`slides/`) and wants slide(s) redrawn — bad image (broken anatomy, cropped
mascot, garbled art) or wrong copy.

1. Find the carousel folder. The user names it, or it is the most recent
   `carousel-*` / `./carousels/<id>` directory. It MUST contain `plan.json`.
2. If the COPY is wrong: open `plan.json`, find the slide, fix the text inside
   its `brief` (the `HEADLINE` / `BODY` parts) to exactly what the user wants.
   Image-only problem (copy already correct) → skip this step.
3. Regenerate ONLY the affected slide(s):
   - `--slide` accepts a number (`3`), a kind (`cover` / `closing`) or a name
     (`03-statement`); comma-separate or repeat for several.
   regen re-renders just those slides; the rest of the carousel is untouched.
4. Open the regenerated slide and verify: correct anatomy (two arms/hands),
   nothing cropped, text crisp and correctly spelled, exactly 1080x1350. Still
   wrong → run step 3 again (each regen is a fresh roll).
5. Report which slide(s) changed and the folder path.

## Bundle

- `scripts/news.js` — zero-dependency live finance-news fetcher (RSS).
- `scripts/lint-plan.js` — copy-quality gate; FAILs vague / restated / teaser
  copy so it can never reach image generation.
- `scripts/gen-carousel.js` — renders every slide via `codex exec -i` (Himel
  references attached); runs the linter as a hard gate; reads `plan.json`, writes raw slides.
- `scripts/finalize.js` — normalises slides to 1080x1350 + composites the logo.
- `scripts/regen.js` — regenerate / fix a carousel; `--slide` for one slide,
- `references/content-rules.md` — the content "tata bahasa" (non-negotiable).
- `references/styles.md` — the 4 visual styles + fixed image-prompt blocks.
- `references/ibils-app.md` — the real Ibils app features + the no-fake-UI
  visual rule (source of truth for `marketing` mode).
- `assets/himel-pose-*.png` — 4 Himel identity references.
- `assets/ibils-logo-card.png` — the real Ibils App Store icon, composited top-right on
  every slide.
- `assets/store-badges.png` — Play Store + App Store badges, composited along
  the bottom of the closing slide.
- `assets/ibils-icon.svg` — the raw Ibils logo mark.

## Hard rules (never break)

1. No hallucination — no number/stat/source that is not in the fetched material.
2. Source unreachable → STOP and report; do not generate from guesses.
3. Codex never draws the logo or the 'Ibils' wordmark — it is composited.
4. Every slide is finalised to exactly 1080x1350.
5. Himel: same character every slide, pose changes every slide.
