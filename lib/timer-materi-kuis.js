import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

/**
 * `timer-materi-kuis`
 *
 * Dua timer terpisah dalam satu komponen: satu untuk membaca materi dan
 * satu untuk mengerjakan kuis. Masing-masing berjalan independen dengan
 * tombol Mulai/Ulang sendiri. Saat habis, memancarkan event:
 *   - timer-materi-expired  (bubbles, composed)
 *   - timer-kuis-expired    (bubbles, composed)
 *
 * @element timer-materi-kuis
 */
export class TimerMateriKuis extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "timer-materi-kuis";
  }

  static get properties() {
    return {
      ...super.properties,
      durasiMateri: { type: Number, attribute: "durasi-materi", reflect: true },
      durasiKuis: { type: Number, attribute: "durasi-kuis", reflect: true },
      autostartMateri: { type: Boolean, attribute: "autostart-materi", reflect: true },
      kdMateri: { type: String, attribute: "kd-materi" },
      studentId: { type: String, attribute: "student-id" },
      _sisaMateri: { state: true },
      _sisaKuis: { state: true },
      _jalanMateri: { state: true },
      _jalanKuis: { state: true },
    };
  }

  constructor() {
    super();
    this.durasiMateri = 600;
    this.durasiKuis = 300;
    this.autostartMateri = false;
    this._sisaMateri = this.durasiMateri;
    this._sisaKuis = this.durasiKuis;
    this._jalanMateri = false;
    this._jalanKuis = false;
    this._ivMateri = null;
    this._ivKuis = null;
    this.t = {
      ...this.t,
      materi: "Waktu Materi",
      kuis: "Waktu Kuis",
      start: "Mulai",
      pause: "Jeda",
      reset: "Ulang",
      done: "Waktu habis",
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._sisaMateri = this.durasiMateri;
    this._sisaKuis = this.durasiKuis;
    if (this.autostartMateri) {
      this.start("materi");
    }
    this._onVisChange = this._onVisChange.bind(this);
    globalThis.addEventListener("visibilitychange", this._onVisChange);
  }

  disconnectedCallback() {
    globalThis.removeEventListener("visibilitychange", this._onVisChange);
    this._clearInterval("materi");
    this._clearInterval("kuis");
    super.disconnectedCallback();
  }

  _onVisChange() {
    if (document.hidden) {
      if (this._jalanMateri) this.pause("materi");
      if (this._jalanKuis) this.pause("kuis");
    } else {
      if (this.autostartMateri && this._sisaMateri > 0 && !this._jalanMateri) {
        this.start("materi");
      }
    }
  }

  updated(changed) {
    if (changed.has("durasiMateri") && !this._jalanMateri) {
      this._sisaMateri = this.durasiMateri;
    }
    if (changed.has("durasiKuis") && !this._jalanKuis) {
      this._sisaKuis = this.durasiKuis;
    }
  }

  _meta(phase) {
    return phase === "materi"
      ? {
          dur: this.durasiMateri,
          sisa: "_sisaMateri",
          jalan: "_jalanMateri",
          iv: "_ivMateri",
          event: "timer-materi-expired",
          title: this.t.materi,
        }
      : {
          dur: this.durasiKuis,
          sisa: "_sisaKuis",
          jalan: "_jalanKuis",
          iv: "_ivKuis",
          event: "timer-kuis-expired",
          title: this.t.kuis,
        };
  }

  start(phase) {
    const m = this._meta(phase);
    if (this[m.jalan]) return;
    if (this[m.sisa] <= 0) this[m.sisa] = m.dur;
    this[m.jalan] = true;
    this._clearInterval(phase);
    this._saveStartTime(phase, Date.now() - (m.dur - this[m.sisa]) * 1000);
    this[m.iv] = setInterval(() => this._tick(phase), 1000);
  }

  pause(phase) {
    const m = this._meta(phase);
    this[m.jalan] = false;
    this._clearInterval(phase);
  }

  reset(phase) {
    const m = this._meta(phase);
    this._clearInterval(phase);
    this[m.jalan] = false;
    this[m.sisa] = m.dur;
    this._clearStartTime(phase);
  }

  _clearInterval(phase) {
    const ivKey = phase === "materi" ? "_ivMateri" : "_ivKuis";
    if (this[ivKey]) {
      clearInterval(this[ivKey]);
      this[ivKey] = null;
    }
  }

  _startKey(phase) {
    return `timer_mk_start_${phase}_${(this.kdMateri || "default")}_${(this.studentId || "default")}`;
  }

  _saveStartTime(phase, timestamp) {
    try {
      globalThis.localStorage.setItem(this._startKey(phase), String(timestamp));
    } catch (_) {}
  }

  _loadStartTime(phase) {
    try {
      const v = parseInt(globalThis.localStorage.getItem(this._startKey(phase)) || "0", 10);
      return isNaN(v) ? 0 : v;
    } catch (_) {
      return 0;
    }
  }

  _clearStartTime(phase) {
    try {
      globalThis.localStorage.removeItem(this._startKey(phase));
    } catch (_) {}
  }

  _tick(phase) {
    const m = this._meta(phase);
    const savedStart = this._loadStartTime(phase);
    if (savedStart > 0) {
      const elapsed = Math.floor((Date.now() - savedStart) / 1000);
      this[m.sisa] = Math.max(0, m.dur - elapsed);
    } else {
      if (this[m.sisa] > 0) this[m.sisa] -= 1;
    }
    if (this[m.sisa] <= 0) {
      this[m.sisa] = 0;
      this[m.jalan] = false;
      this._clearInterval(phase);
      this._clearStartTime(phase);
      this.dispatchEvent(
        new CustomEvent(m.event, {
          detail: { phase },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  _format(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  _renderTimer(phase) {
    const m = this._meta(phase);
    const sisa = this[m.sisa];
    const jalan = this[m.jalan];
    const low = sisa <= 10;
    const timerLabel = `${m.title}: ${this._format(sisa)} ${low ? "hampir habis" : ""}`;
    return html`
      <div class="timer-card" role="timer" aria-live="polite" aria-label="${timerLabel}">
        <div class="meta">
          <span class="title">${m.title}</span>
          <span class="time ${low ? "warn" : ""}">${this._format(sisa)}</span>
        </div>
        <div class="controls">
          ${jalan
            ? html`<button @click="${this._onPause.bind(this, phase)}" aria-label="Jeda ${m.title.toLowerCase()}">⏸️ ${this.t.pause}</button>`
            : html`<button @click="${this._onStart.bind(this, phase)}" ?disabled="${sisa <= 0}" aria-label="Mulai ${m.title.toLowerCase()}">▶️ ${this.t.start}</button>`}
          <button @click="${this._onReset.bind(this, phase)}" aria-label="Atur ulang ${m.title.toLowerCase()}">↺ ${this.t.reset}</button>
        </div>
      </div>
      ${sisa <= 0 ? html`<div class="done" role="alert">⏰ ${this.t.done}</div>` : ""}
    `;
  }

  _onStart(phase) {
    this.start(phase);
  }

  _onPause(phase) {
    this.pause(phase);
  }

  _onReset(phase) {
    this.reset(phase);
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host { display: block; }
        .grid {
          display: grid; gap: var(--ddd-spacing-5);
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          font-family: var(--ddd-font-primary);
        }
        .timer-card {
          display: inline-flex; align-items: center; gap: var(--ddd-spacing-4);
          background: var(--ddd-theme-surface);
          border: 1px solid var(--ddd-border-sm);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-4) var(--ddd-spacing-5);
        }
        .meta { display: flex; flex-direction: column; }
        .title { font-size: var(--ddd-font-size-s); color: var(--ddd-theme-secondary); }
        .time {
          font-size: var(--ddd-font-size-xl); font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-primary); font-variant-numeric: tabular-nums;
          min-width: 90px; text-align: center;
        }
        .time.warn { color: var(--ddd-theme-error); }
        .controls { display: flex; gap: var(--ddd-spacing-2); }
        button {
          font-family: var(--ddd-font-primary); font-size: var(--ddd-font-size-s);
          padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
          border-radius: var(--ddd-radius-md); border: 1px solid var(--ddd-border-sm);
          background: var(--ddd-theme-default-surface); color: var(--ddd-theme-primary);
          cursor: pointer;
        }
        button:hover { background: rgba(103,80,164,0.08); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .done { margin-top: var(--ddd-spacing-2); color: var(--ddd-theme-error); font-size: var(--ddd-font-size-s); }
      `,
      css`
        @media (prefers-color-scheme: dark) {
          :host {
            --ddd-theme-background: #0b1020;
            --ddd-theme-color: #e5e7eb;
            --ddd-theme-surface: #111827;
            --ddd-theme-default-surface: #111827;
            --ddd-theme-primary: #c4b5fd;
            --ddd-theme-secondary: #94a3b8;
            --ddd-theme-error: #fca5a5;
            --ddd-border-color: #2a3245;
            background: #0b1020;
            color: #e5e7eb;
          }
          .title { color: #94a3b8; }
          .time { color: #c4b5fd; }
          .time.warn { color: #fca5a5; }
        }
      `,
    ];
  }

  render() {
    return html`
      <div class="grid">
        ${this._renderTimer("materi")}
        ${this._renderTimer("kuis")}
      </div>
    `;
  }

  static get haxProperties() {
    return {
      api: "1",
      canScale: true,
      canPosition: true,
      canEditSource: false,
      type: "element",
      designSystem: {
        accent: true,
        primary: true,
        card: true,
        text: true,
        designTreatment: false,
      },
      gizmo: {
        title: "Timer Materi & Kuis",
        description: "Dua timer terpisah untuk membaca materi dan mengerjakan kuis",
        icon: "icons:timer",
        color: "purple",
        tags: ["Education", "Timer", "Quiz", "Materi"],
      },
      settings: {
        configure: [
          {
            property: "durasiMateri",
            title: "Durasi Materi (detik)",
            inputMethod: "number",
            description: "Lama waktu membaca materi dalam detik",
            default: 600,
          },
          {
            property: "durasiKuis",
            title: "Durasi Kuis (detik)",
            inputMethod: "number",
            description: "Lama waktu mengerjakan kuis dalam detik",
            default: 300,
          },
          {
            property: "autostartMateri",
            title: "Mulai Timer Materi Otomatis",
            inputMethod: "boolean",
            default: false,
          },
        ],
      },
      saveOptions: { unsetAttributes: [] },
      demoSchema: [
        {
          tag: "timer-materi-kuis",
          properties: { durasiMateri: 600, durasiKuis: 300, autostartMateri: false },
          content: "",
        },
        {
          tag: "timer-materi-kuis",
          properties: { durasiMateri: 30, durasiKuis: 15, autostartMateri: true },
          content: "",
        },
      ],
    };
  }
}

if (!customElements.get(TimerMateriKuis.tag)) {
  globalThis.customElements.define(TimerMateriKuis.tag, TimerMateriKuis);
}
