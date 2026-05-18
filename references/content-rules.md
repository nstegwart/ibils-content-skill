# Content Rules — Ibils Carousel (non-negotiable)

These rules govern the WORDS on every slide. They are absolute. A carousel that
breaks any rule below is rejected.

## 1. No hallucination

- Every number, percentage, rupiah amount, statistic, date, or named fact MUST
  come from a fetched news item or from material the user explicitly supplied.
- If the copy has no sourced number, the slide carries no number. Never invent
  one to "look complete".
- Never invent a source, a publisher, a survey, or a quote.
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

### `marketing` mode — extra rules

- Copy may ONLY describe real Ibils features. Read `references/ibils-app.md` and
  use that list — never invent a feature, screen, metric, or capability.
- Focus on the feature AND the benefit it gives the user.
- VISUAL: there are no app screenshots. NEVER show a phone with a fabricated
  app screen (fake dashboard / charts / buttons). A phone may appear only
  showing the Ibils splash (green + iB logo + "Ibils"), exactly like the
  closing. Prefer illustrating the user's benefit or Himel doing the real
  action over drawing a phone at all. (See `ibils-app.md` "Visual rule".)

## 4. Copy conventions ("tata bahasa") — CONCRETE, NEVER VAGUE

### Writing formula — fill it, do not freestyle

For every CONTENT slide, write to this formula instead of "trying not to be
vague":

- **Headline** = one specific claim or instruction, complete on its own.
- **Body** = `[a concrete action verb OR a why]` + `[the specific thing]` +
  `[when / how much / which]`. The body must give the reader something to DO
  (catat, sisihkan, cek, pindahkan, pilih, bandingkan, hentikan…) OR explain a
  cause ("karena…", "saat…", "supaya…"). It must contain at least one of:
  a real instruction verb, a number/timeframe, or a cause/mechanism.

Self-test each slide: *"If I delete the headline, does the body still teach
something on its own?"* If no → rewrite. The linter (`scripts/lint-plan.js`)
enforces this mechanically; the formula is how you pass it on the first try.

- Language: Bahasa Indonesia, natural and conversational — not stiff, not
  machine-translated. Address the reader as "kamu".
- Every slide makes ONE specific, concrete point the reader can picture or act
  on. No abstract filler.
- BANNED — vague abstractions with no concrete content:
  - empty payoff phrases: "biar lebih tenang", "hidup lebih baik", "lebih
    bijak", "supaya teratur" — say WHAT happens, with what, when.
  - vague nouns: "catatan kecil", "langkah kecil", "hal-hal penting",
    "sistem" — name the actual thing.
  - teaser headlines that hide the point ("Ini rahasianya", "Yang perlu kamu
    tahu"). The headline STATES the point.
- Headline = a clear, complete claim or instruction — readable on its own.
  Normal case in the plan (the design sets uppercase).
- Body = 1-2 short sentences. HARD RULE: the body must add NEW concrete
  information the headline does not already say — a specific action (with what
  / when / how), a concrete example, a named item, a mechanism. The body must
  NEVER just restate or rephrase the headline. If you delete the headline, the
  body must still teach something on its own.
  - restating (NO): headline "Langganan yang lupa dipakai" + body "Langganan
    yang tak dibuka tetap menarik uangmu" — body says nothing new.
  - adding (YES): headline "Langganan yang lupa dipakai" + body "Buka daftar
    langganan di akun toko aplikasimu, berhentikan yang tak dipakai sebulan."
- Concrete vs vague — fix every line to the right column:
  | vague (NO) | concrete (YES) |
  |---|---|
  | "Mulai dari catatan kecil" | "Catat tiap pengeluaran di hari yang sama" |
  | "Atur uang biar lebih tenang" | "Sisihkan 20% gaji ke tabungan saat gajian" |
  | "Kenali uang masuk" | "Tulis semua sumber pemasukan bulananmu" |
  | "Cek sebelum belanja" | "Sebelum checkout, cek sisa anggaran kategori itu" |
- No competitor brand names. No fear-mongering. No clickbait exaggeration.
- Ibils is a budgeting app — never a bank, lender, or investment product.

## 5. Carousel structure

A carousel is exactly: 1 cover + N content slides + 1 closing slide.
- Default N = 10 (12 slides total). The user may ask for fewer.
- Cover: the hook headline — a clear, concrete statement. No body paragraph.
- Content slides: one concrete point each. Vary the layout across them
  (statement, list, one-big-number, numbered step) so the deck has rhythm.
- Closing: a FIXED pre-built brand card (`assets/closing-card.png` — Himel, a
  phone showing the real Ibils splash, the CTA). It is dropped in automatically
  and is never image-generated, so its logo can never be wrong. Still include
  it in the plan as `{ "kind": "closing" }` with empty `brief` and `pose` — the
  skill ignores them.

## 6. Plan shape

The content plan codex writes (before image generation) is JSON:

```json
{
  "mode": "news",
  "topic": "rupiah melemah",
  "kicker": "Ibils NEWS",
  "sources": [{ "title": "...", "link": "...", "publisher": "..." }],
  "slides": [
    { "kind": "cover",   "brief": "HEADLINE: \"...\"", "pose": "..." },
    { "kind": "content", "brief": "LAYOUT: statement. HEADLINE: \"...\". BODY: \"...\"", "pose": "..." },
    { "kind": "closing", "brief": "HEADLINE: \"...\". SUBTEXT: \"...\"", "pose": "..." }
  ]
}
```

- `brief`: the exact copy + layout hint for that slide. Spell text verbatim.
- `pose`: Himel's context-matched action — must differ slide to slide and fit
  the slide's meaning.
  - PROP RULE: if the pose has Himel hold a document, receipt, bill, list,
    card, phone or chart, write the pose as him PRESENTING it facing the
    viewer ("menunjukkan/mengangkat ... menghadap kamera"). Never write a
    reading pose — "membaca/memegang sambil melihat" — that turns the prop's
    content away from the audience.
