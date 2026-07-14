# DIRECTION — the positive doctrine

A banlist can only reject a phrase somebody already thought of. `"Why you overspend — and how to
stop"` is on no banlist, and it shipped on a cover. This file is the thing a banlist cannot be: a
statement of what a RIGHT line and a RIGHT frame actually are.

---

## 1. THE SENTENCE

### The test, and it is the whole doctrine
**Can a reader disagree with this line?**

If nobody could argue with it, it says nothing — and saying nothing is exactly what "AI-generated"
reads as. That is the entire diagnosis. Not the vocabulary. Not the tone. The *emptiness*.

| line | can you argue with it? | |
|---|---|---|
| "Your problem isn't overspending. It's memory." | **yes** — you might think it IS overspending | a claim |
| "The receipt you saved will fade by tomorrow." | **yes** — you could say it won't | a claim |
| "Why you overspend — and how to stop" | no. it hasn't said anything yet | a **deferral** |
| "5 ways to save more this month" | no | a deferral |
| "The fix is awareness" | no — "awareness" is not a fix, it's a shrug in a suit | an **empty payoff** |
| "Effortless money, made simple" | no | fluff |

### The strongest shape we have: the REFRAME
Take the thing the reader already blames themselves for, and **contradict it**.

> *Masalah lo bukan boros, tapi ingatan.*
> (Your problem isn't overspending — it's memory.)

It works because it *argues with the reader about their own life*, and it hands them a version where
they are not the villain. That is the Ibils voice. Not "we'll help you be better." **"You were never
the problem — the paper was."**

### Rules that follow from the test
- **State the thing.** If the headline promises to tell you something later, delete it and write the
  something.
- **Every body adds NEW information** — an action, a number, or a mechanism. A body that restates its
  headline is furniture.
- **Be specific past the point of comfort.** "You overspend" is a shrug. "Forty-seven transactions"
  is a confession, and a confession is unarguable in a way a generality never is.
- **Never promise a feeling.** "Peace of mind", "financial freedom", "awareness" — these are the
  reader's to feel, not ours to sell. Describe what *happens*; the feeling is theirs.
- Enforced mechanically by `scripts/lint-plan.js` (deferral, balanced triplet, fluff, hedges, empty
  payoffs) and `scripts/critic-plan.js`.

---

## 2. THE FRAME

### The test
**Does this element carry meaning, or is it furniture?**

Delete it. If nothing is lost, it was furniture. The shipped batch is full of furniture: corner
ornaments, sparkle stars, starbursts, decorative wedges — a generic poster template wearing brand
colours.

### The palette is a doctrine, not a swatch
| | | |
|---|---|---|
| deep green `#0E3B33` | the night, the shadow, the ambient | the world |
| cream `#FBF6E9` | the light, the paper, the type | never pure white |
| amber `#F2A93B` | **ONE point of meaning per frame** | a lamp. a terminal. a glow. **never a field.** |

Amber is the thing the eye must go to. **The moment there are two, there is none.** A slide that is
11% amber has an amber *background*, and an amber background means nothing is important.

Asserted: `scripts/qc-slide.mjs` — amber ≤ 6% of the canvas, the brand three ≥ 55%, and the reserved
top-right corner must be **plain** (the real logo is composited into it; on the shipped batch it
landed on artwork on 4 of 6 slides, and nothing caught it).

### Editorial, never a template
- The image is a **staged scene with real depth**, not a figure pasted on a decorated background.
- Lighting is **motivated** — it comes from a source that exists in the frame.
- The figure and the ground share **one rendering language**: the same halftone, the same grain,
  running THROUGH both. Real contact shadows. Never a cut-out.
- **Negative space is composition, not emptiness to be filled.** The urge to fill a corner with a
  sparkle is the urge that produced the shipped batch.
- Himel **carries nothing.** The scepter is retired — and it is still visible in every slide of the
  first batch, because the refs had it and nothing checked.

---

## 3. Why both gates exist

The copy has had a gate since the beginning: lint and critic run *before a single image is
generated*, and a bad plan cannot reach the renderer. **The art had no gate at all** — the direction
lived in a document, and a document is a hope. `styles.md` said "amber = one point of meaning, never
decoration" for the entire life of this skill, while an 11%-amber cover shipped.

The light arc taught this lesson once already: **a direction becomes real on the day it becomes a
number the build asserts.** Everything above is now a number, or it is explicitly marked as a thing a
human must look at.
