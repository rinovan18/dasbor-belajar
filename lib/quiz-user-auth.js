import { LitElement, html, css } from "lit";
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
    const saved = this._load("quiz_user_session");
    if (saved && saved.studentId) {
      this._studentId = saved.studentId;
      this._nama = saved.nama;
      this._email = saved.email || "";
      this._nis = saved.nis || "";
      this._absen = saved.absen || "";
      this._kelas = saved.kelas || "";
      this._screen = "logged-in";
      // I1: percayai sesi lokal (sudah tervalidasi saat login, TTL 24j) — tidak ada
      // verify-on-load yang memicu eksekusi GAS tiap load. Siarkan sesi ke elemen lain.
      if (this.autoLogin) this._dispatchLogin();
      this._startSessionWatch();
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
    const timer = setTimeout(() => controller.abort(), 10000);
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
        throw new Error("Waktu habis (timeout 10 detik) menghubungi server.");
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
        }
        .auth-card {
          background: var(--ddd-theme-default-white, #ffffff);
          border: var(--ddd-border-xs, 1px solid #e2e8f0);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-6);
          max-width: 420px;
          margin: 0 auto;
          box-shadow: var(--ddd-boxShadow-sm, 0 1px 3px rgba(0,0,0,.12));
        }
        h2 {
          color: var(--ddd-theme-default-text);
          font-size: var(--ddd-font-size-l);
          margin: 0 0 var(--ddd-spacing-2) 0;
          text-align: center;
        }
        .subtitle {
          color: var(--ddd-theme-secondary);
          font-size: var(--ddd-font-size-4xs);
          text-align: center;
          margin-bottom: var(--ddd-spacing-4);
        }
        .field {
          margin-bottom: var(--ddd-spacing-3);
        }
        .field-row {
          display: flex;
          gap: var(--ddd-spacing-3);
        }
        .field-row .field {
          flex: 1;
        }
        .field label {
          display: block;
          font-size: var(--ddd-font-size-4xs);
          font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-secondary);
          margin-bottom: var(--ddd-spacing-1);
        }
        .field input {
          width: 100%;
          padding: var(--ddd-spacing-3);
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-4xs);
          font-family: var(--ddd-font-primary);
          box-sizing: border-box;
        }
        .field input:focus {
          outline: none;
          border-color: var(--ddd-theme-primary);
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .btn {
          width: 100%;
          padding: var(--ddd-spacing-3);
          border: none;
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-4xs);
          font-weight: var(--ddd-font-weight-bold);
          cursor: pointer;
          font-family: var(--ddd-font-primary);
          margin-top: var(--ddd-spacing-2);
          background: linear-gradient(120deg, var(--ddd-theme-primary, #4f46e5), var(--ddd-theme-accent, #6d28d9));
          color: var(--ddd-theme-default-white, #ffffff);
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .btn:hover {
          filter: brightness(1.08);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-link {
          background: none;
          border: none;
          color: var(--ddd-theme-primary, #4f46e5);
          font-size: var(--ddd-font-size-4xs);
          text-decoration: underline;
          margin-top: var(--ddd-spacing-3);
          font-weight: var(--ddd-font-weight-bold);
          cursor: pointer;
          width: 100%;
        }
        .msg {
          padding: var(--ddd-spacing-3);
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-4xs);
          margin-bottom: var(--ddd-spacing-3);
        }
        .msg-error {
          background: var(--ddd-theme-error-light);
          color: var(--ddd-theme-error-text);
          border: var(--ddd-border-xs);
        }
        .msg-success {
          background: var(--ddd-theme-success-light);
          color: var(--ddd-theme-success-text);
          border: var(--ddd-border-xs);
        }
        .user-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--ddd-theme-polaris-surface-hover);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-4);
          border: var(--ddd-border-xs);
          max-width: 420px;
          margin: 0 auto;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-3);
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--ddd-radius-circle);
          background: linear-gradient(120deg, var(--ddd-theme-primary, #4f46e5), var(--ddd-theme-accent, #6d28d9));
          color: var(--ddd-theme-default-white, #ffffff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: var(--ddd-font-weight-black);
          font-size: var(--ddd-font-size-3xs);
        }
        .user-name {
          font-weight: var(--ddd-font-weight-bold);
          font-size: var(--ddd-font-size-4xs);
        }
        .user-email {
          font-size: var(--ddd-font-size-4xs);
          color: var(--ddd-theme-secondary);
        }
        .user-meta {
          font-size: var(--ddd-font-size-4xs);
          color: var(--ddd-theme-secondary);
          margin-top: var(--ddd-spacing-1);
        }
        .logout-btn {
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          border: var(--ddd-border-xs);
          color: var(--ddd-theme-error);
          background: none;
          border-radius: var(--ddd-radius-sm);
          font-size: var(--ddd-font-size-4xs);
          cursor: pointer;
          font-family: var(--ddd-font-primary);
        }
        .logout-btn:hover {
          background: var(--ddd-theme-error);
          color: var(--ddd-theme-default-white);
        }
        .user-actions {
          display: flex;
          flex-direction: column;
          gap: var(--ddd-spacing-2);
          align-items: flex-end;
        }
        .check-btn {
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          border: var(--ddd-border-xs);
          color: var(--ddd-theme-primary, #4f46e5);
          background: none;
          border-radius: var(--ddd-radius-sm);
          font-size: var(--ddd-font-size-4xs);
          cursor: pointer;
          font-family: var(--ddd-font-primary);
        }
        .check-btn:hover {
          background: var(--ddd-theme-primary, #4f46e5);
          color: var(--ddd-theme-default-white, #ffffff);
        }
        .verify-note {
          margin-top: var(--ddd-spacing-1);
          font-size: var(--ddd-font-size-4xs);
          color: var(--ddd-theme-warning, #b45309);
        }
        .loading {
          text-align: center;
          padding: var(--ddd-spacing-8);
          color: var(--ddd-theme-primary);
        }
      `,
      css`
        /* ===== DARK MODE (DDD-token swap, gated on body.dark-mode) ===== */
        :host-context(body.dark-mode) :host {
          --dk-bg: #0b1020;
          --dk-card: #111827;
          --dk-soft: #1f2937;
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
          --ddd-theme-on-primary: #f8fafc;
          --ddd-theme-primary: #c4b5fd;
          --ddd-theme-accent: #818cf8;
          --ddd-theme-secondary: var(--dk-text-soft);
          --ddd-theme-polaris-surface: var(--dk-card);
          --ddd-theme-polaris-border: var(--dk-border);
          --ddd-theme-warning: #fcd34d;
          --ddd-theme-warning-text: #fde68a;
          background: var(--dk-bg);
          color: var(--dk-text);
        }
        :host-context(body.dark-mode) .auth-card {
          background: var(--dk-card);
          color: var(--dk-text);
          border-color: var(--dk-border);
        }
        :host-context(body.dark-mode) .form-input {
          background: var(--dk-soft);
          color: var(--dk-text);
          border-color: var(--dk-border);
        }
        :host-context(body.dark-mode) .btn-primary {
          background: linear-gradient(120deg, #4f46e5, #6366f1);
          color: #f8fafc;
        }
        :host-context(body.dark-mode) .error-msg {
          background: #7f1d1d;
          color: #fecaca;
          border-color: #991b1b;
        }
        :host-context(body.dark-mode) .success-msg {
          background: #064e3b;
          color: #6ee7b7;
          border-color: #047857;
        }
      `,
    ];
  }

  render() {
    if (this._loading && this._screen === "check") {
      return html`<div class="loading">⏳ Memverifikasi sesi...</div>`;
    }

    if (this._screen === "logged-in") {
      const initial = this._nama ? this._nama.charAt(0).toUpperCase() : "?";
      return html`
        <div class="user-bar">
          <div class="user-info">
            <div class="avatar">${initial}</div>
            <div>
              <div class="user-name">${this._nama}</div>
              <div class="user-email">${this._email}</div>
              <div class="user-meta">NIS: ${this._nis} | Absen: ${this._absen} | Kelas: ${this._kelas}</div>
              ${this._verifyError
                ? html`<div class="verify-note">${this._verifyMsg}</div>`
                : ""}
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

    return html`
      <div class="auth-card">
        <h2>🔐 ${this._screen === "register" ? "Daftar" : "Masuk"}</h2>
        <p class="subtitle">
          ${this._screen === "register"
            ? "Buat akun untuk menyimpan hasil kuis & aktivitas"
            : "Masuk dengan identitas yang sudah terdaftar"}
        </p>

        ${this._errorMsg ? html`<div class="msg msg-error">${this._errorMsg}</div>` : ""}
        ${this._successMsg ? html`<div class="msg msg-success">${this._successMsg}</div>` : ""}

        ${this._screen === "register"
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