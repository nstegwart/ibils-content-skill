# CONTENT RULES

> ## READ THIS FIRST — the banlist is NOT the doctrine
>
> Most of what follows used to be a list of forbidden words. The owner's verdict was that a banlist
> is **stale and does not solve the root cause**, and he is right. A banlist can only reject a phrase
> somebody already thought of, it never says what a GOOD slide is, and **you cannot ban your way to
> interesting.**
>
> **The root cause of copy that "reads AI" is not word choice. It is that there is no information in
> the sentence** — and a model handed an information vacuum fills it with SHAPE: rhythm, balance, a
> triplet, a payoff. Ban the triplet and the vacuum simply grows a different shape.
>
> The reference account (`reference-standard.md`) writes in plain, unremarkable prose, and not one
> sentence reads as AI — because every sentence is a **falsifiable proposition**. *"74 kg emas
> batangan disita, senilai Rp67,2 miliar"* cannot be faked. **The research IS the writing.**
>
> So the banlist is **demoted**: it stays as a cheap smoke detector, and every one of its messages now
> ends by telling you what the phrase actually means — *you have nothing to say yet; go find the fact.*
> The doctrine is the six laws below.

---

## THE SIX LAWS

**LAW 1 — THE RECEIPT LAW.** *Every slide carries at least one new, checkable, specific fact* — an
exact figure, a named thing, a date, an attributed quote, or a concrete mechanism step — **that no
earlier slide already carried.** If you cannot point at this slide's new fact, the slide does not
exist yet. Go find the fact.
`[ASSERT]` `lint-plan.js` extracts fact-tokens and fails any content slide whose token set adds
nothing. Deck-level: ≥50% of content slides must carry a figure. *(A machine can verify a number
EXISTS. It cannot verify it is TRUE — provenance stays human, plus `sources[]`, plus the critic.)*

**LAW 2 — THE GAP LAW.** A swipe is earned only by a **specific open gap**: a list in progress, a
chronology mid-stream, a teaser naming the next slide's payload, an unresolved conflict. The cover
opens the biggest gap by **showing concrete anchors and withholding exactly one thing.**
`[LINT]` A question or a listicle cover is **legal** — the reference account's covers are all
questions — *but only if the cover already put a number or a name on the table.* Deferral without an
anchor is a promise with no collateral. Mid-deck, deferral stays banned outright: **the middle is for
paying, not promising.**

**LAW 3 — THE SURPRISE LAW.** The key fact of each slide must **beat the prior of a smart reader who
has read the deck so far.** If that reader could write slide N+1 from slide N, slide N+1 is padding.
`[ASSERT]` The prediction probe (`runtime/predict-probe.mjs`, built for comedy) generalises here —
feed slides 1..N to fresh models and ask them to guess the next key fact. This is the one gate that
cannot be replaced by re-reading, because **you already know your own ending.**

**LAW 4 — THE EVIDENCE LAW.** Claims are carried by **artifacts** — a chart computed from real data, a
real screenshot, a public document, an attributed quote card, a before/after pair — and the text
*captions the artifact*. An artifact that could not exist unless the thing were real is worth ten
sentences of assertion. **Charts are rendered by our script from a data file and composited**, exactly
like the logo. The image model never draws a chart; it hallucinates numbers.

**LAW 5 — THE TWO-SPEED LAW.** A slide may be **as dense as it likes** — density was never the AI
tell; *unscannable emptiness* was. But it must read at two speeds: a **3-second path** (sub-headline +
highlighted phrases + artifact) that forms a complete claim on its own, and a full-read path.
**Scannability, not brevity, is the law.**

**LAW 6 — THE SPINE LAW.** A deck is a **chain** — chronology, case file, mechanism, biography, or
argument — never a pile. `[HUMAN]` **The swap probe:** exchange any two adjacent content slides. If
nothing breaks, there is no spine. Cut one.

**LAW 7 — THE ETHICS LAW (kode etik script).** *Right thrift, right spend — both languages.*  
**SSOT (baca dulu, sebelum draft):** `references/kode-etik-script.md` — Gate #0, checklist E1–E7.  
A script must not preach cheapness as a religion and must not romanticize spending as identity.
- **Hemat di tempat yang harus hemat** (langganan mati, sampah keranjang, minimum-payment theater).
- **Jangan hemat di tempat yang harus diganti / dibayar penuh** (alat harian tumpul, safety, bunga
  yang memanjang, denda yang numpuk).
- Owner canon: *gunting udah tumpul masih lo pakai — padahal lo pakai tiap hari. Itu murah palsu.*
- Kill **sunk-cost virtue** (udah bayar → wajib dipaksa pakai). Frequency × consequence decides.
- Voice / anti-slop after ethics: `references/voice-no-slop.md` + `lint-voice.js`.
- **Lint hijau tidak mengampuni langgar kode etik** — rewrite angle, jangan ship.

---

## WHAT WE DELETED, AND WHY

| deleted | why |
|---|---|
| *"KEEP IT TIGHT — 7-9 slides; a long deck is the #1 AI tell"* + the 5-8 code clamp | **Inverted.** The reference runs 6-14 and pads nothing. A deck is not bad for being long — it is long for being **empty**. Law 1 makes padding impossible, so a length cap is unnecessary. |
| Blanket FAIL on question / listicle covers | **Half wrong.** Their covers are all questions; two of their best decks are listicles. They work because they **show receipts before deferring.** Replaced by the cover-anchor lint. |
| *"Body = 1-3 short sentences"* | Replaced by Law 5. Sparsity was never the fix. |
| Mandatory Ibils tie on every deck | A toll booth on every deck trains the reader that every deck ends in a pitch. Product belongs in a **minority** of decks. |
| The banlist as the *definition* of quality | Demoted to a smoke detector. Kept, because it is cheap and catches the loudest garbage — but it is one tripwire of six, not the doctrine. |

---

## APPENDIX — the known low-information strings (the smoke detector)

These are not the doctrine. They are the phrases writers reach for when Law 1 is unmet.

## 4. Copy — VOICE, HOOK, and ARGUMENT

The copy must read like a sharp personal-finance creator talking straight to a
friend — NEVER like a report, a label, or a brand deck. This is the #1 thing
that makes content good. Match this voice exactly.

### 4.1 VOICE — talk, don't file a report

- Spoken, casual ENGLISH. Address the reader as **"you"**. CONTRACTIONS ALWAYS
  — "you're", "don't", "it's", "won't", "that's", "here's". An uncontracted
  sentence ("You are spending more than you earn") reads like a press release;
  write "You're spending more than you earn."
- Everyday words, plain verbs: broke, payday, rent, gone, stuck, guessing,
  scraping by. Never a corporate synonym for a normal word (utilize, purchase,
  commence, individuals).
- Short, punchy sentences. Confident and a little blunt. It is GOOD to be
  confrontational and call out the reader's bad habit directly.
- Gen-Z-ADJACENT, NEVER SLANG-STUFFED. The register is a smart friend a few
  years older — not a brand pretending to be 19. At most ONE piece of internet
  slang in an entire deck, and only where it is genuinely natural. Banned:
  "no cap", "bestie", "slay", "it's giving", "rizz", "understood the
  assignment", "main character energy", "period." Slang-stuffing is as loud an
  AI tell as corporate fluff — blunt plain English beats both.
- Honest emotional stakes are REQUIRED, not banned: real fear (broke, laid off,
  eaten alive by inflation, debt piling up), self-call-out (you're just
  guessing, victim mentality), aspiration (level up, retire without panic). The
  stakes must be TRUE — no fake or exaggerated doom — but copy must never be
  flat and emotionless.
- CAPS DISCIPLINE — headlines are set in caps; that is the deck's display
  style, not shouting. BODY COPY NEVER SHOUTS: no all-caps word inside a body
  sentence ("you NEED to stop", "cut it NOW"). The punch comes from the word
  you chose, not from the caps lock.
- A real internal-monologue quote lands hard — open a slide with one, then
  break it down: *"Of course I'm broke. I never got the head start they did."*
- Finance terms are fine when they are natural (cashflow, side hustle, compound
  interest, outstanding balance, frugal living) — but explain each in plain
  English the first time it appears.
- State claims DIRECT — no hedge words ("reportedly", "allegedly",
  "apparently", "supposedly", "arguably", "some say", "it is said", "experts
  believe", "might just", "could potentially", "may well", "is expected to",
  "analysts predict"). The rupiah fell; do not write "the rupiah reportedly
  weakened" or "BI is expected to hike rates". Cite the source name and state
  the claim straight: "Kumparan: BI is hiking rates 50 bps."
- No forced or cringe wordplay. A clever line is allowed ONLY if it lands
  instantly and a normal reader gets it. If a line is not instantly clear,
  write it plain.
- Use STANDARD, instantly-clear money terms. NEVER invent a cute label for a
  financial concept that the reader has to guess at — BROKEN: "doctor money"
  for a health/emergency fund (a real reader did not understand it). Call things
  by their normal name: "emergency fund", "grocery money", "investment pot". The
  headline and the body MUST use the SAME word for the same thing — never
  "doctor money" in the headline and "emergency fund" in the body.
- WRITE WHAT A NATIVE SPEAKER WOULD ACTUALLY SAY. Do not weld words into
  compounds no one uses — NEVER "young salary", "young money", "small salary
  life", "beginner income". A real person says "an entry-level salary", "your
  first paycheck", "you're on minimum wage", "intern pay". If a phrase would
  never come out of a real mouth, it is out: an unnatural collocation is one of
  the loudest AI tells there is.

**BANLIST — instant AI tells. A slide containing one is REJECTED.**
`scripts/lint-plan.js` fails the plan on these automatically; the codex critic
catches the rest.

1. **BALANCED-CLAUSE TRIPLETS — the single strongest tell.** Three parallel
   items in a row: *"faster, easier, and more accurate"*, *"track it, tag it,
   and forget it"*, *"budget, save, and grow"*. A human writes two, or four, or
   an uneven list. A model writes three balanced ones almost every time. Write
   TWO — or make one item deliberately uneven.
2. **MARKETING FLUFF** — unlock, seamless / seamlessly, game-changer,
   supercharge, effortlessly / effortless, revolutionary / revolutionize,
   all-in-one, best-in-class, cutting-edge, leverage, empower, "elevate your …",
   "take control of your finances", "financial freedom", "peace of mind",
   "make every rupiah count", "money made simple", "your money, your way".
3. **EMPTY PAYOFFS** — a sentence that sounds like a benefit and carries zero
   information: "feel the difference", "live better", "stay on top of things",
   "smarter money habits", "small steps", "little wins", "life-changing", "the
   things that matter". Test: delete the sentence — if nothing is lost, it was
   one of these.
4. **LLM THROAT-CLEARING** — "In today's fast-paced world", "In today's world",
   "Let's dive in", "Let's face it", "It's no secret that", "The truth is",
   "Here's the thing", "Look no further", "Say goodbye to", "Welcome to the
   future". Start on the point, not on a runway.
5. **TEASER HEADLINES** that hide the point instead of landing it — "The secret
   to …", "Here's how / Here's what …", "This is how …", "What you need to
   know", "What nobody tells you", "You won't believe", "The one thing", "Find
   out why", "Read on / Keep reading".
6. **UPPERCASE SHOUTING IN BODY COPY** — caps belong to the headline only.
7. **HEDGES** — the list in §4.1 above. A slide that hedges is a slide with no
   claim.

This is not a lookup table to route around. Anything from the same FAMILY is
rejected too: any polished weightless brand phrase, any three-beat parallel
rhythm, any opener that clears its throat before the point. When you catch
yourself reaching for one of these, it means you have nothing to say yet — go
find the concrete thing and say that instead.

### 4.2 HOOK — every headline HITS A NERVE, never labels

The cover AND every content headline must make a scrolling thumb STOP. A
headline HITS: it names an uncomfortable truth, a denial the reader lives in,
a contradiction they don't admit, or a consequence they quietly fear. It is
one of — a blunt contrarian claim, a myth it kills, a named consequence, a
scary REAL number, or a question that pokes a real fear.

- NEVER a flat descriptive label.
- NEVER a soft instruction ("Swap X for Y", "Organise Z", "Separate A") — an
  instruction belongs in the BODY; the headline lands the punch first.
- Say the thing the reader avoids saying out loud. It should sting a little,
  because it's true.

| weak — label / soft instruction (REJECTED) | strong — a hook that HITS |
|---|---|
| "Annual work-clothes budget" | "MINIMUM WAGE: BROKE FOR LIFE?" |
| "Emergency fund saving strategies" | "SAVING ALONE WON'T MAKE YOU RICH" |
| "Swap the full treat for a shared contribution" | "YOU'RE NOT GENEROUS — YOU'RE SCARED OF LOOKING CHEAP" |
| "Set your rules before the pressure comes" | "EVERY TIME THEY INVITE YOU, YOUR WALLET LOSES" |
| "The importance of tracking your money" | "YOU SAY YOU'RE FINE. YOU'RE GUESSING." |

NO FORMULA REPETITION — a deck must not reuse one scaffold. Do NOT open more
than ONE headline with the same word (e.g. "STOP", "DON'T", "WARNING", "CHECK
…"). Three "DON'T …" headlines reads as a template, not a writer. Vary the
attack across the deck: claim, myth-kill, question, named consequence, blunt
number.

PUNCH IN EVERY MODE — `insight` and `education` headlines hit just as hard as
`news`. Keep them SHORT and striking; never let one drift into a long, calm,
explainy sentence. The cover is the single sharpest line in the whole deck.

### 4.3 ARGUMENT — a carousel is ONE story, not loose facts

A carousel builds ONE argument across its slides. Each slide is a beat that
flows into the next — never isolated factoids.

- Arc: HOOK → the problem / why it hurts → WHY it happens (the mechanism —
  name the concept) → what to DO → a concrete framework or steps.
- A content slide may end on a question the NEXT slide answers
  (*"…so where should the money actually sit?"*).
- `news` arc: the shocking number → "what this does to YOUR wallet" → "what
  <jargon> actually means" (explain every term plainly: outstanding, TWP90,
  inflation) → deeper data → what the reader should check before acting.
- `education`: anchor the lesson in a named finance book's real idea (§3).

### 4.4 Every carousel must be WORTH a follow

- **Relatable** — a real, common money situation: payday and the last week of
  the month, minimum wage, renting, instalments, online loans, a bonus,
  saving, the emergency fund. The reader thinks *"this is about MY money"*.
  Never a niche one-off ("budgeting for the kids' stationery").
- **One real lesson + its WHY** — teaches something the reader has not fully
  thought through; give the mechanism and a number, not just "track your
  spending".
- **Clear takeaway** — after the last slide the reader can name one specific
  thing to do, with a number or a rule.

Whole-plan test: *"Would a real person screenshot this or send it to a
friend?"* If not, the angle is too thin — pick a better one.

### 4.5 Body copy — concrete, never vague

- Body = 1-3 short conversational sentences. It must ADD new concrete info the
  headline does not say: a real action, a number/timeframe, a named example,
  or an explained mechanism. Never restate the headline.
- Pseudo-concrete test: if a stranger reads ONLY the body and cannot say the
  exact thing to do, it FAILS.

| vague (NO) | concrete (YES) |
|---|---|
| "Start with small notes" | "The day your pay lands, move 10% into your emergency fund before you touch anything." |
| "Manage your money and feel calmer" | "Put 20% of your salary into savings before you spend a cent of it." |
| "Plan your meals around the family calendar" | "Write down 7 dinners every Sunday, then shop once for that list." |

- No hallucinated numbers (§1). No competitor brand names. No clickbait that
  the carousel does not deliver. Ibils is a budgeting app — never a bank,
  lender, or investment product.

## 5. Carousel structure

A carousel is exactly: 1 cover + N content slides + 1 closing slide.
- **LENGTH FOLLOWS THE STORY. There is no slide budget.**
  This rule used to say "KEEP IT TIGHT — 7-9 slides… a long deck is the #1 AI-generated
  tell." That was **inverted**, and it was doing real damage. @ngomonginuang — the largest
  account in this exact niche — runs **12-20 slides, median 17**, every single time. See
  `reference-standard.md` for the measurement.

  The rule confused a symptom for the cause. **An AI deck is not bad because it is long.
  It is long because it is EMPTY** — the model pads because it has nothing to say. Length
  is downstream of that. A 20-slide deck carrying 20 facts is excellent; an 8-slide deck
  carrying none is just shorter slop.

  So: **every slide must earn its place by carrying NEW INFORMATION** — a fact, a figure, a
  named thing, a mechanism, a turn. If two slides make the same point, cut one. If you have
  seventeen things worth saying, use seventeen slides. If you have four, you do not have a
  carousel yet — go find something to say.
- Cover: the sharpest hook (§4.2) — one line, no body paragraph.
- Content slides: each is one beat of the single argument (§4.3), flowing into
  the next. Vary the layout (statement, list, one-big-number, numbered step)
  so the deck has rhythm.
- The LAST content slide ties the lesson to Ibils — the app helps the reader
  actually do what the carousel taught (track the cashflow, see what's left in
  the budget, keep an eye on the instalments). Natural and soft, never a hard
  sell.
- Closing: codex draws ONLY the category-styled background + a short CTA
  headline + Himel (left). It must NOT draw a phone, a logo, "Ibils", or store
  badges. `finalize.js` then composites the real iPhone-splash (iPhone mockup +
  the real iB logo + "Ibils") and the Play Store / App Store badges into the
  reserved zones — so the logo is always the real mark, never hallucinated.
  Give the closing a `brief` (a short CTA headline) and a `pose`.
- CLOSING HEADLINE LENGTH — the closing CTA headline must be ULTRA-short: at
  most 2 words / ~14 characters, so it renders on ONE line in the top band
  (e.g. "START TODAY", "TRACK IT", "SET TARGETS"). A longer closing headline
  wraps to a second line and gets overlapped by the phone composited over the
  centre — keep it to one tight line.

## 6. Plan shape

The content plan codex writes (before image generation) is JSON:

```json
{
  "mode": "news",
  "topic": "rupiah weakens",
  "kicker": "Ibils News",
  "sources": [{ "title": "...", "link": "...", "publisher": "..." }],
  "slides": [
    { "kind": "cover",   "brief": "HEADLINE: \"...\"", "pose": "..." },
    { "kind": "content", "brief": "LAYOUT: statement. HEADLINE: \"...\". BODY: \"...\"", "pose": "..." },
    { "kind": "closing", "brief": "HEADLINE: \"...\"", "pose": "..." }
  ]
}
```

- `brief`: the exact English copy + layout hint for that slide. Spell text
  verbatim — it is set into the design letter for letter.
- `pose`: Himel's context-matched action, written in English — must differ
  slide to slide and fit the slide's meaning **when Himel is present**.
  - **Intermittent Himel** (owner): set `pose` to `none` / `no-himel` /
    `text-only` on slides without the mascot. Example pattern: cover has Himel,
    next 2 slides typography-only, then Himel again (`gen-carousel.js` skips
    Himel refs when pose is none). Closing uses no Himel: headline left and phone composite right.
  - EXPRESSION RULE: every Himel `pose` MUST state facial expression matching
    the slide's mood — "anxious, wary" on a warning, "firm" on a correction,
    "serious, grim" on debt/panic; smile ONLY on a genuinely positive slide.
  - PROP RULE: if Himel holds a document/receipt/phone, write him PRESENTING
    it to the viewer — never a reading pose that turns content away.
