# Session Log
# Coach Bot Desktop
# Dr. Data Decision Intelligence LLC
# Every session summarized.
# Updated automatically by END OF SESSION.

---

## Session 2026-04-07
Major builds:
  Block 1 — My Knowledge extraction
    feb292b ef50924 a097f11 a267f75
  Block 2 — My Identity capture
    1d06d1b fe1ad8c c8cdc87
  Block 3 — MCP foundation
    469e6e6 87c7a8e
  Block 4 — Google OAuth2
    5faf237 6ec3648
  Block 5 — Gmail Tool
    2a8b60f dc41b70 e8d5341
  Block 6 — Calendar Tool
    54ef607 f959a91 1a000925
  Block 7 — Airgap verification
    3e2b69c
  Block 8 — Tool registration
    6516f9c
  Fixes applied:
    0d43cc4 — import type interfaces
ADRs this session: 18 locked
Incidents resolved: 11 documented
Runbooks confirmed: 8 documented
Next session should start with:
  Apply remaining fixes then installer
Open items:
  Delete buttons identity + knowledge
  Years experience from date ranges
  Recent email client card debug
  Correction logging field-level edits
  Installer v0.4.0 build and ship
  Spec files commit to repo

Additional ADRs (April 1–3 sessions): ADR-019 through ADR-023
  Temperature split, nomic-embed-text,
  DISC deterministic Rust, Sequence 12 gate,
  Two-layer DB architecture

Additional postmortems (April 1–3): INC-012 through INC-018
  Gone quiet field, net worth allowlist,
  financial readiness TUMAY, vision prompt leak,
  ghost sessions, tsc vs build, migration manager

Additional domain: DOMAIN-011 through DOMAIN-014
  DISC posture expanded, CLEAR few-shots,
  data confidence levels, business targets

Additional runbooks: RUN-009 through RUN-011
  Data accuracy audit, production tsc fix,
  Pre-Sequence 12 preflight

## Session 2026-04-01
Commits this session:
  1a00092 3e2b69c 6516f9c 0d43cc4 ca0c98e
  4fe3220 8a79376 ee84795
ADRs added: 3 (ADR-024 shell capability scope,
  ADR-025 resume years in knowledgeService,
  ADR-026 tool audit and privacy logging)
Incidents resolved: 3 (INC-019 shell spawn
  ollama, INC-020 resume years zero,
  INC-021 import type CoachBotTool)
Runbooks added: 1 (RUN-012 shell allowlist)
Voice rules added: 0
Next session should start with:
  Confirm resume upload uses
  upsertCoachProfileFromResumeText from UI
  if years still wrong; verify Start AI Engine
  after shell capabilities
Blockers or open items:
  Wire AdminStreamliner to
  upsertCoachProfileFromResumeText if not
  already done; Client Intelligence may need
  to read selected_client_name for tab jumps

## Session April 10 2026

Commits this session:
  4fe3220 delete buttons identity knowledge
  8a79376 years experience date ranges
  ee8479e ollama shell scope fix
  12865a2 spec session capture
  423f76e migrations 67-69 correctionService
  b3ac3ea STZ Coaching Council service
  cd07cdc Council UI Best Next Questions
  0794147 Vision Statement edit approve
  33ec7ef per-page health indicators
  66b5bd6 System Health Dashboard
  597f790 sequential council display
  7c68bce vision error boundary
  351e8bc vision null safety
  766470e revert to 66b5bd6

Last known good commit: 66b5bd6

ADRs added:
  Governance layer instantiated
  Council runs sequentially
  Vision changes isolated
  Revert policy
  Health score formula
  Two export reports

Incidents resolved:
  White screen from bundled changes
  uuid package missing
  Vision tab reset to Overview

Next session must start with:
  Build Vision Statement improvements
  One prompt at a time
  Test after every single commit
  Then build installer

Blockers:
  Vision Statement sequential
    improvements pending
  Prompt Manager not built
  Installer not built yet
  Monday delivery target
