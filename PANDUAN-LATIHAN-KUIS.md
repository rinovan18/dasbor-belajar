# Panduan `<latihan-kuis>`

Panduan singkat untuk author (guru/developer) yang ingin menggunakan elemen web
`<latihan-kuis>` dari proyek `dasbor-kuis`.

## Apa itu `<latihan-kuis>`

`<latihan-kuis>` adalah **halaman latihan terpandu** yang menyatukan tiga blok:

1. **`materi-card`** — kartu materi (judul, teks, URL/file, gambar sampul).
2. **`<timer-kuis>`** — hitung mundur; saat habis memancarkan `timer-kuis-expired`.
3. **`<kuis-ledakan>`** — kuis interaktif (soal, penilaian, kirim ke Spreadsheet).

Alur: siswa baca materi → klik **Mulai** → timer jalan + kuis tampil → saat selesai
(submit manual) **atau** waktu habis, kartu hasil "Nilai terkirim" muncul.

## Mengapa bisa membungkus `<kuis-ledakan>`

`latihan-kuis` **tidak** menyalin logika kuis. Ia me-render `<kuis-ledakan>` di
dalam *shadow DOM*-nya, lalu:

- **Meneruskan properti** lewat binding (`.questions`, `.appsScriptUrl`,
  `.studentId`, `.studentName`, `.studentNis`, `.studentAbsen`, `.studentKelas`,
  `.judul`).
- **Mendengarkan event**:
  - `dasbor-kuis-log` (dari `kuis-ledakan`) → simpan `score` & balik `_selesai`.
  - `timer-kuis-expired` (dari `timer-kuis`) → panggil `_selesaiKuis()` lalu
    balik `_selesai` + `_habisWaktu`.

**Pemisahan tanggung jawab:**
- `kuis-ledakan` = logika kuis & pengiriman nilai ke Spreadsheet (GAS).
- `timer-kuis` = hitung mundur semata.
- `latihan-kuis` = *orkestrasi alur* (materi → kuis → hasil).

## Atribut / Properti (dan pemetaan panel HAX)

| Atribut | Properti | Panel HAX | Keterangan |
|---|---|---|---|
| `apps-script-url` | `appsScriptUrl` | URL Apps Script (kirim nilai) | Web App GAS `action=logActivity`. |
| `spreadsheet-url` | `spreadsheetUrl` | URL Spreadsheet Nilai (lihat) | Link rekap nilai. |
| `show-sheet-link` | `showSheetLink` | Tampilkan Link Spreadsheet (boolean) | **Default OFF.** Tombol sheet hanya muncul bila true + url ada. |
| `duration` | `duration` | Durasi Kuis (detik) | Default 300. |
| `judul-materi` | `judulMateri` | Judul Materi | |
| `teks-materi` | `teksMateri` | Teks Materi (textarea) | |
| `materi-url` | `materiUrl` | URL Materi | |
| `materi-file` | `materiFile` | File Materi (haxupload) | |
| `cover-image` | `coverImage` | Gambar Sampul Materi (image) | |
| `judul-kuis` | `judulKuis` | Judul Kuis | |
| `questions` | `questions` | Soal (JSON) — code-editor | Soal inline (array). |
| `soal-file-url` | `soalFileUrl` | Upload File Soal (JSON) — haxupload | File `.json`; menimpa soal inline bila berhasil. |
| `student-id` / `student-name` / `student-nis` / `student-absen` / `student-kelas` | — | — | Diisi otomatis oleh `<quiz-user-auth>`. |
| `pesan-waktu-habis` | `pesanWaktuHabis` | Pesan Waktu Habis | Hanya tampil bila benar-benar timeout. |
| `pesan-nilai-terkirim` | `pesanNilaiTerkirim` | Pesan Nilai Terkirim | |
| `label-mulai` | `labelMulai` | Teks Tombol Mulai | |

## Setup Google Apps Script (GAS)

1. Buat Apps Script Web App yang menangani `action=logActivity` dan menulis ke
   Spreadsheet (kolom: studentId, nama, nis, absen, kelas, score, waktu).
2. Deploy sebagai Web App (akses: "Anyone") → salin URL ke `apps-script-url`.
3. Siswa login via `<quiz-user-auth>` (`apps-script-url` sama) agar nilai terikat
   Student ID.

## Auth siswa (wajib login — anti hilang nilai)

`<latihan-kuis>` **menanam `<quiz-user-auth>` di dalam shadow DOM-nya sendiri**,
sehingga tidak butuh elemen auth di halaman luar. Saat siswa login, elemen menyinkronkan
`studentId`/`studentName`/`studentNis`/`studentAbsen`/`studentKelas` ke `<kuis-ledakan>`.

- **Tombol Mulai dikunci** sampai siswa login (H1): bila `studentId` kosong, kuis tak
  dibuka dan form login yang tampil.
- Bila kuis dipaksa jalan tanpa login, kartu hasil menampilkan
  `⚠️ Nilai belum tersimpan karena belum login` (bukan "terkirim") dan tidak ada baris
  baru di Spreadsheet (H3).
- `kd-materi` diteruskan ke `<kuis-ledakan>` agar rekap per topik tersimpan (H4).

Author cukup menaruh `<latihan-kuis>`; siswa login lewat form di dalamnya. Lihat
`demo/latihan-kuis.html`.

## Cara Mengimpor Soal dari File

Ada dua cara memuat soal dari `elements/dasbor-kuis/demo/soal-contoh.json`:

1. **Via `soal-file-url` (haxupload) — direkomendasikan:** di panel HAX, buka
   properti *Upload File Soal (JSON)* (`soal-file-url`, inputMethod `haxupload`),
   lalu pilih `soal-contoh.json`. Elemen akan `fetch` + `JSON.parse` file lalu
   **menimpa** `questions` inline (precedence: `soalFileUrl` > `questions`).
   Bila file rusak / HTTP error → `_pesan` (err-chip) muncul & soal inline tetap dipakai.
2. **Via `questions` (code-editor):** buka `soal-contoh.json`, salin isinya, tempel
   ke properti *Soal (JSON)* (`questions`, inputMethod `code-editor`) di panel HAX.

Contoh isi `soal-contoh.json` (format legacy AKM/PG; `k` = kunci jawaban benar):

```json
[
  {"q":"Apa ibu kota Indonesia?","a":"Bandung","b":"Jakarta","c":"Surabaya","d":"Medan","k":"b","points":10},
  {"q":"Berapa 7 × 8?","a":"54","b":"56","c":"58","d":"60","k":"b","points":10},
  {"q":"Planet terdekat Matahari?","a":"Venus","b":"Bumi","c":"Merkurius","d":"Mars","k":"c","points":10},
  {"q":"Bahasa pemrograman apa yang dipakai elemen ini?","a":"Python","b":"Lit (JavaScript)","c":"PHP","d":"Ruby","k":"b","points":10}
]
```

Catatan:
- Format lama `{q,a,b,c,k}` maupun AKM `{type:"mc",question,choices,correctIndex}`
  didukung oleh `_muatSoalDariFile` & `kuis-ledakan`.
- Kosongkan `soal-file-url` untuk pakai soal inline.
- File harus di-host di URL publik / CORS-aman agar `fetch` berhasil.

## Catatan HAXcms

`<latihan-kuis>` dapat dipasang di HAXcms sebagai blok halaman:

1. Pastikan elemen terdaftar: bundle `dasbor-kuis` sudah dibuild & di-`sync` ke
   `haxto/custom/src/dasbor-kuis`, sehingga HAXcms mengenali tag `latihan-kuis`.
2. Di editor HAXcms, tambahkan blok **Latihan Kuis** (`<latihan-kuis>`).
3. Isi `apps-script-url` (wajib agar nilai tersimpan ke Spreadsheet) dan
   `spreadsheet-url` (opsional, untuk link rekap).
4. Soal: edit lewat *Soal (JSON)* (code-editor) atau unggah JSON lewat
   *Upload File Soal (JSON)* (haxupload) — lihat "Cara Mengimpor Soal dari File".
5. Auth: elemen **sudah menyertakan `<quiz-user-auth>` di dalam shadow DOM-nya**;
   cukup pastikan `apps-script-url` sama dengan yang dipakai auth. Tidak perlu
   menaruh auth terpisah, kecuali ingin satu auth global di halaman (lihat I3).
6. Tema: kartu hasil & form login mengikuti token DDD, sehingga otomatis ikut
   mode gelap HAXcms.

## Keamanan

- `show-sheet-link` **default OFF** (safe by default). Aktifkan hanya untuk guru /
  view yang aman, karena siswa bisa melihat isi sheet.
- Arahkan `spreadsheet-url` ke **view agregat/summary**, bukan sheet master mentah.
- Untuk kebocoran minim, idealnya sediakan endpoint tersaring server-side
  (`getMyScore`) alih-alih membagikan link sheet mentah ke siswa.

## Mode Gelap (Dark Mode)

Kartu hasil memakai token DDD: `background: var(--ddd-theme-default-surface)`,
teks `var(--ddd-theme-default-text)`, aksen sukses `var(--ddd-theme-success)`,
dan pesan waktu habis `var(--ddd-theme-error)`. Tidak ada hardcode hex light,
sehingga ikut tema gelap HAX / `prefers-color-scheme: dark`.

## Keterbatasan

- Kartu hasil `latihan-kuis` adalah **layar terminal**: pada submit manual, kartu
  ini menggantikan layar hasil `<kuis-ledakan>` (confetti/detail retry internal
  kuis-ledakan tidak tampil). Ini intent desain.
- Tombol "Ulangi" (reset) bersifat opsional, belum disediakan.
