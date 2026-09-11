# Panduan kuis-ledakan (Acak Soal, PG 5 Pilihan, Kunci Otomatis, Rekap Terbaik per KD)

Panduan ini merangkum rekomendasi default, alur siswa & guru, cara nilai masuk ke rapor, dan hal‑hal penting saat memakai komponen `<kuis-ledakan>` bersama backend **codev6**.

## 1. Rekomendasi Default (hasil keputusan)

- `hidePauseRestart = true` → tombol **Jeda / Mulai / Ulang** di timer tersembunyi (waktu tidak bisa diulur).
- `lockAfterComplete = true` → **satu percobaan** per siswa; kuis terkunci setelah submit pertama.
- **Retake** (remidial) dilakukan lewat `resetQuizLock` pada **kdMateri yang sama** (bukan kdMateri baru).
- **Acak soal + acak pilihan** aktif (`shuffle-questions`, `shuffle-choices`) untuk integritas ujian.
- **Waktu attempt dipersist** (anti‑refresh) via `localStorage` → reload tidak mereset timer ke durasi penuh.
- **Tombol Mulai mengarahkan ke login** bila siswa belum login (`studentId` kosong) → kuis tidak terbuka.

## 2. Alur Siswa

1. **Login** via komponen `<quiz-user-auth>` di halaman → `studentId` terisi (lewat event `quiz-user-login` / `quiz-user-session-changed`).
2. Lihat **kartu kuis** (`judul`, tombol **Mulai Pengerjaan Kuis**).
3. Klik **Mulai** →
   - Bila belum login: diarahkan ke `<quiz-user-auth>` (scroll + fokus) + emit `kuis-need-login`; **kuis tidak terbuka**.
   - Bila sudah login: soal tampil, **timer auto‑start**, kontrol Jeda/Ulang tersembunyi.
4. Kerjakan soal (urutan & pilihan **acak**) → submit.
5. Skor terkirim ke `db_asesmen` (codev6, `action=logActivity`) → **kuis terkunci**.
6. Bila reload sebelum submit: kembali ke layar soal dengan **sisa waktu** (bukan penuh); urutan soal tetap (shuffle tersimpan). Submit → attempt hilang → reload berikutnya tampil kartu terkunci.

## 3. Alur Guru

- Mode `guru` (`mode="guru"`):
  - **Edit Soal** → ubah bank soal / tambah pilihan ke‑5.
  - Tombol **Ulangi Kuis** di layar hasil muncul **hanya bila** `hidePauseRestart = false`.
  - Tombol **🔓 Buka Kunci / Ulangi** (`resetQuizLock`) untuk remidial → siswa boleh mengulang kuis.
- **Merekap** nilai lewat `generateReport` (codev6) → skor **terbaik** per Kode LM → `Akumulasi_Nilai_Rapor`.

## 4. Nilai Masuk ke Rapor

`logActivity` (front‑end `_selesaiKuis`) → `db_asesmen` (kolom `Kode LM = kdMateri`, `Skor Tulis = skor`) → `generateReport` (codev6) → **best** per Kode LM → kolom `LM1..LM5`, `Rerata_LM`, `Nilai_Rapor` (sheet `Akumulasi_Nilai_Rapor`).

> Catatan: `SHEET_RANGKUMAN` di codev6 hanya "toleransi baca"; output utama adalah `Akumulasi_Nilai_Rapor`. Rekap terbaik otomatis terbawa ke sana.

## 5. Hal Penting

- **`kdMateri` = kunci lock DAN kolom rapor.** Jangan buat `kdMateri` baru untuk remidial (kolom rapor hanya `LM1..LM5`) → gunakan `resetQuizLock` pada kdMateri sama.
- **Satu percobaan** per (siswa, kdMateri) saat `lockAfterComplete = true`.
- Timer **auto‑start** + kontrol tersembunyi + attempt persist → tidak bisa diulur.
- `appsScriptUrl` **HARUS** menunjuk ke deployment **codev6** agar kunci & recap terhubung (bila masih v5, `_cekKunci` gagal → default `_locked=false`, siswa tetap bisa mencoba secara graceful).
- **Login wajib** (`studentId`) sebelum mengerjakan.
- **Shuffle** untuk integritas ujian (penilaian tetap benar karena pemetaan jawaban `_correctMap`/`correctIndex` milik tiap soal).
- Keamanan waktu: `localStorage` bisa dihapus siswa (cheat waktu); untuk pengamanan penuh, tambahkan `startAttempt` server‑side (menulis `startTimestamp` ke sheet sesi) dan jadikan nilai server otoritatif saat resume.
