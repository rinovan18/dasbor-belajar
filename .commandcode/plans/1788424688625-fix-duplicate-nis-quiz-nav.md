# Plan: NIS dedup, question navigation, practice mode, hints, review screen

## Context
Repository: `C:\Users\Dragon\Documents\github\andyid23\haxtheweb-kuis`
Target component folder: `elements\dasbor-kuis`

## Status Checklist (apa sudah selesai)

| # | Task | Status | Bukti di kode |
|---|------|--------|---------------|
| 1.1 | `register()` wrapped with `_denganLock()` | **DONE** | `codev6.gs:520` |
| 1.2 | `verify()` uses `studentId` only (no NIS fallback) | **DONE** | `codev6.gs:598-617` |
| 2.1 | `_soalFileUrlCache` + reload guard di `updated()` | **DONE** | `latihan-kuis.js:74, 334-343` |
| 2.2 | `_muatSoalDariFile()` guard invalid array | **DONE** | `latihan-kuis.js:345-361` |
| 3.1 | `_resumeAttemptIfAny()` validasi localStorage | **DONE** | `kuis-ledakan.js:1378` |
| 3.2 | `_startQuiz()` selalu init `_shuffledQuestions` | **DONE** | `kuis-ledakan.js:918-940` |
| 4.1 | `showQuestionNav` + `allowBackwardNav` properties | **DONE** | `kuis-ledakan.js:264-273` |
| 4.2 | Nav dots render di `_renderQuestionScreen()` | **DONE** | `kuis-ledakan.js:1465-1482` |
| 4.3 | CSS untuk `.question-nav .q-dot` | **DONE** | `kuis-ledakan.js:432-461` |
| 4.4 | `_answeredSet` tracking di semua handler | **DONE** | `kuis-ledakan.js:917,1004,1046,1091,1131` |
| 4.5 | `_goToQuestion(index)` + disabled logic | **DONE** | `kuis-ledakan.js:1165-1183` |
| 5.1 | `showQuestionNav` di haxProperties | **DONE** | `kuis-ledakan.js:111-116` |
| 1.3 | Google Sheets data validation (manual) | **PENDING** — manual step | — |
| **6** | Hint/instruction field per soal | **DONE** | `kuis-ledakan.js:805, 1495-1497` |
| **7** | Practice mode (Next/Back, no auto-advance) | **DONE** | `kuis-ledakan.js:296-312, 1207, 1705-1720` |
| **8** | Review screen (Tinjau Jawaban) | **DONE** | `kuis-ledakan.js:1506-1610` |
| **9** | Tutorial example JSON | **DONE** | `demo/soal-latihan-hint.json` |

## Penjelasan NIS Fallback (codev6.gs:555-617)

**`login()`** (baris 555-596) cocokkan NIS **dan** email:
```javascript
const u = users.rows.find((r) => {
  const okNis = _teks(_val(r, users.header, "NIS")) === nis;
  const okEmail = _teks(_val(r, users.header, "Email")).toLowerCase() === email;
  return okNis && okEmail;
});
```
Jika ada duplikat NIS, `find()` kembali baris pertama — user salah bisa login. Tapi karena mencocokkan NIS **dan** email (2-faktor), duplikat NIS saja tidak cukup untuk mengerjudotkan ke akun orang lain.

**`verify()`** (baris 598-617) sudah pure studentId — tidak fallback ke NIS. Sudah benar.

**Fix tersisa:** Buat NIS unik via Google Sheets Data Validation (Task 1.3, manual).

## Perubahan yang Diimplementasikan

### Task 6: Per-question Hint/Instruction
- `_siapkanSoal()` sekarang mengembalikan `hint: soal.hint || ""`
- `<details class="hint-box">` dirender di `_renderQuestionScreen()` setelah `question-text`
- CSS: `.hint-box`, `.hint-box summary` (💡 Petunjuk)
- Dokumentasi di haxProperties deskripsi `questions`

### Task 7: Practice Mode + Question Delay
- Properties baru: `practiceMode` (Boolean, default false), `questionDelay` (Number, default 1800)
- `_autoAdvance()` returns early if `practiceMode` — tidak auto-advance
- `_autoAdvance()` pakai `this.questionDelay` instead of hardcoded 1800ms
- Next/Back buttons dirender di `_renderQuestionScreen()` saat `practiceMode` aktif
- `_goToPrevQuestion()` dan `_goToNextQuestion()` methods baru
- `_goToQuestion()` — practice mode bypass backward nav restriction
- haxProperties: `practiceMode` dan `questionDelay` ditambahkan ke settings

### Task 8: Review Screen (Tinjau Jawaban)
- Properties baru: `reviewAnswers` (Boolean, default true), `_reviewMode` (state), `_userAnswers` (Map state)
- `_startQuiz()` reset `_reviewMode` dan `_userAnswers`
- "Tinjau Jawaban" button di result screen
- `_renderReviewScreen()` — full-screen review dengan:
  - Ringkasan (Benar/Salah/Dilewati)
  - Daftar semua soal dengan jawaban yang dipilih + kunci jawaban
  - Badge ✓ Benar / ✗ Salah per soal
  - "Selesai" button
- `_renderReviewQuestion()` — render per-question review (MC, shortAnswer)
- Semua submit handlers sekarang menyimpan data jawaban ke `_userAnswers` Map
- CSS: `.review-summary`, `.review-stat`, `.review-question`, `.review-mc`, `.review-badge`, etc.
- Dark mode CSS untuk semua element review

### Task 9: Tutorial Example
- `demo/soal-latihan-hint.json` — 5 soal dengan format baru (question/choices/correctIndex/correctAnswers/hint)
- Contoh penggunaan HAX di plan dokumentasi

### latihan-kuis.js passthrough
- Properties: `practiceMode`, `questionDelay`, `reviewAnswers` ditambahkan
- Passthrough ke `<kuis-ledakan>`: `.practiceMode`, `.questionDelay`, `.reviewAnswers`
- haxProperties settings diupdate

## Files Modified
1. `elements\dasbor-kuis\lib\kuis-ledakan.js` — Tasks 6, 7, 8, 9
2. `elements\dasbor-kuis\lib\latihan-kuis.js` — Passthrough properties
3. `elements\dasbor-kuis\demo\soal-latihan-hint.json` — Tutorial example (new file)
4. `elements\dasbor-kuis\custom-elements.json` — Updated by `npm run analyze`

## Validation
- **Tests:** 57 passed, 3 failed (pre-existing a11y timeout — not related to changes)
- **Analyzer:** `npm run analyze` completed successfully

## Rollout Order
1. ✅ Backend dedup (already in code)
2. ✅ Frontend state fixes (already in code)
3. ✅ Navigation (already in code)
4. ✅ New: hint field, practice mode, question delay, review screen
5. **MANUAL:** Add NIS column data validation in Google Sheets
6. Test end-to-end with `demo/soal-latihan-hint.json`
