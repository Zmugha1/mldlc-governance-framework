# Jobs To Be Done — Franchise Coach Vertical
## Coach Bot / Pulse + Vault Architecture
## Last updated: March 30 2026
## Reusable for any franchise coaching vertical

---

## STORAGE ARCHITECTURE

Both Pulse and Vault store data locally
on the user's machine. Always. No exceptions.

Pulse = localStorage in browser
  On their machine
  Tied to their browser
  Cleared if browser data is wiped
  Entry tier — upgrade path to Vault

Vault = SQLite in Tauri desktop app
  On their machine
  Permanent — survives browser clears
  Ollama running locally
  Nothing phones home. Ever.

The Pulse limitation is the sales conversation
that closes Vault upgrades naturally:
"Your data lives in your browser right now.
It is private and never leaves your machine.
But if you clear your browser you lose it.
The Vault stores everything permanently
in a local database on your desktop.
That is where your institutional memory
lives forever."

---

## THE NINE JOBS TO BE DONE

### JOB 1 — Find the right seekers
Identify people genuinely ready to explore
franchise ownership. Wrong people = lost revenue.

KPIs:
  Seekers engaged rate
    Target: 65% of contacted seekers respond
    Storage: weekly_seeker_contacts (clients)
    Calculated: responses / contacts this week
    Signal: below 60% two weeks → alert
    Page: Business Goals

### JOB 2 — Get seekers to show up
Scheduling is not holding. Every no-show
is lost revenue.

KPIs:
  IC session held rate
    Target: 70% of scheduled ICs held
    Storage: coaching_sessions scheduled vs held
    Calculated: held / scheduled this month
    Signal: below 60% → Morning Brief alert
    Page: Business Goals

  C1 show rate
    Target: 75% of scheduled C1s held
    Storage: coaching_sessions scheduled vs held
    Calculated: C1 held / C1 scheduled
    Signal: below 65% → at risk alert
    Page: Business Goals
    Decision: is reminder sequence working

### JOB 3 — Move seekers through the pipeline
Stalled clients cost placements.

KPIs:
  C2 movement from C1
    Target: 65% of C1 clients advance to C2
    Storage: client_stage_log transitions
    Calculated: C2 entries / C1 sessions held
    Signal: below 55% → coaching quality review
    Page: Business Goals

  C3 presentations per week — NORTH STAR
    Target: 2.5 per week
    Storage: coaching_sessions C3 stage
    Calculated: count C3 sessions this week
    Signal: below 2 any week → alert
    Page: Morning Brief AND Business Goals
    Decision: everything — predicts $300K year

  C3 movement from C2
    Target: 83% of C2 clients advance to C3
    Storage: client_stage_log transitions
    Calculated: C3 entries / C2 sessions held
    Signal: below 75% → DISC coaching review
    Page: Business Goals

  C4 conversion to POC
    Target: 80% of C4 clients reach POC
    Storage: clients.poc_reached_date
    Calculated: count with POC / total C4
    Signal: below 60% → intervention needed
    Page: Business Goals
    Decision: spouse alignment, financial concerns

### JOB 4 — Close placements
Everything else is in service of this.
One placement = $28,000.

KPIs:
  Triggers submitted
    Target: 50% of POC clients submit trigger
    Storage: clients.trigger_submitted_date
    Calculated: count trigger / count POC
    Signal: POC reached 21+ days no trigger
      → Morning Brief alert
    Page: Morning Brief AND Business Goals

  Placements this year
    Target: 11 placements
    Storage: clients.business_purchase_date
    Calculated: count with purchase date
    Signal: below quarterly pace → urgent alert
    Page: Business Goals hero card

  Gross placement revenue
    Target: $300,000
    Storage: clients.placement_revenue
    Calculated: SUM placement_revenue this year
    Signal: below $75K end of Q1 → alert
    Page: Business Goals hero card
      AND Morning Brief revenue pulse

### JOB 5 — Keep clients from going cold
Gone quiet = placement that does not happen.
Early detection is everything.

KPIs:
  Gone quiet clients
    Target: 0 at any stage
    Storage: clients.last_contact_date
    Thresholds: IC 14d, C1 21d, C2 14d,
      C3 14d, C4 60d
    Signal: exceeds threshold → badge on card
      AND Morning Brief focus cards
    Page: Morning Brief top priority

  Intervention response rate
    Target: 100% every signal gets response
    Storage: intervention_logs
    Calculated: signals with response /
      total signals fired this week
    Signal: below 100% → ignoring alerts
    Page: Coaching Actions
    Decision: am I acting on what system shows

### JOB 6 — Deliver quality coaching
Quality conversations determine conversion rates.

KPIs:
  CLEAR score average
    Target: 4.0 out of 5.0
    Storage: coaching_sessions CLEAR dimensions
    Calculated: average this month
    Breakdown: Contracting Listening Exploring
      Action Reflection each scored separately
    Signal: any dimension below 3.5 → alert
    Page: My Practice
    Decision: where is she weakest this month

  Emotional vs informational ratio
    Target: more emotional than informational
      at C1 and C2
    Storage: coaching_sessions question types
    Calculated: emotional / total per session
    Signal: ratio below 0.5 at C1 → alert
    Page: My Practice
    Decision: building connection or collecting

### JOB 7 — Learn from what works
Every converted client is a lesson.
Every aha moment is intelligence.

KPIs:
  Golden rules captured
    Target: one per converted client
    Storage: clients.golden_rules_notes
    Signal: converted client no note → prompt
    Page: My Practice AND Coaching Actions

  Aha moments logged
    Target: one per week minimum
    Storage: aha_moments table
    Signal: zero in 14 days → gentle prompt
    Page: My Practice
    Decision: building coaching playbook

  Daily reflection rate
    Target: daily
    Storage: user_feedback table
    Signal: 3 consecutive days none →
      Morning Brief reminder
    Page: My Practice

### JOB 8 — Save time to take on more clients
Time saved = capacity created = more placements.

KPIs:
  Time saved
    Target: 2 hours per week minimum
    Storage: calculated from install_date
      in user_preferences table
    Formula:
      Baseline: 3 hours/week before Coach Bot
      Actual: 1 hour/week with Coach Bot
      Saved: 2 hours/week
      Dollar value: hours × coaching hourly rate
    Toggle: weekly monthly quarterly YTD
    Page: Business Goals

### JOB 9 — Build complete client picture
You cannot coach what you do not know.
Missing data = missed opportunity.

KPIs:
  Profile completeness
    Target: 100% of active clients
    Storage: client_you2_profiles,
      client_disc_profiles, fathom_sessions
    Calculated: weighted score per client
      DISC: 25%, You 2.0 vision: 25%,
      Fathom sessions: 30%, TUMAY: 20%
    Signal: active client below 70% →
      prompt to upload missing documents
    Page: Morning Brief AND My Practice

---

## COMPLETE KPI TABLE

KPI                      Target   Storage              Status
────────────────────────────────────────────────────────────
Gross revenue            $300K    placement_revenue    BUILT
Placements/year          11       business_purchase    BUILT
Avg placement rev        $28K     calculated           BUILT
C3 presentations/wk      2.5      coaching_sessions    BUILT
C1 show rate             75%      coaching_sessions    PARTIAL
C4 conversion POC        80%      poc_reached_date     BUILT
Seekers engaged          65%      weekly_seeker_log    PARTIAL
IC scheduled rate        90%      coaching_sessions    PARTIAL
IC held rate             70%      coaching_sessions    PARTIAL
C2 movement from C1      65%      client_stage_log     PARTIAL
C3 movement from C2      83%      client_stage_log     PARTIAL
Triggers submitted       50%      trigger_submitted    BUILT
Gone quiet               0        last_contact_date    BUILT
Pink flags active        0        pink_flags           BUILT
Intervention response    100%     intervention_logs    BUILT
CLEAR score avg          4.0/5    coaching_sessions    BUILT
Emotional ratio          >50%     coaching_sessions    PARTIAL
Profile completeness     100%     multiple tables      BUILT
Time saved YTD           growing  calculated           PARTIAL
Golden rules             1/client golden_rules_notes   BUILT
Aha moments              1/week   aha_moments          BUILT
Daily reflection         daily    user_feedback        BUILT
What worked              daily    user_feedback        BUILT
What was hard            daily    user_feedback        BUILT
────────────────────────────────────────────────────────────
BUILT: 15   PARTIAL: 9   MISSING: 0

---

## KPI TO PAGE MAPPING

Morning Brief:
  Gone quiet — act today
  C3 presentations vs 2.5 target
  Profile completeness alerts
  Aha moment prompt if none this week
  Revenue pulse $X of $300K
  Trigger alert if POC 21+ days no trigger

Business Goals:
  $300K revenue tracker
  11 placements tracker
  C1 show rate trending
  C4 conversion trending
  Seekers engaged rate
  Time saved with dollar value
  Pipeline velocity
  C2 C3 movement rates

Client Intelligence:
  Profile completeness per client
  Stage history and transitions
  All document extractions

Coaching Actions:
  Intervention response rate
  Signals needing response today
  Golden rules from converted clients
  Decision history log

My Practice:
  CLEAR score trends
  Emotional question ratio
  Aha moments library
  Daily reflection streak
  What worked patterns
  DISC distribution insights

---

## REUSE INSTRUCTIONS — NEW VERTICALS

To adapt this framework for a new vertical:

1. Map the new vertical's jobs to be done
2. Identify which KPIs transfer directly
3. Identify which KPIs need new storage fields
4. Create a new config file:
   configs/[vertical_name].json
5. Map KPIs to the five Pulse pages
6. Run migrations for any new fields
7. Update prompts for vertical terminology

Franchise coaching → franchise_coaching_v1
Executive coaching → executive_coaching_v1
Financial advisory → financial_advisory_v1
Legal services → legal_services_v1
Healthcare → healthcare_v1

---

## SEQUENCE 12 PRE-FLIGHT REQUIREMENTS

Before building RAG all of these must be true:

Database tables confirmed:
  clients ✅
  client_disc_profiles ✅
  client_you2_profiles ✅
  coaching_sessions ✅
  aha_moments ✅
  intervention_logs ✅
  user_feedback ✅
  client_stage_log ⚠️ needs Migration 55
  user_preferences ⚠️ needs Migration 55
  document_embeddings ⚠️ needs Migration 56

Data completeness:
  All 16 clients: Vision OK ✅
  All 16 clients: Dangers OK ✅
  All 16 clients: Opportunities OK ✅
  All 16 clients: Strengths OK ✅
  All 16 clients: Skills OK ✅
  All 16 clients: DISC profiles ✅
  Fathom sessions: 45 sessions ✅

Ollama confirmed:
  qwen2.5:7b running ✅
  nomic-embed-text pulled ⚠️ needed for RAG
