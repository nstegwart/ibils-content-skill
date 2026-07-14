# Ibils Content Skills

Repo ini isinya **dua skill** yang berbagi satu set aset dan satu registry fitur:

| skill | isi | bahasa output |
|---|---|---|
| **`ibils-carousel`** (`SKILL.md`) | carousel Instagram, tiap slide dibakar penuh sama codex | English |
| **`ibils-video-ad`** (`video-ad/SKILL.md`) | iklan video sinematik vertikal — codex bikin frame, grok animasiin, ffmpeg rakit | **Bahasa Indonesia** (iklan berbayar) |

Keduanya pakai `assets/` (pose Himel, logo, phone) dan `references/ibils-app.md` yang sama.

> **`references/ibils-app.md` = SATU-SATUNYA sumber kebenaran soal fitur yang beneran shipped.**
> File ini pernah bohong — dia daftarin *email forwarding*, yang **ga pernah dirilis**, dan konten
> yang ngeklaim itu sempat kegenerate. Kalau sebuah klaim itu penting, **tanya owner.**

---

# Ibils Carousel — Pakai Skill di Codex (Lokal)

Skill `ibils-carousel` bikin **carousel Instagram IBILS** — tiap slide digambar
penuh oleh codex. Panduan ini cuma soal satu hal: cara **pakai skill-nya dari
codex CLI / codex app** di komputermu — buat **bikin** dan **regenerate**
carousel. Semua lokal, tanpa Google Cloud.

---

## Prasyarat (sekali aja)

- Skill ada di `~/.codex/skills/ibils-carousel/`
  (Windows: `%USERPROFILE%\.codex\skills\ibils-carousel\`).
- `codex login` udah jalan. **Satu akun aja cukup** — tiap gambar dapet sesi
  `codex exec` sendiri dan semuanya jalan paralel. Ga ada pool akun, ga ada rotasi.
- `node` v18+ dan **ImageMagick** terpasang (`magick -version`).
- Buat skill video: **ffmpeg**, **python3** (numpy + scipy), dan akses `grok`.

---

## Bikin carousel

Buka codex, panggil skill-nya:

```
/ibils-carousel buat content seputar uang sekolah swasta
```

Variasi:
```
/ibils-carousel buat carousel mode insight soal middle income trap
/ibils-carousel jadiin berita keuangan terbaru jadi carousel
/ibils-carousel mode education topik bunga majemuk
```

Skill ngerjain semua sendiri: tulis naskah → render tiap slide → rapikan jadi
1080×1350 + tempel logo. Hasilnya satu folder berisi `plan.json` (naskah) +
`slides/*.png`. codex nyebutin path folder-nya pas selesai — buka folder
`slides/` buat lihat.

---

## Regenerate / perbaiki slide

Pas kamu cek hasilnya ada slide yang salah — **gambar rusak** (tangan 3, mascot
ke-crop) atau **teks keliru** — minta skill benerin slide ITU aja.

Gambar yang jelek (teks udah benar):
```
/ibils-carousel regenerate slide 3 carousel <folder>
```

Teks-nya yang salah — sebut teks benarnya, skill betulin `plan.json` dulu baru
gambar ulang:
```
/ibils-carousel di carousel <folder>, slide 3 teksnya salah — harusnya
"RUPIAH MENGGILA, KITA JADI GILA". Perbaiki teksnya lalu gambar ulang slide itu.
```

Beberapa slide sekaligus:
```
/ibils-carousel regenerate slide 3,5,7 carousel <folder>
```

Cuma slide yang diminta yang berubah — slide lain ga disentuh. Tiap regenerate
= roll baru; kalau masih jelek, minta lagi.

> Carousel-nya masih di Google Storage? Unduh dulu sekali:
> `gsutil -m cp -r gs://ibils-carousel-content-v2/<content-id> ./carousels/`
> Habis keunduh, semua koreksi 100% lokal.

---

> Catatan: kalau versi codex-mu belum nampilin command `/ibils-carousel`,
> cukup ketik permintaannya biasa (tanpa garis miring) — codex auto-load
> skill-nya dari deskripsi. Isi pesannya sama persis kayak contoh di atas.
