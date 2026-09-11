import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

/**
 * `timer-kuis`
 *
 * Timer hitung mundur untuk mengerjakan kuis. Saat waktu habis, komponen
 * menghentikan hitungan dan memancarkan event `timer-kuis-expired`
 * (bubbles, composed) yang dapat dipasang ke <kuis-ledakan> untuk
 * melakukan auto-submit.
 *
 * @element timer-kuis
 */
export class TimerKuis extends I18NMixin(DDDSuper(LitElement)) {
  static get tag() {
    return "timer-kuis";
  }

  static get properties() {
    return {
      ...super.properties,
      duration: { type: Number, attribute: "duration", reflect: true },
      remaining: { type: Number, attribute: "remaining", reflect: true },
      autostart: { type: Boolean, attribute: "autostart", reflect: true },
      _remaining: { state: true },
      _running: { state: true },
      hideControls: { type: Boolean, attribute: "hide-controls", reflect: true },
    };
  }

  constructor() {
    super();
    this.duration = 300;
    this.autostart = false;
    this.hideControls = false;
    this._remaining = this.duration;
    this._running = false;
    this._intervalId = null;
    this.t = {
      ...this.t,
      title: "Waktu Kuis",
      start: "Mulai",
      pause: "Jeda",
      reset: "Ulang",
      done: "Waktu habis",
    };
  }

  connectedCallback() {
    super.connectedCallback();

    // Prioritize: remaining (from parent for resume) > duration
    if (this.remaining != null && !isNaN(this.remaining) && this.remaining > 0) {
      this._remaining = this.remaining;
    } else {
      this._remaining = this.duration;
    }

    // Only autostart if timer should actually run
    if (this.autostart && this._remaining > 0) {
      this.start();
    }
  }

  disconnectedCallback() {
    this._clearInterval();
    super.disconnectedCallback();
  }

  updated(changed) {
    // Handle remaining changes (for resume from parent)
    if (changed.has("remaining") && this.remaining != null && !isNaN(this.remaining)) {
      this._remaining = this.remaining;
      // If timer is running, restart with new value
      if (this._running) {
        this._clearInterval();
        this._running = false;
        this.start();
      }
    }

    // Handle duration changes (only if not running and no remaining set)
    if (changed.has("duration") && !this._running && this.remaining == null) {
      this._remaining = this.duration;
    }
  }

  start() {
    if (this._running) return;
    if (this._remaining <= 0) this._remaining = this.duration;
    this._running = true;
    this._clearInterval();
    this._intervalId = setInterval(() => this._tick(), 1000);
  }

  pause() {
    this._running = false;
    this._clearInterval();
  }

  reset() {
    this._clearInterval();
    this._running = false;
    this._remaining = this.duration;
  }

  _clearInterval() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  _tick() {
    if (this._remaining > 0) {
      this._remaining -= 1;
    }
    if (this._remaining <= 0) {
      this._remaining = 0;
      this._running = false;
      this._clearInterval();
      this._onExpire();
    }
  }

  _onExpire() {
    this.dispatchEvent(
      new CustomEvent("timer-kuis-expired", {
        detail: { duration: this.duration },
        bubbles: true,
        composed: true,
      })
    );
  }

  _format(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host { display: block; }
        .timer-card {
          display: inline-flex; align-items: center; gap: var(--ddd-spacing-4);
          background: var(--ddd-theme-polaris-surface, #fff);
          border: 1px solid var(--ddd-theme-polaris-border, #e0e0e0);
          border-radius: var(--ddd-radius-lg);
          padding: var(--ddd-spacing-4) var(--ddd-spacing-5);
          font-family: var(--ddd-font-primary);
        }
        .meta { display: flex; flex-direction: column; }
        .title { font-size: var(--ddd-font-size-s); color: var(--ddd-theme-secondary); }
        .time {
          font-size: var(--ddd-font-size-xl); font-weight: var(--ddd-font-weight-bold);
          color: var(--ddd-theme-primary); font-variant-numeric: tabular-nums;
          min-width: 90px; text-align: center;
        }
        .time.warn { color: var(--ddd-theme-error, #d32f2f); }
        .controls { display: flex; gap: var(--ddd-spacing-2); }
        button {
          font-family: var(--ddd-font-primary); font-size: var(--ddd-font-size-s);
          padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
          border-radius: var(--ddd-radius-md); border: 1px solid var(--ddd-theme-polaris-border, #e0e0e0);
          background: var(--ddd-theme-default-surface, #fff); color: var(--ddd-theme-primary);
          cursor: pointer;
        }
        button:hover { background: rgba(103,80,164,0.08); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .done { margin-top: var(--ddd-spacing-2); color: var(--ddd-theme-error, #d32f2f); font-size: var(--ddd-font-size-s); }
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
          --ddd-theme-on-primary: #f8fafc;
          --ddd-theme-primary: #c4b5fd;
          --ddd-theme-secondary: var(--dk-text-soft);
          --ddd-theme-polaris-surface: var(--dk-card);
          --ddd-theme-polaris-border: var(--dk-border);
          --ddd-theme-error: #fca5a5;
          background: var(--dk-bg);
          color: var(--dk-text);
        }
        :host-context(body.dark-mode) .card,
        :host-context(body.dark-mode) button {
          background: var(--dk-card);
          color: var(--dk-text);
          border-color: var(--dk-border);
        }
        :host-context(body.dark-mode) .title { color: var(--dk-text-soft); }
        :host-context(body.dark-mode) .time { color: #c4b5fd; }
        :host-context(body.dark-mode) .time.warn { color: #fca5a5; }
      `,
    ];
  }

  render() {
    const low = this._remaining <= 10;
    return html`
      <div class="timer-card">
        <div class="meta">
          <span class="title">${this.t.title}</span>
          <span class="time ${low ? "warn" : ""}">${this._format(this._remaining)}</span>
        </div>
        <div class="controls">
          ${this.hideControls
            ? ""
            : html`${this._running
                ? html`<button @click="${this.pause}">⏸️ ${this.t.pause}</button>`
                : html`<button @click="${this.start}" ?disabled="${this._remaining <= 0}">▶️ ${this.t.start}</button>`}
              <button @click="${this.reset}">↺ ${this.t.reset}</button>`}
        </div>
      </div>
      ${this._remaining <= 0 ? html`<div class="done" role="alert">⏰ ${this.t.done}</div>` : ""}
    `;
  }

  static get haxProperties() {
    return {
      canScale: true,
      canPosition: true,
      canEditSource: false,
      gizmo: {
        title: "Timer Kuis",
        description: "Timer hitung mundur untuk kuis dengan auto-submit via event timer-kuis-expired",
        icon: "icons:timer",
        color: "purple",
        tags: ["Education", "Timer", "Quiz"],
      },
      settings: {
        configure: [
          {
            property: "duration",
            title: "Durasi (detik)",
            inputMethod: "number",
            description: "Lama waktu pengerjaan kuis dalam detik",
            default: 300,
          },
          {
            property: "autostart",
            title: "Mulai Otomatis",
            inputMethod: "boolean",
            default: false,
          },
        ],
      },
      saveOptions: { unsetAttributes: [] },
    };
  }
}

if (!customElements.get(TimerKuis.tag)) {
  globalThis.customElements.define(TimerKuis.tag, TimerKuis);
}
