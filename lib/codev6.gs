/**
 * codev6.gs - Backend V6 Dasbor Evaluasi Terintegrasi (dasbor-kuis)
 *            Upgrade Kurikulum Merdeka
 *
 * PERUBAHAN UTAMA DARI V5:
 *   1. Pemisahan progres (formatif) dari rapor (sumatif). Formatif HANYA
 *      memberi makan progres, TIDAK pernah masuk rumus rapor.
 *   2. Rumus rapor baru: (Rerata Sumatif LM x 0,6) + (SAS x 0,4).
 *   3. "Skor Sikap" numerik diganti "Catatan Anekdot / Observasi Karakter"
 *      yang bersifat deskriptif.
 *   4. "lulus/tidak" diganti interval pencapaian:
 *        Mencapai TP   (>= 75)
 *        Perlu Pengayaan (>= 60)
 *        Perlu Remedial (< 60)
 *
 * Kontrak aksi (GET, ramah CORS):
 *   getStudentRoster&kelas=XI-1     -> {status:"ok", roster:[...], total:N}
 *   getScores&studentId=STD-...      -> {status:"ok", data:{...}}
 *   getLeaderboard&kelas=XI-1        -> {status:"ok", leaderboard:[...]}
 *   getActivityHistory&studentId=..  -> {status:"ok", history:[{date,count}]}
 *   register|login|verify|generateReport|initSheets
 *
 * Kontrak aksi (POST, body JSON {action, payload}):
 *   simpanNilaiAkademik -> payload {student_id,nama,kelas,lm1..lm5,rerata_lm,sas,nilai_rapor,deskripsi_capaian}
 *   simpanAnekdotSikap  -> payload {student_id,nama,tanggal,dimensi,catatan}
 *   updatePresensi      -> payload {student_id,nama,kelas,sakit,izin,tanpa_keterangan}
 *   generateReport      -> bangun ulang Akumulasi_Nilai_Rapor (Kurikulum Merdeka)
 *   register|login|verify -> stub kompatibel
 *
 * ANTIDOBEL-ENTRI: seluruh penulisan diserialkan dengan
 * LockService.getScriptLock() + SpreadsheetApp.flush() selagi lock dipegang.
 *
 * Struktur sheet wajib (auto-create via SHEET_SPECS):
 *   Users | db_asesmen | db_aktivitas | db_kehadiran | Akumulasi_Nilai_Rapor
 *   Catatan_Anekdot_Sikap | Presensi_Administratif
 *   (opsional: Bank Soal, Nilai Manual, Forum Log, Tugas Log, Rangkuman)
 * Script ini DIPASANG sebagai project terikat spreadsheet (getActiveSpreadsheet).
 */

const SHEET_USERS = "Users";
const SHEET_ASESMEN = "db_asesmen";          // RENAME dari db_nilai (v5)
const SHEET_AKTIVITAS = "db_aktivitas";
const SHEET_KEHADIRAN = "db_kehadiran";
const SHEET_RAPOR = "Akumulasi_Nilai_Rapor";
const SHEET_ANEKDOT = "Catatan_Anekdot_Sikap";
const SHEET_PRESENSI = "Presensi_Administratif";
const SHEET_BANK = "Bank Soal";
const SHEET_MANUAL = "Nilai Manual";
const SHEET_FORUM = "Forum Log";
const SHEET_TUGAS = "Tugas Log";
const SHEET_RANGKUMAN = "Rangkuman";         // sheet lama (hanya toleransi baca)
const SHEET_KUIS_SESSION = "db_kuis_session"; // Log sesi kuis (waktu, status)
const SHEET_SETTINGS = "Settings";           // Pengaturan bobot & konfigurasi

/** MAX_LM: Jumlah maksimal kolom LM yang didukung (dynamic column). */
const MAX_LM = 10;

/** Default bobot nilai (bisa diubah lewat UI Settings).
 *  Keterampilan melekat di TP — tidak dipisah.
 *  Rumus: Nilai_Rapor = (Σ LM_i × bobot + STS × bobot_sts + SAS × bobot_sas) / Σ bobot */
const DEFAULT_BOBOT = {
  tugas: 1,
  lm: 3,
  sts: 2,
  sas: 2,
};

/** Build headers dynamic untuk sheet Akumulasi_Nilai_Rapor. Absen+NIS fisik setelah Kelas (auto-migrasi via _jaminSheet). */
function _buildRaporHeaders() {
  const headers = ["Timestamp", "StudentID", "Nama", "Kelas", "Absen", "NIS"];
  for (let i = 1; i <= MAX_LM; i++) headers.push("LM" + i);
  headers.push("Rerata_LM", "STS", "SAS", "Nilai_Rapor", "Interval_Capaian", "Deskripsi_Capaian");
  return headers;
}

/** Spesifikasi nama sheet -> baris header. SHEET_SPECS menggunakan function untuk dynamic column. */
const SHEET_SPECS = {
  [SHEET_USERS]: ["StudentID", "NIS", "Nama", "Email", "Absen", "Kelas", "RegisteredAt", "LastLogin"],
  [SHEET_AKTIVITAS]: ["Timestamp", "Tanggal", "Hari", "Nama", "Tipe Aktivitas", "Deskripsi", "Count", "Student ID", "NIS", "Absen", "Kelas", "Kode Materi", "ID Log"],
  [SHEET_ASESMEN]: ["Timestamp", "Date", "Kode LM", "Nama TP", "Kategori", "Skor Tulis", "Skor Performa", "Student ID", "NIS", "Absen", "Kelas", "ID Log"],
  [SHEET_RANGKUMAN]: ["Student ID", "NIS", "Nama", "Absen", "Kelas", "Total Kuis", "Rata-rata Skor", "Skor Tertinggi", "Skor Terendah", "Total Aktivitas", "Reading", "Quiz Activity", "Assignment", "Discussion", "Download", "Kuis Formatif", "Kuis Sumatif", "Skor UTS", "Skor UAS", "Jumlah Pertemuan", "Status Kuis Terakhir"],
  [SHEET_RAPOR]: _buildRaporHeaders(),
  [SHEET_ANEKDOT]: ["Timestamp", "StudentID", "Nama", "Tanggal_Observasi", "Dimensi_Pancasila", "Catatan_Perilaku"],
  [SHEET_PRESENSI]: ["StudentID", "Nama", "Kelas", "Sakit", "Izin", "Tanpa_Keterangan"],
  [SHEET_BANK]: ["ID", "Kategori", "Tipe", "Detail", "Soal", "Poin", "Kode Materi"],
  // alias: Kategori == Kode Materi/LM (LM1..LMn). Per sel: Kolom Soal = 1 JSON soal (bukan array)
  [SHEET_MANUAL]: ["Student ID", "Kategori", "Skor"],
  [SHEET_KEHADIRAN]: ["Timestamp", "Tanggal", "Nama", "Student ID", "NIS", "Absen", "Kelas", "Kode Materi", "Kehadiran (%)", "Status", "Kriteria"],
  [SHEET_FORUM]: ["Timestamp", "CommentID", "ParentID", "UserName", "StudentID", "Text", "Sheet", "Action", "Likes", "kdMateri", "NIS", "Absen", "Kelas"],
  [SHEET_TUGAS]: ["Timestamp", "StudentID", "Nama", "Sheet", "Title", "Content", "Link", "kdMateri", "NIS", "Absen", "Kelas"],
  [SHEET_KUIS_SESSION]: ["Timestamp", "StudentID", "Nama", "NIS", "Absen", "Kelas", "Kode Materi", "Waktu Mulai", "Waktu Selesai", "Durasi (detik)", "Durasi Ulangan (detik)", "Sisa Waktu (detik)", "Tab Switch Count", "Window Blur Count", "Session Token", "Answer Timings", "Status", "Catatan"],
  [SHEET_SETTINGS]: ["Key", "Value", "UpdatedAt"],
};

const BATAS_READING = 15;
const BATAS_AKTIVITAS = 50;
const HARI_RIWAYAT = 28;
const BOBOT_LM = 0.6;   // bobot Rerata Sumatif LM (Kurikulum Merdeka)
const BOBOT_SAS = 0.4;  // bobot SAS (Sumatif Akhir Semester)
const AMBANG_MENCAPAI_TP = 75;
const AMBANG_PENGAYAAN = 60;

const _ss = () => SpreadsheetApp.getActiveSpreadsheet();

/** Baca sheet -> {rows:[...], header:{namaKolom:indeks}}; kosong -> null */
function _sheet(name) {
  const sheet = _ss().getSheetByName(name);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  if (!data.length) return null;
  const header = {};
  data[0].forEach((h, i) => (header[String(h).trim()] = i));
  return { rows: data.slice(1), header };
}

const _val = (r, h, key, def = "") => (h[key] !== undefined ? r[h[key]] : def);
const _num = (v, def = 0) => {
  const n = parseFloat(v);
  return isNaN(n) ? def : n;
};
const _bulat = (v) => Math.round(_num(v));
const _teks = (v) => String(v == null ? "" : v).trim();

/* ------------------------------------------------------------------ */
/* BOBOT NILAI (Configurable via Settings sheet)                      */
/* ------------------------------------------------------------------ */

/** Bobot keys yang valid untuk disimpan/dibaca dari Settings. */
const BOBOT_KEYS = ["tugas", "lm", "sts", "sas"];

/** Baca bobot dari sheet Settings, fallback ke DEFAULT_BOBOT. */
function _bacaBobot() {
  const sheet = _ss().getSheetByName(SHEET_SETTINGS);
  const bobot = { ...DEFAULT_BOBOT };
  if (!sheet || sheet.getLastRow() < 2) return bobot;
  const data = sheet.getDataRange().getValues();
  const header = data[0].map((h) => String(h).trim());
  const idxKey = header.indexOf("Key");
  const idxVal = header.indexOf("Value");
  if (idxKey < 0 || idxVal < 0) return bobot;
  for (let i = 1; i < data.length; i++) {
    const key = _teks(data[i][idxKey]);
    const val = _num(data[i][idxVal], -1);
    if (key && val >= 0 && BOBOT_KEYS.includes(key)) {
      bobot[key] = val;
    }
  }
  return bobot;
}

/** Simpan bobot ke sheet Settings (upsert by Key). */
function _simpanBobot(bobot) {
  const sheet = _jaminSheet(SHEET_SETTINGS, ["Key", "Value", "UpdatedAt"]);
  const data = sheet.getDataRange().getValues();
  const header = data[0].map((h) => String(h).trim());
  const idxKey = header.indexOf("Key");
  const idxVal = header.indexOf("Value");
  const idxUpdated = header.indexOf("UpdatedAt");
  const now = new Date().toISOString();
  Object.keys(bobot).forEach((key) => {
    if (!BOBOT_KEYS.includes(key)) return;
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (_teks(data[i][idxKey]) === key) {
        sheet.getRange(i + 1, idxVal + 1).setValue(bobot[key]);
        if (idxUpdated >= 0) sheet.getRange(i + 1, idxUpdated + 1).setValue(now);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, bobot[key], now]);
    }
  });
  SpreadsheetApp.flush();
  return { status: "ok", message: "Bobot tersimpan.", bobot };
}

const _tglStr = (d) => Utilities.formatDate(new Date(d), "GMT+7", "yyyy-MM-dd");
const _hariNama = (d) =>
  ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date(d).getDay()];

/** Bentuk respon JSON standar (mirip _ok di v5; di sini dinamakan createJsonResponse). */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
const _ok = createJsonResponse; // alias kompatibilitas
function _err(message) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "error", message: String(message) }),
  ).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* IDEMPOTENSI (Anti Double-Entry)                                     */
/* ------------------------------------------------------------------ */

/** Pastikan kolom `namaKolom` ada di baris 1; kembalikan indeks 1-based. */
function _jaminKolom(sheet, namaKolom) {
  const header = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map((h) => String(h).trim());
  let idx = header.indexOf(namaKolom) + 1;
  if (!idx) {
    idx = header.length + 1;
    sheet.getRange(1, idx).setValue(namaKolom);
  }
  return idx;
}

/** Pastikan sheet `nama` ada dengan baris header `headers` (auto-create pertama kali). */
function _jaminSheet(nama, headers) {
  const ss = _ss();
  let sheet = ss.getSheetByName(nama);
  if (!sheet) {
    sheet = ss.insertSheet(nama);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#6750a4").setFontColor("white");
  } else if (sheet.getLastRow() < 1) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#6750a4").setFontColor("white");
  } else {
    const currentColCount = sheet.getLastColumn();
    if (currentColCount < headers.length) {
      const existingHeaders = sheet.getRange(1, 1, 1, currentColCount).getValues()[0].map((h) => String(h).trim());
      const missing = headers.filter((h) => !existingHeaders.includes(h));
      if (missing.length > 0) {
        sheet.getRange(1, currentColCount + 1, 1, missing.length).setValues([missing]);
        sheet.getRange(1, currentColCount + 1, 1, missing.length).setFontWeight("bold");
      }
    }
  }
  SpreadsheetApp.flush();
  return sheet;
}

/** Cek apakah `nilai` sudah ada di kolom `idx` sheet. */
function _kolomBerisi(sheet, idx, nilai) {
  if (!sheet || idx <= 0 || !nilai || sheet.getLastRow() < 2) return false;
  return sheet
    .getRange(2, idx, sheet.getLastRow() - 1, 1)
    .getValues()
    .some((r) => _teks(r[0]) === _teks(nilai));
}

/** Cek apakah ada baris identik (semua kolom `cols` bernilai `vals`). */
function _barisIdentikAda(sheet, cols, vals) {
  if (!sheet || sheet.getLastRow() < 2 || cols.some((c) => c <= 0)) return false;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return data.some((r) => cols.every((c, i) => _teks(r[c - 1]) === _teks(vals[i])));
}

/** Hapus baris duplikat persis (keep-pertama) pada sheet namaSheet. */
function _hapusDuplikatSheet(namaSheet) {
  const sheet = _ss().getSheetByName(namaSheet);
  if (!sheet) return 0;
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  const seen = {};
  const baris = [data[0]];
  let hilang = 0;
  data.slice(1).forEach((r) => {
    const key = r.map((cell) => String(cell).trim()).join("||");
    if (seen[key]) { hilang += 1; return; }
    seen[key] = true;
    baris.push(r);
  });
  if (hilang > 0) {
    sheet.clearContents();
    const lebar = baris[0].length;
    sheet.getRange(1, 1, baris.length, Math.max(1, lebar)).setValues(baris);
  }
  return hilang;
}

/** Jalankan `fn` dengan script lock; flush spreadsheet SEBELUM lock dilepas. */
function _denganLock(fn, namaOperasi) {
  const lock = LockService.getScriptLock();
  const dapet = lock.tryLock(15000);
  if (!dapet) {
    return {
      status: "error",
      message: "Operasi '" + (namaOperasi || "") + "' sedang padat (lock timeout 15 detik). Coba lagi.",
    };
  }
  try {
    const hasil = fn();
    SpreadsheetApp.flush();
    return hasil;
  } finally {
    lock.releaseLock();
  }
}

/** Hapus baris rangkap yang punya `idLog` sama (keep-pertama) pada kolom idx. */
function _potongDuplikatIdLog(sheet, idx, idLog) {
  if (!sheet || idx <= 0 || !idLog || sheet.getLastRow() < 2) return 0;
  const total = sheet.getLastRow() - 1;
  const vals = sheet.getRange(2, idx, total, 1).getValues();
  let hitung = 0;
  const hapus = [];
  vals.forEach((v, i) => {
    if (_teks(v[0]) === _teks(idLog)) {
      hitung += 1;
      if (hitung > 1) hapus.push(i + 2);
    }
  });
  hapus.reverse().forEach((r) => sheet.deleteRow(r));
  return hapus.length;
}

/** Pangkas seluruh baris rangkap berdasarkan kolom `ID Log` pada sheet. */
function _hapusDuplikatByIdLog(namaSheet) {
  const sheet = _ss().getSheetByName(namaSheet);
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map((h) => String(h).trim());
  const cIdLog = header.indexOf("ID Log") + 1;
  if (cIdLog <= 0) return _hapusDuplikatSheet(namaSheet);
  const total = sheet.getLastRow() - 1;
  const data = sheet.getRange(2, 1, total, sheet.getLastColumn()).getValues();
  const seen = {};
  let hilang = 0;
  const hapus = [];
  data.forEach((r, i) => {
    const kunci = _teks(r[cIdLog - 1]);
    if (!kunci) return;
    if (seen[kunci]) hapus.push(i + 2);
    else seen[kunci] = true;
  });
  hapus.reverse().forEach((r) => sheet.deleteRow(r));
  hilang = hapus.length;
  if (hilang) SpreadsheetApp.flush();
  return hilang;
}

/* ================================================================== */
/* MESIN PERHITUNGAN MURNI (Kurikulum Merdeka)                        */
/* Fungsi-fungsi di bawah murni (tanpa efek samping ke sheet).        */
/* ================================================================== */

/**
 * Proses nilai per Lingkup Materi (LM) dari daftar asesmen sumatif LM.
 * @param {Array} daftarLM - [{id_lm, nama_tp, skor_tulis, skor_performa}]
 * @return {Array} [{id_lm, nama_tp, nilai_akhir_lm}]
 *   nilai_akhir_lm = Math.round((skor_tulis + skor_performa) / 2)
 */
function procesNilaiLingkupMateri(daftarLM) {
  return (daftarLM || []).map((lm) => ({
    id_lm: _teks(lm.id_lm),
    nama_tp: _teks(lm.nama_tp),
    kategori: _teks(lm.kategori || "sumatif_lm"),
    nilai_akhir_lm: Math.round((_num(lm.skor_tulis) + _num(lm.skor_performa)) / 2),
  }));
}

/**
 * Hitung rapor — semua komponen (tulis + keterampilan/performa) sudah di dalam LM.
 * Rumus: Nilai_Rapor = (Σ LM_i × bobot_i + STS × bobot_sts + SAS × bobot_sas) / Σ bobot
 * @param {Array} daftarLM - [{id_lm, nama_tp, kategori, nilai_akhir_lm}]
 * @param {number} nilaiSAS - Nilai Sumatif Akhir Semester
 * @param {number} nilaiSTS - Nilai Sumatif Tengah Semester
 * @param {Object} bobot - {lm, sts, sas, tugas}
 */
function hitungRaporKurikulumMerdeka(daftarLM, nilaiSAS, nilaiSTS, bobot) {
  const b = bobot || DEFAULT_BOBOT;
  const list = daftarLM || [];
  const sas = _num(nilaiSAS);
  const sts = _num(nilaiSTS);

  let totalBobot = 0;
  let totalSkor = 0;

  list.forEach((d) => {
    const kategori = _teks(d.kategori || "sumatif_lm").toLowerCase();
    let bm = b.lm;
    if (kategori.includes("formatif") || kategori.includes("tugas")) bm = b.tugas;
    const skor = _num(d.nilai_akhir_lm);
    totalSkor += skor * bm;
    totalBobot += bm;
  });

  if (sts > 0) { totalSkor += sts * b.sts; totalBobot += b.sts; }
  if (sas > 0) { totalSkor += sas * b.sas; totalBobot += b.sas; }

  const rerataLM = list.length ? list.reduce((s, d) => s + _num(d.nilai_akhir_lm), 0) / list.length : 0;
  const nilaiAkhirRapor = totalBobot > 0 ? Math.round(totalSkor / totalBobot) : 0;

  let tpHighest = null;
  let tpLowest = null;
  list.forEach((d) => {
    if (!tpHighest || _num(d.nilai_akhir_lm) > _num(tpHighest.nilai_akhir_lm)) tpHighest = d;
    if (!tpLowest || _num(d.nilai_akhir_lm) < _num(tpLowest.nilai_akhir_lm)) tpLowest = d;
  });
  const namaTinggi = tpHighest ? tpHighest.nama_tp : "seluruh tujuan pembelajaran";
  const namaRendah = tpLowest ? tpLowest.nama_tp : "seluruh tujuan pembelajaran";
  const deskripsi_capaian = `Menunjukkan penguasaan yang sangat baik dalam ${namaTinggi}. Perlu pendampingan dan peningkatan dalam ${namaRendah}.`;

  return {
    rerata_lm: Math.round(rerataLM),
    nilai_sas: sas,
    nilai_sts: sts,
    nilai_akhir_rapor: nilaiAkhirRapor,
    deskripsi_capaian,
    detail_per_lm: list,
  };
}

const DEFAULT_CATATAN_SIKAP =
  "Belum ada catatan observasi karakter yang terekam untuk peserta didik ini.";

/**
 * Rangkum catatan anekdot/observasi karakter menjadi teks deskriptif.
 * @param {Array} catatanAnekdot - [{dimensi_pancasila, perilaku}]
 */
function rangkumCatatanSikap(catatanAnekdot) {
  if (!catatanAnekdot || !catatanAnekdot.length) return DEFAULT_CATATAN_SIKAP;
  const listPerilaku = catatanAnekdot.map(
    (c) => `pada dimensi ${_teks(c.dimensi_pancasila)}, ananda ${_teks(c.perilaku).toLowerCase()}`,
  );
  return `Secara umum, peserta didik berkembang sangat baik. Terlihat dari catatan observasi bahwa ${listPerilaku.join("; serta ")}.`;
}

/**
 * Tentukan interval pencapaian berdasarkan nilai rapor.
 * >= 75 -> Mencapai TP ; >= 60 -> Perlu Pengayaan ; < 60 -> Perlu Remedial.
 */
function tentukanIntervalCapaian(nilai) {
  const n = _num(nilai);
  if (n >= AMBANG_MENCAPAI_TP) return "Mencapai TP";
  if (n >= AMBANG_PENGAYAAN) return "Perlu Pengayaan";
  return "Perlu Remedial";
}

/**
 * Susun laporan siswa (komposisi objek siap kirim ke klien).
 * @param {Object} dataInput - {identitas, akademik, karakter_sikap, rekap_presensi}
 */
function generateLaporanSiswa(dataInput) {
  const d = dataInput || {};
  const identitas = d.identitas || {};
  const akademik = d.akademik || {};
  const karakter = d.karakter_sikap || "";
  const presensi = d.rekap_presensi || {};
  return {
    identitas: {
      student_id: _teks(identitas.student_id || identitas.studentId || ""),
      nama: _teks(identitas.nama || ""),
      kelas: _teks(identitas.kelas || ""),
      nis: _teks(identitas.nis || ""),
    },
    akademik: {
      nilai_angka: _num(akademik.nilai_angka),
      capaian_kompetensi: _teks(akademik.capaian_kompetensi || ""),
      rincian_bab: Array.isArray(akademik.rincian_bab) ? akademik.rincian_bab : [],
    },
    karakter_sikap: _teks(karakter),
    rekap_presensi: {
      sakit: `${_num(presensi.sakit)} hari`,
      izin: `${_num(presensi.izin)} hari`,
      tanpa_keterangan: `${_num(presensi.tanpa_keterangan)} hari`,
    },
  };
}

/* ================================================================== */
/* GET: DAAFTAR SISWA, NILAI, LEADERBOARD, RIWAYAT AKTIVITAS           */
/* ================================================================== */

function getStudentRoster(kelasTarget) {
  const users = _sheet(SHEET_USERS);
  const akt = _sheet(SHEET_AKTIVITAS);
  const rapor = _sheet(SHEET_RAPOR);

  const hitung = {};
  if (akt) {
    akt.rows.forEach((r) => {
      const sid = _teks(_val(r, akt.header, "Student ID"));
      if (!sid) return;
      if (!hitung[sid]) hitung[sid] = { total: 0, reading: 0 };
      const tipe = _teks(_val(r, akt.header, "Tipe Aktivitas")).toLowerCase();
      if (tipe === "quiz") return;
      if (tipe === "reading" && hitung[sid].reading >= BATAS_READING) return;
      if (hitung[sid].total >= BATAS_AKTIVITAS) return;
      hitung[sid].total += 1;
      if (tipe === "reading") hitung[sid].reading += 1;
    });
  }

  const statusAktivitas = (total) => {
    if (total >= 8) return { statusAktivitas: "Aktif", emoji: "??" };
    if (total >= 3) return { statusAktivitas: "Kurang Konsisten", emoji: "??" };
    if (total >= 1) return { statusAktivitas: "Minim", emoji: "??" };
    return { statusAktivitas: "Belum Ada Aktivitas", emoji: "??" };
  };

  const roster = [];
  if (users) {
    users.rows.forEach((r) => {
      const studentId = _teks(_val(r, users.header, "StudentID"));
      const kelas = _teks(_val(r, users.header, "Kelas"));
      if (kelasTarget && kelas.toLowerCase() !== _teks(kelasTarget).toLowerCase()) return;
      const total = hitung[studentId] ? hitung[studentId].total : 0;
      const st = statusAktivitas(total);
      let nilai = { nilaiRapor: 0, sas: 0, rerataLM: 0, sts: 0, intervalCapaian: "-" };
      if (rapor) {
        const baris = rapor.rows.find((rr) => _teks(_val(rr, rapor.header, "StudentID")) === studentId);
        if (baris) {
          nilai = {
            nilaiRapor: _num(_val(baris, rapor.header, "Nilai_Rapor")),
            sas: _num(_val(baris, rapor.header, "SAS")),
            rerataLM: _num(_val(baris, rapor.header, "Rerata_LM")),
            sts: _num(_val(baris, rapor.header, "STS")),
            intervalCapaian: _teks(_val(baris, rapor.header, "Interval_Capaian", "-")),
          };
        }
      }
      roster.push({
        studentId,
        nama: _teks(_val(r, users.header, "Nama")),
        nis: _teks(_val(r, users.header, "NIS")),
        absen: _teks(_val(r, users.header, "Absen")),
        kelas,
        totalActivities: total,
        ...st,
        logAktivitas: total + " aktivitas",
        ...nilai,
      });
    });
  }
  return { roster, total: roster.length };
}

function getScores(studentId) {
  const sid = _teks(studentId);
  const rapor = _sheet(SHEET_RAPOR);
  if (!rapor || !sid) {
    return { data: null, message: "Belum ada data rapor (Akumulasi_Nilai_Rapor)." };
  }
  const baris = rapor.rows.find((rr) => _teks(_val(rr, rapor.header, "StudentID")) === sid);
  if (!baris) {
    return { data: null, message: "Belum ada data rapor untuk " + (sid || "siswa ini") + "." };
  }
  const lmArr = [];
  for (let i = 1; i <= MAX_LM; i++) {
    const col = "LM" + i;
    if (rapor.header[col] !== undefined) lmArr.push(_num(_val(baris, rapor.header, col)));
  }
  // buang trailing kosong agar tidak tampil 10 kolom kosong
  while (lmArr.length > 0 && !lmArr[lmArr.length - 1]) lmArr.pop();
  if (lmArr.length === 0) {
    // fallback legacy 5 kolom
    for (let i = 1; i <= 5; i++) lmArr.push(_num(_val(baris, rapor.header, "LM" + i)) || 0);
    while (lmArr.length > 0 && !lmArr[lmArr.length - 1]) lmArr.pop();
  }
  const data = {
    studentId: sid,
    nama: _teks(_val(baris, rapor.header, "Nama")),
    kelas: _teks(_val(baris, rapor.header, "Kelas")),
    lm: lmArr,
    rerataLM: _num(_val(baris, rapor.header, "Rerata_LM")),
    sts: _num(_val(baris, rapor.header, "STS")),
    sas: _num(_val(baris, rapor.header, "SAS")),
    nilaiRapor: _num(_val(baris, rapor.header, "Nilai_Rapor")),
    intervalCapaian: _teks(_val(baris, rapor.header, "Interval_Capaian")),
    deskripsiCapaian: _teks(_val(baris, rapor.header, "Deskripsi_Capaian")),
  };
  return { data };
}

function getLeaderboard(kelasTarget) {
  let sheet = _sheet(SHEET_RAPOR);
  let sumber = SHEET_RAPOR;
  if (!sheet) {
    sheet = _sheet(SHEET_RANGKUMAN);
    sumber = SHEET_RANGKUMAN;
  }
  if (!sheet || !sheet.rows.length) {
    return { leaderboard: [], message: "Sheet " + sumber + " kosong" };
  }
  const kunciSkor = sheet.header["Nilai_Rapor"] !== undefined ? "Nilai_Rapor" : "Rata-rata Skor";
  const list = sheet.rows
    .filter((r) => {
      if (!kelasTarget) return true;
      return _teks(_val(r, sheet.header, "Kelas")).toLowerCase() === _teks(kelasTarget).toLowerCase();
    })
    .map((r) => {
      const row = {};
      Object.keys(sheet.header).forEach((k) => (row[k] = r[sheet.header[k]]));
      return row;
    });
  list.sort((a, b) => _num(b[kunciSkor]) - _num(a[kunciSkor]));
  return { leaderboard: list, sumber };
}

function getActivityHistory(studentId, kdMateri, days) {
  const sid = _teks(studentId);
  const akt = _sheet(SHEET_AKTIVITAS);
  const jumlahHari = Math.max(1, Math.min(365, _num(days, HARI_RIWAYAT)));
  if (!akt) return { history: [] };

  const batasAwal = new Date();
  batasAwal.setDate(batasAwal.getDate() - (jumlahHari - 1));
  const batasAwalStr = _tglStr(batasAwal);
  const peta = {};

  akt.rows.forEach((r) => {
    if (sid && _teks(_val(r, akt.header, "Student ID")) !== sid) return;
    const tgl = _teks(_val(r, akt.header, "Tanggal"));
    if (!tgl) return;
    const unix = new Date(tgl);
    if (isNaN(unix.getTime())) return;
    if (_teks(tgl) < batasAwalStr) return;
    if (kdMateri && _teks(_val(r, akt.header, "Kode Materi")) !== _teks(kdMateri)) return;

    if (!peta[tgl]) peta[tgl] = { date: tgl, day: _hariNama(unix), count: 0, items: [] };
    peta[tgl].count += _num(_val(r, akt.header, "Count"), 1);
    peta[tgl].items.push({
      tipe: _teks(_val(r, akt.header, "Tipe Aktivitas")),
      deskripsi: _teks(_val(r, akt.header, "Deskripsi")),
    });
  });

  const history = Object.values(peta).sort((a, b) => (a.date < b.date ? -1 : 1));
  return { history };
}

/* Opsi B: Kalender gabung 4 sheet — 15 hari/LM, hadir/tugas meski db_aktivitas hanya kuis */
function getCalendar(params) {
  const sid = _teks(params.studentId || params.student_id || "");
  const kelasTarget = _teks(params.kelas || "");
  const kdFilter = _teks(params.kdMateri || params.kodeMateri || "");
  // 15 hari per LM: LM1=1-15, LM2=16-30, dst. Untuk tanggal, LM = floor((day-1)/15)+1
  const lmForDay = (day) => `LM${Math.floor((day - 1) / 15) + 1}`;
  const akt = _sheet(SHEET_AKTIVITAS);
  const hadirSheet = _sheet(SHEET_KEHADIRAN);
  const tugasSheet = _sheet(SHEET_TUGAS);
  const asesmenSheet = _sheet(SHEET_ASESMEN);
  const peta = {}; // date -> {date, LM, kuis, hadir, tugas, count}
  const ensure = (tglStr) => {
    if (!peta[tglStr]) {
      const d = new Date(tglStr); const day = isNaN(d.getTime()) ? 1 : d.getDate();
      peta[tglStr] = { date: tglStr, LM: lmForDay(day), kuis: 0, hadir: 0, tugas: 0, count: 0, items: [] };
    }
    return peta[tglStr];
  };
  const matchKelas = (kelasRow) => !kelasTarget || _teks(kelasRow).toLowerCase() === kelasTarget.toLowerCase();
  const matchLM = (lm) => !kdFilter || _teks(lm).toLowerCase() === kdFilter.toLowerCase() || _teks(lm).toLowerCase() === _teks(kdFilter).toLowerCase().replace("pertemuan","lm").trim();
  if (akt) akt.rows.forEach((r)=>{
    if (sid && _teks(_val(r, akt.header, "Student ID")) !== sid) return;
    if (!matchKelas(_val(r, akt.header, "Kelas"))) return;
    const tgl = _teks(_val(r, akt.header, "Tanggal")); if (!tgl) return;
    const lm = _teks(_val(r, akt.header, "Kode Materi")) || lmForDay(new Date(tgl).getDate());
    if (!matchLM(lm)) return;
    const e = ensure(tgl); e.kuis += _num(_val(r, akt.header, "Count"),1); e.count += _num(_val(r, akt.header, "Count"),1);
    e.items.push({ tipe: "kuis", deskripsi: _teks(_val(r, akt.header, "Deskripsi")) });
  });
  if (hadirSheet) hadirSheet.rows.forEach((r)=>{
    if (sid && _teks(_val(r, hadirSheet.header, "Student ID")) !== sid) return;
    if (!matchKelas(_val(r, hadirSheet.header, "Kelas"))) return;
    const tgl = _teks(_val(r, hadirSheet.header, "Tanggal")); if (!tgl) return;
    const lm = _teks(_val(r, hadirSheet.header, "Kode Materi")) || lmForDay(new Date(tgl).getDate());
    if (!matchLM(lm)) return;
    const e = ensure(tgl); e.hadir += _num(_val(r, hadirSheet.header, "Kehadiran (%)"),0) > 0 ? 1 : 1; e.count += 1;
    e.items.push({ tipe: "hadir", deskripsi: _teks(_val(r, hadirSheet.header, "Status")) || "Hadir" });
  });
  if (tugasSheet) tugasSheet.rows.forEach((r)=>{
    if (sid && _teks(_val(r, tugasSheet.header, "StudentID")) !== sid) return;
    if (!matchKelas(_val(r, tugasSheet.header, "Kelas"))) return;
    let tgl = _teks(_val(r, tugasSheet.header, "Timestamp")).slice(0,10);
    if (r[tugasSheet.header["Timestamp"]] instanceof Date) tgl = _tglStr(r[tugasSheet.header["Timestamp"]]);
    if (!tgl || tgl.length < 8) tgl = _tglStr(new Date());
    const lm = _teks(_val(r, tugasSheet.header, "kdMateri")) || lmForDay(new Date(tgl).getDate());
    if (!matchLM(lm)) return;
    const e = ensure(tgl); e.tugas += 1; e.count += 1;
    e.items.push({ tipe: "tugas", deskripsi: _teks(_val(r, tugasSheet.header, "Title")) || "Tugas" });
  });
  if (asesmenSheet) asesmenSheet.rows.forEach((r)=>{
    if (sid && _teks(_val(r, asesmenSheet.header, "Student ID")) !== sid) return;
    if (!matchKelas(_val(r, asesmenSheet.header, "Kelas"))) return;
    const tgl = _teks(_val(r, asesmenSheet.header, "Date")); if (!tgl) return;
    const lm = _teks(_val(r, asesmenSheet.header, "Kode LM")); if (!matchLM(lm)) return;
    const e = ensure(tgl); e.kuis += 0; // asesmen sudah dihitung via kuis, tapi tambah marker LM
    if (!e.LM || e.LM === lmForDay(new Date(tgl).getDate())) e.LM = lm;
  });
  const history = Object.values(peta).sort((a,b)=> a.date < b.date ? -1 : 1);
  return { history, calendar: history };
}

function getBankSoal(params) {
  const kategori = _teks(params.kategori || params.kodeMateri || params.kdMateri || "");
  const sheet = _sheet(SHEET_BANK);
  if (!sheet) return { status: "ok", soal: [], message: "Sheet Bank Soal kosong" };
  const rows = sheet.rows.filter((r)=>{
    if (!kategori) return true;
    const k = _teks(_val(r, sheet.header, "Kategori")) || _teks(_val(r, sheet.header, "Kode Materi"));
    return k.toLowerCase() === kategori.toLowerCase() || k.toLowerCase() === kategori.toLowerCase().replace("pertemuan","lm").trim();
  }).map((r)=>{
    const rawSoal = _val(r, sheet.header, "Soal");
    let soalObj = null;
    try { soalObj = typeof rawSoal === "string" ? JSON.parse(rawSoal) : rawSoal; } catch(_){ soalObj = { question: String(rawSoal), choices: [] }; }
    return {
      id: _teks(_val(r, sheet.header, "ID")),
      kategori: _teks(_val(r, sheet.header, "Kategori")),
      tipe: _teks(_val(r, sheet.header, "Tipe")),
      soal: soalObj,
      poin: _num(_val(r, sheet.header, "Poin"),1),
    };
  });
  return { status: "ok", soal: rows, total: rows.length };
}

/* ================================================================== */
/* REGISTER / LOGIN / VERIFY (stub kompatibel dari v5)                 */
/* ================================================================== */
function _buatStudentId() {
  return "STD-" + String(Math.floor(10000000 + Math.random() * 89999999));
}

function register(p) {
  return _denganLock(() => {
    _jaminSheet(SHEET_USERS, SHEET_SPECS[SHEET_USERS]);
    const users = _ss().getSheetByName(SHEET_USERS);
    if (!users) return { status: "error", message: "Sheet " + SHEET_USERS + " tidak ditemukan." };
    users.getRange(2, 2, users.getLastRow(), 1).setNumberFormat(String.fromCharCode(64));
    const data = users.getDataRange().getValues();
    const header = data[0];
    const col = (n) => header.indexOf(n);
    const cNama = col("Nama"), cEmail = col("Email"), cNis = col("NIS");

    const nama = _teks(p.nama || "");
    const email = _teks(p.email || "").toLowerCase();
    const nis = _teks(p.nis || "");
    if (!nis) return { status: "error", message: "NIS wajib diisi." };
    if (!/^\d{5}$/.test(nis)) return { status: "error", message: "NIS harus 5 digit angka." };
    const absen = _teks(p.absen || "");
    const kelas = _teks(p.kelas || "");
    if (!nama || !email) return { status: "error", message: "nama dan email wajib diisi." };

    if (cEmail >= 0) {
      const duplikat = data.slice(1).find((r) => _teks(r[cEmail]).toLowerCase() === email);
      if (duplikat) return { status: "error", message: "Email sudah terdaftar." };
    }
    if (cNis >= 0) {
      const dupNis = data.slice(1).find((r) => _teks(r[cNis]) === nis);
      if (dupNis && nis) return { status: "error", message: "NIS sudah terdaftar." };
    }

    const studentId = _buatStudentId();
    users.appendRow([
      studentId, nis, nama, email, absen, kelas,
      Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"),
      "",
    ]);
    return { status: "ok", data: { student_id: studentId, nis, nama, email, absen, kelas } };
  }, "register");
}

function login(p) {
  _jaminSheet(SHEET_USERS, SHEET_SPECS[SHEET_USERS]);
  const users = _sheet(SHEET_USERS);
  if (!users) return { status: "error", message: "Sheet " + SHEET_USERS + " tidak ditemukan." };
  const nis = _teks(p.nis || "");
  const email = _teks(p.email || "").toLowerCase();
  if (!nis || !email) return { status: "error", message: "NIS dan email wajib diisi." };

  // I4 (revisi): cocok NIS DAN email dengan sheet Users; profil diambil dari sheet.
  // Tidak auto-create (register adalah jalan mengisi sheet Users).
  const u = users.rows.find((r) => {
    const okNis = _teks(_val(r, users.header, "NIS")) === nis;
    const okEmail = _teks(_val(r, users.header, "Email")).toLowerCase() === email;
    return okNis && okEmail;
  });
  if (!u) {
    return { status: "error", message: "NIS/email tidak cocok dengan data Users." };
  }
  const sid = _teks(_val(u, users.header, "StudentID"));
  const sheet = _ss().getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  const rowIdx = data.findIndex((r) => _teks(r[0]) === sid);
  if (rowIdx > 0) {
    const lastCol = users.header["LastLogin"];
    if (lastCol !== undefined) {
      sheet.getRange(rowIdx + 1, lastCol + 1).setValue(
        Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"),
      );
    }
  }
  return {
    status: "ok",
    data: {
      student_id: sid,
      nis: _teks(_val(u, users.header, "NIS")),
      nama: _teks(_val(u, users.header, "Nama")),
      email: _teks(_val(u, users.header, "Email")),
      absen: _teks(_val(u, users.header, "Absen")),
      kelas: _teks(_val(u, users.header, "Kelas")),
    },
  };
}

function verify(p) {
  _jaminSheet(SHEET_USERS, SHEET_SPECS[SHEET_USERS]);
  const users = _sheet(SHEET_USERS);
  if (!users) return { status: "error", message: "Sheet " + SHEET_USERS + " tidak ditemukan." };
  const sid = _teks(p.studentId || p.student_id || "");
  if (!sid) return { status: "error", message: "studentId wajib diisi." };
  const u = users.rows.find((r) => _teks(_val(r, users.header, "StudentID")) === sid);
  if (!u) return { status: "error", message: "Siswa tidak ditemukan." };
  return {
    status: "ok",
    data: {
      student_id: _teks(_val(u, users.header, "StudentID")),
      nis: _teks(_val(u, users.header, "NIS")),
      nama: _teks(_val(u, users.header, "Nama")),
      email: _teks(_val(u, users.header, "Email")),
      absen: _teks(_val(u, users.header, "Absen")),
      kelas: _teks(_val(u, users.header, "Kelas")),
    },
  };
}

/* ================================================================== */
/* BACA ASESEN PER SISWA (grouping db_asesmen by Kategori)             */
/* ================================================================== */
function _bacaAsesmenPerSiswa() {
  const asm = _sheet(SHEET_ASESMEN);
  const map = {};
  if (!asm) return map;
  asm.rows.forEach((r) => {
    const sid = _teks(_val(r, asm.header, "Student ID"));
    if (!sid) return;
    if (!map[sid]) {
      map[sid] = {
        nis: "", nama: "", absen: "", kelas: "",
        lm: {},
        sas: [],
        sts: [],
      };
    }
    const a = map[sid];
    const kategori = _teks(_val(r, asm.header, "Kategori")).toLowerCase();
    const tulis = _num(_val(r, asm.header, "Skor Tulis"));
    const performa = _num(_val(r, asm.header, "Skor Performa"));
    const kode = _teks(_val(r, asm.header, "Kode LM"));
    const namaTp = _teks(_val(r, asm.header, "Nama TP"));
    a.nis = a.nis || _teks(_val(r, asm.header, "NIS"));
    a.nama = a.nama || _teks(_val(r, asm.header, "Nama"));
    a.absen = a.absen || _teks(_val(r, asm.header, "Absen"));
    a.kelas = a.kelas || _teks(_val(r, asm.header, "Kelas"));
    if (kategori === "sumatif_lm") {
      if (!a.lm[kode]) a.lm[kode] = { nama_tp: namaTp, tulis: [], performa: [] };
      a.lm[kode].tulis.push(tulis);
      a.lm[kode].performa.push(performa);
    } else if (kategori === "sas") {
      a.sas.push({ tulis, performa });
    } else if (kategori === "sts") {
      a.sts.push({ tulis, performa });
    }
  });
  return map;
}

/* ================================================================== */
/* POST: SIMPAN NILAI / ANEKDOT / PRESENSI / GENERATE REPORT           */
/* ================================================================== */

/** Simpan satu baris ke Akumulasi_Nilai_Rapor. */
function simpanNilaiAkademik(p) {
  const studentId = _teks(p.student_id || p.studentId || "");
  if (!studentId) return { status: "error", message: "student_id wajib diisi." };
  _jaminSheet(SHEET_RAPOR, SHEET_SPECS[SHEET_RAPOR]);
  const sheet = _ss().getSheetByName(SHEET_RAPOR);
  const nilaiRapor = _num(p.nilai_rapor);
  const interval = tentukanIntervalCapaian(nilaiRapor);
  sheet.appendRow([
    _tglStr(new Date()),
    studentId,
    _teks(p.nama || ""),
    _teks(p.kelas || ""),
    _num(p.lm1), _num(p.lm2), _num(p.lm3), _num(p.lm4), _num(p.lm5),
    _num(p.rerata_lm),
    _num(p.sts || p.STS || ""),
    _num(p.sas),
    nilaiRapor,
    interval,
    _teks(p.deskripsi_capaian || ""),
  ]);
  return {
    status: "ok",
    message: "Nilai akademik " + studentId + " tersimpan.",
    interval_capaian: interval,
  };
}

/** Simpan satu baris ke Catatan_Anekdot_Sikap. */
function simpanAnekdotSikap(p) {
  const studentId = _teks(p.student_id || p.studentId || "");
  if (!studentId) return { status: "error", message: "student_id wajib diisi." };
  _jaminSheet(SHEET_ANEKDOT, SHEET_SPECS[SHEET_ANEKDOT]);
  const sheet = _ss().getSheetByName(SHEET_ANEKDOT);
  sheet.appendRow([
    Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"),
    studentId,
    _teks(p.nama || ""),
    _teks(p.tanggal || _tglStr(new Date())),
    _teks(p.dimensi || p.dimensi_pancasila || ""),
    _teks(p.catatan || p.perilaku || ""),
  ]);
  return { status: "ok", message: "Catatan anekdot sikap " + studentId + " tersimpan." };
}

/** Simpan satu baris ke Presensi_Administratif. */
function updatePresensi(p) {
  const studentId = _teks(p.student_id || p.studentId || "");
  if (!studentId) return { status: "error", message: "student_id wajib diisi." };
  _jaminSheet(SHEET_PRESENSI, SHEET_SPECS[SHEET_PRESENSI]);
  const sheet = _ss().getSheetByName(SHEET_PRESENSI);
  sheet.appendRow([
    studentId,
    _teks(p.nama || ""),
    _teks(p.kelas || ""),
    _num(p.sakit), _num(p.izin), _num(p.tanpa_keterangan),
  ]);
  return { status: "ok", message: "Presensi administratif " + studentId + " tersimpan." };
}

/**
 * logActivity: tulis satu baris skor kuis ke db_asesmen (Kurikulum Merdeka).
 * Dipanggil dari kuis-ledakan.js (action=logActivity, GET). Idempoten berdasar
 * ID Log agar pengiriman ulang tidak menambah baris ganda.
 */
function logActivity(p) {
  const studentId = _teks(p.studentId || p.student_id || "");
  if (!studentId) return { status: "error", message: "studentId wajib diisi." };
  const idLog = _teks(p.id_log || p.idLog || "");
  const tipeAktivitas = _teks(p.type || p.tipe || p.tipe_aktivitas || "");
  let skor = _num(p.score);
  // Validasi skor untuk memastikan tetap dalam rentang 0-100 (mencegah > 100)
  if (skor < 0) skor = 0;
  if (skor > 100) skor = 100;
  let desc = {};
  try {
    desc = JSON.parse(_teks(p.description || "{}")) || {};
  } catch (_) {
    desc = {};
  }
  if (!skor && desc.score != null) skor = _num(desc.score);
  const kdMateri = _teks(p.kdMateri || p.kodeMateri || desc.kdMateri || "");
  // Kategori default "sumatif_lm" agar skor kuis masuk ke rekap per-KD (LM) rapor.
  const kategori = _teks(p.kategori) || "sumatif_lm";

  // Rute ANTI-CHEATING EVENTS: log ke db_aktivitas untuk audit
  // Tipe: tab_switch_warning, suspicious_timing, copy_paste_attempt, fullscreen_exit, window_blur, window_focus
  const antiCheatTypes = ["tab_switch_warning", "suspicious_timing", "copy_paste_attempt", "fullscreen_exit", "window_blur", "window_focus"];
  if (antiCheatTypes.includes(tipeAktivitas)) {
    _jaminSheet(SHEET_AKTIVITAS, SHEET_SPECS[SHEET_AKTIVITAS]);
    const akt = _ss().getSheetByName(SHEET_AKTIVITAS);
    const headerAkt = akt
      .getRange(1, 1, 1, akt.getLastColumn())
      .getValues()[0]
      .map((h) => String(h).trim());
    const idLogIdx = headerAkt.indexOf("ID Log") + 1;
    if (idLog && idLogIdx > 0 && _kolomBerisi(akt, idLogIdx, idLog)) {
      return { status: "ok", duplikat: true };
    }
    akt.appendRow([
      Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"),
      _tglStr(new Date()),
      _hariNama(new Date()),
      _teks(p.nama || desc.studentName || ""),
      tipeAktivitas,
      JSON.stringify(desc),
      1,
      studentId,
      _teks(p.nis || p.NIS || ""),
      _teks(p.absen || ""),
      _teks(p.kelas || ""),
      kdMateri,
      idLog,
    ]);
    SpreadsheetApp.flush();
    return { status: "ok", tipe: tipeAktivitas };
  }

  // Rute FORMATIF: progres murni ? db_aktivitas (heatmap), TIDAK ke rapor.
  if (kategori === "formatif") {
    _jaminSheet(SHEET_AKTIVITAS, SHEET_SPECS[SHEET_AKTIVITAS]);
    const akt = _ss().getSheetByName(SHEET_AKTIVITAS);
    const headerAkt = akt
      .getRange(1, 1, 1, akt.getLastColumn())
      .getValues()[0]
      .map((h) => String(h).trim());
    const idLogIdx = headerAkt.indexOf("ID Log") + 1;
    if (idLog && idLogIdx > 0 && _kolomBerisi(akt, idLogIdx, idLog)) {
      return { status: "ok", duplikat: true };
    }
    akt.appendRow([
      Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"),
      _tglStr(new Date()),
      _hariNama(new Date()),
      _teks(p.nama || desc.metadataKuis || ""),
      "kuis_formatif",
      JSON.stringify(desc),
      1,
      studentId,
      _teks(p.nis || p.NIS || ""),
      _teks(p.absen || ""),
      _teks(p.kelas || ""),
      kdMateri,
      idLog,
    ]);
    SpreadsheetApp.flush();
    return { status: "ok" };
  }

  // Rute SUMATIF (default): skor kuis ? db_asesmen (masuk rapor LM).
  _jaminSheet(SHEET_ASESMEN, SHEET_SPECS[SHEET_ASESMEN]);
  const sheet = _ss().getSheetByName(SHEET_ASESMEN);
  const header = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map((h) => String(h).trim());
  const idLogIdx = header.indexOf("ID Log") + 1;
  if (idLog && idLogIdx > 0 && _kolomBerisi(sheet, idLogIdx, idLog)) {
    return { status: "ok", duplikat: true };
  }
  sheet.appendRow([
    Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"),
    _tglStr(new Date()),
    kdMateri,
    _teks(p.namaTp || desc.namaTp || ""),
    kategori,
    skor,
    skor,
    studentId,
    _teks(p.nis || p.NIS || ""),
    _teks(p.absen || ""),
    _teks(p.kelas || ""),
    idLog,
  ]);
  SpreadsheetApp.flush();
  return { status: "ok" };
}

/** Cek apakah siswa sudah mengunci kuis tertentu (berdasar db_asesmen). */
function getQuizLock(p) {
  const studentId = _teks(p.studentId || p.student_id || "");
  const kdMateri = _teks(p.kdMateri || p.kodeMateri || "");
  if (!studentId || !kdMateri) return { status: "ok", locked: false, best: null };
  const asm = _sheet(SHEET_ASESMEN);
  if (!asm) return { status: "ok", locked: false, best: null };
  const idxSid = asm.header["Student ID"];
  const idxLM = asm.header["Kode LM"];
  const idxTulis = asm.header["Skor Tulis"];
  const idxPerf = asm.header["Skor Performa"];
  let best = 0;
  let found = false;
  asm.rows.forEach((r) => {
    if (_teks(r[idxSid]) === studentId && _teks(r[idxLM]) === kdMateri) {
      found = true;
      const v = Math.max(_num(r[idxTulis]), _num(r[idxPerf]));
      if (v > best) best = v;
    }
  });
  return { status: "ok", locked: found, best: found ? best : null };
}

/**
 * createSession: validasi token sesi untuk anti-multi-login.
 * Mencegah siswa membuka kuis di banyak tab/browser bersamaan.
 * Token disimpan di db_kuis_session dengan TTL = durasi kuis + buffer.
 */
function createSession(p) {
  const studentId = _teks(p.studentId || p.student_id || "");
  const kdMateri = _teks(p.kdMateri || p.kodeMateri || "");
  const sessionToken = _teks(p.sessionToken || p.session_token || "");
  const duration = _num(p.duration || p.durasiUlangan, 300);

  if (!studentId || !kdMateri) {
    return { status: "error", message: "studentId & kdMateri wajib diisi." };
  }

  const sheet = _ss().getSheetByName(SHEET_KUIS_SESSION);
  if (sessionToken && sheet && sheet.getLastRow() >= 2) {
    const data = sheet.getDataRange().getValues();
    const header = data[0].map((h) => String(h).trim());
    const idxSid = header.indexOf("Student ID");
    const idxLM = header.indexOf("Kode Materi");
    const idxToken = header.indexOf("Session Token");
    const idxStatus = header.indexOf("Status");

    if (idxToken >= 0) {
      // Cek apakah token masih aktif (belum expired)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowToken = _teks(row[idxToken]);
        if (rowToken === sessionToken && _teks(row[idxSid]) === studentId && _teks(row[idxLM]) === kdMateri) {
          // Token sudah ada — duplikat sesi (anti-multi-login)
          return {
            status: "ok",
            duplicate: true,
            message: "Sesi sudah aktif. Tidak boleh buka tab baru.",
          };
        }
      }
    }
  }

  return {
    status: "ok",
    duplicate: false,
    message: "Sesi valid.",
    expiresIn: duration + 60, // TTL = durasi kuis + 60 detik buffer
  };
}

/** Guru membuka kunci: hapus seluruh baris db_asesmen milik siswa pada kdMateri. */
function resetQuizLock(p) {
  const studentId = _teks(p.studentId || p.student_id || "");
  const kdMateri = _teks(p.kdMateri || p.kodeMateri || "");
  if (!studentId || !kdMateri) {
    return { status: "error", message: "studentId & kdMateri wajib diisi." };
  }
  const sheet = _ss().getSheetByName(SHEET_ASESMEN);
  if (!sheet || sheet.getLastRow() < 2) return { status: "ok", deleted: 0 };
  const data = sheet.getDataRange().getValues();
  const header = data[0].map((h) => String(h).trim());
  const idxSid = header.indexOf("Student ID");
  const idxLM = header.indexOf("Kode LM");
  let deleted = 0;
  // hapus dari bawah ke atas agar indeks tidak bergeser
  for (let i = sheet.getLastRow(); i >= 2; i--) {
    const row = data[i - 1];
    if (_teks(row[idxSid]) === studentId && _teks(row[idxLM]) === kdMateri) {
      sheet.deleteRow(i);
      deleted++;
    }
  }
  SpreadsheetApp.flush();
  return { status: "ok", deleted };
}

/**
 * logQuizSession: catat waktu mulai, selesai, durasi, dan status jujur/mencurigakan.
 * Memungkinkan guru membedakan siswa yang jujur vs yang terdeteksi curang.
 */
function logQuizSession(p) {
  const studentId = _teks(p.studentId || p.student_id || "");
  const nama = _teks(p.nama || "");
  const nis = _teks(p.nis || "");
  const absen = _teks(p.absen || "");
  const kelas = _teks(p.kelas || "");
  const kdMateri = _teks(p.kdMateri || p.kodeMateri || "");
  const waktuMulai = _teks(p.waktuMulai || p.waktu_mulai || "");
  const waktuSelesai = _teks(p.waktuSelesai || p.waktu_selesai || "");
  const durasiPengerjaan = _num(p.durasiPengerjaan || p.durasi, 0);
  const durasiUlangan = _num(p.durasiUlangan || p.duration, 300);
  const sisaWaktu = _num(p.sisaWaktu || p.sisa_waktu, 0);
  const tabSwitchCount = _num(p.tabSwitchCount || p.tab_switch_count, 0);
  const windowBlurCount = _num(p.windowBlurCount || p.window_blur_count, 0);
  const sessionToken = _teks(p.sessionToken || p.session_token || "");
  const answerTimings = _teks(p.answerTimings || p.answer_timings || "");
  const skor = _num(p.skor || p.score, -1);

  if (!studentId || !kdMateri) {
    return { status: "error", message: "studentId & kdMateri wajib diisi." };
  }

  // Tentukan status berdasarkan sisa waktu
  // sisaWaktu > 60 detik = mencurigakan (kemungkinan manipulasi waktu)
  // sisaWaktu <= 60 detik = jujur (browser throttling normal)
  const status = sisaWaktu > 60 ? "mencurigakan" : "jujur";

  // Buat catatan untuk guru
  let catatan = "";
  if (status === "mencurigakan") {
    catatan = "Timer habis tetapi sisa waktu " + sisaWaktu + " detik (>60s). ";
    catatan += "Kemungkinan: (1) Browser throttling saat buka tab lain (normal), ";
    catatan += "atau (2) Manipulasi waktu sistem. ";
    catatan += "Tab switch: " + tabSwitchCount + "x. ";
    catatan += "Window blur: " + windowBlurCount + "x. ";
    if (skor >= 0) catatan += "Skor: " + skor + "%.";
  } else {
    catatan = "Pengerjaan normal. Durasi " + durasiPengerjaan + " detik dari " + durasiUlangan + " detik. ";
    catatan += "Tab switch: " + tabSwitchCount + "x. ";
    catatan += "Window blur: " + windowBlurCount + "x. ";
    if (skor >= 0) catatan += "Skor: " + skor + "%.";
  }

  const sheet = _jaminSheet(SHEET_KUIS_SESSION, SHEET_SPECS[SHEET_KUIS_SESSION]);
  const now = new Date();
  sheet.appendRow([
    now.toISOString(),
    studentId,
    nama,
    nis,
    absen,
    kelas,
    kdMateri,
    waktuMulai,
    waktuSelesai,
    durasiPengerjaan,
    durasiUlangan,
    sisaWaktu,
    tabSwitchCount,
    windowBlurCount,
    sessionToken,
    answerTimings,
    status,
    catatan,
  ]);
  SpreadsheetApp.flush();

  return {
    status: "ok",
    message: "Log sesi kuis tercatat.",
    data: {
      studentId,
      kdMateri,
      status,
      sisaWaktu,
      sessionToken,
      catatan,
    },
  };
}


/**
 * generateReport V6: untuk tiap siswa, baca db_asesmen (group by Kategori),
 * hitung rapor Kurikulum Merdeka, rangkum catatan sikap & presensi, lalu
 * TULIS ULANG Akumulasi_Nilai_Rapor (sort by Nilai_Rapor desc).
 */
function generateReport() {
  const ss = _ss();
  const users = _sheet(SHEET_USERS);
  const anekdot = _sheet(SHEET_ANEKDOT);
  const presensi = _sheet(SHEET_PRESENSI);
  if (!users && !_sheet(SHEET_ASESMEN)) {
    return { status: "error", message: "Tidak ada sheet data (db_asesmen/Users)." };
  }

  const perSiswa = _bacaAsesmenPerSiswa();

  if (users) {
    users.rows.forEach((r) => {
      const sid = _teks(_val(r, users.header, "StudentID"));
      if (!sid) return;
      if (!perSiswa[sid]) {
        perSiswa[sid] = {
          nis: _teks(_val(r, users.header, "NIS")),
          nama: _teks(_val(r, users.header, "Nama")),
          absen: _teks(_val(r, users.header, "Absen")),
          kelas: _teks(_val(r, users.header, "Kelas")),
          lm: {}, sas: [], sts: [],
        };
      } else {
        const u = perSiswa[sid];
        u.nis = _teks(_val(r, users.header, "NIS")) || u.nis;
        u.nama = _teks(_val(r, users.header, "Nama")) || u.nama;
        u.absen = _teks(_val(r, users.header, "Absen")) || u.absen;
        // Users adalah sumber kebenaran kelas — timpa kelas dari db_asesmen jika Users sudah dikoreksi
        const kelasUser = _teks(_val(r, users.header, "Kelas"));
        if (kelasUser) u.kelas = kelasUser;
        else u.kelas = u.kelas || "";
      }
    });
  }

  const catatanMap = {};
  if (anekdot) {
    anekdot.rows.forEach((r) => {
      const sid = _teks(_val(r, anekdot.header, "StudentID"));
      if (!sid) return;
      if (!catatanMap[sid]) catatanMap[sid] = [];
      catatanMap[sid].push({
        dimensi_pancasila: _teks(_val(r, anekdot.header, "Dimensi_Pancasila")),
        perilaku: _teks(_val(r, anekdot.header, "Catatan_Perilaku")),
      });
    });
  }

  const presensiMap = {};
  if (presensi) {
    presensi.rows.forEach((r) => {
      const sid = _teks(_val(r, presensi.header, "StudentID"));
      if (!sid) return;
      if (!presensiMap[sid]) presensiMap[sid] = { sakit: 0, izin: 0, tanpa_keterangan: 0 };
      presensiMap[sid].sakit += _num(_val(r, presensi.header, "Sakit"));
      presensiMap[sid].izin += _num(_val(r, presensi.header, "Izin"));
      presensiMap[sid].tanpa_keterangan += _num(_val(r, presensi.header, "Tanpa_Keterangan"));
    });
  }

  const rataArr = (arr) => (arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const bestArr = (arr) => (arr && arr.length ? Math.max(...arr.map((x) => _num(x))) : 0);
  const bestRata = (list) => {
    let best = 0;
    (list || []).forEach((x) => {
      const v = Math.round((_num(x.tulis) + _num(x.performa)) / 2);
      if (v > best) best = v;
    });
    return best;
  };

  // Baca bobot dari Settings
  const bobot = _bacaBobot();

  const barisRapor = [];
  Object.keys(perSiswa).forEach((sid) => {
    const a = perSiswa[sid];
    const kodeLM = Object.keys(a.lm).sort();
    const daftarLM = kodeLM.map((kode) => ({
      id_lm: kode,
      nama_tp: a.lm[kode].nama_tp,
      kategori: a.lm[kode].kategori || "sumatif_lm",
      skor_tulis: _bulat(bestArr(a.lm[kode].tulis)),
      skor_performa: _bulat(bestArr(a.lm[kode].performa)),
    }));
    const hasilLM = procesNilaiLingkupMateri(daftarLM);
    const nilaiSAS = bestRata(a.sas);
    const nilaiSTS = bestRata(a.sts);
    const rapor = hitungRaporKurikulumMerdeka(hasilLM, nilaiSAS, nilaiSTS, bobot);
    const interval = tentukanIntervalCapaian(rapor.nilai_akhir_rapor);

    // Dynamic LM columns (up to MAX_LM)
    const lmCols = [];
    for (let i = 1; i <= MAX_LM; i++) {
      lmCols.push(hasilLM[i - 1] ? hasilLM[i - 1].nilai_akhir_lm : "");
    }

    const pres = presensiMap[sid] || { sakit: 0, izin: 0, tanpa_keterangan: 0 };
    generateLaporanSiswa({
      identitas: { student_id: sid, nama: a.nama, kelas: a.kelas, nis: a.nis },
      akademik: {
        nilai_angka: rapor.nilai_akhir_rapor,
        capaian_kompetensi: interval,
        rincian_bab: hasilLM,
      },
      karakter_sikap: rangkumCatatanSikap(catatanMap[sid] || []),
      rekap_presensi: pres,
    });

    // Build row dengan Absen+NIS fisik (kolom E,F) + LM dinamis
    const row = [
      _tglStr(new Date()),
      sid,
      a.nama,
      a.kelas,
      a.absen || "",
      a.nis || "",
      ...lmCols,
      rapor.rerata_lm,
      nilaiSTS,
      nilaiSAS,
      rapor.nilai_akhir_rapor,
      interval,
      rapor.deskripsi_capaian || "",
    ];
    barisRapor.push(row);
  });

  // index Nilai_Rapor geser setelah tambah Absen,NIS = 6 + MAX_LM + 3 (Rerata,STS,SAS) = 9+MAX_LM
  const idxNilai = 6 + MAX_LM + 3;
  barisRapor.sort((x, y) => _num(y[idxNilai]) - _num(x[idxNilai]));

  _jaminSheet(SHEET_RAPOR, _buildRaporHeaders());
  const sheet = ss.getSheetByName(SHEET_RAPOR);
  sheet.clearContents();
  sheet.appendRow(_buildRaporHeaders());
  barisRapor.forEach((b) => sheet.appendRow(b));
  SpreadsheetApp.flush();

  return {
    status: "ok",
    message:
      "Akumulasi Nilai Rapor (Kurikulum Merdeka) diperbarui untuk " +
      barisRapor.length + " siswa.",
    total: barisRapor.length,
  };
}

/* ================================================================== */
/* INIT SHEETS - buat semua sheet + header row (sekali panggil)        */
/* ================================================================== */
function initSheets() {
  const ss = _ss();
  const created = [];
  Object.keys(SHEET_SPECS).forEach((name) => {
    if (!ss.getSheetByName(name)) created.push(name);
    _jaminSheet(name, SHEET_SPECS[name]);
  });
  const usersSheet = ss.getSheetByName(SHEET_USERS);
  if (usersSheet) {
    const lastRow = usersSheet.getLastRow();
    if (lastRow > 1) {
      usersSheet.getRange(2, 2, lastRow - 1, 1).setNumberFormat(String.fromCharCode(64));
    }
  }
  return {
    created,
    message: created.length
      ? "Sheet dibuat: " + created.join(", ")
      : "Semua sheet sudah ada.",
  };
}

/* ================================================================== */
/* ENTRY: GET + POST (kontrak aksi, ramah CORS)                        */
/* ================================================================== */

/** doOptions: tanggap preflight CORS (deploy sebagai web-app publik). */
function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  const params = e.parameter || {};
  const action = _teks(params.action).toLowerCase();
  try {
    switch (action) {
      case "getstudentroster":
        return createJsonResponse(getStudentRoster(params.kelas || ""));
      case "getscores":
        return createJsonResponse(getScores(params.studentId || ""));
      case "getleaderboard":
      case "leaderboard":
        return createJsonResponse(getLeaderboard(params.kelas || ""));
      case "getactivityhistory":
        return createJsonResponse(getActivityHistory(params.studentId || "", params.kdMateri || "", _num(params.days, HARI_RIWAYAT)));
      case "getbanksoal":
      case "banksoal":
        return createJsonResponse(getBankSoal(params));
      case "getcalendar":
      case "calendar":
        return createJsonResponse(getCalendar(params));
      case "register":
        return createJsonResponse(register(params));
      case "login":
        return createJsonResponse(login(params));
      case "verify":
        return createJsonResponse(verify(params));
      case "generatereport":
        return createJsonResponse(_denganLock(() => generateReport(), "generateReport"));
      case "logactivity":
        return createJsonResponse(_denganLock(() => logActivity(params), "logActivity"));
      case "logquissession":
      case "logquissession":
        return createJsonResponse(_denganLock(() => logQuizSession(params), "logQuizSession"));
      case "getbobot":
        return createJsonResponse({ status: "ok", bobot: _bacaBobot() });
      case "savebobot":
        return createJsonResponse(_denganLock(() => _simpanBobot(params), "saveBobot"));
      case "getquizlock":
        return createJsonResponse(getQuizLock(params));
      case "resetquizlock":
        return createJsonResponse(_denganLock(() => resetQuizLock(params), "resetQuizLock"));
      case "createsession":
        return createJsonResponse(createSession(params));
      case "initsheets":
      case "initsheet":
      case "init":
        return createJsonResponse(initSheets());
      case "":
        return createJsonResponse({
          status: "ok",
          message:
            "codev6.gs aktif (Kurikulum Merdeka). Gunakan param action: " +
            "getStudentRoster, getScores, getLeaderboard, getActivityHistory, " +
            "register, login, verify, generateReport, initSheets, " +
            "logActivity, logQuizSession, getQuizLock, resetQuizLock, createSession.",
        });
      default:
        return _err("Aksi '" + action + "' tidak dikenal di codev6.gs.");
    }
  } catch (error) {
    return _err("Error backend: " + (error && error.message ? error.message : error));
  }
}

function doPost(e) {
  let params = {};
  try {
    if (e.postData && e.postData.contents) {
      const body = JSON.parse(e.postData.contents);
      params = { ...body };
    }
  } catch (err) {
    params = {};
  }
  if (e.parameter) params = { ...params, ...e.parameter };

  const action = _teks(params.action || (params.payload && params.payload.action) || "").toLowerCase();
  const payload = params.payload || params;
  try {
    switch (action) {
      case "simpannilaiakademik":
        return createJsonResponse(_denganLock(() => simpanNilaiAkademik(payload), "simpanNilaiAkademik"));
      case "simpananekdotsikap":
        return createJsonResponse(_denganLock(() => simpanAnekdotSikap(payload), "simpanAnekdotSikap"));
      case "updatepresensi":
        return createJsonResponse(_denganLock(() => updatePresensi(payload), "updatePresensi"));
      case "generatereport":
        return createJsonResponse(_denganLock(() => generateReport(), "generateReport"));
      case "logactivity":
        return createJsonResponse(_denganLock(() => logActivity(payload), "logActivity"));
      case "logquissession":
      case "logquissession":
        return createJsonResponse(_denganLock(() => logQuizSession(payload), "logQuizSession"));
      case "getbobot":
        return createJsonResponse({ status: "ok", bobot: _bacaBobot() });
      case "savebobot":
        return createJsonResponse(_denganLock(() => _simpanBobot(payload), "saveBobot"));
      case "getquizlock":
        return createJsonResponse(getQuizLock(payload));
      case "resetquizlock":
        return createJsonResponse(_denganLock(() => resetQuizLock(payload), "resetQuizLock"));
      case "createsession":
        return createJsonResponse(createSession(payload));
      case "register":
        return createJsonResponse(register(params));
      case "login":
        return createJsonResponse(login(params));
      case "verify":
        return createJsonResponse(verify(params));
      case "initsheets":
      case "init":
        return createJsonResponse(initSheets());
      case "":
        return _err("Aksi kosong. Gunakan action di POST body {action, payload}.");
      default:
        return _err("Aksi '" + action + "' tidak dikenal di codev6.gs (POST).");
    }
  } catch (error) {
    return _err("Error backend: " + (error && error.message ? error.message : error));
  }
}

