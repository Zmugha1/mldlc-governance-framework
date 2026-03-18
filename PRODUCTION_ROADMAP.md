# Sandi Bot Desktop — Production Roadmap & Cursor Build Guide

> **AI Solutions Architect:** Dr. Data — Decision Intelligence  
> **Client:** Sandy Stahl — Franchise Coach  
> **Product:** Airgapped Coaching Intelligence Desktop Application  
> **POC Reference:** https://github.com/Zmugha1/Sandi_Bot_Coaching_Intelligence  
> **Production Repo:** https://github.com/Zmugha1/Sandi_Bot_Desktop

---

## ⚠️ Critical Rules Before Touching Any Code

1. **Never modify the POC repo.** `Sandi_Bot_Coaching_Intelligence` is frozen. It is the live demo on Netlify. This production repo is separate.
2. **Never use `better-sqlite3`.** It is a Node.js native module incompatible with Tauri. Always use `tauri-plugin-sql` with SQLite.
3. **Never use `pdf-parse`.** Use `pdf-extract` (Rust crate) as primary, `lopdf` as fallback.
4. **Never upgrade Tailwind to v4.** Stay on Tailwind 3.4 — it matches the POC exactly.
5. **Never use Electron.** Tauri v2 only. Smaller installer, better performance, native Rust backend.
6. **Always test Rust changes with `cargo check` before `npm run tauri:dev`.**
7. **Every recommendation the system makes must be logged to the audit table.** Governance is non-negotiable.

---

## Tech Stack — Complete

```
Layer                  Technology                     Notes
─────────────────────────────────────────────────────────────────────
UI Framework           React 19 + TypeScript           Preserved from POC
Build Tool             Vite 5                          Preserved from POC
Styling                Tailwind CSS 3.4                DO NOT upgrade to v4
Components             shadcn/ui + Radix UI            Preserved from POC
Charts                 Recharts                        Preserved from POC
Desktop Shell          Tauri v2 (Rust)                 ~5MB installer
IPC Bridge             @tauri-apps/api invoke()        TS → Rust commands
Database               SQLite via tauri-plugin-sql     Single .sqlite file
Search                 SQLite FTS5                     Built into SQLite
File System            tauri-plugin-fs                 Native OS access
Folder Picker          tauri-plugin-dialog             Backup location UI
PDF Extraction         pdf-extract (Rust crate)        Primary text extractor
PDF Fallback           lopdf (Rust crate)              Secondary extractor
OCR (if needed)        tesseract-rs                    Only for scanned PDFs
LLM Runtime            Ollama (local server)           localhost:11434
LLM Model (fast)       phi3:mini                       2.3GB, simple docs
LLM Model (smart)      llama3.1:8b                     4.7GB, complex docs
Knowledge Graph        Neo4j Community (local)         Phase 5+
Graph Embeddings       Node2Vec (Python script)        Phase 6C+
```

---

## Folder Structure — Complete Production

```
Sandi_Bot_Desktop/
├── src/                              # React frontend (TypeScript)
│   ├── main.tsx                      # Entry point
│   ├── App.tsx                       # Root component — 8 module router
│   ├── index.css                     # Global styles + Tailwind + CSS vars
│   ├── modules/                      # The 8 core UI modules
│   │   ├── ExecutiveDashboard.tsx
│   │   ├── ClientIntelligence.tsx
│   │   ├── PipelineVisualizer.tsx
│   │   ├── LiveCoachingAssistant.tsx
│   │   ├── PostCallAnalysis.tsx
│   │   ├── AdminStreamliner.tsx
│   │   ├── AuditTransparency.tsx
│   │   └── HowToUse.tsx
│   ├── services/                     # Data access layer
│   │   ├── db.ts                     # Database connection singleton
│   │   ├── clientService.ts          # Client CRUD operations
│   │   ├── documentService.ts        # Document storage + retrieval
│   │   ├── searchService.ts          # FTS5 knowledge base queries
│   │   ├── auditService.ts           # Audit log writes + reads
│   │   ├── backupService.ts          # Backup status + triggers
│   │   └── ollamaService.ts          # LLM parsing calls
│   ├── components/                   # Shared UI components
│   │   ├── ErrorBoundary.tsx         # Module-level crash recovery
│   │   ├── StatusBar.tsx             # Backup status + Ollama status
│   │   └── LoadingState.tsx          # Async loading indicators
│   └── types/                        # TypeScript type definitions
│       ├── client.ts
│       ├── document.ts
│       └── audit.ts
│
├── src-tauri/                        # Rust backend
│   ├── Cargo.toml                    # Rust dependencies
│   ├── tauri.conf.json               # Tauri v2 configuration
│   ├── capabilities/
│   │   └── default.json              # Tauri v2 permissions
│   ├── icons/                        # App icons (required for build)
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   ├── 128x128@2x.png
│   │   ├── icon.icns
│   │   └── icon.ico
│   └── src/
│       ├── main.rs                   # Tauri entry point + command registry
│       ├── lib.rs                    # Module exports
│       ├── database.rs               # SQLite init + schema
│       ├── pdf_parser.rs             # PDF text extraction
│       ├── file_watcher.rs           # Folder monitoring
│       ├── backup.rs                 # Backup system
│       └── ollama.rs                 # LLM HTTP client (Phase 7)
│
├── prompts/                          # LLM prompt templates (Phase 7)
│   ├── disc.txt
│   ├── you2.txt
│   ├── fathom.txt
│   └── vision.txt
│
├── scripts/                          # Utility scripts
│   └── train_embeddings.py           # Node2Vec training (Phase 6C)
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
├── PRODUCTION_ROADMAP.md             # This file
└── README.md                         # Setup instructions
```

---

## Sandy's Machine — Folder Structure

```
C:/Users/Sandy/
├── SandiBot/                         # App data root
│   ├── clients/                      # WATCHED FOLDERS
│   │   ├── DISC/                     # Drop DISC PDFs here
│   │   ├── You2/                     # Drop You 2.0 reports here
│   │   ├── Fathom/                   # Drop call transcripts here
│   │   └── Vision/                   # Drop vision documents here
│   ├── backups/                      # Auto-backup location
│   │   └── sandi-bot-2026-03-01.sqlite
│   └── database.sqlite               # Primary database
│
└── AppData/Local/
    ├── ollama/models/                # LLM models (one-time download)
    │   ├── phi3:mini                 # 2.3GB
    │   └── llama3.1:8b               # 4.7GB
    └── Neo4j/                        # Knowledge graph (Phase 5+)
        └── data/
```

---

## Database Schema — Complete

```sql
-- CLIENTS (core record)
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    stage TEXT DEFAULT 'Initial Contact',
    disc_style TEXT,
    disc_scores TEXT,            -- JSON: {d:78, i:45, s:62, c:31}
    you2_statement TEXT,
    you2_dangers TEXT,           -- JSON array
    you2_opportunities TEXT,     -- JSON array
    tumay_data TEXT,             -- JSON
    vision_statement TEXT,
    readiness_identity INTEGER DEFAULT 3,
    readiness_commitment INTEGER DEFAULT 3,
    readiness_financial INTEGER DEFAULT 3,
    readiness_execution INTEGER DEFAULT 3,
    confidence INTEGER DEFAULT 50,
    recommendation TEXT DEFAULT 'NURTURE',  -- PUSH/NURTURE/PAUSE
    outcome TEXT,                -- ACTIVE/CONVERTED/STALLED/CLOSED
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DOCUMENTS (imported files)
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    document_type TEXT NOT NULL,  -- DISC/You2/Fathom/Vision
    file_path TEXT NOT NULL,
    raw_text TEXT,
    extracted_data TEXT,          -- JSON from LLM parser
    validation_passed BOOLEAN DEFAULT false,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- SESSIONS (coaching call records)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    stage_before TEXT,
    stage_after TEXT,
    summary TEXT,
    objections_raised TEXT,       -- JSON array
    scripts_used TEXT,            -- JSON array
    outcome_signal TEXT,          -- PROGRESS/STALL/CONCERN
    next_action TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- AUDIT LOG (governance — every recommendation logged)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    client_id TEXT,
    action_type TEXT NOT NULL,    -- RECOMMENDATION/PARSE/SEARCH/BACKUP
    input_data TEXT,              -- What triggered this
    output_data TEXT,             -- What the system decided
    reasoning TEXT,               -- Why — this is the governance field
    model_used TEXT               -- deterministic/phi3/llama3.1
);

-- KNOWLEDGE BASE (FTS5 full-text search)
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_search
USING fts5(
    content,
    content_type,    -- CLEAR_QUESTION/PINK_FLAG/DISC_TIP/SCRIPT
    stage,
    client_id
);

-- BACKUP LOG
CREATE TABLE IF NOT EXISTS backup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    backup_path TEXT,
    success BOOLEAN,
    error_message TEXT
);
```

---

## IPC Commands — Complete Registry

Every TypeScript `invoke()` call must have a matching `#[tauri::command]` in `main.rs`.

```
Command Name              Rust Handler           Module Using It
────────────────────────────────────────────────────────────────────
greet                     greet()                Test only
get_app_dir               get_app_dir()          Setup
initialize_database       initialize_database()  Setup
get_all_clients           get_all_clients()      Dashboard, Pipeline
get_client                get_client()           ClientIntelligence
create_client             create_client()        ClientIntelligence
update_client             update_client()        ClientIntelligence
delete_client             delete_client()        ClientIntelligence
search_knowledge          search_knowledge()     CoachingAssistant
get_audit_log             get_audit_log()        AuditTransparency
log_audit_entry           log_audit_entry()      All modules
parse_pdf                 parse_pdf()            AdminStreamliner
start_file_watcher        start_file_watcher()   App startup
stop_file_watcher         stop_file_watcher()    App shutdown
create_backup             create_backup()        AdminStreamliner
get_backup_status         get_backup_status()    StatusBar
get_pipeline_data         get_pipeline_data()    PipelineVisualizer
save_session              save_session()         PostCallAnalysis
get_sessions              get_sessions()         ClientIntelligence
get_recommendation        get_recommendation()   Dashboard, Coaching
check_ollama              check_ollama()         StatusBar (Phase 7)
parse_with_llm            parse_with_llm()       AdminStreamliner (Phase 7)
```

---

# PHASE 1 — Tauri Desktop Foundation ✅ COMPLETE

**Goal:** App launches as a real desktop window. All 8 modules render. IPC bridge works.  
**Investment:** $2,500  
**Timeline:** Week 1

- App launches as desktop window
- All 8 modules render
- IPC bridge working
- cargo check passing

---

# PHASE 2 — Database & Real Persistence ✅ COMPLETE

**Goal:** All data survives closing and reopening the app.

- SQLite via tauri-plugin-sql
- All client CRUD working
- Audit log writing on every action
- FTS5 search working
- Migrations 1-46 complete

---

# PHASE 3 — Document Ingestion Pipeline ✅ COMPLETE

**Goal:** Drop a PDF into a folder. Client profile appears automatically.

- text_extractor.rs: pdf/docx/pptx/xlsx/csv
- documentExtractionService.ts
- stageInferenceService.ts
- profileBuilderService.ts
- bulkImportService.ts
- feedbackLogService.ts
- extractionReviewService.ts
- 17 clients in database in correct buckets
- Migrations 1-47 complete

---

# PHASE 3B — Extraction Architecture Fix ✅ COMPLETE

**Commit:** 58a274d

**Problem solved:** Full 47-page PDF was being truncated to 4000 chars. Scores on page 25 were never reached. All DISC scores were zero.

**Solution delivered:**
- disc_parser.rs — deterministic regex parser
  - Three fallback patterns for SIA/SIN line
  - No LLM needed for numeric scores
- extract_pages_by_numbers() in text_extractor.rs
  - Extracts pages 23-25, 28, 34-36 for DISC
  - Covers both TTI DISC and TTI Talent Insights Executive format (page shift confirmed)
- Two IPC commands added:
  - extract_pdf_pages
  - parse_disc_scores_from_text
- Model switched: llama3.1:8b → qwen2.5:7b
  - 1.4s response time confirmed
  - Full JSON schema enforcement added
  - DISC_FORMAT_SCHEMA and YOU2_FORMAT_SCHEMA
- Two-pass extraction:
  - Pass 1: deterministic regex → numeric scores
  - Pass 2: qwen2.5:7b → narrative fields only
- Migration 47: clear_failed_for_page_targeted

**Ground truth validation:**
Andrew Tait — Natural D=42 I=15 S=84 C=71  
             Adapted D=38 I=18 S=78 C=75  
             Style: Supporting Coordinator

### TTI DISC Standard Report — Page Map (confirmed)

| Pages | Content |
|-------|---------|
| 6-7 | Behavioral Characteristics |
| 9-10 | Checklist for Communicating |
| 12 | Perceptions / Stress Signals |
| 22 | Areas for Improvement |
| **23-25** | **Behavioral Hierarchy — SCORES HERE** |
| | SIA/SIN line format: |
| | SIA: 38-18-78-75 (20) |
| | SIN: 42-15-84-71 (20) |
| 26-27 | Style Graphs + TTI Wheel |
| 34-36 | Driving Forces Clusters |
| 44 | Ideal Environment |

**TTI Talent Insights Executive — Page Shift:** Scores appear on page 24 (not 25) due to extra Time Wasters section (pp 17-20). Extractor pulls pages 23-25 to cover both.

---

# PHASE 3C — STZ Human Feedback Loop 🔄 IN PROGRESS

Connects the two feedback systems:

**LOOP 1 — Automatic (complete)**
- stz_feedback_log table
- feedbackLogService.ts
- L1-L5 signals on every extraction

**LOOP 2 — Human confirmation (in progress)**
- extractionReviewService.ts
- Data Review UI
- extraction_corrections table (migration 48)

**Changes being made:**
- Migration 48: extraction_corrections table
- logExtractionCorrection() function
- confirmYou2Data() calls correction logger
- saveDiscData() calls correction logger
- Correction history panel in Data Review UI
- Correction scope dropdown (once/retrain/flag)
- stz_feedback_log L5 updated on human confirm
- audit_log entry on every correction

**When complete:** every human confirmation or correction in the UI automatically updates L4 and L5 signals in stz_feedback_log. Patterns accumulate showing which document types have highest correction rates. Those prompts get improved first.

---

## Document Type — Extraction Method Routing

| Document Type | Extraction Method |
|---------------|-------------------|
| DISC scores | Deterministic regex (no LLM, pages 23-25) |
| DISC narrative | qwen2.5:7b (pages 9-10, 12, 22, 28, 34-36) |
| You2 | qwen2.5:7b full doc, YOU2_FORMAT_SCHEMA |
| Fathom/Convo | qwen2.5:7b full doc |
| TUMAY | qwen2.5:7b full doc |
| Image-based PDFs | Manual entry via Data Review UI |

---

## Known Issues — Resolved

| Issue | Status |
|-------|--------|
| DISC scores all zero | ✅ RESOLVED (page targeting) |
| LLM hallucinating scores | ✅ RESOLVED (deterministic) |
| Wrong model for structured output | ✅ RESOLVED (qwen2.5:7b) |
| format:'json' too loose | ✅ RESOLVED (full schema) |

---

# PHASE 4 — Backup, Polish & Installer

**Goal:** Production-ready app. Sandy can install and use it daily.

---

# PHASE 5–8 — Neo4j, Intelligence Engine, LLM Upgrade, Productization

See full roadmap document for detailed phase specifications.

---

*This document is the single source of truth for all production development.*  
*All Cursor prompts should reference this file.*  
*Last updated: March 2026*  
*Developer: Dr. Data — Decision Intelligence*  
*drdatadecisionintelligence.com*
