import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import "../dasbor-kuis.js";

/**
 * `tema-ceria-dasbor`
 * Shell tema Ceria (Image 1+2) — kalender & productivity terintegrasi,
 * filter Kelas & Materi dinamis sesuai sheet Users / best practice.
 * Bungkus `dasbor-kuis tema="ceria"` dan teruskan props.
 * @element tema-ceria-dasbor
 */
export class TemaCeriaDasbor extends DDDSuper(LitElement) {
  static get tag() { return "tema-ceria-dasbor"; }

  static get properties() {
    return {
      ...super.properties,
      appsScriptUrl: { type: String, attribute: "apps-script-url", reflect: true },
      mode: { type: String, attribute: "mode", reflect: true },
      kelas: { type: String, attribute: "kelas", reflect: true },
      kdMateri: { type: String, attribute: "kd-materi", reflect: true },
      studentId: { type: String, attribute: "student-id", reflect: true },
      namaSiswa: { type: String, attribute: "nama-siswa", reflect: true },
      _opsiKelas: { state: true },
      _opsiMateri: { state: true },
      _availableLM: { state: true },
      _cal: { state: true },
      _prodActive: { state: true },
    };
  }

  static get haxProperties() {
    return {
      api: "1", canScale: false, canPosition: false, canEditSource: true,
      gizmo: { title: "Tema Ceria — Dasbor Terintegrasi", description: "Shell pastel bermain (Image 1+2) — filter Kelas & Materi dinamis + kalender hidup, bungkus dasbor-kuis lengkap.", icon: "image:palette", color: "purple", tags: ["Tema","Dasbor","Ceria"] },
      settings: { configure: [
        { property: "appsScriptUrl", title: "Apps Script URL", inputMethod: "textfield", required: true },
        { property: "mode", title: "Mode", inputMethod: "select", options: { guru: "Guru", siswa: "Siswa" } },
        { property: "kelas", title: "Kelas (opsional — kosong=semua)", inputMethod: "textfield" },
        { property: "kdMateri", title: "Pertemuan/LM awal", inputMethod: "textfield" },
      ] }
    };
  }

  constructor() {
    super();
    this.appsScriptUrl = "";
    this.mode = "guru";
    this.kelas = "";
    this.kdMateri = "Pertemuan 1";
    this.studentId = "";
    this.namaSiswa = "";
    this._opsiKelas = [];
    this._opsiMateri = [];
    this._availableLM = new Set();
    this._cal = new Date();
    this._prodActive = "";
    this._canonKelas = (v) => String(v||"").trim().toLowerCase().replace(/[^a-z0-9]/g,"");
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchFilters();
  }

  updated(changed) {
    super.updated(changed);
    if (changed.has("appsScriptUrl")) this._fetchFilters();
    if (changed.has("kdMateri")) this._prodActive = this._canonKelas(this.kdMateri);
  }

  _apiGet(params) {
    const qs = new URLSearchParams(params);
    return fetch(`${this.appsScriptUrl}?${qs.toString()}`, { method: "GET", mode: "cors" })
      .then((r) => r.text()).then((t) => {
        if (!t || t.trim().charAt(0) !== "{") return { status: "error" };
        try { return JSON.parse(t); } catch { return { status:"error" }; }
      }).catch(() => ({ status:"error" }));
  }

  async _fetchFilters() {
    if (!this.appsScriptUrl) return;
    try {
      const [rosterRes, leaderboardRes, bankRes] = await Promise.all([
        this._apiGet({ action: "getStudentRoster", kelas: "" }),
        this._apiGet({ action: "getLeaderboard", kelas: "" }),
        this._apiGet({ action: "getBankSoal" }).catch(()=>({soal:[]})),
      ]);
      // available LM dari BankSoal per sel (Kategori=LMx) — jika ada data, jadi guard
      if (bankRes && Array.isArray(bankRes.soal) && bankRes.soal.length>0) {
        const avail = new Set();
        bankRes.soal.forEach((s)=> {
          const k = String(s.kategori||s.Kategori||"").trim();
          if (k) avail.add(this._canonKelas(k));
        });
        this._availableLM = avail;
      } else {
        this._availableLM = new Set(); // kosong = tidak guard, semua LM dianggap tersedia (fallback file json)
      }
      // Kelas: distinct dari roster (sumber kebenaran Users), dedup canon
      const canonMap = new Map();
      const addKelas = (raw) => {
        const s = String(raw||"").trim(); if (!s) return;
        const c = this._canonKelas(s); if (!c || canonMap.has(c)) return;
        let label = s.toUpperCase().replace(/\s+/g," ").replace(/\s*-\s*/g,"-").trim();
        if (label.includes(" ") && !label.includes("-")) label = label.replace(/\s+/g,"-");
        if (/^X\d+$/i.test(label)) label = label.replace(/^X/i,"X-");
        canonMap.set(c, label);
      };
      (rosterRes.roster||[]).forEach((r)=> addKelas(r.kelas));
      // jika roster kosong, fallback leaderboard
      if (canonMap.size===0) (leaderboardRes.leaderboard||[]).forEach((r)=> addKelas(r.Kelas||r.kelas||""));
      this._opsiKelas = [...canonMap.values()].sort();
      // Materi: LM1..LMn dari header laporan + distinct kodeLM dari roster? best practice: LM1-10 + STS/SAS + Pertemuan 1..5
      const lmSet = new Set();
      const lb = leaderboardRes.leaderboard||[];
      if (lb.length>0) {
        const keys = Object.keys(lb[0]||{});
        keys.forEach((k)=> { const m = k.match(/^LM\s*0?(\d+)$/i); if(m) lmSet.add(`LM${m[1]}`); });
        if (keys.includes("Rerata_LM")) lmSet.add("Rerata LM");
      }
      // selalu sediakan LM1..5 + STS/SAS agar filter tidak kosong sebelum data ada
      ["LM1","LM2","LM3","LM4","LM5","STS","SAS"].forEach((x)=> lmSet.add(x));
      // tambah Pertemuan 1..4 sebagai alias
      ["Pertemuan 1","Pertemuan 2","Pertemuan 3","Pertemuan 4"].forEach((x)=> lmSet.add(x));
      this._opsiMateri = [...lmSet].sort((a,b)=>{
        const na = parseInt(a.replace(/\D/g,""),10)||99; const nb = parseInt(b.replace(/\D/g,""),10)||99;
        if (a.startsWith("LM") && b.startsWith("LM")) return na-nb;
        if (a.startsWith("LM")) return -1; if (b.startsWith("LM")) return 1;
        return a.localeCompare(b);
      });
      this.requestUpdate();
    } catch(e){ /* abaikan */ }
  }

  _isAvailable(m){
    if (!this._availableLM || this._availableLM.size===0) return true;
    return this._availableLM.has(this._canonKelas(m));
  }
  _onKelasChange(e){ this.kelas = e.target.value; this.dispatchEvent(new CustomEvent("kelas-change",{detail:this.kelas,bubbles:true,composed:true})); }
  _onMateriChange(e){ this.kdMateri = e.target.value; this._prodActive = this._canonKelas(this.kdMateri); }
  _selectProd(m){
    if (!this._isAvailable(m)) {
      // guard: LM belum diatur (BankSoal kosong) — beri toast / jangan ganti kdMateri
      this.dispatchEvent(new CustomEvent("lm-not-available",{detail:m,bubbles:true,composed:true}));
      return;
    }
    this.kdMateri = m; this._prodActive = this._canonKelas(m);
  }

  _monthLabel(d){ return d.toLocaleDateString("id-ID",{month:"long",year:"numeric"}); }
  _prevMonth(){ const n=new Date(this._cal); n.setMonth(n.getMonth()-1); this._cal=n; }
  _nextMonth(){ const n=new Date(this._cal); n.setMonth(n.getMonth()+1); this._cal=n; }

  static get styles() {
    return [
      super.styles,
      css`
        :host { display: block; font-family: var(--ddd-font-primary); background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 45%, #DDD6FE 100%); padding: var(--ddd-spacing-4); min-height: 100vh; }
        .shell { max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--ddd-spacing-5); }
        .hero {
          background: #fff; border-radius: 24px; padding: var(--ddd-spacing-5); border: 1px solid #E0E7FF;
          box-shadow: 0 8px 32px rgba(79,70,229,0.10); display: grid; grid-template-columns: 1.2fr 0.8fr; gap: var(--ddd-spacing-5);
        }
        @media (max-width: 860px) { .hero { grid-template-columns: 1fr; } }
        .hero-left h2 { margin: 0; font-size: var(--ddd-font-size-l); color: #312E81; display: flex; align-items: center; gap: var(--ddd-spacing-2); }
        .hero-left p { color: #64748B; font-size: 13px; margin: 6px 0 0; }
        .pill { display: inline-flex; align-items: center; gap: 6px; background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; border-radius: 999px; padding: 6px 14px; font-size: 12px; font-weight: 700; }
        .filter-row { margin-top:12px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .filter-select { background:#fff; border:1px solid #C7D2FE; border-radius:999px; padding:8px 14px; font-size:12px; font-weight:700; color:#4338CA; min-width: 140px; }
        .illus {
          background: linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%); border: 1px solid #E0E7FF; border-radius: 20px;
          padding: var(--ddd-spacing-5); display: flex; flex-direction: column; gap: var(--ddd-spacing-3); position: relative; overflow: hidden;
        }
        .illus::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 30% 20%, #C7D2FE 1px, transparent 1px); background-size: 20px 20px; opacity: 0.35; pointer-events: none; }
        .mini-card {
          background: #fff; border: 1px solid #E0E7FF; border-radius: 16px; padding: var(--ddd-spacing-4);
          box-shadow: 0 4px 16px rgba(79,70,229,0.06); position: relative;
        }
        .calendar { background: #fff; border: 1px solid #E0E7FF; border-radius: 20px; padding: var(--ddd-spacing-5); box-shadow: 0 4px 16px rgba(79,70,229,0.06); }
        .cal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--ddd-spacing-3); }
        .cal-head h3 { margin: 0; font-size: 15px; color: #1e293b; text-transform: capitalize; }
        .cal-nav { display:flex; gap:6px; }
        .cal-nav button { width:28px; height:28px; border-radius:50%; border:1px solid #E2E8F0; background:#fff; cursor:pointer; }
        .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; }
        .cal-day { border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 4px; text-align: center; background: #F8FAFF; font-size:12px; }
        .cal-day.head { background: transparent; border: none; color:#94A3B8; font-weight:700; font-size:10px; padding: 4px; }
        .cal-day.today { background: #0F172A; color: #fff; border-color: #0F172A; font-weight:800; }
        .cal-day.has-lm { border-color: #C7D2FE; background: #EEF2FF; }
        .cal-day.active-lm { background: #EEF2FF; border-color: #4F46E5; color: #4338CA; font-weight:800; }
        .cal-day.active-lm.today { background: #312E81; color:#fff; }
        .prod { display: flex; flex-wrap: wrap; gap: 8px; }
        .prod-item { border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 700; color: #fff; border:none; cursor:pointer; transition: transform 0.15s; }
        .prod-item:hover { transform: translateY(-1px); }
        .prod-item.active { outline: 2px solid #312E81; outline-offset: 2px; }
        .prod-item.blue { background: #3B82F6; } .prod-item.green { background: #10B981; } .prod-item.pink { background: #EC4899; } .prod-item.amber { background: #F59E0B; } .prod-item.purple { background: #8B5CF6; }
        .courses { display: grid; grid-template-columns: 1fr 1fr; gap: var(--ddd-spacing-4); }
        @media (max-width: 600px) { .courses { grid-template-columns: 1fr; } }
        .course { border-radius: 20px; padding: var(--ddd-spacing-5); border: 1px solid; position: relative; overflow: hidden; min-height: 140px; display: flex; flex-direction: column; justify-content: space-between; }
        .course.peach { background: #FFF7ED; border-color: #FED7AA; } .course.lav { background: #F5F3FF; border-color: #DDD6FE; }
        .course h4 { margin: 0; font-size: 18px; color: #1e293b; line-height: 1.2; }
        .course p { margin: 0; color: #64748B; font-size: 12px; }
        .das-wrap { background: transparent; }
        dasbor-kuis { --ddd-spacing-6: var(--ddd-spacing-5); }
      `,
    ];
  }

  _lmForDay(day){ return `LM${Math.floor((day-1)/15)+1}`; }
  _calendarDays() {
    const y = this._cal.getFullYear(), m = this._cal.getMonth();
    const first = new Date(y,m,1).getDay(); // 0 Sun
    const adjFirst = (first===0?6:first-1); // Mon=0
    const daysInMonth = new Date(y,m+1,0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
    const cells = [];
    const head = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
    head.forEach(h=> cells.push({head:h}));
    for(let i=0;i<adjFirst;i++) cells.push({empty:true});
    for(let d=1; d<=daysInMonth; d++){
      const dt = new Date(y,m,d); dt.setHours(0,0,0,0);
      const isToday = dt.getTime()===today.getTime();
      const lm = this._lmForDay(d);
      const isActiveLM = this._canonKelas(this.kdMateri)===this._canonKelas(lm);
      cells.push({day:d, date:dt, isToday, lm, isActiveLM});
    }
    return cells;
  }
  _onCalDay(d){
    const lm = this._lmForDay(d);
    if (!this._isAvailable(lm)) return;
    this.kdMateri = lm;
    this._prodActive = this._canonKelas(lm);
  }

  render() {
    const calCells = this._calendarDays();
    // warna prod bergilir
    const prodColors = ["blue","green","pink","amber","purple"];
    return html`
      <div class="shell">
        <div class="hero">
          <div class="hero-left">
            <span class="pill">📚 Ruang Pertemuan • ${this.kdMateri}</span>
            <h2>🎓 Dasbor Guru — Evaluasi & Pantauan Kelas</h2>
            <p>Tema Ceria — filter Kelas & Materi dinamis sesuai <strong>sheet Users</strong> (best practice: Kelas distinct canon), kalender hidup, dan productivity pills LM.</p>
            <div class="filter-row">
              <select class="filter-select" @change=${this._onKelasChange} .value=${this.kelas} aria-label="Filter Kelas">
                <option value="">Semua Kelas</option>
                ${this._opsiKelas.map((k)=> html`<option value=${k}>${k}</option>`)}
              </select>
              <select class="filter-select" @change=${this._onMateriChange} .value=${this.kdMateri} aria-label="Filter Materi">
                ${this._opsiMateri.map((m)=> {
                  const avail = this._isAvailable(m);
                  return html`<option value=${m} ?disabled=${!avail} style="${!avail?'opacity:0.5;':''}">${m}${!avail ? ' — belum diatur' : ''}</option>`;
                })}
              </select>
              <span class="pill">Mode: ${this.mode}</span>
            </div>
            <div class="calendar" style="margin-top:16px;">
              <div class="cal-head">
                <h3>${this._monthLabel(this._cal)}</h3>
                <div class="cal-nav">
                  <button @click=${this._prevMonth} aria-label="Bulan sebelumnya">‹</button>
                  <button @click=${this._nextMonth} aria-label="Bulan berikutnya">›</button>
                  <span class="pill" style="padding:4px 10px; font-size:11px;">Calendar</span>
                </div>
              </div>
              <div class="cal-grid">
                ${calCells.map((c)=> {
                  if (c.head) return html`<div class="cal-day head">${c.head}</div>`;
                  if (c.empty) return html`<div></div>`;
                  const avail = this._isAvailable(c.lm);
                  const lmCls = c.isActiveLM ? 'has-lm active-lm' : 'has-lm';
                  const dis = !avail ? 'opacity:0.4; pointer-events:none;' : '';
                  return html`<button class="cal-day ${c.isToday ? 'today' : ''} ${lmCls}" style="${dis}" ?disabled=${!avail} @click=${()=>this._onCalDay(c.day)} title="${c.lm} ${avail?'— 15 hari/LM (klik filter)':'— belum ada soal'}">${c.day}<span style="display:block; font-size:8px; font-weight:700; color:${c.isActiveLM?'#fff':'#94A3B8'};">${c.lm}</span></button>`;
                })}
              </div>
              <div style="font-size:10px; color:#94A3B8; margin-top:4px;">15 hari/LM: 1–15→LM1, 16–30→LM2 (klik tanggal filter LM)</div>
              <div style="margin-top:12px; border-top:1px solid #E0E7FF; padding-top:12px;">
                <div style="font-size:12px; font-weight:700; color:#64748B; margin-bottom:8px;">Productivity — tap LM untuk filter leaderboard & Rapor</div>
                <div class="prod">
                  ${this._opsiMateri.slice(0,6).map((m,i)=>{
                    const canon = this._canonKelas(m);
                    const active = this._canonKelas(this.kdMateri)===canon;
                    const avail = this._isAvailable(m);
                    const col = prodColors[i % prodColors.length];
                    return html`<button class="prod-item ${col} ${active?'active':''}" ?disabled=${!avail} style="${!avail?'opacity:0.45; pointer-events:none;':''}" title="${avail ? 'Klik filter '+m : m+' — belum ada soal, kirim LM3 akan ditolak'}" @click=${()=>this._selectProd(m)}>${m}${!avail?' 🔒':''}</button>`;
                  })}
                </div>
                <div style="font-size:11px; color:#94A3B8; margin-top:6px;">Best practice: Kelas dari <code>Users</code> distinct canon; Materi dari header LM Akumulasi (dinamis).</div>
              </div>
            </div>
          </div>
          <div class="illus">
            <div class="mini-card">
              <div style="font-size:12px; font-weight:800; color:#312E81; display:flex; align-items:center; gap:6px;"><span style="width:8px; height:8px; background:#3B82F6; border-radius:50%; display:inline-block;"></span>Arteries</div>
              <div style="font-size:11px; color:#64748B; margin-top:4px;">carry oxygen-rich blood from your heart to your body's tissues.</div>
              <div style="margin-top:8px; display:flex; gap:6px;"><span style="background:#F1F5F9; border-radius:999px; padding:4px 8px; font-size:10px; border:1px solid #E2E8F0;">−</span><span style="background:#F1F5F9; border-radius:999px; padding:4px 8px; font-size:10px; border:1px solid #E2E8F0;">+</span><span style="background:#EEF2FF; border-radius:999px; padding:4px 10px; font-size:10px; color:#4338CA; border:1px solid #C7D2FE;">100%</span></div>
            </div>
            <div style="font-size:13px; color:#64748B; text-align:center;">🫀 Human structure — hero aksen (Image 1)</div>
            <div class="courses">
              <div class="course peach"><h4>Drawing<br>practice</h4><p>🎨 New course</p></div>
              <div class="course lav" style="transform:rotate(1.5deg);"><h4>Learning<br>to count</h4><p>🔢 2 1 3 4</p></div>
            </div>
          </div>
        </div>
        <div class="das-wrap">
          <dasbor-kuis
            tema="ceria"
            .appsScriptUrl=${this.appsScriptUrl}
            .mode=${this.mode}
            .kelas=${this.kelas}
            .kdMateri=${this.kdMateri}
            .studentId=${this.studentId}
            .namaSiswa=${this.namaSiswa}
          ></dasbor-kuis>
        </div>
      </div>
    `;
  }
}
globalThis.customElements.define(TemaCeriaDasbor.tag, TemaCeriaDasbor);
