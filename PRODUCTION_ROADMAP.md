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

# PHASE 1 — Tauri Desktop Foundation

**Goal:** App launches as a real desktop window. All 8 modules render. IPC bridge works.  
**Investment:** $2,500  
**Timeline:** Week 1

## Phase 1 Acceptance Checklist

```
[ ] npm run tauri:dev launches desktop window
[ ] All 8 modules render without blank screen
[ ] Sidebar navigation works between modules
[ ] No TypeScript errors in terminal
[ ] cargo check passes with no errors
[ ] ErrorBoundary exists and wraps each module
[ ] App.css deleted and not imported
[ ] kimi plugin not present in vite.config.ts
```

---

# PHASE 2 — Database & Real Persistence

**Goal:** All data survives closing and reopening the app.

---

# PHASE 3 — Document Ingestion Pipeline

**Goal:** Drop a PDF into a folder. Client profile appears automatically.

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
