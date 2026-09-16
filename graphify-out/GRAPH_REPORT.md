# Graph Report - .  (2026-09-16)

## Corpus Check
- 55 files · ~94,149 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 435 nodes · 744 edges · 29 communities (12 shown, 17 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Quiz Engine Core
- Practice Quiz System
- Component Ecosystem
- Dashboard & Demos
- Build Toolchain
- Package Config
- Dev Plans & Preferences
- Dependencies & Tests
- User Authentication
- Backend & API
- Guides & Data Docs
- Product Requirements
- Timer Fix Plans
- Theme Config Fix
- CI/CD Pipeline
- Project Memory
- Import Report
- Quiz Dashboard
- Backend API Client
- Discussion Forum
- Assignment Submission
- Mode Handler
- Quiz Engine Module
- Discussion Room
- Score Calculator
- Attendance System
- Cerias Theme
- Quiz Timer
- Material Timer

## God Nodes (most connected - your core abstractions)
1. `ModularQuiz` - 92 edges
2. `LatihanKuis` - 63 edges
3. `QuizUserAuth` - 22 edges
4. `<dasbor-kuis> Dashboard Component` - 14 edges
5. `<kuis-ledakan> Interactive Quiz Engine` - 14 edges
6. `User Preferences` - 13 edges
7. `Backend Apps Script (codev5.gs v5.1)` - 10 edges
8. `scripts` - 9 edges
9. `quiz-user-auth component` - 9 edges
10. `dasbor-kuis component` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Build and Deploy GitHub Action (gh-pages)` --conceptually_related_to--> `Travis CI Pipeline (npm run test)`  [INFERRED]
  .github/workflows/main.yml → .travis.yml
- `Build and Deploy GitHub Action (gh-pages)` --references--> `dasbor-kuis Package (DDD + Lit, OpenWC)`  [INFERRED]
  .github/workflows/main.yml → README.md
- `Travis CI Pipeline (npm run test)` --references--> `dasbor-kuis Package (DDD + Lit, OpenWC)`  [INFERRED]
  .travis.yml → README.md
- `Backend-Aware Client Design` --conceptually_related_to--> `Idempotency Mechanism (Anti Double-Entry)`  [INFERRED]
  .commandcode/taste/user-preferences/taste.md → DATA-CONTOH.md
- `Score-to-Raport Flow` --conceptually_related_to--> `Akumulasi Nilai Rapor Sheet Schema`  [INFERRED]
  PANDUAN-KUIS-LEDAPAN.md → DATA-CONTOH.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Anti-Cheating Feature Recommendations** — commandcode_plans_1788596512240-anti-cheating-checklist_anti_cheating_checklist, commandcode_plans_1788596512240-anti-cheating-checklist_tab_switch_detection, commandcode_plans_1788596512240-anti-cheating-checklist_fullscreen_enforcement, commandcode_plans_1788596512240-anti-cheating-checklist_answer_timing_analysis, commandcode_plans_1788596512240-anti-cheating-checklist_session_token_anti_multi_login, commandcode_plans_1788596512240-anti-cheating-checklist_question_pool_rotation [EXTRACTED 1.00]
- **Quiz Component Triad (kuis-ledakan + timer-kuis + latihan-kuis)** — commandcode_plans_1788931168148-timer-fix-plan_timer_resume_logic, commandcode_plans_1788931168148-timer-fix-plan_navigation_state_validation, commandcode_plans_1788424688625-fix-duplicate-nis-quiz-nav_question_navigation, commandcode_plans_1788424688625-fix-duplicate-nis-quiz-nav_practice_mode, panduan-latihan-kuis_md_latihan_kuis_orchestration [INFERRED 0.85]
- **Google Sheets Data Architecture (Users, Scores, Activity, Reports)** — data-contoh_md_sample_data, data-contoh_md_users_sheet, data-contoh_md_db_nilai_sheet, data-contoh_md_db_aktivitas_sheet, data-contoh_md_akumulasi_nilai_rapor_sheet, data-contoh_md_rangkuman_sheet [EXTRACTED 1.00]
- **Backend API Action Set (codev5.gs v5.1)** — demo_contoh_api_langsung_html_generate_report, demo_contoh_api_langsung_html_get_leaderboard, demo_contoh_api_langsung_html_get_student_roster, demo_contoh_api_langsung_html_get_scores, demo_contoh_api_langsung_html_get_activity_history, demo_contoh_api_langsung_html_login_action, backend_log_activity_action [EXTRACTED 1.00]
- **Composition Orchestrator Pattern (latihan-kuis wraps kuis-ledakan + timer + auth)** — components_latihan_kuis, components_kuis_ledakan, components_timer_kuis, components_quiz_user_auth [INFERRED 0.95]
- **LM1 Full-Stack Integration Page (dasbor + quiz + discussion + assignment + attendance)** — demo_lm1_remidi_html, demo_lm1_terintegrasi_html, components_dasbor_kuis, components_latihan_kuis, components_ruang_diskusi, components_kirim_tugas, components_sistem_kehadiran [EXTRACTED 1.00]
- **AKM Question JSON Pipeline (demo format ↔ Bank Soal store ↔ quiz components)** — demo_soal_akm_lengkap_akm_question_types, lib_kuis_ledakan_kuis_ledakan, docs_banksoal_per_sel_bank_soal_sheet_schema, lib_latihan_kuis_latihan_kuis [INFERRED 0.85]
- **Student Login & Identity Sync Flow (quiz_user_session → a3_v5_student_profile)** — lib_quiz_user_auth_quiz_user_auth, demo_quiz_user_auth_session_protocol, demo_login_guestlogin, dasbor_kuis_dasbor_kuis, lib_kuis_ledakan_kuis_ledakan, lib_ruang_diskusi_ruang_diskusi [INFERRED 0.85]
- **Tutor Documentation Series: logActivity → sheets → generateReport pipeline** — demo_tutor_akm_sheet_page, demo_tutor_rangkuman_page, demo_tutor_akumulasi_nilai_rapor_page, demo_tutor_merdeka_v6_page [INFERRED 0.85]

## Communities (29 total, 17 thin omitted)

### Community 2 - "Component Ecosystem"
Cohesion: 0.09
Nodes (42): <dasbor-kuis> Dashboard Component, <kirim-tugas> Assignment Submission Component, <kuis-ledakan> Interactive Quiz Engine, <latihan-kuis> Quiz Practice Wrapper, <quiz-user-auth> Login/Registration Component, <ruang-diskusi> Discussion Forum Component, <sistem-kehadiran> Attendance & Reading Room, <tema-ceria-dasbor> Themed Dashboard Shell (+34 more)

### Community 3 - "Dashboard & Demos"
Cohesion: 0.10
Nodes (37): dasbor-kuis component, Guest Login Flow (localStorage session seeding), Login Page (Dasbor Kuis User Login), Quiz User Auth Demo Page, Student Session Protocol (quiz_user_session / a3_v5_student_profile), Ruang Diskusi Demo Page (Threaded Discussion), AKM Question Types & Scoring Formats (PG, PGK, Matching, Short Answer), Soal AKM Lengkap Demo Page (+29 more)

### Community 4 - "Build Toolchain"
Cohesion: 0.06
Nodes (33): babel-plugin-template-html-minifier, babel-plugin-transform-dynamic-import, @babel/preset-env, commit-and-tag-version, @custom-elements-manifest/analyzer, @open-wc/building-rollup, @open-wc/testing, devDependencies (+25 more)

### Community 5 - "Package Config"
Cohesion: 0.07
Nodes (27): author, name, customElements, description, hax, cli, license, main (+19 more)

### Community 6 - "Dev Plans & Preferences"
Cohesion: 0.09
Nodes (27): NIS Dedup, Navigation, Practice Mode, Hints, Review Screen Plan, Practice Mode, Question Navigation (Nav Dots), Review Screen (Tinjau Jawaban), Allow Backward Navigation, Duplicate NIS Prevention, NIS Lock, File-Soal Reload, Resume, and Navigation Tutorial, Answer Timing Analysis (+19 more)

### Community 7 - "Dependencies & Tests"
Cohesion: 0.09
Nodes (14): canvas-confetti, @haxtheweb/d-d-d, @haxtheweb/i18n-manager, DEFAULT_QUESTIONS, QuestionRenderer, lit, dependencies, canvas-confetti (+6 more)

### Community 9 - "Backend & API"
Cohesion: 0.22
Nodes (19): Anti Double-Entry Deduplication (idempotency), Backend Apps Script (codev5.gs v5.1), logActivity Backend Action, Akumulasi Nilai Rapor (Report Grades Sheet), Bank Soal (Question Bank Sheet), db_aktivitas (Activity Log Sheet), db_nilai (Quiz Scores Sheet), Rangkuman (Class Leaderboard Sheet) (+11 more)

### Community 10 - "Guides & Data Docs"
Cohesion: 0.12
Nodes (16): Backend-Aware Client Design, Activity Rate Limits, Akumulasi Nilai Rapor Sheet Schema, db_aktivitas Sheet Schema, db_nilai Sheet Schema, Idempotency Mechanism (Anti Double-Entry), Rangkuman Sheet Schema, Sample Data for Dasbor Evaluasi V5 (+8 more)

### Community 11 - "Product Requirements"
Cohesion: 0.33
Nodes (6): Planned lib/diskusi-tugas.js Forum & Task, Attendance Engine via kriteria_wajib, Planned lib/ledakan-kuis.js Quiz Engine, PRD: Refactor <dasbor-kuis> (V3, offline-first), State-Locked Sync (_isFlushing + antrean), Planned 3-Sheet GAS Schema (V3)

### Community 12 - "Timer Fix Plans"
Cohesion: 0.70
Nodes (5): Comprehensive Timer Fix & State Persistence Plan, Navigation State Validation, Timer Fix Plan for Latihan-Kuis, Timer Resume Logic, Timer and Navigation Fix Implementation Summary

### Community 13 - "Theme Config Fix"
Cohesion: 0.67
Nodes (3): Clean One Theme, Fix HAXcms Theme Configuration Plan, Resume Theme

### Community 14 - "CI/CD Pipeline"
Cohesion: 1.00
Nodes (3): Build and Deploy GitHub Action (gh-pages), Travis CI Pipeline (npm run test), dasbor-kuis Package (DDD + Lit, OpenWC)

## Knowledge Gaps
- **93 isolated node(s):** `name`, `version`, `description`, `license`, `name` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ModularQuiz` connect `Quiz Engine Core` to `Dependencies & Tests`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `LatihanKuis` connect `Practice Quiz System` to `Dependencies & Tests`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `<dasbor-kuis> Dashboard Component` (e.g. with `<kirim-tugas> Assignment Submission Component` and `<kuis-ledakan> Interactive Quiz Engine`) actually correct?**
  _`<dasbor-kuis> Dashboard Component` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Quiz Engine Core` be split into smaller, more focused modules?**
  _Cohesion score 0.054706163401815576 - nodes in this community are weakly interconnected._
- **Should `Practice Quiz System` be split into smaller, more focused modules?**
  _Cohesion score 0.06656426011264721 - nodes in this community are weakly interconnected._
- **Should `Component Ecosystem` be split into smaller, more focused modules?**
  _Cohesion score 0.09059233449477352 - nodes in this community are weakly interconnected._