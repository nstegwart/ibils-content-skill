# Ibils Carousel Skill — Panduan Pakai

Skill ini bikin konten **carousel Instagram IBILS** (keuangan, Bahasa Indonesia)
secara otomatis: tiap slide digenerate penuh sebagai gambar oleh codex, lalu
di-upload ke Google Cloud Storage.

Panduan ini ditulis biar **orang awam pun bisa jalanin** — ikuti langkahnya apa
adanya.

---

## 1. Apa yang dihasilkan

- **1 carousel = 1 konten utuh** = cover + 5–7 slide isi + closing (7–9 slide),
  semua gambar PNG 1080×1350, siap posting.
- Tiap carousel di-upload ke GCS jadi **1 folder**: `plan.json` (naskahnya) +
  `slides/` (gambarnya).
- 4 kategori (`mode`): `news` (berita keuangan), `education` (konsep duit),
  `marketing` (fitur app IBILS), `insight` (isu sosial-ekonomi besar).

## 2. Yang dibutuhkan (sekali setup)

- **codex CLI** terpasang (`which codex`).
- **Akun codex** di `~/.codex/accounts/*.json` — tiap file = 1 akun.
- **Service-account key GCS** (file JSON) — buat upload. Path-nya dipakai lewat
  env `GCS_KEY`.
- **node** v18+ dan **gsutil**.

Sekali saja, aktifkan SA buat gsutil:
```bash
gcloud auth activate-service-account --key-file=/path/ke/gcs-key.json
```

---

## 3. Bikin SATU carousel

```bash
node scripts/run-carousel.js --mode education --topic "bunga majemuk" --out ./carousel-1
```
- `--mode` : `news` | `education` | `marketing` | `insight`
- `--topic`: angle-nya (boleh dikosongin — codex pilih sendiri)
- `--out`  : folder hasil sementara

Alurnya otomatis: ambil berita (mode news) → codex tulis `plan.json` → cek
kualitas copy → generate tiap slide → rapikan ukuran + tempel logo → **upload
ke GCS** → folder lokal dihapus.

Set `GCS_KEY` dan `GCS_BUCKET` dulu:
```bash
GCS_KEY=/path/gcs-key.json GCS_BUCKET=ibils-carousel-content \
  node scripts/run-carousel.js --mode insight --out ./c1
```

## 4. BURST — produksi massal nonstop

`burst-daemon.js` = mesin yang jalan terus, bikin carousel tanpa henti.

**Nyalain:**
```bash
cd ~/ibils-burst
nohup env GCS_KEY=/path/gcs-key.json GCS_BUCKET=ibils-carousel-content \
  node ~/.codex/skills/ibils-carousel/scripts/burst-daemon.js ~/ibils-burst \
  > daemon.log 2>&1 < /dev/null & disown
```

**Matiin:**
```bash
touch ~/ibils-burst/STOP        # berhenti rapi (ga ambil batch baru)
pkill -9 -f burst-daemon.js     # matiin total sekarang juga
```

**Pantau:** `tail -f ~/ibils-burst/daemon.log`

Daemon jalan 4 batch paralel; tiap carousel ditaruh di GCS. Topik di-generate
otomatis dan dicatat di `topics-ledger.jsonl` biar **tidak ada konten dobel**.

## 5. Hasil di Google Cloud Storage

Semua carousel masuk ke bucket (default `ibils-carousel-content`):
```
gs://<bucket>/<content-id>/plan.json
gs://<bucket>/<content-id>/slides/01-cover.png ... NN-closing.png
```
Lihat di browser:
`https://console.cloud.google.com/storage/browser/<bucket>`

`content-id` contohnya `2026-05-19-bunga-majemuk-a1b2c3`.

---

## 6. ⭐ REGENERATE — perbaiki carousel yang salah

Pas cek manual, kadang ada slide yang **gambarnya rusak** atau **teksnya perlu
diperbaiki**. Begini cara benerinnya:

### Cara cepat (1 perintah)

```bash
GCS_KEY=/path/gcs-key.json \
  node ~/.codex/skills/ibils-carousel/scripts/regen.js <content-id>
```
`regen.js` otomatis: download carousel dari GCS → render ulang semua slide dari
`plan.json` → rapikan → upload lagi (menimpa yang lama).

Pakai ini kalau cuma **gambarnya** yang jelek (teksnya udah benar) — codex
gambar ulang.

### Kalau TEKS-nya yang salah (mau diperbaiki)

Teks tiap slide ada di `plan.json`, di field `brief` (`HEADLINE` dan `BODY`).
Langkahnya:

```bash
# 1. download carousel-nya
gsutil -m cp -r gs://ibils-carousel-content/<content-id> ./fix

# 2. buka & edit teksnya
#    buka file  ./fix/<content-id>/plan.json
#    cari slide yang salah, perbaiki tulisan di dalam "brief"
#    contoh:  "brief": "LAYOUT: statement. HEADLINE: \"...betulin di sini...\". BODY: \"...\""

# 3. regenerate dari folder yang udah diedit
GCS_KEY=/path/gcs-key.json \
  node ~/.codex/skills/ibils-carousel/scripts/regen.js ./fix/<content-id>
```

`regen.js` render ulang semua slide pakai teks baru di `plan.json`, lalu
timpa folder di GCS. Selesai — cek lagi di GCS browser.

> Catatan: regen me-render **seluruh** carousel ulang (gambar slide lain ikut
> baru, tapi teksnya tetap sesuai `plan.json`). Ini sengaja — biar simpel dan
> hasilnya konsisten.

---

## 7. Setelan (tuning)

Di `scripts/burst-daemon.js` (atas file):
- `BATCHES` × `SESSIONS_PER_BATCH` = jumlah carousel jalan barengan. Default
  `4 × 1 = 4`. **Jangan kegedean** — tiap carousel makan ~17 panggilan codex;
  kalau melebihi kecepatan reset quota akun, pool kehabisan dan burst macet.

Model codex (di `burst-daemon.js`, `run-carousel.js`, `gen-carousel.js`):
`-m gpt-5.5 -c model_reasoning_effort="medium"`.

Panjang carousel & kualitas copy diatur di `references/content-rules.md` dan
`references/example-carousels.md` — itu "otak" gaya tulisannya.

## 8. Daftar script

| Script | Fungsi |
|--------|--------|
| `run-carousel.js` | bikin 1 carousel utuh (plan → slide → finalize → upload) |
| `burst-daemon.js` | mesin produksi massal nonstop |
| `regen.js` | **regenerate / perbaiki** 1 carousel yang udah ada |
| `gen-carousel.js` | render slide dari `plan.json` |
| `finalize.js` | rapikan ukuran 1080×1350 + tempel logo/HP/badge |
| `lint-plan.js` | cek kualitas copy sebelum digambar |
| `gcs-upload.js` | upload 1 carousel ke GCS |
| `news.js` | ambil berita keuangan (mode news) |
| `accounts.js` | kelola pool akun codex (dipakai script lain) |

## 9. Masalah umum

- **Upload gagal / error 403** → SA belum aktif:
  `gcloud auth activate-service-account --key-file=/path/gcs-key.json`
- **Burst diam, "topic generation empty"** → akun codex lagi kena rate-limit;
  daemon auto-lanjut sendiri pas quota reset (bisa jam-an).
- **Carousel macet ga selesai** → matiin sesi nyangkut, daemon relaunch sendiri:
  `pkill -9 -f run-carousel.js; pkill -9 -f "codex exec"`
