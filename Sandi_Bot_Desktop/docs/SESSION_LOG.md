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

## Session April 11 2026

Commits this session:
  80b2b23 vision safe generation handler
  d63d95b remove duplicate vision handler
  0dc60a0 vision null safety C5 clients
  d5d4737 approve handler try catch
  a801ad5 vision local state fix
  f619e84 PPT color no hash prefix
  c8422eb remove PDF no em dash PPT footer
  6479ec6 em dash post-processing
  cabd69a remove old vision code
  9e46e93 new vision handlers
  5ee7a7f new vision JSX rubric loop
  05a9218 Tauri file save downloads
  602d1d7 remove old My Practice scoring
  fcf7138 CLEAR scoring engine
  163e7b0 My Practice new JSX
  4b7ee18 adaptive weighting
  3c486e9 client intelligence health fix
  f19f646 remove health badges cleanup
  d295656 Fathom upload edit delete
  c9dae34 Fathom tauriDialogOpen fix
  cdc0b48 Fathom paste only

ADRs added: 12
Incidents resolved: 8
Runbooks added: 4
Domain model entries: 5

Next session must start with:
  Gmail filter client names only
  Monday lab guide step by step
  How to Use complete rewrite
  UAT questions update
  Installer build

Blockers:
  How to Use not updated yet
  UAT questions not updated
  Gmail filter not built
  Installer not built
  Monday delivery target

## Session April 11 2026 continued

Additional commits this session:
  cbf36cd Gmail client name filter
  1feffd6 Gmail strict full name
  19fae06 How to Use Monday lab guide
  e896de1 Unified Fathom tab
  87f8ef4 Capture Fathom paste flow
  c93fd19 Next call notes calendar filter
  905f5c0 How to Use updated all features

ADRs added: 6 more
Incidents resolved: 3 more
Runbooks added: 3 more

Next session must start with:
  Build installer v0.4.0
  This is the hard blocker
  Nothing ships without it
  Then upload to Google Drive
  Then send Sandi email

Blockers:
  Installer not built yet
  Monday delivery target

## Session April 13-14 2026

Commits this session:
  753dec5  v3.0.0 NSIS installer config
  dcb5f08  strict TypeScript fix
  900c82b  remove My Notes tab
           remove Fathom from Capture
           stronger em dash removal
  437ac88  spec capture April 11 part 2
  7202063  INSTALLER_RULES.md created

ADRs added: 7
Incidents resolved: 5
Runbooks added: 3
Installer rules added: 4

Monday April 14 delivery outcomes:
  Ollama running on Sandi's machine
  Vision statement generated
  PowerPoint download working
  Council running
  Google credentials set manually
  Gmail OAuth partial — debug needed
  Sandi excited and engaged

Sandi feedback received:
  Vision past tense wrong
  Desktop shortcut missing
  Ollama instability mid-session
  Gmail not connecting fully
  Wants her branding on PPT
  Two DISC-based images coming

Next session must start with:
  Fix 1 — Vision future tense
  Fix 2 — Desktop shortcut in NSIS
  Fix 3 — Ollama health check
  Fix 4 — Bake Google credentials
  Fix 5 — Gmail OAuth debug
  Fix 6 — Vision PPT branding
    waiting on Sandi's images

Friday delivery target:
  New installer with all fixes
  Her documents loaded in DB
  Gmail working or honest ETA

Blockers:
  Sandi's identity and knowledge
    documents not received yet
  Two vision images not received yet
  Gmail OAuth root cause unknown
