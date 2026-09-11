import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { LitElement, html, css } from "lit";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

/**
 * `kirim-tugas`
 *
 * 🎯 Halaman contoh pengumpulan tugas mandiri (adaptasi <assignment-component>
 * dari quiz-dashboard-lite2). Kirim ke `forumApiUrl` dengan action
 * `saveAssignment` + `kdMateri` (nilai dari `sheetName`). Status tersimpan
 * per kdMateri di localStorage (`hax_assignment_{kdMateri}`) sehingga siswa
 * yang sudah menyerahkan tetap melihat kartu terkunci saat di-refresh.
 *
 * Setiap submit juga memancarkan event `dasbor-kuis-log` (tipe `assignment`)
 * agar <dasbor-kuis> mengantrekan aktivitas ke app script utama
 * (action=logActivity, idempoten per id_log) — kontribusi ke rekap
 * "assignment" di Rangkuman.
 *
 * @element kirim-tugas
 */
export class KirimTugas extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "kirim-tugas";
  }

  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url", reflect: true },
      forumApiUrl: { type: String, attribute: "forum-api-url", reflect: true },
      sheetName: { type: String, attribute: "sheet-name", reflect: true },
      studentId: { type: String, attribute: "student-id", reflect: true },
      studentName: { type: String, attribute: "student-name", reflect: true },
      studentNis: { type: String, attribute: "student-nis", reflect: true },
      studentAbsen: { type: String, attribute: "student-absen", reflect: true },
      studentKelas: { type: String, attribute: "student-kelas", reflect: true },
      assignmentTitle: { type: String, attribute: "assignment-title", reflect: true },
      assignmentInstruction: {
        type: String,
        attribute: "assignment-instruction",
        reflect: true,
      },
      hideDelete: { type: Boolean, attribute: "hide-delete", reflect: true },
      _assignmentText: { state: true },
      _assignmentLink: { state: true },
      _assignmentSubmitted: { state: true },
      _submitting: { state: true },
      _toastMsg: { state: true },
    };
  }

  static get haxProperties() {
    return {
      canScale: false,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Kirim Tugas",
        description: "Halaman pengumpulan tugas mandiri terpisah (adaptasi assignment-component)",
        icon: "icons:assignment-turned-in",
        color: "blue",
        tags: ["Education", "Assignment"],
      },
      settings: {
        configure: [
          { property: "appsScriptUrl", title: "Apps Script URL (Activity)", inputMethod: "textfield" },
          { property: "forumApiUrl", title: "Forum API URL (Tugas)", inputMethod: "textfield" },
          { property: "sheetName", title: "Nama Sheet / Pertemuan", inputMethod: "textfield", default: "Pertemuan" },
          { property: "assignmentTitle", title: "Judul Tugas", inputMethod: "textfield", default: "Tugas Mandiri" },
          { property: "assignmentInstruction", title: "Instruksi Tugas", inputMethod: "textfield", default: "Tuliskan refleksi atau jawaban tugas Anda." },
          { property: "hideDelete", title: "Sembunyikan Hapus", inputMethod: "boolean" },
        ],
        advanced: [],
        developer: [],
      },
      saveOptions: { unsetAttributes: [] },
    };
  }

  constructor() {
    super();
    this.appsScriptUrl = "";
    this.forumApiUrl = "";
    this.sheetName = "Pertemuan";
    this.studentId = "";
    this.studentName = "";
    this.studentNis = "";
    this.studentAbsen = "";
    this.studentKelas = "";
    this.assignmentTitle = "Tugas Mandiri";
    this.assignmentInstruction = "Tuliskan refleksi atau jawaban tugas Anda.";
    this.hideDelete = false;
    this._assignmentText = "";
    this._assignmentLink = "";
    this._assignmentSubmitted = false;
    this._submitting = false;
    this._toastMsg = "";

    this.t = {
      ...this.t,
      submissionTitle: "Pengumpulan Tugas",
      submitBtn: "Kirim & Kunci Tugas",
      submitting: "Mengirim...",
      submitted: "Tugas Diserahkan & Tersimpan ke Google Sheets",
      pending: "Belum Menyerahkan",
      resetBtn: "Ubah",
      placeholderTask: "Tulis jawaban tugas Anda di sini...",
      placeholderLink: "Link Google Drive / Google Doc (opsional)",
      invalidLink: "Format link tidak valid. Gunakan URL Google Drive/Doc.",
      emptyTask: "Isi tugas atau link Google Drive terlebih dahulu!",
      activityAssignment: "Tugas dikumpulkan",
      backendError: "Gagal tersimpan ke sheet. Perbarui deployment Apps Script (New version).",
      loginHint: "Login dulu untuk memastikan tugas tercatat atas nama Anda.",
    };
  }

  get kdMateri() {
    return this.sheetName || "Pertemuan";
  }

  connectedCallback() {
    super.connectedCallback();
    if (
      globalThis.HaxStore &&
      typeof globalThis.HaxStore.requestAvailability === "function"
    ) {
      const store = globalThis.HaxStore.requestAvailability();
      if (store && !store.elementList[KirimTugas.tag]) {
        store.elementList[KirimTugas.tag] = KirimTugas.haxProperties;
      }
    }
    this._loadFromStorage();
    this._listenSession();
    this._onLogoutBound = this._onLogout.bind(this);
    globalThis.addEventListener("quiz-user-logout", this._onLogoutBound);
  }

  disconnectedCallback() {
    globalThis.removeEventListener("quiz-user-session-changed", this._handleSessionChanged);
    globalThis.removeEventListener("quiz-user-logout", this._onLogoutBound);
    super.disconnectedCallback();
  }

  _onLogout() {
    this.studentId = "";
    this.studentName = "";
    this.studentNis = "";
    this.studentAbsen = "";
    this.studentKelas = "";
  }

  _listenSession() {
    this._handleSessionChanged = this._handleSessionChanged.bind(this);
    globalThis.addEventListener("quiz-user-session-changed", this._handleSessionChanged);
    this._handleSessionChanged({ detail: this._loadSession() });
  }

  _loadSession() {
    try {
      const data = JSON.parse(localStorage.getItem("quiz_user_session"));
      if (data?.expiresAt && Date.now() > data.expiresAt) {
        localStorage.removeItem("quiz_user_session");
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  _handleSessionChanged(e) {
    const session = e?.detail || this._loadSession();
    if (session?.studentId) {
      this.studentId = session.studentId;
      this.studentName = session.nama;
      this.studentNis = session.nis || "";
      this.studentAbsen = session.absen || "";
      this.studentKelas = session.kelas || "";
    } else {
      this.studentId = "";
      this.studentName = "";
      this.studentNis = "";
      this.studentAbsen = "";
      this.studentKelas = "";
    }
  }

  _storageKey() {
    return `hax_assignment_${this.kdMateri}`;
  }

  _loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem(this._storageKey()));
      if (data) {
        this._assignmentSubmitted = data.submitted === true;
        this._assignmentText = data.text || "";
        this._assignmentLink = data.link || "";
      }
    } catch {
      // abaikan
    }
  }

  _saveToStorage() {
    try {
      localStorage.setItem(
        this._storageKey(),
        JSON.stringify({
          submitted: this._assignmentSubmitted,
          text: this._assignmentText,
          link: this._assignmentLink,
        }),
      );
    } catch {
      // abaikan
    }
  }

  _isValidUrl(str) {
    try {
      const u = new URL(str);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  async _submitAssignment() {
    if (this._submitting) return;
    const text = this._assignmentText.trim();
    if (!text && !this._assignmentLink) {
      globalThis.alert(this.t.emptyTask);
      return;
    }
    if (this._assignmentLink && !this._isValidUrl(this._assignmentLink)) {
      globalThis.alert(this.t.invalidLink);
      return;
    }
    this._submitting = true;
    const url = this.forumApiUrl || this.appsScriptUrl;
    if (url && this.studentId) {
      const params = new URLSearchParams({
        action: "saveAssignment",
        studentId: this.studentId,
        name: this.studentName,
        sheet: this.sheetName,
        title: this.assignmentTitle,
        content: text,
        link: this._assignmentLink,
        kdMateri: this.kdMateri,
        nis: this.studentNis || "",
        absen: this.studentAbsen || "",
        kelas: this.studentKelas || "",
      });
      try {
        const res = await fetch(`${url}?${params.toString()}`, { redirect: "follow" });
        const result = await res.json().catch(() => null);
        if (result && result.status === "error") {
          console.error("[kirim-tugas] Backend menolak:", result.message);
          this._submitting = false;
          this._showToast(`⚠️ ${this.t.backendError}`);
          return;
        }
        if (result && result.status !== "ok") {
          console.error("[kirim-tugas] Respons tak dikenal:", result);
        }
      } catch (err) {
        console.error("[kirim-tugas] Gagal mengirim tugas:", err);
        this._submitting = false;
        this._showToast(`⚠️ ${this.t.backendError}`);
        return;
      }
    }
    this._assignmentSubmitted = true;
    this._submitting = false;
    this._saveToStorage();
    this._showToast(`✓ ${this.t.activityAssignment}`);
    this._dispatchActivity("assignment", `Tugas: ${this.assignmentTitle}`);
  }

  _resetAssignment() {
    this._assignmentSubmitted = false;
    this._assignmentText = "";
    this._assignmentLink = "";
    this._saveToStorage();
  }

  _dispatchActivity(type, description) {
    const idLog = this._buatIdLog();
    this.dispatchEvent(
      new CustomEvent("dasbor-kuis-log", {
        detail: {
          id_log: idLog,
          tipe: type,
          payload: {
            deskripsi: description,
            judul: this.assignmentTitle,
            timestamp: new Date().toISOString(),
          },
        },
        bubbles: true,
        composed: true,
      }),
    );
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

  _showToast(msg) {
    this._toastMsg = msg;
    setTimeout(() => {
      if (this._toastMsg === msg) this._toastMsg = "";
    }, 3000);
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          font-family: var(--ddd-font-primary);
          color: var(--ddd-theme-default-text);
        }
        .card {
          background: var(--ddd-theme-default-surface);
          border-radius: var(--ddd-radius-lg);
          box-shadow: var(--ddd-shadow-1);
          padding: var(--ddd-spacing-5);
          margin-bottom: var(--ddd-spacing-5);
          border: 1px solid var(--ddd-theme-polaris-border);
        }
        h3 {
          margin: 0 0 var(--ddd-spacing-2);
          font-size: var(--ddd-font-size-m);
          color: var(--ddd-theme-default-text);
          display: flex;
          align-items: center;
          gap: var(--ddd-spacing-2);
        }
        .meta {
          font-size: var(--ddd-font-size-xs);
          color: var(--ddd-theme-secondary);
          background: var(--ddd-theme-polaris-surface-hover);
          padding: var(--ddd-spacing-1) var(--ddd-spacing-3);
          border-radius: var(--ddd-radius-full);
          display: inline-block;
          margin-bottom: var(--ddd-spacing-3);
        }
        .instruction {
          margin: 0 0 var(--ddd-spacing-3);
          font-size: var(--ddd-font-size-s);
          color: var(--ddd-theme-secondary);
          line-height: var(--ddd-lh-150);
        }
        textarea,
        input[type="url"],
        input[type="text"] {
          width: 100%;
          min-height: var(--ddd-spacing-20);
          padding: var(--ddd-spacing-3);
          border: 1px solid var(--ddd-theme-polaris-border);
          border-radius: var(--ddd-radius-md);
          font-size: var(--ddd-font-size-s);
          box-sizing: border-box;
          resize: vertical;
          font-family: var(--ddd-font-primary);
          margin-bottom: var(--ddd-spacing-2);
          background: var(--ddd-theme-default-surface);
          color: var(--ddd-theme-default-text);
        }
        textarea:focus,
        input:focus {
          outline: none;
          border-color: var(--ddd-theme-primary);
          box-shadow: 0 0 0 2px var(--ddd-theme-polaris-focus-ring);
        }
        textarea:disabled,
        input:disabled {
          background: var(--ddd-theme-polaris-surface);
          cursor: not-allowed;
          opacity: 0.7;
        }
        .btn-group {
          display: flex;
          gap: var(--ddd-spacing-2);
          flex-wrap: wrap;
          margin-top: var(--ddd-spacing-3);
        }
        .btn {
          border: none;
          padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-bold);
          font-family: var(--ddd-font-primary);
          border-radius: var(--ddd-radius-md);
          cursor: pointer;
          transition: background 0.2s;
          color: var(--ddd-theme-on-primary);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-success {
          background: var(--ddd-theme-success);
        }
        .btn-success:hover:not(:disabled) {
          background: var(--ddd-theme-success-dark);
        }
        .btn-danger {
          background: var(--ddd-theme-error);
        }
        .btn-danger:hover:not(:disabled) {
          background: var(--ddd-theme-error-dark);
        }
        .btn-sm {
          padding: var(--ddd-spacing-1) var(--ddd-spacing-2);
          font-size: var(--ddd-font-size-xs);
        }
        .badge-done {
          background: var(--ddd-theme-success-light);
          color: var(--ddd-theme-success-text);
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          border-radius: var(--ddd-radius-md);
          font-weight: var(--ddd-font-weight-bold);
          font-size: var(--ddd-font-size-xs);
          display: inline-flex;
          align-items: center;
          gap: var(--ddd-spacing-1);
          margin-top: var(--ddd-spacing-2);
        }
        .badge-pending {
          background: var(--ddd-theme-warning-light);
          color: var(--ddd-theme-warning-text);
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          border-radius: var(--ddd-radius-md);
          font-weight: var(--ddd-font-weight-bold);
          font-size: var(--ddd-font-size-xs);
          display: inline-flex;
          align-items: center;
          gap: var(--ddd-spacing-1);
          margin-top: var(--ddd-spacing-2);
        }
        .login-hint {
          font-size: var(--ddd-font-size-xs);
          color: var(--ddd-theme-secondary);
          margin-bottom: var(--ddd-spacing-3);
        }
        .toast {
          position: fixed;
          bottom: var(--ddd-spacing-6);
          left: 50%;
          transform: translateX(-50%);
          background: var(--ddd-theme-default-text);
          color: var(--ddd-theme-on-primary);
          padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
          border-radius: var(--ddd-radius-full);
          box-shadow: var(--ddd-shadow-2);
          font-size: var(--ddd-font-size-s);
          font-weight: var(--ddd-font-weight-medium);
          z-index: 1000;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
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
          --ddd-theme-on-primary: #f8fafc;
          --ddd-theme-primary: #c4b5fd;
          --ddd-theme-secondary: var(--dk-text-soft);
          --ddd-theme-polaris-surface: var(--dk-card);
          --ddd-theme-polaris-border: var(--dk-border);
          --ddd-theme-polaris-surface-hover: var(--dk-soft);
          --ddd-theme-success: #6ee7b7;
          --ddd-theme-success-light: #064e3b;
          --ddd-theme-success-text: #6ee7b7;
          --ddd-theme-success-dark: #047857;
          --ddd-theme-error: #fca5a5;
          --ddd-theme-error-dark: #7f1d1d;
          --ddd-theme-warning: #fcd34d;
          --ddd-theme-warning-light: #78350f;
          --ddd-theme-warning-text: #fde68a;
          background: var(--dk-bg);
          color: var(--dk-text);
        }
        :host-context(body.dark-mode) .upload-card,
        :host-context(body.dark-mode) .file-input,
        :host-context(body.dark-mode) .status-banner {
          background: var(--dk-card);
          color: var(--dk-text);
          border-color: var(--dk-border);
        }
        :host-context(body.dark-mode) .file-input { background: var(--dk-soft); }
        :host-context(body.dark-mode) .btn-submit { background: #4f46e5; color: #f8fafc; }
        :host-context(body.dark-mode) .btn-submit:hover { background: #6366f1; }
        :host-context(body.dark-mode) .status-banner.success { background: #064e3b; color: #6ee7b7; border-color: #047857; }
        :host-context(body.dark-mode) .status-banner.error { background: #7f1d1d; color: #fecaca; border-color: #991b1b; }
      `,
    ];
  }

  render() {
    return html`
      <section class="card" aria-labelledby="assignment-heading">
        <h3 id="assignment-heading">📤 ${this.assignmentTitle}</h3>
        <div class="meta">Formatif | ${this.t.submissionTitle} | KD: ${this.kdMateri}</div>
        <p class="instruction">${this.assignmentInstruction}</p>
        ${!this.studentId
          ? html`<div class="login-hint">⚠️ ${this.t.loginHint}</div>`
          : ""}
        <label class="sr-only" for="task-link">${this.t.placeholderLink}</label>
        <input
          id="task-link"
          type="url"
          placeholder="${this.t.placeholderLink}"
          .value="${this._assignmentLink}"
          @input=${(e) => {
            this._assignmentLink = e.target.value;
          }}
          ?disabled="${this._assignmentSubmitted}"
          aria-label="${this.t.placeholderLink}"
        />
        <label class="sr-only" for="task-text">${this.t.placeholderTask}</label>
        <textarea
          id="task-text"
          .value="${this._assignmentText}"
          @input=${(e) => {
            this._assignmentText = e.target.value;
          }}
          ?disabled="${this._assignmentSubmitted}"
          placeholder="${this.t.placeholderTask}"
          aria-label="${this.t.placeholderTask}"
        ></textarea>
        <div class="btn-group">
          ${this._assignmentSubmitted
            ? html`
                <button class="btn btn-success btn-sm" disabled aria-label="${this.t.submitted}">✅ ${this.t.submitted}</button>
                ${!this.hideDelete
                  ? html`<button class="btn btn-danger btn-sm" @click=${this._resetAssignment} aria-label="${this.t.resetBtn}">🔄 ${this.t.resetBtn}</button>`
                  : ""}
              `
            : html`
                <button
                  class="btn btn-success"
                  ?disabled="${this._submitting}"
                  @click=${this._submitAssignment}
                  aria-label="${this.t.submitBtn}"
                >
                  ${this._submitting ? `⏳ ${this.t.submitting}` : this.t.submitBtn}
                </button>
              `}
        </div>
        <div
          class="${this._assignmentSubmitted ? "badge-done" : "badge-pending"}"
          role="status"
          aria-live="polite"
        >
          ${this._assignmentSubmitted
            ? `✅ ${this.t.submitted}`
            : `⚠️ ${this.t.pending}`}
        </div>
      </section>
      ${this._toastMsg ? html`<div class="toast">${this._toastMsg}</div>` : ""}
    `;
  }
}

globalThis.customElements.define(KirimTugas.tag, KirimTugas);