# Ibils app — real features (source of truth for `marketing` content)

Ibils is a personal budgeting / money-tracking app (Indonesian market). Use
ONLY the features below for `marketing`-mode copy. Never invent a feature, a
screen, a metric, or a UI that is not listed here.

## Core

- **Catat transaksi** — record income and expenses fast.
- **Anggaran (budgeting)** — set spending budgets per category.
- **Dompet & rekening** — track multiple wallets / accounts.
- **Kategori** — organise transactions into categories.
- **Buku keuangan** — keep separate books (e.g. pribadi, usaha).
- **Statistik & rangkuman** — monthly stats and summaries of spending.
- **Impor & ekspor** — import data from Excel / CSV, export reports.
- **Catat lewat WhatsApp** — forward a receipt message on WhatsApp and it is
  logged automatically.
  ⚠️ **EMAIL FORWARDING IS NOT SHIPPED — DO NOT CLAIM IT.** (Owner, 2026-07-14.)
  The previous version of this file listed "email & WhatsApp". That was WRONG and
  it caused false claims to ship in the first carousel batch. WhatsApp ONLY.
- **Poin & rewards** — earn points for consistent tracking.
- **Premium / Premium Pro** — paid tier. Verified in the real app (iOS captures, 2026-06-14):
  **My Assets** (net-worth tracking) and **Investment Portfolio** (holdings + live prices) are
  Premium Pro tools. The app ships **17 tools** in total.

## Tools

Pengingat tagihan · Perencana utang · Target tabungan · Target keuangan ·
Pindai struk · Buat faktur · Patungan (split bill) · Pengecek langganan ·
Cek kesehatan keuangan · Konsultan AI · Kalkulator pinjaman / pajak /
investasi · Konversi mata uang.

## Benefit one-liners (the app's own showcase copy — safe to echo)

- Anggaran rapi — pengeluaran kecil lebih cepat kelihatan.
- Target jelas — target harian tetap terasa dekat.
- Wawasan tenang — Ibils bantu baca pola sebelum telat.
- Catatan ringan — transaksi harian tidak numpuk di kepala.
- Diingatkan halus — tetap konsisten tanpa terasa dikejar.

## VISUAL RULE — no hallucinated app UI

The skill has NO real app screenshots. Therefore:

- NEVER draw a phone showing a fabricated Ibils app screen — no made-up
  dashboard, no fake charts, no invented buttons, no fake numbers on a screen.
- A phone may appear in ONE form only: showing the Ibils app SPLASH — a deep
  green screen with the iB logo and the word "Ibils" — identical to the
  closing slide. Never a "feature screen".
- Prefer NOT drawing a phone at all on content slides. Instead illustrate:
  - the BENEFIT to the user (calmer, in control, money organised), or
  - Himel performing the real-world action the feature helps with, or
  - a simple symbolic object (a tidy ledger, a labelled jar, a calendar).
- At most, Himel may HOLD a phone that shows only the splash — never a phone
  whose screen displays app content.


---

## REAL APP SCREENSHOTS — you may now composite them (owner, 2026-07-14)

`assets/app-screens/{en,id}/` — real iOS captures of the shipped app, both locales:
dashboard · financial-analysis · add-transaction · budget · tools · transactions ·
bills-debt-goals · invoice-split-bill.

**This changes the visual rule.** We no longer have to avoid the app UI — we have the real thing.

- **Composite a real screenshot. NEVER draw one.** Same doctrine as the logo and the store badges:
  a real mark is composited, never hallucinated. An image model asked to draw a finance dashboard
  invents numbers, invents labels, and invents features. It has done all three.
- If a slide needs an app screen, it takes it from `assets/app-screens/`, or it does not show one.

**HONEST LIMIT — read this before treating them as evidence.** These are **empty-state store
captures** from a seeded StoreKit run (`local-account-summary.json`: 3 wallets, 6 transactions;
every balance reads $0, "No Goals Yet", "No split bill history yet"). They **prove a feature
exists** — which is what the registry needs — but they are **weak as LAW 4 evidence artifacts**,
because they show nothing happening. A screenshot of an empty screen is not a receipt.

For real evidence artifacts we need **populated** captures. Named as a gap, not faked.

## AGGREGATE DATA — cleared (owner, 2026-07-14)

The owner has cleared the use of **anonymised aggregate app data** ("we looked at N thousand tracked
coffee transactions…"). This is the one evidence artifact no media account can match. It is gated on
data volume, and every figure published this way must be program-emitted — never estimated, never
rounded into a nicer number.
