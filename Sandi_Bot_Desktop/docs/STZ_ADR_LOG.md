# STZ Architecture Decision Record Log
# Coach Bot Desktop
# Dr. Data Decision Intelligence LLC
# Every architecture decision ever made.
# Never delete. Only add.
# Updated automatically by END OF SESSION.

---

## ADR-001
Date: 2026-04-08
Decision: All Ollama calls from TypeScript
  must use invoke() never fetch()
Layer: Tech
Context: Tauri v2 CSP blocks direct
  fetch() to localhost:11434
Consequence: Every LLM call goes through
  Rust proxy command ollama_generate
  or ollama_embed in lib.rs
Never do: fetch('http://localhost:11434')
  from any TypeScript file ever

## ADR-002
Date: 2026-04-08
Decision: Tailwind CSS pinned to v3
  Never upgrade to v4
Layer: Tech
Context: v4 breaks existing class usage
  and has different configuration
Consequence: All components use v3 classes
  and inline styles for brand colors
Never do: npm install tailwindcss@latest
  or change tailwind version in package.json

## ADR-003
Date: 2026-04-08
Decision: All primary keys are TEXT UUID
  Never integers
Layer: Tech
Context: SQLite integer IDs create
  cross-table conflicts and are not
  portable across installs
Consequence: Every table primary key
  uses TEXT and uuidv4() on insert
Never do: INTEGER PRIMARY KEY AUTOINCREMENT
  on any table in any migration

## ADR-004
Date: 2026-04-08
Decision: Never touch migrations 1-66
  New migrations start at 67+
Layer: Tech
Context: Migrations 1-66 have been
  applied to production database.
  Changing them breaks DB state.
Consequence: Always check MAX(version)
  in schema_migrations before assigning
  a new migration number
Never do: Edit any migration that has
  already been applied to the database

## ADR-005
Date: 2026-04-08
Decision: Always use getDb() for all
  TypeScript database access
  Never use better-sqlite3
Layer: Tech
Context: Tauri v2 requires async
  database access via tauri-plugin-sql
Consequence: All DB operations use
  await getDb() pattern throughout
Never do: import Database from
  better-sqlite3 in any file

## ADR-006
Date: 2026-04-08
Decision: Tauri v2 file picker returns
  plain string not object with .path
Layer: Tech
Context: dialog.open() in Tauri v2
  returns string | string[] | null
  directly — changed from v1
Consequence: Use result directly as
  filePath not result.path
Never do: const path = result.path
  or result?.path anywhere

## ADR-007
Date: 2026-04-08
Decision: Google OAuth credentials stored
  as environment variables only
  Never hardcoded in source files
Layer: Governance
Context: GitHub secret scanner blocks
  commits with credentials in source.
  Credentials committed = security breach.
Consequence: Set $env:GOOGLE_CLIENT_ID
  and $env:GOOGLE_CLIENT_SECRET in
  PowerShell session before tauri:build
Never do: Hardcode any credential in
  any TypeScript or Rust file ever

## ADR-008
Date: 2026-04-08
Decision: All Google API calls go through
  Rust proxy commands never fetch()
Layer: Tech
Context: Airgap architecture requires
  all external calls through Rust
  for security and CSP compliance
Consequence: gmail_get_messages,
  gcal_get_events etc are Rust commands
  called via invoke() from TypeScript
Never do: fetch('https://gmail.googleapis')
  or any Google URL from TypeScript

## ADR-009
Date: 2026-04-08
Decision: invoke() parameter keys must
  use camelCase from TypeScript side
  Rust parameters use snake_case
  Tauri handles conversion automatically
Layer: Tech
Context: invoke() with snake_case keys
  fails silently with missing key error
Consequence: accessToken not access_token
  in all invoke() calls from TypeScript
Never do: invoke('cmd', {access_token: x})
  snake_case in any invoke() call

## ADR-010
Date: 2026-04-08
Decision: TypeScript interfaces must use
  import type not regular import
Layer: Tech
Context: Vite module resolution fails
  at runtime when interfaces imported
  as values not types
Consequence: import type { CoachBotTool }
  from './toolManager' everywhere
Never do: import { CoachBotTool } without
  the type keyword

## ADR-011
Date: 2026-04-08
Decision: App identifier stays as
  com.sandibot.desktop permanently
Layer: Tech
Context: Changing app identifier changes
  the AppData folder path and orphans
  the existing database
Consequence: All documentation and
  setup instructions reference this path
Never do: Change the identifier in
  src-tauri/tauri.conf.json

## ADR-012
Date: 2026-04-08
Decision: Google credentials must be set
  in the SAME PowerShell session as
  npm run tauri:dev or tauri:build
Layer: Tech
Context: User-scope env vars require a
  new shell session to take effect.
  Setting them with SetEnvironmentVariable
  does not affect current session.
Consequence: Always use $env:VARIABLE
  syntax in current session before build
Never do: Set User env vars and expect
  them to work in the same session

## ADR-013
Date: 2026-04-08
Decision: All React hooks must be at
  the top of the component function
  before any conditional logic or
  early returns
Layer: Tech
Context: React rules of hooks — hooks
  called inside conditionals cause
  "Rendered more hooks" runtime crash
Consequence: All useState useEffect
  useContext calls go before any
  if statements or return statements
Never do: Call any hook inside a
  conditional block or loop

## ADR-014
Date: 2026-04-08
Decision: Never use em dashes in any
  user-visible text in the app
Layer: L1 Voice
Context: Em dashes signal AI-generated
  writing and undermine trust
Consequence: Use commas or periods
  instead of em dashes everywhere
Never do: Use — in any UI label
  toast message or generated content

## ADR-015
Date: 2026-04-08
Decision: The Capture is the permanent
  name for the document hub page
  Never call it Admin Streamliner
  in any user-visible text
Layer: L1 Voice
Context: Admin Streamliner is a developer
  name. The Capture is Sandi's language.
Consequence: All UI text toasts
  instructions and emails use The Capture
Never do: Show Admin Streamliner text
  anywhere a user can see it

## ADR-016
Date: 2026-04-08
Decision: datetime('now') in SQL for
  all timestamps never JavaScript
  Date objects as parameters
Layer: Tech
Context: Passing JS Date to SQLite
  causes datatype mismatch error code 20
Consequence: All INSERT and UPDATE
  timestamps use datetime('now') inline
Never do: Pass new Date() or
  date.toISOString() as a SQLite
  parameter for timestamp fields

## ADR-017
Date: 2026-04-08
Decision: Three-space knowledge
  architecture is locked and permanent
Layer: L3 Architecture
Context: RAG needs three distinct sources
  to produce personalized coaching output
Consequence:
  Space 1 = coach identity → voice
  Space 2 = domain knowledge → brain
  Space 3 = client documents → intel
  All three embed before RAG builds
Never do: Start Sequence 12 RAG before
  all three spaces have real content

## ADR-018
Date: 2026-04-08
Decision: MCP tool interface CoachBotTool
  is the standard contract for all
  future integrations
Layer: L4 Contracts
Context: Each custom integration would
  require N×M custom code without
  a standard interface
Consequence: Every tool implements
  CoachBotTool from toolManager.ts
  Same connect execute disconnect pattern
Never do: Build a custom integration
  that bypasses the ToolManager

## ADR-019
Date: 2026-04-01
Decision: Temperature split — 0.1 for extraction
  (DISC You2 TUMAY Fathom) and 0.3 for generation
  (Best Next Questions Vision Statement)
  Never use the same temperature for both
Layer: Tech
Context: Extraction needs determinism;
  generation needs slight creativity
Consequence: Document and enforce per-call
  temperature in Rust or TS wrappers
Never do: Use one global temperature for
  all Ollama calls

## ADR-020
Date: 2026-04-01
Decision: nomic-embed-text for all embeddings
  Never use a different embedding model
Layer: Tech
Context: Cosine similarity search confirmed
  on this model only
Consequence: All embedding pipelines use
  nomic-embed-text end to end
Never do: Swap embedding models without
  full re-embed and validation

## ADR-021
Date: 2026-04-01
Decision: DISC extraction is deterministic
  Rust parser not LLM
  Never use Ollama for DISC scores
Layer: Tech
Context: 100% accuracy confirmed on parser
Consequence: DISC path stays Rust-only
Never do: Route DISC PDFs through LLM
  for numeric scores

## ADR-022
Date: 2026-04-01
Decision: Never start Sequence 12 before v1.5
  RAG against empty knowledge base is half
  the product — v1.5 must complete first
Layer: L3 Architecture
Consequence: Gate RAG work on v1.5 checklist
Never do: Ship Sequence 12 while knowledge
  spaces are empty or unverified

## ADR-023
Date: 2026-04-01
Decision: Two-layer DB architecture locked
  coach_bot_knowledge.db read-only Zubia IP
  coach_bot.db coach and client data
  Never merge into one DB
Layer: L3 Architecture
Consequence: Separation of concerns and
  licensing enforced at file boundary
Never do: Merge knowledge DB into client DB

## ADR-024
Date: 2026-04-01
Decision: Tauri shell spawn and execute are
  gated by capability scope entries with
  matching name cmd and args — not by
  tauri.conf.json allowlists
Layer: Tech
Context: tauri-plugin-shell v2 Config in
  tauri.conf.json only defines shell.open
  (deny_unknown_fields). Program allowlists
  live under src-tauri/capabilities as scoped
  permissions for shell:allow-spawn and
  shell:allow-execute
Consequence: Each allowed CLI (e.g. ollama
  with args serve) is declared in default.json
  with identifier shell:allow-spawn and an
  allow array entry name cmd args
Never do: Add execute or allowlist blocks to
  plugins.shell in tauri.conf.json expecting
  them to deserialize — they will fail

## ADR-025
Date: 2026-04-01
Decision: Coach resume profile extraction and
  years_experience live in knowledgeService
  upsertCoachProfileFromResumeText using
  earliest_work_year from the model then
  years_experience = currentYear - earliest
Layer: Tech
Context: Prompts that asked for explicit
  years statements returned 0 when resumes
  only had date ranges
Consequence: Single place for Ollama JSON
  parse markdown strip and coach_profile upsert
Never do: Rely on years_experience from the
  model when date ranges are the real signal

## ADR-026
Date: 2026-04-01
Decision: Google tool privacy and tool-call
  audit hooks live in toolManager execute path
  and googleAuthService logPrivacyAudit
Layer: Governance
Context: Airgap and offline graceful handling
  require consistent logging without duplicating
  calls in every tool file
Consequence: gmail and google-calendar calls
  log privacy_audit before execute; tool_call
  rows written after each execute
Never do: Bypass ToolManager for Google tool
  execution in new integrations

## ADR-027
Date: 2026-04-10
Decision: STZ Governance Layer instantiated
  as Coaching Council
  Three lenses: Readiness, Alignment,
  Integrity
  Built on ICF + CLEAR + MI
  Never HACCP or food frameworks
  Never TES in user-visible text
Layer: Governance
Context: Coach-facing governance must read
  as professional coaching not adjacent domains
Consequence: Council labels prompts and ADRs
  use coaching-standard language only
Never do: Surface HACCP food-safety framing
  or TES acronym in user-visible copy

## ADR-028
Date: 2026-04-10
Decision: Coaching Council runs sequentially
  not in parallel
  Progressive display per lens
  Three minutes total acceptable
  for pre-call preparation
  Not acceptable mid-call
Layer: Product
Context: Parallel Ollama calls stacked latency
  and hid progress from the coach
Consequence: runCoachingCouncil awaits each
  lens and optional onLensComplete callback
Never do: Promise.all three lenses for
  same council run without explicit
  mid-call UX mitigation

## ADR-029
Date: 2026-04-10
Decision: Vision Statement improvements
  must be isolated one prompt at a time
  with testing after each commit
  Never bundle vision changes with
  other file changes
Layer: Process
Context: ClientIntelligence.tsx is the
  largest surface area file high
  regression risk for Vision tab
Consequence: Each vision change ships alone
  with Vision tab smoke test before next edit
Never do: Batch unrelated vision refactors
  with council or tab shell edits same commit

## ADR-030
Date: 2026-04-10
Decision: Revert policy
  When white screen occurs after
  multiple commits to same file
  revert to last known good commit
  immediately
  Do not attempt to fix forward
  at end of session
Layer: Process
Context: End-of-session fatigue compounds
  risk on hot files
Consequence: Prefer git revert to known good
  then next session single-step fixes
Never do: Stack speculative fixes on a
  broken tree without a green baseline

## ADR-031
Date: 2026-04-10
Decision: Health score formula locked
  Combined = 50% data completeness
    + 50% Sandi ratings
  Logged to system_health_log table
  Per page separate scores
Layer: Data
Context: Per-page HealthIndicator and
  System Health dashboard read the log
Consequence: logHealthScore and getHealthScore
  stay aligned to that formula per page key
Never do: Change combined formula without
  matching migration and dashboard copy

## ADR-032
Date: 2026-04-10
Decision: Two export reports locked
  UAT Feedback CSV — already built
  QLoRA Training Report — new
  Both export from The Capture
Layer: Product
Context: Training pipeline needs repeatable
  CSV export plus existing UAT path
Consequence: exportQLoRAReport and Capture
  Feedback tab remain the two export surfaces
Never do: Add a third training export path
  without ADR update

## ADR-033
Date: 2026-04-11
Decision: Vision Statement three-prompt
  rebuild approach
  Clean out first then add handlers
  then add JSX
  Never bundle all three in one prompt
  for a 7000 line file
Layer: Process
Context: Large ClientIntelligence surface
  area; bundled edits cause regressions
Consequence: Ship A clean B handlers C JSX
  as separate prompts with tests between
Never do: Single mega-prompt for Vision
  tab rebuild on ClientIntelligence.tsx

## ADR-034
Date: 2026-04-11
Decision: Fathom upload is paste only
  No file upload button
  Paste textarea always visible
  tauriDialogOpen pattern exists
  but Fathom transcripts are text
  paste is faster and more reliable
Layer: Product
Context: fs.write_file temp staging failed
  permissions; Sandi workflow is copy-paste
Consequence: Client card Fathom tab uses
  paste + extractFathomSession only
Never do: Restore browser file input or
  plugin-fs temp file for Fathom on card

## ADR-035
Date: 2026-04-11
Decision: Fathom transcripts are TXT
  not PDF
  Fathom delivers transcripts as
  copyable text not image PDFs
  Never assume PDF format for Fathom
  Always use paste or TXT upload
Layer: Domain
Context: PDF may be notes scans or binary
  garbage not extractable transcript text
Consequence: Treat Fathom source as text
  first; Capture may still use paths for
  other doc types per existing flows
Never do: Assume any PDF attached to a
  client is a valid Fathom transcript

## ADR-036
Date: 2026-04-11
Decision: My Practice scoring is
  domain native CLEAR based
  Three sources:
    Session quality from 9-block
    Pipeline effectiveness from
      stage log
    Council preparation from
      question ratings
  Never business metrics as
  primary coaching quality signal
Layer: Data
Context: Coaching quality must reflect
  coaching behavior not revenue alone
Consequence: Score composition documented
  in domain model and runbooks
Never do: Replace CLEAR-derived session
  signal with placement revenue as primary

## ADR-037
Date: 2026-04-11
Decision: Adaptive weighting for
  sparse data
  If pipeline or council have
  no data exclude from overall
  Never show F grade because
  system is new not because
  coach is poor
Layer: Data
Context: New installs have zero stage
  history and zero rated questions
Consequence: Overall score excludes
  zero-weight sources from denominator
Never do: Average in zeroed components
  that have no observations yet

## ADR-038
Date: 2026-04-11
Decision: Health badges removed
  from all pages
  System Health has its own page
  Fails three question test
  on all five pages
  Never add health badges to
  individual pages again
Layer: UX
Context: Per-page HealthIndicator duplicated
  signal and cluttered primary workflows
Consequence: System Health module is the
  only home for aggregate health scores
Never do: Re-add HealthIndicator to
  Morning Brief Goals CI Actions Practice
  Capture without new ADR

## ADR-039
Date: 2026-04-11
Decision: Quick Reflection disabled
  until v1.5
  Fires after inactivity
  Not wired to anything meaningful
  Annoying before value is proven
  Re-enable when properly wired
  to training pipeline
Layer: Product
Context: Module-load localStorage gate
  used to suppress modal until re-enable
Consequence: Reflection UX frozen until
  training pipeline integration designed
Never do: Re-enable idle modal without
  ADR and product sign-off

## ADR-040
Date: 2026-04-11
Decision: extractFathomSession signature
  Takes rawText not filePath
  clientId rawText fileName filePath
  Never try to save temp file
  Always extract text first then
  pass to extractFathomSession
Layer: Tech
Context: extract_text_from_any_file on
  disk path when needed; paste passes ''
  for filePath with synthetic fileName
Consequence: Callers supply trimmed text
  and audit fileName for recordExtraction
Never do: Write client-side temp bytes
  via plugin-fs for Fathom card flow

## ADR-041
Date: 2026-04-11
Decision: Em dash post-processing rule
  Never trust LLM to follow
  stylistic prompt rules
  Always post-process generated text
  Strip em dashes after generation
  .replace(/\u2014/g, ',')
  .replace(/\u2013/g, ',')
  .replace(/--/g, ',')
Layer: Content
Context: Models ignore style clauses
Consequence: sanitizeVisionEmDashes or
  equivalent runs on model output
Never do: Rely on prompt-only em dash ban

## ADR-042
Date: 2026-04-11
Decision: Vision Statement rubric loop
  Generate rate regenerate download
  Four dimensions Accuracy
  Completeness Tone Usefulness
  Rubric feeds back into next
  generation prompt as feedback
  context when avg score below 3
Layer: Product
Context: Sandi judges output quality
  before export
Consequence: Sub-3 average triggers
  regenerate-with-feedback path
Never do: One-shot generate without
  rubric capture for Vision v1 quality

## ADR-043
Date: 2026-04-11
Decision: PPT colors no hash prefix
  PptxGenJS requires 6 digit hex
  without hash symbol
  Never pass #2D4459 to PptxGenJS
  Always pass 2D4459
Layer: Tech
Context: PptxGenJS color parser rejects
  CSS-style hash strings
Consequence: Vision PPT export maps brand
  colors to six-digit unhashed values
Never do: Pass #RRGGBB into PptxGenJS
  shape or slide color fields

## ADR-044
Date: 2026-04-11
Decision: PDF download replaced with HTML
  window.open blocked in Tauri
  Use HTML file save instead
  Or remove PDF option entirely
  Vision Statement uses PPT only
Layer: Tech
Context: WebView blocks naive window.open
  download UX
Consequence: Prefer Tauri native save or
  HTML artifact over broken PDF path
Never do: Promise in-app PDF download
  without verified Tauri save path
