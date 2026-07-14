# Ibils Content Skills

Two skills, one repo, one shared brand core.

| skill | what it makes | language |
|---|---|---|
| **`ibils-carousel`** — `SKILL.md` | Instagram carousels. Every slide is ONE image rendered whole by codex — headline, body, mascot, layout, all baked in. | **English** (the IG account is global) |
| **`ibils-video-ad`** — `video-ad/SKILL.md` | A 30s cinematic vertical video ad. codex bakes each frame *including its typography*, grok animates it, ffmpeg cuts it to a beat grid and scores it. | **Bahasa Indonesia** (paid ads, `lo/gue`) |

They share `assets/` (the Himel refs, the App Store icon, the device mockup) and `references/`.

> ### One registry, and it has lied before
> **`references/ibils-app.md` is the ONLY source of truth for what the app actually does.**
> It once listed *email forwarding* as shipped. It is **not shipped** — only WhatsApp message
> forwarding is. A 54-agent QC pass validated against that registry and shipped the false claim
> anyway, because it checked the copy against the registry and never checked the registry against
> reality. **If a claim is load-bearing, ask the owner. Do not trust this file alone.**

---

## 1. Install

Clone once, then symlink each skill where codex looks for skills:

```bash
git clone https://github.com/nstegwart/ibils-content-skill.git
cd ibils-content-skill

mkdir -p ~/.codex/skills
ln -s "$PWD"          ~/.codex/skills/ibils-carousel
ln -s "$PWD/video-ad" ~/.codex/skills/ibils-video-ad
```

(Windows: copy the folders into `%USERPROFILE%\.codex\skills\` instead.)

## 2. Prerequisites

| | why |
|---|---|
| **`codex`, logged in** | every image is rendered by a `codex exec` session. Must be on `$PATH`. |
| **one codex account** | **that is enough.** 1 codex session = 1 image, all fired in parallel. There is no account pool, no rotation, no `CODEX_HOME` juggling — that machinery was deleted. |
| **Node 18+** | scripts are ESM (`package.json` sets `"type": "module"` — without it, Node <22 throws *"Cannot use import statement outside a module"*). |
| **ImageMagick** | `magick -version`. Used for every composite. |
| **ffmpeg + python3 (numpy, scipy)** | video-ad skill only. |
| **`grok`** | video-ad skill only (animation). |

---

## 3. Make a carousel

```bash
node scripts/run-carousel.js --mode news --topic "inflation is quietly eating your salary" \
     --out ./carousels/my-deck
```

Four **modes**:

| mode | what it does |
|---|---|
| `news` | pulls live finance news, writes a sourced deck from a real story |
| `education` | teaches one real finance idea, anchored in a named, well-known book/concept |
| `marketing` | sells Ibils. **Only claims features in `references/ibils-app.md`.** |
| `insight` | one sharp observation about money behaviour |

Flags: `--count <5-8>` content slides (default 6; the deck is `count + 2`).

The pipeline:

```
topic → (news fetch) → codex writes plan.json → LINT GATE → CRITIC GATE
      → gen-carousel.js (1 codex session per slide, ALL PARALLEL)
      → finalize.js (1080x1350 + logo + phone + badges)
```

Output lands in `--out`, and **stays there**:

```
my-deck/
  plan.json          the copy, the sources, the poses
  slides/
    01-cover.png     every slide 1080x1350
    02-...png
    NN-closing.png
```

### The gates will stop you, on purpose

`lint-plan.js` and `critic-plan.js` run **before a single image is generated**, because a beautiful
render of bad copy is a wasted hour. They hard-fail on:

- **balanced triplets** — *"faster, easier, and more accurate"*. The single loudest "written by an
  AI" tell in English, and the one no keyword list catches. Detected structurally.
- marketing fluff (`unlock`, `seamless`, `effortlessly`, `game-changer`)
- empty payoffs (`peace of mind`, `financial freedom`)
- LLM throat-clearing (*"In today's fast-paced world"*)
- hedging (`reportedly`, `experts believe`) — a slide that hedges has made no claim
- **any feature the app does not have**

The full rulebook is `references/content-rules.md`.

---

## 4. Make ONLY the Himel poses

The mascot pose sheets are a standalone product. You do not need a carousel to regenerate them.

```bash
node scripts/gen-poses.mjs                 # all 4 canonical poses -> assets/
node scripts/gen-poses.mjs hero alert      # just these two
node scripts/gen-poses.mjs --out /tmp/try  # somewhere else (leaves assets/ untouched)
node scripts/gen-poses.mjs --custom "mid-leap, punching the air" --name jump
```

The four canonical poses are `hero`, `explain`, `invite`, `alert`. Each gets its own codex session
and they all run in parallel.

**Two things this script exists to enforce:**

1. **He carries nothing.** The original 2026 reference sheets had him holding a **scepter**. It is
   retired. Both hands are empty and expressive — they are part of the acting now.
2. **The pose must be ALIVE.** The old sheets were shop mannequins: standing square to camera, feet
   planted, cape hanging dead. The prompt now demands a line of action, contrapposto, a
   three-quarter turn, and a cape caught *mid-movement*. A cape hanging straight down is a failed
   drawing.

> **Transparency, and how it can go wrong.** codex cannot emit an alpha channel, so the figure is
> drawn on flat white and the white is flood-filled away from the corners afterwards. Closed black
> outlines keep the white *inside* his tunic and boots. This is why the prompt insists on a clear
> margin: **a boot touching the frame edge connects his interior white to the background and punches
> a hole straight through him.** The script measures opacity and rejects a hollow result rather than
> shipping it.

---

## 5. Make the video ad

Read `video-ad/SKILL.md` first — it is the accumulated cost of getting this wrong, written as laws.

```bash
node video-ad/scripts/gen-plates.mjs          # 9 frames, typography BAKED IN, on a rising light arc
# → animate each plate with grok (restrained motion prompt — see LAW 3)
WORK_DIR=/path/to/work bash video-ad/scripts/build-ad.sh      # 60fps, beat-locked, no time-stretch
WORK_DIR=/path/to/work bash video-ad/scripts/build-score.sh   # one cue, dark → light
```

Music tooling: `harvest-music.mjs` (find royalty-free candidates), `find_arc.py` (score a track's
*internal* dark→light arc), `analyze_key.py` (BPM + musical key), `find_entry.py` (downbeat).

The laws in one breath: type is **baked into the frame**, never overlaid · **de-bait the plate** or
grok hallucinates text onto blank paper · a **restrained** motion prompt is what keeps the character
intact, not trimming · **never stretch time** to fill a shot — cut the clip to length · `zoompan`
**is** the judder · the light arc is **asserted in the build**, not vibed · **never stitch two
recordings** for a two-act score.

---

## 6. Fix a slide you don't like

```bash
node scripts/regen.js ./carousels/my-deck --slide 3
node scripts/regen.js ./carousels/my-deck --slide 3,closing
node scripts/regen.js ./carousels/my-deck --slide 03-statement
node scripts/regen.js ./carousels/my-deck                  # re-plan + re-render everything
```

`--slide` takes a number, a kind (`cover` / `closing`), or a full name — comma-separated for
several. Every regen is a **fresh roll**: if the anatomy came out broken or the mascot drifted
off-model, just run it again.

## 7. Rebuild the brand assets

```bash
node scripts/make-closing-phone.mjs   # the device mockup, from the REAL App Store icon
```

Built procedurally on purpose — a *generated* phone hallucinates the logo, warps the wordmark and
bends the bezel. Here the mark is lifted straight off the real 1024px app icon, so it is pixel-exact.

---

## 8. Troubleshooting

| symptom | cause |
|---|---|
| **`plan failed the copy quality gates`** | The lint/critic gates rejected the copy 3× and gave up. **This is working as designed.** Read the printed FAIL lines — they name the slide and quote the offending phrase. Usually a balanced triplet or an empty payoff. |
| **`cannot spawn codex`** | `codex` is not on `$PATH`. |
| **slide attempts fail with `codex usage limit`** | One account, and you asked for 8 images at once. The script now backs off (30s → 2m → 5m) instead of hammering. Wait it out. |
| **`Cannot use import statement outside a module`** | Node < 22 and `package.json` is missing. It ships in this repo — don't delete it. |
| **`magick: command not found`** | Install ImageMagick. |
| **broken anatomy / off-model mascot** | Re-roll that slide (§6). Each generation is an independent sample. |
| **a pose comes out hollow** | The figure touched the frame edge and the transparency key leaked through him. `gen-poses.mjs` detects this and retries by itself. |
| **finalize says a slide FAILED** | The run exits non-zero. That slide is still RAW — wrong size, no logo. Don't post the deck. |

---

## What is NOT in here any more

The codex **account pool** (rotation, rate-limit sniffing, `CODEX_HOME` provisioning), the
**burst daemon**, and all **Google Cloud Storage / Drive** upload paths have been deleted. One
account is enough, and carousels live on disk. If you find a doc referring to any of it, that doc
is stale — delete it.
