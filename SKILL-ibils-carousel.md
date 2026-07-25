---
name: ibils-carousel
description: Bikin carousel Instagram Ibils dari skrip yang sudah ada di ibils-content-result/carousel/scripts. Render slide via codex imagegen (gpt-5.5 low) + finalize (logo, kicker, footer, gerbang mutu) + closing dari 5 template lokal. Triggers on "/ibils-carousel", "bikin carousel", "render carousel", "buat carousel ibils", "carousel dari script", atau saat owner minta satu slide contoh untuk direview. WAJIB dibaca sebelum menyentuh prompt gen-carousel.js — aturan biaya dan gaya visualnya sudah mahal dipelajari.
---

# Ibils Carousel — bikin dari skrip yang sudah ada

Repo skill: `https://github.com/nstegwart/ibils-content-skill`
Skrip sumber: `ibils-content-result/carousel/scripts/item-XXXX/plan.json` (~7.000 skrip)
Papan review: `http://localhost:5177/carousels`

## ATURAN BIAYA — baca dulu, ini yang pernah menghabiskan $20

Satu slide = satu sesi codex berbayar. Satu deck = 7 sesi (closing dirender lokal, gratis).

1. **Owner minta satu gambar → kirim `--slide N`.** Merender deck penuh untuk satu
   pertanyaan = 8x biaya yang diminta. Ini pernah dilakukan berulang kali.
2. **Tidak ada retry.** Satu percobaan per slide. Gagal ya gagal — **agent yang memanggil**
   yang memutuskan mau ulang atau tidak. Versi lama mencoba 3x per slide: 8 slide x 3 = **24
   sesi berbayar dari satu perintah**, dan saat sebabnya rate limit semuanya gagal identik.
3. **Sekring `CAROUSEL_MAX_SESSIONS` (default 8).** Kalau tersentuh berarti ada bug — cari
   sebabnya, jangan dinaikkan.
4. **Jangan `nohup ... &` dari shell yang sudah di-background.** Grup prosesnya dipanen,
   codex jadi yatim dan terus menagih. Dua sesi pernah hidup **13 jam** begitu.
5. **Selesai kerja, pastikan bersih:** `ps -eo comm | grep -c '^codex'` harus `0`.

## Perintah

```bash
SK=<clone skill>            # git clone https://github.com/nstegwart/ibils-content-skill
R=ibils-content-result/carousel/scripts

# satu gambar untuk direview  (1 sesi)
node $SK/scripts/gen-carousel.js $R/item-XXXX/plan.json /tmp/preview --slide 2

# satu deck penuh            (7 sesi)
node $SK/scripts/gen-carousel.js $R/item-XXXX/plan.json $R/item-XXXX/slides
node $SK/scripts/finalize.js $R/item-XXXX/slides

# banyak deck, berurutan, berhenti sendiri saat codex menolak
node $SK/scripts/run-queue.mjs <queue.txt> $R --conc 1
```

`finalize` menolak slide cacat dan menyebut angkanya. Slide ditolak → hapus file itu →
jalankan `gen-carousel` lagi (yang sudah ada di-skip, jadi hanya yang hilang dirender).

Setelah render, **reindex** supaya muncul di web:
```bash
curl -s -X POST http://localhost:8787/api/carousels/reindex
```

## Gaya visual — `references/styles.md` adalah SSOT

**Baca file itu sebelum mengubah prompt apa pun.** Aturan yang ditulis dari tebakan pernah
bertentangan dengan spec sendiri dan merusak seluruh gaya deck.

Deck global memakai `STYLE_GLOBAL_GREEN`: latar hijau `#0E3B33`, tipografi cream `#FBF6E9`,
aksen amber `#F2A93B`, condensed display, typography-first.

Angka acuan (diukur dari deck yang benar, mis. `item-15794`):

| yang diukur | cara ukur | nilai referensi |
|---|---|---|
| isi tipografi | tinta di `936x700+72+160`, ambang 60% | 28.8–39.6% |
| tekstur latar | stddev petak 90x90 **tersepi** dari beberapa titik | 2.9–3.1 |
| keterbacaan headline | piksel terang di `820x330+72+180` | > 14% |

**Ambil petak tersepi, jangan titik tetap.** Titik tetap jatuh di atas ilustrasi dan
menghasilkan angka palsu — kesalahan ini terjadi lima kali dalam satu sesi.

## JANGAN TAMBAHKAN LARANGAN KE PROMPT

Pelajaran paling mahal di sini. `buildPrompt` pernah disisipi satu paragraf **164 kata**
larangan (larangan yang sama diulang delapan cara) menggantikan ~20 kata. Hasil terukur pada
skrip, gaya, dan model yang sama:

```
isi tipografi   33.3%  ->  11.7%
tekstur latar     3.0  ->   0.0
ilustrasi      detail  ->  coretan abstrak
```

**Panjang bukan penekanan — itu pengenceran.** Tiap kalimat memakan perhatian model di
setiap slide selamanya. Cacat yang sudah dijaga gerbang `finalize.js` **tidak butuh** kalimat
kembar di prompt. Kalau sesuatu harus ditambahkan, sesuatu yang lain harus keluar.

## Jebakan yang sudah terbukti

- **Rute model penting.** Lewat proxy 9router (`cx/gpt-5.5`) ilustrasi jadi coretan abstrak
  dan tekstur 0.0; `gpt-5.5` langsung → ilustrasi detail, tekstur 9.9. Kalau mutu turun
  tanpa sebab jelas, **periksa siapa yang melayani model** sebelum menulis ulang prompt.
- **`gpt-5.3-codex-spark` DILARANG** (owner): kuotanya habis jauh sebelum kuota akun, lalu
  errornya terbaca seperti "produksi terblokir" padahal cukup ganti model.
- **Kalau lewat 9router:** model wajib berawalan `cx/` dan `ROUTER9_API_KEY` harus ada di
  environment proses. Tanpa itu errornya `404 No active credentials` — **terbaca persis
  seperti kuota habis padahal bukan**.
- **Jangan jalankan dua runner.** Ada kunci PID; dua runner pada deck yang sama saling
  menghapus hasil, dan jumlah "selesai" naik-turun seperti kemajuan.

## Kalau gagal

Laporkan apa adanya: slide mana, pesan gerbangnya, angkanya. Jangan naikkan batas, jangan
tambah ronde, jangan ganti model diam-diam. Owner yang memutuskan apakah deck itu layak
dibiayai lagi.
