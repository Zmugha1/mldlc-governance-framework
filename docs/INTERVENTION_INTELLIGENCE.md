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
