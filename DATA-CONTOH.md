# DATA CONTOH — Dasbor Evaluasi Terintegrasi V5 (dasbor-kuis)

Data contoh 6 siswa kelas **XI-1** agar seluruh tampilan langsung hidup:
Pantauan Guru, Leaderboard, Hasil & Nilai Siswa, Heatmap aktivitas 28 hari.

---

## 1. Persiapan Singkat (5 Langkah)

1. Buat spreadsheet Google baru (`File > New spreadsheet`).
2. Ganti nama tab sesuai daftar di bagian 3, **berurutan** (nama tab harus persis).
3. Di tiap tab: klik sel **A1** → **paste** blok di bawahnya (column otomatis terpisah).
4. Buka `Extensions > Apps Script`, salin seluruh isi
   `lib/codev5.gs`, lalu **Deploy > Web app** → dapatkan URL `/exec`.
5. Tempel URL tersebut ke atribut `apps-script-url` pada `<dasbor-kuis>` (demo di `index.html`).

> Profil default di komponen (`STD-65108053` / Andy Yulianto / XI-1) sudah cocok
> dengan data contoh ini, jadi Mode Siswa langsung menampilkan hasil.

---

## 2. Daftar Sheet yang Dibutuhkan

| # | Nama Tab | Esensial | Dipakai Untuk | Dibuat/Ditimpa Backend? |
|---|----------|----------|---------------|--------------------------|
| 1 | `Users` | ✅ Wajib | Login, daftar siswa (getStudentRoster) | Tidak |
| 2 | `db_nilai` | ✅ Wajib | Hasil kuis (action=submit), bahan Rangkuman | Ditambah tiap kuis |
| 3 | `db_aktivitas` | ✅ Wajib | Heatmap 28 hari, aktivitas (action=logActivity) | Ditambah tiap aktivitas |
| 4 | `Akumulasi Nilai Rapor` | ✅ Wajib | Hasil & Nilai siswa (action=getScores) | **Ditimpa** oleh generateReport |
| 5 | `Rangkuman` | ✅ Wajib | Leaderboard & pantauan guru (getLeaderboard) | **Ditimpa** tiap submit/aktivitas |
| 6 | `Bank Soal` | ⚠️ Opsional | Generator soal (action=getBankSoal) | Tidak |
| 7 | `Nilai Manual` | ⚠️ Opsional | UTS/UAS input manual guru | Ditambah manual |
| 8 | `db_kehadiran` | ⚠️ Opsional | Absensi lengkap 100% (saveAttendanceComplete) | UPSERT per hari |

> **Penting:** `Rangkuman` dan `Akumulasi Nilai Rapor` DIBAWAH INI diisi manual agar
> dashboard langsung tampil sebelum ada aktivitas. Begitu siswa submit kuis /
> melakukan aktivitas (atau guru memanggil `action=generateReport`), backend akan
> **menghitung ulang dan menimpa** kedua tab itu secara otomatis — itu normal.

---

## 3. Blok Data Siap Copas (per Tab)

### Tab 1: `Users`

```text
StudentID	NIS	Nama	Email	Absen	Kelas	RegisteredAt	LastLogin
STD-65108053	65108053	Andy Yulianto	andy.yulianto23@gmail.com	1	XI-1	01/08/2026 08:00:00	11/08/2026 07:30:00
STD-65108054	65108054	Siti Rahmawati	siti.rahmawati23@gmail.com	2	XI-1	01/08/2026 08:05:00	11/08/2026 07:35:00
STD-65108055	65108055	Bima Pratama	bima.pratama23@gmail.com	3	XI-1	01/08/2026 08:10:00	11/08/2026 07:40:00
STD-65108056	65108056	Dina Lestari	dina.lestari23@gmail.com	4	XI-1	02/08/2026 08:00:00	11/08/2026 07:45:00
STD-65108057	65108057	Rizky Ramadhan	rizky.ramadhan23@gmail.com	5	XI-1	02/08/2026 08:10:00	11/08/2026 07:50:00
STD-65108058	65108058	Nadia Safitri	nadia.safitri23@gmail.com	6	XI-1	03/08/2026 08:00:00	11/08/2026 07:55:00
```

### Tab 2: `db_nilai` (Hasil Kuis)

Skor ≥ 70 otomatis `LULUS`. Backend *upsert* nilai **terbaik** per siswa + kode materi.

```text
Timestamp	Date	Kode Materi	Nama	Skor (%)	Total Soal	Status	Student ID	NIS	Absen	Kelas	Kategori Kuis	ID Log
11/08/2026 08:15:00	2026-08-11	Pertemuan 1	Andy Yulianto	85	10	LULUS	STD-65108053	65108053	1	XI-1	formatif	
08/08/2026 09:00:00	2026-08-08	Pertemuan 2	Andy Yulianto	78	10	LULUS	STD-65108053	65108053	1	XI-1	formatif	
05/08/2026 10:30:00	2026-08-05	Pertemuan 3	Andy Yulianto	80	5	LULUS	STD-65108053	65108053	1	XI-1	ulangan_harian	
28/07/2026 11:00:00	2026-07-28	UTS Semester Gasal	Andy Yulianto	85	20	LULUS	STD-65108053	65108053	1	XI-1	uts	
05/08/2026 13:00:00	2026-08-05	UAS Prognostik	Andy Yulianto	82	20	LULUS	STD-65108053	65108053	1	XI-1	uas	
11/08/2026 08:20:00	2026-08-11	Pertemuan 1	Siti Rahmawati	90	10	LULUS	STD-65108054	65108054	2	XI-1	formatif	
08/08/2026 09:05:00	2026-08-08	Pertemuan 2	Siti Rahmawati	88	10	LULUS	STD-65108054	65108054	2	XI-1	formatif	
05/08/2026 10:35:00	2026-08-05	Pertemuan 3	Siti Rahmawati	86	5	LULUS	STD-65108054	65108054	2	XI-1	ulangan_harian	
28/07/2026 11:05:00	2026-07-28	UTS Semester Gasal	Siti Rahmawati	90	20	LULUS	STD-65108054	65108054	2	XI-1	uts	
05/08/2026 13:05:00	2026-08-05	UAS Prognostik	Siti Rahmawati	92	20	LULUS	STD-65108054	65108054	2	XI-1	uas	
11/08/2026 08:25:00	2026-08-11	Pertemuan 1	Bima Pratama	87	10	LULUS	STD-65108055	65108055	3	XI-1	formatif	
08/08/2026 09:10:00	2026-08-08	Pertemuan 2	Bima Pratama	84	10	LULUS	STD-65108055	65108055	3	XI-1	formatif	
05/08/2026 10:40:00	2026-08-05	Pertemuan 3	Bima Pratama	85	5	LULUS	STD-65108055	65108055	3	XI-1	ulangan_harian	
28/07/2026 11:10:00	2026-07-28	UTS Semester Gasal	Bima Pratama	88	20	LULUS	STD-65108055	65108055	3	XI-1	uts	
05/08/2026 13:10:00	2026-08-05	UAS Prognostik	Bima Pratama	86	20	LULUS	STD-65108055	65108055	3	XI-1	uas	
11/08/2026 08:30:00	2026-08-11	Pertemuan 1	Dina Lestari	80	10	LULUS	STD-65108056	65108056	4	XI-1	formatif	
05/08/2026 10:45:00	2026-08-05	Pertemuan 3	Dina Lestari	76	5	LULUS	STD-65108056	65108056	4	XI-1	ulangan_harian	
28/07/2026 11:15:00	2026-07-28	UTS Semester Gasal	Dina Lestari	80	20	LULUS	STD-65108056	65108056	4	XI-1	uts	
05/08/2026 13:15:00	2026-08-05	UAS Prognostik	Dina Lestari	82	20	LULUS	STD-65108056	65108056	4	XI-1	uas	
11/08/2026 08:35:00	2026-08-11	Pertemuan 1	Rizky Ramadhan	62	10	TIDAK LULUS	STD-65108057	65108057	5	XI-1	formatif	
05/08/2026 10:50:00	2026-08-05	Pertemuan 3	Rizky Ramadhan	62	5	TIDAK LULUS	STD-65108057	65108057	5	XI-1	ulangan_harian	
28/07/2026 11:20:00	2026-07-28	UTS Semester Gasal	Rizky Ramadhan	65	20	TIDAK LULUS	STD-65108057	65108057	5	XI-1	uts	
05/08/2026 13:20:00	2026-08-05	UAS Prognostik	Rizky Ramadhan	60	20	TIDAK LULUS	STD-65108057	65108057	5	XI-1	uas	
11/08/2026 08:40:00	2026-08-11	Pertemuan 1	Nadia Safitri	55	10	TIDAK LULUS	STD-65108058	65108058	6	XI-1	formatif	
05/08/2026 10:55:00	2026-08-05	Pertemuan 3	Nadia Safitri	50	5	TIDAK LULUS	STD-65108058	65108058	6	XI-1	ulangan_harian	
28/07/2026 11:25:00	2026-07-28	UTS Semester Gasal	Nadia Safitri	55	20	TIDAK LULUS	STD-65108058	65108058	6	XI-1	uts	
05/08/2026 13:25:00	2026-08-05	UAS Prognostik	Nadia Safitri	52	20	TIDAK LULUS	STD-65108058	65108058	6	XI-1	uas	
```

### Tab 3: `db_aktivitas` (Log Aktivitas → Heatmap 28 Hari)

Kolom `Tanggal` digunakan untuk heatmap. Data sengaja tersebar sejak 16 Juli 2026.

```text
Timestamp	Tanggal	Hari	Nama	Tipe Aktivitas	Deskripsi	Count	Student ID	NIS	Absen	Kelas	Kode Materi	ID Log
16/07/2026 08:10:00	2026-07-16	Kamis	Andy Yulianto	reading	Membaca Modul Shadow DOM	1	STD-65108053	65108053	1	XI-1	Pertemuan 1	
21/07/2026 09:05:00	2026-07-21	Selasa	Andy Yulianto	download	Mengunduh Source Code Praktikum 1	1	STD-65108053	65108053	1	XI-1	Pertemuan 1	
27/07/2026 10:40:00	2026-07-27	Senin	Andy Yulianto	reading	Membaca Materi Web Component	1	STD-65108053	65108053	1	XI-1	Pertemuan 2	
30/07/2026 08:30:00	2026-07-30	Kamis	Andy Yulianto	discussion	Menanggapi Forum Refleksi Pertemuan 2	1	STD-65108053	65108053	1	XI-1	Pertemuan 2	
02/08/2026 09:15:00	2026-08-02	Minggu	Andy Yulianto	reading	Membaca Modul Konektivitas	1	STD-65108053	65108053	1	XI-1	Pertemuan 3	
05/08/2026 10:20:00	2026-08-05	Rabu	Andy Yulianto	assignment	Menyerahkan Tautan Tugas Proyek	1	STD-65108053	65108053	1	XI-1	Pertemuan 3	
08/08/2026 08:45:00	2026-08-08	Sabtu	Andy Yulianto	download	Unduh Bahan UAS	1	STD-65108053	65108053	1	XI-1	UAS Prognostik	
10/08/2026 09:30:00	2026-08-10	Senin	Andy Yulianto	discussion	Diskusi Persiapan UAS	1	STD-65108053	65108053	1	XI-1	UAS Prognostik	
17/07/2026 07:50:00	2026-07-17	Jumat	Siti Rahmawati	reading	Membaca Modul 1	1	STD-65108054	65108054	2	XI-1	Pertemuan 1	
18/07/2026 09:00:00	2026-07-18	Sabtu	Siti Rahmawati	reading	Membaca Modul 2	1	STD-65108054	65108054	2	XI-1	Pertemuan 1	
22/07/2026 08:25:00	2026-07-22	Rabu	Siti Rahmawati	download	Unduh Slide Pertemuan 2	1	STD-65108054	65108054	2	XI-1	Pertemuan 2	
25/07/2026 10:10:00	2026-07-25	Sabtu	Siti Rahmawati	discussion	Menjawab Pertanyaan Teman	1	STD-65108054	65108054	2	XI-1	Pertemuan 2	
29/07/2026 08:05:00	2026-07-29	Rabu	Siti Rahmawati	reading	Membaca Materi Proyek	1	STD-65108054	65108054	2	XI-1	Pertemuan 3	
31/07/2026 09:45:00	2026-07-31	Jumat	Siti Rahmawati	assignment	Serahkan Tautan Repositori Tugas	1	STD-65108054	65108054	2	XI-1	Pertemuan 3	
04/08/2026 08:20:00	2026-08-04	Selasa	Siti Rahmawati	download	Unduh Contoh Soal UAS	1	STD-65108054	65108054	2	XI-1	UAS Prognostik	
06/08/2026 10:35:00	2026-08-06	Kamis	Siti Rahmawati	discussion	Diskusi Kelompok Persiapan UAS	1	STD-65108054	65108054	2	XI-1	UAS Prognostik	
09/08/2026 09:00:00	2026-08-09	Minggu	Siti Rahmawati	assignment	Mengumpulkan Laporan Proyek Final	1	STD-65108054	65108054	2	XI-1	UAS Prognostik	
19/07/2026 08:15:00	2026-07-19	Minggu	Bima Pratama	reading	Membaca Modul Awal	1	STD-65108055	65108055	3	XI-1	Pertemuan 1	
24/07/2026 09:30:00	2026-07-24	Jumat	Bima Pratama	download	Unduh Modul Praktikum	1	STD-65108055	65108055	3	XI-1	Pertemuan 2	
28/07/2026 08:50:00	2026-07-28	Selasa	Bima Pratama	reading	Membaca Materi UTS	1	STD-65108055	65108055	3	XI-1	UTS Semester Gasal	
02/08/2026 10:00:00	2026-08-02	Minggu	Bima Pratama	reading	Membaca Modul Lanjutan	1	STD-65108055	65108055	3	XI-1	Pertemuan 3	
05/08/2026 08:35:00	2026-08-05	Rabu	Bima Pratama	discussion	Forum Tanya Jawab Tugas	1	STD-65108055	65108055	3	XI-1	Pertemuan 3	
07/08/2026 09:20:00	2026-08-07	Jumat	Bima Pratama	assignment	Serahkan Tautan Tugas Proyek	1	STD-65108055	65108055	3	XI-1	Pertemuan 3	
20/07/2026 08:00:00	2026-07-20	Senin	Dina Lestari	reading	Membaca Modul Harian	1	STD-65108056	65108056	4	XI-1	Pertemuan 1	
28/07/2026 09:10:00	2026-07-28	Selasa	Dina Lestari	discussion	Memberi Komentar Forum	1	STD-65108056	65108056	4	XI-1	Pertemuan 2	
03/08/2026 08:30:00	2026-08-03	Senin	Dina Lestari	download	Unduh Materi Pertemuan 3	1	STD-65108056	65108056	4	XI-1	Pertemuan 3	
21/07/2026 08:05:00	2026-07-21	Selasa	Rizky Ramadhan	reading	Membaca Modul Ringkas	1	STD-65108057	65108057	5	XI-1	Pertemuan 1	
04/08/2026 08:40:00	2026-08-04	Selasa	Rizky Ramadhan	download	Unduh Bahan Belajar	1	STD-65108057	65108057	5	XI-1	Pertemuan 3	
22/07/2026 08:20:00	2026-07-22	Rabu	Nadia Safitri	reading	Membaca Modul Pendahulu	1	STD-65108058	65108058	6	XI-1	Pertemuan 1	
```

### Tab 4: `Akumulasi Nilai Rapor` (Hasil & Nilai Siswa — Mode Siswa)

Backend mengecek tab ini lebih dulu di `action=getScores`. Nilai contoh sudah konsisten
dengan rumus bobot default (Kehadiran×1, UH×3, UTS×2, UAS×2, Skor Sikap×0, Keterampilan×0).

```text
Student ID	NIS	Nama	Absen	Kelas	Jumlah Pertemuan	Rata Aktivitas/Pertemuan	Kehadiran (skala 100)	Rata-rata UH	Skor UTS	Skor UAS	Skor Sikap	Skor Keterampilan	Nilai Akhir	Grade
STD-65108054	65108054	Siti Rahmawati	2	XI-1	5	2	95	86	90	92	80	100	90	A
STD-65108055	65108055	Bima Pratama	3	XI-1	5	1	92	85	88	86	45	100	87	A
STD-65108053	65108053	Andy Yulianto	1	XI-1	5	2	90	80	85	82	65	100	83	B+
STD-65108056	65108056	Dina Lestari	4	XI-1	4	1	85	76	80	82	20	100	80	B+
STD-65108057	65108057	Rizky Ramadhan	5	XI-1	4	1	60	62	65	60	0	100	62	C+
STD-65108058	65108058	Nadia Safitri	6	XI-1	4	0	55	50	55	52	0	100	52	C
```

### Tab 5: `Rangkuman` (Leaderboard & Pantauan Guru — Mode Guru)

Baris diurutkan oleh backend berdasarkan **Rata-rata Skor** tertinggi.

```text
Student ID	NIS	Nama	Absen	Kelas	Total Kuis	Rata-rata Skor	Skor Tertinggi	Skor Terendah	Total Aktivitas	Reading	Quiz Activity	Assignment	Discussion	Download	Kuis Formatif	Kuis Sumatif	Skor UTS	Skor UAS	Jumlah Pertemuan	Status Kuis Terakhir
STD-65108054	65108054	Siti Rahmawati	2	XI-1	5	89	92	86	9	3	5	2	2	2	2	0	90	92	5	LULUS
STD-65108055	65108055	Bima Pratama	3	XI-1	5	86	88	84	6	3	5	1	1	1	2	0	88	86	5	LULUS
STD-65108053	65108053	Andy Yulianto	1	XI-1	5	82	85	78	8	3	5	1	2	2	2	0	85	82	5	LULUS
STD-65108056	65108056	Dina Lestari	4	XI-1	4	80	82	76	3	1	4	0	1	1	1	0	80	82	4	LULUS
STD-65108057	65108057	Rizky Ramadhan	5	XI-1	4	62	65	60	2	1	4	0	0	1	1	0	65	60	4	TIDAK LULUS
STD-65108058	65108058	Nadia Safitri	6	XI-1	4	53	55	50	1	1	4	0	0	0	1	0	55	52	4	TIDAK LULUS
```

### Tab 6 (Opsional): `Bank Soal` — Generator Soal MC

Kolom `Detail` berisi JSON: `{"choices":[...],"correctIndex":n}`.

```text
ID	Kategori	Tipe	Soal	Detail	Gambar	Poin
B1	campur	mc	Apa kegunaan utama metode connectedCallback pada LitElement?	{"choices":["Menginisialisasi nilai variabel dasar","Mendeteksi elemen saat berhasil diinjeksikan ke struktur DOM","Menghapus event listener global"],"correctIndex":1}		1
B2	campur	mc	Bagaimana cara mencegah timeout 6 menit pada Google Apps Script?	{"choices":["Menggunakan penulisan masal berbasis batch I/O","Menulis ke banyak sheet terpisah","Memperbanyak rumus formula cell"],"correctIndex":0}		1
B3	campur	mc	Mana atribut HTML yang benar untuk URL backend pada dasbor-kuis?	{"choices":["apps-script-url","url-backend","api-endpoint"],"correctIndex":0}		1
```

### Tab 7 (Opsional): `Nilai Manual` — UTS/UAS Input Guru

```text
Student ID	Kategori	Skor
STD-65108057	uts	66
STD-65108057	uas	62
STD-65108058	uts	58
```

### Tab 8 (Opsional): `db_kehadiran` — Absensi Lengkap 100%

```text
Timestamp	Tanggal	Nama	Student ID	NIS	Absen	Kelas	Kode Materi	Kehadiran (%)	Status	Kriteria
11/08/2026 08:00:00	2026-08-11	Andy Yulianto	STD-65108053	65108053	1	XI-1	Pertemuan 1	100	LENGKAP	reading+quiz+forum
11/08/2026 08:00:00	2026-08-11	Siti Rahmawati	STD-65108054	65108054	2	XI-1	Pertemuan 1	100	LENGKAP	reading+quiz+forum
11/08/2026 08:00:00	2026-08-11	Bima Pratama	STD-65108055	65108055	3	XI-1	Pertemuan 1	100	LENGKAP	reading+quiz+forum
11/08/2026 08:00:00	2026-08-11	Dina Lestari	STD-65108056	65108056	4	XI-1	Pertemuan 1	100	LENGKAP	reading+quiz+forum
11/08/2026 08:00:00	2026-08-11	Rizky Ramadhan	STD-65108057	65108057	5	XI-1	Pertemuan 1	66	PROSES	reading+download
11/08/2026 08:00:00	2026-08-11	Nadia Safitri	STD-65108058	65108058	6	XI-1	Pertemuan 1	33	PROSES	reading
```

---

## 4. Catatan Format Penting

- **Urutan kolom wajib sama persis** dengan header di atas — backend membaca kolom
  berdasarkan *indeks tetap*, bukan nama header.
- `Timestamp`: `dd/MM/yyyy HH:mm:ss` • `Date`/`Tanggal`: `yyyy-MM-dd` (2026-08-11).
- `Status` kuis: `LULUS` jika skor ≥ 70, selain itu `TIDAK LULUS`.
- Kategori kuis di `db_nilai`: `formatif`, `ulangan_harian`, `uts`, `uas`, `sumatif`.
- Ti­pe aktivitas di `db_aktivitas`: `reading`, `quiz`, `discussion`, `download`, `assignment`.
- Jika Google Sheets mengubah tanggal jadi format lain saat paste, tidak masalah untuk
  `Timestamp`, tetapi pastikan kolom `Date`/`Tanggal` tetap berbentuk teks `yyyy-MM-dd`.
- `getActivityHistory` hanya melihat 28 hari terakhir dari kolom `Tanggal` — data contoh
  sudah dibuat mundur dari tanggal 11 Agustus 2026.
- Batas backend: reading maksimal 15× per siswa; **total aktivitas non-kuis maksimal 50× per siswa**.
  Kirim kuis (tipe `quiz`) **tidak dibatasi** — skor kuis selalu diterima dan tidak memakai kuota 50×.
- **Anti Double-Entry (idempotensi):** Setiap aktivitas/kuis membawa `id_log`
  (`LOG-<timestamp>-<hex crypto>`). Backend mevalidasi kolom `ID Log`
  (`db_aktivitas` & `db_nilai`) — bila `id_log` **sudah ada**, tulis ditekan
  secara diam-diam (silent ignore). Baris identik pun ditolak lewat sidik jari
  kolom `Tanggal + Tipe + Deskripsi + Kode Materi + Student ID`, jadi retry
  jaringan / banyak instance `<dasbor-kuis>` di satu halaman **tidak** membuat
  baris rangkap.
- Kolom `ID Log` opsional saat paste — backend otomatis menambahkan header
  `ID Log` di akhir baris 1 jika belum ada.

## 5. Verifikasi Cepat (setelah deploy /exec)

Ganti `YOUR_URL` dengan URL hasil deploy, buka di browser:

- `YOUR_URL?action=leaderboard` → 6 siswa, Siti Rahmawati teratas (89).
- `YOUR_URL?action=getStudentRoster` → roster + status aktivitas tiap siswa.
- `YOUR_URL?action=getScores&studentId=STD-65108053` → hasil Andy (Nilai Akhir 83, B+).
- `YOUR_URL?action=getActivityHistory&studentId=STD-65108053&days=28` → 8 hari aktif.
- Login demo: `action=login&nis=65108057&email=rizky.ramadhan23@gmail.com` → berhasil.

Lalu buka `npm start` di folder `elements/dasbor-kuis`, atur `apps-script-url` dan
`mode="guru"` / `mode="siswa"` → semua tampilan terisi data.