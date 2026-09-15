import { LitElement, html, css, nothing } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

/**
 * `quiz-user-auth`
 *
 * Login / registrasi / verifikasi sesi siswa terhubung ke backend
 * lib/codev5.gs (action=register|login|verify dengan kontrak
 * `{status:"ok", data:{student_id,nis,nama,email,absen,kelas}}`).
 *
 * Sesi disimpan di localStorage (kunci `quiz_user_session`, TTL 24 jam) dan
 * dipancarkan lewat event global:
 *   - quiz-user-login            → dipakai <dasbor-kuis> dkk
 *   - quiz-user-logout
 *   - quiz-user-session-changed  → dipakai kuis-ledakan
 *
 * @element quiz-user-auth
 */
export class QuizUserAuth extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "quiz-user-auth";
  }

  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url", reflect: true },
      autoLogin: { type: Boolean, attribute: "auto-login", reflect: true },
      _screen: { state: true },
      _nama: { state: true },
      _email: { state: true },
      _nis: { state: true },
      _absen: { state: true },
      _kelas: { state: true },
      _studentId: { state: true },
      _errorMsg: { state: true },
      _successMsg: { state: true },
      _loading: { state: true },
      _verifyError: { state: true },
      _verifyMsg: { state: true },
    };
  }

  constructor() {
    super();
    this.basePath = new URL(".", import.meta.url).href;
    this.appsScriptUrl = "";
    this.autoLogin = true;
    this._screen = "check";
    this._nama = "";
    this._email = "";
    this._nis = "";
    this._absen = "";
    this._kelas = "";
    this._studentId = "";
    this._errorMsg = "";
    this._successMsg = "";
    this._loading = false;
    this._verifyError = false;
    this._verifyMsg = "";
    this._sessionInterval = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (
      globalThis.HaxStore &&
      typeof globalThis.HaxStore.requestAvailability === "function"
    ) {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[QuizUserAuth.tag]) {
        store.elementList[QuizUserAuth.tag] = QuizUserAuth.haxProperties;
      }
    }
    this.registerLocalization({
      context: this,
      localesPath: `${this.basePath}locales/`,
    });
    const saved = this._load("quiz_user_session");
    if (saved && saved.studentId) {
      this._studentId = saved.studentId;
      this._nama = saved.nama;
      this._email = saved.email || "";
      this._nis = saved.nis || "";
      this._absen = saved.absen || "";
      this._kelas = saved.kelas || "";
      this._screen = "logged-in";
      // I1: percayai sesi lokal, tapi jika absen kosong (kasus NIS 234 No 1) refresh dari backend
      if (this.autoLogin) this._dispatchLogin();
      this._startSessionWatch();
      if (!this._absen && this._nis) {
        // absen 234 no 1: sesi lama tanpa absen — verifikasi ulang untuk ambil Absen terbaru dari Users.Absen
        setTimeout(() => this._verifySession(), 300);
      }
    } else {
      this._screen = "login";
    }
  }

  disconnectedCallback() {
    if (this._sessionInterval) {
      clearInterval(this._sessionInterval);
      this._sessionInterval = null;
    }
    super.disconnectedCallback();
  }

  // ---------- Storage sederhana (TTL 24 jam) ----------
  _load(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data && data.expiresAt && Date.now() > data.expiresAt) {
        this._clear(key);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  _save(key, val) {
    try {
      const data = { ...val, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      // abaikan
    }
  }

  _clear(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // abaikan
    }
  }

  // ---------- API ----------
  async _api(action, params) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    const qs = new URLSearchParams(params);
    try {
      const res = await fetch(`${this.appsScriptUrl}?action=${action}&${qs.toString()}`, {
        redirect: "follow",
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Backend merespons HTTP ${res.status}.`);
      }
      const teks = await res.text();
      if (!teks || teks.trim().charAt(0) !== "{") {
        throw new Error("Respon backend bukan JSON. Periksa URL /exec & deployment.");
      }
      return JSON.parse(teks);
    } catch (e) {
      if (e && e.name === "AbortError") {
        throw new Error("Waktu habis (timeout 60 detik) menghubungi server.");
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  _ekstrakOk(payload) {
    // Terima kontrak codev5.gs {status:"ok", data:{...}} maupun legacy {status:"success", ...}.
    const ok = payload && (payload.status === "ok" || payload.status === "success");
    const d = (payload && payload.data) || payload || {};
    return {
      ok: !!ok,
      studentId: d.student_id || d.studentId || "",
      nis: d.nis || "",
      nama: d.nama || "",
      email: d.email || "",
      absen: d.absen || "",
      kelas: d.kelas || "",
      message: (payload && payload.message) || "",
    };
  }

  async _verifySession() {
    if (!this.appsScriptUrl) {
      // Bila URL belum dikonfigurasi, biarkan sesi lokal tetap login (jangan paksa logout).
      return;
    }
    this._loading = true;
    this._verifyError = false;
    this._verifyMsg = "";
    try {
      const payload = await this._api("verify", { studentId: this._studentId });
      const r = this._ekstrakOk(payload);
      if (r.ok) {
        this._nama = r.nama || this._nama;
        this._nis = r.nis || this._nis;
        this._absen = r.absen || this._absen;
        this._kelas = r.kelas || this._kelas;
        this._screen = "logged-in";
        this._mutasiProfilKunci();
        this._dispatchLogin();
      } else {
        // Sesi lokal tetap dianggap valid; cuma tandai gagal verifikasi (tidak destroy).
        this._verifyError = true;
        this._verifyMsg = r.message || "Sesi belum terverifikasi di server.";
      }
    } catch (e) {
      // Jaringan/404/down: JANGAN hapus sesi & JANGAN paksa login ("logout sendiri").
      this._verifyError = true;
      this._verifyMsg = "Tidak dapat memverifikasi sesi (offline?). Sesi lokal tetap aktif.";
    }
    this._loading = false;
  }

  async _handleLogin(e) {
    e.preventDefault();
    this._errorMsg = "";
    if (!this.appsScriptUrl) {
      this._errorMsg = "URL Apps Script belum dikonfigurasi.";
      return;
    }
    this._loading = true;
    try {
      const payload = await this._api("login", {
        nis: this._nis.trim(),
        email: this._email.trim().toLowerCase(),
      });
      const r = this._ekstrakOk(payload);
      if (r.ok && r.studentId) {
        this._studentId = r.studentId;
        this._nama = r.nama || this._nama;
        this._nis = r.nis || this._nis;
        this._absen = r.absen || this._absen;
        this._kelas = r.kelas || this._kelas;
        this._save("quiz_user_session", {
          studentId: this._studentId,
          nama: this._nama,
          email: this._email.trim().toLowerCase(),
          nis: this._nis,
          absen: this._absen,
          kelas: this._kelas,
        });
        this._mutasiProfilKunci();
        this._screen = "logged-in";
        this._dispatchLogin();
        this._startSessionWatch();
      } else {
        this._errorMsg = r.message || "Login gagal";
      }
    } catch (err) {
      this._errorMsg = err.message || "Gagal menghubungi server";
    }
    this._loading = false;
  }

  async _handleRegister(e) {
    e.preventDefault();
    this._errorMsg = "";
    this._successMsg = "";
    if (!this.appsScriptUrl) {
      this._errorMsg = "URL Apps Script belum dikonfigurasi.";
      return;
    }
    this._loading = true;
    try {
      const payload = await this._api("register", {
        nama: this._nama.trim(),
        email: this._email.trim().toLowerCase(),
        nis: this._nis.trim(),
        absen: this._absen.trim(),
        kelas: this._kelas.trim(),
      });
      const r = this._ekstrakOk(payload);
      if (r.ok) {
        this._successMsg = "Pendaftaran berhasil! Silakan masuk.";
        this._screen = "login";
      } else {
        this._errorMsg = r.message || "Gagal mendaftar";
      }
    } catch (err) {
      this._errorMsg = err.message || "Gagal menghubungi server.";
    }
    this._loading = false;
  }

  _startSessionWatch() {
    if (this._sessionInterval) clearInterval(this._sessionInterval);
    this._sessionInterval = setInterval(() => {
      const saved = this._load("quiz_user_session");
      if (!saved || !saved.studentId) {
        this._clear("quiz_user_session");
        this._studentId = "";
        this._screen = "login";
        globalThis.dispatchEvent(
          new CustomEvent("quiz-user-logout", { bubbles: true, composed: true }),
        );
        this._dispatchSessionChanged();
      }
    }, 60000);
  }

  _handleLogout() {
    if (this._sessionInterval) {
      clearInterval(this._sessionInterval);
      this._sessionInterval = null;
    }
    this._clear("quiz_user_session");
    this._clear("a3_v5_student_profile");
    this._studentId = "";
    this._nama = "";
    this._email = "";
    this._nis = "";
    this._absen = "";
    this._kelas = "";
    this._screen = "login";
    globalThis.dispatchEvent(
      new CustomEvent("quiz-user-logout", { bubbles: true, composed: true }),
    );
    this._dispatchSessionChanged();
  }

  _mutasiProfilKunci() {
    // Selaraskan kunci profil lawas yang dibaca <dasbor-kuis>.
    try {
      localStorage.setItem(
        "a3_v5_student_profile",
        JSON.stringify({
          student_id: this._studentId,
          nama: this._nama,
          kelas: this._kelas,
          nis: this._nis,
          absen: this._absen,
        }),
      );
    } catch (e) {
      // abaikan
    }
  }

  _dispatchLogin() {
    globalThis.dispatchEvent(
      new CustomEvent("quiz-user-login", {
        detail: {
          studentId: this._studentId,
          nama: this._nama,
          email: this._email,
          nis: this._nis,
          absen: this._absen,
          kelas: this._kelas,
        },
        bubbles: true,
        composed: true,
      }),
    );
    this._dispatchSessionChanged();
  }

  _dispatchSessionChanged() {
    const session = this._load("quiz_user_session");
    globalThis.dispatchEvent(
      new CustomEvent("quiz-user-session-changed", {
        detail: session,
        bubbles: true,
        composed: true,
      }),
    );
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          margin-bottom: var(--ddd-spacing-4);
          font-family: var(--ddd-font-primary, 'DM Sans', system-ui, sans-serif);
        }

        /* ===== Chalkboard-inspired design tokens ===== */
        .auth-card {
          background: linear-gradient(155deg, var(--ddd-theme-polaris-surface), var(--ddd-theme-default-surface));
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: 12px;
          padding: var(--ddd-spacing-6, 32px);
          max-width: 420px;
          margin: 0 auto;
          box-shadow: 0 24px 48px -16px rgba(26, 35, 50, 0.45), inset 0 1px 0 rgba(240, 192, 64, 0.08);
          position: relative;
          overflow: hidden;
          animation: auth-card-in 0.45s ease-out;
        }
        .auth-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--ddd-theme-warning), transparent);
          opacity: 0.7;
        }
        h2 {
          color: var(--ddd-theme-default-text);
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-l, 26px);
          margin: 0 0 var(--ddd-spacing-2, 8px) 0;
          text-align: center;
          font-weight: 600;
        }
        h2 .auth-icon {
          display: inline-block;
          margin-right: 8px;
          color: var(--ddd-theme-warning);
          font-size: 1.25em;
          vertical-align: -0.12em;
        }
        .subtitle {
          color: var(--ddd-theme-secondary);
          font-size: var(--ddd-font-size-4xs, 14px);
          text-align: center;
          margin-bottom: var(--ddd-spacing-4, 20px);
          line-height: 1.6;
        }
        .field {
          margin-bottom: var(--ddd-spacing-3, 14px);
        }
        .field-row {
          display: flex;
          gap: var(--ddd-spacing-3, 12px);
        }
        .field-row .field {
          flex: 1;
        }
        .field label {
          display: block;
          font-size: var(--ddd-font-size-4xs, 13px);
          font-weight: 600;
          color: var(--ddd-theme-secondary, rgba(255,255,255,0.75));
          margin-bottom: 6px;
        }
        .field input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--ddd-theme-input-border);
          border-radius: 6px;
          font-size: 15px;
          font-family: var(--ddd-font-primary);
          box-sizing: border-box;
          background: rgba(255,255,255,0.06);
          color: var(--ddd-theme-default-text);
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .field input::placeholder {
          color: rgba(255,255,255,0.3);
        }
        .field input:focus {
          outline: none;
          border-color: var(--ddd-theme-warning);
          background: rgba(255,255,255,0.09);
          box-shadow: 0 0 0 3px rgba(240, 192, 64, 0.12);
        }
        .btn {
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--ddd-font-primary);
          margin-top: var(--ddd-spacing-2, 8px);
          background: linear-gradient(120deg, var(--ddd-theme-warning), var(--ddd-theme-accent));
          color: var(--ddd-theme-on-primary);
          transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
          box-shadow: 0 8px 20px -6px rgba(240, 192, 64, 0.4);
        }
        .btn:hover {
          filter: brightness(1.06);
          transform: translateY(-1px);
          box-shadow: 0 12px 24px -6px rgba(240, 192, 64, 0.5);
        }
        .btn:active {
          transform: translateY(0);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .btn-link {
          background: none;
          border: none;
          color: var(--ddd-theme-warning);
          font-size: var(--ddd-font-size-4xs, 14px);
          text-decoration: none;
          margin-top: var(--ddd-spacing-3, 12px);
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: color 0.2s;
        }
        .btn-link:hover {
          color: #f5d060;
        }
        .msg {
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: var(--ddd-spacing-3, 12px);
          line-height: 1.5;
        }
        .msg-error {
          background: rgba(239, 68, 68, 0.12);
          color: var(--ddd-theme-error);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-left: 3px solid var(--ddd-theme-error);
        }
        .msg-success {
          background: rgba(34, 197, 94, 0.12);
          color: var(--ddd-theme-success);
          border: 1px solid rgba(34, 197, 94, 0.25);
          border-left: 3px solid var(--ddd-theme-success);
        }
        .user-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--ddd-spacing-3, 12px);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: var(--ddd-spacing-4, 16px);
          max-width: 420px;
          margin: 0 auto;
          box-shadow: 0 8px 20px -8px rgba(26, 35, 50, 0.4);
          animation: auth-card-in 0.45s ease-out;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-3, 12px);
          min-width: 0;
        }
        .avatar {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          border-radius: 50%;
          background: linear-gradient(120deg, var(--ddd-theme-warning), var(--ddd-theme-accent));
          color: var(--ddd-theme-on-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          box-shadow: 0 4px 12px -2px rgba(240, 192, 64, 0.4);
        }
        .user-name {
          font-weight: 600;
          font-size: var(--ddd-font-size-4xs, 15px);
          color: var(--ddd-theme-default-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .user-email {
          font-size: var(--ddd-font-size-4xs, 13px);
          color: var(--ddd-theme-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .user-meta {
          font-size: var(--ddd-font-size-4xs, 12px);
          color: var(--ddd-theme-secondary);
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .logout-btn {
          padding: 10px 16px;
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: var(--ddd-theme-error);
          background: transparent;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          font-family: var(--ddd-font-primary);
          transition: background 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.12);
          color: #fca5a5;
        }
        .user-actions {
          display: flex;
          flex-direction: column;
          gap: var(--ddd-spacing-2, 8px);
          align-items: flex-end;
        }
        .check-btn {
          padding: 10px 16px;
          border: 1px solid rgba(240, 192, 64, 0.4);
          color: var(--ddd-theme-warning);
          background: transparent;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          font-family: var(--ddd-font-primary);
          transition: background 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .check-btn:hover {
          background: rgba(240, 192, 64, 0.12);
          color: #f5d060;
        }
        .verify-note {
          margin-top: 8px;
          font-size: var(--ddd-font-size-4xs, 12px);
          color: var(--ddd-theme-warning);
          line-height: 1.4;
        }
        .loading {
          text-align: center;
          padding: var(--ddd-spacing-8, 32px);
          color: var(--ddd-theme-warning);
          font-size: 15px;
        }
        .loading::before {
          content: '';
          display: inline-block;
          width: 14px;
          height: 14px;
          margin-right: 8px;
          border: 2px solid rgba(240, 192, 64, 0.3);
          border-top-color: var(--ddd-theme-warning);
          border-radius: 50%;
          vertical-align: -2px;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes auth-card-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `,
      css`
        /* ===== DARK MODE (token swap, gated on body.dark-mode) ===== */
        :host-context(body.dark-mode) :host {
          --ddd-theme-card: #111827;
          --ddd-theme-card-deep: #0b1020;
          --ddd-theme-card-border: rgba(132, 136, 248, 0.25);
          --ddd-theme-default-text: #e5e7eb;
          --ddd-theme-secondary: rgba(229, 231, 235, 0.65);
          --ddd-theme-on-primary: #0b1020;
          --ddd-theme-input-border: rgba(229, 231, 235, 0.15);
          --ddd-theme-primary: #c4b5fd;
          --ddd-theme-accent: #818cf8;
          --ddd-theme-warning: #fcd34d;
          --ddd-theme-warning-text: #fde68a;
          background: var(--dk-bg, #0b1020);
          color: var(--dk-text, #e5e7eb);
        }
        :host-context(body.dark-mode) .auth-card {
          background: linear-gradient(155deg, #1f2937, #111827);
          border-color: rgba(132, 136, 248, 0.25);
        }
        :host-context(body.dark-mode) .field input {
          background: rgba(255,255,255,0.05);
          border-color: rgba(229, 231, 235, 0.15);
          color: #e5e7eb;
        }
        :host-context(body.dark-mode) .field input::placeholder {
          color: rgba(229, 231, 235, 0.25);
        }
        :host-context(body.dark-mode) .field input:focus {
          border-color: #c4b5fd;
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 3px rgba(196, 181, 253, 0.15);
        }
        :host-context(body.dark-mode) .btn {
          background: linear-gradient(120deg, #c4b5fd, #818cf8);
          color: #0b1020;
          box-shadow: 0 8px 20px -6px rgba(129, 140, 248, 0.4);
        }
        :host-context(body.dark-mode) .btn:hover {
          filter: brightness(1.06);
          box-shadow: 0 12px 24px -6px rgba(129, 140, 248, 0.5);
        }
        :host-context(body.dark-mode) .btn-link {
          color: #c4b5fd;
        }
        :host-context(body.dark-mode) .btn-link:hover {
          color: #ddd6fe;
        }
        :host-context(body.dark-mode) .msg-error {
          background: rgba(239, 68, 68, 0.12);
          color: #fca5a5;
          border-left-color: #ef4444;
        }
        :host-context(body.dark-mode) .msg-success {
          background: rgba(34, 197, 94, 0.12);
          color: #86efac;
          border-left-color: #22c55e;
        }
        :host-context(body.dark-mode) .user-bar {
          background: rgba(255,255,255,0.05);
          border-color: rgba(229, 231, 235, 0.12);
        }
        :host-context(body.dark-mode) .user-name {
          color: #e5e7eb;
        }
        :host-context(body.dark-mode) .user-email,
        :host-context(body.dark-mode) .user-meta {
          color: rgba(229, 231, 235, 0.55);
        }
        :host-context(body.dark-mode) .avatar {
          background: linear-gradient(120deg, #c4b5fd, #818cf8);
          color: #0b1020;
        }
        :host-context(body.dark-mode) .logout-btn {
          border-color: rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }
        :host-context(body.dark-mode) .logout-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #fecaca;
        }
        :host-context(body.dark-mode) .check-btn {
          border-color: rgba(196, 181, 253, 0.4);
          color: #c4b5fd;
        }
        :host-context(body.dark-mode) .check-btn:hover {
          background: rgba(196, 181, 253, 0.12);
          color: #ddd6fe;
        }
        :host-context(body.dark-mode) .verify-note {
          color: #fcd34d;
        }
        :host-context(body.dark-mode) .loading {
          color: #c4b5fd;
        }
      `,
    ];
  }

  render() {
    if (this._loading && this._screen === "check") {
      return html`
        <div class="loading">
          <span class="spinner" aria-hidden="true"></span>
          <span>Memverifikasi sesi...</span>
        </div>
      `;
    }

    if (this._screen === "logged-in") {
      const initial = this._nama ? this._nama.charAt(0).toUpperCase() : "?";
      return html`
        <div class="user-bar">
          <div class="user-info">
            <div class="avatar" aria-hidden="true">${initial}</div>
            <div class="user-details">
              <div class="user-name">${this._nama}</div>
              <div class="user-email">${this._email}</div>
              <div class="user-meta">NIS: ${this._nis} | Absen: ${this._absen} | Kelas: ${this._kelas}</div>
              ${this._verifyError
                ? html`<div class="verify-note">${this._verifyMsg}</div>`
                : nothing}
            </div>
          </div>
          <div class="user-actions">
            <button class="check-btn" @click=${this._verifySession} ?disabled=${this._loading}>
              ${this._loading ? "⏳" : "Cek sesi"}
            </button>
            <button class="logout-btn" @click=${this._handleLogout}>Keluar</button>
          </div>
        </div>
      `;
    }

    const isRegister = this._screen === "register";
    return html`
      <div class="auth-card">
        <div class="auth-header">
          <h2>${isRegister ? "Daftar" : "Masuk"}</h2>
          <p class="subtitle">
            ${isRegister
              ? "Buat akun untuk menyimpan hasil kuis & aktivitas"
              : "Masuk dengan identitas yang sudah terdaftar"}
          </p>
        </div>

        ${this._errorMsg ? html`<div class="msg msg-error">${this._errorMsg}</div>` : nothing}
        ${this._successMsg ? html`<div class="msg msg-success">${this._successMsg}</div>` : nothing}

        ${isRegister
          ? html`
              <form @submit=${this._handleRegister}>
                <div class="field">
                  <label>NIS</label>
                  <input type="text" .value=${this._nis} @input=${(e) => (this._nis = e.target.value)} placeholder="Contoh: 12345" required />
                </div>
                <div class="field">
                  <label>Nama Lengkap</label>
                  <input type="text" .value=${this._nama} @input=${(e) => (this._nama = e.target.value)} placeholder="Contoh: Ahmad Wahyudi" required minlength="3" />
                </div>
                <div class="field">
                  <label>Email</label>
                  <input type="email" .value=${this._email} @input=${(e) => (this._email = e.target.value)} placeholder="contoh@email.com" required />
                </div>
                <div class="field-row">
                  <div class="field">
                    <label>Nomor Absen</label>
                    <input type="text" .value=${this._absen} @input=${(e) => (this._absen = e.target.value)} placeholder="1" required />
                  </div>
                  <div class="field">
                    <label>Kelas</label>
                    <input type="text" .value=${this._kelas} @input=${(e) => (this._kelas = e.target.value)} placeholder="XI-1" required />
                  </div>
                </div>
                <button class="btn" type="submit" ?disabled=${this._loading}>
                  ${this._loading ? "⏳ Mendaftar..." : "Daftar"}
                </button>
              </form>
              <button class="btn-link" @click=${() => { this._screen = "login"; this._errorMsg = ""; this._successMsg = ""; }}>
                Sudah punya akun? Masuk
              </button>
            `
          : html`
              <form @submit=${this._handleLogin}>
                <div class="field">
                  <label>NIS</label>
                  <input type="text" .value=${this._nis} @input=${(e) => (this._nis = e.target.value)} placeholder="Contoh: 12345" required />
                </div>
                <div class="field">
                  <label>Email</label>
                  <input type="email" .value=${this._email} @input=${(e) => (this._email = e.target.value)} placeholder="contoh@email.com" required />
                </div>
                <button class="btn" type="submit" ?disabled=${this._loading}>
                  ${this._loading ? "⏳ Masuk..." : "Masuk"}
                </button>
              </form>
              <button class="btn-link" @click=${() => { this._screen = "register"; this._errorMsg = ""; this._successMsg = ""; }}>
                Belum punya akun? Daftar
              </button>
            `}
      </div>
    `;
  }

  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Quiz User Auth",
        description: "Sistem login/registrasi siswa untuk dasbor-kuis",
        icon: "icons:account-circle",
        color: "purple",
        tags: ["Education", "Auth"],
      },
      settings: {
        configure: [
          {
            property: "appsScriptUrl",
            title: "Apps Script URL",
            inputMethod: "textfield",
            required: true,
          },
        ],
        advanced: [],
        developer: [],
      },
      saveOptions: {
        unsetAttributes: [
          "_screen",
          "_nama",
          "_email",
          "_nis",
          "_absen",
          "_kelas",
          "_studentId",
          "_errorMsg",
          "_successMsg",
          "_loading",
        ],
      },
    };
  }
}

globalThis.customElements.define(QuizUserAuth.tag, QuizUserAuth);
