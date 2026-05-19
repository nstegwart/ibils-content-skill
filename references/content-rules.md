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

### `education` mode — extra rules

Education must genuinely TEACH a money concept with real reasoning — never a
list of petty one-off budget items.

- Each education carousel teaches ONE substantive concept and the WHY behind
  it: dana darurat (berapa kali pengeluaran & alasannya), bunga majemuk,
  inflasi gaya hidup (lifestyle creep), kebutuhan vs keinginan, sinking fund,
  aturan 50/30/20, "bayar dirimu duluan", biaya peluang, utang baik vs buruk.
- Anchor the lesson in the IDEA of a well-known personal-finance book, named
  plainly: *"Buku 'Die With Zero' (Bill Perkins): ..."*, *"'The Psychology of
  Money' (Morgan Housel): ..."*, *"'The Richest Man in Babylon': bayar dirimu
  dulu 10%..."*, *"'Your Money or Your Life': hitung harga barang dalam jam
  kerja."* Use the book's REAL, widely-known thesis in plain Indonesian — never
  invent a quote, page number, or statistic.
- Every content slide explains the mechanism, then gives a concrete way to
  apply it — a number, a rule, or a model the reader runs on their own money.

## 4. Copy conventions ("tata bahasa") — CONCRETE, NEVER VAGUE

### Every carousel must be WORTH a follower's time

"Not vague" is not enough — content can be concrete and still worthless. Every
carousel must first clear this bar; one that fails it is rejected:

- **Relatable** — it speaks to a real, common money situation an ordinary
  Indonesian lives: gajian & akhir bulan, gaji pas-pasan/UMR, THR, anak kos,
  cicilan motor/HP, belanja bulanan, pinjol, BPJS, biaya nikah, nabung, dana
  darurat. The reader must feel *"ini soal uangku"*. Never a niche one-off
  ("anggaran alat tulis anak", "dana servis sepeda anak").
- **One real lesson** — it teaches ONE money idea the reader probably has not
  fully thought through and explains WHY it works. Advice everyone already
  knows ("catat pengeluaranmu", "kurangi jajan") is not a lesson.
- **Clear takeaway** — after the last slide the reader can name one specific
  thing they now understand or will do, with a number or rule attached.
- **Hook cover** — the cover states a real tension or a concrete, slightly
  counterintuitive truth that stops the scroll, not a flat label.
  - weak: "Budget pakaian kerja tahunan"
  - strong: "Gaji naik tapi saldo akhir bulan tetap nol — ini sebabnya"

Whole-plan self-test: *"Would a real person screenshot this or send it to a
friend?"* If not, the angle is too thin — choose a better one.

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
  | "Rencanakan makan dari agenda keluarga" | "Tulis menu 7 hari tiap Minggu, belanja sekali untuk daftar itu" |
- Pseudo-concrete test: a sentence can sound like an instruction yet still be
  empty. If a stranger reads ONLY the body and cannot say the exact thing to
  do, it FAILS — e.g. "Rencanakan makan dari agenda keluarga" names no real
  action. Name the action, the thing, and the when/how-much.
- No competitor brand names. No fear-mongering. No clickbait exaggeration.
- Ibils is a budgeting app — never a bank, lender, or investment product.

## 5. Carousel structure

A carousel is exactly: 1 cover + N content slides + 1 closing slide.
- Default N = 10 (12 slides total). The user may ask for fewer.
- Cover: the hook headline — a clear, concrete statement. No body paragraph.
- Content slides: one concrete point each. Vary the layout across them
  (statement, list, one-big-number, numbered step) so the deck has rhythm.
- Closing: codex draws ONLY the category-styled background + a short CTA
  headline + Himel (left). It must NOT draw a phone, a logo, "Ibils", or store
  badges. `finalize.js` then composites the real iPhone-splash (iPhone mockup +
  the real iB logo + "Ibils") and the Play Store / App Store badges into the
  reserved zones — so the logo is always the real mark, never hallucinated.
  Give the closing a `brief` (a short CTA headline) and a `pose`.

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
    { "kind": "closing", "brief": "HEADLINE: \"...\"", "pose": "..." }
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
