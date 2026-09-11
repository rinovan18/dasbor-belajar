# Graph Report - .  (2026-08-11)

## Corpus Check
- Corpus is ~31,970 words - fits in a single context window. You may not need a graph.

## Summary
- 358 nodes · 638 edges · 13 communities (6 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11

## God Nodes (most connected - your core abstractions)
1. `QuizDashboard` - 56 edges
2. `AttendanceSystem` - 42 edges
3. `ModularQuiz` - 39 edges
4. `RuangDiskusi` - 31 edges
5. `KirimTugas` - 23 edges
6. `QuizUserAuth` - 22 edges
7. `<kuis-ledakan> AKM Quiz Engine` - 11 edges
8. `DATA-CONTOH.md â€” Setup & Sample Data Guide` - 11 edges
9. `Tutorial Semua Properti HAX` - 10 edges
10. `<dasbor-kuis> Orchestrator (Guru/Dosen/Siswa)` - 10 edges

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

## Communities (13 total, 7 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (47): <dasbor-kuis> Orchestrator (Guru/Dosen/Siswa), Akumulasi Nilai Rapor Sheet (hasil & nilai siswa), Bank Soal Sheet (generator soal MC), db_aktivitas Sheet (log aktivitas / heatmap), db_kehadiran Sheet (absensi lengkap 100%), db_nilai Sheet (hasil kuis), DATA-CONTOH.md â€” Setup & Sample Data Guide, id_log Idempotency (Anti Double-Entry) (+39 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (35): canvas-confetti, @haxtheweb/d-d-d, @haxtheweb/i18n-manager, lit, author, name, customElements, dependencies (+27 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (33): babel-plugin-template-html-minifier, babel-plugin-transform-dynamic-import, @babel/preset-env, commit-and-tag-version, @custom-elements-manifest/analyzer, @open-wc/building-rollup, @open-wc/testing, devDependencies (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (6): IntegratedForum, DEFAULT_QUESTIONS, keywords, haxtheweb, lit, webcomponents

### Community 10 - "Community 10"
Cohesion: 1.00
Nodes (3): Build and Deploy GitHub Action (gh-pages), Travis CI Pipeline (npm run test), dasbor-kuis Package (DDD + Lit, OpenWC)

## Knowledge Gaps
- **48 isolated node(s):** `DEFAULT_QUESTIONS`, `name`, `version`, `description`, `license` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `keywords` connect `Community 7` to `Community 4`?**
  _High betweenness centrality (0.263) - this node is a cross-community bridge._
- **Why does `QuizDashboard` connect `Community 0` to `Community 7`?**
  _High betweenness centrality (0.236) - this node is a cross-community bridge._
- **What connects `DEFAULT_QUESTIONS`, `name`, `version` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07922077922077922 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09528214616096208 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10104529616724739 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11605937921727395 - nodes in this community are weakly interconnected._