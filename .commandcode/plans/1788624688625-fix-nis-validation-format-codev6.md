# Plan: Fix NIS Validation & Format in `codev6.gs`

## Context
Repository: `C:\Users\Dragon\Documents\github\andyid23\haxtheweb-kuis\elements\dasbor-kuis`
Target file: `lib\codev6.gs`

Three bugs remain in `codev6.gs` from the NIS validation/format task:

## Bugs Identified

### Bug 1: `register()` — `setNumberFormat` called before `users` is declared (line 522)
```javascript
// CURRENT (BROKEN):
users.getRange(2, 2, users.getLastRow(), 1).setNumberFormat(String.fromCharCode(64));
const users = _ss().getSheetByName(SHEET_USERS);  // users not defined yet!
```
This throws a `ReferenceError` because `users` is used before `const users` declaration.

**Fix:** Move `setNumberFormat` call to AFTER `const users = ...` line.

### Bug 2: `initSheets()` — malformed `setNumberFormat` string (line 1011)
```javascript
// CURRENT (BROKEN):
usersSheet.getRange(2, 2, lastRow - 1, 1).setNumberFormat('\''@'\'');
```
The `'\''@'\''` is a malformed string literal from PowerShell escaping. It should be `'@'` or `String.fromCharCode(64)`.

**Fix:** Replace with `String.fromCharCode(64)`.

### Bug 3: `register()` — NIS validation lines have wrong indentation (lines 533-534)
```javascript
// CURRENT (BROKEN - 4-space indent instead of proper):
if (!nis) return { status: "error", message: "NIS wajib diisi." };
if (!/^\d{5}$/.test(nis)) return { status: "error", message: "NIS harus 5 digit angka." };
```
These lines lack the 4-space indentation matching the surrounding code block.

**Fix:** Add proper 4-space indentation to both lines.

## Changes Required

| # | File | Line(s) | Change |
|---|------|---------|--------|
| 1 | `lib\codev6.gs` | 522-523 | Move `setNumberFormat` call after `const users` declaration |
| 2 | `lib\codev6.gs` | 533-534 | Fix indentation of NIS validation `if` statements |
| 3 | `lib\codev6.gs` | 1011 | Replace `'\''@'\''` with `String.fromCharCode(64)` |

## Validation
- Verify `codev6.gs` has no syntax errors by checking for `ReferenceError` patterns
- Confirm `setNumberFormat` calls use `String.fromCharCode(64)` consistently
- Confirm NIS validation lines are properly indented within `register()` function body
- Run `npm test` and `npm run analyze` to confirm no regressions

## Rollout Order
1. Fix Bug 1: Move `setNumberFormat` in `register()` after `const users`
2. Fix Bug 2: Replace malformed string in `initSheets()`
3. Fix Bug 3: Fix indentation of NIS validation lines
4. Validate with `npm test` and `npm run analyze`
