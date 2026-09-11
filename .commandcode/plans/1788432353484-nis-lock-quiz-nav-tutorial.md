# Tutorial: Patch NIS Lock, File-Soal Reload, Resume, and Question Navigation

Implementation record + deployment tutorial for the patch applied to
`haxtheweb-kuis/elements/dasbor-kuis` on 2026-09-03.

## Scope of the Patch

Three files were modified:

1. `elements/dasbor-kuis/lib/codev6.gs` — Google Apps Script backend.
2. `elements/dasbor-kuis/lib/latihan-kuis.js` — wrapper component.
3. `elements/dasbor-kuis/lib/kuis-ledakan.js` — quiz engine.

No new dependencies, no schema changes, no DB migration required. The
patch is fully backward-compatible: every new property defaults to the
old behaviour, and every guard only fires on a previously-broken
input.

## What Each Fix Does

### 1. Duplicate NIS prevention (backend)

`codev6.gs::register()` is now wrapped in `_denganLock(..., "register")`.
Two simultaneous `register` requests for the same NIS used to race past
the duplicate check, both call `appendRow`, and produce two rows with
the same NIS. The 15-second `tryLock` inside `_denganLock` serialises
register, so only one request reads, checks, and writes at a time.

`codev6.gs::verify()` no longer falls back to NIS lookup. It now
requires `studentId` and returns `{status: "error", message:
"studentId wajib diisi."}` if the field is missing. The frontend
(`quiz-user-auth.js`) already sends `studentId`, so this is a clean-up,
not a behaviour change for live users.

### 2. `soalFileUrl` reload loop (latihan-kuis)

`latihan-kuis.js` added a new state field `_soalFileUrlCache` and a
guard in `updated()`: the JSON file is only fetched when the URL is
different from the cache. `_muatSoalDariFile` now also rejects empty
or non-array payloads and preserves any pre-existing `questions` on
failure instead of overwriting them with `undefined`. The cache is
reset on a failed fetch so a corrected URL is retried.

### 3. Stuck-on-question-1 / corrupt-resume (kuis-ledakan)

`_resumeAttemptIfAny()` now validates that
`Array.isArray(data.questions) && data.questions.length > 0` before
restoring state. Corrupt localStorage entries (from old versions, a
mid-quiz crash, or a manual edit) now clear the key and fall through
to the start screen instead of stranding the user on a blank
`"question"` screen.

`_startQuiz()` now always assigns `_shuffledQuestions` to an array.
Three failure modes are closed: missing `questions` property,
non-array `questions`, and a `shuffleQuestions` collapse that yielded
nothing.

### 4. Question number navigation (kuis-ledakan)

A new property `showQuestionNav` (default `true`, attribute
`show-question-nav`, reflects) renders a row of numbered buttons above
the timer in `_renderQuestionScreen()`.

Behaviour:

- Click any dot to jump to that question.
- The dot for the current question is filled with the primary color.
- Dots for previously-answered questions are outlined in success-green.
- Dots for previously-answered questions whose index is less than the
  current index are disabled and cannot be clicked.
- A new `_answeredSet` (Set of indices) tracks answered questions
  across resets. It is cleared only in `_startQuiz()`, preserved
  across `_resetState()`.
- `_goToQuestion(index)` clears any pending `_advanceTimer` before
  switching indices, so a stale 1800 ms auto-advance from the previous
  question cannot fire after a manual jump.

HAX exposes `showQuestionNav` in `settings.configure` on both
`kuis-ledakan` and `latihan-kuis`. `latihan-kuis` forwards the property
through to the inner `<kuis-ledakan>`.

## Deployment Steps

### Step A — Backend (Apps Script)

1. Open the Apps Script project bound to the target Spreadsheet.
2. Replace `codev6.gs` with the patched file from
   `haxtheweb-kuis/elements/dasbor-kuis/lib/codev6.gs`.
3. Deploy a new version: **Deploy → Manage deployments → ✏ → Version:
   New version → Deploy**.
4. Copy the new Web App URL if it changed. (It should not, since the
   only change is function body.) If it does change, update every
   `apps-script-url` attribute in your HAX pages.

### Step B — One-time data hygiene

The lock fix stops *future* duplicates, but does not retroactively
remove existing duplicates. Before relying on fast `verify()`:

1. Open the Spreadsheet, go to the `Users` sheet.
2. Sort by NIS and delete every row whose NIS is duplicated, keeping
   one canonical row per student. The row with the earliest
   `RegisteredAt` (or the row referenced by existing scores) should
   be the survivor.
3. Optional: add Data Validation on the NIS column with custom
   formula `=COUNTIF($C:$C, C2)=1` to prevent re-introduction.

### Step C — Frontend (HAX site)

1. Build the patched `kuis-ledakan` and `latihan-kuis` per the
   `haxtheweb-kuis` build instructions in its README. (Or copy the
   single-file bundles into your site if you ship them that way.)
2. Redeploy the HAX site.
3. Hard-refresh any open browser tabs that show the quiz (Ctrl+Shift+R
   or Cmd+Shift+R) so the new JS is loaded.

### Step D — Smoke tests

Run the validation matrix from the plan file:

| # | Test | Expected |
|---|------|----------|
| 1 | Register same NIS twice rapidly (two tabs, same form) | Only one row added; second request returns `NIS sudah terdaftar.` |
| 2 | Login with the surviving row | Login completes in <2 s. |
| 3 | Start quiz, answer three questions, reload | Resume returns to the same question with the same shuffled order. |
| 4 | Set `soal-file-url` to a valid JSON, start | Quiz advances past question 1. |
| 5 | On question 1, click dot 3 | Quiz jumps to question 3, no auto-advance. |
| 6 | Answer Q1, Q2, Q3, land on Q4 | Dots 1 and 2 are disabled. |
| 7 | On question 3, click dot 5 | Quiz jumps to question 5. |
| 8 | Set `show-question-nav="false"` in HAX | Nav row is hidden, behaviour unchanged. |
| 9 | Start quiz, then change `soal-file-url` mid-session | Quiz does NOT reload. `_muatSoalDariFile` skips because the URL is the same as cache. |

## Rollback

- Backend: redeploy the previous Apps Script version.
- Frontend: revert the two `.js` files. The new property
  `show-question-nav` is only rendered when the attribute is present,
  so pages that never set it render the same as before.

## Open Items / Future Work

- The 10 s `AbortController` timeout in `quiz-user-auth.js` may trip if
  a second `register` request waits up to 15 s for the lock. If
  contention shows up in production, either lengthen the frontend
  timeout for `register` only or shorten the lock's `tryLock` value.
- ~~The disabled-back-nav rule is intentional per the user preference.
  If full free navigation is wanted later, drop the
  `index < this._currentIdx` clause in `_goToQuestion` and the
  matching disabled-state check in `_renderQuestionScreen`.~~
  **Resolved 2026-09-03** by adding the `allowBackwardNav` HAX property
  (see Appendix A below).

## Appendix A: `allowBackwardNav` Property (added 2026-09-03)

To make the disabled-back-nav rule opt-in instead of hard-coded, a
new boolean property was added. Default is `false` so existing quizzes
keep their current behaviour; teachers who want "open book" navigation
flip the toggle in HAX.

### Files touched (delta)

1. `elements/dasbor-kuis/lib/kuis-ledakan.js`:
   - `static get properties()` — added `allowBackwardNav`
     (`type: Boolean`, `attribute: "allow-backward-nav"`,
     `reflect: true`).
   - constructor — `this.allowBackwardNav = false`.
   - `_goToQuestion(index)` — guard now reads
     `!this.allowBackwardNav && this._answeredSet.has(index) && index < this._currentIdx`.
   - `_renderQuestionScreen()` — `isDisabled` now reads
     `!this.allowBackwardNav && isAnswered && i < this._currentIdx`.
   - `haxProperties.settings.configure` — new entry
     "Izinkan Navigasi Mundur" (boolean, default false).

2. `elements/dasbor-kuis/lib/latihan-kuis.js` (passthrough so the
   wrapper exposes the same toggle):
   - property declaration + `reflect: true`.
   - constructor default `false`.
   - render — `.allowBackwardNav="${this.allowBackwardNav}"` on the
     embedded `<kuis-ledakan>`.
   - HAX `settings.configure` — same entry mirrored.

### Behaviour matrix

| `show-question-nav` | `allow-backward-nav` | Effect |
|---------------------|----------------------|--------|
| `false` (or absent) | any | No nav row rendered. |
| `true`              | `false` (default)    | Nav row; dots for answered questions with lower index are disabled. |
| `true`              | `true`               | Nav row; all dots clickable; answered dots still outlined green for visual history. |

### Usage

```html
<kuis-ledakan
  apps-script-url="..."
  kd-materi="P1"
  show-question-nav
  allow-backward-nav
  questions="[...]">
</kuis-ledakan>
```

Or via `<latihan-kuis>`:

```html
<latihan-kuis
  apps-script-url="..."
  kd-materi="P1"
  soal-file-url="./files/2026-stimulus1-faseE.json"
  show-question-nav
  allow-backward-nav>
</latihan-kuis>
```

In HAX editor: panel Properties gains a toggle
**"Izinkan Navigasi Mundur"** (default OFF) alongside the existing
**"Tampilkan Navigasi Nomor Soal"** toggle.

### Trade-off notes

- `_goToQuestion` still calls `_resetState()`, but `_score` is not
  adjusted, so a re-answered (backward-jumped) question does not
  double-count or zero out the previous correct answer. If strict
  "re-evaluate on revisit" is wanted later, subtract the question's
  points from `_score` in `_goToQuestion` before the jump.
- `_answeredSet` is still useful as a visual marker (green outline)
  and is preserved across `_resetState()` and resume from
  localStorage.

## Implementation Checklist

Status of all changes shipped in this tutorial:

- [x] `codev6.gs` — `register()` wrapped in `_denganLock(..., "register")`.
- [x] `codev6.gs` — `verify()` requires `studentId`, returns clear error.
- [x] `latihan-kuis.js` — `_soalFileUrlCache` state property added.
- [x] `latihan-kuis.js` — `updated()` guard prevents refetch on identical URL.
- [x] `latihan-kuis.js` — `_muatSoalDariFile` preserves existing `questions` on failure.
- [x] `kuis-ledakan.js` — `_resumeAttemptIfAny` validates `data.questions` is non-empty array.
- [x] `kuis-ledakan.js` — `_startQuiz` clears `_answeredSet` and guarantees `_shuffledQuestions` is array.
- [x] `kuis-ledakan.js` — `showQuestionNav` property (default `true`, reflect).
- [x] `kuis-ledakan.js` — `_answeredSet` state property + constructor init.
- [x] `kuis-ledakan.js` — `_goToQuestion` method with `_advanceTimer` clear.
- [x] `kuis-ledakan.js` — `_answeredSet.add(_currentIdx)` before every `_autoAdvance()` call.
- [x] `kuis-ledakan.js` — nav `<nav>` rendering in `_renderQuestionScreen`.
- [x] `kuis-ledakan.js` — CSS for `.question-nav` and `.q-dot`.
- [x] `kuis-ledakan.js` — HAX `settings.configure` entry for `showQuestionNav`.
- [x] `latihan-kuis.js` — `showQuestionNav` passthrough property + render.
- [x] `latihan-kuis.js` — HAX entry for `showQuestionNav`.
- [x] `kuis-ledakan.js` — `allowBackwardNav` property (default `false`, reflect).
- [x] `kuis-ledakan.js` — `_goToQuestion` and `_renderQuestionScreen` honour `allowBackwardNav`.
- [x] `kuis-ledakan.js` — HAX entry for `allowBackwardNav`.
- [x] `latihan-kuis.js` — `allowBackwardNav` passthrough property + render.
- [x] `latihan-kuis.js` — HAX entry for `allowBackwardNav`.
- [x] Both `.js` files pass `node --check` cleanly.

### Out of scope (still open)

- [ ] Decide on lock timeout vs frontend timeout for `register`
  (see Open Items #1).
- [ ] Decide whether backward-jump should re-evaluate the score
  (see Appendix A trade-off notes).
- [ ] Optional: `maxBackwardNav: Number` for "allow back N only"
  variant. Not implemented; use `allowBackwardNav` as the supported
  toggle for now.
