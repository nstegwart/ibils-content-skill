# Content Rules — Ibils Carousel (non-negotiable)

These rules govern the WORDS on every slide. They are absolute. A carousel that
breaks any rule below is rejected.

The carousel ships in ENGLISH — the account is global. Every headline, body,
kicker and CTA is written in English.

## 1. No hallucination

- Every number, percentage, currency amount, statistic, date, or named fact
  MUST come from a fetched news item or from material the user explicitly
  supplied.
- If the copy has no sourced number, the slide carries no number. Never invent
  one to "look complete".
- NUMBER CONSISTENCY — every figure across the whole carousel (cover,
  headlines, bodies) must be the SAME real figure from the source. Never put a
  rounded or approximate number in the hook that a later slide then
  contradicts (BROKEN: cover "DOLLAR HITS RP17,500" but body "Rp17,726"). Use
  the exact sourced figure everywhere; if it is awkward in the hook, the hook
  carries NO number.
- The `topic` is only an angle — if it contains a number, IGNORE that number
  and use the real figure from the fetched news instead.
- Never invent a source, a publisher, a survey, or a quote.
- Spell every institution, agency, brand, and person name FULLY and correctly —
  "the Ministry of Finance (Kemenkeu)" (never a clipped "Kemenke"), "Bank
  Indonesia" or "BI", "OJK" (the financial regulator), the publisher exactly as
  the source writes it. Name a source in the form the source itself uses; if you
  add an English gloss, use the SAME gloss for the rest of the deck. A truncated
  or misspelled name reads as careless and AI-generated.
- If a referenced source (RSS feed, link) cannot be fetched: STOP. Report it.
  Offer manual mode. Do not generate from guesses.

## 2. Cite sources

- Every `news`-mode carousel built from live news MUST list its real sources
  (title + link + publisher) in the plan's `sources` array.
- The cover/closing may stay source-free, but any factual claim on a content
  slide must trace to a listed source.

## 3. Categories (`mode`)

Four modes. Each has a fixed identity and its own visual style (see styles.md).

| mode | purpose | tone |
|------|---------|------|
| `news` | latest finance news → impact on the reader's wallet | urgent, credible |
| `education` | budgeting / money concepts | calm, teaching |
| `marketing` | the Ibils app's real features & user benefits | confident, product-forward |
| `insight` | analysis of money habits & patterns | reflective, calm |

Each mode has a FIXED kicker / section label — use it verbatim in the plan's
`kicker` field, written exactly in this mixed case (not all-caps):

| mode | kicker |
|------|--------|
| `news` | `Ibils News` |
| `education` | `Ibils Education` |
| `marketing` | `Ibils App` |
| `insight` | `Ibils Insight` |

### Who reads this — the audience (applies to EVERY mode)

IBILS readers are YOUNG: Gen-Z & millennial, ~17-32 — fresh grad, first-jobber,
student, freelancer / gig worker, on minimum wage or a first paycheck. They RENT
or live with their parents; they do NOT own a house. Their money goes to: eating
out and going out, coffee, ride-hailing, app subscriptions (Spotify/Netflix),
paylater (BNPL) and online loans, phone/gadget instalments, running out of money
before payday, FOMO / doom spending, a side hustle, an emergency fund, a bit of
capital for a small business.

Every carousel — whatever the topic — must land in THAT life. When the source
news is a price or a policy, bend the angle to a young renter's wallet, never a
homeowner's or a parent's.
- WRONG: "sugar prices are up → the family kitchen budget".
  RIGHT: "prices are up → your coffee, your takeout, your subscriptions".
- A topic that only matters to homeowners (mortgages, buying a house),
  pensioners, the sick/elderly (medical bills, hospitals), parents with
  school-age kids, or one city's commuters is OFF-TARGET — re-angle it to the
  young audience or drop it.

### `marketing` mode — extra rules

- Copy may ONLY describe real Ibils features. Read `references/ibils-app.md` and
  use that list — never invent a feature, screen, metric, or capability.
- EMAIL FORWARDING IS NOT SHIPPED. The app logs a receipt forwarded on
  WhatsApp — WhatsApp messages ONLY. Never write, imply, or illustrate email
  forwarding, an inbox, or "forward your bank email".
- Focus on the feature AND the benefit it gives the user.
- VISUAL: there are no app screenshots. NEVER show a phone with a fabricated
  app screen (fake dashboard / charts / buttons). A phone may appear only
  showing the Ibils splash (green + iB logo + "Ibils"), exactly like the
  closing. Prefer illustrating the user's benefit or Himel doing the real
  action over drawing a phone at all. (See `ibils-app.md` "Visual rule".)

### `education` mode — extra rules

Education must genuinely TEACH a money concept with real reasoning — never a
list of petty one-off budget items.

- Each education carousel teaches ONE substantive concept and the WHY behind
  it: the emergency fund (how many months of expenses, and why that many),
  compound interest, lifestyle creep, needs vs wants, a sinking fund, the
  50/30/20 rule, "pay yourself first", opportunity cost, good debt vs bad debt.
- Anchor the lesson in the IDEA of a well-known personal-finance book, named
  plainly: *"'Die With Zero' (Bill Perkins): ..."*, *"'The Psychology of Money'
  (Morgan Housel): ..."*, *"'The Richest Man in Babylon': pay yourself first —
  10% off the top."*, *"'Your Money or Your Life': price things in hours of your
  life, not money."* Use the book's REAL, widely-known thesis in plain English —
  never invent a quote, page number, or statistic.
- Every content slide explains the mechanism, then gives a concrete way to
  apply it — a number, a rule, or a model the reader runs on their own money.

### `insight` mode — extra rules

Insight tackles a BIG socioeconomic money issue — never a petty daily habit.

- Pick a weighty topic that genuinely adds perspective: the middle income
  trap, whether the middle class is real or being squeezed, why raises keep
  losing to the cost of living, intergenerational poverty traps, the sandwich
  generation, why climbing an economic class keeps getting harder.
- Explain the REAL, well-established concept accurately in plain English — name
  the real framework ("middle income trap" is a World Bank term; "lifestyle
  inflation"; "real wages"). Make the reader understand a force bigger than
  their own wallet, then bring it back to what they CAN control.
- Still end with something the reader can act on, plus the Ibils tie.

### Research grounding & honesty (education + insight)

- Ground every lesson in REAL, widely-accepted concepts and frameworks. You
  may name real books and real economic terms.
- NEVER fabricate a study, a journal citation, a survey, or a specific
  statistic. Do not write "research shows 68% of people...". If a precise
  figure is not genuinely well-known, explain the MECHANISM without a fake
  number.
- A topic about a cost or a problem is worthless without real detail — if the
  carousel cannot give a concrete, real cost breakdown, pick a bigger topic
  (e.g. "saving up to replace a lost land certificate" with no real figures is
  rejected).
- Always prefer topics with broad, significant impact over niche one-off
  chores.

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
- KEEP IT TIGHT — 7-9 slides total (N = 5-7 content). Real human carousels are
  short. Every slide must earn its place and move the argument FORWARD; if two
  slides make the same point, cut one. A long deck that circles one narrow
  point is the #1 "AI-generated" tell — never pad to fill slides.
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
  slide to slide and fit the slide's meaning.
  - EXPRESSION RULE: every `pose` MUST state Himel's facial expression, and it
    must match the slide's mood — "anxious, wary expression" on a warning,
    "firm expression" on a correction, "serious, grim expression" on a hard or
    dark truth (debt, panic, money running out), a smile ONLY on a genuinely
    positive slide. Never leave the expression unstated; never write a smiling
    Himel on a slide about debt, panic, or loss.
  - PROP RULE: if the pose has Himel hold a document, receipt, bill, list,
    card, phone or chart, write the pose as him PRESENTING it to the viewer
    ("holding it up / showing it, facing the camera"). Never write a reading
    pose — "reading it / looking down at it" — that turns the prop's content
    away from the audience.
</content>
</invoke>
