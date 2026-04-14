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

## INC-025
Date: 2026-04-11
What broke: Vision tab reset to Overview
  multiple times
Root cause: duplicate generate
  handlers conflicting
Fix applied: find and remove duplicate
  handler leaving only one
Prevention rule: search for duplicate
  setState calls before committing
  any handler
Layer: Product

## INC-026
Date: 2026-04-11
What broke: Vision tab crash for C5 clients
Root cause: persistedVisionText
  derived from client object
  not null safe for converted clients
Fix applied: String(value || '').trim()
  on all client data derivations
Prevention rule: always null safe
  client data before rendering
Layer: Tech

## INC-027
Date: 2026-04-11
What broke: Fathom upload fs.write_file
  permission denied
Root cause: tried to save temp
  file using plugin-fs
  which requires explicit permissions
Fix applied: use tauriDialogOpen then
  invoke('extract_text_from_any_file')
  then extractFathomSession directly
  (later simplified to paste-only)
Prevention rule: never save temp files
  use extract_text_from_any_file
  pattern from The Capture
Layer: Tech

## INC-028
Date: 2026-04-11
What broke: Fathom PDF binary garbage
Root cause: PDF was not a real
  Fathom transcript
  It was a conversation notes file
  in image or binary PDF format
Fix applied: use paste text instead
Prevention rule: Fathom transcripts
  are always text not image PDFs
Layer: Domain

## INC-029
Date: 2026-04-11
What broke: My Practice score showed
  27 F Getting Started
Root cause: pipeline and council
  both zero because system is new
  not because coach is poor
Fix applied: adaptive weighting excludes
  empty sources from calculation
Prevention rule: always check for
  empty data sources before
  including in weighted average
Layer: Data

## INC-030
Date: 2026-04-11
What broke: PPT download silent failure
Root cause: pptx.writeFile
  does not work in Tauri WebView
Fix applied: pptx.write() to get buffer
  then save via Tauri file system
Prevention rule: never use browser
  file save APIs in Tauri
  always use Tauri native patterns
Layer: Tech

## INC-031
Date: 2026-04-11
What broke: Em dashes in generated text
Root cause: LLM ignores stylistic
  rules in prompts
Fix applied: post-process after generation
  strip all em dash variants
Prevention rule: never rely on LLM
  prompt rules for style enforcement
  always post-process
Layer: Content

## INC-032
Date: 2026-04-11
What broke: HealthIndicator clutter and
  misleading signal on workflow pages
Root cause: per-page completeness not
  actionable in context of primary tasks
Fix applied: remove HealthIndicator from
  five module pages keep System Health
Prevention rule: three-question test before
  reintroducing any page-level health chrome
Layer: UX

## INC-033
Date: 2026-04-11
What broke: Calendar showing all events
  not just client events
Root cause: filter applied to
  Gmail but not Calendar
Fix applied: same filterEventsByClients
  function applied to calendar
  before Morning Brief render
Prevention rule: always apply same
  filter to both Gmail and Calendar
Layer: Product

## INC-034
Date: 2026-04-11
What broke: Next call showing raw []
Root cause: next_actions stored
  as JSON array string
  rendered directly without parsing
Fix applied: formatNextActions helper
  handles null empty and JSON array
Prevention rule: never render raw
  JSON fields directly in JSX
Layer: UX

## INC-035
Date: 2026-04-11
What broke: Confusion between adding
  a new manual session vs annotating
  an existing session with Sandi notes
Root cause: two different flows both
  touch coaching_sessions.notes
  without clear UX separation
Fix applied: Sandi's Notes section
  uses UPDATE on existing session id
  My Notes tab still INSERTs a new
  session row by design for new visits
Prevention rule: check UX label and
  SQL operation before assuming append
  vs new row
Layer: Product

## INC-036
Date: 2026-04-14
What broke: Google credentials not set
  on Sandi's machine at delivery
Root cause: credentials read from
  environment variables at runtime
  but installer does not set them
Fix applied: set User environment variables
  manually via PowerShell during
  Monday session
Prevention rule: bake into build
  at compile time — never env vars
  in production for OAuth secrets
Layer: Release / Security

## INC-037
Date: 2026-04-14
What broke: Ollama instability mid-session
Root cause: model busy or timed out
  after multiple operations;
  Vision worked then Council failed
  then extraction failed
Fix applied: health check before every
  AI operation with retry logic
  (to be implemented fully)
Prevention rule: never assume Ollama
  is ready between operations
Layer: Tech

## INC-038
Date: 2026-04-14
What broke: Vision statement past tense
Root cause: prompt not enforcing
  future tense explicitly;
  LLM defaulted to past/present mix;
  Sandi caught I have been thinking
Fix applied: update system prompt with
  explicit future tense rules
Prevention rule: always specify tense
  in vision generation prompt;
  post-process if needed
Layer: Product

## INC-039
Date: 2026-04-14
What broke: Desktop shortcut missing
Root cause: NSIS config did not
  include shortcut creation
  Sandi could not find Coach Bot
  after closing it
Fix applied: add to NSIS installer config
  (to be completed in next build)
Prevention rule: always create desktop
  shortcut in every installer build;
  document in docs/INSTALLER_RULES.md
Layer: Installer / UX

## INC-040
Date: 2026-04-14
What broke: Gmail OAuth failed on
  second connection attempt
Root cause: token storage after
  OAuth flow not verified
Fix applied: debug tool_connections table
  after OAuth flow completes
Prevention rule: always verify token
  saved correctly after OAuth
Layer: Integrations

## INC-041
Date: April 14 2026
What broke: Fathom extraction failed
  on Sandi's machine mid-session
  after vision and Council ran
Root cause: Ollama model exhausted
  after multiple heavy operations
  No cooldown between operations
  No health check before extraction
Fix applied: Fix 3 Ollama health
  check before every AI operation
  Post-Fathom cooldown 15 seconds
  added in Prompt 7
Prevention rule: Always add cooldown
  after heavy AI operations
  Never assume Ollama is ready
  between consecutive operations

## INC-042
Date: April 14 2026
What broke: shortcutsDefaultDesktop
  key in tauri.conf.json broke
  config parsing entirely
Root cause: tauri-utils uses
  deny_unknown_fields on NsisConfig
  shortcutsDefaultDesktop is not
  a valid key
Fix applied: moved shortcut creation
  to src-tauri/nsis/main.nsh via
  NSIS_HOOK_POSTINSTALL calling
  CreateOrUpdateDesktopShortcut
Prevention rule: never put shortcut
  config in tauri.conf.json
  always use main.nsh for NSIS
  desktop shortcut behavior

## INC-043
Date: April 14 2026
What broke: Vision PowerPoint
  showed past tense language
  Sandi caught immediately
Root cause: Prompt did not
  explicitly enforce future tense
  LLM defaulted to mixed tense
Fix applied: Added explicit rules
  to vision system prompt plus
  post-processing replacement
Prevention rule: always enforce
  stylistic rules via both prompt
  and post-processing never
  prompt alone

## INC-044
Date: April 14 2026
What broke: Morning Brief showed
  test client Zubia in today's
  calls instead of Sandi's clients
Root cause: Calendar connected to
  Zubia's account during testing
  not Sandi's account
Fix applied: Not yet fixed
  deferred to post-Friday
Prevention rule: always test
  Google Calendar integration
  with the coach's own account
  never the developer account
