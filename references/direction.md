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


---

# 4. THE MATERIAL — what Ibils actually has to say

**Decided by the owner, 2026-07-14.** This is the section the whole engine hangs on. The reference
account has a newsroom; we are a budgeting app. The gates now reject every empty draft — **that is
the gates working** — but no rule set saves an empty notebook. Receipts cannot be generated. They
have to be gathered.

Three beats, in build order.

## Beat 1 — MONEY FORENSICS of the reader's own life  *(their "Gimana Modusnya?")*

Mechanism journalism about the things our audience already pays for, every day, without knowing how
the money actually moves:

- **How paylater/BNPL really makes money off you** — merchant fee (2–4% of the basket), late-fee
  mechanics (compounding, monthly), and the limit psychology (pay on time → limit rises → a rising
  limit is designed to be spent). The numbered *modus* slide writes itself.
- **Why the strikethrough price is theatre** — artifact: our own screenshots of the same SKU across
  a week.
- **What a subscription actually costs across a year** — artifact: our computed table.
- Concert-ticket dynamic pricing. Franchise economics.

Sources: published rates, OJK filings, our own screenshots, our own arithmetic. **Legally clean,
infinitely repeatable, and nobody else in this niche is doing it for OUR audience.**

## Beat 2 — FINANCIAL TRUE CRIME, global edition  *(their post7)*

Dated, named, sourced stories of scams and collapses this age bracket already half-knows: rug pulls
with the actual on-chain mechanics, the Jouska scandal, pig-butchering chronology, collapsed fake
investments. Court records and public reporting only. **English** — this is the global surface.

The Ibils tie is organic **here and only here**: the victim never knew their own numbers, and the
payoff slide's "so what" is the one check the reader can run tonight.

## Beat 3 — THE NUMBERS NOBODY COMPUTES  *(the thing no competitor can fake)*

A deck built on **one original computation** from public data (BPS, OJK, World Bank — all cited
on-slide):

- *"What minimum wage bought in 2016 vs 2026 — item by item."*
- *"Your Rp25k daily coffee, compounded to your 35th birthday — the exact table."*
- *"Rent vs own in 6 cities — the real monthly delta."*

**LAW 4 applies in full: the chart is rendered by our script from a data file and composited, exactly
like the logo. The image model NEVER draws a chart — it invents the numbers.**

## Parked, named, not faked — Beat 4

Aggregate anonymised app data ("we looked at N thousand tracked coffee transactions…") is the
strongest artifact we could ever own, and the owner has **cleared it**. It is gated on data volume.
Every figure published this way must be **program-emitted** — never estimated, never rounded into a
nicer number.

## Cadence

**Three story/forensics decks per product deck.** Their observed ratio is stricter (7:1). 3:1 is the
aggressive edge of honest. A toll booth on every deck teaches the reader that every deck ends in a
pitch.

---

# 5. DENSITY — decided: dense, but two-speed

**Owner, 2026-07-14.** Slides may be **dense**. Density was never the AI tell — **unscannable
emptiness** was. But a dense slide is only legal if it reads at **two speeds**:

| speed | what it is | must be true |
|---|---|---|
| **3 seconds** | sub-headline + highlighted phrases + the artifact | **forms a complete claim on its own** |
| **30 seconds** | the full body | the detail, the sourcing, the mechanism |

The highlight layer is **not decoration — it is the skim path**, and it must mark the phrase carrying
the slide's NEW fact (LAW 1). If the skim path across the whole deck does not reconstruct the story,
the highlights are furniture.

**We keep the Ibils editorial system** — green/cream/amber, motivated light, real depth. We do **not**
adopt the reference account's saturated-blue infographic paint. *Steal the engine, not the paint.*
