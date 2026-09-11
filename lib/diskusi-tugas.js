import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";

export class IntegratedForum extends DDDSuper(LitElement) {
  static get tag() { return "diskusi-tugas"; }

  static get properties() {
    return {
      ...super.properties,
      namaSiswa: { type: String, attribute: "nama-siswa", reflect: true },
      _jawabanLokal: { state: true },
      _daftarKomentar: { state: true }
    };
  }

  constructor() {
    super();
    this.namaSiswa = "Siswa";
    this._jawabanLokal = "";
    this._daftarKomentar = [];
    
    // Memuat riwayat interaksi sederhana sesi ini jika tersedia
    this._muatKomentarSesi();
  }

  _muatKomentarSesi() {
    try {
      const riwayat = localStorage.getItem("a3_v5_forum_session_history");
      if (riwayat) this._daftarKomentar = JSON.parse(riwayat);
    } catch(e) {}
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          font-family: var(--ddd-font-navigation, system-ui, sans-serif);
        }
        .forum-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--ddd-spacing-6);
        }
        @media (min-width: 768px) {
          .forum-container { grid-template-columns: 1.2fr 0.8fr; }
        }
        .card-premium {
          background: var(--ddd-theme-default-white);
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-md);
          padding: var(--ddd-spacing-5);
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .card-premium h3 {
          margin-top: var(--ddd-spacing-0);
          color: var(--ddd-theme-default-text);
          font-size: var(--ddd-font-size-ms);
          border-bottom: var(--ddd-border-sm);
          padding-bottom: var(--ddd-spacing-2);
          margin-bottom: var(--ddd-spacing-4);
        }
        .input-wrapper {
          position: relative;
          margin-bottom: var(--ddd-spacing-4);
        }
        textarea {
          width: 100%;
          min-height: 120px;
          padding: var(--ddd-spacing-3);
          border: var(--ddd-border-sm);
          border-radius: var(--ddd-radius-sm);
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-4xs);
          color: var(--ddd-theme-default-text);
          resize: vertical;
          box-sizing: border-box;
          transition: all 0.2s ease-in-out;
          background: var(--ddd-theme-polaris-surface-hover);
        }
        textarea:focus {
          outline: none;
          border-color: var(--ddd-theme-primary);
          background: var(--ddd-theme-default-white);
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .action-button-group {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ddd-spacing-3);
        }
        .btn-premium-action {
          flex: 1;
          min-width: 160px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--ddd-spacing-2);
          padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
          background-color: var(--ddd-theme-primary);
          color: var(--ddd-theme-default-white);
          border: none;
          border-radius: var(--ddd-radius-sm);
          font-weight: var(--ddd-font-weight-bold);
          font-size: var(--ddd-font-size-4xs);
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .btn-premium-action:hover {
          background-color: var(--ddd-theme-accent);
          transform: translateY(-1px);
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .btn-blue {
          background-color: var(--ddd-theme-primary);
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .btn-blue:hover {
          background-color: var(--ddd-theme-accent);
          box-shadow: var(--ddd-boxShadow-sm);
        }
        .comment-stream {
          max-height: 280px;
          overflow-y: auto;
          padding-right: var(--ddd-spacing-1);
        }
        .comment-bubble {
          background: var(--ddd-theme-polaris-surface-hover);
          border: var(--ddd-border-xs);
          border-radius: var(--ddd-radius-sm);
          padding: var(--ddd-spacing-3);
          margin-bottom: var(--ddd-spacing-3);
        }
        .comment-header {
          display: flex;
          justify-content: space-between;
          font-size: var(--ddd-font-size-4xs);
          font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-secondary);
          margin-bottom: var(--ddd-spacing-1);
        }
        .comment-body {
          font-size: var(--ddd-font-size-4xs);
          color: var(--ddd-theme-default-text);
          margin: var(--ddd-spacing-0);
          white-space: pre-wrap;
          word-break: break-all;
        }
        .empty-state-text {
          color: var(--ddd-theme-secondary);
          font-size: var(--ddd-font-size-4xs);
          text-align: center;
          padding: var(--ddd-spacing-4) 0;
          margin: var(--ddd-spacing-0);
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
          --ddd-theme-polaris-surface-hover: var(--dk-soft);
          background: var(--dk-bg);
          color: var(--dk-text);
        }
        :host-context(body.dark-mode) .forum-card,
        :host-context(body.dark-mode) .comment-item,
        :host-context(body.dark-mode) .reply-item,
        :host-context(body.dark-mode) .editor {
          background: var(--dk-card);
          color: var(--dk-text);
          border-color: var(--dk-border);
        }
      `,
    ];
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

  kirimDiskusiAtauTugas(tipe) {
    const areaTeks = this.shadowRoot.querySelector("textarea");
    const konten = areaTeks.value.trim();
    
    if (!konten) {
      alert("Harap tuliskan tanggapan atau tautan tugas Anda terlebih dahulu!");
      return;
    }

    const idLog = this._buatIdLog();
    this.dispatchEvent(
      new CustomEvent("dasbor-kuis-log", {
        detail: {
          id_log: idLog,
          tipe: tipe,
          payload: { teksKonten: konten, timestamp: new Date().toISOString() },
        },
        bubbles: true,
        composed: true,
      }),
    );

    const namaUser = this.namaSiswa || "Siswa";
    const itemBaru = {
      pembuat: namaUser,
      waktu: new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
      tipeAksi: tipe === "forum" ? "💬 Forum" : "📤 Tugas",
      isi: konten
    };

    this._daftarKomentar = [itemBaru, ...this._daftarKomentar];
    try { localStorage.setItem("a3_v5_forum_session_history", JSON.stringify(this._daftarKomentar)); } catch(e) {}

    alert(`Berhasil! Aktivitas ${tipe.toUpperCase()} telah diamankan ke dalam antrean sinkronisasi.`);
    areaTeks.value = "";
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="forum-container">
        <!-- Panel Kiri: Form Lembar Input Respon -->
        <div class="card-premium">
          <h3>💬 Ruang Diskusi & Pengumpulan Mandiri</h3>
          <p style="color: var(--ddd-theme-secondary); font-size: var(--ddd-font-size-4xs); margin-top: var(--ddd-spacing-0); margin-bottom: var(--ddd-spacing-4);">
            Gunakan kolom di bawah ini untuk berpartisipasi dalam forum interaktif kelas atau menyerahkan tautan pengerjaan proyek tugas Anda.
          </p>
          
          <div class="input-wrapper">
            <textarea placeholder="Tuliskan gagasan diskusi, pertanyaan praktikum, atau sematkan tautan repositori/Google Drive tugas Anda di sini..."></textarea>
          </div>

          <div class="action-button-group">
            <button class="btn-premium-action" @click=${() => this.kirimDiskusiAtauTugas("forum")}>
              <span>💬 Kirim Tanggapan Forum</span>
            </button>
            <button class="btn-premium-action btn-blue" @click=${() => this.kirimDiskusiAtauTugas("assignment")}>
              <span>📤 Serahkan Berkas Tugas</span>
            </button>
          </div>
        </div>

        <!-- Panel Kanan: Aliran Feed Transaksi Sesi Berjalan -->
        <div class="card-premium">
          <h3>📌 Rekam Aktivitas Sesi Ini</h3>
          <div class="comment-stream">
            ${this._daftarKomentar.length === 0 ? html`
              <p class="empty-state-text">Belum ada rekaman pengiriman diskusi atau tugas dari Anda pada sesi browser ini.</p>
            ` : ""}
            
            ${this._daftarKomentar.map(c => html`
              <div class="comment-bubble">
                <div class="comment-header">
                  <span>${c.pembuat} (${c.tipeAksi})</span>
                  <span>${c.waktu}</span>
                </div>
                <p class="comment-body">${c.isi}</p>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define(IntegratedForum.tag, IntegratedForum);
