# STZ Postmortem Library
# Coach Bot Desktop
# Dr. Data Decision Intelligence LLC
# Every bug ever found and fixed.
# Never delete. Only add.
# Updated automatically by END OF SESSION.

---

## INC-001
Date: 2026-03-27
What broke: Migration crash on startup
  duplicate column last_contact_date
Root cause: Migration 58 tried to add
  a column already added by Migration 47
Fix applied: Removed duplicate ALTER TABLE
  statement from Migration 58
Commit: 5e90efd
Prevention rule: Always run PRAGMA
  table_info(table) before writing
  any ALTER TABLE statement
Layer: Tech

## INC-002
Date: 2026-04-03
What broke: Stage movement failing silently
  with from_stage column not found
Root cause: client_stage_log table was
  missing from_stage and to_stage columns
  that the INSERT statement referenced
Fix applied: Migration 61 added the
  missing columns to the table
Commit: f4702f0
Prevention rule: Check full INSERT column
  list matches actual table schema before
  running any stage movement code
Layer: Tech

## INC-003
Date: 2026-04-03
What broke: Stage movement INSERT failing
  with datatype mismatch error code 20
Root cause: JavaScript Date object passed
  as SQLite timestamp parameter
Fix applied: Changed all timestamp values
  to use datetime('now') in SQL directly
Commit: 92a96d9
Prevention rule: Never pass JavaScript
  Date objects as SQLite parameters
  Always use datetime('now') in SQL
Layer: Tech

## INC-004
Date: 2026-04-03
What broke: File upload showing no file
  path error in production build
Root cause: File picker result treated as
  object with .path property when Tauri v2
  returns a plain string directly
Fix applied: Used result directly as
  filePath string not result.path
Commit: ca30728
Prevention rule: Tauri v2 dialog.open()
  returns string directly not an object
  Never access .path on the result
Layer: Tech

## INC-005
Date: 2026-04-03
What broke: The Capture crashed on open
  with Rendered more hooks than previous
Root cause: useState called inside a
  conditional block violating React
  rules of hooks
Fix applied: Moved all hook calls to
  top of component before any
  conditional logic
Commit: 5872632
Prevention rule: All hooks must be at
  top of component function body
  before any if statements or returns
Layer: Tech

## INC-006
Date: 2026-04-03
What broke: Gone quiet showing 1141 days
  instead of real elapsed days
Root cause: Days calculation used wrong
  date field instead of last_contact_date
Fix applied: Changed calculation to use
  last_contact_date from clients table
Commit: bc3fb8f
Prevention rule: Always use last_contact_date
  for gone quiet calculations never
  session dates or created_at dates
Layer: Tech

## INC-007
Date: 2026-04-07
What broke: Google connect failed with
  GOOGLE_CLIENT_ID is not set error
Root cause: User-scope environment variables
  set with SetEnvironmentVariable require
  a new shell session to take effect
  but the existing session could not
  see them
Fix applied: Set $env:GOOGLE_CLIENT_ID
  directly in current PowerShell session
  before running tauri:dev
Commit: env config not code fix
Prevention rule: Always use $env: syntax
  in current PowerShell session
  Do not rely on User-scope env vars
  in the same session they were set
Layer: Tech

## INC-008
Date: 2026-04-07
What broke: ToolManager interfaces not
  found — module export error on startup
Root cause: CoachBotTool imported as a
  value not as a TypeScript type causing
  Vite module resolution failure
Fix applied: Changed to import type
  in calendarTool.ts and gmailTool.ts
Commit: 0d43cc4
Prevention rule: All TypeScript interfaces
  must use import type keyword
  Never import interfaces as values
Layer: Tech

## INC-009
Date: 2026-04-03
What broke: Fathom upload failing with
  no such column block_reflection
Root cause: coaching_sessions table was
  missing the 9-block CLEAR analysis
  columns that Fathom extraction inserts
Fix applied: Migration 62 added all
  missing block columns to the table
Commit: d89bb4a
Prevention rule: Before building any
  extraction feature verify all target
  columns exist in the destination table
Layer: Tech

## INC-010
Date: 2026-04-03
What broke: Net worth pink flag firing
  incorrectly for clients above 250k
Root cause: Flag condition used greater
  than comparison instead of explicit
  allowlist of below-threshold values
Fix applied: Changed to allowlist approach
  Only fires for Below 50k and 50k-250k
  Startup cleanup removes bad records
Commit: 7e710ac
Prevention rule: Use explicit allowlist
  for threshold comparisons never
  implicit greater-than logic
Layer: Tech

## INC-011
Date: 2026-04-07
What broke: ollama_generate missing
  required key system error during
  document extraction in The Capture
Root cause: The invoke call was missing
  the required system parameter which
  the Rust command validates strictly
Fix applied: Added system: '' to all
  ollama_generate invoke calls
Commit: 6c38791
Prevention rule: Always pass system
  parameter even as empty string in
  every ollama_generate invoke call
Layer: Tech

## INC-012
Date: 2026-04-03
What broke: Gone quiet showing 1141d
Root cause: Wrong date field used in
  elapsed days calculation
Fix applied: Use last_contact_date always
  for gone quiet and stale contact logic
Prevention rule: Never substitute session
  dates or created_at for contact recency
Layer: Tech

## INC-013
Date: 2026-04-03
What broke: Net worth flag allowlist
  Flag fired for 250k+ clients incorrectly
Root cause: Implicit greater-than logic
Fix applied: Explicit allowlist only —
  Below $50k and 50k-250k fire flag;
  everything above does not
Prevention rule: Match DOMAIN-004 allowlist
  in code and tests
Layer: Tech

## INC-014
Date: 2026-04-03
What broke: Financial readiness 0/25
Root cause: Not reading TUMAY data correctly
Fix applied: Fallback to TUMAY table when
  primary fields empty
Prevention rule: Cross-check readiness
  inputs against TUMAY extraction
Layer: Tech

## INC-015
Date: 2026-04-03
What broke: Vision statement leaked DISC language
  Generated output said DISC style explicitly
Root cause: Prompt allowed meta references
Fix applied: Prompt refinement needed post UAT
Prevention rule: Review vision prompts for
  meta-discourse before client-facing ship
Layer: L1 Voice

## INC-016
Date: 2026-04-03
What broke: Ghost sessions surviving cleanup
  Empty sessions with no notes survived
  John Doe cleanup
Root cause: Cleanup did not delete rows with
  null notes
Fix applied: delete WHERE notes IS NULL on
  service initialization as appropriate
Prevention rule: Define empty session
  criteria and delete in one pass
Layer: Tech

## INC-017
Date: 2026-04-03
What broke: 57 TypeScript production errors
  Dev mode more lenient than build
  npx tsc passes in dev but
  npm run tauri:build fails
Root cause: Strict build path not exercised
Fix applied: Always run tsc --noEmit
  before build not just in dev
Prevention rule: CI and local pre-build
  must run tsc --noEmit
Layer: Tech

## INC-018
Date: 2026-04-03
What broke: Migration manager absence
  caused migration 58 crash
Root cause: No way to see which columns
  exist without querying SQLite
Fix applied: Operational discipline — PRAGMA
  before ALTER; migration manager planned v2.0
Prevention rule: Build migration manager in v2.0
  Promoted from v3.1 to v2.0 roadmap
Layer: Tech

## INC-019
Date: 2026-04-01
What broke: Start AI Engine failed — spawn
  ollama serve: program not allowed on the
  configured shell scope
Root cause: plugin:shell|spawn requires a
  matching scoped allow entry (name cmd args)
  in capabilities not only the string
  shell:allow-spawn permission
Fix applied: Added scoped shell:allow-spawn
  allow entry for name ollama cmd ollama
  args ["serve"] in default.json
Commit: ee84795
Prevention rule: When spawning any new shell
  command add a capability scope row before
  shipping the UI that calls it
Layer: Tech

## INC-020
Date: 2026-04-01
What broke: Resume upload showed
  years_experience = 0 for real resumes
Root cause: Extraction prompt asked for an
  explicit years statement most PDFs do not use
Fix applied: New prompt returns
  earliest_work_year; TS computes years from
  date; upsertCoachProfileFromResumeText in
  knowledgeService
Commit: 8a79376
Prevention rule: Derive tenure from earliest
  work date range across experience not from
  a single phrase
Layer: Tech

## INC-021
Date: 2026-04-01
What broke: CoachBotTool module export error
  at runtime in Vite
Root cause: TypeScript interfaces imported as
  values from toolManager
Fix applied: import type for CoachBotTool and
  related interfaces in calendar and gmail tools
Commit: 0d43cc4
Prevention rule: Use import type for every
  interface-only import from toolManager
Layer: Tech

## INC-022
Date: 2026-04-10
What broke: White screen from multiple
  ClientIntelligence.tsx changes
Root cause: Commits 597f790 7c68bce 351e8bc
  all touched same large file
  without testing between each
  bundled changes to largest file in app
Fix applied: git revert to 66b5bd6
  (documented session policy)
Commit: 766470e (revert to 66b5bd6)
Prevention rule: one change one test
  on ClientIntelligence.tsx always
Layer: Process

## INC-023
Date: 2026-04-10
What broke: uuid package not installed
  correctionService.ts imported uuid
  package was not in node_modules
Root cause: New dependency added without
  package.json install in workspace
Fix applied: npm install uuid
  npm install --save-dev @types/uuid
Prevention rule: always check imports
  against package.json before commit
Layer: Tech

## INC-024
Date: 2026-04-10
What broke: Vision Statement tab reset
  to Overview on generate
Root cause: council context called
  on null CouncilOutput before
  any council had been run
Fix applied: make council context optional
  null safe with try/catch wrapper
  prefer cached councilOutput when present
Commit: 351e8bc
Prevention rule: never depend on
  optional state being populated
  in generation handlers
Layer: Product
