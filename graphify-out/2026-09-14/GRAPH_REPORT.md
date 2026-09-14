# Graph Report - .  (2026-09-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 786 nodes · 1257 edges · 36 communities (21 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e4345323`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ModularQuiz
- QuizDashboard
- DATA-CONTOH.md â€” Setup & Sample Data Guide
- LatihanKuis
- AttendanceSystem
- package.json
- Timer Fix Plan for Latihan-Kuis
- lit
- devDependencies
- RuangDiskusi
- Kesulitan yang Dihadapi
- KirimTugas
- Tutorial: Patch NIS Lock, File-Soal Reload, Resume, and Question Navigation
- QuizUserAuth
- TemaCeriaDasbor
- TimerMateriKuis
- TimerKuis
- Patch: Tombol Selesai, Stop Auto-Submit, dan Unanswered Indicator
- Plan: NIS dedup, question navigation, practice mode, hints, review screen
- BackendApi
- Changes
- Comprehensive Timer Fix & State Persistence Plan
- Panduan `<latihan-kuis>`
- Plan: Fix NIS Validation & Format in `codev6.gs`
- IntegratedForum
- Rekomendasi Arsitektur `dasbor-kuis`
- ModeHandler
- BankSoal — Per Sel + Kode Materi/LM
- Panduan kuis-ledakan (Acak Soal, PG 5 Pilihan, Kunci Otomatis, Rekap Terbaik per KD)
- Memory
- Command Code import report
- taste/taste.md
- Build and Deploy GitHub Action (gh-pages)
- web-dev-server.config.mjs

## God Nodes (most connected - your core abstractions)
1. `ModularQuiz` - 84 edges
2. `QuizDashboard` - 81 edges
3. `LatihanKuis` - 44 edges
4. `AttendanceSystem` - 42 edges
5. `RuangDiskusi` - 31 edges
6. `KirimTugas` - 23 edges
7. `QuizUserAuth` - 22 edges
8. `TemaCeriaDasbor` - 22 edges
9. `TimerMateriKuis` - 18 edges
10. `TimerKuis` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Planned lib/ledakan-kuis.js Quiz Engine` --semantically_similar_to--> `<kuis-ledakan> AKM Quiz Engine`  [INFERRED] [semantically similar]
  promptlengkap-dasbor-kuis.txt → demo/soal-akm-lengkap.html
- `Planned 3-Sheet GAS Schema (V3)` --semantically_similar_to--> `codev5.gs Backend (main Apps Script, 8 sheets)`  [INFERRED] [semantically similar]
  promptlengkap-dasbor-kuis.txt → DATA-CONTOH.md
- `Planned lib/diskusi-tugas.js Forum & Task` --semantically_similar_to--> `<ruang-diskusi> Forum (threaded discussion)`  [INFERRED] [semantically similar]
  promptlengkap-dasbor-kuis.txt → demo/ruang-diskusi.html
- `Planned lib/diskusi-tugas.js Forum & Task` --semantically_similar_to--> `<kirim-tugas> Assignment Submission`  [INFERRED] [semantically similar]
  promptlengkap-dasbor-kuis.txt → demo/kirim-tugas.html
- `Build and Deploy GitHub Action (gh-pages)` --conceptually_related_to--> `Travis CI Pipeline (npm run test)`  [INFERRED]
  .github/workflows/main.yml → .travis.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Backend Data Flow â€” Input Sheets â†’ generateReport â†’ Derived Sheets** — elements_dasbor_kuis_data_contoh_users_sheet, elements_dasbor_kuis_data_contoh_db_aktivitas_sheet, elements_dasbor_kuis_data_contoh_db_nilai_sheet, elements_dasbor_kuis_lib_codev5_gs_generatereport, elements_dasbor_kuis_data_contoh_rangkuman_sheet, elements_dasbor_kuis_data_contoh_akumulasi_nilai_rapor_sheet [EXTRACTED 1.00]
- **Idempotent Offline-First Sync Pipeline** — elements_dasbor_kuis_data_contoh_id_log_idempotency, elements_dasbor_kuis_demo_tutorial_hax_a3_v5_sync_queue, elements_dasbor_kuis_lib_codev5_gs_logactivity, elements_dasbor_kuis_lib_codev5_gs_deduptransaksi [EXTRACTED 1.00]
- **Shared Student Session (a3_v5_student_profile) Across Components** — elements_dasbor_kuis_lib_quiz_user_auth_js_quiz_user_auth, elements_dasbor_kuis_demo_quiz_user_auth_a3_v5_student_profile, elements_dasbor_kuis_dasbor_kuis_js_dasbor_kuis, elements_dasbor_kuis_lib_kuis_ledakan_js_kuis_ledakan, elements_dasbor_kuis_lib_sistem_kehadiran_js_sistem_kehadiran, elements_dasbor_kuis_lib_ruang_diskusi_js_ruang_diskusi, elements_dasbor_kuis_lib_kirim_tugas_js_kirim_tugas [EXTRACTED 1.00]

## Communities (36 total, 15 thin omitted)

### Community 2 - "DATA-CONTOH.md â€” Setup & Sample Data Guide"
Cohesion: 0.10
Nodes (47): <dasbor-kuis> Orchestrator (Guru/Dosen/Siswa), Akumulasi Nilai Rapor Sheet (hasil & nilai siswa), Bank Soal Sheet (generator soal MC), db_aktivitas Sheet (log aktivitas / heatmap), db_kehadiran Sheet (absensi lengkap 100%), db_nilai Sheet (hasil kuis), DATA-CONTOH.md â€” Setup & Sample Data Guide, id_log Idempotency (Anti Double-Entry) (+39 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (38): canvas-confetti, @haxtheweb/d-d-d, @haxtheweb/i18n-manager, author, name, customElements, dependencies, canvas-confetti (+30 more)

### Community 6 - "Timer Fix Plan for Latihan-Kuis"
Cohesion: 0.05
Nodes (37): 1. Fix Timer Resume Logic, 2. Fix Timer Component Initialization, 3. Fix State Synchronization, 4. Add Navigation State Validation, Conclusion, Dependencies:, Dependencies and Requirements, Edge Cases: (+29 more)

### Community 7 - "lit"
Cohesion: 0.07
Nodes (5): DEFAULT_QUESTIONS, QuestionRenderer, QuizEngine, ScoreCalculator, lit

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): babel-plugin-template-html-minifier, babel-plugin-transform-dynamic-import, @babel/preset-env, commit-and-tag-version, @custom-elements-manifest/analyzer, @open-wc/building-rollup, @open-wc/testing, devDependencies (+25 more)

### Community 10 - "Kesulitan yang Dihadapi"
Cohesion: 0.07
Nodes (29): 1. Answer Timing Analysis, 1. Navigasi Soal & Jawaban, 1. Permission Restrictions pada Bash Tool, 2. Indikator Visual, 2. Question Pool Rotation, 2. Tool `edit` dan `write` Tidak Tersedia, 3. Dua Salinan File Perlu Dipatch, 3. Session Token (+21 more)

### Community 12 - "Tutorial: Patch NIS Lock, File-Soal Reload, Resume, and Question Navigation"
Cohesion: 0.09
Nodes (21): 1. Duplicate NIS prevention (backend), 2. `soalFileUrl` reload loop (latihan-kuis), 3. Stuck-on-question-1 / corrupt-resume (kuis-ledakan), 4. Question number navigation (kuis-ledakan), Appendix A: `allowBackwardNav` Property (added 2026-09-03), Behaviour matrix, Deployment Steps, Files touched (delta) (+13 more)

### Community 17 - "Patch: Tombol Selesai, Stop Auto-Submit, dan Unanswered Indicator"
Cohesion: 0.12
Nodes (15): 1. Hentikan Auto-Submit di Soal Terakhir, 2. Tombol "Selesai — Lihat Skor" di Soal Terakhir, 3. Indikator Soal Belum Dikerjai di Navigasi, 4. Perbaikan Tombol "Berikutnya" di Practice Mode, Behaviour Matrix, Deployment Steps, File Modified, Navigasi Soal Visual (+7 more)

### Community 18 - "Plan: NIS dedup, question navigation, practice mode, hints, review screen"
Cohesion: 0.14
Nodes (13): Context, Files Modified, latihan-kuis.js passthrough, Penjelasan NIS Fallback (codev6.gs:555-617), Perubahan yang Diimplementasikan, Plan: NIS dedup, question navigation, practice mode, hints, review screen, Rollout Order, Status Checklist (apa sudah selesai) (+5 more)

### Community 20 - "Changes"
Cohesion: 0.17
Nodes (11): 1. Update `site.json` theme config, 2. Align build version, 3. Install missing dependencies, 4. Remove anomalous root file, 5. Fix timestamps (optional but recommended), 6. Build and validate, Changes, Decision (+3 more)

### Community 21 - "Comprehensive Timer Fix & State Persistence Plan"
Cohesion: 0.17
Nodes (11): 2.1 Remove Navigation Restriction, 2.2 Add Browser Visibility Event Handler, 2.3 Add Quiz Start/Finish Logging, 2.4 Sync & Build, Comprehensive Timer Fix & State Persistence Plan, Implementation Steps, Overview, Phase 1: Already Implemented (Plan A) (+3 more)

### Community 22 - "Panduan `<latihan-kuis>`"
Cohesion: 0.17
Nodes (11): Apa itu `<latihan-kuis>`, Atribut / Properti (dan pemetaan panel HAX), Auth siswa (wajib login — anti hilang nilai), Cara Mengimpor Soal dari File, Catatan HAXcms, Keamanan, Keterbatasan, Mengapa bisa membungkus `<kuis-ledakan>` (+3 more)

### Community 23 - "Plan: Fix NIS Validation & Format in `codev6.gs`"
Cohesion: 0.20
Nodes (9): Bug 1: `register()` — `setNumberFormat` called before `users` is declared (line 522), Bug 2: `initSheets()` — malformed `setNumberFormat` string (line 1011), Bug 3: `register()` — NIS validation lines have wrong indentation (lines 533-534), Bugs Identified, Changes Required, Context, Plan: Fix NIS Validation & Format in `codev6.gs`, Rollout Order (+1 more)

### Community 25 - "Rekomendasi Arsitektur `dasbor-kuis`"
Cohesion: 0.22
Nodes (8): 1. Komposisi > Duplikasi, 2. Skema Soal Tunggal (AKM), 3. Keamanan Default-Deny (data siswa), 4. Konsistensi DDD (tanpa hardcode hex), 5. Edit Soal di Layer Komposisi, 6. Jaga `npm run sync` & Tambah Pengujian, Rekomendasi Arsitektur `dasbor-kuis`, Ringkasan

### Community 27 - "BankSoal — Per Sel + Kode Materi/LM"
Cohesion: 0.29
Nodes (6): BankSoal — Per Sel + Kode Materi/LM, Cara Copas Tinggal Pakai, Contoh 3 baris untuk LM1–LM3, Guard Shell Ceria, Sheet `Bank Soal` (`lib/codev6.gs:85`), Verifikasi

### Community 28 - "Panduan kuis-ledakan (Acak Soal, PG 5 Pilihan, Kunci Otomatis, Rekap Terbaik per KD)"
Cohesion: 0.29
Nodes (6): 1. Rekomendasi Default (hasil keputusan), 2. Alur Siswa, 3. Alur Guru, 4. Nilai Masuk ke Rapor, 5. Hal Penting, Panduan kuis-ledakan (Acak Soal, PG 5 Pilihan, Kunci Otomatis, Rekap Terbaik per KD)

### Community 29 - "Memory"
Cohesion: 0.33
Nodes (5): Architecture Notes, Code Style Guidelines, Common Workflows, Memory, Project Overview

### Community 30 - "Command Code import report"
Cohesion: 0.40
Nodes (4): Claude Code, Codex, Command Code import report, OpenCode

### Community 32 - "Build and Deploy GitHub Action (gh-pages)"
Cohesion: 1.00
Nodes (3): Build and Deploy GitHub Action (gh-pages), Travis CI Pipeline (npm run test), dasbor-kuis Package (DDD + Lit, OpenWC)

## Knowledge Gaps
- **199 isolated node(s):** `name`, `version`, `description`, `license`, `name` (+194 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lit` connect `lit` to `IntegratedForum`, `package.json`, `TimerMateriKuis`?**
  _High betweenness centrality (0.293) - this node is a cross-community bridge._
- **Why does `ModularQuiz` connect `ModularQuiz` to `lit`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `QuizDashboard` connect `QuizDashboard` to `lit`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _199 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ModularQuiz` be split into smaller, more focused modules?**
  _Cohesion score 0.0546218487394958 - nodes in this community are weakly interconnected._
- **Should `QuizDashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.05617283950617284 - nodes in this community are weakly interconnected._
- **Should `DATA-CONTOH.md â€” Setup & Sample Data Guide` be split into smaller, more focused modules?**
  _Cohesion score 0.09528214616096208 - nodes in this community are weakly interconnected._