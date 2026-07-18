# RULE SCRIPT — SSOT nulis plan.json (owner lock 2026-07-15)

**Status:** HARD. Setiap script carousel ID (dan spirit-nya untuk EN).  
**Gold hidup yang lolos ear owner:**  
- ID: `5101–5120` + **`5401–5407`** (anti-slop) + **`5601–5622`** (YouTube friend retell).  
- EN global: **`5701–5710`**; **EXPERIENCE bar = 5702 · 5703 · 5704 · 5708** (always lived scene, never lecture). Full writing: `writing-global-en.md`.  
**Visual global IG:** solid deep green `#0E3B33` typography (`styles.md` marketing / gen-carousel when surface global).  
**EN angle:** experience position first — room / payday / app / wrong belief — then mechanism.  
**Gate mesin:** `lint-plan.js` + `lint-voice.js` + `lint-quality.js --min-score 5`.  
**Bank nit:** `id-collocation-ban.json` (append, jangan cuma chat) — incl. **WAKTU BERKURANG** not `WAKTU KURANG`.

Kalau dokumen lain bentrok dengan file ini soal **cara nulis cover/body ID** → **file ini menang**.

---

## 0. Satu baris

> Cover sebut **APA** di napas pertama. Body = hidup lo + angka/nama + mekanisme. Bahasa temen, bukan abstract finance. Triple gate hijau **belum** cukup kalau ear bilang AI slop.

---

## 1. COVER (paling sering gagal)

### WAJIB
1. **Produk / tagihan / objek uang** di napas pertama  
   (kartu kredit, token listrik, GoFood, Shopee, admin ATM, trial app, parkir, paylater, Netflix, ortu…)
2. **Angka** atau situasi hidup yang kelihatan
3. **Salah pikir lo** / twist — sering `LO` + `?`
4. Satu POV: **LO** (default) **atau** full **GUE** monolog — **jangan campur** di satu cover

### DILARANG (hard FAIL / ear fail)
| AI slop | Kenapa | Benar (pola 540x) |
|---------|--------|-------------------|
| `BAYAR MINIMUM RP300RB. LO KIRA UDAH AMAN?` | Gak sebut **apa** — org gak ngerti bahas apa | `TAGIHAN KARTU KREDIT RP5JT. LO BAYAR MINIMUM RP300RB — LO KIRA BERES?` |
| `TOKEN LISTRIK RP100RB. 10 HARI UDAH MATI.` | Produk oke, tapi gak ada LO/? | `… — LO KIRA CUMA LAMPU?` |
| `GUE KIRIM… TANGGAL 20 LO KEPEPET` | POV mash | Semua LO **atau** semua GUE |
| `TIAP GAJI` | Kolokasi kaku | `TIAP GAJIAN` |
| Telegram 3 klausa mati tanpa LO/? | Staccato AI | Satu claim + saraf |

### Gold cover (tiru **energi**, jangan clone topik)
```
PAYLATER LIMIT NAIK? DAN LO ANGGAP LAGI NAIK KELAS?
GUE BAYAR NETFLIX RP186RB. LALU GUE MAKSA NONTON BIAR GA RUGI.
TAGIHAN KARTU KREDIT RP5JT. LO BAYAR MINIMUM RP300RB — LO KIRA BERES?
TOKEN LISTRIK RP100RB. 10 HARI UDAH MATI — LO KIRA CUMA LAMPU?
ADMIN ATM RP6.500. LO BILANG: RECEH?
GOFOOD SIANG RP48RB. WARUNG BAWAH RP22RB. LO PILIH MANA?
GRATIS ONGKIR SHOPEE. LO BELANJA LEBIH BIAR LOLOS.
TRIAL APP 7 HARI GRATIS. HARI KE-8 KARTU LO KEDEBIT?
PARKIR MALL RP10RB + BENSIN. LO KIRA CUMA ONGKOS KERJA?
```

**Tes 1 detik:** temen lo liat cover — langsung tau **lagi bahas apa**? Kalau “hah?” → rewrite.

---

## 2. BAHASA ID (natural, bukan AI)

| Salah | Benar |
|-------|--------|
| `tiap gaji` / `setiap gaji` / `hari gaji` | `tiap gajian` / `hari gajian` |
| `gaji` untuk momen potong/transfer | `gajian` |
| `gaji` untuk nominal/slip | OK: `gaji Rp8jt`, `10% gaji`, `sisa gaji` |
| `otak lo bilang…` | `lo kira…` / `lo ngerasa…` |
| `buffer` | `cadangan` / `sisa` / `dana darurat` |
| `DIEM` / slang palsu | buang |
| English weld (`framing UI`, `on-time` di cover) | Bahasa yang lo ucap ke temen |
| Source-first body (`OJK catat…` pembuka) | Hidup dulu, sumber di tengah/akhir |

**Gate:** `id-collocation-ban.json` + `lint-voice.js`.  
Nit owner baru yang regex-able → **append bank**, bukan cuma fix 1 item.

---

## 3. BODY (setiap content slide)

### Recipe
1. **Hidup** (lo / jam / notif / app / chat)  
2. **Angka atau mekanisme** baru (bukan restatement headline)  
3. **Nama** di ≥30% body deck (OJK, BCA, Shopee, PLN, Gojek, Cermati, SLIK, BI…)  
4. **So-what dompet** — sisa, pos, mutasi, tanggal kepepet  

### Target (quality gate)
- Avg body **≥26** kata (gold ~29–32)
- Named entity **≥3 slides** / ≥30% content
- Lived beat (`lo`/`gue`/notif/transfer…) di ≥50% body
- **Bukan** 3+ body yang cuma `Buka. Tulis. Catat.`

### Dilarang di body
- `otak…` metaphor  
- Buka dengan publisher/tanggal  
- Abstract tanpa angka **dan** tanpa aksi **dan** tanpa karena/biar  
- Soft-sell Ibils di ≥3 slide  

---

## 4. SPINE DECK

```
COVER     produk + angka + salah pikir lo/?
01–02     situasi hidup (masih di ruangan reader)
mid       mekanisme + nama + angka (sumber diselip, bukan judul berita)
late      total sebulan/setahun / pos notes / auto-debit
last-1    aksi konkret (lolos kode etik: thrift yang benar)
CLOSING   2–5 kata, story ini doang (bukan CTA generik)
```

`topic` format: `[angle:…] [persp:…] <kalimat manusia>`  
Lihat `diversity-matrix.md` — jangan clone sel yang udah penuh.

---

## 5. KODE ETIK (silent — bukan tema konten)

Full: `kode-etik-script.md`.

- Hemat di tempat yang harus hemat.  
- **Jangan** hemat di tempat yang harus diganti (gunting tumpul).  
- Sunk-cost virtue dilarang (“udah bayar = wajib dipaksa pakai”).  
- Jangan takutin tanpa mekanisme.

---

## 6. GATE & LOOP (biar gak keulang)

### Sebelum ship
```bash
node factory/skill/scripts/lint-plan.js    scripts/item-N/plan.json
node factory/skill/scripts/lint-voice.js   scripts/item-N/plan.json
node factory/skill/scripts/lint-quality.js scripts/item-N/plan.json --min-score 5
bash factory/skill/scripts/selftest-collocation.sh   # smoke kolokasi
```

### Owner bilang “WTF / AI slop”
1. Fix item **dan**  
2. Kalau pola regex-able → rule di `lint-voice` / `id-collocation-ban.json` / quality  
3. Kalau ear-only → few-shot BAD di `gold-fewshot-id.md`  
4. **Prompt doang = akan keulang**

### HTML review
Butuh `sources[]` ≥2 http **dan** `.write-grok/item-N/research.live.json` (≥3 fact url).  
Build: `python3 factory/bin/build-review-html.py --out _review_… --entry REVIEW-….html --min N --max M`

---

## 7. CHECKLIST 30 DETIK (wajib pre-ship)

- [ ] Cover: **apa** + angka + LO/? — temen langsung ngerti topik  
- [ ] Tidak `tiap gaji` (harus `gajian` untuk momen)  
- [ ] Tidak otak / buffer / DIEM / GUE+LO mash  
- [ ] ≥3 body sebut nama sumber/produk  
- [ ] Body buka hidup, bukan OJK/BPS dulu  
- [ ] Closing spesifik story ini  
- [ ] Triple lint clean  
- [ ] `topic` ada `[angle:] [persp:]`  
- [ ] Bukan near-clone gold (Netflix force / paylater limit / ortu) tanpa angle baru  

---

## 8. Referensi cepat

| File | Isi |
|------|-----|
| **Ini** | RULE SCRIPT — hard law nulis |
| `writing-research-id.md` | Data cara nulis (ukur gold) |
| `voice-no-slop.md` | Anti-slop sentence + ethics pointer |
| `gold-fewshot-id.md` | Few-shot pendek |
| `id-collocation-ban.json` | Bank kolokasi hard-fail |
| `diversity-matrix.md` | Angle × perspective |
| `kode-etik-script.md` | Gate #0 ethics |
| Items **5401–5407** | Contoh lolos ear + gate (tiru pola) |

**Owner “mantap” wave:** simpan sebagai bar emas perilaku — generate berikutnya **wajib** setara 540x, bukan di bawahnya.
