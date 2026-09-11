# Rekomendasi Arsitektur `dasbor-kuis`

Panduan arsitektur (bukan kode) untuk mengembangkan & menjaga keluarga elemen
`dasbor-kuis` (HAXTheWeb). Tujuannya menjaga konsistensi, keamanan default, dan
kemudahan perawatan saat menambah halaman kuis baru.

## 1. Komposisi > Duplikasi

Jangan menyalin logika kuis ke setiap halaman baru. Turunkan halaman lain
(ulangan-harian, remedial, kuis formatif, latihan mandiri) dari **komposisi**
blok `kuis-ledakan` + `timer-kuis` + orkestrator tipis (seperti `latihan-kuis`).

- `kuis-ledakan` = sumber logika kuis & pengiriman nilai.
- `timer-kuis` = hitung mundur (bisa dipakai ulang di mana saja).
- Orkestrator (`latihan-kuis`, dst.) = hanya menyusun alur & meneruskan properti.

Keuntungan: perbaikan di `kuis-ledakan` otomatis menjangkau semua halaman.

## 2. Skema Soal Tunggal (AKM)

Tetapkan **satu skema soal bersama** sebagai sumber kebenaran (`{q,a,b,c,d,k,
points}` atau format AKM). Baik `kuis-ledakan` maupun `latihan-kuis` harus membaca
skema yang sama. Hindari varian JSON per-elemen agar editor soal & impor file
(`soal-file-url`) konsisten lintas komponen.

## 3. Keamanan Default-Deny (data siswa)

- **Link data ke siswa mati secara default.** `<latihan-kuis>` sudah menerapkan ini
  untuk link sheet (`show-sheet-link` default OFF). Terapkan prinsip sama di elemen
  lain: jangan bagikan URL sheet/API mentah ke siswa.
- Sediakan **view tersaring server-side** (mis. Apps Script `getMyScore` yang hanya
  mengembalikan nilai siswa yang login) alih-alih memberi link sheet master mentah.
- Validasi di sisi server: jangan percaya hanya pada `studentId` dari klien untuk
  privasi; pasangkan dengan token sesi/auth.

## 4. Konsistensi DDD (tanpa hardcode hex)

Semua elemen harus memakai **token DDD** (`--ddd-theme-*`, `--ddd-spacing-*`,
`--ddd-radius-*`, `--ddd-font-*`). Dilarang hardcode warna hex light (seperti
`#e8f5e9`, `#2e7d32`) agar dark-mode aman. Contoh kartu hasil di `latihan-kuis`
sudah menggunakan `default-surface` / `default-text` / `success` / `error`.

## 5. Edit Soal di Layer Komposisi

Soal sebaiknya **dapat diedit di panel HAX elemen luar** (layer komposisi), bukan
hanya di dalam `<kuis-ledakan>`. `latihan-kuis` sudah mengekspos `questions`
(code-editor) & `soal-file-url` (haxupload) di `haxProperties.configure`. Teruskan
pola ini: setiap orkestrator membuka soal ke panel HAX agar author tak perlu menyelam
ke elemen dalam.

## 6. Jaga `npm run sync` & Tambah Pengujian

- Setelah mengubah `elements/dasbor-kuis/lib/*`, jalankan `npm run sync` (di
  `haxto/custom/`) agar situs ikut berubah. Sync menyalin `lib/*.js`,
  `lib/*.haxProperties.json`, dan `locales/*.json` ke `haxto/custom/src/dasbor-kuis`.
- Tambahkan **web-test-runner** untuk alur dua jalur `latihan-kuis`:
  - submit manual → kartu hasil muncul + skor (`_selesai` true).
  - timer habis → kartu hasil + teks "Waktu habis" (`_habisWaktu` true).
  - `show-sheet-link` false → tombol sheet absen walau `spreadsheet-url` ada.
- Jangan ubah `kuis-ledakan`/`timer-kuis` tanpa memverifikasi orkestrator yang
  bergantung padanya (`latihan-kuis`).

## Ringkasan

| Prinsip | Aksi |
|---|---|
| Komposisi | Turunkan halaman dari `kuis-ledakan`+`timer-kuis`. |
| Skema soal | Satu format AKM bersama. |
| Keamanan | Default-deny; view tersaring `getMyScore`. |
| DDD | Token, bukan hex; dark-mode safe. |
| Editabilitas | Soal di panel HAX (code-editor/haxupload). |
| Kualitas | `npm run sync` + web-test-runner alur 2 jalur. |
