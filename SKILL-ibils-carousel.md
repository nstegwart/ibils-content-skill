---
name: ibils-carousel
description: Pipeline konten Ibils hulu-ke-hilir — (1) BIKIN SKRIP dari scraping YouTube dengan gaya bahasa & matriks topik yang sudah dikunci, (2) BIKIN CAROUSEL dari skrip itu via codex imagegen + finalize + closing template. Triggers on "/ibils-carousel", "bikin script carousel", "scraping script", "bikin carousel", "render carousel", "buat carousel ibils", atau saat owner minta satu slide contoh untuk direview. WAJIB dibaca sebelum menyentuh prompt gen-carousel.js atau menulis skrip baru — aturan biaya, gaya bahasa, dan gaya visualnya sudah mahal dipelajari.
---

# Ibils Carousel — dari skrip sampai gambar

Dua pekerjaan, satu pipeline:

| | perintah | keluaran |
|---|---|---|
| **1. Bikin skrip** | `script-desk/bin/factory-loop.sh` | `carousel/scripts/item-XXXX/plan.json` |
| **2. Bikin carousel** | `gen-carousel.js` + `finalize.js` | `item-XXXX/slides/*.png` |

Repo skill: `https://github.com/nstegwart/ibils-content-skill`
Papan review: `http://localhost:5177` (skrip di `/scripts`, gambar di `/carousels`)
Persediaan: ~7.000 skrip, ~490 sudah jadi carousel.

---

# BAGIAN 1 — BIKIN SKRIP

## Sumber & perintah

```bash
cd script-desk
./bin/factory-loop.sh                       # satu gelombang (default 25 skrip)
TARGET=40 ./bin/factory-loop.sh
LOOP=1 INTERVAL=300 ./bin/factory-loop.sh   # loop tiap 5 menit
```

Alurnya: scrape YouTube → draft satu rencana per video → **dedup keras** (Jaccard token
lawan semua cover yang ada) → **triple lint** (`lint-plan` + `lint-voice` + `lint-quality`)
→ gagal = **dibuang, tidak pernah masuk**. Lolos = tulis `plan.json` + import ke Postgres.

## Gaya bahasa — SSOT ada di file, jangan dikarang

Urutan baca kalau menulis atau menilai skrip:

`kode-etik-script.md` → **`RULE-SCRIPT.md` (hukum keras, menang kalau bentrok)** →
`writing-research-id.md` (ID) atau **`writing-global-en.md` (EN)** → `voice-no-slop.md`

Intinya, dan ini yang paling sering dilanggar:

- **Posisi pengalaman, bukan ceramah.** Ditulis dari dalam hidup yang sedang dijalani
  seseorang — aplikasi bank, tanggal 20, chat yang bilang "beli aja", kopi yang *terasa*
  wajib. Bukan dari buku teks atau memo kebijakan.
- **Uji satu baris:** kalau pekerja capek di Jakarta/London/Lagos tidak merasa *"itu gue"*
  di slide 2 → ganti sudutnya, bukan kata sifatnya.
- **Suara:** teman tajam di grup chat yang pegang bukti. Bukan editor berita, bukan deck
  "insight", bukan metafora pintar.
- Rumus cover: `[HAL DI HIDUPMU] + [DETAIL/ANGKA NYATA] + [YANG KAMU BILANG KE DIRI SENDIRI]?`
- Contoh emas — **tiru posisinya, jangan kloning topiknya**: `5702` `5703` `5704` `5708`
  (EN), `5401–5407` (ID anti-slop), `5601–5622` (ID retell podcast).

## Tipe topik — matriks anti-redundan

`diversity-matrix.md` adalah SSOT. Dua sumbu, wajib dideklarasikan di `topic`:

**ANGLE** (domain uang, pilih 1 primer): `delivery_fee` · `bnpl_paylater` · `bank_rails` ·
`macro_rate` · `health` · `sub_digital` · `debt_credit` · `scam` · `fomo_retail` ·
`work_wage` · `vehicle` · `household` · `housing` · `tax_salary` · `invest_risk` ·
`education` · `insurance` · `side_income` · `ticket_event` · `merchant`

**PERSPECTIVE** (siapa "saya" di deck, pilih 1 primer): `wallet_self` · `family` · `worker` ·
`homemaker` · `merchant` · `driver` · `system` · `crime`

Aturan gelombang (tiap batch ≥5 deck):

1. **Maks 2** deck berbagi angle primer yang sama.
2. **Maks 40%** memakai `wallet_self` — sisanya wajib perspektif lain.
3. **Dilarang near-clone**: topik sama + mekanisme sama + angka beda tipis.
4. Cek `factory/bin/diversity-inventory.py` dulu; kombinasi angle+perspective yang sudah ≥3
   dari 60 item terakhir → **ganti sel**.

**Uji 10 detik (owner):** *"Orang di angkot/ojol/kantor bakal ngerasa ini masalahnya minggu
ini?"* Kalau jawabannya "bagus sih tapi…" → ganti angle. Diversity bukan izin bikin konten
niche yang tidak menyentuh orang biasa.

## Kurasi SUPER BEST

Kriteria memilih skrip terbaik untuk diprioritaskan jadi carousel:

> Historical / big-event storytelling; buang tips personal generik; maks ~2 per klaster peristiwa.

Tinggi: krisis, runtuhnya bank, kebijakan yang mengubah uang orang banyak, penipuan berskala
besar — ada tanggal/nama/angka konkret, ada taruhan untuk orang biasa.
Rendah: tips generik tanpa peristiwa, penjelasan konsep tanpa aktor.

**Kunci klaster hitung sendiri dari cover (entitas + tahun), jangan percaya slug dari
worker.** Waktu 8 worker menilai 1.200 kandidat, 59% label klasternya generik atau salah —
`terra_luna_ust_2022` berisi 28 item yang tak satupun soal Terra/Luna. Kunci yang salah
membuat aturan "maks 2 per klaster" tak berarti.

**Penilaian antar-worker tidak setara.** Shard berisi sampel acak dari kumpulan yang sama
menghasilkan rata-rata 5.4 vs 34.7 — beda 6x. Kalau menilai dengan banyak worker, sisipkan
jangkar berskor tetap di tiap kontrak dan buang hasil worker yang meleset di jangkar itu.

---

# BAGIAN 2 — BIKIN CAROUSEL

## ATURAN BIAYA — baca dulu, ini yang pernah menghabiskan dua puluh dolar

Satu slide = satu sesi codex berbayar. Satu deck = 7 sesi (closing dirender lokal, gratis).

1. **Owner minta satu gambar → kirim `--slide N`.** Merender deck penuh untuk satu
   pertanyaan = 8x biaya yang diminta. Ini pernah dilakukan berulang kali.
2. **Tidak ada retry.** Satu percobaan per slide. Gagal ya gagal — **agent yang memanggil**
   yang memutuskan mau ulang atau tidak. Versi lama mencoba 3x per slide: 8 slide x 3 =
   **24 sesi berbayar dari satu perintah**, dan saat sebabnya rate limit semuanya gagal identik.
3. **Sekring `CAROUSEL_MAX_SESSIONS` (default 8).** Tersentuh = ada bug; cari sebabnya,
   jangan dinaikkan.
4. **Jangan `nohup ... &` dari shell yang sudah di-background.** Grup prosesnya dipanen,
   codex jadi yatim dan terus menagih. Dua sesi pernah hidup **13 jam** begitu.
5. **Selesai kerja:** `ps -eo comm | grep -c '^codex'` harus `0`.

## Perintah

```bash
SK=<clone skill>        # git clone https://github.com/nstegwart/ibils-content-skill
R=ibils-content-result/carousel/scripts

# satu gambar untuk direview                          (1 sesi)
node $SK/scripts/gen-carousel.js $R/item-XXXX/plan.json /tmp/preview --slide 2

# satu deck penuh                                     (7 sesi)
node $SK/scripts/gen-carousel.js $R/item-XXXX/plan.json $R/item-XXXX/slides
node $SK/scripts/finalize.js $R/item-XXXX/slides

# banyak deck, berurutan, berhenti sendiri saat codex menolak
node $SK/scripts/run-queue.mjs <queue.txt> $R --conc 1
```

`finalize` menolak slide cacat dan menyebut angkanya. Slide ditolak → hapus file itu →
jalankan `gen-carousel` lagi (yang sudah ada di-skip, jadi hanya yang hilang dirender).
`run-queue` reindex sendiri tiap deck selesai **dan** saat berhenti; kalau merender manual,
panggil sendiri:

```bash
curl -s -X POST http://localhost:8787/api/carousels/reindex
```

## Gaya visual — `references/styles.md` adalah SSOT

**Baca file itu sebelum mengubah prompt apa pun.** Aturan yang ditulis dari tebakan pernah
bertentangan dengan spec sendiri dan merusak seluruh gaya deck.

Deck global memakai `STYLE_GLOBAL_GREEN`: latar hijau `#0E3B33`, tipografi cream `#FBF6E9`,
aksen amber `#F2A93B`, condensed display, typography-first.

Angka acuan (diukur dari deck yang benar, mis. `item-15794`):

| yang diukur | cara ukur | referensi |
|---|---|---|
| isi tipografi | tinta di `936x700+72+160`, ambang 60% | 28.8–39.6% |
| tekstur latar | stddev petak 90x90 **tersepi** dari beberapa titik | 2.9–3.1 |
| keterbacaan headline | piksel terang di `820x330+72+180` | > 14% |

**Ambil petak tersepi, jangan titik tetap.** Titik tetap jatuh di atas ilustrasi dan
menghasilkan angka palsu — ini terjadi lima kali dalam satu sesi.

## JANGAN TAMBAHKAN LARANGAN KE PROMPT

Pelajaran termahal di sini. `buildPrompt` pernah disisipi satu paragraf **164 kata** larangan
(larangan sama diulang delapan cara) menggantikan ~20 kata. Terukur pada skrip, gaya, dan
model yang sama:

```
isi tipografi   33.3%  ->  11.7%
tekstur latar     3.0  ->   0.0
ilustrasi      detail  ->  coretan abstrak
```

**Panjang bukan penekanan — itu pengenceran.** Tiap kalimat memakan perhatian model di setiap
slide selamanya. Cacat yang sudah dijaga gerbang `finalize.js` **tidak butuh** kalimat kembar
di prompt. Kalau sesuatu harus ditambahkan, sesuatu yang lain harus keluar.

---

# JEBAKAN YANG SUDAH TERBUKTI

- **Rute model penting.** Lewat proxy 9router (`cx/gpt-5.5`) ilustrasi jadi coretan abstrak
  dan tekstur 0.0; `gpt-5.5` langsung → ilustrasi detail, tekstur 9.9. Kalau mutu turun tanpa
  sebab jelas, **periksa siapa yang melayani model** sebelum menulis ulang prompt.
- **`gpt-5.3-codex-spark` DILARANG** (owner): kuotanya habis jauh sebelum kuota akun, dan
  errornya terbaca seperti "produksi terblokir" padahal cukup ganti model.
- **Kalau lewat 9router:** model wajib berawalan `cx/` dan `ROUTER9_API_KEY` harus ada di
  environment proses. Tanpa itu `404 No active credentials` — **terbaca persis seperti kuota
  habis padahal bukan**.
- **Jangan jalankan dua runner.** Ada kunci PID; dua runner pada deck sama saling menghapus
  hasil, dan jumlah "selesai" naik-turun seperti kemajuan.
- **Hitung artefak, bukan wadah.** Folder `slides/` yang ada belum tentu berisi. Ambang
  "jadi" = jumlah PNG, bukan keberadaan direktori.
- **Uji alat ukur pada nilai yang sudah diketahui** sebelum mempercayainya. Dalam satu sesi:
  `pgrep -c` mengembalikan 0 padahal 47 proses hidup; `nc` bilang port mati padahal server
  jalan (bind IPv6); `astats` mengembalikan string kosong di bawah `-v error`.

# KALAU GAGAL

Laporkan apa adanya: slide mana, pesan gerbangnya, angkanya. Jangan naikkan batas, jangan
tambah ronde, jangan ganti model diam-diam. Owner yang memutuskan apakah deck itu layak
dibiayai lagi.
