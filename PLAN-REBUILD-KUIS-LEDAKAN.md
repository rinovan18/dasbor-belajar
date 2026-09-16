# Plan: Rebuild kuis-ledakan — Modularization + UX/UI Fix

## Status: IN PROGRESS (reading phase complete, awaiting user confirmation)

---

## 1. Current State Analysis

### Architecture
- **kuis-ledakan.js** = 2857 lines, monolithic LitElement web component
- Already extracted thin modules: `quiz-engine.js` (60 lines), `question-renderer.js` (180 lines), `score-calculator.js` (95 lines)
- These extractions are too thin — `kuis-ledakan.js` still contains ALL rendering, state management, CSS, editor, import/export, session tokens, anti-cheat, backend API calls

### Key Files
| File | Lines | Role |
|------|-------|------|
| `lib/kuis-ledakan.js` | 2857 | Monolith: quiz engine + rendering + state + CSS + editor + API |
| `lib/quiz-engine.js` | 60 | Thin wrapper: timing + suspicious detection |
| `lib/question-renderer.js` | 180 | MC rendering only (PGK/Matching/ShortAnswer not fully used) |
| `lib/score-calculator.js` | 95 | Score calc + grading |
| `lib/timer-kuis.js` | ~300 | Timer component (separate) |
| `lib/latihan-kuis.js` | ~500 | Wrapper: timer + quiz orchestration |
| `lib/codev6.gs` | ~1000 | Google Apps Script backend |

### User's Reported UX/UI Issues
1. **Answer feedback**: "feedback jawaban yang benar tidak terlihat dengan jelas" — correct answer not clearly visible after answering
2. **Answer positioning**: "posisi jawaban yang benar tidak sesuai" — correct answer position wrong
3. **Dark mode**: "styling dark mode yang kurang sempurna" — dark mode incomplete

---

## 2. Proposed Modular Architecture

### 2.1 Module Extraction Plan

Extract from `kuis-ledakan.js` into focused modules following the existing pattern (`static` methods on renderer modules, instance delegation on engine modules):

```
lib/
├── kuis-ledakan.js          ← Main component (slim orchestrator, ~800 lines target)
├── quiz-engine.js           ← Quiz state machine (expand from 60 → ~300 lines)
├── question-renderer.js     ← All question type renderers (expand from 180 → ~400 lines)
├── score-calculator.js      ← Scoring + grading (expand from 95 → ~150 lines)
├── quiz-editor.js           ← NEW: Editor screen logic (extract ~500 lines)
├── quiz-styles.js           ← NEW: CSS tokens + dark mode (extract ~300 lines)
├── quiz-session.js          ← NEW: Session tokens + anti-cheat (extract ~200 lines)
├── quiz-backend.js          ← NEW: GAS API calls (extract ~200 lines)
├── timer-kuis.js            ← Unchanged
├── latihan-kuis.js          ← Unchanged
└── codev6.gs                ← Unchanged
```

### 2.2 Module Responsibilities

#### `quiz-engine.js` (expand)
- `_startQuiz()`, `_selesaiKuis()`, `_autoAdvance()`
- `_pilihJawaban()`, `_submitMultiAnswers()`, `_submitPGK()`, `_submitMatching()`, `_submitShortAnswer()`
- `_restoreAnswerState()`, `_resetState()`, `_canNavigateTo()`
- `_goToQuestion()`, `_goToPrevQuestion()`, `_goToNextQuestion()`
- `_normalisasiSoal()`, `_siapkanSoal()`, `_getActiveQuestions()`

#### `question-renderer.js` (expand)
- `renderMC()` — fix correct answer indicator ✓ positioning
- `renderPGK()` — full implementation (currently inline in kuis-ledakan)
- `renderMatching()` — full implementation
- `renderShortAnswer()` — full implementation
- `renderReviewQuestion()` — review screen per-question
- `renderQuestionNav()` — question navigation dots
- `renderPracticeNav()` — practice mode navigation buttons

#### `quiz-editor.js` (NEW extract)
- `_renderEditorScreen()`, `_renderEditorMC()`, `_renderEditorPGK()`, `_renderEditorMatching()`, `_renderEditorShortAnswer()`
- `_addQuestion()`, `_deleteQuestion()`, `_startEditQuestion()`, `_saveEditQuestion()`, `_cancelEditQuestion()`
- `_handleImportFile()`, `_importFromText()`, `_parseImported()`
- `_openEditor()`, `_saveAll()`, `_cancelAll()`

#### `quiz-styles.js` (NEW extract)
- All CSS from `static get styles()`
- Dark mode tokens (currently ~90 lines of `:host-context(body.dark-mode)`)
- **Fixes**: Add missing dark mode rules for `.choice-row.selected`, `.choice-row.wrong`, review elements

#### `quiz-session.js` (NEW extract)
- `_buatSessionToken()`, `_saveSessionToken()`, `_loadSessionToken()`, `_clearSessionToken()`
- `_cekSesiAktif()`, `_sessionTokenKey()`
- `_saveAttempt()`, `_resumeAttemptIfAny()`, `_attemptKey()`
- `_loadSession()`

#### `quiz-backend.js` (NEW extract)
- `_kirimHasilLangsung()`, `_cekKunci()`, `_bukaKunci()`
- `_muatBankSoal()`, `_buatIdLog()`, `_logActivity()`

#### `kuis-ledakan.js` (slim orchestrator)
- Property declarations + constructor
- `render()` routing (start/question/result/editor/review)
- `_renderStartScreen()`, `_renderResultScreen()`
- `_authHandler()`, `_onStartClick()`, `_redirectToLogin()`
- Lifecycle: `connectedCallback()`, `disconnectedCallback()`, `updated()`
- `haxProperties` configuration

---

## 3. UX/UI Fixes (Apply During Modularization)

### 3.1 Answer Feedback Visibility
**Problem**: After answering MC, the correct answer indicator (✓) may not be prominent enough.
**Fix**:
- Add explicit `.choice-row.correct` styling with background color + bold text + icon
- Add `.choice-row.wrong` with distinct red background
- Ensure `aria-label` on correct/wrong choices includes "✓ Benar" or "✗ Salah"
- Add a summary bar below choices: "✓ Benar: B. Jakarta" or "✗ Salah. Jawaban benar: B. Jakarta"

### 3.2 Correct Answer Position
**Problem**: "posisi jawaban yang benar tidak sesuai" — possibly related to shuffle mapping (`_correctMap`) or review screen rendering.
**Fix**:
- Audit `_correctMap` mapping in `_startQuiz()` when `shuffleChoices` is true
- Ensure `_renderReviewQuestion()` uses `_correctMap` to find original positions
- Add explicit "Kunci jawaban: X" text in review screen for clarity

### 3.3 Dark Mode
**Problem**: "styling dark mode yang kurang sempurna"
**Fix** — add missing dark mode rules:
```css
:host-context(body.dark-mode) .choice-row.selected { 
  border-color: #818cf8; background: #1e1b4b; color: #e0e7ff; 
}
:host-context(body.dark-mode) .choice-row.wrong { 
  border-color: #f87171; background: #7f1d1d; color: #fecaca; 
}
:host-context(body.dark-mode) .choice-row.correct { 
  border-color: #22c55e; background: #064e3b; color: #6ee7b7; 
}
:host-context(body.dark-mode) .feedback-area { 
  background: var(--dk-soft); color: var(--dk-text); 
}
:host-context(body.dark-mode) .review-stat-value { color: var(--dk-text); }
:host-context(body.dark-mode) .review-badge { border-color: var(--dk-border); }
```
- Audit all interactive elements for dark mode coverage
- Ensure timer, editor inputs, and form elements all have dark mode variants

---

## 4. Implementation Strategy

### Step 1: Extract `quiz-styles.js`
- Move all CSS to separate file
- Add missing dark mode rules
- Import in `kuis-ledakan.js`

### Step 2: Extract `quiz-session.js`
- Session tokens, attempt persistence, resume logic
- Pure data operations, no rendering

### Step 3: Extract `quiz-backend.js`
- GAS API calls
- Logging, bank soal, lock management

### Step 4: Extract `quiz-editor.js`
- Editor screen rendering + CRUD operations
- Import/export functionality

### Step 5: Expand `quiz-engine.js`
- Move quiz state machine logic from kuis-ledakan
- Answer submission handlers
- Navigation logic

### Step 6: Expand `question-renderer.js`
- All question type renderers
- Review question renderer
- Navigation dots renderer
- Fix correct answer indicator visibility

### Step 7: Slim down `kuis-ledakan.js`
- Orchestrator only: property declarations, render routing, lifecycle
- Import and delegate to all modules

### Step 8: Test & Validate
- `npm run build` passes
- All question types render correctly
- Dark mode complete
- Review screen shows correct answers clearly
- Practice mode works
- Timer resume works
- Session token anti-cheat works
- Backward navigation works

---

## 5. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking HAX editor integration | Keep `haxProperties` in kuis-ledakan.js, don't change tag |
| Breaking `latihan-kuis.js` passthrough | Keep all public properties/attributes identical |
| Breaking `quiz-user-auth.js` events | Keep event listeners for `quiz-user-login` |
| CSS specificity issues with dark mode | Use same `:host-context(body.dark-mode)` pattern |
| localStorage key changes breaking resume | Keep same `_attemptKey()` and `_sessionTokenKey()` formats |

---

## 6. Open Questions for User

1. Can you describe the "posisi jawaban yang benar tidak sesuai" more specifically? Is it:
   - The checkmark ✓ appears on the wrong choice after answering?
   - The review screen shows the wrong choice as correct?
   - The shuffled order doesn't match between answering and review?

2. For the "feedback jawaban" issue — is the problem:
   - The colored background on correct/wrong choices isn't visible enough?
   - The text feedback message ("Mantap, Benar!" / "Yah, Salah...") is hard to read?
   - In dark mode specifically, or in light mode too?

3. Any other specific dark mode issues beyond the choice rows? (timer, editor, review screen, etc.)

4. Should the editor screen also be modularized, or keep it monolithic in kuis-ledakan for now?

---

## Next Steps

Awaiting user confirmation on:
- Questions in Section 6
- Whether to proceed with full modularization or targeted UX fixes only
- Any additional requirements
