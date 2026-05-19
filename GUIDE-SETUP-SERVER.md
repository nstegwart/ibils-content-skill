# Ibils Carousel — Setup SERVER (Burst Produksi Massal)

Panduan ini buat menjalankan **burst** — mesin produksi massal nonstop yang
bikin carousel tanpa henti di server dan upload tiap hasil ke Google Cloud
Storage.

> Mau pakai di komputer sendiri (bikin / regenerate satuan)? Lihat
> **[README.md](README.md)**.

---

## 1. Yang dibutuhkan di server

- **node** v18+, **codex CLI**, **gsutil**, **ImageMagick** (`convert`/`magick`).
- **Pool akun codex** di `~/.codex/accounts/*.json` — tiap file = 1 akun.
  Makin banyak akun, makin tinggi throughput (lihat bagian 6).
- **Service-account key GCS** (file JSON) buat upload — taruh di server,
  misalnya `~/ibils-burst/gcs-key.json`.
- **Bucket GCS** tujuan (mis. `ibils-carousel-content`).

## 2. Deploy skill ke server

Salin folder skill ke server:
```bash
scp -r ~/.codex/skills/ibils-carousel \
  <user>@<server>:/home/<user>/.codex/skills/
```
Salin pool akun + GCS key:
```bash
scp ~/.codex/accounts/*.json <user>@<server>:/home/<user>/.codex/accounts/
scp gcs-key.json <user>@<server>:/home/<user>/ibils-burst/gcs-key.json
```

## 3. Aktifkan akses GCS (sekali)

Di server, aktifkan service account supaya `gsutil` bisa upload:
```bash
gcloud auth activate-service-account --key-file=/home/<user>/ibils-burst/gcs-key.json
```
Kalau upload pernah error `403`, ulangi perintah ini.

## 4. Nyalakan burst

```bash
cd ~/ibils-burst
nohup env GCS_KEY=/home/<user>/ibils-burst/gcs-key.json \
          GCS_BUCKET=ibils-carousel-content \
  node ~/.codex/skills/ibils-carousel/scripts/burst-daemon.js ~/ibils-burst \
  > ~/ibils-burst/daemon.log 2>&1 < /dev/null & disown
```

Daemon jalan 4 batch paralel; tiap carousel selesai → otomatis di-upload ke
GCS lalu folder lokalnya dihapus (biar disk server ga penuh). Topik
di-generate otomatis dan dicatat di `topics-ledger.jsonl` → **tidak ada
konten dobel**.

## 5. Pantau & matikan

```bash
tail -f ~/ibils-burst/daemon.log                       # pantau
pgrep -fc burst-daemon.js                              # cek daemon hidup
grep -l "CAROUSEL DONE" ~/ibils-burst/logs/*.log | wc -l   # jumlah selesai

touch ~/ibils-burst/STOP        # berhenti rapi (ga ambil batch baru)
pkill -9 -f burst-daemon.js     # matikan total sekarang
```

Restart (mis. setelah update skill): matikan, hapus file `STOP`, nyalakan lagi
(perintah bagian 4).

## 6. Setelan throughput (penting)

Di atas `scripts/burst-daemon.js`:
- `BATCHES` × `SESSIONS_PER_BATCH` = jumlah carousel jalan **barengan**.
  Default `4 × 1 = 4`.
- 1 carousel ≈ 17 panggilan codex. **Jangan kegedean**: kalau permintaan
  melebihi kecepatan reset quota pool akun, semua akun kena rate-limit dan
  burst macet berjam-jam (sawtooth). Aman: jaga permintaan **di bawah**
  kecepatan isi-ulang quota.
- Patokan: ~104 akun mampu sustained ~25–40 carousel/jam. Mau lebih → tambah
  akun, bukan naikin concurrency.

Model codex: `-m gpt-5.5 -c model_reasoning_effort="medium"` (di
`burst-daemon.js`, `run-carousel.js`, `gen-carousel.js`).

## 7. Hasil di GCS

```
gs://<bucket>/<content-id>/plan.json
gs://<bucket>/<content-id>/slides/01-cover.png ... NN-closing.png
```
Browser: `https://console.cloud.google.com/storage/browser/<bucket>`

Regenerate carousel yang sudah di GCS (perbaiki gambar/teks):
```bash
GCS_KEY=/path/gcs-key.json \
  node ~/.codex/skills/ibils-carousel/scripts/regen.js <content-id>
```
(detail regenerate ada di [README.md](README.md) bagian 4)

## 8. Masalah umum (server)

- **Upload gagal / `403`** → SA belum aktif: ulangi bagian 3.
- **daemon.log "topic generation empty" terus** → pool akun lagi kena
  rate-limit; daemon auto-lanjut sendiri pas quota reset (jam-an). Bukan bug.
- **Carousel nyangkut, GCS ga nambah lama** → matikan sesi macet, daemon
  relaunch sendiri:
  `pkill -9 -f run-carousel.js; pkill -9 -f "codex exec"; pkill -9 -f gen-carousel.js`
- **Disk server penuh** → cek `/tmp` dan `~/ibils-burst/out`; daemon nyapu
  sisa otomatis, tapi sesi yang di-kill paksa bisa ninggalin sampah —
  hapus manual aman: `rm -rf ~/ibils-burst/out/* /tmp/ibils-carousel-* /tmp/rc-*`
