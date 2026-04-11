# STZ Runbook Library
# Coach Bot Desktop
# Dr. Data Decision Intelligence LLC
# Every repeatable sequence confirmed.
# Never delete. Only add.
# Updated automatically by END OF SESSION.

---

## RUN-001
Task: Start development environment
Trigger: Beginning of any dev session
Steps:
  1. Open PowerShell as Administrator
  2. Set Google credentials:
     $env:GOOGLE_CLIENT_ID = "[value]"
     $env:GOOGLE_CLIENT_SECRET = "[value]"
  3. cd to Sandi_Bot_Desktop folder
  4. Run: npm run tauri:dev
  5. Wait 2-4 minutes for app window
  6. Confirm AI Ready green in sidebar
Expected output: App opens with no errors
  AI status green client data loaded
Watch out for: If Google env vars not set
  OAuth will fail when Connect clicked
  Must set in same PowerShell session

## RUN-002
Task: Fix migration conflict on startup
Trigger: UNIQUE constraint failed on
  schema_migrations on app startup
Steps:
  1. Check DB state:
     sqlite3 "$env:APPDATA\com.sandibot.desktop\sandi_bot.db" "SELECT version FROM schema_migrations ORDER BY version;"
  2. Check TypeScript migrations array
     highest version number
  3. Find duplicate version numbers
  4. Delete true duplicate from DB:
     sqlite3 "..." "DELETE FROM schema_migrations WHERE version = X;"
  5. Restart app and confirm clean load
Expected output: App loads cleanly
  All migrations applied no errors
Watch out for: Only delete true duplicates
  not legitimate migrations that ran

## RUN-003
Task: Add new migration safely
Trigger: Any time new tables or columns
  are needed in the database
Steps:
  1. Check highest DB version:
     sqlite3 "..." "SELECT MAX(version) FROM schema_migrations;"
  2. Check TypeScript migrations array
  3. Use highest of both + 1
  4. Check existing columns first:
     sqlite3 "..." "PRAGMA table_info(table_name);"
  5. Write migration without IF NOT EXISTS
     on ALTER TABLE (SQLite does not support)
  6. Add to migrations vector in Rust
  7. Run cargo check
  8. Run npm run tauri:dev to apply
Expected output: Migration applies cleanly
  New columns or tables exist
Watch out for: Duplicate column errors
  mean the column already exists
  Check PRAGMA first always

## RUN-004
Task: Build production installer
Trigger: Ready to ship new version
  to Sandi or any coach
Steps:
  1. Kill dev server:
     Get-Process -Name "node","sandi-bot-desktop","msedgewebview2" -ErrorAction SilentlyContinue | Stop-Process -Force
  2. Set Google env vars:
     $env:GOOGLE_CLIENT_ID = "[value]"
     $env:GOOGLE_CLIENT_SECRET = "[value]"
  3. Bump version in tauri.conf.json
  4. Run: npm run tauri:build
  5. Wait 10-15 minutes
  6. Copy installer to delivery folder:
     copy "...bundle\nsis\Coach Bot_X.X.X_x64-setup.exe" "...\Desktop\CoachBot_Delivery\..."
  7. Verify delivery folder has
     installer + db + PDF
Expected output: Three files in delivery
  folder ready to upload to Google Drive
Watch out for: TypeScript errors fail
  the build — fix all errors first
  Must set env vars in same session

## RUN-005
Task: Test Google OAuth flow
Trigger: After any OAuth code change
  or before shipping to Sandi
Steps:
  1. Set env vars in current session
  2. Run npm run tauri:dev
  3. Open The Capture
  4. Scroll to Connected Tools section
  5. Click Connect on Gmail card
  6. Confirm browser opens Google login
  7. Sign in with test account
  8. Confirm browser closes automatically
  9. Confirm toast: Google connected
  10. Go to Morning Brief
  11. Check Today's Calls shows events
Expected output: Connected status shown
  Gmail and Calendar both active
  Morning Brief shows calendar events
Watch out for: Env vars must be set in
  SAME session as npm run tauri:dev

## RUN-006
Task: Deliver update to Sandi
Trigger: New installer ready to ship
Steps:
  1. Build installer (RUN-004)
  2. Copy db from AppData:
     copy "$env:APPDATA\com.sandibot.desktop\sandi_bot.db" "...\CoachBot_Delivery\sandi_bot.db"
  3. Verify all three files present:
     dir "...\CoachBot_Delivery" Format-List Name Length
  4. Upload folder to Google Drive
  5. Send update email with what is new
     and installation steps
  6. Update Google Drive link in email
Expected output: Sandi has installer
  database and PDF instructions
Watch out for: DB must come from YOUR
  AppData not be empty template

## RUN-007
Task: Run END OF SESSION spec update
Trigger: After last commit of any
  build session
Steps:
  1. Confirm last commit pushed:
     git log --oneline -3
  2. Open Cursor new chat
  3. Paste END OF SESSION prompt
  4. Wait for Cursor to read conversation
  5. Confirm all six files updated
  6. Get spec: commit hash
  7. Save hash in SESSION_LOG
Expected output: All spec files updated
  One spec: commit with today's date
Watch out for: Cursor may miss subtle
  ADRs — review manually if session
  had complex architectural decisions

## RUN-008
Task: Extract and embed knowledge document
Trigger: Sandi uploads PDF to My Knowledge
  in The Capture
Steps:
  1. File picker returns string path
  2. Call knowledgeService.uploadKnowledgeDocument(
       filePath, domain, fileName)
  3. Rust reads PDF via read_file command
  4. Ollama extracts text content
  5. Text stored in knowledge_documents
  6. embedKnowledgeDocument() called
  7. Text chunked into 500-word segments
  8. Each chunk embedded with nomic-embed-text
  9. Embeddings stored in knowledge_embeddings
  10. Domain card updates with word count
Expected output: Document shows in domain
  card with word count and excerpt
  embedded = 1 in knowledge_documents
Watch out for: Ollama must be running
  Large PDFs may take 30-60 seconds
  Show progress to user during embedding

## RUN-009
Task: Data accuracy audit
Trigger: Before any RAG build
Steps:
  1. Verify data accuracy on 3 clients minimum
  2. Open client card screenshot
  3. Compare against source PDF
  4. Confirm exact match on Dangers
     Strengths Opportunities DISC scores
  5. If match — proceed to RAG
  6. If mismatch — re-extract first
Expected output: Spot-checked clients
  match source documents
Watch out for: Do not embed unverified data

## RUN-010
Task: Production TypeScript fix
Trigger: When npm run tauri:build fails
  with TypeScript errors
Steps:
  1. Read every error carefully
  2. Categorize by type:
     unused variables
     type mismatches
     missing properties
  3. Fix ALL before attempting
     another build
  4. Run npx tsc --noEmit first
  5. Only then run tauri:build
Expected output: Zero tsc errors then
  clean build
Watch out for: Never ship with TypeScript errors

## RUN-011
Task: Pre-Sequence 12 preflight
Trigger: Before starting RAG (Sequence 12)
Steps:
  1. v1.5 knowledge base complete
     all three spaces have content
  2. Data accuracy verified
     3 clients spot checked
  3. Embeddings confirmed working
     nomic-embed-text responding
  4. searchKnowledge function tested
  5. job queue built and tested
  6. All TypeScript errors resolved
Expected output: All six gates green
Watch out for: Do not skip any step

## RUN-012
Task: Allowlist a shell command for spawn
  (or execute) in Tauri v2
Trigger: Console shows program not allowed
  on the configured shell scope for
  plugin:shell|spawn or Command.spawn
Steps:
  1. Open src-tauri/capabilities/default.json
  2. Ensure shell:allow-spawn (or execute)
     string permission is present
  3. Add a scoped object with identifier
     shell:allow-spawn and allow array with
     name (API id) cmd (binary) args (fixed
     list or validator objects)
  4. Match invoke program field to name
  5. cargo check --manifest-path src-tauri/Cargo.toml
  6. Restart tauri dev and retry the action
Expected output: Spawn succeeds without
  scope denial
Watch out for: Do not add unknown keys under
  plugins.shell in tauri.conf.json — only
  open is valid there for shell plugin config

## RUN-013
Task: White screen recovery
Trigger: app shows white screen
  after recent commits
Steps:
  1. git log --oneline -6
  2. Identify last known good commit
  3. git revert [bad commits]
     --no-commit
  4. git commit with revert message
  5. git push sandi dev
  6. Relaunch and confirm loads
Expected output: app loads normally
Watch out for: reverting migrations
  never revert migration commits
  only revert TypeScript/React files

## RUN-014
Task: Vision Statement build protocol
Trigger: any change to Vision tab
Steps:
  1. One prompt one change only
  2. Commit and push
  3. Relaunch dev immediately
  4. Test Vision tab specifically
  5. Confirm tab stays on Vision
  6. Confirm generation completes
  7. Only then write next prompt
Expected output: tab stays on Vision
  generation produces text
Watch out for: tab resetting to
  Overview = silent error
  check console immediately

## RUN-015
Task: Package install check
Trigger: vite import-analysis error
  on any new import
Steps:
  1. Read the missing package name
  2. npm install [package]
  3. npm install --save-dev
     @types/[package] if TypeScript
  4. Relaunch dev
Expected output: import resolves cleanly
Watch out for: uuid needs both
  uuid and @types/uuid

## RUN-016
Task: Vision Statement rebuild protocol
Trigger: large change to Vision tab in
  ClientIntelligence.tsx
Steps:
  1. Prompt A: clean out old code
     test app loads placeholder shows
  2. Prompt B: add new handlers only
     no JSX test TypeScript clean
  3. Prompt C: add new JSX only
     wire handlers test full flow
  4. Never bundle all three in one prompt
  5. Never touch other features
     in same prompts
Expected output: each phase green
  before next prompt
Watch out for: skipping smoke test
  between phases invites white screen

## RUN-017
Task: Fathom session upload
  from client card
Trigger: Sandi wants to add
  a session from client card
Steps:
  1. Go to client Fathom tab
  2. Copy full text from Fathom
  3. Paste into textarea
  4. Click Extract Session
  5. Progress bar shows
  6. Session appears in history
  7. Click Show 9-block analysis
  8. Verify blocks populated
Expected output: session with 9 blocks
Watch out for: empty blocks mean
  Fathom transcript was too short
  or Ollama timed out

## RUN-018
Task: My Practice score diagnosis
Trigger: score seems wrong
Steps:
  1. Check sessionCount in score
     If 0 — no Fathom sessions
     upload transcripts first
  2. Check pipeline.overall
     If 0 — no stage movements logged
     this is expected for new system
  3. Check councilScore.totalRated
     If 0 — no questions rated yet
     rate questions in Best Next Questions
  4. Overall score uses adaptive
     weighting — excludes zero sources
Expected output: score reflects only
  data that actually exists
Watch out for: score low because
  data is thin not because
  coaching is poor

## RUN-019
Task: Three question test
  for any UI element
Trigger: deciding whether to
  keep or remove a UI element
Steps:
  1. Does it help Sandi do
     one of her 12 jobs?
  2. Is it the simplest way
     to show it?
  3. Would she understand it
     without the How to Use guide?
Expected output: all three yes to keep
Watch out for: passing only one
  or two is not enough
  all three must pass

## RUN-020
Task: Add Fathom session from
  client card
Trigger: Sandi has a Fathom
  transcript to upload
Steps:
  1. Open client card Fathom tab
  2. Set stage and session date
  3. Click Fathom Transcript tab
  4. Copy transcript from Fathom
  5. Paste into textarea
  6. Click Extract Session
  7. Wait 60-90 seconds
  8. Session appears in history
  9. Last contacted date updates
Expected output: session with 9 blocks
Watch out for: empty blocks mean
  transcript was a summary not
  full transcript

## RUN-021
Task: Add Fathom session from
  The Capture
Trigger: bulk uploading sessions
  for multiple clients
Steps:
  1. Go to The Capture
  2. Select client from grid
  3. Click Add Fathom Session
  4. Paste transcript text
  5. Click Extract
  6. Client grid refreshes
Expected output: Fathom indicator
  updates on client card
Watch out for: must select
  client first before paste
  area appears

## RUN-022
Task: Add Sandi's notes to session
Trigger: Sandi wants to add her
  own observations to a session
Steps:
  1. Open client Fathom tab
  2. Find the session
  3. Click Show 9-block analysis
  4. Scroll to Sandi's Notes
     below Coach Assessment
  5. Click Add Notes
  6. Type notes
  7. Click Save Notes
Expected output: notes appear under
  Coach Assessment
Watch out for: this updates
  existing session not creates new
