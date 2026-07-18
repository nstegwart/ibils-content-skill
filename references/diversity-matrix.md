# DIVERSITY MATRIX — anti-redundan + multi-angle / multi-perspective

**Owner (2026-07-15):** *“Gue gamau ada konten redundan dan harus dari berbagai angle dan perspective.”*

**Status:** HARD untuk setiap wave script baru (ID **dan** EN).  
Baca **setelah** kode-etik + knowledge-bar, **sebelum** milih angle.

---


## 0b. URGENSI ORANG UMUM (owner 2026-07-15)

Diversity **bukan** izin bikin konten niche yang gak nyentuh orang biasa.

**Uji 10 detik:** "Orang di angkot/ojol/kantor bakalan ngerasa ini masalahnya **minggu ini**?"  
Kalau jawabnya "hmm bagus sih tapi..." → **ganti angle**.

Prioritas tinggi (orang umum): gaji abis, paylater/denda, makan ojol, transfer fee, token, cicilan motor, Shopee malam, BPJS/RS, admin bank, THR.  
Prioritas rendah kecuali breaking: deposit kontrak detail, expense ratio kuliah, HPP merchant-only, unit-link dalam.

## 1. Satu kalimat

> Setiap deck baru harus mengisi **sel matriks yang masih longgar** —  
> bukan remix paylater / GoFood / admin bank ke-N dengan cover beda.

---

## 2. Dua sumbu (wajib dideklarasikan di `topic` atau research)

### A. ANGLE (domain uang — pilih **1 primer**)

| Code | Domain | Contoh insight (bukan tips kosong) |
|------|--------|-------------------------------------|
| `delivery_fee` | Ojol food / ongkir | Markup + MDR + fee stack |
| `bnpl_paylater` | Paylater / denda | Plafon, denda %, multi-app |
| `bank_rails` | Transfer, QRIS, admin, deposito | BI-FAST, MDR, admin vs bunga |
| `macro_rate` | BI Rate, UMP, inflasi → cicilan | Rantai acuan ke KPR/kartu |
| `health` | BPJS, RS, obat | Iuran vs selisih kelas |
| `sub_digital` | Streaming, cloud, trial | Utilitas + sunk cost |
| `debt_credit` | KK, cicilan, SLIK | Minimum, pokok, kolektibilitas |
| `scam` | Bodong, romance, travel | Mekanisme trust |
| `fomo_retail` | Flash sale, cashback, gratis ongkir | Threshold math |
| `work_wage` | Gaji, lembur, THP | Upah/jam vs ojek |
| `vehicle` | Motor, PKB, OTR, bensin | Pajak, pack dealer |
| `household` | Token, sewa, dapur, split rumah | Pos bersama |
| `housing` | Kontrakan, deposit, tahun ke-2 | Kenaikan sewa, deposit ilang |
| `tax_salary` | PPh 21, THR, slip | Potongan yang gak kelihatan |
| `invest_risk` | Reksadana fee, bodong “ROI” | Expense ratio, izin |
| `education` | SPP, kursus, les | Cicilan pendidikan |
| `insurance` | Premi, unit-link, klaim | Cover vs jualan |
| `side_income` | Ojol sampingan, freelance | Net after bensin/HP |
| `ticket_event` | Konser, parkir | Fee stack |
| `merchant` | Sisi warung/resto | Komisi platform |

### B. PERSPECTIVE (siapa yang “saya” di deck — pilih **1 primer**)

| Code | Sudut | Bukan cuma… |
|------|--------|-------------|
| `wallet_self` | Dompet individu | (default — **jangan 70% wave**) |
| `family` | Pasangan, anak, ortu, mertua | split bill keluarga, THR, SPP |
| `worker` | Karyawan / shift / WFO | slip, lembur, BPJS TK |
| `homemaker` | IRT / belanja rumah | dapur, token, jajan anak |
| `merchant` | Penjual / UMKM | MDR, komisi, cashflow stok |
| `driver` | Ojol / kurir | potongan, order, BBM |
| `system` | Aturan / skala makro | OJK, BI, UMP → dompet |
| `crime` | Korban / modus | scam forensik |

---

## 3. Aturan wave (anti-redundan)

Untuk **setiap batch N deck** (N≥5):

1. **Max 2** deck share angle primer yang sama.  
2. **Max 40%** wave di `wallet_self` saja — sisanya wajib perspective lain.  
3. **Dilarang** near-clone: topik yang sama + mekanisme sama + angka beda tipis  
   (contoh: 3× “paylater denda receh”, 3× “GoFood markup”).  
4. Sebelum nulis: cek inventory (`factory/bin/diversity-inventory.py`).  
   Kalau angle+perspective combo sudah ≥3 di 60 item terakhir → **ganti sel**.  
5. `topic` string format:

```
[angle:housing] [persp:family] Kontrakan tahun ke-2 naik 10% — deposit ilang di aturan lisan
```

6. Knowledge-bar tetap berlaku: sel baru **bukan** alasan bikin tips kosong.

---

## 4. Sel prioritas (isi dulu — inventory 2026-07-15)

**Kosong / tipis (prioritas wave berikutnya):**

| Angle × perspective | Kenapa |
|---------------------|--------|
| `housing` × `family` | Belum ada |
| `tax_salary` × `worker` | Belum ada |
| `invest_risk` × `wallet_self` | Tipis vs scam travel |
| `education` × `family` | Belum ada |
| `insurance` × `family` | Belum ada |
| `side_income` × `driver` / `worker` | Belum ada |
| `merchant` × `merchant` | Hanya implisit di GoFood |
| `household` × `homemaker` | Tipis |
| `debt_credit` × `worker` | UMP vs cicilan — perkuat beda mekanisme |
| `health` × `family` | BPJS keluarga 4 orang |

**Jenuh (jangan tambah dulu kecuali fakta breaking baru):**

- `bnpl_paylater` × `wallet_self`
- `delivery_fee` × `wallet_self`
- `bank_rails` × `wallet_self`
- `sub_digital` × `wallet_self`

---

## 5. Self-check pre-write

- [ ] Angle primer + perspective primer tertulis di topic  
- [ ] Combo ini **tidak** jenuh di inventory  
- [ ] Mekanisme **beda** dari deck terdekat di angle yang sama  
- [ ] Knowledge-bar: ≥3 slide fakta bernama  
- [ ] Bukan remix cover gold lama  

Gagal → ganti sel, jangan generate.
