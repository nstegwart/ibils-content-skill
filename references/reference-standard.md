# THE REFERENCE STANDARD — measured, not admired

The owner's verdict on our copy law:

> *"Kebanyakan RULE 'ban' kalimat dan kata kata itu stale dan ga menyelesaikan akar masalah…
> Bukan cuma 'dangkal' ban kalimat ini itu — tapi fokus ke RESULT YANG BENER BENER BAGUS."*

He is right, and this file is the proof. He named a reference: **@ngomonginuang**, one of the largest
Indonesian personal-finance accounts. I scraped 131 real carousel slides across 8 posts (pinned posts
excluded, at his instruction) and measured them against our own shipped batch.

---

## 1. Our slide-count rule is not merely wrong. It is INVERTED.

| | @ngomonginuang | Ibils skill |
|---|---|---|
| slides per carousel | **12 – 20** (median **17**) | **hard clamp 5–8** (`run-carousel.js`) |
| what our own rules say | — | *"KEEP IT TIGHT — 7-9 slides total… padding is the **#1 'AI-generated' tell**"* |

The most successful account in this exact niche does the opposite of our rule, **every single time**.

Our rule confused a symptom for the cause. **AI decks are not bad because they are long. They are long
because they are EMPTY** — the model pads because it has nothing to say. Length is downstream. A
20-slide deck carrying 20 facts is excellent. An 8-slide deck carrying none is slop, and ours is
*shorter* slop.

## 2. The information gap, measured (OCR, preprocessed)

| per slide | @ngomonginuang | Ibils (shipped) |
|---|---|---|
| words | **62** | 15 |
| named entities | **4** | **0** |
| slides carrying a hard fact | **10/10 — 100%** | 6/12 — **50%** |

*(First OCR pass read only ~23 words/slide from them and was discarded as garbage: their body copy sits
on saturated blue with yellow highlight boxes, and tesseract was blind to it. Numbers above come from a
2x upscale + desaturate + hard threshold. Measure your instrument before you trust it.)*

**Their slides are four times denser and carry a hard fact every single time. Half of ours carry
nothing at all.**

## 3. What they actually do — and it is not a writing trick

They do **journalism**.

- A 20-slide deck is a true-crime story about a 1970s luxury-car smuggler: **real name** (Robby
  Tjahjadi), **real years** (1968–1972, sentenced 1973), **real mechanism** (abusing diplomatic
  duty-free import rules; containers of Rolls-Royces manifested as *"suku cadang traktor"*), **real
  numbers** (markup 200–300%, 10-year sentence, released after 2.5 years).
- Another investigates a **Rp2-trillion abandoned skatepark** — opening on a split image labelled
  *"Ekspektasi / Realita"*.
- A caption opens: **"Siapa yang daerahnya masih sering mati lampu? 🧐"** — then delivers a police
  investigation into coal corruption, 74 kg of seized gold bullion, Rp543 billion of evidence, and a
  simultaneous plan to export electricity to Singapore.

That last one is the whole engine in one post: **take something the reader is already feeling — the
blackout — and tell them WHY it is happening, with researched, specific, checkable facts.**

Not *"5 tips to save on electricity."*
**"Here is who took the money that would have kept your lights on."**

## 4. The root cause of "AI-coded" copy

It was never word choice.

**The sentence sounds like an AI wrote it because there is no information in it, and a model fills an
information vacuum with SHAPE** — with rhythm, with balance, with a triplet, with a payoff. Ban the
triplet and the vacuum simply grows a different shape.

Our banlist polices the *surface* of the sentence while our structural rules — *keep it tight, one idea
per slide, cap it at 8* — **mandate that the sentence contain nothing.** We built a machine that
enforces emptiness, then wrote rules forbidding the sound of emptiness.

**You cannot ban your way to interesting.**

## 5. What we must NOT copy

Their **visual** house style is a loud, dense, high-chroma Indonesian infographic: saturated blue
fields, yellow highlight slabs, page-curl corners, collage. The owner has separately demanded
*"PREMIUM KONTEN KELAS DUNIA, sekelas pemberitaan kelas dunia tapi menarik pembawaannya ala Gen-Z."*

So: **steal the engine, not the paint.**

| transferable — take it | local styling — leave it |
|---|---|
| researched, checkable facts on every slide | saturated-blue infographic look |
| length follows the story, never a rule | yellow highlight slabs everywhere |
| the highlight is a **reading aid** — mark the phrase carrying the NEW information | page-curl corners, sticker collage |
| the mascot is a **narrator with a voice**, not furniture standing in the frame | cartoon speech-bubble asides on every slide |
| the hook is a **cliffhanger about the reader's own life** | mid-carousel product slides |
| open on something already felt, then explain WHY | |

## 6. The question this all hangs on

They have a newsroom. **We are a budgeting app with no newsroom.**

So the real question is not "what rules produce good copy". It is: **what do we have that is genuinely
worth 15 swipes?** If we have nothing to say, no rule set will save us — and the current rules exist
mostly to make having nothing to say sound acceptable.

Answering that is the top of `references/direction.md`.
