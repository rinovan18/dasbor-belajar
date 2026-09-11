# Fix HAXcms Theme Configuration

## Problem
`site.json` is configured to use `@haxtheweb/resume-theme`, which:
1. Is not installed (`node_modules/@haxtheweb/resume-theme/` missing)
2. Is a single-page resume layout, mismatched with the site's multi-page `course` structure
3. Causes a hard theme-load failure

## Decision
Switch to **`clean-one`** theme (Course category). It is designed for multi-page course layouts and matches the existing 7-page quote collection structure. Theme path is `@haxtheweb/clean-one/clean-one.js` per the official `@haxtheweb/haxcms-elements` theme registry.

## Changes

### 1. Update `site.json` theme config
- `metadata.theme.element`: `resume-theme` → `clean-one`
- `metadata.theme.path`: `@haxtheweb/resume-theme/resume-theme.js` → `@haxtheweb/clean-one/clean-one.js`
- `metadata.theme.name`: `resume-theme` → `Clean One`
- `metadata.theme.description`: update to `Start with a blank site using the Clean One`
- Remove `metadata.theme.variables` (theme-specific tokens like `hexCode`, `cssVariable`, `icon`) unless the implementation agent confirms `clean-one` accepts them; `clean-one` does not declare `supportedPalettes` in the registry, so palette variables may be ignored or cause warnings

### 2. Align build version
- Change `metadata.build.version` from `26.0.1` to `25.0.0` to match the latest published `@haxtheweb/haxcms-elements` (25.0.0). This avoids version-skew failures with core CMS elements.
- If the implementation agent confirms all 26.0.0 packages are available and compatible, `26.0.0` is also acceptable.

### 3. Install missing dependencies
- Root: run `npm install` to install `@haxtheweb/haxcms-elements` and other core deps
- Custom: `cd custom && npm install` to install `@haxtheweb/resume-theme` (currently listed) and any other custom deps
  - Note: after switching to `clean-one`, `custom/package.json` can drop the `@haxtheweb/resume-theme` dependency unless it is used elsewhere

### 4. Remove anomalous root file
- Delete the root-level file named `false` to prevent build scripts or file-walkers from misinterpreting it

### 5. Fix timestamps (optional but recommended)
- Update `metadata.site.created` and `metadata.site.updated` from future-dated values (e.g., `1787961888` → Dec 2026) to current/accurate Unix timestamps to avoid date-sensitive theme behavior issues

### 6. Build and validate
- Run the project build (`npm run build` or the site-specific build command)
- Serve locally (`npm run serve` or `npm start`)
- Verify:
  - Theme renders without console errors
  - All 7 pages load and navigation works
  - `theme/theme.css` is still applied as a fallback/enhancement

## Risks
- `clean-one` may not accept the existing `variables` block. If theme variables are required, the implementation agent must map them to `clean-one`'s supported tokens or remove them.
- Version `25.0.0` vs `26.0.0`/`26.0.1`: if the site was originally generated with a newer unreleased build, downgrading to `25.0.0` may change behavior. Validate after build.
