import { LitElement, html, css, nothing } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";
import "./lib/kuis-ledakan.js";
import "./lib/sistem-kehadiran.js";
import "./lib/ruang-diskusi.js";
import "./lib/kirim-tugas.js";
import "./lib/timer-kuis.js";
import "./lib/timer-materi-kuis.js";
import "./lib/latihan-kuis.js";

/**
 * `dasbor-kuis`
 *
 * Dasbor evaluasi terintegrasi V5 dengan dua mode tampilan:
 * - `guru`: pantauan kelas (roster, status aktivitas) + leaderboard & rekap nilai.
 * - `siswa`: hasil nilai pribadi (kehadiran, UH, UTS, UAS, sikap, keterampilan,
 *   nilai akhir) + evaluasi mandiri (baca, kuis, diskusi).
 *
 * Data diambil dari Google Apps Script via GET ramah CORS
 * (action=getStudentRoster|getLeaderboard|getScores|getActivityHistory|logActivity).
 *
 * @demo index.html
 * @element dasbor-kuis
 */
export class QuizDashboard extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "dasbor-kuis";
  }

  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: {
        type: String,
        attribute: "apps-script-url",
        reflect: true,
      },
      forumApiUrl: {
        type: String,
        attribute: "forum-api-url",
        reflect: true,
      },
      kdMateri: { type: String, attribute: "kd-materi", reflect: true },
      kategori: { type: String, attribute: "kategori", reflect: true },
      mode: { type: String, attribute: "mode", reflect: true },
      kelas: { type: String, attribute: "kelas", reflect: true },
      studentId: { type: String, attribute: "student-id", reflect: true },
      namaSiswa: { type: String, attribute: "nama-siswa", reflect: true },
      nis: { type: String, attribute: "nis", reflect: true },
      absen: { type: String, attribute: "absen", reflect: true },
      allowModeSwitch: {
        type: Boolean,
        attribute: "allow-mode-switch",
        reflect: true,
      },
      judulKuis: { type: String, attribute: "judul-kuis", reflect: true },
      questions: {
        type: Array,
        attribute: "questions",
        reflect: true,
        converter: {
          fromAttribute(value) {
            if (value == null || value === "") return undefined;
            if (Array.isArray(value)) return value;
            if (typeof value === "object") return value;
            const text = String(value).trim();
            if (!text || text.includes("[object Object]")) return undefined;
            if (!(text.startsWith("[") || text.startsWith("{"))) return undefined;
            try {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) return parsed;
              if (
                parsed &&
                typeof parsed === "object" &&
                Array.isArray(parsed.questions)
              ) {
                return parsed.questions;
              }
              return undefined;
            } catch (_) {
              return undefined;
            }
          },
          toAttribute(value) {
            if (!Array.isArray(value)) return null;
            try {
              return JSON.stringify(value);
            } catch (_) {
              return null;
            }
          },
        },
      },
      shuffleChoices: {
        type: Boolean,
        attribute: "shuffle-choices",
        reflect: true,
      },
      hideAnswers: {
        type: Boolean,
        attribute: "hide-answers",
        reflect: true,
      },
      hideScore: {
        type: Boolean,
        attribute: "hide-score",
        reflect: true,
      },
      hideConfetti: {
        type: Boolean,
        attribute: "hide-confetti",
        reflect: true,
      },
      _activeTab: { state: true },
      _serverData: { state: true },
      _isFlushing: { state: true },
      _loading: { state: true },
      _serverError: { state: true },
      _peringkatKelas: { state: true },
      _detailSiswa: { state: true },
      _editNilai: { state: true },
      _note: { state: true },
      _draftNilai: { state: true },
      _soalText: { state: true },
      _copasTSV: { state: true },
      _simulabankSoalUrl: { state: true },
      _bobotTugas: { state: true },
      _bobotLM: { state: true },
      _bobotSTS: { state: true },
      _bobotSAS: { state: true },
      _raporStatus: { state: true },
    };
  }

  // CONFIGURASI UI HAXEDITOR (khusus guru & siswa)
  static get haxProperties() {
    return {
      api: "1",
      canScale: false,
      canPosition: false,
      canEditSource: true,
      type: "element",
      designSystem: {
        accent: true,
        primary: true,
        card: true,
        text: true,
        designTreatment: false,
      },
      gizmo: {
        title: "Dasbor Evaluasi Terintegrasi V5",
        description: "Dasbor monitoring Guru, Leaderboard Kelas, dan ruang evaluasi mandiri siswa.",
        icon: "icons:dashboard",
        color: "indigo",
        tags: ["Dasbor", "Evaluasi", "Monitoring"],
        meta: { author: "andyinformatika23-hash" },
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "URL Web App Google Apps Script",
            description: "Tempelkan URL eksekusi (/exec) dari deploy web app Google Apps Script Anda.",
            inputMethod: "textfield",
            required: true,
          },
          {
            property: "kdMateri",
            title: "Kode Topik / Pertemuan",
            description: "Ganti sesi bimbingan secara dinamis, misal: Pertemuan 1, Pertemuan 2.",
            inputMethod: "textfield",
            required: true,
          },
          {
            property: "mode",
            title: "Mode Tampilan",
            description: "Mode Guru menampilkan seluruh tab admin (Pantauan, Leaderboard, Peringkat Nilai Bimbingan Kelas, Dashboard Pembelajaran, Input Nilai, Kuis, Diskusi, Edit Soal, Atur); Mode Siswa menampilkan hasil nilai & evaluasi mandiri. Label 'dosen' kini untuk kemunduran dan diperlakukan sebagai Guru.",
            inputMethod: "select",
            options: {
              guru: "Guru - Admin Kelas Lengkap",
              siswa: "Siswa - Hasil Nilai & Evaluasi Mandiri",
            },
          },
          {
            property: "allowModeSwitch",
            title: "Tampilkan Tombol Pindah Mode",
            description: "Secara default tombol Guru/Siswa disembunyikan agar siswa tidak bisa beralih ke tampilan guru (dan sebaliknya). Aktifkan hanya pada halaman administrasi.",
            inputMethod: "boolean",
          },
          {
            property: "kelas",
            title: "Kelas (Filter Guru)",
            description: "Filter pantauan guru per kelas, misal: XI-1. Kosongkan untuk semua kelas.",
            inputMethod: "textfield",
          },
          {
            property: "studentId",
            title: "Student ID (Mode Siswa)",
            description: "ID siswa untuk memuat hasil nilai (otomatis terisi dari event login autentikasi-kuis).",
            inputMethod: "textfield",
          },
          {
            property: "namaSiswa",
            title: "Nama Siswa (Mode Siswa)",
            description: "Nama siswa yang sedang login untuk identifikasi pada ruang diskusi dan log aktivitas.",
            inputMethod: "textfield",
          },
          {
            property: "nis",
            title: "NIS (Mode Siswa)",
            description: "Nomor Induk Siswa yang terdaftar pada sheet Users.",
            inputMethod: "textfield",
          },
          {
            property: "absen",
            title: "Nomor Absen (Mode Siswa)",
            description: "Nomor absen siswa pada kelas.",
            inputMethod: "textfield",
          },
          {
            property: "judulKuis",
            title: "Judul Kuis Evaluasi",
            description: "Judul kartu kuis pada tab Evaluasi Kuis (dapat diedit oleh guru/dosen).",
            inputMethod: "textfield",
          },
          {
            property: "questions",
            title: "Soal Bank (Json) - Edit Guru/Dosen",
            description: "Array soal AKM: PG {question, choices, correctIndex}, PG kompleks {correctAnswers:[0,2]}, PGK {type:'pgk', statements:[{text,answer}]}, menjodohkan {type:'matching', leftItems, rightItems, correctPairs}, isian {type:'shortAnswer', acceptedAnswers}, gambar soal {image}, pilihan bergambar {text,image}. Kosongkan untuk memuat otomatis dari Bank Soal sheet.",
            inputMethod: "code-editor",
          },
          {
            property: "shuffleChoices",
            title: "Acak Pilihan Jawaban",
            description: "Mengacak urutan pilihan jawaban setiap kali kuis dimulai.",
            inputMethod: "boolean",
          },
          {
            property: "hideAnswers",
            title: "Sembunyikan Jawaban",
            description: "Tidak menampilkan jawaban benar/salah setelah menjawab (mode ujian).",
            inputMethod: "boolean",
          },
          {
            property: "hideScore",
            title: "Sembunyikan Nilai",
            description: "Menyembunyikan angka skor berjalan dan nilai akhir (pesan selesai tetap tampil).",
            inputMethod: "boolean",
          },
          {
            property: "hideConfetti",
            title: "Nonaktifkan Konfeti",
            description: "Tidak menampilkan efek konfeti saat jawaban benar.",
            inputMethod: "boolean",
          },
        ],
      },
      saveOptions: {
        wipeSlot: false,
        unsetAttributes: [],
      },
      demoSchema: [
        {
          tag: "dasbor-kuis",
          properties: {
            mode: "guru",
            kelas: "XI-1",
            kdMateri: "Pertemuan 1",
          },
          content: "",
        },
        {
          tag: "dasbor-kuis",
          properties: {
            mode: "siswa",
            studentId: "STD-65108053",
            namaSiswa: "Andy Yulianto",
            kelas: "XI-1",
            kdMateri: "Pertemuan 1",
          },
          content: "",
        },
      ],
    };
  }

  constructor() {
    super();
    this.appsScriptUrl = "";
    this.forumApiUrl = "";
    this.kdMateri = "Pertemuan 1";
    this.mode = "guru";
    this.kelas = "XI-1";
    this.studentId = "STD-65108053";
    this.namaSiswa = "Andy Yulianto";
    this.nis = "";
    this.absen = "";
    this.allowModeSwitch = false;
    this.judulKuis = "Evaluasi Kuis Interaktif";
    this.questions = [];
    this.shuffleChoices = false;
    this.hideAnswers = false;
    this.hideScore = false;
    this.hideConfetti = false;
    this._activeTab = "pantauan";
    this._isFlushing = false;
    this._loading = false;
    this._serverError = "";
    this._peringkatKelas = "";
    this._detailSiswa = null;
    this._editNilai = null;
    this._note = "";
    this._copasTSV = null;
    this._simulabankSoalUrl = "";
    this._bobotTugas = 1;
    this._bobotLM = 3;
    this._bobotSTS = 2;
    this._bobotSAS = 2;
    this._raporStatus = "";
    this._serverData = {
      roster: [],
      leaderboard: [],
      siswa: null,
      history: [],
    };
    this._onUserLoginBound = this._onUserLogin.bind(this);
    this._onUserLogoutBound = this._onUserLogout.bind(this);
    this._onLogEventBound = this._onLogEvent.bind(this);
    this._onOnlineBound = () => this._flushQueue();
    this._onFocusBound = () => this._flushQueue();
  }

  connectedCallback() {
    super.connectedCallback();
    if (
      globalThis.HaxStore &&
      typeof globalThis.HaxStore.requestAvailability === "function"
    ) {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[QuizDashboard.tag]) {
        store.elementList[QuizDashboard.tag] = QuizDashboard.haxProperties;
      }
    }
    this._loadProfile();
    this.fetchDataKomplit();
    globalThis.addEventListener("quiz-user-login", this._onUserLoginBound);
    globalThis.addEventListener("quiz-user-logout", this._onUserLogoutBound);
    globalThis.addEventListener("dasbor-kuis-log", this._onLogEventBound);
    globalThis.addEventListener("online", this._onOnlineBound);
    globalThis.addEventListener("focus", this._onFocusBound);
    this._flushQueue();
  }

  disconnectedCallback() {
    globalThis.removeEventListener("quiz-user-login", this._onUserLoginBound);
    globalThis.removeEventListener("quiz-user-logout", this._onUserLogoutBound);
    globalThis.removeEventListener("dasbor-kuis-log", this._onLogEventBound);
    globalThis.removeEventListener("online", this._onOnlineBound);
    globalThis.removeEventListener("focus", this._onFocusBound);
    super.disconnectedCallback();
  }

  updated(changed) {
    super.updated(changed);
    if (changed.has("mode")) {
      this._activeTab =
        this.mode === "siswa" ? "pembelajaran" : "pantauan";
      this.fetchDataKomplit();
    }
    if (
      changed.has("kelas") ||
      changed.has("studentId") ||
      changed.has("namaSiswa") ||
      changed.has("absen") ||
      changed.has("nis")
    ) {
      this.fetchDataKomplit();
    }
  }

  _loadProfile() {
    try {
      const profile = JSON.parse(
        localStorage.getItem("a3_v5_student_profile") || "null",
      );
      if (profile && profile.student_id) {
        this.studentId = this.studentId || profile.student_id;
        this.namaSiswa = this.namaSiswa || profile.nama;
        this.kelas = this.kelas || profile.kelas;
        this.nis = this.nis || profile.nis || "";
        this.absen = this.absen || profile.absen || "";
      }
    } catch (e) {
      // abaikan
    }
  }

  _persistProfile() {
    try {
      localStorage.setItem(
        "a3_v5_student_profile",
        JSON.stringify({
          student_id: this.studentId,
          nama: this.namaSiswa,
          kelas: this.kelas,
          nis: this.nis,
          absen: this.absen,
        }),
      );
    } catch (e) {
      // abaikan
    }
  }

  _onUserLogin(e) {
    const d = (e && e.detail) || {};
    if (d.studentId) this.studentId = d.studentId;
    if (d.nama) this.namaSiswa = d.nama;
    if (d.kelas) this.kelas = d.kelas;
    if (d.nis) this.nis = d.nis;
    if (d.absen) this.absen = d.absen;
    this._persistProfile();
    this.fetchDataKomplit();
  }

  _onUserLogout() {
    this._serverData = { roster: [], leaderboard: [], siswa: null, history: [] };
    this.requestUpdate();
  }

  _onLogEvent(e) {
    const d = (e && e.detail) || {};
    if (!d.tipe) return;
    // Hanya proses event dari komponen di dalam shadow DOM host ini. Dengan
    // begitu satu halaman yang memuat beberapa <dasbor-kuis> (guru & siswa)
    // tidak saling "mencuri" log aktivitas milik instance lain.
    if (!e.target || !this.shadowRoot || !this.shadowRoot.contains(e.target)) return;
    // Host tanpa studentId tidak bisa menulis log yang sah (backend menolak).
    if (!this.studentId) return;
    this.logActivity(d.tipe, d.payload || {}, d.id_log);
  }

  _generateLogId() {
    // ADAPTASI LAMA: [Kunci id_log SHA — kini crypto.getRandomValues + timestamp]
    try {
      const buf = new Uint8Array(8);
      globalThis.crypto.getRandomValues(buf);
      let hex = "";
      buf.forEach((b) => (hex += b.toString(16).padStart(2, "0")));
      return `LOG-${Date.now()}-${hex.toUpperCase()}`;
    } catch (e) {
      return `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
    }
  }

  _ambilIdLogStabil(tipe_aktivitas, payload_data) {
    // Sidik jari deterministik (student + materi + tipe + payload).
    // id_log yang sama dipakai ulang untuk kejadian yang persis sama,
    // sehingga 2 instance <dasbor-kuis> selaras dan backend menolak duplikat.
    const tanda = [
      this.studentId,
      this.kdMateri,
      tipe_aktivitas,
      JSON.stringify(payload_data || {}),
      (payload_data && payload_data.timestamp) || "",
    ].join("::");
    let hash = 5381;
    for (let i = 0; i < tanda.length; i++) {
      hash = (((hash << 5) + hash) ^ tanda.charCodeAt(i)) >>> 0;
    }
    const key = "l" + hash.toString(16);
    let lock = {};
    try {
      lock = JSON.parse(localStorage.getItem("a3_v5_id_log_lock") || "{}");
    } catch (e) {
      // abaikan
    }
    if (lock[key]) return lock[key];
    const id = this._generateLogId();
    lock[key] = id;
    const keys = Object.keys(lock);
    if (keys.length > 200) {
      keys.slice(0, keys.length - 150).forEach((k) => delete lock[k]);
    }
    try {
      localStorage.setItem("a3_v5_id_log_lock", JSON.stringify(lock));
    } catch (e) {
      // abaikan
    }
    return id;
  }

  _apiGet(params) {
    const qs = new URLSearchParams(params);
    return fetch(`${this.appsScriptUrl}?${qs.toString()}`, {
      method: "GET",
      mode: "cors",
    })
      .then((r) => r.text())
      .then((teks) => {
        if (!teks || teks.trim().charAt(0) !== "{") {
          return {
            status: "error",
            message: `Respon backend bukan JSON (${teks.slice(0, 80) || "kosong"}). Cek URL /exec & akses deployment.`,
          };
        }
        try {
          return JSON.parse(teks);
        } catch (e) {
          return { status: "error", message: "JSON tidak dapat diurai." };
        }
      })
      .catch((e) => ({ status: "error", message: `Jaringan: ${e.message}` }));
  }

  _deteksiErrorBackend(...respon) {
    for (const r of respon) {
      if (!r) continue;
      if (typeof r.status === "string" && r.status === "error" && r.message) {
        return `Error backend: ${r.message}`;
      }
      if (Array.isArray(r.leaderboard) && !Array.isArray(r.roster) && r.riwayatKuis !== undefined) {
        return "Backend lama (V3) terdeteksi: aksi getStudentRoster tidak dikenal. Deploy lib/codev5.gs lalu Deploy > New version.";
      }
    }
    return "";
  }

  _bacaCacheLokal() {
    try {
      const lokalCache = localStorage.getItem("a3_v5_activity_logs_cache");
      if (!lokalCache) return null;
      const cached = JSON.parse(lokalCache);
      if (cached && typeof cached === "object") return cached;
    } catch (e) {
      // abaikan
    }
    return null;
  }

  async fetchDataKomplit() {
    if (!this.appsScriptUrl) {
      this._serverError = "";
      return;
    }
    this._loading = true;
    try {
if (this.mode === "guru" || this.mode === "dosen") {
        const [roster, leaderboard] = await Promise.all([
          this._apiGet({ action: "getStudentRoster", kelas: this.kelas }),
          this._apiGet({ action: "getLeaderboard", kelas: this.kelas }),
        ]);
        this._serverError = this._deteksiErrorBackend(roster, leaderboard);
        const cached = this._bacaCacheLokal();
        const lb =
          leaderboard &&
          (Array.isArray(leaderboard.leaderboard)
            ? leaderboard.leaderboard
            : Array.isArray(leaderboard.data)
              ? leaderboard.data
              : null);
        const rosterList = Array.isArray(roster.roster)
          ? roster.roster.filter(
              (r) =>
                !this.kelas || !r.kelas || String(r.kelas) === String(this.kelas),
            )
          : null;

        if (this._serverError) {
          if (cached && Array.isArray(cached.roster)) {
            this._serverData = {
              roster: cached.roster,
              leaderboard: cached.leaderboard || [],
              siswa: cached.siswa || null,
              history: cached.history || [],
            };
            this._serverError += " (menampilkan data cache lokal).";
          }
        } else if (!lb) {
          this._serverError =
            "getLeaderboard pada backend aktif belum mengembalikan data leaderboard (hanya daftar pertemuan/sheet). Deploy lib/codev5.gs lalu Deploy > New version.";
          this._serverData = {
            ...this._serverData,
            roster: rosterList || [],
            leaderboard:
              cached && Array.isArray(cached.leaderboard) ? cached.leaderboard : [],
          };
          localStorage.setItem("a3_v5_activity_logs_cache", JSON.stringify(this._serverData));
        } else {
          this._serverData = {
            ...this._serverData,
            roster: rosterList || [],
            leaderboard: lb,
          };
          localStorage.setItem("a3_v5_activity_logs_cache", JSON.stringify(this._serverData));
        }
      } else {
        const sid = this.studentId;
        const [skor, riwayat] = await Promise.all([
          this._apiGet({ action: "getScores", studentId: sid }),
          this._apiGet({
            action: "getActivityHistory",
            studentId: sid,
            kdMateri: this.kdMateri,
            days: 28,
          }),
        ]);
        this._serverError = this._deteksiErrorBackend(skor, riwayat);
        if (this._serverError) {
          const cached = this._bacaCacheLokal();
          if (cached && cached.siswa) {
            this._serverData = {
              roster: cached.roster || [],
              leaderboard: cached.leaderboard || [],
              siswa: cached.siswa,
              history: cached.history || [],
            };
            this._serverError += " (menampilkan data cache lokal).";
          }
        } else {
          this._serverData = {
            ...this._serverData,
            siswa: (skor && skor.data) || null,
            history: (riwayat && riwayat.history) || [],
          };
          localStorage.setItem("a3_v5_activity_logs_cache", JSON.stringify(this._serverData));
        }
      }
    } catch (e) {
      this._serverError = `Gagal memuat data: ${e.message}`;
      const cached = this._bacaCacheLokal();
      if (cached && (Array.isArray(cached.roster) || cached.siswa)) {
        this._serverData = {
          roster: cached.roster || [],
          leaderboard: cached.leaderboard || [],
          siswa: cached.siswa || null,
          history: cached.history || [],
        };
        this._serverError += " (menampilkan data cache lokal).";
      }
    } finally {
      this._loading = false;
      this.requestUpdate();
    }
  }

  logActivity(tipe_aktivitas, payload_data = {}, id_log) {
    const idLog = id_log || this._ambilIdLogStabil(tipe_aktivitas, payload_data);
    // kdMateri & kategori diutamakan dari payload event (diisi kuis-ledakan),
    // fallback ke properti host agar komponen lain tetap berfungsi.
    const kdMateri = (payload_data && payload_data.kdMateri) || this.kdMateri || "";
    const kategori = (payload_data && payload_data.kategori) || this.kategori || "sumatif_lm";
    const newLog = {
      id_log: idLog,
      student_id: this.studentId,
      id_materi: kdMateri,
      kategori: kategori,
      tipe_aktivitas: tipe_aktivitas,
      payload_data: JSON.stringify(payload_data),
      timestamp: new Date().toISOString(),
    };

    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem("a3_v5_sync_queue") || "[]");
    } catch (e) {
      // abaikan
    }
    if (!Array.isArray(queue)) queue = [];
    // Anti double-entry sisi klien: satu id_log / satu event hanya boleh
    // hadir sekali di antrean walau ada beberapa instansi <dasbor-kuis>
    // pada halaman yang sama ikut menangkap event "dasbor-kuis-log".
    const sudahAda = queue.some((q) => q && q.id_log === idLog);
    if (!sudahAda) {
      queue.push(newLog);
      localStorage.setItem("a3_v5_sync_queue", JSON.stringify(queue));
    }

    this._flushQueue();
    this.dispatchEvent(
      new CustomEvent("dasbor-kuis-activity", {
        detail: newLog,
        bubbles: true,
        composed: true,
      }),
    );
  }

  async _flushQueue() {
    if (
      this._isFlushing ||
      !this.appsScriptUrl ||
      !navigator.onLine ||
      globalThis.__a3V5FlushLock
    ) {
      return;
    }

    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem("a3_v5_sync_queue") || "[]");
    } catch (e) {
      // abaikan
    }
    if (queue.length === 0) return;

    // Pangkas entri tanpa student_id: mustahil diterima backend, hanya membuat
    // antrean menumpuk (mis. instance guru tanpa akun siswa menangkap event).
    const layakKirim = queue.filter((log) => log && log.student_id);
    if (layakKirim.length !== queue.length) {
      queue = layakKirim;
      localStorage.setItem("a3_v5_sync_queue", JSON.stringify(queue));
    }
    if (queue.length === 0) return;

    // Kunci flush global: mencegah beberapa instansi <dasbor-kuis> mengirim
    // antrean yang sama secara bersamaan (satu id_log = satu request maksimal).
    this._isFlushing = true;
    globalThis.__a3V5FlushLock = true;
    try {
      const hasil = await Promise.all(
        queue.map((log) =>
          this._apiGet({
            action: "logActivity",
            studentId: log.student_id,
            nama: this.namaSiswa,
            nis: this.nis,
            absen: this.absen,
            kelas: this.kelas,
            type: log.tipe_aktivitas,
            description: log.payload_data,
            timestamp: log.timestamp,
            kdMateri: log.id_materi,
            kategori: log.kategori || "sumatif_lm",
            id_log: log.id_log,
          }),
        ),
      );
      // ADAPTASI LAMA: [Flush antrean masal] — hanya log yang berhasil
      // (termasuk duplikat yang ditolak diam-diam oleh backend) yang dihapus;
      // yang gagal tetap tinggal untuk dicoba saat online berikutnya.
      const idBerhasil = new Set(
        queue
          .filter((log, i) => hasil[i] && hasil[i].status === "ok")
          .map((log) => log.id_log),
      );
      let masukanTerbaru = [];
      try {
        masukanTerbaru = JSON.parse(
          localStorage.getItem("a3_v5_sync_queue") || "[]",
        );
      } catch (e) {
        // abaikan
      }
      if (!Array.isArray(masukanTerbaru)) masukanTerbaru = [];
      const sisa = masukanTerbaru.filter((log) => !idBerhasil.has(log.id_log));
      localStorage.setItem("a3_v5_sync_queue", JSON.stringify(sisa));
      if (sisa.length < masukanTerbaru.length) this.fetchDataKomplit();
    } catch (e) {
      console.error("Sinkronisasi tertunda", e);
    } finally {
      this._isFlushing = false;
      globalThis.__a3V5FlushLock = false;
      this.requestUpdate();
    }
  }

  _num(v) {
    const n = parseInt(v);
    return isNaN(n) ? 0 : n;
  }

  _rowValue(row, key) {
    if (!row) return "";
    if (typeof row[key] !== "undefined") return row[key];
    const k = Object.keys(row).find(
      (k2) => String(k2).trim().toLowerCase() === String(key).toLowerCase(),
    );
    return k ? row[k] : "";
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 40%, #f1f5f9 100%);
          color: #0f172a;
          padding: var(--ddd-spacing-6);
          min-height: 100vh;
          font-family: var(--ddd-font-primary);
        }
        .app-container {
          background: #ffffff;
          border-radius: var(--ddd-radius-xl);
          box-shadow: var(--ddd-boxShadow-lg);
          overflow: hidden;
          max-width: 1200px;
          margin: 0 auto;
          border: var(--ddd-border-xs);
        }

        /* Navbar */
        .navbar {
          background: linear-gradient(120deg, #312e81 0%, #4f46e5 55%, #6d28d9 100%);
          color: #ffffff;
          padding: var(--ddd-spacing-5) var(--ddd-spacing-6);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--ddd-spacing-3);
          flex-wrap: wrap;
        }
        .navbar h1 {
          margin: var(--ddd-spacing-0);
          font-size: var(--ddd-font-size-l);
          font-weight: var(--ddd-font-weight-black);
          letter-spacing: -0.02em;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-3);
        }
        .logo-badge {
          width: 38px;
          height: 38px;
          border-radius: var(--ddd-radius-md);
          background: rgb(255 255 255 / 0.15);
          border: 1px solid rgb(255 255 255 / 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--ddd-font-size-xxs);
        }
        .navbar-right {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-3);
          flex-wrap: wrap;
        }
        .user-pill {
          background: rgb(255 255 255 / 0.14);
          border: 1px solid rgb(255 255 255 / 0.2);
          padding: 6px 14px;
          border-radius: var(--ddd-radius-rounded);
          font-size: 12px;
          font-weight: var(--ddd-font-weight-bold);
          backdrop-filter: blur(4px);
        }
        .mode-switch {
          display: flex;
          background: rgb(0 0 0 / 0.2);
          border-radius: var(--ddd-radius-rounded);
          padding: var(--ddd-spacing-1);
          gap: var(--ddd-spacing-1);
          border: 1px solid rgb(255 255 255 / 0.2);
        }
        .mode-btn {
          border: none;
          background: transparent;
          color: rgb(255 255 255 / 0.75);
          padding: 6px 14px;
          border-radius: var(--ddd-radius-rounded);
          font-size: 12px;
          font-weight: var(--ddd-font-weight-bold);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .mode-btn.active {
          background: #ffffff;
          color: #4f46e5;
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .mode-switch[hidden] { display: none; }

        /* Tab menu */
        .tabs {
          display: flex;
          background: #f8fafc;
          padding: var(--ddd-spacing-2);
          gap: var(--ddd-spacing-2);
          border-bottom: var(--ddd-border-xs);
          overflow-x: auto;
        }
        .tab-btn {
          flex: 1;
          min-width: max-content;
          padding: 10px 16px;
          cursor: pointer;
          background: none;
          border: none;
          font-weight: var(--ddd-font-weight-bold);
          font-size: 13px;
          color: #64748b;
          border-radius: var(--ddd-radius-md);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        .tab-btn:hover {
          background: #eef2ff;
          color: #4338ca;
        }
        .tab-btn.active {
          background: linear-gradient(120deg, #4f46e5, #6d28d9);
          color: #ffffff;
          box-shadow: var(--ddd-boxShadow-sm);
        }

        .main-content {
          padding: var(--ddd-spacing-6);
          min-height: 450px;
        }

        /* Stat cards */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--ddd-spacing-4);
          margin-bottom: var(--ddd-spacing-5);
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-4);
          padding: var(--ddd-spacing-4);
          border-radius: var(--ddd-radius-lg);
          background: #ffffff;
          border: var(--ddd-border-xs);
          box-shadow: var(--ddd-boxShadow-sm);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--ddd-boxShadow-md);
        }
        .stat-icon {
          width: 46px;
          height: 46px;
          border-radius: var(--ddd-radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--ddd-font-size-xs);
          flex-shrink: 0;
        }
        .stat-icon.i-indigo { background: #eef2ff; }
        .stat-icon.i-emerald { background: #ecfdf5; }
        .stat-icon.i-amber { background: #fffbeb; }
        .stat-icon.i-rose { background: #fff1f2; }
        .stat-meta { min-width: 0; }
        .stat-value {
          font-size: var(--ddd-font-size-xs);
          font-weight: var(--ddd-font-weight-black);
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .stat-label {
          font-size: 11px;
          font-weight: var(--ddd-font-weight-bold);
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* Guru monitor cards */
        .grid-heatmap {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: var(--ddd-spacing-4);
        }
        .card-siswa {
          padding: var(--ddd-spacing-4);
          border-radius: var(--ddd-radius-lg);
          border: var(--ddd-border-xs);
          background: #ffffff;
          box-shadow: var(--ddd-boxShadow-sm);
          transition: all 0.2s ease;
        }
        .card-siswa:hover {
          transform: translateY(-3px);
          box-shadow: var(--ddd-boxShadow-lg);
          border-color: #c7d2fe;
        }
        .card-siswa.lvl-high { border-top: 4px solid #22c55e; }
        .card-siswa.lvl-mid { border-top: 4px solid #f59e0b; }
        .card-siswa.lvl-low { border-top: 4px solid #ef4444; }
        .student-head {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-3);
          margin-bottom: var(--ddd-spacing-3);
        }
        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: var(--ddd-font-weight-black);
          font-size: 15px;
          flex-shrink: 0;
        }
        .student-name { font-weight: var(--ddd-font-weight-bold); font-size: 14px; }
        .student-sub { font-size: 11px; color: #94a3b8; }
        .badge-status {
          display: inline-flex;
          align-items: center;
          gap: var(--ddd-spacing-1);
          padding: 3px 10px;
          font-size: 11px;
          font-weight: var(--ddd-font-weight-bold);
          border-radius: var(--ddd-radius-rounded);
          margin-top: var(--ddd-spacing-2);
        }
        .badge-good { background: #dcfce7; color: #166534; }
        .badge-warn { background: #fef3c7; color: #92400e; }
        .badge-bad { background: #fee2e2; color: #991b1b; }
        .metric-mini {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--ddd-spacing-2);
          margin-top: var(--ddd-spacing-3);
          font-size: 11px;
          text-align: center;
          color: #475569;
        }
        .metric-mini div {
          background: #f8fafc;
          border-radius: var(--ddd-radius-sm);
          padding: 6px 4px;
          font-weight: var(--ddd-font-weight-bold);
        }
        .progress-track {
          background: #e2e8f0;
          width: 100%;
          height: 8px;
          border-radius: var(--ddd-radius-rounded);
          overflow: hidden;
          margin: 10px 0 4px;
        }
        .progress-bar {
          background: linear-gradient(90deg, #4f46e5, #8b5cf6);
          height: 100%;
          border-radius: var(--ddd-radius-rounded);
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .score-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: var(--ddd-font-weight-bold);
          color: #334155;
        }

        /* Podium */
        .podium-section {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: var(--ddd-spacing-4);
          margin: var(--ddd-spacing-6) 0;
          flex-wrap: wrap;
        }
        .podium-box {
          background: #ffffff;
          border: var(--ddd-border-sm);
          border-radius: var(--ddd-radius-xl);
          padding: var(--ddd-spacing-5);
          text-align: center;
          width: 170px;
          box-shadow: var(--ddd-boxShadow-sm);
          transition: transform 0.2s ease;
        }
        .podium-box:hover { transform: translateY(-4px); }
        .podium-box.rank-1 {
          border-color: #fcd34d;
          background: linear-gradient(180deg, #fffbeb, #ffffff);
          height: 190px;
          box-shadow: var(--ddd-boxShadow-lg);
        }
        .podium-box.rank-2 { height: 160px; border-color: #cbd5e1; }
        .podium-box.rank-3 { height: 140px; border-color: #d8b4fe; }
        .podium-medal { font-size: 32px; }
        .podium-name { font-weight: var(--ddd-font-weight-black); font-size: 14px; margin-top: var(--ddd-spacing-2); }
        .podium-score {
          font-size: var(--ddd-font-size-xxs);
          font-weight: var(--ddd-font-weight-black);
          color: #4f46e5;
        }

        /* Tabel */
        .table-wrap {
          overflow-x: auto;
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-lg);
          background: #ffffff;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        th {
          background: #f8fafc;
          padding: 12px 14px;
          color: #475569;
          font-weight: var(--ddd-font-weight-bold);
          border-bottom: var(--ddd-border-sm);
          white-space: nowrap;
        }
        td {
          padding: 12px 14px;
          border-bottom: var(--ddd-border-xs);
          color: #1e293b;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #f8fafc; }
        tr.highlight-row td { background: #f5f3ff !important; font-weight: var(--ddd-font-weight-bold); }
        .rank-chip {
          display: inline-flex;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          align-items: center;
          justify-content: center;
          font-weight: var(--ddd-font-weight-black);
          font-size: 12px;
          background: #eef2ff;
          color: #4338ca;
        }
        .rank-chip.top { background: #fbbf24; color: #78350f; }
        .grade-chip {
          padding: 3px 10px;
          border-radius: var(--ddd-radius-rounded);
          font-weight: var(--ddd-font-weight-black);
          font-size: 12px;
        }
        .grade-A { background: #dcfce7; color: #166534; }
        .grade-B { background: #dbeafe; color: #1e40af; }
        .grade-C { background: #fef3c7; color: #92400e; }
        .grade-D, .grade-E { background: #fee2e2; color: #991b1b; }

        /* Hasil siswa */
        .hasil-hero {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: var(--ddd-spacing-5);
          margin-bottom: var(--ddd-spacing-5);
        }
        @media (max-width: 720px) {
          .hasil-hero { grid-template-columns: 1fr; }
        }
        .grade-ring-card {
          background: linear-gradient(160deg, #312e81, #6d28d9);
          border-radius: var(--ddd-radius-xl);
          padding: var(--ddd-spacing-5);
          color: #ffffff;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: var(--ddd-boxShadow-lg);
        }
        .grade-ring {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: conic-gradient(#fbbf24 0deg, rgb(255 255 255 / 0.15) 0deg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--ddd-spacing-3);
        }
        .grade-ring-inner {
          width: 92px;
          height: 92px;
          border-radius: 50%;
          background: #312e81;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .ring-nilai { font-size: 26px; font-weight: var(--ddd-font-weight-black); line-height: 1; }
        .ring-label { font-size: 10px; opacity: 0.75; }
        .grade-big {
          font-size: var(--ddd-font-size-ms);
          font-weight: var(--ddd-font-weight-black);
          background: #fbbf24;
          color: #78350f;
          border-radius: var(--ddd-radius-lg);
          padding: 2px 16px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--ddd-spacing-3);
        }
        .kpi-card {
          background: #ffffff;
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-4);
          text-align: center;
          transition: all 0.2s ease;
        }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px -8px rgb(15 23 42 / 0.2); }
        .kpi-value { font-size: 24px; font-weight: var(--ddd-font-weight-black); color: #4f46e5; }
        .kpi-value.ok { color: #16a34a; }
        .kpi-value.warn { color: #d97706; }
        .kpi-label { font-size: 11px; font-weight: var(--ddd-font-weight-bold); color: #64748b; margin-top: 4px; }
        .kpi-bar { height: 6px; border-radius: var(--ddd-radius-rounded); background: #e2e8f0; margin-top: var(--ddd-spacing-3); overflow: hidden; }
        .kpi-bar > div { height: 100%; border-radius: var(--ddd-radius-rounded); background: linear-gradient(90deg, #4f46e5, #8b5cf6); }

        /* Heatmap siswa */
        .heatmap-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(26px, 1fr));
          gap: var(--ddd-spacing-2);
          margin-top: var(--ddd-spacing-4);
          max-width: 620px;
        }
        .box-heatmap {
          width: 26px;
          height: 26px;
          border-radius: var(--ddd-radius-sm);
          border: var(--ddd-border-xs);
          transition: all 0.15s ease-in-out;
          position: relative;
        }
        .box-heatmap:hover {
          transform: scale(1.25) translateY(-3px);
          box-shadow: var(--ddd-boxShadow-md);
          z-index: 10;
        }
        .lvl-0 { background: #f1f5f9; }
        .lvl-1 { background: #c7d2fe; border-color: #a5b4fc; }
        .lvl-2 { background: #818cf8; border-color: #6366f1; }
        .lvl-3 { background: #4f46e5; border-color: #4338ca; }
        .lvl-4 { background: #312e81; border-color: #1e1b4b; }

        .empty-state {
          border: 2px dashed #cbd5e1;
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-6);
          text-align: center;
          color: #64748b;
          background: #f8fafc;
          font-size: 14px;
        }
        .empty-state code {
          background: #eef2ff;
          color: #4338ca;
          border-radius: var(--ddd-radius-sm);
          padding: 2px 8px;
          font-size: 12px;
          word-break: break-all;
        }
        .err-chip {
          display: block;
          margin: 10px auto 0;
          max-width: 640px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #991b1b;
          border-radius: var(--ddd-radius-md);
          padding: 8px 14px;
          font-size: 12px;
          font-weight: var(--ddd-font-weight-bold);
        }
        .retry-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--ddd-spacing-2);
          margin-top: var(--ddd-spacing-4);
          padding: 10px 18px;
          background: linear-gradient(120deg, #4f46e5, #6d28d9);
          color: #ffffff;
          border: none;
          border-radius: var(--ddd-radius-md);
          font-weight: var(--ddd-font-weight-bold);
          font-size: 13px;
          cursor: pointer;
          box-shadow: var(--ddd-boxShadow-sm);
          transition: all 0.2s ease;
        }
        .retry-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--ddd-boxShadow-md);
        }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ddd-spacing-3);
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: var(--ddd-spacing-4);
        }
        .tb-filter { display: flex; flex-direction: column; gap: var(--ddd-spacing-1); }
        .tb-filter label { font-size: 12px; font-weight: var(--ddd-font-weight-bold); color: #475569; }
        .filter-select {
          border: 1px solid #cbd5e1;
          border-radius: var(--ddd-radius-sm);
          padding: 8px 10px;
          font-size: 13px;
          background: #fff;
          color: #1e293b;
        }
        .tb-action { display: flex; gap: var(--ddd-spacing-2); flex-wrap: wrap; }
        .note-chip {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          font-size: 12px;
          font-weight: var(--ddd-font-weight-bold);
          padding: 8px 12px;
          border-radius: var(--ddd-radius-sm);
          flex-basis: 100%;
        }
        .nilai-table-wrap {
          overflow-x: auto;
          background: #fff;
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-md);
          margin-bottom: var(--ddd-spacing-4);
        }
        .nilai-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .nilai-table th {
          text-align: left;
          padding: 10px 12px;
          background: #f8fafc;
          color: #475569;
          font-size: 12px;
          font-weight: var(--ddd-font-weight-bold);
          border-bottom: var(--ddd-border-xs);
          white-space: nowrap;
        }
        .nilai-table td {
          padding: 8px 12px;
          border-bottom: var(--ddd-border-xs);
          vertical-align: middle;
        }
        .nilai-input {
          width: 84px;
          border: 1px solid #cbd5e1;
          border-radius: var(--ddd-radius-sm);
          padding: 6px 8px;
          font-size: 13px;
          background: #fff;
          color: #1e293b;
        }
        .soal-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: var(--ddd-radius-md);
          padding: var(--ddd-spacing-3);
          font-family: "JetBrains Mono", Consolas, monospace;
          font-size: 12px;
          line-height: 1.5;
          background: #f8fafc;
          color: #0f172a;
          resize: vertical;
          margin-bottom: var(--ddd-spacing-4);
        }
        .card-panel {
          background: #fff;
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-md);
          padding: var(--ddd-spacing-4);
          margin-bottom: var(--ddd-spacing-4);
          display: flex;
          flex-direction: column;
          gap: var(--ddd-spacing-4);
        }
        .set-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          align-items: center;
          justify-content: space-between;
          padding-bottom: var(--ddd-spacing-4);
          border-bottom: var(--ddd-border-xs);
        }
        .set-row:last-of-type { border-bottom: 0; padding-bottom: 0; }
        .set-title { font-size: 13px; font-weight: var(--ddd-font-weight-bold); color: #1e293b; }
        .set-sub { font-size: 12px; color: #64748b; margin-top: 2px; max-width: 480px; }
        .set-input {
          border: 1px solid #cbd5e1;
          border-radius: var(--ddd-radius-sm);
          padding: 8px 10px;
          font-size: 13px;
          background: #fff;
          color: #1e293b;
          min-width: 280px;
          font-family: "JetBrains Mono", Consolas, monospace;
        }
        .switch-check {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-2);
          font-size: 13px;
          font-weight: var(--ddd-font-weight-bold);
          color: #334155;
          cursor: pointer;
          min-width: 280px;
        }
        .copas-panel {
          background: #f8fafc;
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-md);
          padding: var(--ddd-spacing-4);
          margin-bottom: var(--ddd-spacing-4);
        }
        .copas-area {
          width: 100%;
          box-sizing: border-box;
          font-family: "Consolas", monospace;
          font-size: 12px;
          line-height: 1.5;
          border: 1px solid #cbd5e1;
          border-radius: var(--ddd-radius-sm);
          padding: var(--ddd-spacing-3);
          background: #fff;
          color: #1e293b;
          white-space: pre;
        }
        .nama-btn {
          background: none;
          border: none;
          color: #4f46e5;
          font-weight: var(--ddd-font-weight-bold);
          font-size: 13px;
          cursor: pointer;
          padding: var(--ddd-spacing-0);
          text-align: left;
          text-decoration: underline dotted;
        }
        .nama-btn:hover { color: #312e81; }
        .detail-panel {
          border: 1px solid #c7d2fe;
          background: #eef2ff;
          border-radius: var(--ddd-radius-md);
          padding: var(--ddd-spacing-5);
          margin-bottom: var(--ddd-spacing-5);
        }
        .dEdit-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--ddd-spacing-3);
          margin: var(--ddd-spacing-4) 0;
        }
        .dEdit-label { font-size: 12px; font-weight: var(--ddd-font-weight-bold); color: #475569; }
        .dEdit-input {
          border: 1px solid #cbd5e1;
          border-radius: var(--ddd-radius-sm);
          padding: 8px 10px;
          font-size: 13px;
          background: #fff;
          color: #1e293b;
          width: 100%;
          box-sizing: border-box;
        }
        .detail-stats {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ddd-spacing-4);
          font-size: 12px;
          color: #334155;
          margin-bottom: var(--ddd-spacing-3);
        }
        .action-row { display: flex; gap: var(--ddd-spacing-2); flex-wrap: wrap; }
        .heatmap-head {
          display: flex;
          gap: var(--ddd-spacing-1);
          margin: 10px 0 4px;
          font-size: 10px;
          color: #94a3b8;
          font-weight: var(--ddd-font-weight-bold);
        }
        .heatmap-head span { width: 100%; text-align: center; }
        .heatmap-legend {
          display: flex;
          gap: var(--ddd-spacing-2);
          align-items: center;
          margin: 8px 0 12px;
          font-size: 11px;
          color: #94a3b8;
        }
        .legend-box {
          width: 13px;
          height: 13px;
          border-radius: var(--ddd-radius-xs);
          border: 2px solid transparent;
        }
        .legend-box.lvl-0 { background: #f1f5f9; }
        .legend-box.lvl-1 { background: #c7d2fe; border-color: #a5b4fc; }
        .legend-box.lvl-2 { background: #818cf8; border-color: #6366f1; }
        .legend-box.lvl-3 { background: #4f46e5; border-color: #4338ca; }
        .legend-box.lvl-4 { background: #312e81; border-color: #1e1b4b; }
        .li-log {
          display: flex;
          gap: var(--ddd-spacing-2);
          font-size: 12px;
          background: #f8fafc;
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-sm);
          padding: 7px 10px;
        }
        .lt-log {
          color: #64748b;
          font-weight: var(--ddd-font-weight-bold);
          white-space: nowrap;
          margin-top: var(--ddd-spacing-1);
        }
        .ld-log { color: #334155; }
        .status-footer {
          background: #f8fafc;
          padding: var(--ddd-spacing-3) var(--ddd-spacing-6);
          font-size: 12px;
          color: #64748b;
          border-top: var(--ddd-border-xs);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--ddd-spacing-3);
          flex-wrap: wrap;
        }
        .indicator { display: flex; align-items: center; gap: var(--ddd-spacing-2); }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          display: inline-block;
        }
        .dot.loading { background: #eab308; animation: pulse 1s infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .loading-banner {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-3);
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          color: #4338ca;
          border-radius: var(--ddd-radius-md);
          padding: 12px 16px;
          font-weight: var(--ddd-font-weight-bold);
          font-size: 13px;
          margin-bottom: var(--ddd-spacing-4);
        }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #c7d2fe;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `,
      css`
        /* ============================================================
           DARK MODE OVERRIDES (additive, gated on body.dark-mode)
           Host-context reaches outside shadow DOM to read the class
           that the HAXcms shell sets in localStorage / prefers-color.
           ============================================================ */
        :host-context(body.dark-mode) :host {
          --dk-bg-app: #0b1020;
          --dk-bg-card: #111827;
          --dk-bg-soft: #1f2937;
          --dk-bg-softer: #182032;
          --dk-border: #2a3245;
          --dk-text: #e5e7eb;
          --dk-text-soft: #94a3b8;
          --dk-text-strong: #f8fafc;
          /* Override DDD base tokens used inside templates */
          --ddd-theme-background: var(--dk-bg-app);
          --ddd-theme-color: var(--dk-text);
          --ddd-theme-surface: var(--dk-bg-card);
          background: linear-gradient(180deg, #0b1020 0%, #0f172a 40%, #0b1020 100%);
          color: var(--dk-text);
        }
        :host-context(body.dark-mode) .app-container,
        :host-context(body.dark-mode) .stat-card,
        :host-context(body.dark-mode) .student-card,
        :host-context(body.dark-mode) .card-siswa,
        :host-context(body.dark-mode) .card-panel,
        :host-context(body.dark-mode) .nilai-table-wrap,
        :host-context(body.dark-mode) .podium-box,
        :host-context(body.dark-mode) .kpi-card,
        :host-context(body.dark-mode) .grade-ring-card,
        :host-context(body.dark-mode) .detail-panel,
        :host-context(body.dark-mode) .copas-panel,
        :host-context(body.dark-mode) .loading-banner {
          background: var(--dk-bg-card);
          color: var(--dk-text);
          border-color: var(--dk-border);
        }
        :host-context(body.dark-mode) .navbar {
          background: linear-gradient(120deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%);
          color: #f8fafc;
        }
        :host-context(body.dark-mode) .stat-icon.i-indigo { background: #312e81; color: #c7d2fe; }
        :host-context(body.dark-mode) .stat-icon.i-emerald { background: #064e3b; color: #6ee7b7; }
        :host-context(body.dark-mode) .stat-icon.i-amber { background: #78350f; color: #fcd34d; }
        :host-context(body.dark-mode) .stat-icon.i-rose { background: #881337; color: #fda4af; }
        :host-context(body.dark-mode) .stat-value,
        :host-context(body.dark-mode) .ring-nilai,
        :host-context(body.dark-mode) .kpi-value,
        :host-context(body.dark-mode) .set-title,
        :host-context(body.dark-mode) .student-name,
        :host-context(body.dark-mode) .crn,
        :host-context(body.dark-mode) h1,
        :host-context(body.dark-mode) h2:not(.navbar *) {
          color: var(--dk-text-strong);
        }
        :host-context(body.dark-mode) .stat-label,
        :host-context(body.dark-mode) .student-sub,
        :host-context(body.dark-mode) .kpi-label,
        :host-context(body.dark-mode) .set-sub,
        :host-context(body.dark-mode) .dEdit-label,
        :host-context(body.dark-mode) .student-sub { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .badge-good { background: #064e3b; color: #6ee7b7; }
        :host-context(body.dark-mode) .badge-warn { background: #78350f; color: #fcd34d; }
        :host-context(body.dark-mode) .badge-bad { background: #7f1d1d; color: #fca5a5; }
        :host-context(body.dark-mode) .badge-status { background: var(--dk-bg-soft); color: var(--dk-text); border: 1px solid var(--dk-border); }
        :host-context(body.dark-mode) .grade-A { background: #064e3b; color: #6ee7b7; }
        :host-context(body.dark-mode) .grade-B { background: #1e3a8a; color: #93c5fd; }
        :host-context(body.dark-mode) .grade-C { background: #78350f; color: #fcd34d; }
        :host-context(body.dark-mode) .grade-D,
        :host-context(body.dark-mode) .grade-E { background: #7f1d1d; color: #fca5a5; }
        :host-context(body.dark-mode) .rank-chip { background: var(--dk-bg-soft); color: var(--dk-text); }
        :host-context(body.dark-mode) .rank-chip.top { background: #b45309; color: #fde68a; }
        :host-context(body.dark-mode) .podium-box.rank-1 { background: linear-gradient(180deg, #78350f 0%, #422006 100%); color: #fde68a; border-color: #b45309; }
        :host-context(body.dark-mode) .podium-box.rank-2 { background: var(--dk-bg-soft); color: var(--dk-text); border-color: #475569; }
        :host-context(body.dark-mode) .podium-box.rank-3 { background: var(--dk-bg-softer); color: var(--dk-text); border-color: #5b21b6; }
        :host-context(body.dark-mode) .podium-score { color: #fde68a; }
        :host-context(body.dark-mode) .podium-name { color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .tab-row,
        :host-context(body.dark-mode) .tabs {
          background: var(--dk-bg-card);
          border-bottom-color: var(--dk-border);
        }
        :host-context(body.dark-mode) .tab-btn { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .tab-btn:hover { color: var(--dk-text); }
        :host-context(body.dark-mode) .tab-btn.active { color: #c4b5fd; border-bottom-color: #818cf8; }
        :host-context(body.dark-mode) .mode-btn { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .mode-btn.active { background: rgba(255,255,255,0.18); color: #f8fafc; }
        :host-context(body.dark-mode) .nilai-table { background: var(--dk-bg-card); color: var(--dk-text); }
        :host-context(body.dark-mode) .nilai-table th { background: var(--dk-bg-soft); color: var(--dk-text-strong); border-bottom-color: var(--dk-border); }
        :host-context(body.dark-mode) .nilai-table td { border-bottom-color: var(--dk-border); color: var(--dk-text); }
        :host-context(body.dark-mode) .nilai-table tr:hover { background: var(--dk-bg-soft); }
        :host-context(body.dark-mode) .nilai-table tr.highlight-row { background: rgba(99,102,241,0.15); }
        :host-context(body.dark-mode) .filter-select,
        :host-context(body.dark-mode) .set-input,
        :host-context(body.dark-mode) .dEdit-input,
        :host-context(body.dark-mode) .nilai-input,
        :host-context(body.dark-mode) .soal-textarea,
        :host-context(body.dark-mode) .copas-area {
          background: var(--dk-bg-soft);
          color: var(--dk-text);
          border-color: var(--dk-border);
        }
        :host-context(body.dark-mode) .progress-track { background: var(--dk-bg-soft); }
        :host-context(body.dark-mode) .progress-bar { background: #818cf8; }
        :host-context(body.dark-mode) .kpi-bar { background: var(--dk-bg-soft); }
        :host-context(body.dark-mode) .lvl-0 { background: #1f2937; border-color: #2a3245; }
        :host-context(body.dark-mode) .lvl-1 { background: #312e81; border-color: #4338ca; }
        :host-context(body.dark-mode) .lvl-2 { background: #4338ca; border-color: #6366f1; }
        :host-context(body.dark-mode) .lvl-3 { background: #6366f1; border-color: #818cf8; }
        :host-context(body.dark-mode) .lvl-4 { background: #818cf8; border-color: #c7d2fe; }
        :host-context(body.dark-mode) .box-heatmap { border-color: var(--dk-border); }
        :host-context(body.dark-mode) .box-heatmap:hover { box-shadow: 0 0 0 2px #818cf8; }
        :host-context(body.dark-mode) .empty-state { background: var(--dk-bg-card); color: var(--dk-text-soft); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .empty-state code { background: var(--dk-bg-soft); color: #c4b5fd; }
        :host-context(body.dark-mode) .note-chip { background: var(--dk-bg-soft); color: var(--dk-text); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .log-area { background: var(--dk-bg-soft); color: var(--dk-text); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .log-area li { border-bottom-color: var(--dk-border); }
        :host-context(body.dark-mode) .metric-mini { background: var(--dk-bg-soft); color: var(--dk-text); }
        :host-context(body.dark-mode) .metric-mini div { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .btn-primary { background: #4f46e5; color: #f8fafc; }
        :host-context(body.dark-mode) .btn-primary:hover { background: #6366f1; }
        :host-context(body.dark-mode) .retry-btn { background: #4f46e5; color: #f8fafc; }
        :host-context(body.dark-mode) .retry-btn:hover { background: #6366f1; }
        :host-context(body.dark-mode) .err-chip { background: #7f1d1d; color: #fecaca; border-color: #991b1b; }
        :host-context(body.dark-mode) .error-banner { background: #7f1d1d; color: #fecaca; border-color: #991b1b; }
        :host-context(body.dark-mode) .loading-banner { background: #1e1b4b; border-color: #4338ca; color: #c7d2fe; }
        :host-context(body.dark-mode) .spinner { border-color: #4338ca; border-top-color: #818cf8; }
        :host-context(body.dark-mode) .ld-log { color: var(--dk-text-soft); }
        /* Inline-style overrides — !important needed to win over style="" */
        :host-context(body.dark-mode) p[style*="color:#64748b"],
        :host-context(body.dark-mode) p[style*="color:#1e293b"],
        :host-context(body.dark-mode) h2[style*="color:#1e293b"] { color: var(--dk-text-soft) !important; }
        :host-context(body.dark-mode) h2[style*="color:#1e293b"] { color: var(--dk-text-strong) !important; }
        :host-context(body.dark-mode) .retry-btn[style*="background:#475569"] { background: var(--dk-bg-soft) !important; color: var(--dk-text) !important; }
        :host-context(body.dark-mode) .retry-btn[style*="background:#4f46e5"] { background: #6366f1 !important; }
        :host-context(body.dark-mode) .retry-btn[style*="background:#059669"] { background: #047857 !important; }
      `,
    ];
  }

  // ==========================================
  // RENDER
  // ==========================================
  render() {
    let queueLength = 0;
    try {
      queueLength = JSON.parse(localStorage.getItem("a3_v5_sync_queue") || "[]").length;
    } catch (e) {
      queueLength = 0;
    }

    const isGuru = this.mode === "guru" || this.mode === "dosen";
    const tabs = isGuru
      ? [
          { id: "pantauan", label: "📊 Pantauan Guru" },
          { id: "leaderboard", label: "🏆 Leaderboard Kelas" },
          { id: "peringkat", label: "🏆 Peringkat Nilai Bimbingan Kelas" },
          { id: "kehadiran", label: "🎯 Dashboard Pembelajaran" },
          { id: "nilai", label: "✏️ Input Nilai" },
          { id: "kuis", label: "📝 Evaluasi Kuis" },
          { id: "forum", label: "💬 Ruang Diskusi" },
          { id: "soal", label: "🗂️ Edit Soal" },
          { id: "atur", label: "⚙️ Atur" },
        ]
      : [
          { id: "pembelajaran", label: "🎯 Dashboard Pembelajaran" },
          { id: "hasil", label: "📈 Hasil & Nilai" },
          { id: "kuis", label: "📝 Evaluasi Kuis" },
          { id: "forum", label: "💬 Ruang Diskusi" },
        ];

    const identitas =
      this.mode === "siswa" ? this.namaSiswa || "Siswa" : "Guru / Wali Kelas";

    return html`
      <div class="app-container">
        <div class="navbar">
          <h1><span class="logo-badge">🎓</span> ${
            this.mode === "siswa"
              ? "Dasbor Evaluasi Siswa V5"
              : "Dasbor Evaluasi Guru V5"
          }</h1>
          <div class="navbar-right">
            <div
              class="mode-switch"
              role="group"
              aria-label="Mode tampilan"
              ?hidden=${!this.allowModeSwitch}
            >
              <button
                class="mode-btn ${this.mode === "guru" || this.mode === "dosen" ? "active" : ""}"
                @click=${() => (this.mode = "guru")}
              >👨‍🏫 Guru</button>
              <button
                class="mode-btn ${this.mode === "siswa" ? "active" : ""}"
                @click=${() => (this.mode = "siswa")}
              >🎓 Siswa</button>
            </div>
            <div class="user-pill">👤 ${identitas} (${this.kelas || "Kelas"})</div>
          </div>
        </div>

        <div class="tabs" role="tablist">
          ${tabs.map(
            (t) => html`
              <button
                class="tab-btn ${this._activeTab === t.id ? "active" : ""}"
                role="tab"
                aria-selected=${this._activeTab === t.id}
                @click=${() => (this._activeTab = t.id)}
              >${t.label}</button>
            `,
          )}
        </div>

        <div class="main-content">
          ${(this._loading &&
            (this.mode === "guru" || this.mode === "dosen"
              ? this._activeTab === "pantauan" || this._activeTab === "peringkat"
              : this._activeTab === "pembelajaran" || this._activeTab === "hasil"))
            ? html`
                <div class="loading-banner">
                  <span class="spinner"></span>
                  Memuat data dari Google Apps Script…
                </div>
              `
            : ""}
          ${this._renderContent()}
        </div>

        <div class="status-footer">
          <div class="indicator">
            <span class="dot ${this._isFlushing ? "loading" : ""}"></span>
            <span>Konektivitas: ${this._isFlushing ? "Menyinkronkan data masal..." : "Terhubung"}</span>
          </div>
          <div>Antrean Transaksi Tertunda: ${queueLength} data</div>
        </div>
      </div>
    `;
  }

  _renderContent() {
    if (this.mode === "guru" || this.mode === "dosen") {
      if (this._activeTab === "pantauan") return this._renderPantauanGuru();
      if (this._activeTab === "leaderboard") return this._renderLeaderboard();
      if (this._activeTab === "peringkat")
        return this._renderPeringkatBimbingan();
      if (this._activeTab === "kehadiran")
        return this._renderDashboardPembelajaran();
      if (this._activeTab === "nilai") return this._renderInputNilai();
      if (this._activeTab === "kuis") return this._renderKuisWadah();
      if (this._activeTab === "soal") return this._renderEditSoal();
      if (this._activeTab === "atur") return this._renderPengaturan();
      if (this._activeTab === "forum")
        return html`
          <ruang-diskusi
            .forumApiUrl=${this.forumApiUrl || this.appsScriptUrl}
            .appsScriptUrl=${this.appsScriptUrl}
            .sheetName=${this.kdMateri}
            .studentId=${this.studentId}
            .studentName=${this.namaSiswa || "Guru"}
            .studentKelas=${this.kelas}
            .viewMode=${this.mode === "guru" ? "lecturer" : "student"}
            forum-topic="Diskusi Materi ${this.kdMateri}"
          ></ruang-diskusi>
          <kirim-tugas
            .forumApiUrl=${this.forumApiUrl || this.appsScriptUrl}
            .appsScriptUrl=${this.appsScriptUrl}
            .sheetName=${this.kdMateri}
            .studentId=${this.studentId}
            .studentName=${this.namaSiswa || "Guru"}
            .studentNis=${this.nis}
            .studentAbsen=${this.absen}
            .studentKelas=${this.kelas}
            assignment-title="Tugas Mandiri ${this.kdMateri}"
          ></kirim-tugas>
        `;
    } else {
      if (this._activeTab === "pembelajaran")
        return this._renderDashboardPembelajaran();
      if (this._activeTab === "hasil") return this._renderHasilSiswa();
      if (this._activeTab === "kuis") return this._renderKuisWadah();
      if (this._activeTab === "forum")
        return html`
          <ruang-diskusi
            .forumApiUrl=${this.forumApiUrl || this.appsScriptUrl}
            .appsScriptUrl=${this.appsScriptUrl}
            .sheetName=${this.kdMateri}
            .studentId=${this.studentId}
            .studentName=${this.namaSiswa || "Siswa"}
            .studentKelas=${this.kelas}
            .viewMode=${"student"}
            forum-topic="Diskusi Materi ${this.kdMateri}"
          ></ruang-diskusi>
          <kirim-tugas
            .forumApiUrl=${this.forumApiUrl || this.appsScriptUrl}
            .appsScriptUrl=${this.appsScriptUrl}
            .sheetName=${this.kdMateri}
            .studentId=${this.studentId}
            .studentName=${this.namaSiswa || "Siswa"}
            .studentNis=${this.nis}
            .studentAbsen=${this.absen}
            .studentKelas=${this.kelas}
            assignment-title="Tugas Mandiri ${this.kdMateri}"
          ></kirim-tugas>
        `;
    }
    return "";
  }

  /** 🎯 Wadah kuis: teruskan atribut HAX (soal, URL, identitas siswa) ke <kuis-ledakan>. */
  _renderKuisWadah() {
    return html`
      <kuis-ledakan
        .mode=${this.mode}
        .appsScriptUrl=${this.appsScriptUrl}
        .kdMateri=${this.kdMateri}
        .studentId=${this.studentId}
        .studentName=${this.namaSiswa}
        .studentNis=${this.nis}
        .studentAbsen=${this.absen}
        .studentKelas=${this.kelas}
        .judul=${this.judulKuis}
        .questions=${this.questions}
        .shuffleChoices=${this.shuffleChoices}
        .hideAnswers=${this.hideAnswers}
        .hideScore=${this.hideScore}
        .hideConfetti=${this.hideConfetti}
      ></kuis-ledakan>
    `;
  }

  /** 🎯 Dashboard Pembelajaran — Kuis + Kehadiran + Nilai (via sistem-kehadiran). */
  _renderDashboardPembelajaran() {
    return html`
      <sistem-kehadiran
        .appsScriptUrl=${this.appsScriptUrl}
        .kdMateri=${this.kdMateri}
        .studentId=${this.studentId}
        .namaSiswa=${this.namaSiswa || "Siswa"}
        .mode=${this.mode}
      ></sistem-kehadiran>
    `;
  }

  // ---------- GURU: INPUT NILAI ----------
  _renderInputNilai() {
    const roster = this._serverData.roster || [];
    if (roster.length === 0) {
      return html`
        <h2 style="margin-top:0; color:#1e293b;">✏️ Input Nilai Manual</h2>
        <div class="empty-state">
          Belum ada data siswa untuk diisi nilainya. Muat data melalui tab
          Pantauan Guru terlebih dahulu.
        </div>
      `;
    }
    const draft = this._draftNilai || {};
    return html`
      <h2 style="margin-top:0; color:#1e293b;">✏️ Input Nilai Manual</h2>
      <p style="color:#64748b; font-size:13px;">
        Isi Nilai Akhir, UTS, UAS, dan/atau <strong>Tugas/Formatit</strong> per siswa lalu klik
        <strong>☁️ Kirim</strong> untuk mencatatnya ke sheet <code>Nilai Manual</code>.
        Nilai Tugas/Formatit akan masuk kategori <code>formatif</code> di sheet <code>db_asesmen</code>.
      </p>
      <div class="nilai-table-wrap">
        <table class="nilai-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Siswa</th>
              <th>Kelas</th>
              <th>Nilai Akhir</th>
              <th>UTS</th>
              <th>UAS</th>
              <th>Tugas/Formatit</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${roster.map((r, i) => {
              const d = draft[i] || {};
              const ada = d.nilaiAkhir != null || d.uts != null || d.uas != null || d.tugas != null;
              const sid = r.studentId || r._sid;
              return html`
                <tr>
                  <td>${r.absen || i + 1}</td>
                  <td>
                    <strong>${r.nama || "-"}</strong>
                    <div class="student-sub">${r.nis || ""}</div>
                  </td>
                  <td>${r.kelas || "-"}</td>
                  <td>
                    <input class="nilai-input" type="number" min="0" max="100" placeholder="-" .value=${d.nilaiAkhir ?? ""}
                      @input=${(e) => this._ubahNilai(i, "nilaiAkhir", e.target.value)} />
                  </td>
                  <td>
                    <input class="nilai-input" type="number" min="0" max="100" placeholder="-" .value=${d.uts ?? ""}
                      @input=${(e) => this._ubahNilai(i, "uts", e.target.value)} />
                  </td>
                  <td>
                    <input class="nilai-input" type="number" min="0" max="100" placeholder="-" .value=${d.uas ?? ""}
                      @input=${(e) => this._ubahNilai(i, "uas", e.target.value)} />
                  </td>
                  <td>
                    <input class="nilai-input" type="number" min="0" max="100" placeholder="-" .value=${d.tugas ?? ""}
                      @input=${(e) => this._ubahNilai(i, "tugas", e.target.value)} />
                  </td>
                  <td>
                    <button class="retry-btn" ?disabled=${!ada || !sid} @click=${() => this._kirimNilaiSiswa(i)}>☁️ Kirim</button>
                  </td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
      ${this._note ? html`<div class="note-chip">${this._note}</div>` : ""}
    `;
  }

  _ubahNilai(i, field, value) {
    if (!this._draftNilai) this._draftNilai = {};
    this._draftNilai[i] = { ...(this._draftNilai[i] || {}), [field]: value };
    this.requestUpdate();
  }

  async _kirimNilaiSiswa(i) {
    const roster = this._serverData.roster || [];
    const r = roster[i];
    const d = (this._draftNilai || {})[i] || {};
    if (!r) return;
    const sid = r.studentId || r._sid;
    if (!sid) {
      this._note = "⚠️ Student ID tidak ditemukan untuk siswa ini.";
      this.requestUpdate();
      return;
    }
    const daftar = [
      ["nilaiAkhir", "nilaiAkhir"],
      ["uts", "uts"],
      ["uas", "uas"],
      ["tugas", "formatif"],
    ];
    const panggilan = daftar
      .filter(([k]) => d[k] != null && String(d[k]).trim() !== "")
      .map(([k, kategori]) => ({ kategori, skor: Math.max(0, Math.min(100, this._num(d[k]))) }));
    if (!panggilan.length) {
      this._note = "Isi minimal satu nilai (Nilai Akhir/UTS/UAS/Tugas) terlebih dahulu.";
      this.requestUpdate();
      return;
    }
    if (!this.appsScriptUrl) {
      this._note = "⚠️ URL Apps Script belum diatur (tab Atur).";
      this.requestUpdate();
      return;
    }
    this._note = "☁️ Mengirim nilai ke backend…";
    this.requestUpdate();
    const hasil = await Promise.all(
      panggilan.map((p) =>
        this._apiGet({
          action: "setManualScore",
          studentId: sid,
          kategori: p.kategori,
          skor: p.skor,
        }),
      ),
    );
    const gagal = hasil.filter((h) => h && h.status && h.status !== "ok");
    if (!gagal.length) {
      this._simpanEditNilai(sid, {
        nilaiAkhir: this._num(d.nilaiAkhir),
        uts: this._num(d.uts),
        uas: this._num(d.uas),
        tugas: this._num(d.tugas),
      });
      this._note = `✅ ${panggilan.map((p) => p.kategori).join(", ")} untuk ${r.nama || sid} tercatat di sheet Nilai Manual.`;
    } else {
      this._note = "⚠️ Sebagian gagal: " + String((gagal[0] && gagal[0].message) || "cek konsol.");
    }
    this.requestUpdate();
  }

  // ---------- GURU: EDIT SOAL ----------
  _renderEditSoal() {
    const jml = Array.isArray(this.questions) ? this.questions.length : 0;
    const teks =
      this._soalText != null
        ? this._soalText
        : jml
          ? JSON.stringify(this.questions, null, 2)
          : "";
    return html`
      <h2 style="margin-top:0; color:#1e293b;">🗂️ Edit Soal & Bank Soal</h2>
      <div class="note-chip" style="margin-bottom:12px;">
        ${jml
          ? `${jml} soal aktif di properti <code>questions</code> (terlihat di HAX editor).`
          : "Belum ada soal di properti <code>questions</code> — muat dari bank soal atau tempel JSON."}
      </div>
      <textarea class="soal-textarea" rows="14" placeholder='[{"question":"…","choices":["A","B","C","D"],"correctIndex":0}]'
        .value=${teks} @input=${(e) => (this._soalText = e.target.value)}></textarea>
      <div class="toolbar">
        <div class="tb-action">
          <button class="retry-btn"
            @click=${() => {
              this._soalText = Array.isArray(this.questions)
                ? JSON.stringify(this.questions, null, 2)
                : "";
            }}>↩️ Muat Soal Aktif</button>
          <button class="retry-btn" @click=${() => this._muatBankSoal()}>📥 Muat Bank Soal (Backend)</button>
          <button class="retry-btn" @click=${() => this._terapkanSoal()}>✅ Gunakan Soal Ini</button>
        </div>
      </div>
      ${this._note ? html`<div class="note-chip">${this._note}</div>` : ""}
    `;
  }

  _muatBankSoal() {
    if (!this.appsScriptUrl) {
      this._note = "⚠️ URL Apps Script belum diatur (tab Atur).";
      this.requestUpdate();
      return;
    }
    this._note = "📥 Mengambil bank soal dari backend…";
    this.requestUpdate();
    this._apiGet({ action: "getBankSoal" })
      .then((res) => {
        const q = res && Array.isArray(res.questions)
          ? res.questions
          : res && Array.isArray(res.soal)
            ? res.soal
            : res && Array.isArray(res.data)
              ? res.data
              : null;
        if (q && q.length) {
          this._soalText = JSON.stringify(q, null, 2);
          this._note = `✅ ${q.length} soal dari sheet Bank Soal dimuat ke editor.`;
        } else {
          this._note = "ℹ️ Bank soal kosong — belum ada data di sheet Bank Soal.";
        }
        this.requestUpdate();
      })
      .catch(() => {
        this._note = "⚠️ Gagal memuat bank soal dari backend.";
        this.requestUpdate();
      });
  }

  _terapkanSoal() {
    const teks = (this._soalText || "").trim();
    if (!teks) {
      this._note = "⚠️ Form kosong. Tempel JSON soal terlebih dahulu.";
      this.requestUpdate();
      return;
    }
    try {
      let parsed = JSON.parse(teks);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (Array.isArray(parsed.questions)) parsed = parsed.questions;
        else throw new Error("bukan array");
      }
      if (!Array.isArray(parsed)) throw new Error("bukan array");
      this.questions = parsed;
      this._note = `✅ ${parsed.length} soal diterapkan ke properti questions & tab Evaluasi Kuis.`;
    } catch (_) {
      this._note = "⚠️ JSON tidak valid. Format: array soal (lihat deskripsi properti questions di HAX editor).";
    }
    this.requestUpdate();
  }

  // ---------- GURU: ATUR ----------
  _renderPengaturan() {
    return html`
      <h2 style="margin-top:0; color:#1e293b;">⚙️ Atur & Konfigurasi</h2>
      <div class="card-panel">
        <div class="set-row">
          <div>
            <div class="set-title">URL Backend (Apps Script)</div>
            <div class="set-sub">Endpoint semua aksi data (roster, nilai, kuis, forum, bank soal).</div>
          </div>
          <input class="set-input" .value=${this.appsScriptUrl || ""} placeholder="https://script.google.com/macros/s/…/exec"
            @change=${(e) => (this.appsScriptUrl = e.target.value.trim())} />
        </div>
        <div class="set-row">
          <div>
            <div class="set-title">URL Forum / Tugas</div>
            <div class="set-sub">Opsional; bila kosong memakai URL Backend.</div>
          </div>
          <input class="set-input" .value=${this.forumApiUrl || ""} placeholder="Kosongkan untuk memakai backend"
            @change=${(e) => (this.forumApiUrl = e.target.value.trim())} />
        </div>
        <div class="set-row">
          <div>
            <div class="set-title">KD / Materi (sheet tujuan)</div>
            <div class="set-sub">Nama pertemuan pencatatan kuis & aktivitas.</div>
          </div>
          <input class="set-input" .value=${this.kdMateri || ""} placeholder="cth: Bab-1"
            @change=${(e) => (this.kdMateri = e.target.value.trim())} />
        </div>
        <div class="set-row">
          <div>
            <div class="set-title">Judul Kuis</div>
            <div class="set-sub">Tampil pada tab Evaluasi Kuis.</div>
          </div>
          <input class="set-input" .value=${this.judulKuis || ""} placeholder="Evaluasi Kuis Interaktif"
            @change=${(e) => (this.judulKuis = e.target.value.trim())} />
        </div>
        <div class="set-row">
          <div>
            <div class="set-title">Kelas (Filter Guru)</div>
            <div class="set-sub">Kosongkan untuk semua kelas.</div>
          </div>
          <input class="set-input" .value=${this.kelas || ""} placeholder="cth: XI-1"
            @change=${(e) => (this.kelas = e.target.value.trim())} />
        </div>
        <div class="set-row">
          <div>
            <div class="set-title">Pindah Mode di Toolbar</div>
            <div class="set-sub">Nonaktifkan pada halaman siswa agar mode terkunci.</div>
          </div>
          <label class="switch-check">
            <input type="checkbox" ?checked=${this.allowModeSwitch}
              @change=${(e) => (this.allowModeSwitch = e.target.checked)} />
            Izinkan ganti mode Guru/Siswa
          </label>
        </div>
      </div>

      <!-- Generate Rapor Section -->
      <div class="card-panel" style="margin-top: var(--ddd-spacing-4);">
        <h3 style="margin-top:0; color:#1e293b;">📊 Generate Rapor</h3>
        <p style="color:#64748b; font-size:13px;">
          Generate laporan akumulasi nilai dari data di sheet <code>db_asesmen</code>.
          Data akan tertulis di sheet <code>Akumulasi_Nilai_Rapor</code>.
        </p>
        <div class="set-row">
          <button class="retry-btn" @click=${this._generateRapor} ?disabled=${!this.appsScriptUrl}>
            🔄 Generate Rapor Sekarang
          </button>
          ${this._raporStatus ? html`<span style="margin-left:var(--ddd-spacing-3); color:#16a34a;">${this._raporStatus}</span>` : nothing}
        </div>
      </div>

      <!-- Bobot Nilai Section -->
      <div class="card-panel" style="margin-top: var(--ddd-spacing-4);">
        <h3 style="margin-top:0; color:#1e293b;">⚖️ Pengaturan Bobot Nilai</h3>
        <p style="color:#64748b; font-size:13px;">
          Keterampilan melekat di dalam Tujuan Pembelajaran (TP) — tidak dipisah.
          Nilai akhir LM sudah termasuk skor tulis + skor performa.
        </p>
        <p style="color:#64748b; font-size:13px;">
          <strong>Rumus:</strong> Nilai Rapor = (Σ LM × bobot_LM + STS × bobot_STS + SAS × bobot_SAS) / Σ bobot
        </p>
        <div class="set-row">
          <div>
            <div class="set-title">Bobot LM per TP (Sumatif)</div>
            <div class="set-sub">Bobot untuk setiap LM/UH (default: 3)</div>
          </div>
          <input class="nilai-input" type="number" min="0" max="10" .value=${this._bobotLM ?? 3}
            @change=${(e) => (this._bobotLM = parseInt(e.target.value) || 3)} />
        </div>
        <div class="set-row">
          <div>
            <div class="set-title">Bobot Tugas/Formatif</div>
            <div class="set-sub">Bobot untuk nilai tugas dan formatif (default: 1)</div>
          </div>
          <input class="nilai-input" type="number" min="0" max="10" .value=${this._bobotTugas ?? 1}
            @change=${(e) => (this._bobotTugas = parseInt(e.target.value) || 1)} />
        </div>
        <div class="set-row">
          <div>
            <div class="set-title">Bobot STS (UTS)</div>
            <div class="set-sub">Bobot untuk Sumatif Tengah Semester (default: 2). 0 = tidak masuk rapor.</div>
          </div>
          <input class="nilai-input" type="number" min="0" max="10" .value=${this._bobotSTS ?? 2}
            @change=${(e) => (this._bobotSTS = parseInt(e.target.value) || 0)} />
        </div>
        <div class="set-row">
          <div>
            <div class="set-title">Bobot UAS (SAS)</div>
            <div class="set-sub">Bobot untuk Sumatif Akhir Semester (default: 2). 0 = tidak masuk rapor.</div>
          </div>
          <input class="nilai-input" type="number" min="0" max="10" .value=${this._bobotSAS ?? 2}
            @change=${(e) => (this._bobotSAS = parseInt(e.target.value) || 0)} />
        </div>
        <div class="set-row" style="margin-top: var(--ddd-spacing-4);">
          <button class="retry-btn" @click=${this._simpanBobot} ?disabled=${!this.appsScriptUrl}>
            💾 Simpan Pengaturan Bobot
          </button>
          <button class="retry-btn" style="background:#475569;" @click=${this._muatBobot}>
            🔄 Muat Bobot Tersimpan
          </button>
        </div>
      </div>
        </div>
        <div class="set-row" style="margin-top: var(--ddd-spacing-4);">
          <button class="retry-btn" @click=${this._simpanBobot} ?disabled=${!this.appsScriptUrl}>
            💾 Simpan Pengaturan Bobot
          </button>
          <button class="retry-btn" style="background:#475569;" @click=${this._muatBobot}>
            🔄 Muat Bobot Tersimpan
          </button>
        </div>
      </div>

      <div class="note-chip">
        Perubahan diterapkan langsung pada properti komponen — tersimpan bila halaman
        disimpan melalui editor HAX.
      </div>
    `;
  }

  // ---------- GENERATE RAPOR & BOBOT ----------
  async _generateRapor() {
    if (!this.appsScriptUrl) {
      this._note = "⚠️ URL Apps Script belum diatur (tab Atur).";
      this.requestUpdate();
      return;
    }
    this._raporStatus = "⏳ Membuat laporan...";
    this._note = "";
    this.requestUpdate();
    try {
      const result = await this._apiGet({ action: "generateReport" });
      if (result && result.status === "ok") {
        this._raporStatus = `✅ Rapor berhasil dibuat. ${result.students || 0} siswa diproses.`;
        this._note = "✅ Rapor berhasil di-generate. Lihat sheet Akumulasi_Nilai_Rapor.";
      } else {
        this._raporStatus = "";
        this._note = "⚠️ Gagal: " + (result && result.message ? result.message : "cek konsol.");
      }
    } catch (e) {
      this._raporStatus = "";
      this._note = "⚠️ Error: " + e.message;
    }
    this.requestUpdate();
  }

  async _simpanBobot() {
    if (!this.appsScriptUrl) {
      this._note = "⚠️ URL Apps Script belum diatur (tab Atur).";
      this.requestUpdate();
      return;
    }
    const bobot = {
      tugas: this._bobotTugas ?? 1,
      lm: this._bobotLM ?? 3,
      sts: this._bobotSTS ?? 2,
      sas: this._bobotSAS ?? 2,
    };
    this._note = "⏳ Menyimpan bobot...";
    this.requestUpdate();
    try {
      const result = await this._apiGet({ action: "saveBobot", ...bobot });
      if (result && result.status === "ok") {
        this._note = "✅ Bobot tersimpan. Generate rapor untuk melihat hasil.";
      } else {
        this._note = "⚠️ Gagal: " + (result && result.message ? result.message : "cek konsol.");
      }
    } catch (e) {
      this._note = "⚠️ Error: " + e.message;
    }
    this.requestUpdate();
  }

  async _muatBobot() {
    if (!this.appsScriptUrl) {
      this._note = "⚠️ URL Apps Script belum diatur (tab Atur).";
      this.requestUpdate();
      return;
    }
    this._note = "⏳ Memuat bobot...";
    this.requestUpdate();
    try {
      const result = await this._apiGet({ action: "getBobot" });
      if (result && result.status === "ok" && result.bobot) {
        this._bobotTugas = result.bobot.tugas ?? 1;
        this._bobotLM = result.bobot.lm ?? 3;
        this._bobotSTS = result.bobot.sts ?? 2;
        this._bobotSAS = result.bobot.sas ?? 2;
        this._note = "✅ Bobot dimuat.";
      } else {
        this._note = "ℹ️ Belum ada bobot tersimpan, menggunakan default.";
      }
    } catch (e) {
      this._note = "⚠️ Error: " + e.message;
    }
    this.requestUpdate();
  }

  // ---------- GURU: PANTAUAN ----------
  _renderPantauanGuru() {
    const roster = this._serverData.roster || [];
    if (roster.length === 0) {
      return html`
        <h2 style="margin-top: 0; color: #1e293b;">Peta Pantauan & Rekapitulasi Kelas</h2>
        <div class="empty-state">
          ${this._loading
            ? "Memuat data siswa…"
            : this.appsScriptUrl
              ? html`
                  Belum ada data pantauan dari backend.<br />
                  URL aktif: <code>${this.appsScriptUrl}</code>
                  ${this._serverError
                    ? html`<span class="err-chip">⚠️ ${this._serverError}</span>`
                    : html`<span class="err-chip">ℹ️ Pastikan sheet Users & Akumulasi Nilai Rapor terisi, dan backend sudah deploy lib/codev5.gs (Deploy > New version).</span>`}
                  <button class="retry-btn" @click=${() => this.fetchDataKomplit()} ?disabled=${this._loading}>
                    🔄 Muat Ulang Data
                  </button>
                `
              : html`
                  URL Apps Script belum diatur. Isi properti <code>apps-script-url</code> (via HAX editor atau atribut HTML).
                `}
        </div>
      `;
    }

    const hadir = roster.filter((r) => this._num(r.kehadiran) >= 60).length;
    const remidi = roster.filter((r) => this._num(r.nilaiAkhir) < 75).length;
    const rataKelas = roster.length
      ? Math.round(roster.reduce((a, r) => a + this._num(r.nilaiAkhir), 0) / roster.length)
      : 0;

    return html`
      <h2 style="margin-top: 0; color: #1e293b;">Peta Pantauan & Rekapitulasi Kelas</h2>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon i-indigo">👥</div>
          <div class="stat-meta">
            <div class="stat-value">${roster.length}</div>
            <div class="stat-label">Total Siswa Terpantau</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon i-emerald">📈</div>
          <div class="stat-meta">
            <div class="stat-value">${rataKelas}</div>
            <div class="stat-label">Rata-rata Nilai Kelas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon i-amber">✅</div>
          <div class="stat-meta">
            <div class="stat-value">${hadir}</div>
            <div class="stat-label">Kehadiran ≥ 60%</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon i-rose">⚠️</div>
          <div class="stat-meta">
            <div class="stat-value">${remidi}</div>
            <div class="stat-label">Perlu Bimbingan (&lt; 75)</div>
          </div>
        </div>
      </div>

      <div class="grid-heatmap">
        ${roster.map((s) => {
          const skor = this._num(s.nilaiAkhir);
          const level = skor >= 75 ? "lvl-high" : skor >= 60 ? "lvl-mid" : "lvl-low";
          const badge = skor >= 75
            ? { cls: "badge-good", txt: `${s.emoji || "✅"} LULUS` }
            : skor >= 60
              ? { cls: "badge-warn", txt: `${s.emoji || "⚠️"} PROSES` }
              : { cls: "badge-bad", txt: `${s.emoji || "📭"} REMEDI` };
          const initial = (s.nama || "?").trim().charAt(0).toUpperCase();
          const avatarBg = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#db2777", "#7c3aed"][
            (s.absen || "0").toString().length % 6
          ];
          return html`
            <div class="card-siswa ${level}">
              <div class="student-head">
                <div class="avatar-circle" style="background:${avatarBg};">${initial}</div>
                <div>
                  <div class="student-name">${s.absen ? s.absen + ". " : ""}${s.nama || "-"}</div>
                  <div class="student-sub">${s.kelas || "-"} • ${s.nis || ""}</div>
                </div>
              </div>
              <div class="metric-mini">
                <div>📖 ${this._num(s.totalActivities)} aktivitas</div>
                <div>🏅 ${s.grade || "N/A"}</div>
                <div>🎯 ${this._num(s.kehadiran)}% hadir</div>
              </div>
              <div class="progress-track">
                <div class="progress-bar" style="width:${Math.min(skor, 100)}%;"></div>
              </div>
              <div class="score-row">
                <span>Nilai Akhir</span>
                <span>${skor}</span>
              </div>
              <span class="badge-status ${badge.cls}">${badge.txt}</span>
            </div>
          `;
        })}
      </div>
    `;
  }

  // ---------- GURU: LEADERBOARD ----------
  _renderLeaderboard() {
    const list = this._serverData.leaderboard || [];
    if (list.length === 0) {
      return html`
        <h2 style="color:#1e293b;">🏆 Peringkat Nilai Bimbingan Kelas</h2>
        <div class="empty-state">
          Belum ada data leaderboard (sheet <strong>Rangkuman</strong> kosong).
          ${this._serverError ? html`<span class="err-chip">⚠️ ${this._serverError}</span>` : ""}
          ${this._serverError
            ? html`<div>URL aktif: <code>${this.appsScriptUrl}</code></div>`
            : ""}
          <div><button class="retry-btn" @click=${() => this.fetchDataKomplit()} ?disabled=${this._loading}>🔄 Muat Ulang Data</button></div>
        </div>
      `;
    }

    const rows = list.map((r, i) => {
      const nilai = this._num(this._rowValue(r, "Rata-rata Skor"));
      return {
        ...r,
        _rank: i + 1,
        _nilai: nilai,
        _nama: String(this._rowValue(r, "Nama") || "-"),
        _absen: String(this._rowValue(r, "Absen") || ""),
        _kelas: String(this._rowValue(r, "Kelas") || ""),
        _totalKuis: this._num(this._rowValue(r, "Total Kuis")),
        _totalAktivitas: this._num(this._rowValue(r, "Total Aktivitas")),
        _reading: this._num(this._rowValue(r, "Reading")),
        _quizAct: this._num(this._rowValue(r, "Quiz Activity")),
        _forum: this._num(this._rowValue(r, "Discussion")),
        _status: String(this._rowValue(r, "Status Kuis Terakhir") || "N/A"),
        _pertemuan: this._num(this._rowValue(r, "Jumlah Pertemuan")),
      };
    });

    const r1 = rows[0] || { _nama: "-", _nilai: 0 };
    const r2 = rows[1] || { _nama: "-", _nilai: 0 };
    const r3 = rows[2] || { _nama: "-", _nilai: 0 };

    return html`
      <h2 style="color:#1e293b;">🏆 Peringkat Nilai Bimbingan Kelas</h2>
      <div class="podium-section">
        <div class="podium-box rank-2">
          <div class="podium-medal">🥈</div>
          <div class="podium-name">${r2._nama}</div>
          <div class="podium-score">${r2._nilai}%</div>
          <div style="font-size:11px;color:#94a3b8;">${this._num(r2._totalKuis)} kuis • ${this._num(r2._totalAktivitas)} aktivitas</div>
        </div>
        <div class="podium-box rank-1">
          <div class="podium-medal">🥇</div>
          <div class="podium-name">${r1._nama}</div>
          <div class="podium-score">${r1._nilai}%</div>
          <div style="font-size:11px;color:#94a3b8;">${this._num(r1._totalKuis)} kuis • ${this._num(r1._totalAktivitas)} aktivitas</div>
        </div>
        <div class="podium-box rank-3">
          <div class="podium-medal">🥉</div>
          <div class="podium-name">${r3._nama}</div>
          <div class="podium-score">${r3._nilai}%</div>
          <div style="font-size:11px;color:#94a3b8;">${this._num(r3._totalKuis)} kuis • ${this._num(r3._totalAktivitas)} aktivitas</div>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>Kelas</th>
              <th>Kuis</th>
              <th>Rata-rata Skor</th>
              <th>Aktivitas</th>
              <th>📖</th>
              <th>📝</th>
              <th>💬</th>
              <th>Pertemuan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(
              (r) => html`
                <tr class="${r._rank <= 3 ? "highlight-row" : ""}">
                  <td><span class="rank-chip ${r._rank === 1 ? "top" : ""}">${r._rank}</span></td>
                  <td><strong>${r._absen ? r._absen + ". " : ""}${r._nama}</strong></td>
                  <td>${r._kelas}</td>
                  <td>${r._totalKuis}</td>
                  <td><strong>${r._nilai}%</strong></td>
                  <td>${r._totalAktivitas}</td>
                  <td>${r._reading}</td>
                  <td>${r._quizAct}</td>
                  <td>${r._forum}</td>
                  <td>${r._pertemuan}</td>
                  <td>
                    <span class="badge-status ${r._status === "LULUS" ? "badge-good" : r._status === "TIDAK LULUS" ? "badge-bad" : "badge-warn"}">${r._status}</span>
                  </td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
    `;
  }

  // ---------- DOSEN: PERINGKAT NILAI BIMBINGAN KELAS ----------
  _opsiKelas() {
    const set = new Set();
    (this._serverData.roster || []).forEach((r) => {
      if (r.kelas) set.add(String(r.kelas));
    });
    (this._serverData.leaderboard || []).forEach((r) => {
      const k = this._rowValue(r, "Kelas");
      if (k) set.add(String(k));
    });
    if (this.kelas) set.add(String(this.kelas));
    return [...set].sort();
  }

  _bacaEditNilai(sid) {
    try {
      const cache = JSON.parse(localStorage.getItem("a3_v5_peringkat_edit") || "{}");
      return cache && cache[sid] ? cache[sid] : null;
    } catch (_) {
      return null;
    }
  }

  _simpanEditNilai(sid, data) {
    try {
      const cache = JSON.parse(localStorage.getItem("a3_v5_peringkat_edit") || "{}");
      cache[sid] = { ...data };
      localStorage.setItem("a3_v5_peringkat_edit", JSON.stringify(cache));
    } catch (_) {}
  }

  _hapusEditNilai(sid) {
    try {
      const cache = JSON.parse(localStorage.getItem("a3_v5_peringkat_edit") || "{}");
      delete cache[sid];
      localStorage.setItem("a3_v5_peringkat_edit", JSON.stringify(cache));
    } catch (_) {}
  }

  _buildPeringkat() {
    const lb = this._serverData.leaderboard || [];
    const roster = this._serverData.roster || [];
    const rosterById = {};
    roster.forEach((r) => {
      if (r.studentId) rosterById[r.studentId] = r;
    });
    return lb
      .map((r) => {
        const sid = String(this._rowValue(r, "Student ID") || "");
        const rob =
          rosterById[sid] ||
          roster.find(
            (x) => String(x.nis) === String(this._rowValue(r, "NIS")),
          ) ||
          null;
        const ed = this._bacaEditNilai(sid);
        const ambilEdit = (kunci, dariRob) =>
          ed && ed[kunci] !== "" && ed[kunci] !== undefined
            ? this._num(ed[kunci])
            : this._num(dariRob);
        return {
          _sid: sid,
          _nama: String(this._rowValue(r, "Nama") || (rob && rob.nama) || "-"),
          _kelas: String(
            this._rowValue(r, "Kelas") || (rob && rob.kelas) || "",
          ),
          _absen: String(this._rowValue(r, "Absen") || (rob && rob.absen) || ""),
          _nis: String(this._rowValue(r, "NIS") || (rob && rob.nis) || ""),
          _totalKuis: this._num(this._rowValue(r, "Total Kuis")),
          _rata: this._num(this._rowValue(r, "Rata-rata Skor")),
          _tinggi: this._num(this._rowValue(r, "Skor Tertinggi")),
          _rendah: this._num(this._rowValue(r, "Skor Terendah")),
          _aktivitas: this._num(this._rowValue(r, "Total Aktivitas")),
          _reading: this._num(this._rowValue(r, "Reading")),
          _quizAct: this._num(this._rowValue(r, "Quiz Activity")),
          _assignment: this._num(this._rowValue(r, "Assignment")),
          _discussion: this._num(this._rowValue(r, "Discussion")),
          _download: this._num(this._rowValue(r, "Download")),
          _uts: ambilEdit("uts", this._rowValue(r, "Skor UTS")),
          _uas: ambilEdit("uas", this._rowValue(r, "Skor UAS")),
          _pertemuan: this._num(this._rowValue(r, "Jumlah Pertemuan")),
          _status: String(this._rowValue(r, "Status Kuis Terakhir") || "N/A"),
          _kehadiran: ambilEdit("kehadiran", rob && rob.kehadiran),
          _uh: ambilEdit("uh", rob && rob.uh),
          _sikap: ambilEdit("sikap", rob && rob.sikap),
          _keterampilan: ambilEdit("keterampilan", rob && rob.keterampilan),
          _nilaiAkhir: ambilEdit("nilaiAkhir", rob && rob.nilaiAkhir),
          _grade:
            (ed && ed.grade && String(ed.grade) !== "") ||
            (rob && rob.grade)
              ? (ed && ed.grade) || rob.grade || "N/A"
              : "N/A",
        };
      })
      .sort((a, b) => (this._num(a._rata) < this._num(b._rata) ? 1 : -1));
  }

  _filterPeringkat(rows) {
    const k = this._peringkatKelas || this.kelas || "";
    if (!k) return rows;
    return rows.filter(
      (r) => String(r._kelas).toLowerCase() === String(k).toLowerCase(),
    );
  }

  _ubahFilterKelas(val) {
    this._peringkatKelas = val;
    this.kelas = val;
    this.requestUpdate();
  }

  _renderPeringkatBimbingan() {
    const rows = this._filterPeringkat(this._buildPeringkat());
    const opsi = this._opsiKelas();
    const filter = this._peringkatKelas || this.kelas || "";
    const adaData = (this._serverData.leaderboard || []).length > 0;

    return html`
      <h2 style="margin-top:0; color:#1e293b;">🏆 Peringkat Nilai Bimbingan Kelas</h2>

      <div class="toolbar">
        <div class="tb-filter">
          <label for="filter-kelas">Filter Kelas</label>
          <select id="filter-kelas" class="filter-select" .value=${filter}
            @change=${(e) => this._ubahFilterKelas(e.target.value)}>
            <option value="">Semua Kelas</option>
            ${opsi.map((k) => html`<option value=${k}>${k}</option>`)}
          </select>
        </div>
        <div class="tb-action">
          <button class="retry-btn" @click=${() => this._eksporNilai("xls")}>⬇️ XLS</button>
          <button class="retry-btn" @click=${() => this._eksporNilai("csv")}>⬇️ CSV</button>
          <button class="retry-btn" @click=${() => this._eksporNilai("copas")}>📋 Siap Copas</button>
        </div>
        ${this._note ? html`<div class="note-chip">${this._note}</div>` : ""}
      </div>

      ${this._copasTSV !== null ? this._renderCopas() : ""}

      ${this._detailSiswa ? this._renderDetailSiswa() : ""}

      ${!this.appsScriptUrl
        ? html`
            <div class="empty-state">
              URL Apps Script belum diatur. Isi properti <code>apps-script-url</code>
              (via HAX editor atau atribut HTML).
            </div>
          `
        : !adaData
          ? html`
              <div class="empty-state">
                Belum ada data Rangkuman dari backend untuk peringkat bimbingan.
                Pastikan sheet <strong>Rangkuman</strong> terisi atau jalankan
                <code>action=generateReport</code> pada backend.
                ${this._serverError
                  ? html`<span class="err-chip">⚠️ ${this._serverError}</span>`
                  : ""}
                <div>
                  <button class="retry-btn" @click=${() => this.fetchDataKomplit()} ?disabled=${this._loading}>
                    🔄 Muat Ulang Data
                  </button>
                </div>
              </div>
            `
          : rows.length === 0
            ? html`
                <div class="empty-state">
                  Tidak ada siswa pada kelas <strong>${filter || "semua kelas"}</strong>.
                </div>
              `
            : html`
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nama (klik)</th>
                        <th>Kelas</th>
                        <th>Absen</th>
                        <th>Kuis</th>
                        <th>Rata-rata</th>
                        <th>Aktivitas</th>
                        <th>UTS</th>
                        <th>UAS</th>
                        <th>Nilai Akhir</th>
                        <th>Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rows.map(
                        (r, i) => html`
                          <tr>
                            <td><span class="rank-chip ${i === 0 ? "top" : ""}">${i + 1}</span></td>
                            <td>
                              <button class="nama-btn" @click=${() => this._bukaDetail(r)}>
                                ${r._absen ? r._absen + ". " : ""}${r._nama}
                              </button>
                            </td>
                            <td>${r._kelas}</td>
                            <td>${r._absen}</td>
                            <td>${r._totalKuis}</td>
                            <td><strong>${r._rata}%</strong></td>
                            <td>${r._aktivitas}</td>
                            <td>${r._uts}</td>
                            <td>${r._uas}</td>
                            <td><strong>${r._nilaiAkhir}</strong></td>
                            <td>
                              <span class="grade-chip grade-${r._grade.charAt(0)}">${r._grade}</span>
                            </td>
                            <td>
                              <span class="badge-status ${r._status === "LULUS" ? "badge-good" : r._status === "TIDAK LULUS" ? "badge-bad" : "badge-warn"}">${r._status}</span>
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                </div>
                <p style="font-size:11px; color:#94a3b8; margin-top:8px;">
                  💡 Klik nama siswa untuk lihat rincian & edit nilai. UTS/UAS dikirim ke
                  sheet <strong>Nilai Manual</strong> via <code>action=setManualScore</code>.
                </p>
              `}
    `;
  }

  _renderCopas() {
    return html`
      <div class="copas-panel">
        <h4 style="margin:0 0 8px; color:#1e293b;">📋 Nilai siap copas (TSV — paste langsung ke Google Sheets / Excel)</h4>
        <textarea class="copas-area" readonly rows="10" .value=${this._copasTSV || ""}></textarea>
        <div class="action-row">
          <button class="retry-btn" @click=${() => this._salinKopas()}>📋 Salin ke Clipboard</button>
          <button class="retry-btn" style="background:#475569;" @click=${() => (this._copasTSV = null)}>✖ Tutup</button>
        </div>
      </div>
    `;
  }

  async _salinKopas() {
    try {
      await navigator.clipboard.writeText(this._copasTSV || "");
      this._note = "✅ Nilai tersalin ke clipboard — siap paste ke Google Sheets/Excel.";
    } catch (e) {
      this._note = "⚠️ Salin manual: pilih teks di kotak lalu tekan Ctrl+C.";
    }
    this.requestUpdate();
  }

  _bukaDetail(row) {
    this._detailSiswa = row;
    this._editNilai = {
      kehadiran: row._kehadiran,
      uh: row._uh,
      uts: row._uts,
      uas: row._uas,
      sikap: row._sikap,
      keterampilan: row._keterampilan,
      nilaiAkhir: row._nilaiAkhir,
      grade: row._grade,
    };
    this._note = "";
    this.requestUpdate();
  }

  _renderDetailSiswa() {
    const r = this._detailSiswa;
    if (!r || !this._editNilai) return "";
    const d = this._editNilai;
    const input = (key, label) => html`
      <label class="dEdit-label" for="d-${key}">${label}</label>
      <input id="d-${key}" class="dEdit-input" type="number" .value=${d[key] ?? ""}
        @input=${(e) => (this._editNilai = { ...this._editNilai, [key]: e.target.value })} />
    `;
    return html`
      <div class="detail-panel">
        <div class="student-head">
          <div class="avatar-circle" style="background:#4f46e5;">${(r._nama || "?").charAt(0).toUpperCase()}</div>
          <div style="flex:1;">
            <div class="student-name">${r._absen ? r._absen + ". " : ""}${r._nama}</div>
            <div class="student-sub">${r._kelas || "-"} • NIS ${r._nis || "-"} • ${r._sid || "-"}</div>
          </div>
          <button class="retry-btn" style="background:#475569; margin:0;" @click=${() => { this._detailSiswa = null; this._editNilai = null; }}>
            ✖ Tutup
          </button>
        </div>
        <div class="dEdit-grid">
          ${input("kehadiran", "Kehadiran")}
          ${input("uh", "Rata-rata UH")}
          ${input("uts", "Skor UTS")}
          ${input("uas", "Skor UAS")}
          ${input("sikap", "Sikap")}
          ${input("keterampilan", "Keterampilan")}
          ${input("nilaiAkhir", "Nilai Akhir")}
          <label class="dEdit-label" for="d-grade">Grade</label>
          <input id="d-grade" class="dEdit-input" type="text" .value=${d.grade || ""}
            @input=${(e) => (this._editNilai = { ...this._editNilai, grade: e.target.value })} />
        </div>
        <div class="detail-stats">
          <span>📊 Rata-rata Skor: <strong>${r._rata}%</strong></span>
          <span>📚 Aktivitas: <strong>${r._aktivitas}</strong></span>
          <span>🧩 Pertemuan: <strong>${r._pertemuan}</strong></span>
        </div>
        <div class="action-row">
          <button class="retry-btn" @click=${this._simpanNilaiLokal}>💾 Simpan Edit (lokal)</button>
          <button class="retry-btn" style="background:#059669;" @click=${() => this._kirimManualSkor()}>☁️ Kirim UTS/UAS</button>
          <button class="retry-btn" style="background:#4f46e5;" @click=${() => this._kirimSemuaNilai()}>☁️ Kirim Semua Nilai</button>
          <button class="retry-btn" style="background:#475569;" @click=${() => { this._hapusEditNilai(r._sid); this._note = "↩️ Edit nilai " + r._nama + " direset ke data backend."; this._detailSiswa = null; this._editNilai = null; this.requestUpdate(); }}>
            ↩️ Reset Edit
          </button>
        </div>
      </div>
    `;
  }

  _simpanNilaiLokal() {
    const r = this._detailSiswa;
    if (!r) return;
    const d = this._editNilai || {};
    this._simpanEditNilai(r._sid, {
      kehadiran: d.kehadiran,
      uh: d.uh,
      uts: d.uts,
      uas: d.uas,
      sikap: d.sikap,
      keterampilan: d.keterampilan,
      nilaiAkhir: d.nilaiAkhir,
      grade: d.grade,
    });
    this._note = `💾 Edit tersimpan lokal untuk ${r._nama}. Klik "☁️ Kirim Semua Nilai" untuk sinkronisasi ke sheet Nilai Manual.`;
    this.requestUpdate();
  }

  /** ☁️ Kirim SEMUA kolom nilai yang terisi (kehadiran/UH/UTS/UAS/sikap/keterampilan/Nilai Akhir) ke sheet Nilai Manual. */
  async _kirimSemuaNilai() {
    const r = this._detailSiswa;
    const d = this._editNilai || {};
    if (!r || !r._sid) {
      this._note = "⚠️ Student ID tidak ditemukan.";
      this.requestUpdate();
      return;
    }
    if (!this.appsScriptUrl) {
      this._note = "⚠️ URL Apps Script belum diatur.";
      this.requestUpdate();
      return;
    }
    const daftar = [
      ["kehadiran", d.kehadiran, "Kehadiran"],
      ["uh", d.uh, "Rata-rata UH"],
      ["uts", d.uts, "Skor UTS"],
      ["uas", d.uas, "Skor UAS"],
      ["sikap", d.sikap, "Sikap"],
      ["keterampilan", d.keterampilan, "Keterampilan"],
      ["nilaiAkhir", d.nilaiAkhir, "Nilai Akhir"],
    ];
    const panggilan = daftar
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([kategori, v, label]) => ({
        kategori,
        label,
        skor: Math.max(0, Math.min(100, this._num(v))),
      }));
    if (!panggilan.length) {
      this._note = "Isi minimal satu kolom nilai terlebih dahulu.";
      this.requestUpdate();
      return;
    }
    this._note = "☁️ Mengirim semua nilai ke backend…";
    this.requestUpdate();
    const hasil = await Promise.all(
      panggilan.map((p) =>
        this._apiGet({
          action: "setManualScore",
          studentId: r._sid,
          kategori: p.kategori,
          skor: p.skor,
        }),
      ),
    );
    const gagal = hasil.filter((h) => h && h.status && h.status !== "ok");
    if (!gagal.length) {
      this._simpanEditNilai(r._sid, {
        kehadiran: d.kehadiran,
        uh: d.uh,
        uts: d.uts,
        uas: d.uas,
        sikap: d.sikap,
        keterampilan: d.keterampilan,
        nilaiAkhir: d.nilaiAkhir,
        grade: d.grade,
      });
      this._note = `✅ ${panggilan.length} nilai (${panggilan.map((p) => p.kategori).join(", ")}) untuk ${r._nama} tercatat di sheet Nilai Manual.`;
    } else {
      this._note = "⚠️ Sebagian gagal: " + String((gagal[0] && gagal[0].message) || "cek konsol.");
    }
    this.requestUpdate();
  }

  async _kirimManualSkor() {
    const r = this._detailSiswa;
    const d = this._editNilai || {};
    if (!r || !r._sid) {
      this._note = "⚠️ Student ID tidak ditemukan.";
      this.requestUpdate();
      return;
    }
    if (!this.appsScriptUrl) {
      this._note = "⚠️ URL Apps Script belum diatur.";
      this.requestUpdate();
      return;
    }
    const calls = [];
    if (String(d.uts).trim() !== "")
      calls.push({ kategori: "uts", skor: Math.max(0, Math.min(100, this._num(d.uts))) });
    if (String(d.uas).trim() !== "")
      calls.push({ kategori: "uas", skor: Math.max(0, Math.min(100, this._num(d.uas))) });
    if (!calls.length) {
      this._note = "Isi Skor UTS dan/atau UAS terlebih dahulu.";
      this.requestUpdate();
      return;
    }
    this._note = "☁️ Mengirim nilai manual ke backend…";
    this.requestUpdate();
    const hasil = await Promise.all(
      calls.map((c) =>
        this._apiGet({
          action: "setManualScore",
          studentId: r._sid,
          kategori: c.kategori,
          skor: c.skor,
        }),
      ),
    );
    const gagal = hasil.filter((h) => h && h.status && h.status !== "ok");
    this._note = gagal.length
      ? "⚠️ Sebagian gagal: " + String((gagal[0] && gagal[0].message) || "cek konsol.")
      : `✅ UTS ${this._num(d.uts)} & UAS ${this._num(d.uas)} untuk ${r._nama} tercatat di sheet Nilai Manual.`;
    if (!gagal.length) {
      this._simpanEditNilai(r._sid, {
        kehadiran: d.kehadiran,
        uh: d.uh,
        uts: d.uts,
        uas: d.uas,
        sikap: d.sikap,
        keterampilan: d.keterampilan,
        nilaiAkhir: d.nilaiAkhir,
        grade: d.grade,
      });
    }
    this.requestUpdate();
  }

  _rowPeringkatKeCSV(rows) {
    const headers = [
      "#", "Nama", "Kelas", "Absen", "NIS", "Student ID", "Total Kuis",
      "Rata-rata Skor (%)", "Skor Tertinggi", "Skor Terendah", "Total Aktivitas",
      "Reading", "Quiz Activity", "Discussion", "Download", "UTS", "UAS",
      "Nilai Akhir", "Grade", "Jumlah Pertemuan", "Status Kuis Terakhir",
    ];
    const grid = rows.map((r, i) => [
      String(i + 1), r._nama, r._kelas, r._absen, r._nis, r._sid, r._totalKuis,
      r._rata, r._tinggi, r._rendah, r._aktivitas, r._reading, r._quizAct,
      r._discussion, r._download, r._uts, r._uas, r._nilaiAkhir, r._grade,
      r._pertemuan, r._status,
    ]);
    return { headers, grid };
  }

  _csvKerangka(rows, delim = "\t") {
    const { headers, grid } = this._rowPeringkatKeCSV(rows);
    const esc = (v) => {
      const s = String(v == null ? "" : v);
      if (delim === "\t") return s.replace(/[\t\n\r]+/g, " ");
      const perlu = /[";\n\r]/.test(s);
      return perlu ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [headers, ...grid]
      .map((row) => row.map(esc).join(delim))
      .join("\r\n");
  }

  _eksporNilai(format) {
    const rows = this._filterPeringkat(this._buildPeringkat());
    if (!rows.length) {
      this._note = "Belum ada baris untuk diekspor.";
      this.requestUpdate();
      return;
    }
    const namaFile =
      "peringkat-bimbingan-" +
      String(this._peringkatKelas || this.kelas || "semua").replace(
        /[^a-zA-Z0-9-_]/g,
        "",
      );
    if (format === "copas") {
      this._copasTSV = this._csvKerangka(rows, "\t");
      this._note = "Kotak TSV siap disalin — paste langsung ke Google Sheets / Excel.";
      this.requestUpdate();
      return;
    }
    if (format === "csv") {
      const csv = "\uFEFF" + this._csvKerangka(rows, ",");
      this._downloadBlob(`${namaFile}.csv`, csv, "text/csv;charset=utf-8;");
    } else {
      const { headers, grid } = this._rowPeringkatKeCSV(rows);
      const hdr = headers.map((h) => `<th>${this._hs(h)}</th>`).join("");
      const body = grid
        .map(
          (row) =>
            `<tr>${row.map((c) => `<td>${this._hs(c)}</td>`).join("")}</tr>`,
        )
        .join("");
      const xls = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Peringkat</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table><thead><tr>${hdr}</tr></thead><tbody>${body}</tbody></table></body></html>`;
      this._downloadBlob(
        `${namaFile}.xls`,
        xls,
        "application/vnd.ms-excel;charset=utf-8;",
      );
    }
    this._note = `✅ Ekspor ${format.toUpperCase()} selesai (${rows.length} siswa).`;
    this.requestUpdate();
  }

  _downloadBlob(nama, isi, mime) {
    const blob = new Blob([isi], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  _hs(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ---------- SISWA: HASIL & NILAI ----------
  _renderHasilSiswa() {
    const s = this._serverData.siswa;

    if (!s) {
      return html`
        <h2 style="margin-top: 0; color: #1e293b;">🎯 Hasil & Nilai Evaluasi Anda</h2>
        <div class="empty-state">
          ${this._loading
            ? "Memuat hasil nilai Anda…"
            : this.appsScriptUrl
              ? html`
                  Belum ada hasil nilai untuk <strong>${this.namaSiswa || this.studentId || "siswa ini"}</strong>.
                  Kerjakan kuis, membaca modul, dan berpartisipasi di forum agar data muncul di Rangkuman kelas.
                  Pastikan <code>student-id</code> benar atau login melalui komponen autentikasi.<br />
                  URL aktif: <code>${this.appsScriptUrl}</code>
                  ${this._serverError
                    ? html`<span class="err-chip">⚠️ ${this._serverError}</span>`
                    : ""}
                  <button class="retry-btn" @click=${() => this.fetchDataKomplit()} ?disabled=${this._loading}>
                    🔄 Muat Ulang Data
                  </button>
                `
              : html`
                  URL Apps Script belum diatur. Isi properti <code>apps-script-url</code> (via HAX editor atau atribut HTML).
                `}
        </div>
      `;
    }

    const kehadiran = this._num(s.kehadiran);
    const uh = this._num((s.ulanganHarian && (s.ulanganHarian.average || s.ulanganHarian.highest)) || 0);
    const uts = this._num((s.uts && s.uts.highest) || 0);
    const uas = this._num((s.uas && s.uas.highest) || 0);
    const sikap = this._num(s.sikap);
    const keterampilan = this._num(s.keterampilan);
    const nilaiAkhir = Math.round(parseFloat(s.nilaiAkhir) || 0);
    const grade = String(s.grade || "-");
    const ringDeg = Math.max(0, Math.min(100, nilaiAkhir)) * 3.6;

    const kpiList = [
      { label: "Kehadiran", value: kehadiran, unit: "%" },
      { label: "Rata-rata UH", value: uh, unit: "" },
      { label: "Skor UTS", value: uts, unit: "" },
      { label: "Skor UAS", value: uas, unit: "" },
      { label: "Sikap", value: sikap, unit: "" },
      { label: "Keterampilan", value: keterampilan, unit: "" },
    ];

    return html`
      <h2 style="margin-top: 0; color: #1e293b;">🎯 Hasil & Nilai Evaluasi Anda</h2>

      <div class="hasil-hero">
        <div class="grade-ring-card">
          <div class="grade-ring" style="background: conic-gradient(#fbbf24 ${ringDeg}deg, rgb(255 255 255 / 0.15) ${ringDeg}deg);">
            <div class="grade-ring-inner">
              <div class="ring-nilai">${nilaiAkhir}</div>
              <div class="ring-label">Nilai Akhir</div>
            </div>
          </div>
          <div style="font-weight:700; margin-bottom:8px;">${s.nama || this.namaSiswa || "Siswa"}</div>
          <div class="grade-big">${grade}</div>
          <div style="font-size:11px; opacity:0.8; margin-top:10px;">${this.studentId || ""} • ${this.kelas || ""}</div>
        </div>

        <div>
          <div class="kpi-grid">
            ${kpiList.map(
              (k) => html`
                <div class="kpi-card">
                  <div class="kpi-value ${k.value >= 75 ? "ok" : k.value >= 60 ? "warn" : ""}">${k.value}${k.unit}</div>
                  <div class="kpi-label">${k.label}</div>
                  <div class="kpi-bar"><div style="width:${Math.min(k.value, 100)}%;"></div></div>
                </div>
              `,
            )}
          </div>
        </div>
      </div>

      <div class="card-siswa" style="padding: var(--ddd-spacing-5); margin-bottom: var(--ddd-spacing-5);">
        <h4 style="margin:0 0 4px; color:#1e293b;">📈 Konsistensi Aktivitas (28 Hari Terakhir)</h4>
        <p style="margin:0; font-size:12px; color:#94a3b8;">Data dari sheet aktivitas (<strong>${
          this.kdMateri || "semua pertemuan"
        }</strong>) + log lokal.</p>
        <div class="heatmap-head">
          ${["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map((h) => html`<span>${h}</span>`)}
        </div>
        <div class="heatmap-grid">
          ${this._renderHeatmapSiswa()}
        </div>
        <div class="heatmap-legend">
          <span>Sedikit</span>
          ${["lvl-0", "lvl-1", "lvl-2", "lvl-3", "lvl-4"].map((l) => html`<span class="legend-box ${l}"></span>`)}
          <span>Banyak</span>
        </div>
        ${this._renderLogAktivitasTerbaru()}
      </div>
    `;
  }

  _gabungRiwayat() {
    const mapHari = {};
    (this._serverData.history || []).forEach((h) => {
      if (h && h.date) mapHari[String(h.date).slice(0, 10)] = this._num(h.count);
    });
    try {
      const lokal = JSON.parse(
        localStorage.getItem("a3_v5_activity_logs") || "[]",
      );
      if (Array.isArray(lokal)) {
        lokal.forEach((l) => {
          if (l && l.timestamp) {
            const key = String(l.timestamp).slice(0, 10);
            mapHari[key] = (mapHari[key] || 0) + 1;
          }
        });
      }
    } catch (e) {
      // abaikan
    }
    return mapHari;
  }

  _renderLogAktivitasTerbaru() {
    const items = [];
    (this._serverData.history || []).forEach((h) => {
      const tanggal = h && h.date ? String(h.date).slice(0, 10) : "";
      (h.items || []).forEach((it) => {
        if (it && it.deskripsi) {
          items.push({
            tanggal,
            tipe: it.tipe || "",
            deskripsi: it.deskripsi,
          });
        }
      });
    });
    try {
      const lokal = JSON.parse(
        localStorage.getItem("a3_v5_activity_logs") || "[]",
      );
      if (Array.isArray(lokal)) {
        lokal.forEach((l) => {
          if (l && l.timestamp) {
            items.push({
              tanggal: String(l.timestamp).slice(0, 10),
              tipe: l.tipe_aktivitas || "",
              deskripsi:
                typeof l.description === "string" ? l.description : "",
            });
          }
        });
      }
    } catch (e) {
      // abaikan
    }
    const terbaru = items
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
      .slice(0, 5);
    if (!terbaru.length) {
      return html`
        <div class="empty-state" style="margin-top:12px;">
          Belum ada catatan aktivitas. Tandai selesai membaca, kerjakan kuis, dan kirim
          diskusi untuk mengisi matriks ini.
        </div>
      `;
    }
    return html`
      <div style="margin-top:14px;">
        <div style="font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">Log Terbaru:</div>
        <div style="display:flex; flex-direction:column; gap:4px; max-height:150px; overflow-y:auto;">
          ${terbaru.map(
            (it) => html`
              <div class="li-log">
                <span class="lt-log">${it.tanggal}</span>
                <span class="ld-log">${it.tipe ? "[" + it.tipe + "] " : ""}${it.deskripsi || "-"}</span>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  _renderHeatmapSiswa() {
    const mapHari = this._gabungRiwayat();
    const hariIni = new Date();
    const kotak = [];
    for (let i = 27; i >= 0; i--) {
      const t = new Date(hariIni);
      t.setDate(hariIni.getDate() - i);
      const key = t.toISOString().split("T")[0];
      const hitung = mapHari[key] || 0;
      const level =
        hitung === 0
          ? "lvl-0"
          : hitung <= 2
            ? "lvl-1"
            : hitung <= 4
              ? "lvl-2"
              : hitung <= 6
                ? "lvl-3"
                : "lvl-4";
      kotak.push(
        html`<div class="box-heatmap ${level}" title="${key}: ${hitung} aktivitas">${hitung || ""}</div>`,
      );
    }
    return kotak;
  }
}

globalThis.customElements.define(QuizDashboard.tag, QuizDashboard);
