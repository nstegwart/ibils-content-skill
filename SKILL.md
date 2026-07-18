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

### 2. Read the rules (order is mandatory)

1. **`references/kode-etik-script.md` first (Gate #0)** — silent ethics.
2. **`references/surfaces.md`** — surface → language → handle → **logo** (ID vs global).
3. **`references/RULE-SCRIPT.md`** — **SSOT hard law nulis** (cover sebut APA / product, triple gate, gold **5401–5407** + YouTube friend **5601–5622**). **No draft without this.**
4. **Surface split:**
   - **`carousel-id` (Indo):** `references/writing-research-id.md` + lo/gue + Rp/OJK. Gold **5401–5407**, **5601–5622**.
   - **`carousel-global` (EN global):** **`references/writing-global-en.md`** — **EXPERIENCE position** always (lived scene + wrong belief), friend retell, **not US-only**. Gold bar **5702 · 5703 · 5704 · 5708** (full pilot 5701–5710).
5. `references/content-rules.md` in full — no hallucination, Law 1–7.
6. `references/knowledge-bar.md` — real knowledge (named fact + mechanism); tips kosong = fail.
7. `references/voice-no-slop.md` + `id-collocation-ban.json` — anti AI-slop + kolokasi (incl. **WAKTU BERKURANG**).
8. Gold bar (imitate spirit): ID `5101–5120` + **`5401–5407`** + **`5601–5622`**; EN **`5701–5710`** (prefer over legacy 5201 for voice).
9. `references/diversity-matrix.md` — multi-angle + urgensi orang umum / global household.
10. For `marketing` / app soft-tie: `references/ibils-app.md` — real features only; never fake UI.
11. **`references/styles.md`** — global IG visual = **solid deep green typography** (`marketing` / `global-green`).

### 3. Write the content plan

Produce the plan JSON described in `content-rules.md` §6: a cover, `count`
content slides, a closing. Save it as `<outdir>/plan.json`.

**Surface (hard):**
- Indo → `surface: "carousel-id"`, Bahasa lo/gue, **no footer handle**.
- Global → `surface: "carousel-global"`, **global English** (UK/EU/AU/SG-friendly — not America-default), handle `@ibils.global` via gen LANG=en.

**Voice (both):** friend retelling a money podcast — product + wrong belief + mechanism.  
Every body adds **new** concrete information (content-rules §4). No AI staccato closings.

**Pose pattern for GLOBAL green style (default ship path):**
- Cover + content: prefer `pose: "none"` (typography-only deep green).
- Closing: no Himel. Use the hardened two-column plate: headline left, phone
  composite right, centred store badges below.

- Every factual claim traces to a fetched article; fill the `sources` array.
- Each slide gets a `brief` (verbatim copy + layout hint) and a `pose`.
- Vary content-slide layouts (statement / list / one-big-number / step) without template farms.

### 3b. Lint the copy — mandatory triple gate

```
node <skill>/scripts/lint-plan.js    <outdir>/plan.json   # receipts / figures / deferral
node <skill>/scripts/lint-voice.js   <outdir>/plan.json   # anti AI-slop + cover product + kolokasi
node <skill>/scripts/lint-quality.js <outdir>/plan.json --min-score 5  # named density / body / cover nerve
```

All must print `clean`. If any FAILs, rewrite against **`RULE-SCRIPT.md`** + `voice-no-slop.md` +
content-rules Law 1/7, then re-run. Never skip. Script-only factory hard-gates on **all three**.

Human ethics self-check (Law 7) is not fully machine-checkable — still required
before ship (gunting tumpul / false thrift / sunk-cost virtue).

### 4. Generate the slides

```bash
# Indo
CAROUSEL_LANG=id node scripts/gen-carousel.js <outdir>/plan.json <outdir>/slides

# Global EN (forces deep-green typography style + @ibils.global handle)
CAROUSEL_LANG=en node scripts/gen-carousel.js <outdir>/plan.json <outdir>/slides
```

`gen-carousel.js` resolves visual style from **surface / CAROUSEL_LANG**:
- **global / en → solid deep green `#0E3B33` typography style** (owner 2026-07-16).
- ID modes keep news/education/insight blocks unless overridden with `CAROUSEL_STYLE=global-green`.

It spawns `codex exec` per slide; Himel refs attached (`-i`) only when pose is not
`none` / `no-himel`. Do NOT use in-session native image for multi-slide decks.
`references/styles.md` documents the prompt blocks; `gen-carousel.js` is executable.

### 5. Finalise

```bash
# Default logo = deep green global mark (ibils-logo-card.png)
node scripts/finalize.js <outdir>/slides

# Optional: teal ID backup
CAROUSEL_LOGO=teal node scripts/finalize.js <outdir>/slides

# Optional: stamp logo even if NE corner is busy (owner: logo dibiarkan)
FORCE_LOGO=1 node scripts/finalize.js <outdir>/slides
```

Cover-crops every slide to exact 1080x1350 and composites the logo TOP-RIGHT
(non-closing). Never pad a 2:3 native render: padding creates solid side rails
and shrinks the poster. The generation prompt reserves 12% top/bottom bleed so
the crop is safe.

**Global logo geometry is exact:** composite only the `128x128` logo card at
ImageMagick northeast offset `+46+46` (pixel bounds `x=906..1033`,
`y=46..173` on a 1080x1350 slide). Keep the generated background full-bleed
behind it. Never erase, recolour, or paint a larger corner rectangle before
stamping the logo; that creates the rejected 200x230 panel.
Closing: hardened two-column plate, phone splash on the right, centred store
badges, and no Himel.

### 6. Verify before reporting

Open the finalised slides and check, slide by slide:
- all are exactly 1080x1350;
- inspect the final PNG itself; the App Store icon is exactly 128x128 at
  `x=906..1033`, `y=46..173`, with no larger plate, rail, or recoloured area;
- Himel is the same character, in a different pose per slide;
- no codex-drawn logo and no 'Ibils' wordmark text anywhere;
- text is crisp, correctly spelled, no AI artefacts;
- no invented numbers — every figure traces to `plan.json` sources.

If the user reviews through a mutable local/media URL, verify that exact served
response too. Carousel PNG routes must use `Cache-Control: no-store` (or a new
content-versioned URL), because files are regenerated in place. Compare the
served PNG SHA-256 with the final file SHA-256. A correct disk PNG plus a stale
browser render is not accepted as fixed.

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
   nothing cropped, text crisp and correctly spelled, exactly 1080x1350. For a
   global slide, also enforce the exact 128x128 logo bounds and full-bleed
   background above. If it is viewed through a media URL, bypass/disable cache
   and confirm the served hash matches the file. Still wrong → run step 3 again
   (each regen is a fresh roll).
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
6. **RULE SCRIPT dulu** (`RULE-SCRIPT.md`) + research cara nulis — no draft from banlist alone.
7. **Kode etik silent** + **triple lint** — lint hijau ≠ lolos ear owner; gold bar ID = **5401–5407** + **5601–5622**; EN global = **5701–5710**.
8. **Global EN** = `writing-global-en.md` — friend retell, not US-only; visual = deep green typography.
9. **Logo** = deep green global mark on carousels (`surfaces.md`); closing headline left + phone right.
10. **Mutable PNG URLs never use a positive browser TTL** — serve `no-store` or
    use content-versioned URLs, then compare served and disk hashes during QA.
