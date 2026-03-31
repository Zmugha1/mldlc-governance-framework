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

---

## JOBS 10-12 — Extended Job Map

### JOB 10 — Protect the franchise relationship
Sandi operates under a franchise agreement.
Every client interaction carries compliance
risk. Coach Bot must help her stay within
boundaries — documented, auditable,
defensible.

KPIs:
  Audit log completeness
    Target: 100% of recommendations logged
    Storage: audit_log table
    Calculated: actions with reasoning /
      total actions
    Signal: any unlogged recommendation →
      governance alert
    Page: Settings (Admin Streamliner)

### JOB 11 — Grow through referrals
90 days after a placement Sandi should
ask converted clients for referrals.
One referral = one more placement =
$28,000.

KPIs:
  Referral ask rate
    Target: 100% of converted clients
      contacted at 90 days
    Storage: clients.referral_ask_sent
    Calculated: referral asks sent /
      total converted clients past 90 days
    Signal: converted client at 90 days
      with no referral ask → Morning Brief
    Page: My Practice

### JOB 12 — Prepare for every call
Before each coaching call Sandi needs
to know who she is talking to, where
they are in the journey, what their
DISC style says to do, what was said
last time, and what pink flags to watch.

KPIs:
  Pre-call prep completion
    Target: client card opened before
      every session
    Storage: audit_log — client_accessed
      events before session events
    Calculated: sessions with prior
      client_accessed event /
      total sessions
    Signal: session logged with no prior
      client_accessed → coaching quality note
    Page: Client Intelligence

---

## VTCO FRAMEWORK — Two Layers

Dr. Data Decision Intelligence LLC
Proprietary methodology — all rights reserved

### VTCO Definition 1 — STZ Governance Layer
Applied to: AI system design and governance
  V — Verb: what action does the system take
  T — Task: what specific function executes
  C — Constraint: what boundaries govern
        the action — what requires human
        confirmation, what gets logged,
        what the AI cannot do alone
  O — Outcome: what changes in the system
        when the action completes

Purpose: Encodes expert judgment into
  governance-first AI systems. Defines
  the operating band where human expert
  and AI work at exactly the right ratio.
  This is the Skill Threshold Zone.

Example — Vision Statement Generation:
  V: Generate
  T: Create three-paragraph vision statement
  C: Requires DISC + You2 + Fathom data.
     Sandi must approve before saving.
     Cannot reference TES or franchise brand.
     Output logged to audit_log.
  O: vision_statement saved,
     vision_approved = 1,
     audit entry created

### VTCO Definition 2 — UX Design Layer
Applied to: Dashboard and interface design
  V — Verb: what action does Sandi take
  T — Task: what specific activity does
        this UI element enable
  C — Context: what is the minimum
        information needed to take action —
        no more, no less
  O — Outcome: what KPI or job outcome
        changes when she completes the task

Purpose: Ensures every UI element earns
  its place. If an element cannot answer
  all four VTCO questions it does not
  belong on that page.

Example — Gone Quiet Signal Card:
  V: Respond
  T: Log what Sandi did about this client
  C: Client name, stage, days since contact,
     DISC re-engagement tip — nothing else
  O: Intervention logged, signal cleared,
     intervention_response_rate KPI updates

---

## THE THREE DESIGN QUESTIONS

Every UI element must pass all three:

1. Does this help Sandi do one of her
   12 jobs?
   → Answered by VTCO-UX Verb + Task
   → If no verb and no task: remove it

2. Is this the simplest way to show it?
   → Answered by VTCO-UX Context
   → Show minimum context needed to act
   → If more context than needed: simplify

3. Would she understand this without
   reading the How to Use guide?
   → Answered by VTCO-UX Outcome
   → If outcome is not obvious: redesign
   → Label, icon, and color must be
     self-explanatory

---

## PAGE TO JOB MAPPING — Complete

### Morning Brief
ONE DOMINANT JOB: Know what to do today

Elements and their VTCO-UX:

Gone Quiet / Pink Flag / At Risk cards:
  V: Review → T: Open at-risk client
  C: Name, stage, signal, days
  O: Intervention logged, signal cleared
  Jobs served: 5, 12

Weekly Seeker Input:
  V: Log → T: Enter weekly contacts
  C: Target 22/week, engagement rate
  O: Job 1 KPI calculated
  Jobs served: 1

Placement Pulse (greeting card):
  V: Track → T: See revenue progress
  C: X of 11, $X of $300K
  O: Motivation, pace awareness
  Jobs served: 4

KPI Cards:
  V: See → T: Pipeline status at a glance
  C: 6 numbers, period toggle
  O: Decision to act or relax today
  Jobs served: 3, 4, 5, 8

Does NOT belong here:
  Pipeline charts → Business Goals
  Individual client details → Client Intel
  System logs → Admin

### Business Goals
ONE DOMINANT JOB: Know if on track for $300K

Elements and their VTCO-UX:

North Star Zone:
  V: Present → T: Hit C3 this week
  C: 0.0/2.5, why it matters, YTD
  O: Placement trajectory changes
  Jobs served: 3, 4

Revenue Story:
  V: Review → T: See pace vs target
  C: Revenue, target, projection, bar
  O: Decision to push harder or stay course
  Jobs served: 4

Where to Focus:
  V: Improve → T: Close conversion gaps
  C: Actual %, target %, action pill
  O: Specific action taken this week
  Jobs served: 2, 3, 6

Intelligence Cards:
  V: Track → T: See coaching behavior KPIs
  C: Decisions logged, flags resolved,
     clients ready
  O: Awareness of coaching consistency
  Jobs served: 5, 7, 10

Does NOT belong here:
  Gone quiet alerts → Morning Brief
  Client profiles → Client Intelligence
  Aha moments → My Practice

### Client Intelligence
ONE DOMINANT JOB: Know your client completely

Elements and their VTCO-UX:

Sidebar client list:
  V: Select → T: Open client profile
  C: Name, stage, DISC, signal badges
  O: Right panel loads full profile
  Jobs served: 9, 12

Overview tab:
  V: Review → T: Pre-call preparation
  C: Stage, readiness, pink flags,
     contact info, last contacted
  O: Call starts informed
  Jobs served: 9, 12

Vision tab:
  V: Generate → T: Create vision statement
  C: DISC style, You2, territory check
  O: Vision saved, PowerPoint downloaded
  Jobs served: 9

Aha Moment button:
  V: Capture → T: Log coaching insight
  C: Client name, insight type
  O: Aha saved to My Practice library
  Jobs served: 7

Fathom tab:
  V: Review → T: See session history
  C: Date, notes, CLEAR score, next steps
  O: Pattern recognition, prep for next call
  Jobs served: 6, 9, 12

Does NOT belong here:
  Revenue KPIs → Business Goals
  System logs → Admin
  Data import → Admin

### Coaching Actions
ONE DOMINANT JOB: Respond to every signal

Elements and their VTCO-UX:

Signal cards:
  V: Respond → T: Log what you did
  C: Client, signal type, days, DISC tip
  O: Intervention logged, rate KPI updates
  Jobs served: 5, 10

Golden Rules:
  V: Capture → T: Write what made them convert
  C: Client name, conversion date
  O: Golden rule saved to My Practice
  Jobs served: 7, 11

Decision History:
  V: Review → T: Audit your responses
  C: Date, client, signal, response
  O: Pattern awareness, compliance proof
  Jobs served: 10

Does NOT belong here:
  KPI charts → Business Goals
  Client details → Client Intelligence
  Settings → Admin

### My Practice
ONE DOMINANT JOB: Learn from your patterns

Elements and their VTCO-UX:

Aha Moments library:
  V: Review → T: Read coaching insights
  C: Filtered by type, client, date
  O: Patterns identified, approach refined
  Jobs served: 7

Golden Rules:
  V: Review → T: Read what converts clients
  C: Client attribution, rule text
  O: Coaching approach improves
  Jobs served: 7, 11

CLEAR Trends:
  V: Track → T: See coaching quality over time
  C: Monthly averages per dimension
  O: Weakest dimension identified, improved
  Jobs served: 6

DISC Distribution:
  V: See → T: Understand client mix
  C: D/I/S/C counts, insight line
  O: Coaching style adapted to majority
  Jobs served: 6

Profile Completeness:
  V: Review → T: Identify data gaps
  C: % per client, what is missing
  O: Upload actioned, RAG quality improves
  Jobs served: 9

Does NOT belong here:
  Today's signals → Morning Brief
  Revenue tracking → Business Goals
  Individual sessions → Client Intelligence

### Settings (Admin Streamliner)
ONE DOMINANT JOB: Manage the system

Elements and their VTCO-UX:

Import tools:
  V: Import → T: Upload client files
  C: File type, client matching
  O: Profile completeness increases
  Jobs served: 9

Activity log:
  V: Audit → T: Review all system actions
  C: Action, client, timestamp, reasoning
  O: Compliance maintained
  Jobs served: 10

Feedback tab:
  V: Review → T: See Sandi's feedback
  C: Page, type, text, date
  O: Next build priorities identified
  Jobs served: 8

Does NOT belong here:
  Client coaching data → Client Intelligence
  Business KPIs → Business Goals
  Signals → Coaching Actions

---

## THE DESIGN RULE

One page. One dominant job.
Every element answers all four VTCO questions.
Every element passes all three design questions.
If it fails any — cut it or move it.

The five pages in one sentence each:
  Morning Brief: Review signals and log
    what you will do today.
  Business Goals: Track your $300K year
    and close the gaps.
  Client Intelligence: Know your client
    completely before every call.
  Coaching Actions: Respond to every
    signal the system surfaces.
  My Practice: Learn from your own
    coaching patterns over time.

This is the STZ framework fully operational
at the UX layer. Two VTCOs. One methodology.
Every page earns its place.

---

## REUSE INSTRUCTIONS — New Verticals

For every new vertical:
1. List their jobs to be done (8-12 jobs)
2. Apply VTCO-STZ to each job for governance
3. Apply VTCO-UX to each job for interface
4. Map jobs to pages — one dominant job per page
5. Apply three design questions to every element
6. Cut anything that fails

This methodology is vertical-agnostic.
It works for franchise coaching, financial
advisory, legal practice, healthcare,
HR consulting — any knowledge worker
who makes decisions about people.
