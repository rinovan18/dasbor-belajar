# Patch: Tombol Selesai, Stop Auto-Submit, dan Unanswered Indicator

Implementation record untuk patch pada `kuis-ledakan.js` yang menambahkan:
1. Tombol "Selesai — Lihat Skor" di soal terakhir
2. Penentungan auto-submit otomatis di soal terakhir
3. Indikator visual untuk soal yang belum dikerjai di navigasi nomor soal

## File Modified

- `elements/dasbor-kuis/lib/kuis-ledakan.js`

## Perubahan Detail

### 1. Hentikan Auto-Submit di Soal Terakhir

**Lokasi:** `_autoAdvance()` (sekitar baris 1311)

**Sebelum:**
```javascript
_autoAdvance() {
    if (this.practiceMode) return;
    if (this._advanceTimer) clearTimeout(this._advanceTimer);
    this._advanceTimer = setTimeout(() => {
      this._advanceTimer = null;
      const active = this._getActiveQuestions();
      if (this._currentIdx < active.length - 1) {
        this._currentIdx++;
        this._resetState();
      } else {
        this._selesaiKuis();  // AUTO-SUBMIT
      }
    }, this.questionDelay || 1800);
  }
```

**Sesudah:**
```javascript
_autoAdvance() {
    if (this.practiceMode) return;
    if (this._advanceTimer) clearTimeout(this._advanceTimer);
    this._advanceTimer = setTimeout(() => {
      this._advanceTimer = null;
      const active = this._getActiveQuestions();
      if (this._currentIdx < active.length - 1) {
        this._currentIdx++;
        this._resetState();
      }
      // Jangan auto-submit di soal terakhir; tombol "Selesai" yang menangani submit.
    }, this.questionDelay || 1800);
  }
```

**Efek:** User tidak lagi terkirim otomatis saat mencapai soal terakhir. Harus klik tombol "Selesai" untuk submit.

### 2. Tombol "Selesai — Lihat Skor" di Soal Terakhir

**Lokasi:** `_renderQuestionScreen()` (setelah feedback-area)

**Penambahan:**
```javascript
${this._currentIdx === active.length - 1
  ? html`<button type="button" class="btn-submit" style="margin-top:var(--ddd-spacing-4);"
      @click=${this._selesaiKuis}
      aria-label="Selesai dan lihat skor">Selesai — Lihat Skor</button>`
  : ""}
```

**Efek:** Tombol hanya muncul di soal terakhir, memanggil `_selesaiKuis()` untuk submit dan menampilkan hasil.

### 3. Indikator Soal Belum Dikerjai di Navigasi

**Lokasi:** `_renderQuestionScreen()` - class dot navigasi

**Sebelum:**
```javascript
const cls = `q-dot ${isCurrent ? "current" : ""} ${isAnswered ? "answered" : ""} ${isDisabled ? "disabled" : ""}`;
```

**Sesudah:**
```javascript
const isUnanswered = !isAnswered && !isCurrent;
const cls = `q-dot ${isCurrent ? "current" : ""} ${isAnswered ? "answered" : ""} ${isUnanswered ? "unanswered" : ""} ${isDisabled ? "disabled" : ""}`;
```

**CSS Ditambahkan:**
```css
.question-nav .q-dot.unanswered {
  background: var(--ddd-theme-warning-light, #fff3cd);
  border-color: var(--ddd-theme-warning, #ffc107);
  color: var(--ddd-theme-warning-text, #856404);
}
```

**Dark Mode CSS:**
```css
:host-context(body.dark-mode) .question-nav .q-dot.unanswered {
  background: #78350f;
  border-color: #fcd34d;
  color: #fde68a;
}
```

**Efek:** Soal yang belum dijawab ditandai dengan background kuning/oranye di navigasi.

### 4. Perbaikan Tombol "Berikutnya" di Practice Mode

**Lokasi:** `_goToNextQuestion()` dan practice-mode button di `_renderQuestionScreen()`

**`_goToNextQuestion()` diubah:**
```javascript
_goToNextQuestion() {
    const active = this._getActiveQuestions();
    if (this._currentIdx < active.length - 1) {
      this._currentIdx++;
      this._resetState();
      this.requestUpdate();
    } else if (this._currentIdx === active.length - 1) {
      this._selesaiKuis();
    }
  }
```

**Practice mode button diubah:**
```javascript
<button type="button" class="btn-next"
  ?disabled=${this._currentIdx === active.length - 1 ? false : !this._answered}
  @click=${this._goToNextQuestion}
  aria-label="${this._currentIdx === active.length - 1 ? 'Selesai kuis' : 'Soal berikutnya'}">
  ${this._currentIdx === active.length - 1 ? 'Selesai →' : 'Berikutnya →'}
</button>
```

**Efek:** Di practice mode, tombol "Berikutnya" berubah menjadi "Selesai" saat di soal terakhir, memungkinkan user mengakhiri kuis.

## Behaviour Matrix

| Mode | Soal Terakhir | Sebelum Patch | Sesudah Patch |
|------|---------------|---------------|---------------|
| Normal | Setelah jawab | Auto-submit setelah 1800ms | Tombol "Selesai" muncul, user pilih waktu submit |
| Normal | Belum jawab | Auto-submit setelah 1800ms | Tombol "Selesai" tetap muncul (bisa skip) |
| Practice | Setelah jawab | Tidak ada tombol selesai | Tombol "Berikutnya" berubah menjadi "Selesai →" |
| Practice | Belum jawab | Tidak ada tombol selesai | Tombol "Selesai" aktif (bisa finish tanpa jawab) |

## Navigasi Soal Visual

| State | Class | Visual |
|-------|-------|--------|
| Soal saat ini | `current` | Background primary, teks putih |
| Sudah dijawab | `answered` | Border hijau, teks hijau |
| Belum dikerjai | `unanswered` | Background kuning, border kuning |
| Dinonaktifkan (backward nav off) | `disabled` | Abu-abu, cursor not-allowed |

## Deployment Steps

### Step 1 — Build

Build ulang komponen `kuis-ledakan` sesuai prosedur repo `haxtheweb-kuis`:

```bash
cd C:\Users\Dragon\Documents\github\andyid23\haxtheweb-kuis\elements\dasbor-kuis
npm run build
```

Atau jika menggunakan rollup directly:

```bash
npx rollup -c rollup.config.js
```

### Step 2 — Deploy

1. Copy bundle hasil build ke HAXsite (folder `custom/src/` atau sesuai struktur site)
2. Redeploy HAXsite
3. Hard-refresh browser (Ctrl+Shift+R) untuk memastikan JS baru ter-load

### Step 3 — Smoke Test

| # | Test | Expected |
|---|------|----------|
| 1 | Mulai kuis normal, jawab sampai soal terakhir | Tidak auto-submit; tombol "Selesai — Lihat Skor" muncul |
| 2 | Klik "Selesai" di soal terakhir | Layar hasil tampil, skor terkirim |
| 3 | Cek navigasi nomor soal | Soal belum dijawab berwarna kuning |
| 4 | Practice mode, sampai soal terakhir | Tombol "Berikutnya →" berubah menjadi "Selesai →" |
| 5 | Practice mode, klik "Selesai" di soal terakhir | Layar hasil tampil |
| 6 | Normal mode, klik navigasi ke soal belum dijawab | Bisa jump ke soal tersebut |
| 7 | Normal mode + allow-backward-nav=false, jawab soal 1,2,3 | Dot 1,2 disabled; dot 3+ bisa diklik |
| 8 | Timer habis di tengah kuis | Tetap auto-submit (tidak terpengaruh patch) |

## Rollback

- Revert file `kuis-ledakan.js` ke versi sebelumnya
- Rebuild dan redeploy
- Perilaku kembali seperti semula: auto-submit di soal terakhir, tidak ada tombol selesai, tidak ada unanswered indicator

## Out of Scope

- Tidak ada perubahan di `latihan-kuis.js` (wrapper)
- Tidak ada perubahan di backend Apps Script
- Tidak ada perubahan schema atau DB
- Tidak ada penambahan property HAX baru
