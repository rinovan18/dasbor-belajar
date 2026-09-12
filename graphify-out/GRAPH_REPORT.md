# Graph Report - .  (2026-09-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 480 nodes · 895 edges · 17 communities (6 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8e0a5be8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ModularQuiz
- QuizDashboard
- DATA-CONTOH.md â€” Setup & Sample Data Guide
- AttendanceSystem
- devDependencies
- RuangDiskusi
- package.json
- LatihanKuis
- lit
- KirimTugas
- QuizUserAuth
- TimerMateriKuis
- TimerKuis
- IntegratedForum
- Build and Deploy GitHub Action (gh-pages)
- web-dev-server.config.mjs

## God Nodes (most connected - your core abstractions)
1. `ModularQuiz` - 83 edges
2. `QuizDashboard` - 63 edges
3. `AttendanceSystem` - 42 edges
4. `RuangDiskusi` - 31 edges
5. `LatihanKuis` - 30 edges
6. `KirimTugas` - 23 edges
7. `QuizUserAuth` - 22 edges
8. `TimerMateriKuis` - 18 edges
9. `TimerKuis` - 17 edges
10. `lit` - 12 edges

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

## Communities (17 total, 11 thin omitted)

### Community 2 - "DATA-CONTOH.md â€” Setup & Sample Data Guide"
Cohesion: 0.10
Nodes (47): <dasbor-kuis> Orchestrator (Guru/Dosen/Siswa), Akumulasi Nilai Rapor Sheet (hasil & nilai siswa), Bank Soal Sheet (generator soal MC), db_aktivitas Sheet (log aktivitas / heatmap), db_kehadiran Sheet (absensi lengkap 100%), db_nilai Sheet (hasil kuis), DATA-CONTOH.md â€” Setup & Sample Data Guide, id_log Idempotency (Anti Double-Entry) (+39 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (33): babel-plugin-template-html-minifier, babel-plugin-transform-dynamic-import, @babel/preset-env, commit-and-tag-version, @custom-elements-manifest/analyzer, @open-wc/building-rollup, @open-wc/testing, devDependencies (+25 more)

### Community 6 - "package.json"
Cohesion: 0.06
Nodes (30): author, name, customElements, description, hax, cli, keywords, license (+22 more)

### Community 8 - "lit"
Cohesion: 0.12
Nodes (10): canvas-confetti, @haxtheweb/d-d-d, @haxtheweb/i18n-manager, DEFAULT_QUESTIONS, lit, dependencies, canvas-confetti, @haxtheweb/d-d-d (+2 more)

### Community 14 - "Build and Deploy GitHub Action (gh-pages)"
Cohesion: 1.00
Nodes (3): Build and Deploy GitHub Action (gh-pages), Travis CI Pipeline (npm run test), dasbor-kuis Package (DDD + Lit, OpenWC)

## Knowledge Gaps
- **48 isolated node(s):** `Backend action=getLeaderboard (baca Rangkuman)`, `Backend action=setManualScore (Nilai Manual)`, `Auth actions (register|login|verify)`, `DEFAULT_QUESTIONS`, `name` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lit` connect `lit` to `IntegratedForum`, `package.json`?**
  _High betweenness centrality (0.387) - this node is a cross-community bridge._
- **Why does `ModularQuiz` connect `ModularQuiz` to `lit`?**
  _High betweenness centrality (0.273) - this node is a cross-community bridge._
- **Why does `QuizDashboard` connect `QuizDashboard` to `lit`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **What connects `Backend action=getLeaderboard (baca Rangkuman)`, `Backend action=setManualScore (Nilai Manual)`, `Auth actions (register|login|verify)` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ModularQuiz` be split into smaller, more focused modules?**
  _Cohesion score 0.05642080517190714 - nodes in this community are weakly interconnected._
- **Should `QuizDashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.07168458781362007 - nodes in this community are weakly interconnected._
- **Should `DATA-CONTOH.md â€” Setup & Sample Data Guide` be split into smaller, more focused modules?**
  _Cohesion score 0.09528214616096208 - nodes in this community are weakly interconnected._