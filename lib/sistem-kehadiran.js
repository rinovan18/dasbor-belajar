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
          font-family: var(--ddd-font-navigation, system-ui, sans-serif);
          color: var(--ddd-theme-default-text);
          max-width: 960px;
          margin: 0 auto;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .hd {
          background: linear-gradient(135deg, #312e81, #6750a4 55%, #9c7cf4);
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
        .hd h1 { font-size: var(--ddd-font-size-l); font-weight: 800; letter-spacing: -0.02em; }
        .hd h1 span { font-size: 24px; }
        .hd p { font-size: 13px; opacity: 0.9; margin-top: 2px; }
        .hdr { display: flex; gap: var(--ddd-spacing-2); align-items: center; }
        .b { display: inline-block; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
        .b.g { background: #d1fae5; color: #065f46; }
        .b.o { background: #fef3c7; color: #92400e; }
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
          margin-bottom: -2px;
          cursor: pointer;
          font-size: var(--ddd-font-size-4xs);
          font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-secondary);
          white-space: nowrap;
          transition: all 0.2s;
        }
        .tbb:hover { color: #4f46e5; background: #eef2ff; border-radius: 10px 10px 0 0; }
        .tbb.a { color: #4f46e5; border-bottom-color: #4f46e5; }
        .c {
          background: var(--ddd-theme-default-white);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-5);
          margin-bottom: var(--ddd-spacing-5);
          box-shadow: var(--ddd-boxShadow-sm);
          border: var(--ddd-border-xs);
        }
        .c h2 { color: #312e81; font-size: var(--ddd-font-size-ms); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .c h3 { color: #49454f; font-size: 15px; margin-bottom: 10px; }
        .bp { display: inline-block; padding: 10px 20px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .bp.p { background: #4f46e5; color: var(--ddd-theme-default-white); box-shadow: 0 4px 10px -2px rgb(79 70 229 / 0.4); }
        .bp.p:hover { background: #4338ca; transform: translateY(-1px); }
        .bp.s { background: transparent; color: #4f46e5; border: 1px solid #4f46e5; }
        .bp.s:hover { background: #eef2ff; }
        .bp.fw { width: 100%; text-align: center; }
        .bs {
          padding: var(--ddd-spacing-1) var(--ddd-spacing-3);
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-sm);
          background: var(--ddd-theme-default-white);
          font-size: var(--ddd-font-size-4xs);
          cursor: pointer;
          transition: all 0.2s;
        }
        .bs:hover { background: #eef2ff; }
        .bs.dg { color: #ba1a1a; border-color: #ffcdd2; }
        .bs.dg:hover { background: #ffebee; }
        .qb { max-width: 620px; margin: 0 auto; }
        .qh { display: flex; justify-content: space-between; font-weight: 700; color: #4f46e5; margin-bottom: 16px; }
        .qq { font-size: 18px; font-weight: 700; margin-bottom: 20px; line-height: 1.5; color: #0f172a; }
        .qa { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .qab {
          padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
          background: var(--ddd-theme-default-white);
          border: var(--ddd-border-sm);
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-4xs);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          font-family: var(--ddd-font-primary);
        }
        .qab:hover:not(:disabled) { border-color: #4f46e5; background: #eef2ff; }
        .qab:disabled { cursor: not-allowed; opacity: 0.7; }
        .qab.cc { border-color: #22c55e; background: #f0fdf4; color: #166534; font-weight: 700; }
        .qab.cw { border-color: #ef4444; background: #fef2f2; color: #991b1b; }
        .qf { padding: 14px; border-radius: 10px; text-align: center; font-weight: 700; }
        .qf.p { background: #dcfce7; color: #166534; }
        .qf.n { background: #fee2e2; color: #991b1b; }
        .rc { text-align: center; }
        .rc .rp { font-size: 48px; font-weight: 800; color: #4f46e5; margin: 16px 0; }
        .rc .rm { font-size: 18px; color: #4f46e5; margin-bottom: 20px; }
        .wa { animation: wa 0.3s ease; }
        @media (prefers-reduced-motion: reduce) { .wa { animation: none; } }
        @keyframes wa { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .smb { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
        .sl { font-size: 12px; color: #64748b; font-weight: 600; }
        .g2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .gw { position: relative; width: 150px; height: 150px; margin: 0 auto; }
        .gv { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 30px; font-weight: 800; color: #0f172a; }
        .cll { display: flex; flex-direction: column; gap: 10px; }
        .cri { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #fcfbfe; border-radius: 10px; border: 1px solid #f1eef8; }
        .crl { display: flex; align-items: center; gap: 10px; }
        .cric { font-size: 20px; }
        .crn { font-weight: 600; font-size: 13px; color: #1e293b; }
        .crp { font-size: 11px; color: #64748b; }
        .sm2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .sm { background: #fbf9ff; border-radius: 10px; padding: 12px; text-align: center; border: 1px solid #f1eef8; }
        .sml { font-size: 11px; color: #64748b; }
        .smv { font-size: 22px; font-weight: 800; color: #4f46e5; margin-top: 4px; }
        .hmh { display: flex; justify-content: center; gap: 5px; margin-bottom: 6px; font-size: 10px; color: #64748b; font-weight: 700; }
        .hmh span { width: 30px; text-align: center; }
        .hmg { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; max-width: 300px; margin: 0 auto; }
        .hc { aspect-ratio: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; cursor: default; color: #9c99a6; background: #f3f0fa; transition: transform 0.15s; }
        .hc:hover { transform: scale(1.2); }
        .hc.l1 { background: #e3d9fc; color: #4f46e5; }
        .hc.l2 { background: #c7b3fc; color: var(--ddd-theme-default-white); }
        .hc.l3 { background: #9d7bfc; color: var(--ddd-theme-default-white); }
        .hc.l4 { background: #4f46e5; color: var(--ddd-theme-default-white); }
        .hml { display: flex; justify-content: center; align-items: center; gap: 4px; margin-top: 10px; font-size: 10px; color: #64748b; }
        .lb { width: 12px; height: 12px; border-radius: 2px; }
        .li { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; border-radius: 6px; font-size: 11px; border-left: 3px solid #94a3b8; margin-bottom: 4px; background: #f8fafc; }
        .li.reading { border-left-color: #4f46e5; }
        .li.quiz { border-left-color: #ec4899; }
        .li.download { border-left-color: #10b981; }
        .li.discussion { border-left-color: #f59e0b; }
        .lt { color: #94a3b8; min-width: 122px; }
        .ld { flex: 1; color: #334155; }
        .gg { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px; }
        .gi { background: #fcfbfe; border: 1px solid #f1eef8; border-radius: 10px; padding: 14px; text-align: center; }
        .gi.hl { background: #eef2ff; border-color: #c7d2fe; }
        .gl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
        .gv { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
        .gv.br { color: #4f46e5; }
        .gt { width: 100%; border-collapse: collapse; font-size: 13px; }
        .gt th { background: #eef2ff; color: #312e81; font-weight: 700; padding: 10px; text-align: left; }
        .gt td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
        .bld { font-weight: 700; }
        .ef { background: #fcfbfe; border: 1px solid #f1eef8; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .et { width: 100%; min-height: 70px; padding: 10px; border: var(--ddd-border-xs); border-radius: var(--ddd-radius-sm); font-size: 13px; font-family: inherit; resize: vertical; margin-bottom: 12px; box-sizing: border-box; }
        .et:focus { outline: none; border-color: #4f46e5; }
        .ecr { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
        .ecr input { flex: 1; padding: 8px 10px; border: var(--ddd-border-xs); border-radius: var(--ddd-radius-sm); font-size: 13px; font-family: inherit; box-sizing: border-box; }
        .ecr input:focus { outline: none; border-color: #4f46e5; }
        .rl { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 4px; cursor: pointer; }
        .ea { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .qcrd { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border: 1px solid #eef2f6; border-radius: 8px; margin-bottom: 6px; }
        .qn { font-weight: 700; color: #4f46e5; min-width: 30px; }
        .qa2 { display: flex; gap: 4px; }
        .sg { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
        .si label { display: block; font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
        .sin { width: 100%; padding: 8px 10px; border: var(--ddd-border-xs); border-radius: var(--ddd-radius-sm); font-size: 13px; font-family: inherit; box-sizing: border-box; }
        .sin:focus { outline: none; border-color: #4f46e5; }
        .ti { padding: 12px 16px; border-radius: var(--ddd-radius-sm); font-size: 13px; margin: 12px 0; background: #e3f2fd; border-left: 4px solid #2196f3; color: #1565c0; }
        .ti.w { background: #fff3e0; border-left-color: #ff9800; color: #e65100; }
        .t {
          position: fixed;
          bottom: var(--ddd-spacing-6);
          right: var(--ddd-spacing-6);
          background: var(--ddd-theme-default-text);
          color: var(--ddd-theme-default-white);
          padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-4xs);
          z-index: 9999;
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .srcbtn { background: #f8fafc; color: #334155; }
        .srcbtn:hover { background: #eef2ff; }
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
          --dk-bg: #0b1020;
          --dk-card: #111827;
          --dk-soft: #1f2937;
          --dk-softer: #182032;
          --dk-border: #2a3245;
          --dk-text: #e5e7eb;
          --dk-text-soft: #94a3b8;
          --dk-text-strong: #f8fafc;
          --ddd-theme-background: var(--dk-bg);
          --ddd-theme-color: var(--dk-text);
          --ddd-theme-surface: var(--dk-card);
          background: var(--dk-bg);
          color: var(--dk-text);
        }
        :host-context(body.dark-mode) .hd { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%); color: #f8fafc; }
        :host-context(body.dark-mode) .hd h1 { color: #f8fafc; }
        :host-context(body.dark-mode) .hd p { color: #c7d2fe; }
        :host-context(body.dark-mode) .b { background: var(--dk-soft); color: var(--dk-text); }
        :host-context(body.dark-mode) .b.g { background: #064e3b; color: #6ee7b7; }
        :host-context(body.dark-mode) .b.o { background: #78350f; color: #fcd34d; }
        :host-context(body.dark-mode) .tb { background: var(--dk-card); border-bottom-color: var(--dk-border); }
        :host-context(body.dark-mode) .tbb { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .tbb:hover { color: #c4b5fd; background: #1e1b4b; }
        :host-context(body.dark-mode) .tbb.a { color: #c4b5fd; border-bottom-color: #818cf8; }
        :host-context(body.dark-mode) .c { background: var(--dk-card); color: var(--dk-text); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .c h2 { color: #c4b5fd; }
        :host-context(body.dark-mode) .c h3 { color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .bp.p { background: #4f46e5; color: #f8fafc; }
        :host-context(body.dark-mode) .bp.p:hover { background: #6366f1; }
        :host-context(body.dark-mode) .bp.s { background: transparent; color: #c4b5fd; border-color: #818cf8; }
        :host-context(body.dark-mode) .bp.s:hover { background: #1e1b4b; }
        :host-context(body.dark-mode) .bs { background: var(--dk-soft); color: var(--dk-text); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .bs:hover { background: #1e1b4b; }
        :host-context(body.dark-mode) .bs.dg { color: #fca5a5; border-color: #7f1d1d; }
        :host-context(body.dark-mode) .bs.dg:hover { background: #7f1d1d; }
        :host-context(body.dark-mode) .srcbtn { background: var(--dk-soft); color: var(--dk-text); }
        :host-context(body.dark-mode) .srcbtn:hover { background: #1e1b4b; }
        :host-context(body.dark-mode) .qh,
        :host-context(body.dark-mode) .rc .rm { color: #c4b5fd; }
        :host-context(body.dark-mode) .qq,
        :host-context(body.dark-mode) .gv,
        :host-context(body.dark-mode) .smv,
        :host-context(body.dark-mode) .qn { color: #f8fafc; }
        :host-context(body.dark-mode) .qab { background: var(--dk-soft); color: var(--dk-text); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .qab:hover:not(:disabled) { border-color: #818cf8; background: #1e1b4b; }
        :host-context(body.dark-mode) .qab.cc { border-color: #22c55e; background: #064e3b; color: #6ee7b7; }
        :host-context(body.dark-mode) .qab.cw { border-color: #ef4444; background: #7f1d1d; color: #fca5a5; }
        :host-context(body.dark-mode) .qf.p { background: #064e3b; color: #6ee7b7; }
        :host-context(body.dark-mode) .qf.n { background: #7f1d1d; color: #fca5a5; }
        :host-context(body.dark-mode) .sl,
        :host-context(body.dark-mode) .crp,
        :host-context(body.dark-mode) .sml,
        :host-context(body.dark-mode) .hmh,
        :host-context(body.dark-mode) .hml { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .cri { background: var(--dk-softer); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .crn { color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .sm { background: var(--dk-softer); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .hc { background: #1e1b4b; color: #9ca3af; }
        :host-context(body.dark-mode) .hc.l1 { background: #312e81; color: #c7d2fe; }
        :host-context(body.dark-mode) .hc.l2 { background: #4338ca; color: #f8fafc; }
        :host-context(body.dark-mode) .hc.l3 { background: #6366f1; color: #f8fafc; }
        :host-context(body.dark-mode) .hc.l4 { background: #818cf8; color: #1e1b4b; }
        :host-context(body.dark-mode) .li { background: var(--dk-soft); border-left-color: #94a3b8; }
        :host-context(body.dark-mode) .li.reading { border-left-color: #818cf8; }
        :host-context(body.dark-mode) .lt { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .ld { color: var(--dk-text); }
        :host-context(body.dark-mode) .gi { background: var(--dk-softer); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .gi.hl { background: #1e1b4b; }
        :host-context(body.dark-mode) .gl { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .gv.br { color: #c4b5fd; }
        :host-context(body.dark-mode) .gt { background: var(--dk-card); color: var(--dk-text); }
        :host-context(body.dark-mode) .gt th { background: var(--dk-soft); color: var(--dk-text-strong); border-bottom-color: var(--dk-border); }
        :host-context(body.dark-mode) .gt td { border-bottom-color: var(--dk-border); }
        :host-context(body.dark-mode) .ef,
        :host-context(body.dark-mode) .qcrd { background: var(--dk-softer); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .et,
        :host-context(body.dark-mode) .ecr input,
        :host-context(body.dark-mode) .sin { background: var(--dk-soft); color: var(--dk-text); border-color: var(--dk-border); }
        :host-context(body.dark-mode) .rl { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .ti { background: #1e3a8a; border-left-color: #3b82f6; color: #bfdbfe; }
        :host-context(body.dark-mode) .ti.w { background: #78350f; border-left-color: #f59e0b; color: #fde68a; }
        :host-context(body.dark-mode) .t { background: #1e1b4b; color: #c7b5fd; border-color: #4338ca; }
        /* Inline-style override: text colored #64748b in template */
        :host-context(body.dark-mode) p[style*="color:#64748b"],
        :host-context(body.dark-mode) div[style*="color:#64748b"] { color: var(--dk-text-soft) !important; }
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
          <h1><span>🎯</span> Dashboard Pembelajaran</h1>
          <p>Kuis + Kehadiran + Nilai</p>
        </div>
        <div class="hdr">
          <span class="b ${this._connected ? "g" : "o"}">${this._connected ? "Online" : "Luring"}</span>
          <button class="bs srcbtn" aria-label="Sinkronkan ulang data"
            @click=${() => { this._log("download", "Menekan tombol sinkronisasi dashboard"); this._muatRiwayatServer(); }}>
            🔌
          </button>
        </div>
      </div>

      <div class="tb" role="tablist" aria-label="Bagian dashboard pembelajaran">
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
          <p style="color:#64748b; margin-bottom:16px;">Selesaikan kuis secara mandiri. Skor terbaik masuk ke kalkulasi Nilai & sinkron ke antrean database V5.</p>
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
        <p style="font-size:13px; color:#64748b; margin-bottom:4px;">
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
              <circle fill="none" stroke="#f3f0fa" stroke-width="12" cx="75" cy="75" r="${gR}" />
              <circle fill="none" stroke="#4f46e5" stroke-width="12" stroke-linecap="round" cx="75" cy="75" r="${gR}" stroke-dasharray="${gC}" stroke-dashoffset="${gOff}" />
            </svg>
            <div class="gv">${s.pct}%</div>
          </div>
          <div style="text-align:center;">
            <span class="b ${s.pct >= 75 ? "g" : "o"}">${s.status}</span>
          </div>
          <div class="cll" style="margin-top:16px;">
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
          <div style="font-size:12px;font-weight:700;color:#64748b;text-align:center;margin:16px 0 8px;">
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
            <div class="lb" style="background:#f3f0fa"></div>
            <div class="lb" style="background:#e3d9fc"></div>
            <div class="lb" style="background:#c7b3fc"></div>
            <div class="lb" style="background:#9d7bfc"></div>
            <div class="lb" style="background:#4f46e5"></div>
            <span>Banyak</span>
          </div>
          <div style="margin-top:16px; max-height:210px; overflow-y:auto;">
            <div style="font-size:12px; font-weight:700; color:#64748b; margin-bottom:8px;">Log Terbaru:</div>
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
        <h3 style="margin-top:16px;">Threshold Kehadiran</h3>
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
        <h3 style="margin-top:20px;">Bobot Nilai</h3>
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