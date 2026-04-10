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
