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
