# STZ Framework — Skill Threshold Zone
## Dr. Data Decision Intelligence

## What It Is
The operating band where a human expert and an AI
system work at exactly the right ratio together.
Below the Zone: human doing work AI should handle.
Above the Zone: human surrendering decisions to AI.
Inside the Zone: human doing only what only they
can do. Everything else runs automatically.

## The Five Layers — Code Mapping

Layer 1 — Prompts
What: Human expertise encoded as LLM instructions
Code: /prompts/*.txt
Rule: One file per named operation
Feeds: Every skill that requires LLM reasoning

Layer 2 — Skills
What: Atomic named operations. One job each.
Code: src/services/*.ts functions
Rule: All business logic here, never in modules
Feeds: Agent workflows and module displays

Layer 3 — Agents
What: Sequences of skills that run automatically
Code: src/agents/*.ts
Rule: Each agent has typed contract in and out
Feeds: Orchestrator routing table

Layer 4 — Contracts
What: Typed promises between system and human
Code: TOOLS.md — every operation defined
Rule: Define before building. Always.
Feeds: Approval gates and audit requirements

Layer 5 — Evaluation
What: Human judgment re-enters the loop
Code: audit_log table + Post-Call Analysis module
Rule: Every consequential decision logged
      with step-by-step reasoning
Feeds: Coach improvement and system calibration

## Discovery Question to Code Artifact Mapping

Q1-Q4   → /prompts/ context blocks and reasoning
Q5-Q6   → src/services/ skill candidate list
Q7-Q8   → contract_in and contract_out schemas
Q9-Q10  → src/agents/ trigger and sequence
Q11-Q12 → agent tool call sequence and post-event
Q13-Q14 → required fields and output format spec
Q15-Q16 → confidence threshold and rejection rules
Q17-Q18 → few-shot examples and pink flag rules
Q19     → audit_log reasoning field requirements
Q20     → evaluation KPI definition

## New Client Onboarding Sequence

Step 1: Run STZ discovery session (20 questions)
Step 2: Create configs/[client_id].json
Step 3: Write/update prompt files with their language
Step 4: Configure agent permissions in config
Step 5: Load their historical data folder
Step 6: Process documents through extraction pipeline
Step 7: Run end-to-end test with one real client
Step 8: Hand over and go live

Rule: No Phase 3 code without Steps 1-4 complete.

## Client Config Controls

Every behavior difference between clients lives
in their config file. Never in code.

What config controls:
- Which agents are active
- Which external integrations are permitted
- Which LLM model runs
- UI display preferences
- Confidence thresholds
- Pink flag rules
- Evaluation KPIs

## ADLC — Agentic Development Lifecycle
Replaces traditional SDLC for this project.
Agents participate in building, not just humans.
Goal → PRD → Skills → Orchestration → Coding
→ Testing → Observability → Deployment

# DISCOVERED: March 2026

## SANDI STAHL — DISCOVERY ANSWERS SUMMARY
### March 2026 — Phase 3 Build Reference

### L1 — PROMPTS (What We Know)

Reasoning voice:
Sandi thinks in pipeline stages first. She assesses
readiness across four dimensions but overrides all
of them for spouse alignment. Her quality bar is
whether the client moved naturally without being
pushed.

Terminology confirmed:
PUSH / NURTURE / PAUSE, IC / C1 / C2 / C3 / C4,
TES, CLEAR, DISC, You 2.0, Fathom, Vision,
Seeker, Zors, Franchisors, Source Link,
Pink flags / Red flags, Spouse alignment,
Point of Clarity, ILWE.

Output example needed:
Vision statement example requested for Friday.
This is the single most important missing artifact
for the synthesis skill.

Edge case confirmed:
Spouse resistant → override to PAUSE regardless
of readiness scores. Non-negotiable.

Quality criteria confirmed:
A = client moved naturally, felt heard, said
"what are the next steps?" without being prompted.
C = generic output with no DISC or stage specificity.

### L2 — SKILLS (What We Know)

Skill inventory confirmed:
receive_document → check_completeness →
read_DISC → read_You2 → review_last_Fathom →
prepare_CLEAR_questions → run_session →
detect_flags → score_readiness → recommend →
log_session → update_stage → set_next_action

Highest judgment skill: recommend() — the
PUSH/NURTURE/PAUSE decision. Spouse alignment
is the highest-weight input and can override
all other scores.

Extraction targets confirmed per document type:
DISC: communication style, dominant tendencies,
motivation factors, coaching implications.
You 2.0: strengths, dangers, opportunities,
vision statement if present.
Fathom: objections, commitments, next steps,
red flags, engagement quality, spouse mentions.
Vision: vision statement, goals, timeline.

Early signals confirmed:
Positive: natural close question from client,
fast document completion, spouse mentioned
proactively.
Negative: contact avoidance, IC enthusiasm
without document follow-through, spouse
silence past session 2.

### L3 — AGENTS (What We Know)

Workflows confirmed:
1. Document ingestion: receive → name-check →
   extract → update profile → flag completeness
2. Pre-session prep: load DISC + You2 + last
   Fathom → score readiness → surface CLEAR
   questions → detect active flags
3. Appointment management: check completeness
   2 days out → remind if incomplete → warn
   day before → Sandi decides on cancellation
   (she does not want auto-cancel without review)
4. Re-engagement: 6-month and 12-month triggers
   for stalled clients — draft message for review
5. Post-conversion: LinkedIn recommendation and
   Google review request — timing TBD Friday

Document notification preference:
Sandi wants documents to appear in the profile
silently. No interruption notification needed.
She opens the dashboard and sees it is there.

### L4 — CONTRACTS (What We Know)

Approval gates confirmed:
- Emails to clients: ALWAYS require approval
- Recommendations: show reasoning, she decides
- Vision statements: review before saving
- Document profiles: auto-save, no approval needed
- Pipeline stage changes: auto-save with log

Completeness gate: WARN not BLOCK (confirmed)

Confidence thresholds (partial):
Act threshold: 85%+ (confirmed from meeting)
Review threshold: exact number needed Friday

Privacy boundary (partial):
TES operations manual — do not store or reference,
she cannot share the live version.
Client financial specifics — needs Friday
confirmation on what should never surface.

### L5 — EVALUATION (What We Know)

Quality rubric confirmed:
5 dimensions — CLEAR application (40%),
red flag detection (20%), question quality (20%),
outcome signal (10%), methodology consistency (10%).

Baseline: 6.5-7 on TES CLEAR, 8+ overall.
Target: 8+ on TES CLEAR specifically.

Self-improvement habit: stay in curiosity mode
longer before transitioning to close.

Correction protocol: MISSING — ask Friday.

Review trigger: Sandi engages critically when
reasoning is not shown. She trusts outputs
that cite their source.

Zone signal (partial): compressed sales cycles,
higher CLEAR score, fewer missed red flags.
Specific numbers needed Friday.

### STILL NEEDED — FRIDAY QUESTIONS

MUST ASK (blocks the build):
1. Share one vision statement you are proud of —
   the actual text. This trains the synthesis voice.
2. Positive conversion signal example — what does
   a client say or do that almost always means
   they will convert?
3. Correction scope — when you fix a system output,
   fix this instance only or teach the system?
4. Specific pipeline numbers — current C1 to C2
   rate and your 3-month target.

SHOULD ASK (improves accuracy):
5. Words you never say to clients — what gives
   the wrong impression?
6. A client you were going to PUSH who needed
   PAUSE — what was the signal you almost missed?
7. Confidence threshold exact number — at what
   percentage do you act without reading reasoning?
8. Worst case scenario — if the system sent
   something without your review, what breaks?
