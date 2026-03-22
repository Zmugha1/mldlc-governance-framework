# Coach Bot — Claude Session Memory
## Dr. Data Decision Intelligence LLC
## Last updated: March 2026

---

## WHAT THIS PROJECT IS

Coach Bot is a private airgapped desktop
application for franchise coach Sandi Stahl.
Built with Tauri v2 (Rust), React 19,
TypeScript, SQLite, and Ollama local LLM.

Repo: github.com/Zmugha1/Sandi_Bot_Desktop
Branch: dev — always work on dev only
Push: git push sandi dev

---

## CRITICAL RULES — READ BEFORE EVERY SESSION

1. Never use better-sqlite3. Use tauri-plugin-sql.
2. Never use Electron. Tauri v2 only.
3. Never upgrade Tailwind to v4. Stay on 3.4.
4. Never edit migrations 1-48. New = 49+.
5. client_id is TEXT/UUID never number.
6. Database: sandi_bot.db via getDb().
7. Never delete clients — inactivate them.
   outcome_bucket = 'inactive'
8. Never reference TES or Entrepreneur's
   Source in any UI text or prompt.
9. cargo check before npm run tauri:dev.
10. Always push with: git push sandi dev.

---

## OLLAMA — RULE THAT CAUSES MOST LOST TIME

NEVER call Ollama directly from TypeScript.
Tauri v2 blocks ALL direct fetch() calls
to localhost:11434. This is a security
sandbox restriction that cannot be bypassed.

ALWAYS use the Rust proxy:
  const result = await invoke<string>(
    'ollama_generate',
    {
      prompt: documentText,
      system: systemPrompt,
      model: 'qwen2.5:7b-instruct-q4_k_m'
    }
  );

The ollama_generate command is in:
  src-tauri/src/lib.rs (line ~306)
  Registered in invoke_handler![]
  Uses reqwest with 120 second timeout
  Options: num_ctx 4096, num_predict 1024

If you try fetch() it silently fails.
No error is thrown. Nothing happens.
Always use invoke('ollama_generate').

---

## PDF EXTRACTION — RULE THAT CAUSES ERRORS

NEVER use lopdf, pdfjs, or any JS PDF library.
They return raw PDF operators not readable text.

ALWAYS use Rust commands:
  invoke('extract_pdf_pages', {
    filePath, pageNumbers: [1,2,3,4,5]
  })
  or
  invoke('extract_text', { filePath })

These use pdfium-render which works correctly.

---

## EXTRACTION PATTERN — CONFIRMED WORKING

Every document type follows this exact pattern:
  1. TypeScript: invoke('extract_pdf_pages')
  2. Rust: extracts text via pdfium-render
  3. TypeScript: invoke('ollama_generate')
     with extracted text + few-shot prompt
  4. Rust: calls Ollama via reqwest
  5. Rust: returns JSON string
  6. TypeScript: parses JSON, writes to DB

Confirmed working for:
  DISC profiles: pages 23-25, 28, 34-36
  You2 profiles: pages 1-5
  TUMAY forms: pages 1-5
  Fathom transcripts: full text

For structured numeric fields (DISC scores):
  Use deterministic Rust regex first.
  LLM only for narrative fields.

---

## PROMPT SIZE LIMITS — CRITICAL

num_ctx: 4096 (context window limit)
num_predict: 1024 (response length limit)
Keep few-shot examples SHORT.
Long prompts cause Ollama timeouts.
One example per document type maximum.
Add 500ms delay between clients in bulk ops.
17 clients x 120s max = 34 min worst case.
In practice 2-3 min if Ollama is warm.

CONFIRMED WORKING OLLAMA OPTIONS:
  num_ctx: 4096
  num_predict: 1024
  temperature: 0.1
  timeout: 120 seconds

Do NOT use num_predict: 512 — truncates JSON.
Do NOT use num_ctx: 2048 — too small for TUMAY.
These values confirmed working for all 17 clients.

---

## CURRENT STATE — March 2026

### Confirmed working (do not rebuild):
- 17/17 DISC profiles extracted
- 17/17 You2 profiles extracted
- 45 coaching sessions extracted
- Backup system working
- VALIDATE/GATHER/PAUSE wired correctly
- Dashboard showing real data
- All 8 modules loading
- 17/17 TUMAY profiles extracted
- 17/17 email/phone populated (16/17 email,
  Mike Brooks has no email in source doc)
- financial_net_worth_range populated for
  all clients in client_you2_profiles

### Migrations completed:
- Migrations 1-47: original schema
- Migration 48: CLEAR scoring columns
  in coaching_sessions
- Migration 49: pause_reason,
  follow_up_date, referral_source,
  referred_by, referral_ask_sent
  on clients table

### P0 items status (Phase 4):
- P0-5 Coach Bot rename ✅ b69e5cb
- P0-6 TES references removed ✅ 9998c0c
- P0-1 VALIDATE/GATHER/PAUSE ✅ 39b9794
- P0-2 Delete → Inactivate ✅ a956e26
- P0-3 Migration 49 + pause reason ✅ 002db09
- P0-4 Pipeline clickable ✅ e0a4518
- P0-7 TUMAY extraction ✅ 17/17 complete
  email + phone + financial data populated
  commit: 9888017
- P0-8 Client card POC quality PENDING
- P0-9 Windows installer PENDING
- P0-10 StatusBar verification PENDING

### Ground truth validation:
Andrew Tait: natural_s=84 → dominant S
  → GATHER (0 sessions)
Alex Raiyn: natural_i=75 → dominant I
  → VALIDATE (7 sessions)

---

## TECH STACK

Tauri v2 (Rust backend)
React 19 + TypeScript
SQLite via tauri-plugin-sql
pdfium-render for PDF extraction
Tesseract CLI for image-based PDFs
qwen2.5:7b-instruct-q4_k_m via Ollama
Tailwind CSS 3.4
shadcn/ui + Radix UI
Cursor IDE

---

## FILE STRUCTURE (key files)

src/services/
  stageReadinessService.ts — VALIDATE/GATHER/PAUSE
  dashboardService.ts — KPI calculations
  documentExtractionService.ts — extraction pipeline
  clientService.ts — CRUD + inactivate
  ollamaService.ts — Ollama health check

src/modules/
  ExecutiveDashboard.tsx
  ClientIntelligence.tsx
  PipelineVisualizer.tsx
  PostCallAnalysis.tsx
  AdminStreamliner.tsx

src-tauri/src/
  lib.rs — all Tauri commands registered here
  text_extractor.rs — PDF/PPTX/DOCX extraction
  disc_parser.rs — deterministic DISC scores
  you2_parser.rs — deterministic You2 extraction
  tumay_parser.rs — TUMAY (now uses ollama_generate)

---

## SANDI'S PREFERENCES

Language: VALIDATE not PUSH, GATHER not NURTURE
Stages: IC C1 C2 C3 C4 C5
  Display: Initial Contact, Seeker Connection,
  Seeker Clarification, Possibilities,
  Client Career 2.0, Business Purchase
Never delete clients — always inactivate
Pause requires reason + follow-up date
Vision statement is created by Sandi via AI
  not extracted from files
Do not duplicate YouCanBookMe email sequences

---

## CLIENT DATA LOCATION

C:\Users\zumah\SandiBot\clients\
  Active\     — 10 active clients
  Paused\     — 4 paused clients
  WIN\        — 3 converted clients

File naming: "Alex Raiyn - TUMAY.pdf"
  Files are in client SUBFOLDER not bucket root
  e.g. Active\Alex_Raiyn\Alex Raiyn - TUMAY.pdf

DB location: C:\Users\zumah\AppData\Roaming\
  com.sandibot.desktop\sandi_bot.db

Backup location: C:\Users\zumah\AppData\Roaming\
  com.sandibot.desktop\backups\

---

## WHAT TO ASK BEFORE STARTING ANY SESSION

1. Read this CLAUDE.md file
2. Read TOOLS.md for registered commands
3. Check current branch: git branch
4. Run: npx tsc --noEmit
   Fix any errors before proceeding
5. Ask what P0 item or phase we are on
