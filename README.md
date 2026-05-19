# Ibils Carousel Skill — Panduan Pakai LOKAL

Skill ini bikin **carousel Instagram IBILS** (konten keuangan, Bahasa
Indonesia): tiap slide digenerate penuh sebagai gambar oleh codex.

Panduan ini buat pakai di **komputer sendiri (lokal)** — bikin dan
**regenerate** carousel tanpa server, tanpa Google Cloud Storage.

> Mau jalanin produksi massal nonstop di server? Lihat
> **[GUIDE-SETUP-SERVER.md](GUIDE-SETUP-SERVER.md)**.

---

## 1. Apa yang dihasilkan

- **1 carousel = 1 konten utuh** = cover + 5–7 slide isi + closing (7–9 slide),
  semua PNG 1080×1350, siap posting.
- Hasilnya satu folder: `plan.json` (naskah) + `slides/` (gambar).
- 4 kategori (`mode`): `news`, `education`, `marketing`, `insight`.

## 2. Setup lokal (sekali aja)

**a. codex CLI** — pastikan kepasang dan sudah login:
```bash
which codex          # harus ada
codex login          # login kalau belum
```

**b. Daftarkan akun codex ke pool.** Script ini ambil akun dari folder
`~/.codex/accounts/`. Salin login codex-mu ke situ:
```bash
mkdir -p ~/.codex/accounts
cp ~/.codex/auth.json ~/.codex/accounts/local.json
```

**c. node** v18+ : `node --version`

**d. ImageMagick** (buat rapikan gambar):
```bash
brew install imagemagick      # macOS
# Linux: sudo apt install imagemagick
```

Selesai. Ga perlu Google Cloud apa pun buat kerja lokal.

---

## 3. Bikin SATU carousel di lokal

```bash
node ~/.codex/skills/ibils-carousel/scripts/run-carousel.js \
  --mode education --topic "bunga majemuk" \
  --out ./carousels/tes1 --no-upload
```
- `--mode`   : `news` | `education` | `marketing` | `insight`
- `--topic`  : angle-nya (boleh dikosongin — codex pilih sendiri)
- `--out`    : folder hasil
- `--no-upload` : **WAJIB buat lokal** — ga upload ke GCS, folder disimpan

Hasil ada di `./carousels/tes1/` → `plan.json` + `slides/*.png`. Buka:
```bash
open ./carousels/tes1/slides/        # macOS
```

---

## 4. ⭐ REGENERATE di lokal — perbaiki carousel

Pas cek manual ada slide yang **gambarnya rusak** atau **teksnya salah**,
benerin lokal pakai `regen.js` — semua dikerjain di komputermu, ga ke GCS.

### Siapkan folder carousel-nya

Kalau carousel-nya ada di server/GCS, ambil dulu satu kali:
```bash
gsutil -m cp -r gs://ibils-carousel-content/<content-id> ./carousels/
```
Kalau hasil generate lokal (langkah 3), folder-nya udah ada.

### A. Cuma gambarnya jelek (teks udah benar)

```bash
node ~/.codex/skills/ibils-carousel/scripts/regen.js \
  ./carousels/<content-id> --no-upload
```
codex gambar ulang semua slide dari `plan.json`. Folder ke-update di tempat.

### B. Teksnya yang perlu diperbaiki

Teks tiap slide ada di **`plan.json`**, di field `brief` (bagian `HEADLINE`
dan `BODY`).

```bash
# 1. buka file naskahnya
open ./carousels/<content-id>/plan.json

# 2. cari slide yang salah, perbaiki tulisannya di dalam "brief". contoh:
#    "brief": "LAYOUT: statement. HEADLINE: \"Tulisan baru di sini\". BODY: \"...\""

# 3. regenerate lokal
node ~/.codex/skills/ibils-carousel/scripts/regen.js \
  ./carousels/<content-id> --no-upload
```

`regen.js` render ulang semua slide pakai teks baru di `plan.json`,
rapikan ukuran + logo, simpan di folder yang sama. **Tidak** menyentuh GCS.

Cek hasilnya:
```bash
open ./carousels/<content-id>/slides/
```

> Catatan: regen me-render **seluruh** carousel ulang. Slide lain ikut digambar
> ulang, tapi teksnya tetap sesuai `plan.json` — jadi yang ga kamu ubah
> hasilnya tetap mirip. Ini sengaja, biar simpel & konsisten.

### Naikkan hasil regen ke GCS (kalau memang mau)

Default lokal **tidak** upload. Kalau hasil regen mau dinaikkan ke GCS,
hilangkan `--no-upload` dan sediakan key:
```bash
GCS_KEY=/path/gcs-key.json GCS_BUCKET=ibils-carousel-content \
  node ~/.codex/skills/ibils-carousel/scripts/regen.js ./carousels/<content-id>
```

---

## 5. Daftar script

| Script | Fungsi |
|--------|--------|
| `run-carousel.js` | bikin 1 carousel utuh (`--no-upload` buat lokal) |
| `regen.js` | **regenerate / perbaiki** 1 carousel (`--no-upload` buat lokal) |
| `gen-carousel.js` | render slide dari `plan.json` |
| `finalize.js` | rapikan 1080×1350 + tempel logo/HP/badge |
| `lint-plan.js` | cek kualitas copy |
| `news.js` | ambil berita keuangan (mode news) |
| `burst-daemon.js` | produksi massal — **server**, lihat GUIDE-SETUP-SERVER.md |

## 6. Masalah umum (lokal)

- **"no usable codex account"** → folder `~/.codex/accounts/` kosong. Jalankan
  langkah 2b (`cp ~/.codex/auth.json ~/.codex/accounts/local.json`).
- **Error ImageMagick / `convert` / `magick` not found** → install ImageMagick
  (langkah 2d).
- **"You've hit your usage limit"** → akun codex lagi kena rate-limit; tunggu
  beberapa jam atau pakai akun lain di `~/.codex/accounts/`.
- **Gambar slide jelek** → jalankan `regen.js` lagi (codex gambar ulang).
