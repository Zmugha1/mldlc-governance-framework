# STZ Domain Model
# Coach Bot Desktop — Franchise Coaching
# Dr. Data Decision Intelligence LLC
# The franchise coaching ontology.
# All entities relationships and rules.
# Never delete. Only add.
# Updated automatically by END OF SESSION.

---

## CLIENT LIFECYCLE

DOMAIN-001
Entity: Client stages IC through C5
Rules:
  IC = Initial Contact — 1 call
  C1 = Seeker Connection — 1-2 sessions
  C2 = Seeker Clarification — 1 session
  C3 = Possibilities — franchise presentations
  C4 = Initial Validation — multiple calls
  C5 = Continued Validation — close phase
  Clients CAN move backwards — confirmed
  Sandi moves them manually always
  System warns if documents missing
  System never blocks movement
Source: Sandi flowchart April 2026
Layer: L1

DOMAIN-002
Entity: Gone quiet thresholds per stage
Rules:
  IC  → 14 days without contact
  C1  → 21 days without contact
  C2  → 14 days without contact
  C3  → 14 days without contact
  C4  → 60 days without contact
  C5  → 60 days without contact
  Calculated from last_contact_date only
  Never from session dates or created_at
  last_contact_date must be updated
    manually by Sandi after each call
Source: Sandi flowchart April 2026
Layer: L1

DOMAIN-003
Entity: Pipeline buckets
Rules:
  GATHER = IC through C3 — amber badge
    Still discovering still exploring
  VALIDATE = C4 and C5 — green badge
    Exploring specific businesses
  PAUSE = life happened on hold — gray
    Illness vacation family emergency
  INACTIVE = removed from pipeline
    Set outcome_bucket to inactive
  CONVERTED = placed successfully
    Has business_purchase_date set
Source: Sandi flowchart April 2026
Layer: L1

DOMAIN-004
Entity: Pink flags and thresholds
Rules:
  Spouse alignment unsure = flag always
  Net worth below 250k = flag
    ONLY fires for: Below $50k, 50k-250k
    Does NOT fire for: 250k-500k, 500k-1M, 1M+
  Pink flags logged to client_pink_flags
  Sandi marks resolved manually
  Becomes green flag when resolved
  Allowlist approach for net worth check
Source: Sandi transcript March 2026
Layer: L1

DOMAIN-005
Entity: Readiness score — 4 dimensions
Rules:
  Identity (25 pts):
    DISC + You 2.0 + Fathom uploaded
  Commitment (25 pts):
    Vision approved + Timeline + Spouse
  Financial (25 pts):
    Net worth + Credit score + Timeline
  Discovery (25 pts):
    ZOR + Franchise + Profile complete
    UNLOCKS AT C4 ONLY
  Maximum: 75 points
  Score is coaching signal not gate
  Sandi decides movement not the score
Source: Sandi flowchart April 2026
Layer: L1

DOMAIN-006
Entity: CLEAR framework structure
Rules:
  C = Connect — identity and emotion
      Open them beyond surface level
      Who are they becoming
  L = Listen — pattern awareness
      Help them see themselves
      Name the recurring pattern
  E = Explore — clarity and direction
      Push toward decision
      Define what success looks like
  A = Activate — ownership and action
      Make movement non-negotiable
      Set commitment level 1-10
  R = Reflect — transformation
      Lock in the insight
      Identity shift question
  Stage urgency adjusts depth:
    IC/C1 = broad discovery questions
    C2/C3 = deeper probing patterns
    C4/C5 = decision urgency commitment
Source: TES coaching methodology
Layer: L1

DOMAIN-007
Entity: DISC coaching posture rules
Rules:
  High D — Dominance:
    Direct decisive challenge assumptions
    Push toward decisions create urgency
  High I — Influence:
    Pull emotion connect to impact
    Use stories and feelings not logic
  High S — Steadiness:
    Build safety go slowly
    Never pressure honor loyalty
  High C — Compliance:
    Provide structure and logic
    Reduce perceived risk show the bridge
  Use natural scores not adapted scores
  Dominant style = highest natural score
Source: TTI DISC methodology
Layer: L1

DOMAIN-008
Entity: Business plan annual targets
Rules:
  Annual revenue target: $300,000
  Total with funding partners: $305,000
  Placements needed: 11
  Average placement value: $28,000
  C3 north star: 2.5 presentations per week
  Seekers scheduled: 15 per week target
  Seekers spoken to: 10 per week target
  Conversion targets per stage:
    IC session held: 70% target
    C1 show rate: 75% target
    C2 movement: 65% target
    C3 movement: 83% target
    C4 conversion: 80% target
Source: Sandi business plan 2026
Layer: L1

DOMAIN-009
Entity: Three-space knowledge architecture
Rules:
  Space 1 — Coach Identity:
    Resume bio philosophy style
    Stored in coach_profile table
    Embeds into coach_bot_knowledge.db
    Makes coaching voice personalized
  Space 2 — Domain Knowledge:
    CLEAR TES guides books scripts
    Stored in knowledge_documents table
    Embeds into coach_bot_knowledge.db
    Makes coaching brain methodology-based
  Space 3 — Client Documents:
    DISC You2 TUMAY Fathom sessions
    Stored in client tables
    Embeds into coach_bot.db
    Makes responses client-specific
  RAG searches all three simultaneously
  Do not build RAG before all three
    spaces have real content
Source: Architecture decision April 2026
Layer: L3

DOMAIN-010
Entity: Document types and extraction
Rules:
  DISC PDF — deterministic Rust parser
    Extracts scores pages 23-25 standard
    Page 24 for Executive version
    100% accuracy — no LLM needed
  You 2.0 PDF — LLM extraction
    Extracts one_year_vision dangers
    strengths opportunities
    Top 3 per category
  TUMAY PDF — LLM extraction
    Contact info financial profile
    Spouse industries why now
  Fathom PDF — LLM extraction
    9-block CLEAR analysis
    Session date stage emotional state
    Objections commitments reflection
Source: Document extraction builds 2026
Layer: L2

DOMAIN-011
Entity: DISC posture rules per profile (expanded)
Rules:
  High D — direct decisive challenge
    assumptions push decisions
  High I — pull emotion stories vision
    connect to impact feelings
  High S — build safety go slowly
    never pressure honor loyalty
  High C — provide structure logic
    reduce risk show the bridge
  Use natural scores not adapted
Source: TTI DISC methodology
Layer: L1

DOMAIN-012
Entity: CLEAR few-shot examples (locked)
Rules:
  Kenyatta — High I/D overcommitted burnout
  Jeff MacStrong — High C/S analysis paralysis
  Joanna — High C corporate trauma risk-averse
  Shawn — High S/I layoff recovery theoretical
  These four cover all four DISC quadrants
  Never replace with generic examples
Source: Coaching corpus 2026
Layer: L1

DOMAIN-013
Entity: Data accuracy confidence levels
Rules:
  DISC scores — 100% deterministic
  You 2.0 Dangers Strengths Opportunities
    — 95% verified on 3 clients
  TUMAY financial profile — 85%
  Fathom session extraction — 50%
    6 of 16 clients have no sessions
  Do not embed unverified data
  Verify before RAG
Source: UAT notes 2026
Layer: L2

DOMAIN-014
Entity: Sandi business plan targets (canonical)
Rules:
  Annual revenue: $300,000
  Placements: 11
  Average placement: $28,000
  C3 north star: 2.5 per week
  IC held rate target: 70%
  C1 show rate target: 75%
  C2 movement target: 65%
  C3 movement target: 83%
  C4 conversion target: 80%
Source: Sandi business plan 2026
Layer: L1

DOMAIN-015
Entity: Coach identity knowledge row sync
Rules:
  Domain label for synced coach identity
    text in knowledge_documents is
    "Coach Identity"
  Stable document id coach-identity used for
    embed sync from coach_profile fields
  Clearing identity removes coach_profile row
    and Coach Identity domain rows and
    embeddings in dependency order
Source: AdminStreamliner syncCoachIdentityToKnowledge
  and clear identity flow 2026-04-01
Layer: L2

DOMAIN-016
Entity: Morning Brief calendar calls
Rules:
  Today calls come from Google Calendar via
    MCP calendar tool when connected
  Matched clients show stage and actions
    unmatched events show title only
  Post-call reminder uses event end time
    and matched client only
Source: ExecutiveDashboard Morning Brief
  build session 2026-04-01
Layer: L1

DOMAIN-017
Entity: STZ Coaching Council
Rules:
  Three deliberating lenses:
    Readiness Lens — ICF + stage
      methodology — is seeker ready?
    Alignment Lens — Motivational
      Interviewing — are all stakeholders
      aligned? change talk vs sustain talk
    Integrity Lens — ICF ethics + CLEAR
      is this coaching or selling?
  Chairman synthesizes all three
  Minority perspective always preserved
  Sandi is always the judge
  AI is always the advisor
  Uncertainty audit explicit
Source: coachingCouncil.ts and Client
  Intelligence Best Next Questions 2026-04-10
Layer: L2

DOMAIN-018
Entity: Uncertainty Audit fields
Rules:
  Verified: data confirmed present
  Unverified: data present but
    quality uncertain
  Missing: data not uploaded
  Recommendations: before this call
Source: CouncilOutput.uncertaintyAudit
Layer: L2

DOMAIN-019
Entity: Coaching Council timing
Rules:
  Each lens: approximately 60 seconds
  Chairman synthesis: approximately 60s
  Total: approximately 3-4 minutes
  Acceptable for pre-call prep
  Not acceptable mid-call
  Tell Sandi: run before call starts
Source: Sequential council implementation
  session 2026-04-10
Layer: L1

DOMAIN-020
Entity: Training readiness target
Rules:
  300 correction pairs minimum
  for first QLoRA fine-tuning run
  Current pace logged weekly
  Weeks remaining calculated
  automatically from weekly rate
Source: getTrainingReadiness correctionService
  System Health dashboard 2026-04-10
Layer: L3

DOMAIN-021
Entity: Fathom transcript format
Rules:
  Fathom delivers transcripts as
  copyable text not image PDFs
  Always paste or use TXT file
  Never assume PDF is extractable
  Conversation notes files are NOT
  Fathom transcripts
Source: Client Intelligence Fathom tab
  session capture 2026-04-11
Layer: L1

DOMAIN-022
Entity: CLEAR scoring from
  9-block Fathom data
Rules:
  C = block_opening + block_emotional
  L = block_life_context +
      block_disc_signals
  E = block_vision + block_objections
  A = block_commitments +
      block_next_call
    (next call intent maps to session
    next_actions field where used)
  R = block_reflection +
      block_coach_assessment
  Score each block 0-3 by length
  Average across all sessions
  This is the real coaching score
Source: My Practice CLEAR engine
  session capture 2026-04-11
Layer: L2

DOMAIN-023
Entity: Vision Statement rubric
Rules:
  Four dimensions Sandi grades:
  Accuracy — sounds like client
  Completeness — captures goals
  Tone — client voice
  Usefulness — presentation ready
  Average below 3 triggers
    Regenerate with Feedback
  Average 3+ triggers download
Source: Vision Statement tab rubric loop
  session capture 2026-04-11
Layer: L2

DOMAIN-024
Entity: My Practice three sources
Rules:
  Source 1 Session quality 60%
    CLEAR framework from Fathom
  Source 2 Pipeline 25%
    Stage advancement rates
  Source 3 Council prep 15%
    Question approval rate
  Adaptive weighting excludes
    zero sources automatically
Source: My Practice score redesign
  session capture 2026-04-11
Layer: L2

DOMAIN-025
Entity: Coaching Council timing reminder
Rules:
  Authoritative rules live under
  DOMAIN-019 Coaching Council timing
  Reinforcement for Sandi messaging:
  run council before call starts
  never mid-call
Source: Session capture consolidation
  2026-04-11
Layer: L1

DOMAIN-026
Entity: Session date equals last contact
Rules:
  Every session save automatically
  updates last_contact_date on client
  This drives gone quiet detection
  Never let these get out of sync
Source: Client Intelligence Fathom
  extract and manual session flows
  session capture 2026-04-11
Layer: L2

DOMAIN-027
Entity: Fathom summary vs full
  transcript extraction quality
Rules:
  Full transcript: all 9 blocks
  populated with rich content
  Fathom summary: some blocks
  empty or thin
  Always encourage full transcript
  copy not summary
Source: Fathom extraction UX and
  CLEAR scoring inputs
  session capture 2026-04-11
Layer: L1

DOMAIN-028
Entity: Monday lab session plan
Rules:
  Eight labs confirmed:
    Lab 1 Connect Gmail Calendar
    Lab 2 Upload Fathom sessions
    Lab 3 Move client stages
    Lab 4 Best Next Questions
    Lab 5 Vision Statement
    Lab 6 My Practice score
    Lab 7 System Health
    Lab 8 Submit feedback
  Sandi emails documents after:
    Resume philosophy bio certs
    CLEAR framework guides scripts
    Remaining Fathom transcripts
Source: HowToUse.tsx lab sequence
  and delivery checklist
  session capture 2026-04-11
Layer: L1
