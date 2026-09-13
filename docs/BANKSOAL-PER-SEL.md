# BankSoal — Per Sel + Kode Materi/LM

## Sheet `Bank Soal` (`lib/codev6.gs:85`)

Header baris 1 wajib: `ID | Kategori | Tipe | Detail | Soal | Poin | Kode Materi*`

- **Kolom A `ID`**: unik, mis. `LM1-01`, `LM1-02`, `LM2-01`
- **Kolom B `Kategori`**: **Kode Materi/LM** — filter utama. Isi `LM1`, `LM2`, `LM3`, `STS`, `SAS`, atau `Pertemuan 1` (otomatis dinormalisasi `LM1` via `dasbor-kuis.js:2756` `_materiCol()`).
- **Kolom C `Tipe`**: `mc` (default), `pgk`, `matching`, `shortAnswer`
- **Kolom D `Detail`**: opsional, deskripsi singkat
- **Kolom E `Soal`**: **1 sel = 1 JSON soal** (bukan array). Contoh:
  ```json
  {"question":"LM1 — Apa tujuan utama...","choices":["Memahami konsep dasar","Hafalan saja"],"correctIndex":0}
  ```
  Jika file `demo/soal-LM1.json` adalah array, pecah per elemen → 1 elemen = 1 baris `Soal`.
- **Kolom F `Poin`**: `1` (default)
- **Kolom G `Kode Materi`*** (opsional, alias Kategori): jika diisi, akan dipakai sebagai `Kategori` fallback.

## Contoh 3 baris untuk LM1–LM3

| ID     | Kategori | Tipe | Detail            | Soal                                                                 | Poin |
|--------|----------|------|-------------------|----------------------------------------------------------------------|------|
| LM1-01 | LM1      | mc   | Tujuan LM1        | `{"question":"LM1 — Apa ...","choices":["A","B","C","D"],"correctIndex":0}` | 1 |
| LM2-01 | LM2      | matching | Jodohkan LM2  | `{"question":"LM2 — Jodohkan...","type":"matching","leftItems":["A"],"rightItems":["B"],"correctPairs":{"0":1}}` | 1 |
| LM3-01 | LM3      | shortAnswer | Isian LM3    | `{"question":"LM3 — Sebutkan...","type":"shortAnswer","acceptedAnswers":["kolaborasi"]}` | 1 |

## Cara Copas Tinggal Pakai

1. Buka `demo/soal-LM1.json:1` → copy 1 objek `{"question":...}` → paste ke sel `Bank Soal.Soal`.
2. Isi `Kategori` = `LM1` (atau `LM2` untuk LM2).
3. Simpan sheet → `?action=getBankSoal&kategori=LM1` akan return hanya soal LM1 (filter `lib/codev6.gs:687` `getBankSoal`).
4. Di `dasbor-kuis` atau `latihan-kuis`, `soal-file-url="./soal-{kdMateri}.json"` atau kosongkan `questions` agar auto-fetch BankSoal per `kdMateri` (`kuis-ledakan.js:803`).

## Guard Shell Ceria

Jika `Bank Soal` punya data, `tema-ceria-dasbor.js:82` `availableLM` diisi dari `Kategori` distinct → pills `LM3` yang belum ada baris akan `🔒` disabled (tidak bisa dikerjakan, mencegah `kirim soal LM3 padahal belum diatur`).

## Verifikasi

```bash
curl "https://script.google.com/macros/s/.../exec?action=getBankSoal&kategori=LM1"
# → {"status":"ok","soal":[{"id":"LM1-01","kategori":"LM1","tipe":"mc","soal":{...},"poin":1}]}
```
