# COACH BOT SESSION MEMORY
Last updated: March 27 2026
Version: v0.1.0 delivered
Next target: v0.2.0 Friday next week

## CURRENT BUILD STATUS
Phase 4: COMPLETE
Phase 5: MOSTLY COMPLETE
  Built: CLEAR, 9-block Fathom, DISC tips,
  pink flags, gone quiet badge
  Remaining: 5B emotional detection,
  5E coaching plan tab
Phase 6-15: Not started

## NEXT BUILD SEQUENCE
See docs/INTERVENTION_INTELLIGENCE.md
Full sequence 0-10, 40 builds, one file each

## STZ GAP STATUS
S1 VALIDATE/GATHER: RESOLVED
S6 Pink Flags: RESOLVED
S7 DISC phrases: PARTIAL — collect April 3
S8 CLEAR benchmark: PARTIAL — confirm April 3
S9 Vision Statement: NOT STARTED — Phase 7A
S10 In-call usage: NOT CONFIRMED — ask April 3
Overall STZ coverage: 62%

## MIGRATIONS COMPLETE
1-50: NEVER EDIT
51: intervention_logs — NOT YET BUILT
52: user_feedback — NOT YET BUILT
53: clients table additions — NOT YET BUILT
Next migration: 70+
(Older note 54+ superseded — never edit
  migrations already applied; assign new
  numbers from current schema head.)

## BINARY FILES — NEVER DELETE
src-tauri/pdfium.dll — force committed
src-tauri/icons/icon.ico — force committed
src-tauri/icons/icon.png — force committed

## CI/CD
Every git push sandi dev triggers
automatic Windows + Mac build.
Check github.com/Zmugha1/Sandi_Bot_Desktop
Actions tab for build status.
Secret required: GH_PAT in repo settings.

## R&D COHORT PRICING
$1,000 per coach build fee
$0 retainer months 1-6
$100/month thereafter
4 coaches = $4,000 R&D revenue

## SANDI BUSINESS PLAN
Target: $300,000 gross placement revenue
Placements needed: 11 at $28K average
North star: C3 presentations per week
Biggest gaps:
  C1 Session Held: 58% → 75%
  C4 Session Held: 56% → 80%

## MEETING SCHEDULE
Tuesday 2pm — 30 min check-in
Friday 9am — full delivery call

## PROMPT DISCIPLINE — NEVER VIOLATE
One fix per prompt
One file per prompt
Maximum 3 changes per prompt
Always list files Cursor must NOT touch
Never touch src-tauri/capabilities/default.json
Never touch any Rust files in agent prompts
Always end with npx tsc --noEmit
Always git add specific file only

---

# Coach Bot — Claude Session Memory
## Dr. Data Decision Intelligence LLC
## Last updated: March 24 2026

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
4. Never edit migrations 1-49. New = 51+.
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
- VALIDATE/GATHER/PAUSE wired per March 24 rule
  (stage-based only — see below)
- Dashboard showing real data
- All 8 modules loading
- 17/17 TUMAY profiles extracted
- 17/17 email/phone populated (16/17 email,
  Mike Brooks has no email in source doc)
- financial_net_worth_range populated for
  all clients in client_you2_profiles

### Migrations completed:
- Migrations 1-49: complete — NEVER edit
- Migration 50: coaching_sessions 9-block columns;
  reflection column is block_reflection_block
  (NOT block_reflection — name conflict)
- Next new migration: 51+

### P0 items status (Phase 4) — all complete:
- P0-1 VALIDATE/GATHER rename ✅ 39b9794
- P0-2 Delete → Inactivate ✅ a956e26
- P0-3 Migration 49 pause reason ✅ 002db09
- P0-4 Pipeline clickable ✅ e0a4518
- P0-5 Coach Bot rename ✅ b69e5cb
- P0-6 TES references removed ✅ 9998c0c
- P0-7 TUMAY extraction ✅ 9888017 (17/17)
- P0-8 Client card rebuild ✅ f652886
- Pink flags auto-detection ✅ 0b9bfa1
- CLEAR rubric + auto-scoring ✅ 0ca4211 + a05c21e
- DISC coaching tips ✅ 8ed543d
- 9-block Fathom ✅ b7da422
- TypeScript errors resolved ✅ 5803dd0

### Ground truth note (March 24):
Recommendation labels follow stage buckets only
(VALIDATE = C4/C5 active; GATHER = IC–C3 active).
Do not infer VALIDATE from session counts or
readiness alone. See VALIDATE/GATHER RULE below.

---

## CONFIRMED DATABASE STATE

### KNOWN DATA ISSUE — Session Dates

14 of 16 clients have coaching_sessions
with session_date = 2023-02-15 or
2023-02-20. These are placeholder dates
from the initial Fathom extraction.

They do NOT reflect actual coaching
call dates.

Impact:
- Gone Quiet badges may fire incorrectly
  for recently coached clients
- Last Contact in Clients at a Glance
  will show ⚠️ for these clients
- A disclaimer is shown on all Gone
  Quiet badges explaining this

Resolution:
When Sandi uploads new Fathom transcripts
after real coaching calls, the dates
will update automatically.
The 2023 dates will be replaced as
new sessions are added.

Do not attempt to fix dates manually
without Sandi confirming actual call dates.

---

## VALIDATE/GATHER RULE — CONFIRMED MARCH 24 2026

CRITICAL: This was wrong before the March 24 call.
Do not revert this under any circumstances.

- VALIDATE = C4 and C5 ONLY
- GATHER = IC, C1, C2, C3
- PAUSE = outcome_bucket = 'paused' (overrides all)

Logic is stage-based ONLY.
Readiness scores do NOT trigger VALIDATE.
Session counts do NOT trigger VALIDATE.
Confirmed directly by Sandi Stahl on March 24 call.

---

## CONFIRMED FROM SANDI — MARCH 24 2026

### Gone quiet thresholds (confirmed exact numbers):
- IC  = 14 days
- C1  = 21 days
- C2  = 14 days
- C3  = 14 days
- C4  = 60 days
- C5  = 60 days
- Note: C4 clients can be here 10 months — that is ok.
- Sandi decides if they go inactive, not the system.

### Pink flag system (confirmed):
- No fixed number triggers a pause — Sandi decides
- Every pink flag must notify Sandi before a call
- After a call Sandi can mark a flag as addressed
- Resolved pink flag = becomes GREEN flag
- Green flag = historical record only, not a call to action
- Pink flag = still needs attention
- Storage format: prefix "resolved:" in the JSON array
- Example: ["resolved:timeline_slipping", "engagement_risk"]

### Stage movement (confirmed):
- Clients NEVER move backwards
- C4 clients may explore multiple businesses — not a regression
- Clients never skip stages
- IC calls should also be recorded in Fathom (future scope)

### Client folder names (confirmed):
- Active   = active clients currently in pipeline
- WIN      = Business Complete (purchased a franchise)
- Paused   = paused clients
- Inactive = gone quiet / closed / no longer pursuing
- These are SEPARATE folders — do not merge

### Outcome bucket display names:
- active    → Active
- converted → Business Complete
- paused    → Paused
- inactive  → Inactive

### Stage display names:
- IC → Initial Contact
- C1 → Seeker Connection
- C2 → Seeker Clarification
- C3 → Possibilities
- C4 → Client Career 2.0
- C5 → Business Purchase

### Client data corrections (from March 24 call):
- Garrett Auwae → outcome_bucket = 'inactive'
  Sandi confirmed on call: "we're going to go
  inactive on him." Fix before UAT.
- Alex Raiyn → inferred_stage must be C4
  Was incorrectly showing Business Purchase.
  Stage badge must read from inferred_stage only.

### LinkedIn — HARD STOP:
- Do NOT automate LinkedIn under any circumstances.
- Sandi said: "that is the biggest thing right now
  that could wreck my franchise agreement."
- Risk: LinkedIn blacklist = loss of primary lead source.
- Remove from all roadmap discussions with Sandi.
- Remove from all proposals and feature lists.

### Google Calendar:
- Demo to Sandi by Friday April 3 2026.
- One-way only: Coach Bot → Google Calendar.
- Do not pull data into Coach Bot.
- Do not duplicate YouCanBookMe sequences.

### Pricing — R&D tier confirmed:
- First 5 coaches: $1,000 build fee
- Month 1-6: $0 retainer
- Month 7+: $150/month
- Condition: honest feedback every 2 weeks
- Standard tier after R&D: $2,500 build, $300/month

### Migration state:
- Migrations 1-49: complete, NEVER edit
- Migration 50: coaching_sessions 9-block columns
  Column name is block_reflection_block
  NOT block_reflection (name conflict)
- Next new migration: 51+

### Sandi name:
- Always "Sandi" — never "Sandy"
- She noticed immediately on the March 24 call.

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
  (Meaning of VALIDATE/GATHER: see
  VALIDATE/GATHER RULE — CONFIRMED MARCH 24 2026 above)
Stages: IC C1 C2 C3 C4 C5
  Display: Initial Contact, Seeker Connection,
  Seeker Clarification, Possibilities,
  Client Career 2.0, Business Purchase
Never delete clients — always inactivate
Pause requires reason + follow-up date
Vision statement is created by Sandi via AI
  not extracted from files
Do not duplicate YouCanBookMe email sequences
LinkedIn: no automation — franchise agreement risk
  (see CONFIRMED FROM SANDI — March 24)
Google Calendar: one-way push only; demo by Apr 3 2026
Pricing R&D tier: $1k build / $0 mo 1-6 / $150 mo 7+
  (Fred Webster = second coach, R&D pricing applies)

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

---

## INSTALLER BUILD — HOW TO BUILD

### Local Windows build (your machine):

cd to Sandi_Bot_Desktop directory

Run: npm run tauri:build

Output: src-tauri/target/release/bundle/msi/

Requires: cargo check must pass first

Requires: pdfium.dll must be in src-tauri/

### Automated CI build (GitHub Actions):

Every git push sandi dev triggers automatic
Windows + Mac builds in GitHub Actions.

Go to github.com/Zmugha1/Sandi_Bot_Desktop

Click Actions → latest build → Artifacts

Download coach-bot-windows or coach-bot-mac

### Version bump before release:

Edit src-tauri/tauri.conf.json

Change "version": "0.1.0" to new version

Commit and push — installer name updates automatically

---

## BINARY FILES IN REPO (must never delete)

- src-tauri/pdfium.dll — Windows PDF extraction
- src-tauri/icons/icon.ico — Windows installer icon
- src-tauri/icons/icon.png — Mac build icon

These are force-added (in .gitignore) but committed.

Never delete them. Never run git clean on src-tauri.

---

## GITHUB ACTIONS WORKFLOW

File: .github/workflows/build.yml

Triggers on every push to dev branch.

Builds Windows MSI and Mac DMG simultaneously.

Artifacts retained for 30 days.

Requires secret: GH_PAT (GitHub Personal Access Token)

Set in: repo Settings → Secrets → Actions → GH_PAT

---

## CURRENT VERSION

v0.1.0 — UAT delivery March 27 2026

Sandi Stahl — Founding Partner

Windows MSI delivered via Google Drive

---

## PHASE STATUS AS OF MARCH 27 2026

Phase 4: COMPLETE

Phase 5: MOSTLY COMPLETE

  Built: CLEAR scoring, 9-block Fathom, DISC tips,
  pink flags, gone quiet badge

  Remaining: 5B emotional detection, 5E coaching plan tab

Phase 6-15: Not started — retainer months 2-24

---

## Rules added 2026-04-01

- Shell spawn and execute allowlists are defined in src-tauri/capabilities/default.json as scoped permissions (identifier shell:allow-spawn or shell:allow-execute with allow array entries name cmd args). The invoke program string must match the configured name. Do not add execute or allowlist keys under plugins.shell in tauri.conf.json — tauri-plugin-shell v2 Config only exposes shell.open (unknown fields cause errors).

- Use import type for CoachBotTool ToolCapability ToolResult ToolSetting when importing from toolManager.ts so Vite does not treat interfaces as runtime exports.

- Coach resume extraction and years_experience computation belong in knowledgeService upsertCoachProfileFromResumeText: model returns earliest_work_year; application computes currentYear minus earliest. Do not rely on a single explicit years phrase in the resume prompt.

- Google MCP tools: privacy_audit and tool_call audit rows are emitted from ToolManager.execute path; keep gmail and google-calendar calls going through ToolManager for consistent logging.

- The Capture identity clear and per-document knowledge deletes must remove knowledge_embeddings rows before knowledge_documents rows for the same ids or domains.

- Exceptions to the default never touch default.json rule apply only when explicitly requested for shell scope or capability updates; always run cargo check after capability edits.

---

## Rules added April 10 2026

Never use HACCP or any food industry
framework in Coach Bot governance.
All governance is domain-native to
professional coaching standards.

Never reference TES in any user-visible
string prompt or governance lens label.
Use stage-gate methodology or franchise
coaching methodology instead.

Never bundle multiple changes to
ClientIntelligence.tsx in one session
without testing after each commit.
It is the largest file in the app
and the highest regression risk.

Always test Vision Statement tab
after any change to ClientIntelligence.tsx.
Tab resetting to Overview = silent error.

When app shows white screen after
multiple commits — revert immediately.
Do not attempt to fix forward at
end of a long session.

uuid package requires both:
  npm install uuid
  npm install --save-dev @types/uuid

---

## Rules added April 11 2026

Never trust LLM output to follow stylistic rules in prompts. Always
post-process AI-generated text to enforce style rules.

Em dash rule applies to ALL AI-generated content, not just UI text. Strip
after generation:

```text
.replace(/\u2014/g, ',')
.replace(/\u2013/g, ',')
.replace(/--/g, ',')
```

Vision Statement always rebuilt
in three prompts:
  A clean B handlers C JSX
Never bundle for large files.

Fathom transcripts are paste only.
Never build file upload for Fathom.
extractFathomSession takes rawText
not a file path.

My Practice score uses adaptive
weighting. Never show F grade
because data sources are empty.
Exclude empty sources from average.

Health badges removed from all pages.
Never add HealthIndicator to
individual pages. System Health
page only.

Quick Reflection is disabled.
Do not re-enable until v1.5.

PPT colors never use hash prefix.
Always 6 digit hex without hash.
PptxGenJS rule permanent.

Em dashes always post-processed.
Never trust LLM prompt style rules.
Strip after every generation.

Three question test is mandatory
for every UI element decision.
All three must pass to keep.

## Rules added April 11 2026 (continued)

Fathom tab is unified single section.
Never two separate upload and manual
sections. One Add Session with two
mode tabs.

Session date always updates
last_contact_date on client.
These must stay in sync.
Gone quiet depends on this.

Never render raw JSON arrays in JSX.
Always use formatNextActions or
equivalent helper.

Sandi's Notes append to existing
session under Coach Assessment.
Never create new session for notes.

Calendar and Gmail always use
same strict full-name filter.
Apply filter changes to both
at the same time.

## Rules added April 14 2026

Google credentials must be baked
into the build at compile time.
Never read from environment variables
at runtime in production builds.
This caused failure at Sandi's
Monday delivery.

Every installer must create a
desktop shortcut automatically.
Sandi could not find Coach Bot
after closing it.
Add to NSIS config every time.

Ollama health check required before
every AI operation.
Council and extraction failed
mid-session without it.
Never assume Ollama is ready
between operations.

Vision statement must enforce
future tense throughout.
Sandi caught past tense immediately.
Always specify tense explicitly
in vision generation prompt.
Post-process if needed.

Never replace client DB without
explicit warning.
Client edits must be preserved
or migrated never silently lost.

DB trust rule is permanent:
If client has used the system
their data is sacred.
Communicate before any DB change.
