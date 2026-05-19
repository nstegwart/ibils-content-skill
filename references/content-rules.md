# Content Rules — Ibils Carousel (non-negotiable)

These rules govern the WORDS on every slide. They are absolute. A carousel that
breaks any rule below is rejected.

## 1. No hallucination

- Every number, percentage, rupiah amount, statistic, date, or named fact MUST
  come from a fetched news item or from material the user explicitly supplied.
- If the copy has no sourced number, the slide carries no number. Never invent
  one to "look complete".
- NUMBER CONSISTENCY — every figure across the whole carousel (cover,
  headlines, bodies) must be the SAME real figure from the source. Never put a
  rounded or approximate number in the hook that a later slide then
  contradicts (BROKEN: cover "DOLAR RP17.500" but body "Rp17.726"). Use the
  exact sourced figure everywhere; if it is awkward in the hook, the hook
  carries NO number.
- The `topic` is only an angle — if it contains a number, IGNORE that number
  and use the real figure from the fetched news instead.
- Never invent a source, a publisher, a survey, or a quote.
- Spell every institution, agency, brand, and person name FULLY and correctly —
  "Kementerian Keuangan" or "Kemenkeu" (never a clipped "Kemenke"), "Bank
  Indonesia" or "BI", the publisher exactly as the source writes it. A
  truncated or misspelled name reads as careless and AI-generated.
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

IBILS users are YOUNG: gen-z & milenial, ~17-32 — fresh grad, first-jobber,
mahasiswa, freelancer / pekerja gig, gaji UMR or gaji pertama. They RENT or
live with parents (anak kos / ngontrak); they do NOT own a house. Their money
is: jajan & nongkrong, kopi, makan di luar, ojol, langganan apps
(Spotify/Netflix), paylater & pinjol, cicilan HP/gadget, gaji habis sebelum
akhir bulan, FOMO / doom spending, side hustle, dana darurat, modal usaha kecil.

Every carousel — whatever the topic — must land in THAT life. When the source
news is a price or policy, bend the angle to a young renter's wallet, never a
homeowner's or a parent's.
- WRONG: "harga gula naik → budget dapur keluarga".
  RIGHT: "harga naik → jajan, kopi & langganan kamu kena".
- A topic that only matters to homeowners (KPR, beli rumah), pensioners, the
  sick/elderly (biaya obat, rumah sakit), parents with school-age kids, or one
  city's commuters (KRL / MRT / TransJakarta) is OFF-TARGET — re-angle it to
  the young audience or drop it.

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

### `insight` mode — extra rules

Insight tackles a BIG socioeconomic money issue — never a petty daily habit.

- Pick a weighty topic that genuinely adds perspective: the middle income
  trap, whether Indonesia's middle class is real or being squeezed, why raises
  keep losing to the cost of living, intergenerational poverty traps, the
  sandwich generation, why climbing an economic class keeps getting harder.
- Explain the REAL, well-established concept accurately in plain Indonesian —
  name the real framework ("middle income trap" is a World Bank term;
  "lifestyle inflation"; "upah riil"). Make the reader understand a force
  bigger than their own wallet, then bring it back to what they CAN control.
- Still end with something the reader can act on, plus the Ibils tie.

### Research grounding & honesty (education + insight)

- Ground every lesson in REAL, widely-accepted concepts and frameworks. You
  may name real books and real economic terms.
- NEVER fabricate a study, a journal citation, a survey, or a specific
  statistic. Do not write "menurut riset, 68% orang...". If a precise figure
  is not genuinely well-known, explain the MECHANISM without a fake number.
- A topic about a cost or a problem is worthless without real detail — if the
  carousel cannot give a concrete, real cost breakdown, pick a bigger topic
  (e.g. "menyiapkan dana sertifikat tanah hilang" with no real figures is
  rejected).
- Always prefer topics with broad, significant impact over niche one-off
  chores.

## 4. Copy — VOICE, HOOK, and ARGUMENT

The copy must read like a sharp Indonesian personal-finance creator talking
straight to a friend — NEVER like a report or a label. This is the #1 thing
that makes content good. Match this voice exactly.

### 4.1 VOICE — ngomong, jangan nulis laporan

- Spoken, casual Bahasa Indonesia. Address the reader as **"kamu"**. Everyday
  words: "nggak", "kalo", "doang", "banget", "puter otak", "napas nggak?".
- Short, punchy sentences. Confident and a little blunt. It is GOOD to be
  confrontational and call out the reader's bad habit directly.
- Honest emotional stakes are REQUIRED, not banned: real fear (miskin, kena
  PHK, kemakan inflasi, beban utang numpuk), self-call-out (cuma ngira-ngira,
  victim mentality), aspiration (naik level, pensiun tenang). The stakes must
  be TRUE — no fake/exaggerated doom — but copy must never be flat and
  emotionless.
- A few key words in ALL-CAPS for punch: STOP, NGGAK AKAN, LANGSUNG, FIX.
- A real internal-monologue quote lands hard — open a slide with one, then
  break it down: *"Ya wajar gue miskin, gue kan nggak punya privilege."*
- English finance terms are fine when natural (cashflow, side hustle, compound
  interest, frugal living, outstanding) — but explain each in plain Indonesian
  the first time it appears.
- State claims DIRECT — no hedge words ("disebut", "katanya", "kabarnya",
  "mungkin"). The rupiah weakened; do not write "rupiah disebut melemah".
- No forced or cringe wordplay. A clever line is allowed ONLY if it lands
  instantly and a normal reader gets it (BROKEN: "ini namanya kurs nyasar ke
  struk" — forced, unclear). If a line is not instantly clear, write it plain.
- Use STANDARD, instantly-clear Indonesian money terms. NEVER invent a casual
  label for a financial concept that the reader has to guess at — BROKEN:
  "uang dokter" for a health/emergency fund (a real reader did not understand
  it). Call things by their normal name: "dana darurat", "uang belanja",
  "dana investasi". The headline and the body MUST use the SAME word for the
  same thing — never "uang dokter" in the headline and "dana darurat" in the
  body.

### 4.2 HOOK — every headline provokes, never labels

The cover AND every content headline must make a scrolling thumb STOP. A
headline is one of: a blunt command, a warning, a myth it kills, a
scary/surprising number, or a question that hits a real fear. NEVER a flat
descriptive label.

| weak — a label (REJECTED) | strong — a hook |
|---|---|
| "Budget pakaian kerja tahunan" | "GAJI UMR: FIX BAKAL MISKIN?" |
| "Strategi menyimpan dana darurat" | "NABUNG DOANG NGGAK BIKIN KAYA" |
| "Mengatur pengeluaran bulanan" | "STOP FRUGAL LIVING" |
| "Pentingnya mencatat keuangan" | "NGAKU 'MASIH AMAN' PADAHAL CUMA NGIRA-NGIRA" |
| "Utang pinjol meningkat" | "PINJOL INDONESIA TEMBUS RP101 TRILIUN" |

Cover = the single sharpest hook, one line. Content headlines keep provoking.

### 4.3 ARGUMENT — a carousel is ONE story, not loose facts

A carousel builds ONE argument across its slides. Each slide is a beat that
flows into the next — never isolated factoids.

- Arc: HOOK → the problem / why it hurts → WHY it happens (the mechanism —
  name the concept) → what to DO → a concrete framework or steps.
- A content slide may end on a question the NEXT slide answers
  (*"...terus uangnya ditaruh di mana?"*).
- `news` arc: the shocking number → "apa artinya buat dompet kamu" → "apa itu
  <jargon>" (explain every term plainly: outstanding, TWP90, inflasi) → deeper
  data → what the reader should check before acting.
- `education`: anchor the lesson in a named finance book's real idea (§3).

### 4.4 Every carousel must be WORTH a follow

- **Relatable** — a real, common money situation: gajian & akhir bulan, gaji
  UMR, anak kos, cicilan, pinjol, THR, nabung, dana darurat. Reader feels
  *"ini soal uangku"*. Never a niche one-off ("anggaran alat tulis anak").
- **One real lesson + its WHY** — teaches something the reader has not fully
  thought through; give the mechanism and a number, not just "catat
  pengeluaranmu".
- **Clear takeaway** — after the last slide the reader can name one specific
  thing to do, with a number or rule.

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
| "Mulai dari catatan kecil" | "Pas gajian, LANGSUNG potong 10% buat dana darurat" |
| "Atur uang biar lebih tenang" | "Sisihkan 20% gaji ke tabungan sebelum dipakai apa pun" |
| "Rencanakan makan dari agenda keluarga" | "Tulis menu 7 hari tiap Minggu, belanja sekali untuk daftar itu" |

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
  actually do what the carousel taught (catat cashflow, lihat sisa anggaran,
  pantau cicilan). Natural and soft, never a hard sell.
- Closing: codex draws ONLY the category-styled background + a short CTA
  headline + Himel (left). It must NOT draw a phone, a logo, "Ibils", or store
  badges. `finalize.js` then composites the real iPhone-splash (iPhone mockup +
  the real iB logo + "Ibils") and the Play Store / App Store badges into the
  reserved zones — so the logo is always the real mark, never hallucinated.
  Give the closing a `brief` (a short CTA headline) and a `pose`.
- CLOSING HEADLINE LENGTH — the closing CTA headline must be ULTRA-short: at
  most 2 words / ~14 characters, so it renders on ONE line in the top band
  (e.g. "MULAI SEKARANG", "CEK CASHFLOW", "AYO CATAT"). A longer closing
  headline wraps to a second line and gets overlapped by the phone composited
  over the centre — keep it to one tight line.

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
