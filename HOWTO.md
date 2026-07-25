# Bikin carousel dari skrip yang sudah ada

Untuk agent mana pun — Claude, Codex, atau Grok. Ikuti apa adanya.

## Aturan biaya (baca dulu, ini yang paling mahal kalau dilanggar)

Satu slide = satu sesi codex berbayar. Satu deck = 7 sesi. Yang pernah membakar $20:

1. **Skrip ini TIDAK mengulang panggilan yang gagal.** Satu percobaan per slide. Gagal ya
   gagal. **Kamu** yang memutuskan mau ulang atau tidak — skrip tidak bisa melihat sisa
   kuota, keadaan akun, atau apakah owner masih menginginkan pekerjaannya.
2. **Kalau owner minta satu gambar, kirim `--slide N`.** Merender deck penuh untuk satu
   pertanyaan = 8× biaya yang diminta.
3. **Ada pagar keras `CAROUSEL_MAX_SESSIONS` (default 8).** Itu sekring, bukan kebijakan.
   Kalau tersentuh, ada yang salah — jangan dinaikkan, cari sebabnya.
4. **Jangan pernah `nohup ... &` dari shell yang sendirinya sudah di-background.** Grup
   prosesnya dipanen, anak-anaknya jadi yatim, dan sesi codex terus jalan berjam-jam tanpa
   ada yang membaca hasilnya. Dua sesi pernah hidup 13 jam seperti ini.
5. **Setelah selesai, pastikan bersih:** `ps -eo comm | grep -c '^codex'` harus `0`.

## Yang perlu disiapkan sekali

```bash
export ROUTER9_API_KEY="$(grep '^ROUTER9_API_KEY' ~/.codex/config.toml | head -1 | sed 's/.*= *"//;s/"//')"
```

Codex lewat proxy 9router lokal, dan proxy itu memberi nama model dengan awalan `cx/`.
Tanpa `ROUTER9_API_KEY` di lingkungan proses: `Missing environment variable`.
Tanpa awalan `cx/`: `404 No active credentials for provider: openai` — yang **terbaca persis
seperti kuota habis padahal bukan**. Model yang benar: `cx/gpt-5.5`, effort `low`.

## Satu gambar untuk direview

```bash
node scripts/gen-carousel.js <plan.json> <outdir> --slide 2
```

Satu sesi. Lihat hasilnya sebelum melanjutkan.

## Satu deck penuh

```bash
node scripts/gen-carousel.js <plan.json> <dir>/slides    # 7 slide (closing dirender lokal)
node scripts/finalize.js <dir>/slides                    # logo, kicker, footer, gerbang mutu
```

`finalize` menolak slide yang cacat dan menyebutkan angkanya. Slide yang ditolak **dihapus**,
lalu jalankan `gen-carousel` lagi untuk merender ulang yang hilang saja.

## Banyak deck

```bash
node scripts/run-queue.mjs <queue.txt> <scripts-root> --conc 2
```

Antrian = satu `item-XXXX` per baris. Ada kunci PID, jadi tidak bisa jalan dobel — dua
runner pada deck yang sama saling menghapus hasil. Berhenti sendiri kalau codex menolak.
Progres ditulis ke `queue-progress.json`.

## Gaya visual

**`references/styles.md` adalah SSOT-nya. Baca sebelum menyentuh prompt apa pun.**

Pernah terjadi: aturan ditulis berdasarkan tebakan dari melihat deck lama, ternyata
bertentangan dengan spec sendiri, dan seluruh gaya deck rusak. Kalau hasilnya meleset,
bandingkan dengan deck referensi dan **ukur** — jangan menilai dari kesan.

Angka acuan yang sudah terukur pada deck yang benar:

| yang diukur | cara | nilai referensi |
|---|---|---|
| pengisian tipografi | tinta di `936x700+72+160`, ambang 60% | 28.8–39.6% |
| tekstur latar | stddev petak 90x90 **tersepi** dari beberapa titik | 2.9–3.1 |
| keterbacaan headline | piksel terang di `820x330+72+180` | > 14% |

**Ambil petak tersepi, bukan titik tetap.** Titik tetap jatuh di atas ilustrasi dan
menghasilkan angka yang salah — kesalahan ini terjadi lima kali dalam satu sesi.

## Kalau gagal

Laporkan apa adanya: slide mana, pesan gerbangnya, angkanya. Jangan menaikkan batas, jangan
menambah ronde, jangan ganti model. Owner yang memutuskan apakah deck itu layak dibiayai
lagi.
