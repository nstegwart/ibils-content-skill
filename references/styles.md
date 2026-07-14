# Visual Styles & Image Prompt Blocks — Ibils Carousel

This file is the human-readable SPEC. The executable form is
`scripts/gen-carousel.js`, which holds the same blocks as constants and renders
each slide via `codex exec` with the Himel references attached (`-i`). Generate
slides by running that script — do NOT hand-prompt the in-session native image
tool (it cannot honour reference images; Himel drifts off-model).

The prompt for one slide is assembled from the fixed blocks below + that
slide's `brief` and `pose`. Wording is verbatim and precise — that is what
keeps a carousel consistent.

Reference images attached to every slide: the four `assets/himel-pose-*.png` —
and NOTHING else. No logo asset is ever attached, on any slide, including the
closing: codex is forbidden to draw the logo, the iB mark, or a phone at all.
Both the logo and the closing-slide phone are composited afterwards by
`scripts/finalize.js` from `assets/ibils-logo-card.png` and
`assets/closing-phone.png`, so the mark is always the real one.

---

## Block A — HARD RULE (place FIRST in every prompt)

```
!!! ABSOLUTE RULE — READ FIRST !!!
Do NOT draw a logo, a logo mark, a brand badge, an app-icon badge, or write
the word 'Ibils' as a wordmark ANYWHERE on this slide. No brand
name text. No corner badge. The TOP-RIGHT corner area (roughly 280 x 280 px)
MUST stay plain, empty background — draw nothing there. The real logo is
composited into the top-right afterwards; if you draw any logo or 'Ibils' text
the slide is rejected.
```

## Block B — REFERENCE (Himel identity)

```
FOUR REFERENCE IMAGES of the mascot 'Himel' are attached, the SAME character
in four poses. Use them ONLY to lock his identity: soft side-swept hair with
bangs over one eye, a solid banded crown with five ball-tipped points and small
dot jewels along the band, a scarf, a long tunic, puffy trousers, tall cuffed
boots, a long cape — always clean BLACK-AND-WHITE manga ink, a gentle manga BOY
(not a chibi, not a fat king).
CRITICAL: do NOT copy a reference pose. Draw Himel FRESH in the pose this
slide asks for.
```

## Block C — FORMAT

```
FORMAT — vertical Instagram carousel slide, portrait 4:5, canvas EXACTLY
1080 x 1350 pixels. SAFE MARGIN: keep ALL text, the footer handle, the slide
number and the mascot's head/crown at least 9% inside every edge.
All text is set INTO the design as real typography, spelled EXACTLY, in
ENGLISH. No watermark, no signature, no extra text.
```

## Block D — NO INVENT

```
DATA HONESTY — use ONLY the exact words and figures written in this slide's
copy. Do NOT invent or add any number, percentage, price, rupiah amount,
date, statistic, ranking, or chart with made-up values. If the copy gives no
number, the slide shows no number. No fake graphs, no fake data labels.
```

## Block E — NOT AI

```
QUALITY BAR — the result MUST look like a real, professional, human-made
graphic-design poster built in Figma/Illustrator by a senior designer. NOT
AI-generated: every letter crisp and correctly spelled, real typography on a
clean baseline; sharp deliberate shapes, real grid, even margins; no smudges,
no noise, no plastic 3D sheen, no extra fingers, no random artefacts; NO empty
placeholder boxes or stray highlight bars; the headline never overlaps the
mascot or his crown; any number badges share one consistent style. Flat,
restrained, editorial — a finished design asset.
```

## Block F — BRANDING

```
BRANDING — the slide has NO drawn logo and NO 'Ibils' wordmark. Keep the
TOP-RIGHT corner empty (the real logo is composited there). Only draw the
footer: a small '@ibils.savy' handle bottom-left and the slide number
bottom-right.
```

---

## Per-category STYLE block (pick by `mode`)

### news
```
VISUAL STYLE — vintage financial NEWSPAPER / broadsheet. Aged off-white
newsprint paper, fine halftone print texture, bold condensed serif headlines,
thin column rules and hairline boxes, small dateline type. Palette: newsprint
cream, black ink, deep Ibils green (#0E3B33), amber (#F2A93B). Urgent,
editorial, credible. Himel as a clean B&W manga inset.
A red ink-stamp may appear ONLY when its symbol fits the slide's message
(downward arrow = weakening rupiah, price tag = rising prices). If nothing
relevant fits, draw no stamp — never a decorative/random stamp (no crowns).
```

### education
```
VISUAL STYLE — clean, modern STUDY-WORKSHEET design. Calm cream paper with a
faint even grid and generous margins. Headline in large confident type set
directly on the paper with ONE tidy accent (marker highlight or hand-underline).
Body in ONE crisp note card with a thin border and soft shadow. At most 2-3
small, deliberately placed doodle accents — never scattered. Pastel palette:
warm cream, deep sage green, soft amber, muted ink. Restrained and premium —
NOT a busy kids template, NO blobby speech bubbles. Himel as a clean B&W inset.
```

### marketing
```
VISUAL STYLE — bold, clean, modern FINTECH-AD poster. ONE confident solid
background (solid deep Ibils green OR solid cream — never muddy gradients). A
big crisp headline in clean bold type with strong hierarchy. ONE single accent
only — one tidy halftone-dot patch OR one starburst. Flat, disciplined, high
contrast, lots of intentional negative space. Palette: deep Ibils green, bright
amber/yellow, cream, black. Premium like a polished app campaign — NOT a noisy
comic explosion. Himel as a clean B&W inset.
NO fabricated app UI — no phone showing a fake dashboard/charts/buttons. A
phone may show ONLY the Ibils splash (green + iB logo + 'Ibils'). Prefer
illustrating the user's benefit or Himel's real action over drawing a phone.
Use only real features from references/ibils-app.md.
```

### insight
```
VISUAL STYLE — artistic RETRO MANGA, 1980s-90s manga-magazine look. Bold black
ink linework, heavy screentone halftone shading, dramatic speed lines, slightly
aged off-register print texture. Palette: deep Ibils green (#0E3B33), warm cream
(#FBF6E9), amber (#F2A93B), black ink. Himel is fully at home in the artwork.
```

---

## Per-slide prompt assembly

For each slide build the prompt in this order:

1. `Generate ONE complete, finished Instagram carousel SLIDE as a single image.`
2. Block A (HARD RULE)
3. Block B (REFERENCE)
4. the category STYLE block
5. Block F (BRANDING) + `Kicker / section label: "<plan.kicker>".`
6. Block C (FORMAT)
7. Block D (NO INVENT)
8. Block E (NOT AI)
9. `THIS SLIDE (<kind>, <n> of <total>):` + the slide `brief`
10. `HIMEL POSE for THIS slide — draw him FRESH in this pose, do NOT copy a
    reference pose: <slide.pose>.`
11. cover only: `This is a COVER — headline only, no body paragraph. Do NOT draw
    an empty text panel or placeholder card.`
12. closing only: `CLOSING — render in the category style: a short CTA headline
    at the top, Himel on the LEFT, plain styled background. Draw NO phone, NO
    logo, NO 'Ibils' wordmark, NO store badges. Leave the centre-right and the
    bottom ~190px empty — the iPhone-splash and badges are composited later.`
13. `Save it to: <NN>-<kind>.png`

## Pose discipline

Himel's pose MUST change every slide and match the slide's meaning — e.g.
explaining (open hand), thinking (hand on chin), writing in a book, holding a
coin to a jar, a calming palms-forward gesture, pointing at a chart, an
encouraging thumbs-up, a refusing palm. Never repeat the same pose twice in one
carousel. Himel stays the identical B&W manga character — only the pose changes.

## After generation — finalise

Run `node scripts/finalize.js <slides-dir>`. It pads every slide to an exact
1080x1350 4:5 frame (no crop) and composites the real Ibils App Store icon
(`assets/ibils-logo-card.png` — the teal-gradient rounded-square with the white
iB mark; a 512px source rendered at 128px) into the TOP-RIGHT corner. On the
closing slide it also composites the iPhone splash mockup
(`assets/closing-phone.png`) and the Play Store / App Store badges along the
bottom strip — guaranteed position and styling.
