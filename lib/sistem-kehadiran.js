import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

/**
 * `sistem-kehadiran`
 *
 * 🎯 Dashboard Pembelajaran (adaptasi <full-quiz-dashboard> Vanilla JS ke
 * stack Lit + DDD / HAX). Satu panel untuk Kuis + Kehadiran + Nilai:
 *   - 📝 Kuis interaktif (soal bisa diedit & direset via tab ⚙️ Soal)
 *   - 📊 Kehadiran pekan ini (gauge + checklist 4 kriteria)
 *   - 📈 Pelacakan Aktivitas (Total, Streak, Peta 28 Hari + Log Terbaru)
 *   - 📖 Nilai transparan + 🔧 Atur (threshold & bobot, peringatan total 100%)
 *   - Simulasi 📖/📥/💬 + 🗑️ Reset untuk uji coba langsung
 *
 * Semua aktivitas lokal tersinkron lewat event `dasbor-kuis-log` sehingga
 * <dasbor-kuis> mengantrekan & meneruskan ke Google Apps Script
 * (action=logActivity, idempoten per id_log). Heatmap menggabungkan log lokal
 * dengan riwayat server (action=getActivityHistory).
 *
 * @element sistem-kehadiran
 */
export class AttendanceSystem extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "sistem-kehadiran";
  }

  static LOGS_KEY = "a3_attendance_activity_logs";
  static THRESHOLD_KEY = "a3_attendance_threshold_config";
  static GRADES_KEY = "a3_attendance_grades_config";
  static QUESTIONS_KEY = "quiz_custom_questions";

  // ADAPTASI LAMA: [Soal bawaan & config] — sama persis dengan full-quiz-dashboard
  static DEFAULT_QUESTIONS = [
    { question: "Apa ibu kota Indonesia?", choices: ["Bandung", "Surabaya", "Jakarta", "Medan"], correctIndex: 2 },
    { question: "Berapa hasil dari 7 × 8?", choices: ["54", "56", "58", "60"], correctIndex: 1 },
    { question: "Planet terdekat dengan Matahari?", choices: ["Venus", "Bumi", "Mars", "Merkurius"], correctIndex: 3 },
    { question: "Siapa presiden pertama Indonesia?", choices: ["Soeharto", "Soekarno", "Habibie", "Megawati"], correctIndex: 1 },
    { question: "Berapa jumlah provinsi di Indonesia?", choices: ["32", "34", "36", "38"], correctIndex: 2 },
  ];

  static DEFAULT_THRESHOLDS = {
    minWeeklyActivities: 5,
    minReading: 2,
    minQuiz: 1,
    minDiscussion: 1,
  };

  static DEFAULT_GRADES = {
    uts: 85,
    uas: 88,
    attendanceWeight: 50,
    quizWeight: 30,
    utsWeight: 25,
    uasWeight: 25,
  };

  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url", reflect: true },
      kdMateri: { type: String, attribute: "kd-materi", reflect: true },
      studentId: { type: String, attribute: "student-id", reflect: true },
      namaSiswa: { type: String, attribute: "nama-siswa", reflect: true },
      mode: { type: String, attribute: "mode", reflect: true },
      questions: {
        type: Array,
        attribute: "questions",
        reflect: true,
        converter: {
          fromAttribute(value) {
            if (value == null || value === "") return undefined;
            if (Array.isArray(value)) return value;
            const text = String(value).trim();
            if (!text || text.includes("[object Object]")) return undefined;
            if (!(text.startsWith("[") || text.startsWith("{"))) return undefined;
            try {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) return parsed;
              if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
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
      _tab: { state: true },
      _toast: { state: true },
      _logs: { state: true },
      _serverHistory: { state: true },
      _quizScreen: { state: true },
      _quizIdx: { state: true },
      _quizAnswered: { state: true },
      _quizSel: { state: true },
      _quizFb: { state: true },
      _quizFbPos: { state: true },
      _editIdx: { state: true },
      _edit: { state: true },
    };
  }

  constructor() {
    super();
    this.appsScriptUrl = "";
    this.kdMateri = "Pertemuan 1";
    this.studentId = "";
    this.namaSiswa = "Siswa";
    this.mode = "siswa";
    this.questions = this._load(AttendanceSystem.QUESTIONS_KEY, null) || [...AttendanceSystem.DEFAULT_QUESTIONS];
    this.thresholds = { ...AttendanceSystem.DEFAULT_THRESHOLDS, ...this._load(AttendanceSystem.THRESHOLD_KEY, {}) };
    this.grades = { ...AttendanceSystem.DEFAULT_GRADES, ...this._load(AttendanceSystem.GRADES_KEY, {}) };

    this._tab = "kehadiran";
    this._toast = "";
    this._toastT = null;
    this._logs = this._load(AttendanceSystem.LOGS_KEY, []);
    this._serverHistory = [];
    this._quizScreen = "start"; // start | question | result
    this._quizIdx = 0;
    this._quizAnswered = false;
    this._quizSel = -1;
    this._quizFb = "";
    this._quizFbPos = false;
    this._quizScore = 0;
    this._editIdx = -1;
    this._edit = { q: "", c0: "", c1: "", c2: "", c3: "", correct: "0" };
    this._lastScroll = 0;
    this._onScrollBound = this._onScroll.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this._logs = this._load(AttendanceSystem.LOGS_KEY, []);
    globalThis.addEventListener("scroll", this._onScrollBound, { passive: true });
    this._muatRiwayatServer();
  }

  disconnectedCallback() {
    globalThis.removeEventListener("scroll", this._onScrollBound);
    if (this._toastT) clearTimeout(this._toastT);
    super.disconnectedCallback();
  }

  updated(changed) {
    super.updated(changed);
    if (
      changed.has("appsScriptUrl") ||
      changed.has("studentId") ||
      changed.has("kdMateri")
    ) {
      this._muatRiwayatServer();
    }
  }

  // ---------- Storage lokal (ADAPTASI LAMA dari full-quiz-dashboard) ----------
  _load(k, fb) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fb;
    } catch (_) {
      return fb;
    }
  }
  _save(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (_) {}
  }
  _rem(k) {
    try {
      localStorage.removeItem(k);
    } catch (_) {}
  }

  _show(msg) {
    this._toast = msg;
    if (this._toastT) clearTimeout(this._toastT);
    this._toastT = setTimeout(() => {
      this._toast = "";
      this.requestUpdate();
    }, 3200);
    this.requestUpdate();
  }

  get _connected() {
    return !!(this.appsScriptUrl);
  }

  _buatIdLog() {
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

  /** Catat aktivitas lokal + kirim ke antrean idempoten <dasbor-kuis>. */
  _log(type, desc) {
    const l = {
      id: "log-" + Date.now() + "-" + Math.random(),
      timestamp: new Date().toISOString(),
      type,
      description: desc,
    };
    this._logs = [l, ...this._logs];
    this._save(AttendanceSystem.LOGS_KEY, this._logs);

    try {
      const payloadMap = {
        reading: { catatan: desc },
        download: { catatan: desc },
        discussion: { catatan: desc },
        quiz: { score: 0 },
      };
      if (type === "quiz") {
        const m = String(desc || "").match(/Skor:\s*(\d+)%/);
        if (m) payloadMap.quiz.score = parseInt(m[1], 10);
      }
      this.dispatchEvent(
        new CustomEvent("dasbor-kuis-log", {
          detail: {
            id_log: this._buatIdLog(),
            tipe: type,
            payload: { ...payloadMap[type], timestamp: l.timestamp },
          },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (e) {
      // abaikan
    }
    if (this._tab === "kehadiran" || this._tab === "nilai") this.requestUpdate();
  }

  /** ADAPTASI LAMA: nama metode manual guard tetap dipertahankan. */
  pemicuAksiManual(tipe, deskripsi) {
    this._log(tipe, deskripsi);
    this._show(`Simulasi ${tipe} tercatat!`);
    this.requestUpdate();
  }

  _sim(type) {
    const t = {
      reading: ["Membaca Modul 1", "Membaca Modul 2", "Mengeksplorasi Halaman"],
      download: ["Mengunduh PDF Panduan.pdf", "Mengunduh Source Code.zip"],
      discussion: ["Mengirimkan pertanyaan di Forum", "Membalas tanggapan di diskusi"],
    };
    const arr = t[type];
    this._log(type, arr[Math.floor(Math.random() * arr.length)]);
    this._show(`Simulasi ${type} tercatat!`);
  }

  _clearLogs() {
    this._logs = [];
    this._rem(AttendanceSystem.LOGS_KEY);
    this._show("Log direset!");
    this.requestUpdate();
  }

  _onScroll() {
    const now = Date.now();
    if (globalThis.scrollY < 300 || now - this._lastScroll < 60000) return;
    this._lastScroll = now;
    this._log("reading", `Membaca materi (Scroll ${Math.round(globalThis.scrollY)}px)`);
  }

  /** Riwayat server 28 hari (sheet aktivitas, mis. Pertemuan 1) → heatmap. */
  async _muatRiwayatServer() {
    if (!this.appsScriptUrl || !this.studentId) return;
    const qs = new URLSearchParams({
      action: "getActivityHistory",
      studentId: this.studentId,
      kdMateri: this.kdMateri || "",
      days: 28,
    });
    try {
      const res = await fetch(`${this.appsScriptUrl}?${qs.toString()}`);
      const teks = await res.text();
      const data = teks.trim().charAt(0) === "{" ? JSON.parse(teks) : {};
      if (Array.isArray(data && data.history)) {
        this._serverHistory = data.history;
      } else if (data && Array.isArray(data.data)) {
        this._serverHistory = data.data;
      }
      if (data && data.history !== undefined) {
        this.requestUpdate();
      }
    } catch (_) {
      // offline — biarkan log lokal
    }
  }

  // ---------- Statistik ----------
  _tglKey(d) {
    const dd = d || new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${dd.getFullYear()}-${p(dd.getMonth() + 1)}-${p(dd.getDate())}`;
  }

  _weekly() {
    const wa = new Date(Date.now() - 7 * 86400000);
    const wl = (this._logs || []).filter((l) => l && new Date(l.timestamp) >= wa);
    const t = this.thresholds;
    const c = {
      reading: wl.filter((l) => l.type === "reading").length,
      quiz: wl.filter((l) => l.type === "quiz").length,
      discussion: wl.filter((l) => l.type === "discussion").length,
      total: wl.length,
    };
    const g = {
      reading: c.reading >= t.minReading,
      quiz: c.quiz >= t.minQuiz,
      discussion: c.discussion >= t.minDiscussion,
      total: c.total >= t.minWeeklyActivities,
    };
    const met = (g.reading ? 1 : 0) + (g.quiz ? 1 : 0) + (g.discussion ? 1 : 0) + (g.total ? 1 : 0);
    return { counts: c, goals: g, pct: Math.round((met / 4) * 100), status: met >= 3 ? "HADIR" : "BELUM LENGKAP" };
  }

  _streak() {
    const logs = this._logs || [];
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = this._tglKey(d);
      if (logs.some((l) => l && this._tglKey(new Date(l.timestamp)) === key)) s++;
      else if (i > 0) break;
    }
    return s;
  }

  _heatmap() {
    const mapHari = {};
    (this._logs || []).forEach((l) => {
      if (!l || !l.timestamp) return;
      const key = this._tglKey(new Date(l.timestamp));
      mapHari[key] = (mapHari[key] || 0) + 1;
    });
    (this._serverHistory || []).forEach((h) => {
      if (!h || !h.date) return;
      const key = String(h.date).slice(0, 10);
      mapHari[key] = (mapHari[key] || 0) + (parseInt(h.count, 10) || 0);
    });
    const r = [];
    for (let o = 27; o >= 0; o--) {
      const d = new Date();
      d.setDate(d.getDate() - o);
      d.setHours(0, 0, 0, 0);
      const key = this._tglKey(d);
      r.push({ date: d, count: mapHari[key] || 0 });
    }
    return r;
  }

  _grade() {
    const a = this._weekly().pct;
    const ql = (this._logs || []).filter((l) => l && l.type === "quiz");
    let qs = 0;
    if (ql.length) {
      qs = Math.max(...ql.map((l) => {
        const m = String(l.description || "").match(/Skor:\s*(\d+)%/);
        return m ? parseInt(m[1], 10) : 0;
      }));
    }
    const g = this.grades;
    const fin =
      (a * g.attendanceWeight + qs * g.quizWeight + g.uts * g.utsWeight + g.uas * g.uasWeight) / 100;
    let l = "E";
    if (fin >= 85) l = "A";
    else if (fin >= 80) l = "A-";
    else if (fin >= 75) l = "B+";
    else if (fin >= 70) l = "B";
    else if (fin >= 65) l = "B-";
    else if (fin >= 60) l = "C+";
    else if (fin >= 55) l = "C";
    else if (fin >= 40) l = "D";
    return { att: a, quiz: qs, final: Math.round(fin * 10) / 10, grade: l };
  }

  // ---------- Kuis ----------
  _mulaiQuiz() {
    if (this._quizScreen === "result") this._quizScore = 0;
    this._quizScreen = "question";
    this._quizIdx = 0;
    this._quizAnswered = false;
    this._quizSel = -1;
    this._quizFb = "";
    this.requestUpdate();
  }

  _pilihQuiz(i) {
    if (this._quizAnswered) return;
    this._quizAnswered = true;
    this._quizSel = i;
    const q = this.questions[this._quizIdx];
    if (q && i === q.correctIndex) {
      this._quizScore++;
      this._quizFb = "✅ Benar!";
      this._quizFbPos = true;
    } else {
      this._quizFb = q ? `❌ Salah. Jawaban: ${q.choices[q.correctIndex]}` : "Soal tidak valid";
      this._quizFbPos = false;
    }
    this.requestUpdate();
    setTimeout(() => this._nextQuiz(), 1200);
  }

  _nextQuiz() {
    if (this._quizIdx < this.questions.length - 1) {
      this._quizIdx++;
      this._quizAnswered = false;
      this._quizSel = -1;
      this._quizFb = "";
    } else {
      const pct = Math.round((this._quizScore / this.questions.length) * 100);
      this._quizScreen = "result";
      this._log("quiz", `Menyelesaikan Kuis (Skor: ${pct}%)`);
      this.dispatchEvent(
        new CustomEvent("dasbor-kuis-log", {
          detail: {
            id_log: this._buatIdLog(),
            tipe: "quiz",
            payload: {
              score: pct,
              jenisKuis: "formatif",
              metadataKuis: "Dashboard Pembelajaran",
              timestamp: new Date().toISOString(),
            },
          },
          bubbles: true,
          composed: true,
        }),
      );
    }
    this.requestUpdate();
  }

  _resetQuiz() {
    this._quizScreen = "start";
    this._quizScore = 0;
    this.requestUpdate();
  }

  // ---------- Editor soal ----------
  _tambahSoal() {
    const d = this._edit;
    if (!d.q || !d.c0 || !d.c1 || !d.c2 || !d.c3) return this._show("Semua field harus diisi!");
    this.questions = [...this.questions, { question: d.q, choices: [d.c0, d.c1, d.c2, d.c3], correctIndex: parseInt(d.correct, 10) }];
    this._save(AttendanceSystem.QUESTIONS_KEY, this.questions);
    this._edit = { q: "", c0: "", c1: "", c2: "", c3: "", correct: "0" };
    this._show("Soal ditambahkan!");
    this.requestUpdate();
  }

  _editMulai(i) {
    const q = this.questions[i];
    this._editIdx = i;
    this._edit = {
      q: q.question,
      c0: q.choices[0], c1: q.choices[1], c2: q.choices[2], c3: q.choices[3],
      correct: String(q.correctIndex),
    };
    this.requestUpdate();
  }

  _simpanSoal() {
    const d = this._edit;
    if (!d.q) return this._show("Pertanyaan tidak boleh kosong!");
    this.questions = this.questions.map((q, i) =>
      i === this._editIdx ? { question: d.q, choices: [d.c0, d.c1, d.c2, d.c3], correctIndex: parseInt(d.correct, 10) } : q,
    );
    this._save(AttendanceSystem.QUESTIONS_KEY, this.questions);
    this._editIdx = -1;
    this._edit = { q: "", c0: "", c1: "", c2: "", c3: "", correct: "0" };
    this._show("Soal diupdate!");
    this.requestUpdate();
  }

  _hapusSoal(i) {
    if (this.questions.length <= 3) return this._show("Minimal 3 soal!");
    this.questions = this.questions.filter((_, j) => j !== i);
    this._save(AttendanceSystem.QUESTIONS_KEY, this.questions);
    if (this._editIdx === i) {
      this._editIdx = -1;
      this._edit = { q: "", c0: "", c1: "", c2: "", c3: "", correct: "0" };
    }
    this._show("Soal dihapus!");
    this.requestUpdate();
  }

  // ---------- Atur (threshold & bobot) ----------
  _updThreshold(key, val) {
    this.thresholds = { ...this.thresholds, [key]: parseInt(val, 10) };
    this._save(AttendanceSystem.THRESHOLD_KEY, this.thresholds);
    this.requestUpdate();
  }

  _updGrade(key, val) {
    this.grades = { ...this.grades, [key]: parseInt(val, 10) };
    this._save(AttendanceSystem.GRADES_KEY, this.grades);
    this.requestUpdate();
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          font-family: var(--ddd-font-primary);
          color: var(--ddd-theme-default-coalyGray);
          --sk-primary: var(--ddd-primary-13);
          --sk-primary-hover: var(--ddd-primary-10);
          --sk-success: var(--ddd-theme-default-success);
          --sk-success-light: var(--ddd-theme-default-successLight);
          --sk-error: var(--ddd-theme-default-error);
          --sk-error-light: var(--ddd-theme-default-errorLight);
          --sk-warning: var(--ddd-primary-10);
          --sk-info: var(--ddd-theme-default-link);
          --sk-muted: var(--ddd-theme-default-limestoneGray);
          --sk-soft-bg: var(--ddd-theme-default-shrineLight);
          --sk-card-bg: var(--ddd-theme-default-white);
          --sk-border: var(--ddd-theme-default-shrineLight);
          max-width: var(--ddd-layout-size-3);
          margin: 0 auto;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .hd {
          background: linear-gradient(135deg, var(--ddd-primary-13), var(--ddd-primary-8) 55%, var(--ddd-primary-0));
          color: var(--ddd-theme-default-white);
          border-radius: var(--ddd-radius-xl);
          padding: var(--ddd-spacing-5) var(--ddd-spacing-6);
          margin-bottom: var(--ddd-spacing-5);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--ddd-spacing-3);
          box-shadow: var(--ddd-boxShadow-lg);
        }
        .hd h1 { font-size: var(--ddd-font-size-l); font-weight: var(--ddd-font-weight-black); letter-spacing: -0.02em; }
        .hd h1 span { font-size: var(--ddd-font-size-xl); }
        .hd p { font-size: var(--ddd-font-size-3xs); opacity: 0.9; margin-top: var(--ddd-spacing-1); }
        .hdr { display: flex; gap: var(--ddd-spacing-2); align-items: center; }
        .b { display: inline-block; padding: var(--ddd-spacing-0) var(--ddd-spacing-2); border-radius: 99px; font-size: var(--ddd-font-size-xxs); font-weight: var(--ddd-font-weight-black); }
        .b.g { background: var(--ddd-theme-default-successLight); color: var(--ddd-theme-default-success); }
        .b.o { background: var(--ddd-theme-default-shrineMaxLight); color: var(--ddd-primary-10); }
        .tb {
          display: flex;
          border-bottom: var(--ddd-border-sm);
          margin-bottom: var(--ddd-spacing-5);
          overflow-x: auto;
          background: var(--ddd-theme-default-white);
          border-radius: var(--ddd-radius-lg) var(--ddd-radius-lg) 0 0;
          padding: var(--ddd-spacing-0) var(--ddd-spacing-2);
        }
        .tbb {
          padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
          background: none;
          border: none;
          border-bottom: var(--ddd-border-md);
          margin-bottom: calc(var(--ddd-spacing-0) * -1);
          cursor: pointer;
          font-size: var(--ddd-font-size-3xs);
          font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-default-limestoneGray);
          white-space: nowrap;
          transition: all 0.2s;
        }
        .tbb:hover { color: var(--ddd-primary-13); background: var(--ddd-theme-default-shrineMaxLight); border-radius: var(--ddd-radius-s) var(--ddd-radius-s) 0 0; }
        .tbb.a { color: var(--ddd-primary-13); border-bottom-color: var(--ddd-primary-13); }
        .c {
          background: var(--ddd-theme-default-white);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-5);
          margin-bottom: var(--ddd-spacing-5);
          box-shadow: var(--ddd-boxShadow-sm);
          border: var(--ddd-border-xs);
        }
        .c h2 { color: var(--ddd-primary-13); font-size: var(--ddd-font-size-ms); margin-bottom: var(--ddd-spacing-3); display: flex; align-items: center; gap: var(--ddd-spacing-2); }
        .c h3 { color: var(--ddd-theme-default-slateGray); font-size: var(--ddd-font-size-3xs); margin-bottom: var(--ddd-spacing-2); }
        .bp { display: inline-block; padding: var(--ddd-spacing-3) var(--ddd-spacing-5); border: none; border-radius: var(--ddd-radius-s); font-size: var(--ddd-font-size-s); font-weight: var(--ddd-font-weight-bold); cursor: pointer; transition: all 0.2s; }
        .bp.p { background: var(--ddd-primary-13); color: var(--ddd-theme-default-white); box-shadow: 0 var(--ddd-spacing-1) var(--ddd-spacing-3) calc(var(--ddd-spacing-0) * -1) rgba(79, 70, 229, 0.4); }
        .bp.p:hover { background: var(--ddd-primary-8); transform: translateY(-1px); }
        .bp.s { background: transparent; color: var(--ddd-primary-13); border: var(--ddd-border-xs) solid var(--ddd-primary-13); }
        .bp.s:hover { background: var(--ddd-theme-default-shrineMaxLight); }
        .bp.fw { width: 100%; text-align: center; }
        .bs {
          padding: var(--ddd-spacing-1) var(--ddd-spacing-3);
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-sm);
          background: var(--ddd-theme-default-white);
          font-size: var(--ddd-font-size-3xs);
          cursor: pointer;
          transition: all 0.2s;
        }
        .bs:hover { background: var(--ddd-theme-default-shrineMaxLight); }
        .bs.dg { color: var(--ddd-theme-default-error); border-color: var(--ddd-theme-default-errorLight); }
        .bs.dg:hover { background: var(--ddd-theme-default-errorLight); }
        .qb { max-width: var(--ddd-layout-size-3); margin: 0 auto; }
        .qh { display: flex; justify-content: space-between; font-weight: var(--ddd-font-weight-bold); color: var(--ddd-primary-13); margin-bottom: var(--ddd-spacing-4); }
        .qq { font-size: var(--ddd-font-size-ms); font-weight: var(--ddd-font-weight-black); margin-bottom: var(--ddd-spacing-5); line-height: 1.5; color: var(--ddd-theme-default-coalyGray); }
        .qa { display: grid; grid-template-columns: 1fr 1fr; gap: var(--ddd-spacing-3); margin-bottom: var(--ddd-spacing-5); }
        .qab {
          padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
          background: var(--ddd-theme-default-white);
          border: var(--ddd-border-sm);
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-3xs);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          font-family: var(--ddd-font-primary);
        }
        .qab:hover:not(:disabled) { border-color: var(--ddd-primary-13); background: var(--ddd-theme-default-shrineMaxLight); }
        .qab:disabled { cursor: not-allowed; opacity: 0.7; }
        .qab.cc { border-color: var(--ddd-primary-8); background: var(--ddd-theme-default-successLight); color: var(--ddd-theme-default-success); font-weight: var(--ddd-font-weight-bold); }
        .qab.cw { border-color: var(--ddd-theme-default-error); background: var(--ddd-theme-default-errorLight); color: var(--ddd-theme-default-error); }
        .qf { padding: var(--ddd-spacing-3); border-radius: var(--ddd-radius-s); text-align: center; font-weight: var(--ddd-font-weight-bold); }
        .qf.p { background: var(--ddd-theme-default-successLight); color: var(--ddd-theme-default-success); }
        .qf.n { background: var(--ddd-theme-default-errorLight); color: var(--ddd-theme-default-error); }
        .rc { text-align: center; }
        .rc .rp { font-size: var(--ddd-font-size-2xl); font-weight: var(--ddd-font-weight-black); color: var(--ddd-primary-13); margin: var(--ddd-spacing-4) 0; }
        .rc .rm { font-size: var(--ddd-font-size-ms); color: var(--ddd-primary-13); margin-bottom: var(--ddd-spacing-5); }
        .wa { animation: wa 0.3s ease; }
        @media (prefers-reduced-motion: reduce) { .wa { animation: none; } }
        @keyframes wa { from { opacity: 0; transform: translateY(var(--ddd-spacing-2)); } to { opacity: 1; transform: translateY(0); } }
        .smb { display: flex; align-items: center; gap: var(--ddd-spacing-2); margin-bottom: var(--ddd-spacing-3); flex-wrap: wrap; }
        .sl { font-size: var(--ddd-font-size-xxs); color: var(--ddd-theme-default-limestoneGray); font-weight: var(--ddd-font-weight-bold); }
        .g2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: var(--ddd-spacing-5); margin-bottom: var(--ddd-spacing-5); }
        .gw { position: relative; width: var(--ddd-layout-size-s); height: var(--ddd-layout-size-s); margin: 0 auto; }
        .gv { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: var(--ddd-font-size-xl); font-weight: var(--ddd-font-weight-black); color: var(--ddd-theme-default-coalyGray); }
        .cll { display: flex; flex-direction: column; gap: var(--ddd-spacing-3); }
        .cri { display: flex; align-items: center; justify-content: space-between; padding: var(--ddd-spacing-3) var(--ddd-spacing-4); background: var(--ddd-theme-default-shrineMaxLight); border-radius: var(--ddd-radius-s); border: var(--ddd-border-xs) solid var(--ddd-theme-default-shrineLight); }
        .crl { display: flex; align-items: center; gap: var(--ddd-spacing-3); }
        .cric { font-size: var(--ddd-font-size-l); }
        .crn { font-weight: var(--ddd-font-weight-bold); font-size: var(--ddd-font-size-s); color: var(--ddd-theme-default-slateGray); }
        .crp { font-size: var(--ddd-font-size-xxs); color: var(--ddd-theme-default-limestoneGray); }
        .sm2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--ddd-spacing-3); margin-bottom: var(--ddd-spacing-4); }
        .sm { background: var(--ddd-theme-default-shrineMaxLight); border-radius: var(--ddd-radius-s); padding: var(--ddd-spacing-3); text-align: center; border: var(--ddd-border-xs) solid var(--ddd-theme-default-shrineLight); }
        .sml { font-size: var(--ddd-font-size-xxs); color: var(--ddd-theme-default-limestoneGray); }
        .smv { font-size: var(--ddd-font-size-l); font-weight: var(--ddd-font-weight-black); color: var(--ddd-primary-13); margin-top: var(--ddd-spacing-1); }
        .hmh { display: flex; justify-content: center; gap: var(--ddd-spacing-xxs); margin-bottom: var(--ddd-spacing-2); font-size: var(--ddd-font-size-xxs); color: var(--ddd-theme-default-limestoneGray); font-weight: var(--ddd-font-weight-black); }
        .hmh span { width: var(--ddd-sizing-s-38); text-align: center; }
        .hmg { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--ddd-spacing-0); max-width: var(--ddd-layout-size-3); margin: 0 auto; }
        .hc { aspect-ratio: 1; border-radius: var(--ddd-radius-xs); display: flex; align-items: center; justify-content: center; font-size: var(--ddd-font-size-xxs); font-weight: var(--ddd-font-weight-black); cursor: default; color: var(--ddd-theme-default-slateLight); background: var(--ddd-theme-default-shrineLight); transition: transform 0.15s; }
        .hc:hover { transform: scale(1.2); }
        .hc.l1 { background: var(--ddd-theme-default-shrineLight); color: var(--ddd-primary-13); }
        .hc.l2 { background: var(--ddd-primary-13); color: var(--ddd-theme-default-white); }
        .hc.l3 { background: var(--ddd-primary-8); color: var(--ddd-theme-default-white); }
        .hc.l4 { background: var(--ddd-primary-0); color: var(--ddd-primary-13); }
        .hml { display: flex; justify-content: center; align-items: center; gap: var(--ddd-spacing-1); margin-top: var(--ddd-spacing-3); font-size: var(--ddd-font-size-xxs); color: var(--ddd-theme-default-limestoneGray); }
        .lb { width: var(--ddd-sizing-s-30); height: var(--ddd-sizing-s-30); border-radius: var(--ddd-radius-xs); }
        .li { display: flex; gap: var(--ddd-spacing-2); align-items: flex-start; padding: var(--ddd-spacing-1) var(--ddd-spacing-2); border-radius: var(--ddd-radius-xs); font-size: var(--ddd-font-size-xxs); border-left: 3px solid var(--ddd-theme-default-slateLight); margin-bottom: var(--ddd-spacing-0); background: var(--ddd-theme-default-shrineLight); }
        .li.reading { border-left-color: var(--ddd-primary-13); }
        .li.quiz { border-left-color: var(--ddd-primary-8); }
        .li.download { border-left-color: var(--ddd-primary-0); }
        .li.discussion { border-left-color: var(--ddd-primary-10); }
        .lt { color: var(--ddd-theme-default-limestoneGray); min-width: var(--ddd-layout-size-s); }
        .ld { flex: 1; color: var(--ddd-theme-default-slateGray); }
        .gg { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--ddd-spacing-3); margin-bottom: var(--ddd-spacing-5); }
        .gi { background: var(--ddd-theme-default-shrineMaxLight); border: var(--ddd-border-xs) solid var(--ddd-theme-default-shrineLight); border-radius: var(--ddd-radius-s); padding: var(--ddd-spacing-4); text-align: center; }
        .gi.hl { background: var(--ddd-theme-default-shrineMaxLight); border-color: var(--ddd-theme-default-shrineLight); }
        .gl { font-size: var(--ddd-font-size-xxs); color: var(--ddd-theme-default-limestoneGray); text-transform: uppercase; letter-spacing: 0.5px; font-weight: var(--ddd-font-weight-black); }
        .gv { font-size: var(--ddd-font-size-l); font-weight: var(--ddd-font-weight-black); color: var(--ddd-theme-default-coalyGray); margin-top: var(--ddd-spacing-1); }
        .gv.br { color: var(--ddd-primary-13); }
        .gt { width: 100%; border-collapse: collapse; font-size: var(--ddd-font-size-s); }
        .gt th { background: var(--ddd-theme-default-shrineMaxLight); color: var(--ddd-primary-13); font-weight: var(--ddd-font-weight-black); padding: var(--ddd-spacing-2); text-align: left; }
        .gt td { padding: var(--ddd-spacing-2); border-bottom: var(--ddd-border-xs) solid var(--ddd-theme-default-shrineLight); color: var(--ddd-theme-default-slateGray); }
        .bld { font-weight: var(--ddd-font-weight-black); }
        .ef { background: var(--ddd-theme-default-shrineMaxLight); border: var(--ddd-border-xs) solid var(--ddd-theme-default-shrineLight); border-radius: var(--ddd-radius-s); padding: var(--ddd-spacing-4); margin-bottom: var(--ddd-spacing-4); }
        .et { width: 100%; min-height: var(--ddd-layout-size-s); padding: var(--ddd-spacing-2); border: var(--ddd-border-xs); border-radius: var(--ddd-radius-sm); font-size: var(--ddd-font-size-s); font-family: inherit; resize: vertical; margin-bottom: var(--ddd-spacing-3); box-sizing: border-box; }
        .et:focus { outline: none; border-color: var(--ddd-primary-13); }
        .ecr { display: flex; gap: var(--ddd-spacing-2); align-items: center; margin-bottom: var(--ddd-spacing-2); }
        .ecr input { flex: 1; padding: var(--ddd-spacing-2) var(--ddd-spacing-3); border: var(--ddd-border-xs); border-radius: var(--ddd-radius-sm); font-size: var(--ddd-font-size-s); font-family: inherit; box-sizing: border-box; }
        .ecr input:focus { outline: none; border-color: var(--ddd-primary-13); }
        .rl { font-size: var(--ddd-font-size-xxs); color: var(--ddd-theme-default-limestoneGray); display: flex; align-items: center; gap: var(--ddd-spacing-1); cursor: pointer; }
        .ea { display: flex; gap: var(--ddd-spacing-2); margin-top: var(--ddd-spacing-3); flex-wrap: wrap; }
        .qcrd { display: flex; justify-content: space-between; align-items: center; padding: var(--ddd-spacing-3) var(--ddd-spacing-4); background: var(--ddd-theme-default-shrineLight); border: var(--ddd-border-xs) solid var(--ddd-theme-default-shrineLight); border-radius: var(--ddd-radius-xs); margin-bottom: var(--ddd-spacing-1); }
        .qn { font-weight: var(--ddd-font-weight-black); color: var(--ddd-primary-13); min-width: var(--ddd-sizing-s-38); }
        .qa2 { display: flex; gap: var(--ddd-spacing-1); }
        .sg { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--ddd-spacing-3); }
        .si label { display: block; font-size: var(--ddd-font-size-xxs); color: var(--ddd-theme-default-limestoneGray); font-weight: var(--ddd-font-weight-bold); margin-bottom: var(--ddd-spacing-1); }
        .sin { width: 100%; padding: var(--ddd-spacing-2) var(--ddd-spacing-3); border: var(--ddd-border-xs); border-radius: var(--ddd-radius-sm); font-size: var(--ddd-font-size-s); font-family: inherit; box-sizing: border-box; }
        .sin:focus { outline: none; border-color: var(--ddd-primary-13); }
        .ti { padding: var(--ddd-spacing-3) var(--ddd-spacing-4); border-radius: var(--ddd-radius-sm); font-size: var(--ddd-font-size-s); margin: var(--ddd-spacing-3) 0; background: var(--ddd-theme-default-shrineMaxLight); border-left: 4px solid var(--ddd-primary-8); color: var(--ddd-theme-default-slateGray); }
        .ti.w { background: var(--ddd-theme-default-shrineMaxLight); border-left-color: var(--ddd-primary-10); color: var(--ddd-theme-default-slateGray); }
        .t {
          position: fixed;
          bottom: var(--ddd-spacing-6);
          right: var(--ddd-spacing-6);
          background: var(--ddd-theme-default-coalyGray);
          color: var(--ddd-theme-default-white);
          padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-3xs);
          z-index: 9999;
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .srcbtn { background: var(--ddd-theme-default-shrineLight); color: var(--ddd-theme-default-slateGray); }
        .srcbtn:hover { background: var(--ddd-theme-default-shrineMaxLight); }
        @media (max-width: 600px) {
          .qa, .hmg { grid-template-columns: 1fr 1fr; }
          .qa { grid-template-columns: 1fr; }
          .g2 { grid-template-columns: 1fr; }
          .gg { grid-template-columns: repeat(3, 1fr); }
          .sg { grid-template-columns: 1fr 1fr; }
        }
      `,
      css`
        /* ===== DARK MODE (gated on body.dark-mode) ===== */
        :host-context(body.dark-mode) :host {
          --dk-bg: var(--ddd-theme-pughBlue);
          --dk-card: var(--ddd-theme-default-slateGray);
          --dk-soft: var(--ddd-theme-default-coalyGray);
          --dk-softer: var(--ddd-theme-default-slateLight);
          --dk-border: var(--ddd-theme-default-limestoneGray);
          --dk-text: var(--ddd-theme-default-white85);
          --dk-text-soft: var(--ddd-theme-default-limestoneGray);
          --dk-text-strong: var(--ddd-theme-default-white);
          --ddd-theme-background: var(--dk-bg);
          --ddd-theme-color: var(--dk-text);
          --ddd-theme-surface: var(--dk-card);
          background: var(--dk-bg);
          color: var(--dk-text);
        }
        :host-context(body.dark-mode) .hd { background: linear-gradient(135deg, var(--ddd-primary-13) 0%, var(--ddd-primary-13) 55%, var(--ddd-primary-0) 100%); }
        :host-context(body.dark-mode) .b { background: var(--dk-soft); color: var(--dk-text); }
        :host-context(body.dark-mode) .b.g { background: var(--ddd-theme-default-success); color: var(--ddd-theme-default-white); }
        :host-context(body.dark-mode) .b.o { background: var(--ddd-primary-10); color: var(--ddd-theme-default-white); }
        :host-context(body.dark-mode) .tb { background: var(--dk-card); border-bottom-color: var(--dk-border); }
        :host-context(body.dark-mode) .tbb { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .tbb:hover { color: var(--dk-text-strong); background: var(--dk-soft); }
        :host-context(body.dark-mode) .tbb.a { color: var(--dk-text-strong); border-bottom-color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .c { background: var(--dk-card); color: var(--dk-text); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .c h2 { color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .c h3 { color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .bp.p { background: var(--ddd-primary-13); color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .bp.p:hover { background: var(--ddd-primary-8); }
        :host-context(body.dark-mode) .bp.s { background: transparent; color: var(--dk-text-strong); border-color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .bp.s:hover { background: var(--dk-soft); }
        :host-context(body.dark-mode) .bs { background: var(--dk-soft); color: var(--dk-text); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .bs:hover { background: var(--dk-soft); }
        :host-context(body.dark-mode) .bs.dg { color: var(--ddd-theme-default-error); border-color: var(--ddd-theme-default-errorLight); }
        :host-context(body.dark-mode) .bs.dg:hover { background: var(--ddd-theme-default-errorLight); }
        :host-context(body.dark-mode) .srcbtn { background: var(--dk-soft); color: var(--dk-text); }
        :host-context(body.dark-mode) .srcbtn:hover { background: var(--dk-soft); }
        :host-context(body.dark-mode) .qh,
        :host-context(body.dark-mode) .rc .rm { color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .qq,
        :host-context(body.dark-mode) .gv,
        :host-context(body.dark-mode) .smv,
        :host-context(body.dark-mode) .qn { color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .qab { background: var(--dk-soft); color: var(--dk-text); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .qab:hover:not(:disabled) { border-color: var(--dk-text-strong); background: var(--dk-soft); }
        :host-context(body.dark-mode) .qab.cc { border-color: var(--ddd-theme-default-success); background: var(--ddd-theme-default-success); color: var(--ddd-theme-default-white); }
        :host-context(body.dark-mode) .qab.cw { border-color: var(--ddd-theme-default-error); background: var(--ddd-theme-default-error); color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .qf.p { background: var(--ddd-theme-default-success); color: var(--ddd-theme-default-white); }
        :host-context(body.dark-mode) .qf.n { background: var(--ddd-theme-default-error); color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .sl,
        :host-context(body.dark-mode) .crp,
        :host-context(body.dark-mode) .sml,
        :host-context(body.dark-mode) .hmh,
        :host-context(body.dark-mode) .hml { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .cri { background: var(--dk-softer); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .crn { color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .sm { background: var(--dk-softer); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .hc { background: var(--dk-soft); color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .hc.l1 { background: var(--ddd-primary-13); color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .hc.l2 { background: var(--ddd-primary-13); color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .hc.l3 { background: var(--ddd-primary-0); color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .hc.l4 { background: var(--ddd-primary-8); color: var(--dk-soft); }
        :host-context(body.dark-mode) .li { background: var(--dk-soft); border-left-color: var(--dk-border); }
        :host-context(body.dark-mode) .li.reading { border-left-color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .lt { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .ld { color: var(--dk-text); }
        :host-context(body.dark-mode) .gi { background: var(--dk-softer); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .gi.hl { background: var(--dk-soft); }
        :host-context(body.dark-mode) .gl { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .gv.br { color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .gt { background: var(--dk-card); color: var(--dk-text); }
        :host-context(body.dark-mode) .gt th { background: var(--dk-soft); color: var(--dk-text-strong); border-bottom-color: var(--dk-border); }
        :host-context(body.dark-mode) .gt td { border-bottom-color: var(--dk-border); }
        :host-context(body.dark-mode) .ef,
        :host-context(body.dark-mode) .qcrd { background: var(--dk-softer); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .et,
        :host-context(body.dark-mode) .ecr input,
        :host-context(body.dark-mode) .sin { background: var(--dk-soft); color: var(--dk-text); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .rl { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .ti { background: var(--dk-soft); border-left-color: var(--ddd-primary-8); color: var(--dk-text); }
        :host-context(body.dark-mode) .ti.w { background: var(--dk-soft); border-left-color: var(--ddd-primary-10); color: var(--dk-text); }
        :host-context(body.dark-mode) .t { background: var(--dk-soft); color: var(--dk-text-strong); border-color: var(--ddd-primary-13); }
        /* Inline-style override: muted text in template */
        :host-context(body.dark-mode) p[style*="color:var(--ddd-theme-default-limestoneGray)"],
        :host-context(body.dark-mode) div[style*="color:var(--ddd-theme-default-limestoneGray)"] { color: var(--dk-text-soft) !important; }
      `,
    ];
  }

  // ---------- RENDER ----------
  render() {
    const tabs = [
      ["kuis", "📝 Kuis"],
      ["kehadiran", "📊 Kehadiran"],
      ["nilai", "📖 Nilai"],
      ["soal", "⚙️ Soal"],
      ["atur", "🔧 Atur"],
    ];
    return html`
      <div class="hd">
        <div>
          <h1><span>📚</span> Ruang Pertemuan — <span style="font-weight:400;">${this.kdMateri || "Pertemuan"}</span></h1>
          <p>Evaluasi per Pertemuan — Kuis + Kehadiran + Nilai</p>
        </div>
        <div class="hdr">
          <span class="b ${this._connected ? "g" : "o"}">${this._connected ? "Online" : "Luring"}</span>
          <button class="bs srcbtn" aria-label="Sinkronkan ulang data"
            @click=${() => { this._log("download", "Menekan tombol sinkronisasi dashboard"); this._muatRiwayatServer(); }}>
            🔌
          </button>
        </div>
      </div>

       <div class="tb" role="tablist" aria-label="Bagian ruang pertemuan">
        ${tabs.map(
          ([k, l]) => html`
            <button class="tbb ${this._tab === k ? "a" : ""}" role="tab"
              aria-selected=${this._tab === k} @click=${() => (this._tab = k)}>${l}</button>
          `,
        )}
      </div>

      ${this._toast ? html`<div class="t">${this._toast}</div>` : ""}

      ${this._tab === "kuis" ? this._renderQuiz() : ""}
      ${this._tab === "kehadiran" ? this._renderKehadiran() : ""}
      ${this._tab === "nilai" ? this._renderNilai() : ""}
      ${this._tab === "soal" ? this._renderSoal() : ""}
      ${this._tab === "atur" ? this._renderAtur() : ""}
    `;
  }

  _renderQuiz() {
    if (this._quizScreen === "start") {
      return html`
        <div class="c qb">
          <h2>📝 Kuis Interaktif</h2>
          <p style="color:var(--ddd-theme-default-limestoneGray); margin-bottom:var(--ddd-spacing-4);">Selesaikan kuis secara mandiri. Skor terbaik masuk ke kalkulasi Nilai & sinkron ke antrean database V5.</p>
          <button class="bp p fw" @click=${this._mulaiQuiz}>Mulai Kuis (${this.questions.length} soal)</button>
        </div>
      `;
    }
    if (this._quizScreen === "question") {
      const q = this.questions[this._quizIdx];
      if (!q) return html`<div class="c">Soal tidak valid.</div>`;
      return html`
        <div class="c qb">
          <div class="qh">
            <span>Soal ${this._quizIdx + 1}/${this.questions.length}</span>
            <span>Skor: ${this._quizScore}</span>
          </div>
          <div class="qq">${q.question}</div>
          <div class="qa">
            ${q.choices.map((c, i) => {
              let cls = "qab";
              if (this._quizAnswered) {
                if (i === q.correctIndex) cls += " cc";
                else if (i === this._quizSel) cls += " cw";
              }
              return html`
                <button class=${cls} ?disabled=${this._quizAnswered}
                  @click=${() => this._pilihQuiz(i)}>${c}</button>
              `;
            })}
          </div>
          ${this._quizFb ? html`<div class="qf ${this._quizFbPos ? "p" : "n"}">${this._quizFb}</div>` : ""}
        </div>
      `;
    }
    const pct = Math.round((this._quizScore / this.questions.length) * 100);
    let m = "Jangan Menyerah! Coba Lagi!";
    if (pct >= 80) m = "Luar Biasa! 🎉";
    else if (pct >= 50) m = "Bagus! 💪";
    return html`
      <div class="c qb rc">
        <h2>🎊 Hasil Kuis</h2>
        <div class="rp">${pct}%</div>
        <p class="rm">${m} — ${this._quizScore}/${this.questions.length} benar</p>
        <button class="bp p fw" @click=${this._resetQuiz}>Mulai Ulang</button>
      </div>
    `;
  }

  _cri(icon, name, cnt, min, met) {
    return html`
      <div class="cri">
        <div class="crl">
          <span class="cric">${icon}</span>
          <div>
            <div class="crn">${name}</div>
            <div class="crp">${cnt} dari ${min}</div>
          </div>
        </div>
        <span aria-label=${met ? "Tercapai" : "Belum tercapai"}>${met ? "✅" : "⏳"}</span>
      </div>
    `;
  }

  _renderKehadiran() {
    const s = this._weekly();
    const streak = this._streak();
    const hm = this._heatmap();
    const logs = this._logs || [];
    const tr = this.thresholds;
    const gR = 64;
    const gC = 2 * Math.PI * gR;
    const gOff = gC - (s.pct / 100) * gC;
    const hariNama = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

    return html`
      <div class="c">
        <h2>📊 Pelacakan Aktivitas</h2>
        <p style="font-size:var(--ddd-font-size-s); color:var(--ddd-theme-default-limestoneGray); margin-bottom:var(--ddd-spacing-1);">
          Total: <strong>${logs.length}</strong> | Streak: <strong>🔥 ${streak} hari</strong>
        </p>
        <div class="smb">
          <span class="sl">Simulasi:</span>
          <button class="bs" @click=${() => this._sim("reading")}>📖</button>
          <button class="bs" @click=${() => this._sim("download")}>📥</button>
          <button class="bs" @click=${() => this._sim("discussion")}>💬</button>
          <button class="bs dg" @click=${this._clearLogs}>🗑️ Reset</button>
          <button class="bs" @click=${() => this._log("reading", "Membaca materi (tugas modul)")}>📖 Tandai Baca</button>
        </div>
      </div>

      <div class="g2">
        <div class="c">
          <h3>📅 Kehadiran Pekan Ini</h3>
          <div class="gw">
            <svg width="150" height="150" viewBox="0 0 150 150" style="transform:rotate(-90deg)" role="img" aria-label="Kehadiran pekan ini ${s.pct} persen">
              <circle fill="none" stroke="var(--ddd-theme-default-shrineLight)" stroke-width="12" cx="75" cy="75" r="${gR}" />
              <circle fill="none" stroke="var(--ddd-primary-13)" stroke-width="12" stroke-linecap="round" cx="75" cy="75" r="${gR}" stroke-dasharray="${gC}" stroke-dashoffset="${gOff}" />
            </svg>
            <div class="gv">${s.pct}%</div>
          </div>
          <div style="text-align:center;">
            <span class="b ${s.pct >= 75 ? "g" : "o"}">${s.status}</span>
          </div>
          <div class="cll" style="margin-top:var(--ddd-spacing-4);">
            ${this._cri("📖", "Membaca Modul", s.counts.reading, tr.minReading, s.goals.reading)}
            ${this._cri("📝", "Kuis Selesai", s.counts.quiz, tr.minQuiz, s.goals.quiz)}
            ${this._cri("💬", "Forum & Diskusi", s.counts.discussion, tr.minDiscussion, s.goals.discussion)}
            ${this._cri("📈", "Total Aktivitas", s.counts.total, tr.minWeeklyActivities, s.goals.total)}
          </div>
        </div>

        <div class="c">
          <h3>🔥 Konsistensi Belajar</h3>
          <div class="sm2">
            <div class="sm"><div class="sml">Total</div><div class="smv">${logs.length}</div></div>
            <div class="sm"><div class="sml">Streak</div><div class="smv">🔥 ${streak} hari</div></div>
          </div>
          <div style="font-size:var(--ddd-font-size-xxs);font-weight:var(--ddd-font-weight-black);color:var(--ddd-theme-default-limestoneGray);text-align:center;margin:var(--ddd-spacing-4) 0 var(--ddd-spacing-2);">
            Peta Aktivitas 28 Hari
          </div>
          <div class="hmh">
            ${hariNama.map((h) => html`<span>${h}</span>`)}
          </div>
          <div class="hmg">
            ${hm.map(
              (d) => {
                let lvl = "";
                if (d.count > 0 && d.count <= 2) lvl = "l1";
                else if (d.count > 2 && d.count <= 4) lvl = "l2";
                else if (d.count > 4 && d.count <= 7) lvl = "l3";
                else if (d.count > 7) lvl = "l4";
                return html`
                  <div class="hc ${lvl}" title="${d.date.toLocaleDateString("id-ID")}: ${d.count}">${d.count || ""}</div>
                `;
              },
            )}
          </div>
          <div class="hml">
            <span>Sedikit</span>
            <div class="lb" style="background:var(--ddd-theme-default-shrineLight);"></div>
            <div class="lb" style="background:var(--ddd-theme-default-shrineMaxLight);"></div>
            <div class="lb" style="background:var(--ddd-primary-13);"></div>
            <div class="lb" style="background:var(--ddd-primary-8);"></div>
            <div class="lb" style="background:var(--ddd-primary-0);"></div>
            <span>Banyak</span>
          </div>
          <div style="margin-top:var(--ddd-spacing-4); max-height:var(--ddd-layout-size-xl); overflow-y:auto;">
            <div style="font-size:var(--ddd-font-size-xxs); font-weight:var(--ddd-font-weight-black); color:var(--ddd-theme-default-limestoneGray); margin-bottom:var(--ddd-spacing-2);">Log Terbaru:</div>
            ${logs.length === 0
              ? html`<div class="ti" style="margin:0;">Belum ada aktivitas tercatat. Gunakan tombol simulasi di atas atau kerjakan kuis/materi.</div>`
              : logs.slice(0, 5).map(
                  (l) => html`
                    <div class="li ${l.type}">
                      <span class="lt">${new Date(l.timestamp).toLocaleString("id-ID")}</span>
                      <span class="ld">${l.description}</span>
                    </div>
                  `,
                )}
          </div>
        </div>
      </div>
    `;
  }

  _renderNilai() {
    const gr = this._grade();
    const g = this.grades;
    const totalW = g.attendanceWeight + g.quizWeight + g.utsWeight + g.uasWeight;
    return html`
      <div class="c">
        <h2>📖 Transparansi Nilai</h2>
        <div class="gg">
          <div class="gi"><div class="gl">Kehadiran</div><div class="gv">${gr.att}%</div></div>
          <div class="gi"><div class="gl">Kuis</div><div class="gv">${gr.quiz}%</div></div>
          <div class="gi"><div class="gl">UTS</div><div class="gv">${g.uts}%</div></div>
          <div class="gi"><div class="gl">UAS</div><div class="gv">${g.uas}%</div></div>
          <div class="gi hl"><div class="gl">Nilai Akhir</div><div class="gv br">${gr.final}</div></div>
          <div class="gi hl"><div class="gl">Grade</div><div class="gv br" style="font-size:32px">${gr.grade}</div></div>
        </div>
        <table class="gt">
          <thead><tr><th>Komponen</th><th>Bobot</th><th>Nilai</th></tr></thead>
          <tbody>
            <tr><td class="bld">Kehadiran</td><td>${g.attendanceWeight}%</td><td>${gr.att}</td></tr>
            <tr><td class="bld">Kuis</td><td>${g.quizWeight}%</td><td>${gr.quiz}</td></tr>
            <tr><td class="bld">UTS</td><td>${g.utsWeight}%</td><td>${g.uts}</td></tr>
            <tr><td class="bld">UAS</td><td>${g.uasWeight}%</td><td>${g.uas}</td></tr>
            <tr>
              <td class="bld" colspan="3">
                Final = (${gr.att}×${g.attendanceWeight}% + ${gr.quiz}×${g.quizWeight}% + ${g.uts}×${g.utsWeight}% + ${g.uas}×${g.uasWeight}%) ÷ 100 = <strong>${gr.final}</strong> (${gr.grade})
              </td>
            </tr>
          </tbody>
        </table>
        <div class="ti">🧮 Bobot & nilai UTS/UAS bisa diubah di tab <strong>Atur</strong> (opsi dosen).</div>
      </div>
    `;
  }

  _renderSoal() {
    const d = this._edit;
    return html`
      <div class="c">
        <h2>⚙️ Edit Soal (${this.questions.length})</h2>
        <div class="ef">
          <h3>${this._editIdx >= 0 ? "Edit #" + (this._editIdx + 1) : "Tambah Baru"}</h3>
          <textarea class="et" placeholder="Pertanyaan..." .value=${d.q || ""}
            @input=${(e) => (this._edit = { ...this._edit, q: e.target.value })}></textarea>
          <div>
            ${[0, 1, 2, 3].map(
              (i) => html`
                <div class="ecr">
                  <input placeholder="Pilihan ${i + 1}" .value=${d["c" + i] || ""}
                    @input=${(e) => (this._edit = { ...this._edit, ["c" + i]: e.target.value })}>
                  <label class="rl">
                    <input type="radio" name="ca" value="${i}"
                      ?checked=${String(d.correct) === String(i)}
                      @change=${(e) => (this._edit = { ...this._edit, correct: e.target.value })}> Benar
                  </label>
                </div>
              `,
            )}
          </div>
          ${this._editIdx >= 0
            ? html`
                <div class="ea">
                  <button class="bp p" @click=${this._simpanSoal}>Simpan</button>
                  <button class="bp s" @click=${() => { this._editIdx = -1; this._edit = { q: "", c0: "", c1: "", c2: "", c3: "", correct: "0" }; this.requestUpdate(); }}>Batal</button>
                </div>
              `
            : html`<button class="bp p fw" @click=${this._tambahSoal}>Tambah Soal</button>`}
        </div>
        <div style="margin-top:20px;">
          <h3>Daftar Soal</h3>
          ${this.questions.map(
            (q, i) => html`
              <div class="qcrd">
                <div class="qn">#${i + 1}</div>
                <div style="flex:1;">${q.question}</div>
                <div class="qa2">
                  <button class="bs" aria-label="Edit soal ${i + 1}" @click=${() => this._editMulai(i)}>✏️</button>
                  <button class="bs dg" aria-label="Hapus soal ${i + 1}" ?disabled=${this.questions.length <= 3} @click=${() => this._hapusSoal(i)}>🗑️</button>
                </div>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  _renderAtur() {
    const t = this.thresholds;
    const g = this.grades;
    const totalW = g.attendanceWeight + g.quizWeight + g.utsWeight + g.uasWeight;
    const thList = [
      { l: "Total Aktivitas", k: "minWeeklyActivities", v: t.minWeeklyActivities },
      { l: "Membaca", k: "minReading", v: t.minReading },
      { l: "Kuis", k: "minQuiz", v: t.minQuiz },
      { l: "Diskusi", k: "minDiscussion", v: t.minDiscussion },
    ];
    const grList = [
      { l: "Nilai UTS", k: "uts", v: g.uts },
      { l: "Nilai UAS", k: "uas", v: g.uas },
      { l: "Bobot Kehadiran (%)", k: "attendanceWeight", v: g.attendanceWeight },
      { l: "Bobot Kuis (%)", k: "quizWeight", v: g.quizWeight },
      { l: "Bobot UTS (%)", k: "utsWeight", v: g.utsWeight },
      { l: "Bobot UAS (%)", k: "uasWeight", v: g.uasWeight },
    ];
    return html`
      <div class="c">
        <h2>🔧 Pengaturan</h2>
        <h3 style="margin-top:var(--ddd-spacing-4);">Threshold Kehadiran</h3>
        <div class="sg">
          ${thList.map(
            (x) => html`
              <div class="si">
                <label for="th-${x.k}">${x.l}</label>
                <input id="th-${x.k}" class="sin" type="number" .value=${x.v}
                  @change=${(e) => this._updThreshold(x.k, e.target.value)}>
              </div>
            `,
          )}
        </div>
        <h3 style="margin-top:var(--ddd-spacing-5);">Bobot Nilai</h3>
        <div class="sg">
          ${grList.map(
            (x) => html`
              <div class="si">
                <label for="gr-${x.k}">${x.l}</label>
                <input id="gr-${x.k}" class="sin" type="number" .value=${x.v}
                  @change=${(e) => this._updGrade(x.k, e.target.value)}>
              </div>
            `,
          )}
        </div>
        <div class="ti w">⚠️ Total bobot: ${totalW}% (sebaiknya 100%)</div>
      </div>
    `;
  }
}

customElements.define(AttendanceSystem.tag, AttendanceSystem);