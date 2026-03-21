# Coach Bot — Complete Production Roadmap
**AI Solutions Architect:** Dr. Data — Decision Intelligence
**Client:** Sandi Stahl — Franchise Coach, The Entrepreneur's Source (do not reference TES by name in any UI or marketing)
**Product:** Coach Bot — Airgapped Coaching Intelligence Desktop Application
**Production Repo:** github.com/Zmugha1/Sandi_Bot_Desktop
**Branch:** dev | Push: git push sandi dev
**Last Updated:** March 21 2026

---

## CRITICAL RULES — NEVER VIOLATE

1. Never reference "The Entrepreneur's Source" or "TES" in any UI, prompt, or marketing copy. Use "resource brain," "methodology resources," or "coaching framework."
2. Never use better-sqlite3. Always use tauri-plugin-sql with SQLite.
3. Never use pdf-parse. Use text_extractor.rs (Rust crate) as primary.
4. Never upgrade Tailwind to v4. Stay on Tailwind 3.4.
5. Never use Electron. Tauri v2 only.
6. Always run cargo check before npm run tauri:dev.
7. Every recommendation the system makes must be logged to audit_log. Governance is non-negotiable.
8. Business logic in services only, never modules.
9. Client config in configs/ only, never hardcoded.
10. Add to TOOLS.md before building any new agent.
11. client_id is TEXT/UUID — never number.
12. Database is sandi_bot.db via getDb().
13. Never edit migrations 1-47. New migrations start at 48+.
14. Work on dev branch only.
15. Never delete clients — inactivate them (outcome_bucket = 'inactive').
16. Do not duplicate YouCanBookMe automated email sequences.

---

## TECH STACK

| Layer | Technology | Notes |
|---|---|---|
| UI Framework | React 19 + TypeScript | Preserved from POC |
| Build Tool | Vite 5 | Preserved from POC |
| Styling | Tailwind CSS 3.4 | DO NOT upgrade to v4 |
| Components | shadcn/ui + Radix UI | Preserved from POC |
| Charts | Recharts | Preserved from POC |
| Desktop Shell | Tauri v2 (Rust) | ~5MB installer |
| IPC Bridge | @tauri-apps/api invoke() | TS → Rust commands |
| Database | SQLite via tauri-plugin-sql | Single .db file |
| Search | SQLite FTS5 | Built into SQLite |
| File System | tauri-plugin-fs | Native OS access |
| Folder Picker | tauri-plugin-dialog | Backup location UI |
| PDF Extraction | text_extractor.rs | Primary extractor |
| OCR | Tesseract CLI | For image-based PDFs |
| LLM Runtime | Ollama (local server) | localhost:11434 |
| LLM Model | qwen2.5:7b-instruct-q4_k_m | Confirmed optimal for hardware |
| LLM Fallback | llama3.1:8b, phi3:mini | Available on machine |
| Knowledge Graph | Neo4j Community (local) | Phase 8+ |
| Graph Embeddings | Node2Vec (Python script) | Phase 10+ |
| IDE | Cursor | CLAUDE.md as session memory |

---

## SANDI'S MACHINE — FILE STRUCTURE

```
C:/Users/zumah/SandiBot/
├── clients/
│   ├── Active/         ← real client files confirmed here
│   │   └── Alex_Raiyn/
│   │       ├── Alex Raiyn - Convo.pdf
│   │       ├── Alex Raiyn - ttsi.pdf
│   │       ├── Alex Raiyn - TUMAY.pdf      ← in Active/ root, not subfolder
│   │       ├── Alex Raiyn - Vision Statement.pptx ← in Active/ root
│   │       └── Alex Raiyn - You2.pdf
│   ├── Paused/         ← confirmed: Elizabeth_Jikiemi example
│   └── WIN/            ← confirmed: David_Van_Abbema example
└── AppData/Roaming/com.sandibot.desktop/
    └── backups/
        └── sandi_bot_20260320_004511.db    ← confirmed working backup
```

---

## DATABASE — CONFIRMED SCHEMA (March 2026)

### clients table (confirmed columns)
```sql
id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, company TEXT,
outcome_bucket TEXT,        -- active / converted / paused / inactive
inferred_stage TEXT,        -- IC / C1 / C2 / C3 / C4 / C5
readiness_score INTEGER,    -- always 0 in DB — calculated live in service
pink_flags TEXT,            -- JSON array of flag strings
tumay_data TEXT,            -- JSON from TUMAY extraction
vision_statement TEXT,      -- from PPTX extraction
updated_at TIMESTAMP
```

### client_disc_profiles (confirmed)
```sql
id INTEGER, client_id TEXT, natural_d INTEGER, natural_i INTEGER,
natural_s INTEGER, natural_c INTEGER, adapted_d INTEGER, adapted_i INTEGER,
adapted_s INTEGER, adapted_c INTEGER, primary_style_label TEXT (unreliable — always derive from scores)
```

### client_you2_profiles (confirmed columns)
```sql
id INTEGER, client_id TEXT, one_year_vision TEXT, spouse_name TEXT,
spouse_role TEXT, spouse_on_calls TEXT, spouse_mindset TEXT,
financial_net_worth_range TEXT, credit_score INTEGER, launch_timeline TEXT,
dangers TEXT, strengths TEXT, opportunities TEXT, areas_of_interest TEXT,
time_commitment TEXT, reasons_for_change TEXT, location_preference TEXT,
skills TEXT, prior_business_experience TEXT, self_sufficiency_excitement TEXT,
additional_stakeholders TEXT, you2_confirmed INTEGER, updated_at TIMESTAMP
```

### coaching_sessions (confirmed after Migration 48)
```sql
id INTEGER, client_id TEXT, session_date TEXT, session_number INTEGER,
stage TEXT, notes TEXT, next_actions TEXT, updated_at TIMESTAMP,
clear_curiosity INTEGER DEFAULT 3, clear_locating INTEGER DEFAULT 3,
clear_engagement INTEGER DEFAULT 3, clear_accountability INTEGER DEFAULT 3,
clear_reflection INTEGER DEFAULT 3, clear_notes TEXT,
overall_clear_score REAL, call_duration TEXT
```

### Other confirmed tables
```
audit_log, backup_log, client_stage_log, document_extractions,
documents, knowledge_search (FTS5), sessions, stz_feedback_log
```

---

## CONFIRMED CLIENT DATA (Ground Truth)

| Name | Bucket | Stage | Sessions | DISC Dominant | Notes |
|---|---|---|---|---|---|
| Alex Raiyn | active | C4 | 7 | I (75) | Influencing Driver |
| Andrew Tait | active | C1 | 0 | S (84) | Supporting Analyzer — ground truth |
| Bigith Pattar Veetil | active | C1 | 0 | C (64) | Analyzing type |
| Dena Sauer | active | C1 | 3 | I (78) | 2 pink flags — active not paused |
| Garrett Auwae | active | C4 | 4 | D (77) | High D |
| Jeff Dayton | active | C4 | 4 | S (80) | High S |
| Matthew Pierce | active | C1 | 3 | C (71) | |
| Miles Martin | active | C1 | 3 | S (80) | |
| Stan Stabner | active | C1 | 3 | D (83) | |
| Vito Sciscioli | active | C1 | 3 | I (94) | Persuading Promoter |
| David Van Abbema | converted | C5 | 2 | I (86) | |
| Kevin Lynch | converted | C5 | 2 | I (78) | |
| Mike Cain | converted | C5 | 2 | I (83) | |
| Elizabeth Jikiemi | paused | C4 | 4 | D (94) | |
| Mark Neff | paused | C2 | 2 | C (92) | |
| Mike Brooks | paused | C2 | 2 | I (83) | |
| Nathan Stiers | paused | C2 | 2 | D (89) | |

**DISC Distribution (real data):** D=4, I=7, S=3, C=3
**Current readiness (calculated live):** VALIDATE=8, GATHER=2, PAUSE=4

---

## SANDI'S KNOWN PREFERENCES AND WORKFLOW

From March 20 2026 video call:

### Language preferences
- PUSH → **VALIDATE** (C3/C4 phase — they have what they need, confirming direction)
- NURTURE → **GATHER** (C1/C2 phase — collecting info, emotional coaching)
- PAUSE → stays PAUSE (life happened)
- Compartments not stages — she says "Compartment 1" not "C1"
- "Stalled" → **Paused** (already corrected in proposal)
- Never delete clients — **Inactivate** them

### Morning workflow
1. Check who is on her calendar today
2. Look for tasks and follow-up reminders
3. Review any clients needing attention
4. Wants this all visible from one dashboard view

### Coaching style (self-identified)
- Too informational, not emotional enough
- Scores 7.5 on good calls, 5 on calls where she explains instead of asks
- Needs AI to supplement emotional question prompting
- Clear framework reminder helps but she needs DISC-specific question suggestions

### Re-engagement protocol (her exact process)
1. Review client file first
2. Send email: "Hey, how we doing, where we at"
3. No response → phone call
4. 2-3 reschedules or no-shows → ghosting status
5. Final email: "My time is valuable, here's my calendar link"
6. No response → inactivate

### Post-conversion
- Converted clients go off radar after purchase
- C4 clients who paused or said no → follow up 6-12 months later
- Referral ask → 90 days after successful conversion

### Vision statement process
- Sandi creates it (not the client)
- Takes DISC + You2 + Fathom conversation
- Iterates in ChatGPT until it reflects entrepreneurial business ownership mindset
- Wants Coach Bot to automate this and output a downloadable PPTX in her template

### YouCanBookMe integration (do not duplicate)
Sandi already has automated sequences:
- Appointment confirmation email (immediate)
- 2-day reminder email
- 24-hour text reminder
- 1-hour text reminder
- Post-session thank you email with 2 podcasts
- No-show email with reschedule link

Coach Bot should NOT replicate these. Only add re-engagement and referral templates.

### Legal boundary
- Do not reference TES or Entrepreneur's Source anywhere in app, proposals, or marketing
- Documents shared by Sandi are from her franchise investment — private to her system
- Airgapped architecture is her compliance answer to data safety questions

---

## JOANNA TRANSCRIPT — KEY INTELLIGENCE EXTRACTED

From TES_CLEAR_Coaching_Transcript_Joanne_COMPLETE.txt (March 2026)

### CLEAR benchmark scoring (now confirmed)

**C — Contracting**
- 1/5: No session goal. Coach jumps into content.
- 3/5: Coach mentions what will happen today.
- 5/5: "What would make this conversation valuable for you?" Client owns direction.

**L — Listening**
- 1/5: Coach talks more than client. Explains franchising logic.
- 3/5: Coach asks some questions but follows with explanation.
- 5/5: Coach asks → waits → "tell me more." Client reveals trauma, health, guilt. Coach says only "how does that make you feel?"

**E — Exploring**
- 1/5: Logical only. No emotional imagery.
- 3/5: Coach paints picture using franchise examples (McDonald's analogy).
- 5/5: "Imagine 3 years from now — what does your life look like?" Client describes schedule, hobbies, freedom unprompted.

**A — Action**
- 1/5: Vague next steps.
- 3/5: Next call scheduled by coach.
- 5/5: Client defines their own next step. "What would be a smart next step for you?"

**R — Review**
- 1/5: Session ends without reflection.
- 3/5: Coach summarizes what happened.
- 5/5: Coach surfaces insight client did not name. "Everything you talked about today was practical. There is no fun in your life." Client immediately agrees.

### Sandi's coaching failure pattern (precisely defined)
- Talking ratio too high — explains instead of asks
- Informational questions outnumber emotional questions
- "Teaching mode" replaces "discovery mode"
- Best question she never asked: "What would need to happen for you to feel ready?"
- Tax write-off framing created ethical perception risk

### Session scores from ChatGPT assessment
| Dimension | Session 1 | Session 2 |
|---|---|---|
| Rapport | 8/10 | 9/10 |
| Emotional Discovery | 6/10 | 8/10 |
| Listening vs Talking | 7/10 | 5.5/10 |
| Vision Building | 6/10 | 9/10 |
| CLEAR Structure | 7/10 | 7.5/10 |
| Coaching Purity | 8/10 | 6/10 |
| Overall | ~7/10 | 7.5/10 |

### High C disengagement warning signs
- "needs more time" / "wants to think about it" → Decision timeline slipping
- "that makes sense" / "I understand" without follow-up questions → Overly agreeable
- Asking only about fees, structure, legal → Technical question mode
- Energy drop, shorter answers, less enthusiasm → Declining investment
- "my current job isn't that bad" → Fear reframing reality
- "I need to do more research on my own" → Late-stage exit signal

### DISC-specific coaching approach (confirmed by Sandi)
| Style | Approach | Questions | Avoid | Re-engagement |
|---|---|---|---|---|
| High D | Direct, purposeful, results | "What result are you trying to achieve?" "What's holding you back?" | Long explanations, process detail | Direct email, specific question, no fluff |
| High I | Enthusiasm, stories, possibilities | "How would your friends react?" "What excites you most?" | Data-heavy, linear logic | Tell success story, reconnect with excitement |
| High S | Thorough, stable, step-by-step | "What would make this feel safe?" "How would this affect your family?" | Rushing, pressure, rapid change language | Check in warmly, ask about family, no pressure |
| High C | Facts, structure, proven systems | "What information would give you confidence?" "What would have to be true to feel ready?" | Vision-only selling, emotional pressure | Send data, give time, ask specific question |

---

## STZ FRAMEWORK — COMPLETE MAPPING

### L1 — Prompts
- TES vocabulary injected into every prompt: CLEAR, DISC, TUMAY, pink flag, validation, gathering
- Few-shot examples: 3 correct You2 vision extractions
- Negative examples: "never include question text, return only vision text"
- Emotional vs informational question classification prompt (new from Joanna)

### L2 — Skills
- extract_disc(), extract_you2(), extract_fathom(), extract_tumay() — separate tasks
- PUSH/NURTURE/PAUSE (now VALIDATE/GATHER/PAUSE) criteria encoded
- Fathom schema: financial readiness, credit score, pink flags, objections, spouse alignment
- You2 schema: one_year_vision, dangers, strengths, opportunities, skills, ILWE

### L3 — Agents
- Pipeline: ingest → detect type → run skill → validate JSON → surface for review
- document_ingestion_agent — raw file to structured SQLite extraction (built)
- Pre-call prep RAG — Phase 10 (retrieves similar corrections for dynamic context)
- Gone quiet re-engagement workflow — Phase 6
- Post-placement follow-up timer — Phase 9

### L4 — Contracts
- Data Review UI — every extraction confirmed before entering training data (built)
- Deterministic extraction for structured fields — LLM only fires on failure
- Correction rate tracking — highest correction rate fields flagged for review
- Airgapped architecture — fully offline, no cloud transmission
- Human confirms data → enters training. Unconfirmed → never used.

### L5 — Evaluation
- extraction_corrections table → DPO preference pairs → LoRA training data
- Accuracy targets: DISC ~100%, You2 ~95%, Fathom ~75%, TUMAY ~70%
- RAG retrieval flags new doc when it matches past correction patterns — Phase 10
- Month 6: first QLoRA run (15-25% gain expected)
- Month 12: production model
- Year 2: multi-coach

### Governance layer (across all 5)
- Every recommendation logged to audit_log with full reasoning
- EU AI Act compliance built in from day one
- Full audit trail — explainable AI at every decision point

---

## COMPLETE PHASE PLAN

---

## PHASE 1 — Tauri Desktop Foundation ✅ COMPLETE

**Delivered:** Tauri v2 app launches as desktop window. All 8 modules render. IPC bridge works.

**Modules built:**
- ExecutiveDashboard.tsx
- ClientIntelligence.tsx
- PipelineVisualizer.tsx
- LiveCoachingAssistant.tsx
- PostCallAnalysis.tsx
- AdminStreamliner.tsx
- AuditTransparency.tsx
- HowToUse.tsx

**Key fixes delivered:**
- file_watcher.rs move || syntax fixed
- backup.rs Database::load() pattern fixed
- ErrorBoundary wrapping all modules
- Sidebar navigation working

---

## PHASE 2 — Database and Real Persistence ✅ COMPLETE

**Delivered:** All data survives close and reopen. SQLite via tauri-plugin-sql.

**Services built:**
- db.ts — singleton database connection
- clientService.ts — full CRUD
- auditService.ts — every action logged
- searchService.ts — FTS5 queries

**Migrations 1-47 complete.**

---

## PHASE 3 — Document Ingestion Pipeline ✅ COMPLETE

**Delivered:** Real client files extracted and stored in SQLite.

**Extractors built:**
- text_extractor.rs — PDF, PPTX, DOCX, TXT, CSV handling
- disc_parser.rs — deterministic regex, confirmed 100% accuracy
- you2_parser.rs — deterministic You2 extraction
- tumay_parser.rs — deterministic TUMAY PDF extraction
- documentExtractionService.ts — Ollama pipeline with fallback
- bulkImportService.ts — per-file error isolation

**Confirmed extracted:**
- 17/17 DISC profiles with real scores
- 17/17 You2 profiles with real visions
- 45 coaching sessions from Fathom transcripts

**Outstanding (carry to Phase 4 P0):**
- Vision PPTX extraction: pipeline built, not yet run against all 17 clients
- TUMAY PDF extraction: parser built, path mismatch fixed, not yet confirmed for all 17

---

## PHASE 4 — Polish, Stabilize, and UAT Handover 🔄 IN PROGRESS

**Commits delivered:**
- ff2fdeb — Stage Readiness Service
- 6c68903 — Dashboard Wiring (VALIDATE=8, GATHER=2, PAUSE=4)
- b5c3b1c — Modal Tabs (You2 from correct table)
- fa35d3a — Migration 48 (CLEAR columns in coaching_sessions)
- 1b58e77 — Post-Call Analysis wired to real DB
- 85edcc3 — Client Card Polish (derived DISC labels, real readiness)
- 77661cc — You2 JSON parsing, Fathom sessions tab, DISC labels
- fc5d22d — Phase 4 Backup (confirmed working: sandi_bot_20260320_004511.db)
- a2c0dbd — Vision extraction fix
- 9c587db — TUMAY parser built and registered
- b1af3b6 — Live Coaching Assistant wired to real client data
- d7f2772 — Bulk re-extract button in Admin Streamliner
- 4fa46c2 — list_directory command registered in Rust
- 5f0d38d — Extraction path fix (files in Active/ root, not subfolder)

**P0 — Must complete before UAT handover:**

### P0-1: Rename VALIDATE/GATHER/PAUSE
Files to touch:
- src/services/stageReadinessService.ts
- src/services/dashboardService.ts
- src/modules/ExecutiveDashboard.tsx
- src/modules/ClientIntelligence.tsx
- src/modules/PipelineVisualizer.tsx

Replace everywhere:
- PUSH → VALIDATE
- NURTURE → GATHER
- PAUSE stays PAUSE

### P0-2: Delete → Inactivate (Migration 49)
Add to Migration 49:
```sql
-- No ALTER needed — outcome_bucket already TEXT
-- Just add 'inactive' as valid value in service layer
```
In ClientIntelligence.tsx: replace Delete button with Inactivate button.
Inactivate sets outcome_bucket = 'inactive'.
Inactive clients do not appear in any pipeline count.
Data is fully preserved for reactivation.

### P0-3: Pause requires reason + follow-up date (Migration 49)
```sql
ALTER TABLE clients ADD COLUMN pause_reason TEXT;
ALTER TABLE clients ADD COLUMN follow_up_date DATE;
ALTER TABLE clients ADD COLUMN referral_source TEXT;
ALTER TABLE clients ADD COLUMN referred_by TEXT;
ALTER TABLE clients ADD COLUMN referral_ask_sent DATE;
```
When Sandi moves a client to PAUSE: modal appears requiring:
- Reason (free text, required)
- Follow-up reminder date (date picker, required)
These appear in the daily brief when the date arrives.

### P0-4: Pipeline Visualizer clickable by stage
Each stage compartment (IC, C1, C2, C3, C4, C5) shows client count.
Click the compartment → see all clients in that stage.
From there Sandi can manually move a client to next stage.
Move is logged to audit_log and client_stage_log.

### P0-5: App name Coach Bot everywhere
Find and replace "Sandi Bot" with "Coach Bot" in:
- tauri.conf.json (app name, identifier)
- src/App.tsx
- src/modules/ (any hardcoded references)
- StatusBar.tsx
- README.md

### P0-6: Remove TES references from UI
Search entire src/ for "Entrepreneur's Source", "TES", "esourcecoach"
Replace with "coaching framework", "resource brain", or remove.

### P0-7: Complete vision and TUMAY extraction for all 17 clients
The Re-Extract Vision & TUMAY button is in Admin Streamliner → Import tab.
Click it. Wait for summary.
Run verification query:
```sql
SELECT name,
  CASE WHEN vision_statement IS NOT NULL AND LENGTH(vision_statement) > 10
    THEN 'YES' ELSE 'EMPTY' END as vision,
  CASE WHEN tumay_data IS NOT NULL AND LENGTH(tumay_data) > 5
    THEN 'YES' ELSE 'EMPTY' END as tumay
FROM clients ORDER BY name;
```
Target: vision populated for clients who have PPTX files. TUMAY populated for clients who have TUMAY PDFs.

### P0-8: Client card match POC quality
The POC shows (Andrea Kelleher example):

**Overview tab must show:**
- Stage badge + compartment number
- Persona field (derive from You2 financial + motivation pattern)
- VALIDATE/GATHER/PAUSE badge with readiness %
- Readiness broken into 4 dimensions: Identity/Commitment/Financial/Execution
- Contact: email, phone, company (show — when null)
- Coaching Notes (AI-generated bullets from DISC + You2 + latest Fathom)
- Pink flags visible (count badge + list)

**4-dimension readiness calculation:**
```
Identity     = one_year_vision length > 100 chars? +25 : 0
Commitment   = spouse_on_calls = yes? +15 : 0 + launch_timeline set? +10 : 0
Financial    = credit_score > 700? +15 : 0 + net_worth_range not null? +10 : 0
Execution    = prior_business_experience not null? +15 : 0 + skills not null? +10 : 0
Each dimension displayed as X/5 (divide by 5)
```

**DISC tab must show:**
- Dominant style badge (I, D, S, or C)
- Full style description (hardcoded per style)
- Key traits as badges (hardcoded per style)
- D/I/S/C scores with visual bars
- DISC-specific coaching tips (from Sandi call + Joanna transcript)

**You 2.0 tab must show:**
- Vision statement quote
- Dangers as bullet list (JSON parsed)
- Opportunities as bullet list (JSON parsed)
- Skills Profile: Favorite / Delegate / Interested In (JSON parsed)
- ILWE Priorities if available

**TUMAY tab must show:**
- Personal Info: Age, Location, Work Preference, Timeline
- Financial Profile: Credit Score, Net Worth, Liquid Capital
- Spouse/Partner: Name, Occupation, Supportive, Involvement
- Industries of Interest
- Why Now
- If null: "No TUMAY data yet."

**Vision tab must show:**
- Vision Paragraph
- Journey Mindset (derive from You2 if missing)
- Success Definition (derive from You2 if missing)
- Key Motivators
- If null: "No vision statement yet."

**Fathom tab must show:**
- Each session: date, stage, notes, next steps, blockers, wins
- CLEAR score badge if overall_clear_score is not null
- If zero sessions: "No sessions recorded yet."

**NEW: Reminders tab (add after Fathom):**
- Active reminders with date and note
- Add reminder button: date picker + note field + type selector
- Reminders appear in daily brief when due
- Pause info: reason + follow-up date if client is paused

### P0-9: Windows installer build
After all P0 items complete:
```bash
cargo check
npm run tauri build
```
Output: src-tauri/target/release/bundle/ (.exe and .msi)
Document SmartScreen warning and workaround for Sandi.

### P0-10: StatusBar showing correct data
Bottom bar on every screen:
- Last backup: date + green/amber/red indicator
- Client count: "17 clients"
- Ollama status: running/offline
- Click backup indicator → triggers backup immediately

**UAT delivery target:** Friday March 27 2026
**Install on Sandi's laptop. Run 3-day UAT. Collect feedback.**

---

## PHASE 5 — CLEAR Intelligence Engine

**What this unlocks:** Sandi's coaching weakness becomes her strongest tool. Post-Call Analysis becomes a real coaching improvement system.

### 5A — CLEAR scoring benchmark rubric
Replace the generic 1-5 sliders in PostCallAnalysis.tsx with the rubric from Joanna transcript.

Each dimension gets:
- Definition (what it means in TES coaching)
- 1/5 example (what Sandi does wrong)
- 5/5 example (what elite coaching looks like)
- Suggested question for this client's DISC style

Rubric stored in: `src/config/clearRubric.ts`

### 5B — Emotional vs informational question detection
After Post-Call Analysis save, send session notes to Ollama:

Prompt template (`prompts/emotional_detection.txt`):
```
You are a TES CLEAR coaching assessor.
Analyze the coaching notes below.
Classify each question as EMOTIONAL or INFORMATIONAL.
EMOTIONAL: targets feelings, values, identity, fears, desires
INFORMATIONAL: targets facts, logistics, timelines, finances

Return ONLY valid JSON:
{
  "emotional_count": N,
  "informational_count": N,
  "emotional_ratio": 0.0,
  "sample_emotional": ["question1", "question2"],
  "sample_informational": ["question1", "question2"],
  "coaching_note": "one sentence feedback"
}
```

Display in Post-Call Analysis Insights tab:
- Emotional depth bar (green >= 60%, amber 40-60%, red < 40%)
- Sample questions from each category
- DISC-specific suggested question for next call

### 5C — DISC-specific coaching tips (hardcoded)
Store in `src/config/discCoachingTips.ts`:
```typescript
// Full DISC tips object as defined in Joanna transcript section above
// D: direct/purposeful, I: enthusiasm/stories, S: thorough/stable, C: facts/structure
// Each style has: coaching_approach, questions[], avoid, reengagement
```

Surface in:
- DISC tab on client card (coaching tips section)
- Coaching Plan tab (suggested questions for next call)
- Live Coaching Assistant (context panel)

### 5D — Disengagement warning sign detection
After each Fathom session import, run notes through Ollama.
Detect High C warning patterns from Joanna transcript.
If detected → add pink flag with type = 'engagement_risk'.

Pink flag types:
```
engagement_risk    → amber badge "Engagement Risk"
timeline_slipping  → amber badge "Timeline Concern"
financial_concern  → amber badge "Financial Review"
spouse_alignment   → red badge "Spouse Not Aligned"
ghosting_risk      → red badge "Ghosting Pattern"
```

Pink flag badge visible on client card without opening modal.
Pink flag list visible in Overview tab.

### 5E — Coaching Plan tab (new tab on every client card)
Generated by Ollama from DISC + You2 + latest Fathom + current stage.

Prompt template (`prompts/coaching_plan.txt`):
```
You are Coach Bot, a TES franchise coaching intelligence system.
Generate a coaching plan for the next call with this client.

Client profile:
{disc_style}, {current_stage}, {you2_vision}, {recent_session_notes}

Return ONLY valid JSON:
{
  "next_call_objective": "...",
  "emotional_questions": ["...", "...", "..."],
  "blockers_to_address": ["...", "..."],
  "wins_to_reinforce": ["...", "..."],
  "disengagement_watch": "...",
  "suggested_opening": "..."
}
```

Display as formatted coaching card. Regenerate button to refresh.
Logged to audit_log with action_type = 'coaching_plan_generated'.

**Migration needed:** None. Uses existing tables.
**New files:** src/config/clearRubric.ts, src/config/discCoachingTips.ts, prompts/emotional_detection.txt, prompts/coaching_plan.txt
**Files to edit:** src/modules/PostCallAnalysis.tsx, src/modules/ClientIntelligence.tsx

---

## PHASE 6 — Daily Coaching Intelligence

**What this unlocks:** Sandi opens Coach Bot every morning instead of Google Calendar.

### 6A — Daily coaching brief (top of Executive Dashboard)
Widget showing:
```
TODAY — [date]

Your Calls Today (manual entry for now, Gmail in Phase 11)
  [Add call button]

Priority Actions
  VALIDATE (N clients)
    [name] — [stage] ready. Suggest: [action]
  GATHER (N clients)
    [name] — [stage], 0 sessions. Suggest: schedule first call
  Attention Needed
    [name] — N pink flags. [flag type]

Follow-up Reminders Due Today
  [name] — [note] (set [date])
```

### 6B — Gone quiet detection
Migration 50 adds `last_contact_date DATE` to clients table.
Updated on every coaching session save.

Gone quiet thresholds by stage (ask Sandi to confirm exact days on Tuesday):
```
IC:  3+ days  → gone quiet badge
C1:  14+ days → gone quiet badge
C2:  14+ days → gone quiet badge
C3:  21+ days → gone quiet badge
C4:  30+ days → gone quiet badge (validation takes longest)
```

When triggered:
- Amber badge "Gone Quiet" on client card
- Appears in daily brief with DISC-specific re-engagement script
- Re-engagement script varies by DISC style (from 5C)

### 6C — Reminder system
Migration 50 adds reminders table:
```sql
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  reminder_date DATE NOT NULL,
  note TEXT NOT NULL,
  reminder_type TEXT DEFAULT 'follow_up',
  completed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
```

Reminder types: follow_up, referral_ask, re_engagement, c4_revival

New Reminders tab on client card. Daily brief shows reminders due today or overdue.
Optional: push to Google Calendar (Phase 11).

### 6D — Stage gate system
When Sandi moves a client to next stage, check gates:
```
Any → C1: initial call complete (fathom_count >= 1 OR manual override)
C1  → C2: has_disc required. Warning if missing.
C2  → C3: has_disc + has_you2 required. Warning if missing.
C3  → C4: has_disc + has_you2 + fathom_count >= 1 required.
C4  → C5: has_disc + has_you2 + vision_statement not null required.
```

Warning shown as modal — not a block. Sandi can override.
Override reason required. Override logged to audit_log.

**Migration needed:** Migration 50 (last_contact_date + reminders table)
**Files to edit:** ExecutiveDashboard.tsx, ClientIntelligence.tsx, PipelineVisualizer.tsx, stageReadinessService.ts

---

## PHASE 7 — Vision Generation and LLM Upgrade

**What this unlocks:** Vision statement auto-generated. PPTX downloads automatically. Extraction pipeline upgraded from regex to LLM-first.

### 7A — Vision statement auto-generation
Button "Generate Vision" on Vision tab of client card.
Triggers Ollama call with:
- Client DISC profile
- You2 one_year_vision + dangers + opportunities
- Latest Fathom session notes
- Prompt template directing toward entrepreneurial business ownership language

Prompt template (`prompts/vision_generation.txt`):
```
You are generating a franchise coaching vision statement.
The statement should reflect entrepreneurial business ownership mindset.
It should be personal, specific to this client's values, and inspiring.
Based on the client profile below, generate a vision statement.
Return ONLY the vision statement text. No explanation. No markdown.

Client profile:
DISC Style: {disc_style}
You 2.0 Vision: {one_year_vision}
Key Strengths: {strengths}
Primary Motivator: {areas_of_interest}
Timeline: {launch_timeline}
Income Goal: {financial_net_worth_range}
```

Sandi reviews → approves → saved to clients.vision_statement.

### 7B — PPTX auto-download
After approval, generate PPTX using Sandi's template.
Output to: ~/SandiBot/downloads/[ClientName]_Vision.pptx

Uses `pptxgenjs` on frontend or Rust PPTX generation.
Template: standard Sandy Stahl coaching presentation format.

### 7C — LLM document parsing upgrade
Replace regex baseline with LLM-first extraction.

Model routing:
```
DISC (structured numeric) → deterministic Rust parser (keep — 100% accuracy confirmed)
You2 (narrative)          → qwen2.5:7b
Fathom (conversational)   → qwen2.5:7b
TUMAY (structured form)   → qwen2.5:7b with fallback to deterministic
Vision (PPTX)             → text_extractor.rs direct (no LLM needed)
```

Fallback chain:
```
LLM available + valid JSON    → use LLM result
LLM available + invalid JSON  → log warning, try deterministic
LLM unavailable               → use deterministic silently
Deterministic fails           → flag for manual review in Data Review UI
```

All parsing decisions logged to audit_log with model_used field.

**Migration needed:** None
**New files:** prompts/vision_generation.txt, updated prompts/disc.txt, you2.txt, fathom.txt, tumay.txt
**Files to edit:** documentExtractionService.ts, ClientIntelligence.tsx (Vision tab)

---

## PHASE 8 — Neo4j Knowledge Graph

**Prerequisites:** 50+ clients in SQLite with outcome labels. Sandi using system 4+ weeks.

**What this unlocks:** Coach Bot learns from patterns across all clients. "Clients similar to Alex" recommendation becomes evidence-based.

### 8A — Neo4j health check
Neo4j Community installed at localhost:7687.
StatusBar shows: green dot "Graph: connected" / grey dot "Graph: offline".
App works fully without Neo4j (graceful degradation).

### 8B — Graph schema
```
Nodes:
  Client       — id, name, disc_style, outcome_bucket
  DISCProfile  — d, i, s, c scores
  Stage        — name (IC/C1-C5)
  Objection    — text, frequency
  Script       — name, content
  Outcome      — CONVERTED/PAUSED/INACTIVE
  Session      — date, clear_score, emotional_ratio

Relationships:
  (Client)-[HAS_PROFILE]->(DISCProfile)
  (Client)-[CURRENTLY_IN]->(Stage)
  (Client)-[RAISED]->(Objection)
  (Session)-[FOR]->(Client)
  (Session)-[USED]->(Script)
  (Session)-[RESULTED_IN]->(Outcome)
  (Client)-[SIMILAR_TO]->(Client)  ← computed by embedding distance in Phase 10
```

### 8C — neo4jService.ts
```typescript
connect(): Promise<void>
runQuery(cypher: string, params: Record<string, unknown>): Promise<Record[]>
getSimilarClients(clientId: string): Promise<Client[]>
getStagePatterns(stage: PipelineStage): Promise<Pattern[]>
getObjectionFrequency(discStyle: string, stage: string): Promise<Objection[]>
```

### 8D — migrate_to_neo4j.ts
Script: scripts/migrate_to_neo4j.ts
Reads all clients from SQLite.
Creates corresponding Neo4j nodes and relationships.
Idempotent — safe to run multiple times.
Run via: Admin Streamliner → Settings → "Sync to Knowledge Graph"

### 8E — Dashboard widgets
- "Clients similar to [current client]" — shows 3 similar clients + their outcomes
- "What worked at this stage" — shows patterns from clients who advanced from this stage
- Each suggestion shows evidence: "Based on 3 similar clients"

### 8F — Audit trail
AuditTransparency module shows graph query behind every suggestion.
Full evidence trail for every recommendation.

---

## PHASE 9 — Graph Pattern Recognition

**Prerequisites:** 50+ labeled outcomes in Neo4j.

**What this unlocks:** Coach Bot knows which approaches work for which DISC types at which stages.

### 9A — Similar client Cypher query
```cypher
MATCH (c:Client {id: $clientId})-[:HAS_PROFILE]->(d:DISCProfile)
MATCH (similar:Client)-[:HAS_PROFILE]->(sd:DISCProfile)
WHERE similar.id <> c.id
  AND abs(sd.natural_s - d.natural_s) < 15
  AND abs(sd.natural_i - d.natural_i) < 15
MATCH (similar)-[:CURRENTLY_IN]->(stage:Stage {name: $stage})
RETURN similar, sd
ORDER BY (abs(sd.natural_d - d.natural_d) + abs(sd.natural_i - d.natural_i)) ASC
LIMIT 3
```

### 9B — Objection frequency by DISC type and stage
Identifies common objections at each stage for each DISC profile.
Surfaces in Coaching Plan tab as "Common objections for High C at C3."

### 9C — Script effectiveness tracking
Which scripts (approaches, questions, framings) led to CONVERTED outcomes.
Surfaces as "This framing worked for 3 similar High S clients."

### 9D — Stage transition time averages
Average days per stage by DISC type.
If a client is significantly over average → triggers gone quiet alert.

### 9E — Dashboard intelligence panel
```
"At C3 with High C profile: 68% advance when given structured model comparison"
"Clients similar to Joanna: Sarah (converted C4), Mike (converted C5), Tom (paused C3)"
"Average time in C3 for High C: 21 days. Joanna has been here 35 days."
```

---

## PHASE 10 — GraphRAG and Embeddings

**Prerequisites:** 200+ labeled outcomes in Neo4j.

**What this unlocks:** System flags its own uncertainty. Recommendations backed by vector similarity. RAG trigger closes the L5 evaluation loop.

### 10A — Node2Vec training
Script: `scripts/train_embeddings.py`
```python
# Reads Neo4j graph
# Trains Node2Vec embeddings on client-outcome-stage relationships
# Saves model to ~/SandiBot/models/embeddings.pkl
# Run manually, not automatically
# Retrain every 30 days or after 20+ new labeled outcomes
```

### 10B — GraphRAG query engine
GraphRAG = Neo4j graph structure + Node2Vec embeddings combined.

Query: "What should I do with a High C client stuck in C3 for 35 days?"
System process:
1. Find client node in Neo4j
2. Retrieve embedding for that node
3. Find top 5 similar client embeddings
4. Traverse their graph: what sessions they had, what scripts were used, outcomes
5. Synthesize recommendation grounded in evidence

### 10C — Tauri Python sidecar
Inference served via Tauri Python sidecar (not Ollama — embeddings are separate).
Returns: top 3 similar clients, confidence score, evidence summary.
Displayed in Coaching Plan tab as "Next Best Action" with evidence.

### 10D — RAG confidence scoring
Each extracted field gets a confidence score (0.0 - 1.0).
Score calculated from: extraction method, field complexity, validation rules.

Thresholds:
```
>= 0.85 → accept automatically
0.70-0.84 → accept with amber badge in Data Review
< 0.70 → flag yellow warning — requires human review before saving
```

### 10E — RAG pre-call preparation
Uses Node2Vec embeddings (built in 10A/10B) to find 3 most similar clients by DISC style + stage + outcome.
Retrieves their session notes and what worked.
Injects as few-shot context into Coaching Plan prompt.
This replaces the FTS5 placeholder — true vector similarity, not keyword search.

### 10F — RAG trigger in Data Review
When extraction confidence is below threshold:
- Yellow warning badge appears in Data Review UI
- Sandi sees: "I'm not sure about this field — please verify"
- Specific field highlighted, suggested correction shown
- Correction logged to extraction_corrections table
- Corrections become DPO training pairs for next LoRA run

---

## PHASE 11 — Gmail Calendar Integration

**Prerequisites:** Contract signed. Phase 4 UAT complete.

**What this unlocks:** Today's coaching calls visible in dashboard. Follow-up reminders push to Google Calendar.

**Scope — one-way only: Coach Bot → Google Calendar**
Do NOT pull calendar data into Coach Bot (privacy, complexity).
Do NOT duplicate YouCanBookMe sequences.

### 11A — Today's calls display
Manual entry initially (Sandi types who she's talking to today).
Later: read from Google Calendar via OAuth.
Display in daily coaching brief at top of Executive Dashboard.

### 11B — Reminder push
When Sandi creates a reminder in Coach Bot, optionally push to Google Calendar.
Creates a Google Calendar event with:
- Title: "Coach Bot: [client name] — [reminder note]"
- Date: reminder_date
- Description: full context from Coach Bot

### 11C — Gmail read (optional, Phase 11 extended)
Read-only access to identify coaching-related emails.
Summarize unread emails from active clients.
Surface in daily brief as "Unread from Alex Raiyn."
Only with Sandi's explicit approval and OAuth consent.

---

## PHASE 12 — Post-Conversion and Referral System

**Prerequisites:** Phase 6 complete (reminder system).

**What this unlocks:** Sandi captures pipeline value from clients who are done coaching.

### 12A — C4 dropout revival timer
C4 clients who paused or said no → automatic 6-month follow-up reminder.
Created automatically when client moves to PAUSE from C4.
Appears in daily brief when due.
Reminder note pre-filled: "C4 client — follow up on whether circumstances changed."

### 12B — Converted client referral ask
90 days after outcome_bucket → 'converted': automatic reminder.
Reminder type: referral_ask.
Pre-filled email template:
```
Subject: Checking in — [Name]
How are things going with your new business?
I'd love to hear how everything is progressing.
If you know anyone who might benefit from a similar conversation,
I'd be honored if you'd introduce us.
```

### 12C — Referral tracking
Note: referral_source, referred_by, and referral_ask_sent columns
were added in Migration 49 (Phase 4 P0-3). No new migration needed here.
Phase 12 wires the reminder workflow against those existing columns.

Dashboard shows referral network: who referred whom.

---

## PHASE 13 — Fred Webster Build

**Prerequisites:** STZ discovery session with Fred completed. Contract signed with Fred.

**What this unlocks:** Second coach instance. Proves the productization model.

Fred's profile:
- High C/D analytical personality — process-oriented
- Franchise coach, TES network, Boise ID
- Interested in: vision statement generation, franchise document automation, Gmail integration, real-time in-call coaching
- Described as multiplier and potential distribution channel

**Deliverables:**
- STZ discovery session (25 questions) with Fred before any code
- configs/fred_webster.json — separate coach config
- Separate DB instance: fred_bot.db
- Same Tauri app, different config loaded at startup
- Any Fred-specific methodology differences encoded in his config
- Phased delivery: $3,500 deposit → Phase 3 → final delivery

---

## PHASE 14 — LLM Fine-Tuning (QLoRA)

**Prerequisites:** 6+ months of corrections in extraction_corrections table. Sandi using system daily.

**What this unlocks:** Coach Bot gets significantly better at extraction without rule changes.

### Training data pipeline
extraction_corrections table → export DPO preference pairs:
```json
{
  "prompt": "Extract You2 vision from: [text]",
  "chosen": "[Sandi's corrected extraction]",
  "rejected": "[system's original extraction]"
}
```

### Training schedule
- Month 6: first QLoRA run on qwen2.5:7b (15-25% accuracy gain expected)
- Month 12: production model replaces base model
- Year 2: multi-coach fine-tuned model

### Accuracy targets
```
DISC extraction:   ~100% (deterministic Rust — no LLM improvement needed)
You2 extraction:   ~95% → target 98%+
Fathom extraction: ~75% → target 88%+
TUMAY extraction:  ~70% → target 85%+
```

---

## PHASE 15 — Productization

**Prerequisites:** Sandi using successfully for 3+ months. Documented case study. At least one referral ready.

**What this unlocks:** Coach Bot becomes a product, not just a custom build.

### Deliverables
- Onboarding wizard (first-launch setup: coach name, methodology, folder paths)
- config.json per coach (methodology, stage names, document types, DISC tips)
- Vertical ontology packages:
  - franchise_coaching_v1.json (Sandi's methodology)
  - executive_coaching_v1.json (future)
- White-label installer (custom name, color, icon per coach)
- Multi-coach architecture (separate DB per instance, shared app binary)

### Pricing model for additional coaches
```
Setup:      $5,000-15,000 (configured, not fully custom)
Monthly:    $500-1,500 retainer
Enterprise: Franchisor buying for all coaches — quote separately
```

---

## OPEN QUESTIONS — Ask Sandi on Tuesday March 24

From the 62-question audit, these are still gaps:

**Section 2 — Stage gates (critical before Phase 6D):**
- Q6: What exactly happens at IC → C1? What defines "they're in"?
- Q8: What conversation defines C2 → C3 readiness?
- Q11: Can clients move backwards? (assume no until confirmed)
- Q20: Exact day thresholds per stage before gone quiet fires?

**Section 6 — Pink flags:**
- Q33: Which pink flags are automatic pauses vs just warnings?
- Q35: Has a pink flag ever resolved? Do we need resolved/unresolved status?

**Section 7 — DISC coaching:**
- Q41: Exact questions for High D vs High S at the same stage?
- Q42: Has DISC mismatch caused problems? (training data)

**Section 8 — CLEAR framework:**
- Q45: What does a 5/5 Reflection moment look like? (example)
- Q47: Does she score herself differently for different DISC styles?

**Section 9 — Vision statement:**
- Q49: Most common problem in a weak vision statement?
- Q50: Has a client needed to rewrite their vision? What triggered it?
- Q51: Should Coach Bot flag a weak vision before Sandi sees it?

**Section 10 — Workflow:**
- Q55: Does she want Coach Bot open during a call or only before/after?
- Confirm: what does her PPTX vision template look like? Send the template.

**Section 11 — Configuration:**
- Q60: Is GHOSTING a fourth status she wants visible (beyond VALIDATE/GATHER/PAUSE)?
- Confirm: display names for stages — are current names right?
  IC → Initial Contact
  C1 → Seeker Connection
  C2 → Seeker Clarification
  C3 → Possibilities
  C4 → Client Career 2.0
  C5 → Business Purchase

---

## RETAINER SUPPORT SCHEDULE

```
Month   Typical Work
Month 1  Phase 4 UAT, Phase 5 CLEAR engine
Month 2  Phase 6 daily brief, Phase 7 vision gen
Month 3  Phase 8 Neo4j setup (needs 50+ clients)
Month 4  Phase 9 graph patterns maturing
Month 5  Quiet — graph data accumulating
Month 6  Phase 10 first embedding run, QLoRA attempt
Month 7  Fred Webster build starts
Month 8  Phase 11 Gmail integration
Month 9  Graph pattern queries mature — tune thresholds
Month 10 Phase 12 referral system
Month 11 Quiet — system stable
Month 12 Annual review — Year 2 roadmap
Year 2   Phase 14 QLoRA production, Phase 15 productization
```

---

## HARDWARE REQUIREMENTS

```
Minimum:
  OS:      Windows 10/11 64-bit or macOS 12+
  RAM:     16GB (Sandi's laptop confirmed)
  Storage: 512GB SSD

Recommended:
  RAM:     32GB
  Storage: 1TB NVMe SSD

One-time internet required (setup only):
  Ollama installer: ~200MB
  qwen2.5:7b model: ~4.5GB
  Neo4j Community:  ~500MB
  Total:            ~5.5GB download

After setup: Zero internet required. Ever.
```

---

## DELIVERY CHECKLIST — WHAT SANDI RECEIVES AT UAT

```
[ ] Coach_Bot_Setup.exe          Windows installer
[ ] UserGuide.pdf                Daily use instructions
[ ] BackupGuide.pdf              Backup and restore procedures
[ ] HardwareGuide.pdf            Requirements and upgrade path
[ ] OnboardingChecklist.pdf      First-launch walkthrough
```

---

*This document is the single source of truth for all production development.*
*All Cursor prompts reference this file.*
*Last updated: March 21 2026*
*Developer: Dr. Data — Decision Intelligence*
