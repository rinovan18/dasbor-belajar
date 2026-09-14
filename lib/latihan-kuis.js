import { LitElement, html, css, nothing } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";
import "./timer-kuis.js";
import "./kuis-ledakan.js";
import "./quiz-user-auth.js";

/**
 * `latihan-kuis`
 *
 * Halaman contoh latihan terpandu: materi → kuis berwaktu → pesan "nilai
 * terkirim". Menyatukan <kuis-ledakan> (kuis yang ada) dan <timer-kuis>
 * (hitung mundur). Saat waktu habis (event `timer-kuis-expired`), kuis
 * dikunci otomatis (`_selesaiKuis`) lalu materi & kuis disembunyikan dan
 * ditampilkan pesan "Selamat! Nilai sudah terkirim".
 *
 * Nilai dikirim ke Google Apps Script (`apps-script-url`) oleh <kuis-ledakan>
 * lewat action=logActivity, sehingga tercatat di Google Spreadsheet.
 *
 * @element latihan-kuis
 */
export class LatihanKuis extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "latihan-kuis";
  }

  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url", reflect: true },
      spreadsheetUrl: { type: String, attribute: "spreadsheet-url", reflect: true },
      duration: { type: Number, attribute: "duration", reflect: true },
      judulMateri: { type: String, attribute: "judul-materi", reflect: true },
      teksMateri: { type: String, attribute: "teks-materi", reflect: true },
      materiUrl: { type: String, attribute: "materi-url", reflect: true },
      materiFile: { type: String, attribute: "materi-file", reflect: true },
      coverImage: { type: String, attribute: "cover-image", reflect: true },
      judulKuis: { type: String, attribute: "judul-kuis", reflect: true },
      questions: { type: Array, attribute: "questions", reflect: true },
      studentId: { type: String, attribute: "student-id", reflect: true },
      studentName: { type: String, attribute: "student-name", reflect: true },
      studentNis: { type: String, attribute: "student-nis", reflect: true },
      studentAbsen: { type: String, attribute: "student-absen", reflect: true },
      studentKelas: { type: String, attribute: "student-kelas", reflect: true },
      kdMateri: { type: String, attribute: "kd-materi", reflect: true },
      pesanWaktuHabis: { type: String, attribute: "pesan-waktu-habis", reflect: true },
      pesanNilaiTerkirim: { type: String, attribute: "pesan-nilai-terkirim", reflect: true },
      labelMulai: { type: String, attribute: "label-mulai", reflect: true },
      showSheetLink: { type: Boolean, attribute: "show-sheet-link", reflect: true },
      soalFileUrl: { type: String, attribute: "soal-file-url", reflect: true },
      allowRetake: { type: Boolean, attribute: "allow-retake", reflect: true },
      maxRetake: { type: Number, attribute: "max-retake", reflect: true },
      mode: { type: String, attribute: "mode", reflect: true },
      hidePauseRestart: { type: Boolean, attribute: "hide-pause-restart", reflect: true },
      shuffleQuestions: { type: Boolean, attribute: "shuffle-questions", reflect: true },
      shuffleChoices: { type: Boolean, attribute: "shuffle-choices", reflect: true },
      kategori: { type: String, attribute: "kategori", reflect: true },
      hideConfetti: { type: Boolean, attribute: "hide-confetti", reflect: true },
      hideAnswers: { type: Boolean, attribute: "hide-answers", reflect: true },
      hideScore: { type: Boolean, attribute: "hide-score", reflect: true },
      showQuestionNav: { type: Boolean, attribute: "show-question-nav", reflect: true },
      allowBackwardNav: { type: Boolean, attribute: "allow-backward-nav", reflect: true },
      practiceMode: { type: Boolean, attribute: "practice-mode", reflect: true },
      questionDelay: { type: Number, attribute: "question-delay", reflect: true },
      reviewAnswers: { type: Boolean, attribute: "review-answers", reflect: true },
      timerAutostart: { type: Boolean, attribute: "timer-autostart", reflect: true },
      _mulai: { state: true },
      _selesai: { state: true },
      _skor: { state: true },
      _habisWaktu: { state: true },
      _pesan: { state: true },
      _bestSkor: { state: true },
      _pernahIkut: { state: true },
      _attemptKe: { state: true },
      _terkunci: { state: true },
      _resumeRemaining: { state: true },
      _soalFileUrlCache: { state: true },
      _tabSwitchWarning: { state: true },
      _userStarted: { state: true },
      kkm: { type: Number, attribute: "kkm", reflect: true },
      remidiMode: { type: Boolean, attribute: "remidi-mode", reflect: true },
      remidiSoalUrl: { type: String, attribute: "remidi-soal-url", reflect: true },
      nilaiAkhir: { state: true },
      sudahRemidi: { state: true },
      _needsRemidi: { state: true },
      _skorAwal: { state: true },
      _remidiSoal: { state: true },
      _tabSwitchCount: { state: true },
      _visibilityChangeCount: { state: true },
      _windowBlurCount: { state: true },
      _windowFocusCount: { state: true },
      _fullscreenWarning: { state: true },
      _waktuMulai: { state: true },
    };
  }

  constructor() {
    super();
    this.appsScriptUrl = "";
    this.spreadsheetUrl = "";
    this.duration = 300;
    this.judulMateri = "Materi Pembelajaran";
    this.teksMateri =
      "Baca materi di bawah ini dengan saksama sebelum mengerjakan kuis. Waktu pengerjaan kuis dibatasi oleh timer; saat waktu habis, kuis akan dikunci dan nilai otomatis terkirim.";
    this.materiUrl = "";
    this.materiFile = "";
    this.coverImage = "";
    this.judulKuis = "Evaluasi Kuis Interaktif";
    this.questions = undefined;
    this.studentId = "";
    this.studentName = "";
    this.studentNis = "";
    this.studentAbsen = "";
    this.studentKelas = "";
    this.kdMateri = "";
    this.pesanWaktuHabis = "⏰ Waktu habis! Kuis dikunci & dinilai otomatis.";
    this.pesanNilaiTerkirim = "🎉 Selamat! Nilai Anda sudah terkirim ke spreadsheet.";
    this.labelMulai = "▶️ Mulai";
    this.showSheetLink = false;
    this.soalFileUrl = "";
    this.allowRetake = false;
    this.maxRetake = 0;
    this.mode = "siswa";
    this.hidePauseRestart = true;
    this.shuffleQuestions = false;
    this.shuffleChoices = false;
    this.kategori = "sumatif_lm";
    this.hideConfetti = false;
    this.hideAnswers = false;
    this.hideScore = false;
    this.showQuestionNav = true;
    this.allowBackwardNav = false;
    this.practiceMode = false;
    this.questionDelay = 1800;
    this.reviewAnswers = true;
    this.timerAutostart = true;
    this._mulai = false;
    this._selesai = false;
    this._skor = null;
    this._habisWaktu = false;
    this._pesan = "";
    this._bestSkor = null;
    this._pernahIkut = false;
    this._attemptKe = 0;
    this._terkunci = false;
    this._resumeRemaining = null;
    this._soalFileUrlCache = "";
    this._tabSwitchWarning = false;
    this._userStarted = false;
    this.kkm = 75;
    this.remidiMode = false;
    this.remidiSoalUrl = "";
    this.nilaiAkhir = null;
    this.sudahRemidi = false;
    this._needsRemidi = false;
    this._skorAwal = null;
    this._remidiSoal = [];
    this._tabSwitchCount = 0;
    this._visibilityChangeCount = 0;
    this._windowBlurCount = 0;
    this._windowFocusCount = 0;
    this._onWindowBlur = this._onWindowBlur.bind(this);
    this._onWindowFocus = this._onWindowFocus.bind(this);
    this._waktuMulai = null;
    this._onAuthLogin = this._onAuthLogin.bind(this);
    this._onAuthLogout = this._onAuthLogout.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this.t = {
      ...this.t,
      bacaMateri: "🔗 Buka URL Materi",
      unduhMateri: "📎 Unduh File Materi",
    };
  }

  // Anti-cheat: key untuk localStorage persistence
  _antiCheatKey() {
    return `latihan_kuis_anticheat_${this.studentId}_${this.kdMateri}`;
  }

  // Simpan blur/focus count ke localStorage
  _saveAntiCheatState() {
    if (!this.studentId || !this.kdMateri) return;
    try {
      const data = {
        windowBlurCount: this._windowBlurCount || 0,
        windowFocusCount: this._windowFocusCount || 0,
        tabSwitchCount: this._tabSwitchCount || 0,
        visibilityChangeCount: this._visibilityChangeCount || 0,
        timestamp: Date.now(),
      };
      localStorage.setItem(this._antiCheatKey(), JSON.stringify(data));
    } catch (_) {}
  }

  // Restore blur/focus count dari localStorage
  _restoreAntiCheatState() {
    if (!this.studentId || !this.kdMateri) return;
    try {
      const data = JSON.parse(localStorage.getItem(this._antiCheatKey()));
      if (data) {
        this._windowBlurCount = data.windowBlurCount || 0;
        this._windowFocusCount = data.windowFocusCount || 0;
        this._tabSwitchCount = data.tabSwitchCount || 0;
        this._visibilityChangeCount = data.visibilityChangeCount || 0;
      }
    } catch (_) {}
  }

  // Hapus anti-cheat state (dipanggil saat kuis selesai)
  _clearAntiCheatState() {
    if (!this.studentId || !this.kdMateri) return;
    try {
      localStorage.removeItem(this._antiCheatKey());
    } catch (_) {}
  }

  connectedCallback() {
    super.connectedCallback();
    // Daftarkan ke HAX editor agar latihan-kuis + propertinya muncul di panel
    if (
      globalThis.HaxStore &&
      typeof globalThis.HaxStore.requestAvailability === "function"
    ) {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[LatihanKuis.tag]) {
        store.elementList[LatihanKuis.tag] = LatihanKuis.haxProperties;
      }
    }
    // Sinkronkan identitas siswa dari <quiz-user-auth> (event global) ke properti
    // agar nilai terikat Student ID sebelum kuis dimulai.
    globalThis.addEventListener("quiz-user-login", this._onAuthLogin);
    globalThis.addEventListener("quiz-user-logout", this._onAuthLogout);
    globalThis.addEventListener("visibilitychange", this._onVisibilityChange);
    // Anti-cheat: Window blur/focus detection
    globalThis.addEventListener("blur", this._onWindowBlur, true);
    globalThis.addEventListener("focus", this._onWindowFocus, true);
    // Anti-cheating: Full-screen enforcement
    globalThis.addEventListener("fullscreenchange", this._onFullscreenChange);
    globalThis.addEventListener("mozfullscreenchange", this._onFullscreenChange);
    globalThis.addEventListener("webkitfullscreenchange", this._onFullscreenChange);
    globalThis.addEventListener("MSFullscreenChange", this._onFullscreenChange);
    // Bind anti-cheat handlers
    this._preventCopy = this._preventCopy.bind(this);
    this._preventPaste = this._preventPaste.bind(this);
    this._preventContext = this._preventContext.bind(this);
    this._preventSelect = this._preventSelect.bind(this);
    this._onFullscreenChange = this._onFullscreenChange.bind(this);
    this._handleWarningKeydown = this._handleWarningKeydown.bind(this);
    // Keyboard handler untuk dismiss popup (accessibility)
    document.addEventListener("keydown", this._handleWarningKeydown);
    // T (persistent lock / best score): baca sesi lokal lalu muat status kuis.
    this._loadSession();
    this._muatStatusKuis();
  }

  disconnectedCallback() {
    globalThis.removeEventListener("quiz-user-login", this._onAuthLogin);
    globalThis.removeEventListener("quiz-user-logout", this._onAuthLogout);
    globalThis.removeEventListener("visibilitychange", this._onVisibilityChange);
    // Anti-cheat: Window blur/focus detection
    globalThis.removeEventListener("blur", this._onWindowBlur, true);
    globalThis.removeEventListener("focus", this._onWindowFocus, true);
    // Anti-cheating: Full-screen enforcement
    globalThis.removeEventListener("fullscreenchange", this._onFullscreenChange);
    globalThis.removeEventListener("mozfullscreenchange", this._onFullscreenChange);
    globalThis.removeEventListener("webkitfullscreenchange", this._onFullscreenChange);
    globalThis.removeEventListener("MSFullscreenChange", this._onFullscreenChange);
    document.removeEventListener("keydown", this._handleWarningKeydown);
    super.disconnectedCallback();
  }

  _onAuthLogin(e) {
    const d = (e && e.detail) || {};
    // T: reset dulu agar siswa BERBEDA (re-login di perangkat bersama) tak mewarisi state.
    this._bestSkor = null;
    this._pernahIkut = false;
    this._selesai = false;
    this._habisWaktu = false;
    this._skor = null;
    this._mulai = false;
    this._terkunci = false;
    this._resumeRemaining = null;
    this.studentId = d.studentId || "";
    this.studentName = d.nama || "";
    this.studentNis = d.nis || "";
    this.studentAbsen = d.absen || "";
    this.studentKelas = d.kelas || "";
    this._loadAttemptCounter();
    this._muatStatusKuis();
  }

  _onAuthLogout() {
    this._bestSkor = null;
    this._pernahIkut = false;
    this._selesai = false;
    this._habisWaktu = false;
    this._skor = null;
    this._mulai = false;
    this._terkunci = false;
    this._resumeRemaining = null;
    this._attemptKe = 0;
    this.studentId = "";
    this.studentName = "";
    this.studentNis = "";
    this.studentAbsen = "";
    this.studentKelas = "";
}

  _onVisibilityChange() {
    // Count all visibility changes for audit
    this._visibilityChangeCount = (this._visibilityChangeCount || 0) + 1;
    if (document.visibilityState === "hidden" && this._mulai && !this._selesai) {
      // Save timer state when tab hidden
      const remaining = this._bacaSisaWaktu();
      if (remaining > 0) {
        try {
          const key = `latihan_kuis_remaining_${this.studentId}_${this.kdMateri}`;
          globalThis.localStorage.setItem(key, String(remaining));
        } catch (_) {}
      }
      // Count tab switches for cheat detection context
      this._tabSwitchCount = (this._tabSwitchCount || 0) + 1;
      this._windowBlurCount = (this._windowBlurCount || 0) + 1;
      this._tabSwitchWarning = true;
      this.requestUpdate();
      // Simpan count ke localStorage (bukan log per-event)
      this._saveAntiCheatState();
    } else if (document.visibilityState === "visible" && this._mulai && !this._selesai) {
      // Restore timer state when tab visible (only if quiz in progress)
      try {
        const key = `latihan_kuis_remaining_${this.studentId}_${this.kdMateri}`;
        const remainingStr = globalThis.localStorage.getItem(key);
        if (remainingStr) {
          const remaining = parseInt(remainingStr, 10);
          if (!isNaN(remaining) && remaining > 0) {
            this._resumeRemaining = remaining;
            globalThis.localStorage.removeItem(key);
            // Explicit re-render to update timer component
            this.requestUpdate();
          }
        }
      } catch (_) {}
      // Count focus event
      this._windowFocusCount = (this._windowFocusCount || 0) + 1;
      // Simpan count ke localStorage (bukan log per-event)
      this._saveAntiCheatState();
    }
  }

  // Anti-cheat: Window blur/focus detection (fallback for older browsers)
  _onWindowBlur() {
    // Hanya tampilkan warning jika tab benar-benar hidden (visibilitychange)
    // Jangan tampilkan jika hanya blur biasa (klik toolbar, dev tools, dll)
    if (this._mulai && !this._selesai && document.hidden) {
      // Count sudah dihandle oleh _onVisibilityChange
      this._tabSwitchWarning = true;
      this.requestUpdate();
    }
  }

  _onWindowFocus() {
    if (this._mulai && !this._selesai && this._windowBlurCount > 0) {
      this._windowFocusCount = (this._windowFocusCount || 0) + 1;
      this._tabSwitchWarning = false;
      this.requestUpdate();
      this._logActivity("window_focus", {
        count: this._windowFocusCount,
        timestamp: new Date().toISOString(),
        visibilityState: document.visibilityState,
      });
    }
  }

  // Anti-cheating: Full-screen enforcement
  _onFullscreenChange() {
    if (!document.fullscreenElement && !document.mozFullScreenElement && 
        !document.webkitFullscreenElement && !document.msFullscreenElement) {
      // User exited fullscreen while quiz is in progress
      if (this._mulai && !this._selesai) {
        this._fullscreenWarning = true;
        this.requestUpdate();
        // Log fullscreen exit for anti-cheating
        this._logActivity('fullscreen_exit', { 
          timestamp: new Date().toISOString(),
          waktuMulai: this._waktuMulai 
        });
      }
    }
  }

  // Keyboard handler untuk dismiss warning popup (accessibility)
  _handleWarningKeydown(e) {
    if (e.key === "Escape" && this._tabSwitchWarning) {
      this._tabSwitchWarning = false;
      this.requestUpdate();
    } else if (e.key === "Escape" && this._fullscreenWarning) {
      this._fullscreenWarning = false;
      this.requestUpdate();
    }
  }

  // Anti-cheating: Request fullscreen when quiz starts
  _requestFullscreen() {
    try {
      const el = this.shadowRoot || this;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } catch (_) {}
  }

  // ==========================================
  // ANTI-CHEAT: Copy/Paste Prevention
  // ==========================================
  _enableAntiCheat() {
    this.addEventListener("copy", this._preventCopy);
    this.addEventListener("paste", this._preventPaste);
    this.addEventListener("contextmenu", this._preventContext);
    this.addEventListener("selectstart", this._preventSelect);
  }

  _disableAntiCheat() {
    this.removeEventListener("copy", this._preventCopy);
    this.removeEventListener("paste", this._preventPaste);
    this.removeEventListener("contextmenu", this._preventContext);
    this.removeEventListener("selectstart", this._preventSelect);
  }

  _preventCopy(e) {
    if (this._mulai && !this._selesai) {
      e.preventDefault();
      e.stopPropagation();
      // Log copy attempt for anti-cheating
      this._logActivity('copy_paste_attempt', { 
        eventType: 'copy',
        timestamp: new Date().toISOString() 
      });
    }
  }

  _preventPaste(e) {
    if (this._mulai && !this._selesai) {
      e.preventDefault();
      e.stopPropagation();
      // Log paste attempt for anti-cheating
      this._logActivity('copy_paste_attempt', { 
        eventType: 'paste',
        timestamp: new Date().toISOString() 
      });
    }
  }

  _preventContext(e) {
    if (this._mulai && !this._selesai) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  _preventSelect(e) {
    if (this._mulai && !this._selesai) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // ==========================================
  // ANTI-CHEAT: Time Manipulation Detection
  // ==========================================
  _logCurangan(type, detail) {
    if (!this.studentId || !this.kdMateri) return;
    const key = `latihan_kuis_curangan_${this.studentId}_${this.kdMateri}`;
    try {
      const log = {
        type,
        detail,
        timestamp: Date.now(),
        // Additional context for teacher review
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        tabSwitchCount: this._tabSwitchCount || 0,
        visibilityChangeCount: this._visibilityChangeCount || 0,
        windowBlurCount: this._windowBlurCount || 0,
        windowFocusCount: this._windowFocusCount || 0,
        quizDuration: this.duration,
        studentId: this.studentId,
        kdMateri: this.kdMateri,
      };
      globalThis.localStorage.setItem(key, JSON.stringify(log));
    } catch (_) {}
  }

  /** Log kuis dimulai - buat verifikasi di spreadsheet. */
  _logMulaiKuis() {
    if (!this.studentId || !this.kdMateri) return;
    try {
      const key = `latihan_kuis_mulai_${this.studentId}_${this.kdMateri}`;
      globalThis.localStorage.setItem(key, String(Date.now()));
    } catch (_) {}
  }

  /** Log kuis selesai - buat verifikasi di spreadsheet. */
  _logSelesaiKuis() {
    if (!this.studentId || !this.kdMateri) return;
    try {
      const key = `latihan_kuis_selesai_${this.studentId}_${this.kdMateri}`;
      globalThis.localStorage.setItem(key, String(Date.now()));
    } catch (_) {}
  }

  // Anti-cheating: Log activity — dispatch event + direct API call
  _logActivity(tipe_aktivitas, payload_data = {}) {
    const detail = {
      tipe: tipe_aktivitas,
      payload: {
        ...payload_data,
        studentId: this.studentId,
        kdMateri: this.kdMateri,
      },
    };

    // 1. Dispatch event untuk parent component (dasbor-kuis)
    try {
      this.dispatchEvent(
        new CustomEvent("dasbor-kuis-log", {
          detail,
          bubbles: true,
          composed: true,
        })
      );
    } catch (_) {}

    // 2. Direct API call ke backend (fallback jika tidak ada parent)
    this._sendLogDirect(tipe_aktivitas, detail.payload);
  }

  /** Kirim log langsung ke backend via fetch (tidak bergantung event bubbling) */
  async _sendLogDirect(tipe_aktivitas, payload) {
    if (!this.appsScriptUrl || !this.studentId) return;
    try {
      const params = {
        action: "logActivity",
        studentId: this.studentId,
        type: tipe_aktivitas,
        description: JSON.stringify(payload),
        timestamp: new Date().toISOString(),
        kdMateri: this.kdMateri || "",
        kategori: "sumatif_lm",
        id_log: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      };
      const qs = new URLSearchParams(params);
      await fetch(`${this.appsScriptUrl}?${qs.toString()}`, {
        method: "GET",
        mode: "cors",
      });
    } catch (_) {
      // Silent fail — log sudah tersimpan di localStorage via _logCurangan
    }
  }

  /** Baca sesi siswa dari localStorage (TTL 24j) — agar cek status jalan saat reload. */
  _loadSession() {
    try {
      const data = JSON.parse(globalThis.localStorage.getItem("quiz_user_session"));
      if (!data || !data.studentId) return;
      if (data.expiresAt && Date.now() > data.expiresAt) {
        globalThis.localStorage.removeItem("quiz_user_session");
        return;
      }
      this.studentId = data.studentId || "";
      this.studentName = data.nama || "";
      this.studentNis = data.nis || "";
      this.studentAbsen = data.absen || "";
      this.studentKelas = data.kelas || "";
    } catch (_) {
      // abaikan
    }
    this._loadAttemptCounter();
    // Restore remidi state (persist saat refresh)
    this._restoreRemidiState();
    // Jangan langsung resume timer di sini — biarkan _muatStatusKuis() yang
    // mengatur _mulai setelah lock-state pasti (hindari race condition).
  }

  /** Baca counter attempt ter-submit dari localStorage (per studentId+kdMateri). */
  _attemptKey() {
    return `latihan_kuis_attempt_${this.studentId}_${this.kdMateri}`;
  }

  _loadAttemptCounter() {
    if (!this.maxRetake || !this.studentId || !this.kdMateri) return;
    try {
      const v = globalThis.localStorage.getItem(this._attemptKey());
      this._attemptKe = parseInt(v, 10) || 0;
    } catch (_) {
      this._attemptKe = 0;
    }
  }

  _saveAttemptCounter() {
    if (!this.maxRetake || !this.studentId || !this.kdMateri) return;
    try {
      globalThis.localStorage.setItem(this._attemptKey(), String(this._attemptKe));
    } catch (_) {
      // abaikan
    }
  }

  _timerKey() {
    return `latihan_kuis_time_${this.studentId}_${this.kdMateri}`;
  }

  _simpanWaktuMulai() {
    if (!this.studentId || !this.kdMateri) return;
    try {
      globalThis.localStorage.setItem(
        this._timerKey(),
        JSON.stringify({ start: Date.now(), duration: this.duration }),
      );
    } catch (_) {}
  }

  _bacaSisaWaktu() {
    if (!this.studentId || !this.kdMateri) return 0;
    try {
      const d = JSON.parse(globalThis.localStorage.getItem(this._timerKey()) || "null");
      if (!d) return 0;
      const sisa = d.duration - Math.floor((Date.now() - d.start) / 1000);
      return sisa > 0 ? sisa : 0;
    } catch (_) {
      return 0;
    }
  }

  _hapusWaktuMulai() {
    try {
      globalThis.localStorage.removeItem(this._timerKey());
    } catch (_) {}
  }

  _cobaResumeTimer() {
    const sisa = this._bacaSisaWaktu();
    const kuota = this.maxRetake === 0 || this._attemptKe < this.maxRetake + 1;
    
    // Fix: Handle null/undefined and proper quota check
    if (kuota && sisa != null && sisa > 0) {
      this._mulai = true;
      this._resumeRemaining = sisa;
      // Restore anti-cheat state on resume
      this._restoreAntiCheatState();
    }
  }


  /** T: muat status kuis dari sheet (pernah ikut + nilai terbaik) via getQuizLock. */
  _muatStatusKuis() {
    if (!this.appsScriptUrl || !this.studentId || !this.kdMateri) {
      this._cobaResumeTimer();
      return;
    }
    const u = `${this.appsScriptUrl}${this.appsScriptUrl.includes("?") ? "&" : "?"}action=getQuizLock&studentId=${encodeURIComponent(this.studentId)}&kdMateri=${encodeURIComponent(this.kdMateri)}`;
    return fetch(u, { method: "GET", mode: "cors" })
      .then((r) => r.json())
      .then((j) => {
        if (!j) return;
        this._terkunci = Boolean(j.locked);
        this._pernahIkut = typeof j.best === "number" && j.best != null;
        this._bestSkor = typeof j.best === "number" ? j.best : null;
        if (this._terkunci) {
          this._terkunci = true;
          this._selesai = false;
          this._skor = this._bestSkor;
          this._hapusWaktuMulai();
          this._mulai = false;
          this._resumeRemaining = null;
          // hentikan timer yang mungkin sudah jalan sebelum lock diketahui
          try{ const tt = this.shadowRoot && this.shadowRoot.querySelector("timer-kuis"); if(tt && typeof tt.pause==="function") tt.pause(); if(tt && typeof tt.reset==="function") tt.reset(); }catch(_){}
          if (this.remidiMode && typeof this._bestSkor === "number" && this._bestSkor < this.kkm && !this.sudahRemidi) {
            this._needsRemidi = true;
            this._skorAwal = this._bestSkor;
          }
        }
      })
      .catch(() => {
        // Gagal → biarkan attempt (graceful), jangan kunci salah.
      })
      .finally(() => {
        // Only resume if user hasn't manually started the quiz
        if (!this._userStarted && !this._terkunci && !this._selesai) {
          this._cobaResumeTimer();
        }
        this.requestUpdate();
      });
  }

  _ulangiKuis() {
    this._selesai = false;
    this._terkunci = false;
    this._kunci = false;
    this._resumeRemaining = null;
    this._hapusWaktuMulai();
    this._habisWaktu = false;
    this._skor = null;
    this._muatStatusKuis();
    this._mulaiLatihan(); // langsung mulai ulang kuis (retry)
  }

  updated(changed) {
    super.updated(changed);
    if (
      changed.has("soalFileUrl") &&
      this.soalFileUrl &&
      this.soalFileUrl !== this._soalFileUrlCache
    ) {
      this._muatSoalDariFile(this.soalFileUrl);
    }
  }

  async _muatSoalDariFile(url) {
    this._soalFileUrlCache = url;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if (!Array.isArray(d) || d.length === 0) throw new Error("Bukan array JSON / kosong");
      this.questions = d;
      this._pesan = "";
    } catch (e) {
      this._soalFileUrlCache = "";
      if (!this.questions || this.questions.length === 0) {
        this.questions = [];
      }
      this._pesan = "Gagal memuat file soal: " + e.message;
    }
  }

  _onWaktuHabis() {
    // Anti-cheat: detect time manipulation
    // Use 60 second threshold to account for browser throttling when tab is hidden
    // (browsers throttle setInterval in background tabs, which can cause false positives)
    const sisaWaktu = this._bacaSisaWaktu();
    if (sisaWaktu > 60) {
      this._logCurangan("time_manipulation", {
        sisaWaktu,
        tabSwitchCount: this._tabSwitchCount || 0,
        visibilityChanges: this._visibilityChangeCount || 0,
        message: "Timer expired but client still has significant time remaining (>60s). Possible causes: browser throttling (normal) or time manipulation (cheating).",
        timestamp: Date.now(),
      });
    }
    this._logSelesaiKuis();
    const kuis = this.shadowRoot && this.shadowRoot.querySelector("kuis-ledakan");
    if (kuis && kuis._screen !== "result" && typeof kuis._selesaiKuis === "function") {
      kuis._selesaiKuis();
    }
    this._selesai = true;
    this._habisWaktu = true;
    this._resumeRemaining = null;
    this._hapusWaktuMulai();
    this._disableAntiCheat();
    // Log session to Google Sheet for teacher review
    this._kirimLogSession("waktu_habis");
  }

  _onKuisLog(e) {
    if (e.detail && e.detail.payload && typeof e.detail.payload.score === "number") {
      this._logSelesaiKuis();
      this._skor = e.detail.payload.score;
      this._selesai = true;
      this._resumeRemaining = null;
      this._hapusWaktuMulai();
      this._disableAntiCheat();
      // Hapus data attempt latihan-kuis supaya reload berikutnya = fresh attempt
      try {
        globalThis.localStorage.removeItem(this._attemptKey());
        globalThis.localStorage.removeItem(this._timerKey());
      } catch (_) {}
      // L: hitung attempt ter-submit (bukan klik Ulangi) agar reload-trick tak bobol batas.
      if (this.maxRetake) {
        this._attemptKe++;
        this._saveAttemptCounter();
      }
      // Remedial: check if score below KKM
      if (this.remidiMode && this._skor < this.kkm) {
        this._needsRemidi = true;
        this._skorAwal = this._skor;
      } else {
        this._needsRemidi = false;
        if (this.lockAfterComplete && !this.remidiMode) {
          this._terkunci = true;
        }
      }
      // Simpan state remidi ke localStorage (agar persist saat refresh)
      this._saveRemidiState();
      this._muatStatusKuis(); // T: refresh nilai terbaik dari sheet (menangkap attempt baru)
      // Log session to Google Sheet for teacher review
      this._kirimLogSession("selesai");
    }
  }

  async _mulaiLatihan() {
    if (!this.studentId) {
      this.requestUpdate();
      return;
    }
    // pastikan status kunci terbaru sebelum mulai — cegah timer jalan saat terkunci (race)
    await this._muatStatusKuis();
    const remidiBypass = this._needsRemidi && this.remidiMode && !this.sudahRemidi;
    if (this._terkunci && !remidiBypass && this.mode !== "guru") {
      this._pesan = "Kuis terkunci. Hubungi guru atau gunakan Remidi jika nilai < KKM.";
      this._mulai = false;
      this._hapusWaktuMulai();
      const t = this.shadowRoot && this.shadowRoot.querySelector("timer-kuis");
      if (t && typeof t.pause === "function") try{ t.pause(); }catch(_){}
      this.requestUpdate();
      return;
    }
    this._userStarted = true;
    if (remidiBypass || this.mode === "guru") this._terkunci = false;
    else if (this._terkunci) return;
    this._mulai = true;
    this._waktuMulai = Date.now();
    this._simpanWaktuMulai();
    this._logMulaiKuis();
    // Reset anti-cheat counters untuk attempt baru
    this._windowBlurCount = 0;
    this._windowFocusCount = 0;
    this._tabSwitchCount = 0;
    this._visibilityChangeCount = 0;
    this._clearAntiCheatState();
    this._enableAntiCheat();
    // Log timer mulai ke backend
    this._logActivity("timer_mulai", {
      timestamp: new Date().toISOString(),
      durasiUlangan: this.duration || 300,
      waktuMulai: this._waktuMulai,
    });
    // Anti-cheating: Request fullscreen when quiz starts
    this._requestFullscreen();
    await this.updateComplete;
    const kuis = this.shadowRoot && this.shadowRoot.querySelector("kuis-ledakan");
    const timer = this.shadowRoot && this.shadowRoot.querySelector("timer-kuis");
    if (kuis && typeof kuis._onStartClick === "function") kuis._onStartClick();
    if (timer && typeof timer.start === "function") timer.start();
  }

  // ==========================================
  // LOG QUIZ SESSION TO GOOGLE SHEET
  // ==========================================
  async _kirimLogSession(status) {
    if (!this.appsScriptUrl || !this.studentId) return;
    const waktuSelesai = String(Date.now());
    const durasiPengerjaan = this._waktuMulai ? Math.floor((Date.now() - this._waktuMulai) / 1000) : 0;
    const sisaWaktu = this._bacaSisaWaktu();
    const params = {
      action: "logQuizSession",
      studentId: this.studentId,
      nama: this.studentName || "",
      nis: this.studentNis || "",
      absen: this.studentAbsen || "",
      kelas: this.studentKelas || "",
      kdMateri: this.kdMateri || "",
      waktuMulai: this._waktuMulai ? String(this._waktuMulai) : "",
      waktuSelesai: waktuSelesai,
      durasiPengerjaan: durasiPengerjaan,
      durasiUlangan: this.duration || 300,
      sisaWaktu: sisaWaktu,
      tabSwitchCount: this._tabSwitchCount || 0,
      windowBlurCount: this._windowBlurCount || 0,
      windowFocusCount: this._windowFocusCount || 0,
      skor: this._skor != null ? this._skor : -1,
    };
    try {
      const qs = new URLSearchParams(params);
      await fetch(`${this.appsScriptUrl}?${qs.toString()}`, {
        method: "GET",
        mode: "cors",
      });
      // Bersihkan anti-cheat state setelah berhasil dikirim
      this._clearAntiCheatState();
    } catch (e) {
      // Silent fail - log to localStorage as fallback
      const key = `latihan_kuis_session_${this.studentId}_${this.kdMateri}`;
      try {
        localStorage.setItem(key, JSON.stringify(params));
      } catch (_) {}
    }
  }
  async _mulaiRemidi() {
    if (!this.remidiSoalUrl) {
      this._pesan = "Soal remidi belum disiapkan oleh guru.";
      this.requestUpdate();
      return;
    }
    // buka kunci backend dulu agar kuis-ledakan tidak terkunci lagi (soal sama LM1)
    if (this._terkunci && this.appsScriptUrl && this.studentId && this.kdMateri) {
      try {
        const qs = new URLSearchParams({ action: "resetQuizLock", studentId: this.studentId, kdMateri: this.kdMateri });
        await fetch(`${this.appsScriptUrl}?${qs.toString()}`, { method: "GET", mode: "cors" });
      } catch(_){}
      try{ localStorage.removeItem(`kuis-ledakan:attempt:${this.studentId}:${this.kdMateri}`); localStorage.removeItem(`latihan_kuis_attempt_${this.studentId}_${this.kdMateri}`); localStorage.removeItem(`latihan_kuis_time_${this.studentId}_${this.kdMateri}`);}catch(_){}
    }
    try {
      const r = await fetch(this.remidiSoalUrl);
      if (!r.ok) throw new Error("HTTP " + r.status);
      this._remidiSoal = await r.json();
      if (!Array.isArray(this._remidiSoal) || this._remidiSoal.length === 0) {
        throw new Error("Format soal remidi tidak valid");
      }
      // Reset state for remedial — buka kunci jika sebelumnya terkunci
      this._terkunci = false;
      this._selesai = false;
      this._skor = null;
      this._habisWaktu = false;
      this._resumeRemaining = null;
      this._needsRemidi = false;
      this.sudahRemidi = true;
      this._pesan = "";
      // Use remedial questions (soal sama shuffle: file sama LM1, acak via shuffle-choices)
      this.questions = this._remidiSoal;
      // Simpan state remidi ke localStorage (agar persist saat refresh)
      this._saveRemidiState();
      // juga buka kunci kuis-ledakan internal jika ada
      try{ const k=this.shadowRoot&&this.shadowRoot.querySelector("kuis-ledakan"); if(k){ k._locked=false; k._lockChecked=false; } }catch(_){}
      this.requestUpdate();
      // Start quiz with remedial questions
      this._mulaiLatihan();
    } catch (e) {
      this._pesan = "Gagal memulai remidi: " + e.message;
      this.requestUpdate();
    }
  }

  async _resetKunciGuru() {
    if (!this.appsScriptUrl || !this.studentId || !this.kdMateri) {
      this._pesan = "Gagal buka kunci: appsScriptUrl/student/kdMateri belum lengkap.";
      this.requestUpdate();
      return;
    }
    try {
      const qs = new URLSearchParams({ action: "resetQuizLock", studentId: this.studentId, kdMateri: this.kdMateri });
      const r = await fetch(`${this.appsScriptUrl}?${qs.toString()}`, { method: "GET", mode: "cors" });
      const j = await r.json();
      if (j && j.status === "ok") {
        this._terkunci = false; this._selesai = false; this._skor = null; this._bestSkor = null; this._pernahIkut = false;
        try { localStorage.removeItem(`latihan_kuis_attempt_${this.studentId}_${this.kdMateri}`); localStorage.removeItem(`latihan_kuis_time_${this.studentId}_${this.kdMateri}`); } catch(_){}
        this._pesan = `🔓 Kunci LM1 dibuka — ${j.deleted || 0} sesi dihapus. Siswa bisa ulang.`;
        this._muatStatusKuis();
      } else {
        this._pesan = "Gagal buka kunci: " + (j.message || "unknown");
      }
    } catch(e){ this._pesan = "Gagal buka kunci: " + e.message; }
    this.requestUpdate();
  }

  _hitungNilaiAkhir() {
    // Opsi 1: Nilai remidi menggantikan nilai awal
    // this.nilaiAkhir = this._skor;
    // Opsi 2: Rata-rata nilai awal dan remidi
    this.nilaiAkhir = Math.round((this._skorAwal + this._skor) / 2);
    // Opsi 3: Nilai tertinggi
    // this.nilaiAkhir = Math.max(this._skorAwal, this._skor);
    return this.nilaiAkhir;
  }

  // ==========================================
  // REMIDI STATE PERSISTENCE
  // ==========================================
  _remidiKey() {
    return `latihan_kuis_remidi_${this.studentId}_${this.kdMateri}`;
  }

  // Simpan state remidi ke localStorage
  _saveRemidiState() {
    if (!this.studentId || !this.kdMateri) return;
    try {
      const data = {
        sudahRemidi: this.sudahRemidi,
        _needsRemidi: this._needsRemidi,
        _skorAwal: this._skorAwal,
        _remidiSoal: this._remidiSoal || [],
        timestamp: Date.now(),
      };
      localStorage.setItem(this._remidiKey(), JSON.stringify(data));
    } catch (_) {}
  }

  // Restore state remidi dari localStorage
  _restoreRemidiState() {
    if (!this.studentId || !this.kdMateri) return;
    try {
      const data = JSON.parse(localStorage.getItem(this._remidiKey()));
      if (data && data.sudahRemidi) {
        this.sudahRemidi = data.sudahRemidi;
        this._needsRemidi = data._needsRemidi;
        this._skorAwal = data._skorAwal;
        // Restore soal remidi jika ada
        if (Array.isArray(data._remidiSoal) && data._remidiSoal.length > 0) {
          this._remidiSoal = data._remidiSoal;
          // Set questions ke soal remidi jika sedang dalam mode remidi
          if (this.sudahRemidi && this.remidiMode) {
            this.questions = this._remidiSoal;
          }
        }
      }
    } catch (_) {}
  }

  // Hapus state remidi (dipanggil saat kuis selesai atau reset)
  _clearRemidiState() {
    if (!this.studentId || !this.kdMateri) return;
    try {
      localStorage.removeItem(this._remidiKey());
    } catch (_) {}
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host { display: block; font-family: var(--ddd-font-primary, system-ui, sans-serif); }
        .wrap {
          max-width: 920px; margin: 0 auto; padding: var(--ddd-spacing-4);
          display: grid; gap: var(--ddd-spacing-6);
        }
        .materi-card {
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-6);
          background: linear-gradient(180deg, rgba(103,80,164,0.05), transparent);
        }
        .materi-card h2 { color: var(--ddd-theme-primary); margin: 0 0 var(--ddd-spacing-2) 0; }
        .materi-card p { color: var(--ddd-theme-secondary); line-height: 1.6; }
        .cover { width: 100%; max-height: 260px; object-fit: cover; border-radius: var(--ddd-radius-lg); margin-bottom: var(--ddd-spacing-4); }
        .materi-links { display: flex; flex-wrap: wrap; gap: var(--ddd-spacing-3); margin-top: var(--ddd-spacing-4); }
        .materi-links a {
          padding: var(--ddd-spacing-3) var(--ddd-spacing-4); border-radius: var(--ddd-radius-md);
          border: 1px solid var(--ddd-theme-polaris-border);
          color: var(--ddd-theme-primary); text-decoration: none; font-size: var(--ddd-font-size-m);
        }
        .materi-links a:hover { background: rgba(103,80,164,0.08); }
        .btn-mulai {
          width: 100%; padding: var(--ddd-spacing-4); font-size: var(--ddd-font-size-l);
          font-weight: var(--ddd-font-weight-bold); border: none; border-radius: var(--ddd-radius-md);
          background: var(--ddd-theme-primary); color: var(--ddd-theme-on-primary); cursor: pointer;
          font-family: var(--ddd-font-primary);
        }
        .btn-mulai:hover { background: var(--ddd-theme-accent); }
        .auth-hint { text-align: center; color: var(--ddd-theme-secondary); font-size: var(--ddd-font-size-m); margin: var(--ddd-spacing-3) 0 0; }
        .selesai-card {
          text-align: center; border: 1px solid var(--ddd-theme-success);
          border-radius: var(--ddd-radius-lg); padding: var(--ddd-spacing-8);
          background: var(--ddd-theme-default-surface);
        }
        .selesai-card .waktu { font-size: var(--ddd-font-size-l); color: var(--ddd-theme-error); margin-bottom: var(--ddd-spacing-2); }
        .selesai-card .kirim { font-size: var(--ddd-font-size-xl); font-weight: var(--ddd-font-weight-bold); color: var(--ddd-theme-default-text); }
        .selesai-card .kirim.warn { color: var(--ddd-theme-error); }
        .selesai-card .skor { margin: var(--ddd-spacing-4) 0; font-size: var(--ddd-font-size-l); }
        /* Suspicious warning UI for detected time manipulation */
        .selesai-card.suspicious { border-color: var(--ddd-theme-warning); background: linear-gradient(180deg, rgba(245,158,11,0.08), transparent); }
        .suspicious-warning { background: var(--ddd-theme-warning-light); border: 1px solid var(--ddd-theme-warning); border-radius: var(--ddd-radius-lg); padding: var(--ddd-spacing-5); margin-bottom: var(--ddd-spacing-4); text-align: left; }
        .suspicious-icon { font-size: 2rem; margin-bottom: var(--ddd-spacing-2); }
        .suspicious-title { font-size: var(--ddd-font-size-m); font-weight: var(--ddd-font-weight-bold); color: var(--ddd-theme-warning-text); margin-bottom: var(--ddd-spacing-2); }
        .suspicious-text { font-size: var(--ddd-font-size-s); color: var(--ddd-theme-warning); line-height: 1.5; margin-bottom: var(--ddd-spacing-2); }
        .suspicious-note { font-size: var(--ddd-font-size-4xs); color: var(--ddd-theme-warning); font-style: italic; }
        .remidi-card { background: var(--ddd-theme-warning-light); border: 1px solid var(--ddd-theme-warning); border-radius: var(--ddd-radius-lg); padding: var(--ddd-spacing-5); margin-top: var(--ddd-spacing-4); }
        .remidi-card h3 { margin: 0 0 var(--ddd-spacing-2) 0; color: var(--ddd-theme-warning-text); }
        .remidi-card p { color: var(--ddd-theme-warning); margin-bottom: var(--ddd-spacing-3); }
        .selesai-card a {
          display: inline-block; margin-top: var(--ddd-spacing-4); padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
          background: var(--ddd-theme-primary); color: var(--ddd-theme-on-primary); border-radius: var(--ddd-radius-md);
          text-decoration: none; font-weight: var(--ddd-font-weight-bold);
        }
        .err-chip {
          background: var(--ddd-theme-warning-light); border: 1px solid var(--ddd-theme-warning); color: var(--ddd-theme-warning-text);
          padding: var(--ddd-spacing-3); border-radius: var(--ddd-radius-md);
          margin-bottom: var(--ddd-spacing-4);
        }
        .skor-best {
          margin-top: var(--ddd-spacing-4); padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
          border-radius: var(--ddd-radius-md); font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-success);
          background: var(--ddd-theme-success-light);
          display: inline-block;
        }
        .tab-warning-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
        }
        .tab-warning-card {
          background: var(--ddd-theme-default-white);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-6);
          max-width: 400px;
          text-align: center;
        }
        .tab-warning-icon { font-size: 48px; margin-bottom: var(--ddd-spacing-3); }
        .tab-warning-title { font-size: var(--ddd-font-size-l); font-weight: 800; color: var(--ddd-theme-primary); margin-bottom: var(--ddd-spacing-2); }
        .tab-warning-text { font-size: var(--ddd-font-size-4xs); color: var(--ddd-theme-on-surface); margin-bottom: var(--ddd-spacing-4); }
        .tab-warning-close {
          padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
          background: var(--ddd-theme-polaris-primary);
          color: var(--ddd-theme-on-primary);
          border: none; border-radius: var(--ddd-radius-sm);
          font-weight: 700; cursor: pointer;
        }
      `,
      css`
        /* ===== DARK MODE (DDD-token swap, gated on body.dark-mode) ===== */
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
          --ddd-theme-default-surface: var(--dk-card);
          --ddd-theme-default-text: var(--dk-text);
          --ddd-theme-default-white: #1f2937;
          --ddd-theme-on-surface: var(--dk-text);
          --ddd-theme-on-primary: #f8fafc;
          --ddd-theme-primary: #c4b5fd;
          --ddd-theme-accent: #818cf8;
          --ddd-theme-secondary: var(--dk-text-soft);
          --ddd-theme-polaris-surface: var(--dk-card);
          --ddd-theme-polaris-border: var(--dk-border);
          --ddd-theme-polaris-surface-hover: var(--dk-soft);
          --ddd-theme-success: #6ee7b7;
          --ddd-theme-success-light: #064e3b;
          --ddd-theme-success-text: #6ee7b7;
          --ddd-theme-success-dark: #047857;
          --ddd-theme-warning: #fcd34d;
          --ddd-theme-warning-light: #78350f;
          --ddd-theme-warning-text: #fde68a;
          --ddd-theme-error: #fca5a5;
          --ddd-theme-error-dark: #7f1d1d;
          background: var(--dk-bg);
          color: var(--dk-text);
        }
        :host-context(body.dark-mode) .materi-card,
        :host-context(body.dark-mode) .selesai-card,
        :host-context(body.dark-mode) .skor-best {
          background: var(--dk-card);
          color: var(--dk-text);
          border-color: var(--dk-border);
        }
        :host-context(body.dark-mode) .materi-card h2,
        :host-context(body.dark-mode) .materi-card p,
        :host-context(body.dark-mode) .selesai-card .kirim { color: var(--dk-text); }
        :host-context(body.dark-mode) .auth-hint,
        :host-context(body.dark-mode) .selesai-card .kirim.warn { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .err-chip { background: #7f1d1d; color: #fecaca; border-color: #991b1b; }
        :host-context(body.dark-mode) .btn-mulai { background: #4f46e5; color: #f8fafc; }
        :host-context(body.dark-mode) .btn-mulai:hover { background: #6366f1; }
        :host-context(body.dark-mode) .tab-warning-card { background: var(--dk-card); color: var(--dk-text); }
        :host-context(body.dark-mode) .tab-warning-title { color: var(--dk-text-strong); }
        :host-context(body.dark-mode) .tab-warning-text { color: var(--dk-text); }
        :host-context(body.dark-mode) .tab-warning-close { background: #4f46e5; color: #f8fafc; }
        :host-context(body.dark-mode) .selesai-card.suspicious { border-color: #b45309; background: linear-gradient(180deg, rgba(180,83,9,0.1), transparent); }
        :host-context(body.dark-mode) .suspicious-warning { background: #431407; border-color: #7c2d12; }
        :host-context(body.dark-mode) .suspicious-title { color: #fed7aa; }
        :host-context(body.dark-mode) .suspicious-text { color: #fdba74; }
        :host-context(body.dark-mode) .suspicious-note { color: #d97706; }
        :host-context(body.dark-mode) .remidi-card { background: #431407; border-color: #7c2d12; }
        :host-context(body.dark-mode) .remidi-card h3 { color: #fed7aa; }
        :host-context(body.dark-mode) .remidi-card p { color: #fdba74; }
      `,
    ];
  }

  render() {
    const _canRemidiNow = this.remidiMode && !this.sudahRemidi && typeof this._bestSkor === "number" && this._bestSkor < this.kkm;
    const _remidiBypass = (this._needsRemidi || _canRemidiNow) && this.remidiMode && !this.sudahRemidi;
    if (this._terkunci && this.mode !== "guru") {
      if (_remidiBypass) {
        return html`
          <div class="wrap">
            <div class="selesai-card" role="alert">
              <div style="font-size:2.5rem">🔓</div>
              <p class="kirim">Kuis terkunci, tapi Anda bisa <b>remidi</b> karena nilai &lt; KKM.</p>
              ${this._bestSkor != null ? html`<div class="skor">Nilai terbaik: <strong>${this._bestSkor}%</strong> (KKM ${this.kkm}%)</div>` : nothing}
              <div class="remidi-card" style="margin-top:12px;">
                <h3>📝 Remidi Tersedia</h3>
                <p>Soal sama diacak via <code>shuffle-choices</code>. Klik untuk mulai remidi LM1.</p>
                <button class="btn-mulai" @click=${this._mulaiRemidi}>🔄 Mulai Remidi (Soal Sama Shuffle)</button>
              </div>
              <p style="font-size:12px; color:#64748B; margin-top:8px;">Atau hubungi guru untuk <b>Buka Kunci</b> penuh.</p>
            </div>
          </div>
        `;
      }
      return html`
        <div class="wrap">
          <div class="selesai-card" role="alert">
            <div style="font-size:2.5rem">🔒</div>
            <p class="kirim warn">Kuis terkunci. Hubungi guru untuk mengulang.</p>
            ${this._bestSkor != null
              ? html`<div class="skor">Nilai terbaik Anda: <strong>${this._bestSkor}%</strong></div>`
              : nothing}
            ${this.mode === "guru" ? html`<button class="btn-mulai" @click=${this._resetKunciGuru}>🔓 Buka Kunci (Guru)</button>` : html`<p style="font-size:12px; color:#64748B;">Guru bisa buka via <b>Dasbor Guru → Atur → 🔓 Buka Kunci</b> atau tombol di atas (mode guru).</p>`}
          </div>
        </div>
      `;
    }

    if (this._selesai) {
      // Check if suspicious (time manipulation detected)
      const sisaWaktu = this._bacaSisaWaktu();
      const isSuspicious = sisaWaktu > 60;
      return html`
        <div class="wrap">
          <div class="selesai-card ${isSuspicious ? "suspicious" : ""}" role="status">
            ${this._habisWaktu ? html`<div class="waktu">${this.pesanWaktuHabis}</div>` : nothing}
            ${isSuspicious
              ? html`<div class="suspicious-warning" role="alert">
                  <div class="suspicious-icon">⚠️</div>
                  <div class="suspicious-title">Perhatian: Terdeteksi Aktivitas Mencurigakan</div>
                  <div class="suspicious-text">Sistem mendeteksi waktu pengerjaan tidak sesuai dengan durasi yang diberikan. Nilai Anda tetap tercatat, namun guru akan mendapat notifikasi untuk verifikasi.</div>
                  <div class="suspicious-note">Jika ini adalah kesalahan (misal: browser di-background), hubungi guru untuk klarifikasi.</div>
                </div>`
              : nothing}
            ${this.studentId
              ? html`<div class="kirim">${this.pesanNilaiTerkirim}</div>`
              : html`<div class="kirim warn">⚠️ Nilai belum tersimpan karena belum login</div>`}
            ${this._skor != null ? html`<div class="skor">Skor Anda: <strong>${this._skor}%</strong></div>` : nothing}
            ${this.nilaiAkhir != null ? html`<div class="skor">Nilai Akhir: <strong>${this.nilaiAkhir}%</strong></div>` : nothing}
            ${this._needsRemidi && !this.sudahRemidi && this.remidiMode
              ? html`<div class="remidi-card">
                  <h3>📝 Remedi Diperlukan</h3>
                  <p>Nilai Anda belum mencapai KKM (${this.kkm}%). Silakan kerjakan remidi.</p>
                  <button class="btn-mulai" @click=${this._mulaiRemidi}>🔄 Mulai Remidi</button>
                </div>`
              : nothing}
            ${this.allowRetake && (this.maxRetake === 0 || this._attemptKe < this.maxRetake + 1)
              ? html`<button class="btn-mulai" @click=${this._ulangiKuis}>🔁 Ulangi Kuis</button>`
              : nothing}
            ${this.showSheetLink && this.spreadsheetUrl
              ? html`<a href="${this.spreadsheetUrl}" target="_blank" rel="noopener">📊 Buka Spreadsheet Nilai</a>`
              : nothing}
          </div>
        </div>
      `;
    }

    return html`
      <div class="wrap">
        <section class="materi-card">
          ${this.coverImage ? html`<img class="cover" src="${this.coverImage}" alt="Cover materi" />` : nothing}
          <h2>📖 ${this.judulMateri}</h2>
          <p>${this.teksMateri}</p>
          <div class="materi-links">
            ${this.materiUrl ? html`<a href="${this.materiUrl}" target="_blank" rel="noopener">${this.t.bacaMateri}</a>` : nothing}
            ${this.materiFile ? html`<a href="${this.materiFile}" target="_blank" rel="noopener" download>${this.t.unduhMateri}</a>` : nothing}
          </div>
          ${this._pernahIkut && this._bestSkor != null
            ? html`<p class="skor-best">⭐ Nilai terbaik Anda: <strong>${this._bestSkor}%</strong></p>`
            : nothing}
        </section>

        ${!this._mulai
          ? (this.studentId && (this.maxRetake === 0 || this._attemptKe < this.maxRetake + 1)
              ? html`<button class="btn-mulai" @click="${this._mulaiLatihan}">${this.labelMulai}</button>`
              : (document.querySelector("quiz-user-auth")
                  ? html`<p class="auth-hint">🔐 Silakan login lewat form di atas agar nilai tersimpan ke Spreadsheet.</p>`
                  : html`
                      <quiz-user-auth .appsScriptUrl="${this.appsScriptUrl}"></quiz-user-auth>
                      <p class="auth-hint">🔐 Silakan login dulu agar nilai tersimpan ke Spreadsheet.</p>
                    `))
          : html`
              ${this._pesan ? html`<p class="err-chip">${this._pesan}</p>` : nothing}
              <timer-kuis
                duration="${this.duration}"
                .remaining="${this._resumeRemaining}"
                ?hide-controls="${this.hidePauseRestart}"
                ?autostart="${this.timerAutostart}"
                @timer-kuis-expired="${this._onWaktuHabis}">
              </timer-kuis>
              ${this._tabSwitchWarning && this._mulai && !this._selesai
                ? html`<div class="tab-warning-overlay" role="alertdialog" aria-labelledby="tab-warning-title" aria-describedby="tab-warning-text">
                    <div class="tab-warning-card">
                      <div class="tab-warning-icon" aria-hidden="true">⚠️</div>
                      <div class="tab-warning-title" id="tab-warning-title">Fokus pada kuis</div>
                      <div class="tab-warning-text" id="tab-warning-text">Anda membuka tab lain atau aplikasi lain. Gunakan waktu untuk menjawab soal. <strong>Timer tetap berjalan.</strong></div>
                      <button class="tab-warning-close" id="tab-warning-close-btn" @click=${() => { this._tabSwitchWarning = false; this.requestUpdate(); }} autofocus>Saya Kembali</button>
                    </div>
                  </div>`
                : nothing}
              ${this._fullscreenWarning && this._mulai && !this._selesai
                ? html`<div class="tab-warning-overlay" role="alert">
                    <div class="tab-warning-card">
                      <div class="tab-warning-icon">🖥️</div>
                      <div class="tab-warning-title">Keluar dari Fullscreen</div>
                      <div class="tab-warning-text">Anda keluar dari mode fullscreen. Mohon kembali ke fullscreen untuk melanjutkan kuis.</div>
                      <button class="tab-warning-close" @click=${() => { 
                        this._fullscreenWarning = false; 
                        this._requestFullscreen();
                        this.requestUpdate(); 
                      }}>Kembali Fullscreen</button>
                    </div>
                  </div>`
                : nothing}

              <kuis-ledakan
                @dasbor-kuis-log="${this._onKuisLog}"
                .appsScriptUrl="${this.appsScriptUrl}"
                .judul="${this.judulKuis}"
                .questions="${this.questions}"
                .studentId="${this.studentId}"
                .studentName="${this.studentName}"
                .studentNis="${this.studentNis}"
                .studentAbsen="${this.studentAbsen}"
                .studentKelas="${this.studentKelas}"
                .kdMateri="${this.kdMateri}"
                .lockAfterComplete="${!this.allowRetake}"
                .mode="${this.mode}"
                .hidePauseRestart="${this.hidePauseRestart}"
                .shuffleQuestions="${this.shuffleQuestions}"
                .shuffleChoices="${this.shuffleChoices}"
                .kategori="${this.kategori}"
                .hideConfetti="${this.hideConfetti}"
                .hideAnswers="${this.hideAnswers}"
                .hideScore="${this.hideScore}"
                .showQuestionNav="${this.showQuestionNav}"
                .allowBackwardNav="${this.allowBackwardNav}"
                .practiceMode="${this.practiceMode}"
                .questionDelay="${this.questionDelay}"
                .reviewAnswers="${this.reviewAnswers}">
              </kuis-ledakan>
            `}
      </div>
    `;
  }

  static get haxProperties() {
    return {
      canScale: true,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Latihan Kuis Berwaktu",
        description: "Materi + kuis ledakan + timer; saat waktu habis, materi & kuis sembunyi dan tampil pesan nilai terkirim",
        icon: "icons:timer",
        color: "purple",
        tags: ["Education", "Quiz", "Timer", "Materi"],
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "URL Apps Script (kirim nilai)",
            inputMethod: "textfield",
            description: "Web App Google Apps Script untuk mengirim skor ke Spreadsheet",
          },
          {
            property: "spreadsheetUrl",
            title: "URL Spreadsheet Nilai (lihat)",
            inputMethod: "textfield",
            description: "Link Google Spreadsheet berisi rekap nilai siswa",
          },
          {
            property: "kdMateri",
            title: "Kode Materi (kd-materi)",
            inputMethod: "textfield",
            description: "Kode/topik kuis; diteruskan ke <kuis-ledakan> agar rekap per topik tersimpan.",
          },
          {
            property: "allowRetake",
            title: "Boleh Diulang (retake)",
            inputMethod: "boolean",
            description: "false = ulangan (terkunci setelah 1x), true = latihan (boleh ulang). Attribute hadir = true; tidak ada attribute = false (default).",
          },
          {
            property: "maxRetake",
            title: "Batas Ulang (max-retake)",
            inputMethod: "number",
            description: "Total attempt = 1 asli + maxRetake. Counter disimpan di localStorage per siswa+materi.",
          },
          {
            property: "mode",
            title: "Mode Tampilan",
            inputMethod: "select",
            description: "siswa (default) vs guru (lihat tombol buka kunci).",
            options: {
              siswa: "Siswa - Evaluasi Mandiri",
              guru: "Guru - Pantauan",
            },
          },
          {
            property: "hidePauseRestart",
            title: "Sembunyikan Tombol Timer",
            inputMethod: "boolean",
            description: "Menyembunyikan tombol jeda/mulai/ulang di timer dan tombol Ulangi di layar hasil. Default true.",
          },
          {
            property: "timerAutostart",
            title: "Timer Mulai Otomatis",
            inputMethod: "boolean",
            description: "true = timer langsung berjalan saat kuis dimulai. Default true.",
          },
          {
            property: "shuffleQuestions",
            title: "Acak Urutan Soal",
            inputMethod: "boolean",
            description: "Mengacak urutan soal setiap kali kuis dimulai.",
          },
          {
            property: "shuffleChoices",
            title: "Acak Pilihan Jawaban",
            inputMethod: "boolean",
            description: "Mengacak urutan pilihan jawaban setiap kali kuis dimulai.",
          },
          {
            property: "kategori",
            title: "Kategori Kuis",
            inputMethod: "select",
            description: "sumatif → skor masuk rapor (db_asesmen); formatif → progres saja, tidak masuk rapor (db_aktivitas).",
            options: {
              sumatif_lm: "Sumatif (Rapor LM)",
              formatif: "Formatif (Progres)",
            },
            default: "sumatif_lm",
          },
          {
            property: "hideConfetti",
            title: "Nonaktifkan Konfeti",
            inputMethod: "boolean",
            description: "Tidak menampilkan efek konfeti saat jawaban benar.",
          },
          {
            property: "hideAnswers",
            title: "Sembunyikan Jawaban",
            inputMethod: "boolean",
            description: "Tidak menampilkan jawaban benar/salah setelah menjawab.",
          },
          {
            property: "hideScore",
            title: "Sembunyikan Nilai",
            inputMethod: "boolean",
            description: "Menyembunyikan angka skor berjalan di layar soal dan lingkaran nilai akhir.",
          },
          {
            property: "showQuestionNav",
            title: "Tampilkan Navigasi Nomor Soal",
            inputMethod: "boolean",
            description: "Tampilkan tombol navigasi nomor soal di kuis.",
            default: true,
          },
          {
            property: "allowBackwardNav",
            title: "Izinkan Navigasi Mundur",
            inputMethod: "boolean",
            description: "true = siswa boleh melompat ke soal yang sudah dijawab. Default false (nav maju saja).",
            default: false,
          },
          {
            property: "practiceMode",
            title: "Mode Latihan",
            inputMethod: "boolean",
            description: "Aktifkan untuk mode latihan: tidak ada auto-advance, tombol Berikutnya/Kembali tersedia.",
            default: false,
          },
          {
            property: "questionDelay",
            title: "Jeda Soal (ms)",
            inputMethod: "number",
            description: "Jeda auto-advance antar soal (hanya berlaku mode kuis, bukan practice mode).",
            default: 1800,
          },
          {
            property: "reviewAnswers",
            title: "Tinjau Jawaban di Akhir",
            inputMethod: "boolean",
            description: "Tampilkan tombol 'Tinjau Jawaban' di layar hasil.",
            default: true,
          },
          {
            property: "duration",
            title: "Durasi Kuis (detik)",
            inputMethod: "number",
            description: "Lama waktu pengerjaan kuis sebelum dikunci otomatis",
            default: 300,
          },
          {
            property: "judulMateri",
            title: "Judul Materi",
            inputMethod: "textfield",
          },
          {
            property: "teksMateri",
            title: "Teks Materi",
            inputMethod: "textarea",
          },
          {
            property: "materiUrl",
            title: "URL Materi",
            inputMethod: "textfield",
          },
          {
            property: "materiFile",
            title: "File Materi",
            inputMethod: "haxupload",
          },
          {
            property: "coverImage",
            title: "Gambar Sampul Materi",
            inputMethod: "image",
          },
          {
            property: "judulKuis",
            title: "Judul Kuis",
            inputMethod: "textfield",
          },
          {
            property: "pesanWaktuHabis",
            title: "Pesan Waktu Habis",
            inputMethod: "textfield",
          },
          {
            property: "pesanNilaiTerkirim",
            title: "Pesan Nilai Terkirim",
            inputMethod: "textarea",
          },
          {
            property: "labelMulai",
            title: "Teks Tombol Mulai",
            inputMethod: "textfield",
            description: "Teks tombol untuk memulai latihan/kuis (default: '▶️ Mulai').",
          },
          {
            property: "showSheetLink",
            title: "Tampilkan Link Spreadsheet",
            inputMethod: "boolean",
            description: "Hanya untuk view aman/guru. Default OFF.",
          },
          {
            property: "questions",
            title: "Soal (JSON)",
            inputMethod: "code-editor",
            description: "Array soal AKM/PG. Format lama {q,a,b,c,k} didukung. Field opsional: {hint} — petunjuk muncul sebagai <details>.",
          },
          {
            property: "soalFileUrl",
            title: "Upload File Soal (JSON)",
            inputMethod: "haxupload",
            description: "File .json soal; otomatis di-parse & menimpa soal inline.",
          },
          {
            property: "kkm",
            title: "KKM (Kriteria Ketuntasan Minimal)",
            inputMethod: "number",
            description: "Nilai minimum untuk lulus. Default 75. Jika nilai < KKM, siswa harus remidi.",
            default: 75,
          },
          {
            property: "remidiMode",
            title: "Aktifkan Mode Remidi",
            inputMethod: "boolean",
            description: "Jika aktif, siswa dengan nilai < KKM bisa mengerjakan remidi dengan soal berbeda.",
          },
          {
            property: "remidiSoalUrl",
            title: "Upload File Soal Remidi (JSON)",
            inputMethod: "haxupload",
            description: "File .json soal remidi; digunakan jika siswa tidak mencapai KKM.",
          },
        ],
      },
      saveOptions: { unsetAttributes: [] },
    };
  }
}

globalThis.customElements.define(LatihanKuis.tag, LatihanKuis);
