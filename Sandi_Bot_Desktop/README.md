# Sandi Bot Desktop — Coaching Intelligence

> Airgapped desktop application for franchise coach Sandy Stahl.  
> **Production roadmap:** See [../PRODUCTION_ROADMAP.md](../PRODUCTION_ROADMAP.md)

## Tech Stack

- **Tauri v2** — Native desktop shell (~5MB installer)
- **React 19 + TypeScript + Vite 5**
- **Tailwind CSS 3.4** — Do NOT upgrade to v4
- **SQLite** — Local persistence via rusqlite
- **shadcn/ui + Radix UI** — Component library
- **PDF Extraction** — pdfium-render (Rust crate) — Replaces lopdf
- **OCR Fallback** — Tesseract CLI v5.5 — Image-based PDFs
- **LLM Model** — qwen2.5:7b-instruct-q4_k_m — Replaces llama3.1:8b

## Prerequisites

1. **Node.js 18+** and npm
2. **Rust** — Install from [rustup.rs](https://rustup.rs/)
3. **Platform deps** — See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
4. **pdfium.dll** — Download from:
   [github.com/bblanchon/pdfium-binaries/releases](https://github.com/bblanchon/pdfium-binaries/releases)
   Extract pdfium-win-x64.tgz → place pdfium.dll in `src-tauri/` directory
5. **Tesseract OCR v5.5+**
   Download from: [github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)
   Install to default location
   Ensure English language pack is included
6. **Ollama** with qwen2.5:7b-instruct-q4_k_m
   `ollama pull qwen2.5:7b-instruct-q4_k_m`
   Keep `ollama serve` running during imports

## Quick Start

```bash
cd Sandi_Bot_Desktop
npm install
# Place pdfium.dll in src-tauri/
# Install Tesseract with English pack
# ollama pull qwen2.5:7b-instruct-q4_k_m
# ollama serve  # keep running
npm run tauri:dev
```

## Project Structure

```
Sandi_Bot_Desktop/
├── src/                    # React frontend
│   ├── modules/            # 8 core UI modules
│   ├── components/         # Shared components
│   ├── services/           # Data layer (Phase 2+)
│   └── types/              # TypeScript types
├── src-tauri/              # Rust backend
│   └── src/
│       ├── lib.rs              # IPC commands + migrations
│       ├── database.rs         # SQLite schema + queries
│       ├── text_extractor.rs   # pdfium + Tesseract OCR
│       ├── disc_parser.rs      # Deterministic DISC regex
│       ├── you2_parser.rs      # Deterministic You2 extraction
│       ├── file_watcher.rs     # Folder monitoring
│       └── backup.rs           # Backup system
└── prompts/                # LLM templates (Phase 7)
```

## 8 Modules

| Module | Description |
|--------|-------------|
| Executive Dashboard | KPIs, pipeline health, hot prospects |
| Client Intelligence | DISC, You 2.0, vision statements |
| Pipeline Visualizer | 5-compartment coaching journey |
| Live Coaching Assistant | Sandi Bot with CLEAR framework |
| Post-Call Analysis | CLEAR scoring & insights |
| Admin Streamliner | Activity logs & settings |
| Audit & Transparency | Source citations & audit logs |
| How to Use | Instructions & guide |

## Current Build Status — March 2026

### Phase 3 Complete
- File-agnostic text extraction
  Supports: PDF, DOCX, PPTX, XLSX, CSV, TXT
- Document extraction pipeline
  Handles: TTI Talent Insights DISC, TES You 2.0,
  TUMAY intake, Fathom transcripts, Vision statements
- Stage inference from document completeness
  IC → C1 → C2 → C3 → C4 → C5 (WIN)
- Bulk import from folder structure
  Active / WIN / Paused / Various
- STZ feedback logging foundation
  L1-L5 evaluation framework (29 migrations)

### Client File Structure
Place Sandi's client files at:
C:\Users\zumah\SandiBot\clients\
  Active\[ClientName]\[files]
  WIN\[ClientName]\[files]
  Paused\[ClientName]\[files]
  Various\[ClientName]\[files]

### Next Steps
- Bulk import test with real client files
- File watcher for automatic drop-detection
- STZ feedback wiring into services
- Post-Call A/B/C grade UI additions

## Critical Rules

- **Never** use `better-sqlite3` (Node native module)
- **Never** use `pdf-parse`, `pdf-extract`, or `lopdf`
- **Always** use `pdfium-render` for PDF text extraction
- **Always** use Tesseract CLI OCR for image-based PDFs
- **pdfium.dll** must be present in `src-tauri/`
- **Tesseract** must be installed at: `C:\Program Files\Tesseract-OCR\tesseract.exe`
- **Never** upgrade Tailwind to v4
- **Never** use Electron — Tauri only
- **Always** log recommendations to audit table

## POC Reference

- [Sandi_Bot_Coaching_Intelligence](https://github.com/Zmugha1/Sandi_Bot_Coaching_Intelligence) — Frozen POC (live on Netlify). Do not modify.

---

*For Sandy. Coaching intelligence. Ready to use.* ☕
