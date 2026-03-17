# Sandi Bot — CLAUDE.md
## Dr. Data Decision Intelligence
## Last Updated: March 2026

---

## Project Overview
Private airgapped coaching intelligence desktop
application for franchise coaches.
Built with Tauri v2, React 19, TypeScript, SQLite.
Deployed on Windows and Mac for individual coaches.
Zero internet required after one-time setup.

## Tech Stack
- Tauri v2 — desktop shell (NOT Electron, never)
- React 19 + TypeScript + Vite 5 — frontend
- Tailwind CSS 3.4 — styling (DO NOT upgrade to v4)
- shadcn/ui + Radix UI — components
- SQLite via tauri-plugin-sql — database
  (NOT better-sqlite3, never)
- Ollama localhost:11434 — local LLM
- Neo4j local — knowledge graph (Phase 5+)

## Commands
npm run tauri:dev     — launch desktop app
npx tsc --noEmit      — TypeScript check only
cargo check           — Rust compile check
git checkout dev      — working branch

## Architecture — 5 Layers (STZ Framework)

L1 — PROMPTS
Location: /prompts/*.txt
Purpose: LLM reasoning templates per operation
Rule: One file per named operation
Examples: recommendation.txt, disc_extraction.txt
Populate with real client examples after data arrives.

L2 — SKILLS
Location: src/services/*.ts
Purpose: Named typed operations — one job each
Rule: All business logic here. Never in modules.
Key files:
  clientService.ts       — client CRUD + pipeline
  recommendationService.ts — PUSH/NURTURE/PAUSE
  coachingService.ts     — DISC + readiness + homework
  postCallService.ts     — CLEAR scoring + evaluation
  pipelineService.ts     — conversion + stage metrics
  auditService.ts        — governance logging
  ollamaService.ts       — LLM calls (Phase 3)

L3 — AGENTS
Location: src/agents/*.ts
Purpose: Orchestrated skill sequences
Rule: Each agent has typed contract in/out
Status: Stubs ready — Phase 3 implements
Files:
  documentAgent.ts       — Phase 3
  coachingAgent.ts       — Phase 3
  synthesisAgent.ts      — Phase 4, Fred only
  outreachAgent.ts       — Phase 5, Fred only
  patternAgent.ts        — Phase 5, Neo4j required
  orchestrator.ts        — reads config, routes triggers

L4 — CONTRACTS
Location: TOOLS.md (project root)
Purpose: Every named operation defined with typed
         inputs, outputs, and approval gates
Rule: Add to TOOLS.md BEFORE building any operation
Rule: Never build what is not in TOOLS.md

L5 — GOVERNANCE
Location: audit_log table in SQLite
Purpose: Every recommendation logged with reasoning
Rule: Every operation marked Audit: always in
      TOOLS.md must write to audit_log
Rule: reasoning field is never a summary —
      always step by step

## Client Differentiation — The Config System
New client = new JSON file in configs/
The orchestrator reads the config at runtime.
Never hardcode client-specific values in code.

configs/sandi_stahl.json
  agents: document, coaching, pattern only
  external_integrations: all false
  llm.model: phi3:mini
  airgap: strict — no external calls ever
  ui: recommendation_display expanded

configs/fred_webster.json
  agents: all five including synthesis + outreach
  external_integrations: gmail true, linkedin true
  llm.model: llama3.1:8b
  airgap: permissioned — external calls logged
  ui: recommendation_display collapsed

configs/base_client.config.json
  Template for all new clients
  Copy and rename for each new engagement

## Module Rules
All 8 modules in src/modules/ are display only.
Modules never contain business logic.
Modules never query the database directly.
Modules call services. Services do the work.
If you find logic in a module, move it to a service.

## New Feature Workflow — Always Follow This Order
1. Define operation in TOOLS.md with typed contract
2. Write prompt file in /prompts/ if LLM required
3. Write service function in src/services/
4. Write agent in src/agents/ if workflow required
5. Update client config if behavior differs per client
6. Wire to Rust IPC command in main.rs if needed
7. Update module to call service — display only
8. Verify audit logging is wired
9. Run npx tsc --noEmit — must pass clean
10. Run cargo check — must pass clean

## Branch Structure
main    — production, always deployable to client
dev     — integration, all work merges here first
feature/[name] — one branch per phase or feature

Rule: Never push broken code to main.
Rule: Always verify app runs on dev before merging.

## Phase Status — March 2026
Phase 1: DELIVERED — desktop app, 8 modules
Phase 2: DELIVERED — SQLite persistence, real data
Pre-Phase 3: DELIVERED — agents, configs, prompts,
             TOOLS.md, services clean
Phase 3: IN PROGRESS — document ingestion pipeline
Phase 4: NEXT — installer, backup, polish
Phase 5: RETAINER — Neo4j knowledge graph
Phase 6: RETAINER — intelligence engine
Phase 7: RETAINER — LLM upgrade
Phase 8: YEAR 2 — productization, new clients

## Critical Rules — Never Violate These
1. Never use better-sqlite3 — use tauri-plugin-sql
2. Never use Electron — Tauri v2 only
3. Never upgrade Tailwind to v4
4. Never use pdf-parse — use pdf-extract (Rust)
5. Never modify POC repo (Sandi_Bot_Coaching_Intelligence)
6. Never put business logic in modules
7. Never hardcode client values — use configs/
8. Never build without adding to TOOLS.md first
9. Never return a recommendation without reasoning
10. Always run cargo check before npm run tauri:dev

## Reference Files
TOOLS.md               — named operations registry
PRODUCTION_ROADMAP.md  — full phase plan + prompts
configs/               — per-client configuration
prompts/               — LLM reasoning templates
src/agents/            — agent contracts and stubs
src/services/          — all business logic

## STZ Discovery Framework
Before Phase 3 for any new client:
Run DrData_Discovery_Interview_Guide.pdf
20 questions — 5 sections — maps to 5 code layers
Section 1 → /prompts/ files
Section 2 → src/services/ skill functions
Section 3 → src/agents/ orchestrator config
Section 4 → TOOLS.md contract definitions
Section 5 → audit_log KPIs and evaluation
Rule: No client code before Sections 1-4 complete.

## ADLC — Agentic Development Lifecycle
This project follows ADLC not traditional SDLC.
Agents participate in building, not just humans.
Goal Definition → PRD → Agent Skills → Orchestration
→ Autonomous Coding → Autonomous Testing
→ Observability → Continuous Deployment

## About This Project
Architect: Dr. Zubia Mughal — Dr. Data Decision Intel
Framework: Skill Threshold Zone (STZ)
Client: Sandi Stahl — Franchise Coach (Founding Partner)
Client: Fred Webster — Power User
Repo: github.com/Zmugha1/Sandi_Bot_Desktop
Contact: drdatadecisionintelligence.com

## CURRENT STATE — March 2026

### Services built and passing (do not rebuild):
- text_extractor.rs — pdf, docx, pptx, xlsx, csv, txt
- documentExtractionService.ts — Ollama integration
  LIVE at http://localhost:11434/api/generate
  Model: phi3:mini — DO NOT rebuild Ollama calls
- stageInferenceService.ts — bucket/stage mapping
- profileBuilderService.ts — calls existing services
- bulkImportService.ts — processes client folders
- feedbackLogService.ts — STZ L1-L5 logging

### Database migrations complete: 1-29
### Next new migration number: 30

### Client folder base path:
C:\Users\zumah\SandiBot\clients\
Subfolders: Active\ WIN\ Paused\ Various\
Each bucket contains [ClientName]\ subfolders.

### Folder to bucket mapping (in stageInferenceService.ts):
Active  → active
WIN     → converted
Paused  → paused
Various → various

### CRITICAL: Ollama must be running before
any extraction or bulk import. Check with:
ollama list
Required model: phi3:mini

### Existing services to CALL not replace:
- coachingService.calculateReadinessScore()
- recommendationService.getRecommendation()
- pipelineService — PipelineStage types
