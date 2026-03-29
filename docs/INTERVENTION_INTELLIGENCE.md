# Intervention Intelligence — Coach Bot
## Dr. Data Decision Intelligence LLC
## Last updated: March 27 2026

---

## The Problem
Coach Bot detects signals but does not close
the loop between Sandi's response and the
business outcome.

## The Decision Velocity Loop
Signal → Notification → Human Decision →
Logged → Outcome Tracked → KPI Impact Measured

---

## STZ Layer Status

### L1 — Prompts
Built:
- CLEAR rubric from Joanna transcript
- Pink flag detection prompt
- Fathom 9-block extraction prompt
- DISC coaching tips config
- Gone quiet re-engagement scripts per DISC

Not yet built:
- Vision generation prompt (needs template)
- Intervention prompt templates per DISC
- Emotional question classification (5B)
- DISC verbatim phrases in Sandi's language

### L2 — Skills
Built:
- extract_disc()
- extract_you2() — partial, page range narrow
- extract_fathom()
- extract_tumay()
- stageReadinessService
- dashboardService
- backupService

Not yet built:
- interventionLogService.ts
- placementTrackingService.ts
- visionGenerationService.ts
- pptxService.ts
- feedbackService.ts
- sessionDateUpdateService.ts

### L3 — Agents
Built:
- document_ingestion_agent
- Ollama proxy via invoke('ollama_generate')
- Live Coaching Assistant chat agent

Not yet built:
- Morning brief proactive agent
- C4 coaching plan agent (5E)
- Vision generation agent
- Referral follow-up agent

### L4 — Contracts
Built:
- audit_log every action logged
- Gone quiet thresholds confirmed and built
- Pink flag resolution recording
- Airgapped architecture fully offline
- Human confirms data before training
- VALIDATE/GATHER/PAUSE logic confirmed

Not yet built:
- intervention_logs table Migration 51
- Gone quiet response window contract
- Pink flag resolution SLA contract
- C4 session cadence contract
- Placement milestone trigger
- Referral contract 90 days post-placement
- Golden rules flag for converted clients

### L5 — Evaluation and Governance
Built:
- Audit and Transparency page
- CLEAR scoring over time
- All interactions logged
- EU AI Act compliance built in

Not yet built:
- Intervention effectiveness report
- Coaching KPI trend longitudinal view
- In-app feedback layer
- Extraction accuracy tracking per field
- Decision Velocity Loop
- extraction_corrections to DPO to LoRA

---

## Migration Schemas

### Migration 51 — intervention_logs
CREATE TABLE intervention_logs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  signal_date TEXT NOT NULL,
  response_type TEXT,
  response_date TEXT,
  response_notes TEXT,
  outcome_checked_date TEXT,
  outcome TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

### Migration 52 — user_feedback
CREATE TABLE user_feedback (
  id TEXT PRIMARY KEY,
  page_name TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  rating TEXT,
  feedback_text TEXT,
  feature_name TEXT,
  thumbs_up INTEGER,
  session_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

### Migration 53 — clients table additions
ALTER TABLE clients ADD COLUMN
  poc_reached_date TEXT;
ALTER TABLE clients ADD COLUMN
  trigger_submitted_date TEXT;
ALTER TABLE clients ADD COLUMN
  business_purchase_date TEXT;
ALTER TABLE clients ADD COLUMN
  placement_revenue TEXT;
ALTER TABLE clients ADD COLUMN
  vision_approved INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN
  vision_approved_date TEXT;
ALTER TABLE clients ADD COLUMN
  golden_rules_notes TEXT;

---

## $300K KPI Cards — Dashboard

Card 1: Placement Tracker
  X of 11 placements | $X of $300,000
  Updates when client marked Business Purchase

Card 2: At Risk This Week
  C3/C4 active no session in 14 days
  Red 2+ | Amber 1 | Green 0

Card 3: C3 Presentations Per Week
  Her north star metric
  Weekly count vs 2.5 target
  YTD vs annual target

Card 4: C1 Show Rate
  Scheduled vs held this month
  Target 75% currently 58%

Card 5: Pipeline Velocity
  Average days in current compartment
  Trending arrow vs last week

---

## Sandi Business Plan Gap Analysis

Target: $300K gross placement revenue
Placements needed: 11 at $28K average

C1 Session Held: 58% → 75% (+17 pts)
C4 Session Held: 56% → 80% (+24 pts)
Seekers Engaged: 56% → 65% (+9 pts)
C3 presentations per week: north star metric

Closing C1 gap halfway = 1 placement = $28K
Closing C4 gap halfway = 1 placement = $28K
Total potential impact = $56K additional revenue

---

## R&D Cohort Plan

Coach 1: Sandi Stahl — Founding Partner
  Build fee: waived
  Retainer: $150/month from Month 13
  Referral: 10%

Coaches 2-5: R&D tier
  Build fee: $1,000 each
  Total: $4,000
  Retainer: $0 months 1-6
  $100/month thereafter
  Referral: 10%

---

## Complete Build Sequence — Next Friday

Sequence 0: Documentation tonight
Sequence 1: Migrations 51-53
Sequence 2: Data completeness fixes
Sequence 3: Dashboard KPI cards
Sequence 4: Intervention response layer
Sequence 5: Client card completeness
Sequence 6: In-app feedback layer
Sequence 7: Vision statement generation
Sequence 8: Refresh and real-time accuracy
Sequence 9: Complete installer package
Sequence 10: Update all MD files

---

## SANDI TRANSCRIPT GAP ANALYSIS
## March 27 2026

### Confirmed by Sandi on call:

1. VISION STATEMENT POWERPOINT — TOP PRIORITY
   Source: You 2.0 + DISC + Fathom
   Structure: 3 paragraphs
     Professional paragraph
     Personal paragraph
     Personal desires paragraph
   Reduce by 20% if too long
   Downloads as PowerPoint in her template
   She will send her template Monday
   Build: Sequence 7 — highest priority

2. BUSINESS PLAN KPI CARDS YTD
   C3 presentations per week = north star
   YTD progress vs weekly and annual targets
   Good morning greeting with date on dashboard
   Build: Sequence 3

3. DISC DANGERS OPPORTUNITIES EXTRACTION
   Page range too narrow — broaden it
   Some clients missing these fields
   Trust issue for UAT
   Build: Sequence 2

4. GOLDEN RULES FLAG — CONVERTED CLIENTS
   What made them convert — capture it
   Notes field on converted client overview tab
   Feeds pattern recognition over time
   Build: Sequence 5 — golden_rules_notes field
   Already added to Migration 53

5. TERRITORY CHECK PASTE AREA
   Sandi pastes TES territory check results
   Simple text area on Vision tab
   Goes into PowerPoint generation
   NOT a TES integration — paste only
   Build: Sequence 7

6. MANUAL SESSION DATE ENTRY
   Confirmed on call
   Fixes gone quiet accuracy
   2023 placeholder dates are a trust issue
   Build: Sequence 5A

7. OLLAMA STATUS INDICATOR
   Clear running/offline status in StatusBar
   Setup instructions if offline
   Already in StatusBar — verify clarity

8. POPULATED INSTALLER DELIVERY
   Tuesday 2pm — deliver populated database
   Friday 9am — full v0.2.0 delivery
   Sandi confirmed happy with skeleton
   Real feedback starts when data is loaded

### NOT mentioned by Sandi — our design:
These are correct to build but not her requests.
Do not over-explain. Let her discover the value.
- Intervention response fields on signals
- Decision Velocity Loop
- In-app feedback layer
- Placement tracker KPI card
- At Risk This Week card
- Pipeline Velocity card

### Sandi action items from call:
- Send PowerPoint template — needed for 7A
- Send UAT form back — Monday
- Print flowchart, scribble, send back — Monday
- Review proposals — Monday end of day

### Key insight from transcript:
Sandi at 1:28:19:
"The key thing for me is when we get this
to the point where I can start inputting data."
Real feedback comes when she has populated
data and is using it before real calls.
Tuesday goal: get her the database.

### Meeting schedule confirmed:
Tuesday 2pm — 30 min check-in
Friday 9am — longer delivery call
Action: send calendar invites tonight
