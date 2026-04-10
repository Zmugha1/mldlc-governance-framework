# STZ Agent Specification
# Coach Bot Desktop
# Dr. Data Decision Intelligence LLC
# Master context seed file.
# Paste at start of every Cursor session.
# Updated automatically by END OF SESSION.

---

## IDENTITY
Builder: Dr. Zubia Mughal Ed.D.
Product: Coach Bot Desktop
Company: Dr. Data Decision Intelligence LLC
Client: Sandi Stahl, Franchise Coach
Repo: github.com/Zmugha1/Sandi_Bot_Desktop
Branch: dev only
Push: git push sandi dev
DB: sandi_bot.db
App ID: com.sandibot.desktop
DB path: C:\Users\[name]\AppData\Roaming\
  com.sandibot.desktop\sandi_bot.db
Migrations applied: 1 through 66
Next migration: 67+

## TECH STACK — NEVER DEVIATE
Tauri v2 + React 19 + TypeScript + Vite 5
Tailwind CSS v3 pinned — never v4
SQLite via tauri-plugin-sql
Ollama local — qwen2.5:7b
Embeddings — nomic-embed-text
No OpenAI. No Anthropic. No Supabase.
No cloud DB. No internet features.
All IDs are TEXT UUID — never integers

## TOP 18 RULES — NEVER VIOLATE
1. invoke() not fetch() for Ollama
2. invoke() not fetch() for Google APIs
3. Never upgrade Tailwind to v4
4. Never use INTEGER IDs
5. Never touch migrations 1-66
6. Never touch default.json except
   for file system permissions
7. Always use getDb() never better-sqlite3
8. import type for TypeScript interfaces
9. camelCase in invoke() params always
10. Always end with npx tsc --noEmit
11. One fix per prompt one file per prompt
12. Google credentials from env vars only
13. datetime('now') in SQL never JS Date
14. All hooks at top of component always
15. Never say Admin Streamliner in UI
16. Never use em dashes in any output
17. Never reference TES or Entrepreneur's
    Source anywhere in the app
18. Do not start RAG before v1.5 complete

## THREE-SPACE KNOWLEDGE ARCHITECTURE
Space 1 = Coach identity (voice)
  coach_profile table
  bio resume philosophy style
Space 2 = Domain knowledge (brain)
  knowledge_documents table
  CLEAR TES guides books scripts
Space 3 = Client documents (intel)
  client tables
  DISC You2 TUMAY Fathom
RAG searches all three simultaneously
Do not build Sequence 12 before all
  three spaces have real content

## MCP TOOL ARCHITECTURE
All integrations implement CoachBotTool
  interface from toolManager.ts
import type for all interfaces
All API calls through Rust proxy only
Tokens stored in tool_connections table
Read-only permissions only
Offline graceful — no crashes without
  internet connection

## CRITICAL KNOWN FAILURE PATTERNS
See STZ_POSTMORTEM_LIBRARY.md for full list
Top 5 to avoid immediately:
  Migration duplicate: check PRAGMA first
  invoke() snake_case: always camelCase
  File picker .path: use result directly
  React hooks in conditionals: move to top
  Google env vars: set in same session
  ollama_generate missing system param:
    always include system: '' even empty

## ARCHITECTURE DECISIONS LOCKED
See STZ_ADR_LOG.md — 23 ADRs (ADR-001 through ADR-023)
Do not re-suggest any rejected approach
Do not rediscover any documented pattern

## CURRENT VERSION STATE
Completed: v1.0 v1.1 v1.2 v1.3
In progress: v1.3 remaining fixes
  Delete buttons for identity + knowledge
  Years experience from date ranges
  Recent email in client card debug
  Correction logging field-level edits
Coming: v1.5 first-run DB creation
  DB rename to coach_bot.db
  Correction logging
  Then Sequence 12 RAG
  Then v2.0 job queue + encryption
