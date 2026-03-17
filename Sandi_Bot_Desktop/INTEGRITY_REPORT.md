# Pre-Phase4 Integrity Report
**Date:** March 12, 2025  
**Branch:** dev  
**Scope:** Fixes and audits only — no new features

---

## FIX 1 — client_id type consistency
**Status:** none needed

All `client_id` and `clientId` usages in `.ts` files are already typed as `string`. No `number` types found.

---

## FIX 2 — database reference consistency
**Status:** none needed

No instances of `sqlite:coaching.db`, `Database.load('sqlite:coaching.db')`, or `coaching.db` found. All references use `sandi_bot.db`.

---

## FIX 3 — SQLite migration safety
**Status:** not applicable

- Migrations live in `src-tauri/src/lib.rs` (tauri-plugin-sql).
- The Migration API accepts a single SQL string per migration; it does not expose direct `Connection` access for `PRAGMA table_info` checks.
- The requested pattern (check columns, then conditionally `ALTER TABLE`) requires raw rusqlite/db access, which is not available in the tauri-plugin-sql migration runner.
- Existing `ALTER TABLE` migrations (versions 10–21) target `client_disc_profiles` and `client_you2_profiles`; they run once per migration. SQLite has no `IF NOT EXISTS` for `ADD COLUMN`.
- `clients` table has no `ALTER TABLE` migrations; columns `outcome_bucket`, `inferred_stage`, `stage_confirmed`, `readiness_score`, `pink_flags` are not in the current schema (only `recommendation` and `outcome` exist).

---

## CHECK 1 — TypeScript
**Result:** PASS

```
npx tsc --noEmit
Exit code: 0
```

---

## CHECK 2 — Rust
**Result:** PASS

```
cd src-tauri; cargo check
Finished `dev` profile [unoptimized + debuginfo] target(s) in 3.81s
```

---

## CHECK 3 — client_id audit

| File | Function/Signature | Type | Status |
|------|-------------------|------|--------|
| documentExtractionService.ts | extractDiscProfile(clientId: string, ...) | string | ✓ |
| documentExtractionService.ts | extractYou2Profile(clientId: string, ...) | string | ✓ |
| documentExtractionService.ts | extractFathomSession(clientId: string, ...) | string | ✓ |
| documentExtractionService.ts | handleVisionStatement(clientId: string, ...) | string | ✓ |
| documentExtractionService.ts | processDocument(clientId: string, ...) | string | ✓ |
| documentExtractionService.ts | getExtractionStatus(clientId: string) | string | ✓ |
| auditService.ts | logEntry(clientId: string \| null, ...) | string \| null | ✓ |
| auditService.ts | getClientAuditLog(clientId: string) | string | ✓ |
| agents/synthesisAgent.ts | input.client_id | string | ✓ |
| agents/patternAgent.ts | input.client_id | string | ✓ |
| agents/outreachAgent.ts | input.client_id | string | ✓ |
| agents/orchestrator.ts | input.client_id | string | ✓ |
| agents/documentAgent.ts | input.client_id | string | ✓ |
| agents/coachingAgent.ts | input.client_id | string | ✓ |
| types/index.ts | ActivityLog.clientId | string | ✓ |
| types/index.ts | Document.client_id | string | ✓ |
| types/index.ts | Session.client_id | string | ✓ |
| types/index.ts | AuditEntry.client_id | string \| undefined | ✓ |
| types/index.ts | SearchResult.client_id | string \| undefined | ✓ |

**No `number` types found.**

---

## CHECK 4 — database audit

| File | Call | Database name | Status |
|------|------|---------------|--------|
| src/services/db.ts:7 | Database.load('sqlite:sandi_bot.db') | sandi_bot.db | ✓ |
| src-tauri/src/lib.rs:324 | add_migrations("sqlite:sandi_bot.db", ...) | sandi_bot.db | ✓ |
| src-tauri/tauri.conf.json:57 | preload: ["sqlite:sandi_bot.db"] | sandi_bot.db | ✓ |
| src-tauri/src/backup.rs:10 | app_config.join("sandi_bot.db") | sandi_bot.db | ✓ |

**All references use sandi_bot.db. No coaching.db.**

---

## CHECK 5 — services inventory

| File | Size (bytes) | Primary exports |
|------|-------------|-----------------|
| auditService.ts | 2,060 | logEntry, getAuditLog, getClientAuditLog, auditEntriesToActivityLogs |
| clientAdapter.ts | 2,628 | clientToDisplay, getDiscColor |
| clientService.ts | 6,849 | getAllClients, getClient, createClient, updateClient, deleteClient, getDashboardStats, getRankedClients, getPushClients, getAverageConfidence, getSupportiveSpouseClients |
| coachingService.ts | 3,463 | getDiscCoachingTips, getHomeworkByStage, getPinkFlagsByStage, calculateReadinessScore |
| db.ts | 644 | getDb, dbSelect, dbExecute |
| documentExtractionService.ts | 23,115 | extractDiscProfile, extractYou2Profile, extractFathomSession, handleVisionStatement, processDocument, getExtractionStatus |
| knowledgeSeed.ts | 4,056 | seedKnowledgeBase |
| pipelineService.ts | 1,054 | PipelineStageDefaults, getConversionRate, calculateConversionRate, getPipelineStageDefaults |
| postCallService.ts | 3,543 | getScoreColor, calculateOverallScore, calculateCallAverage, getHistoricalAverages, getCoachingTip, getStrengthsAndOpportunities |
| recommendationService.ts | 2,934 | RecommendationResult, getRecommendation, getRecommendationMessage |
| searchService.ts | 998 | searchKnowledge, insertKnowledge |

---

## CHECK 6 — types inventory

### extractions.ts
**Interfaces:** DiscAdaptedScores, DiscNaturalScores, DrivingForce, DiscProfile, DangerGoalPair, StrengthGoalPair, OpportunityGoalPair, You2Profile, FathomSession, ExtractionResult<T>  
**Types:** DocumentType, ExtractionStatus

### index.ts
**Interfaces:** DISCScores, DISCProfile, You2Profile, SpouseInfo, TUMAYProfile, VisionStatement, ILWEGoal, ILWEGoals, FathomNote, ReadinessScores, ClientProfile, CLEARScores, ActivityLog, CoachingScript, DashboardKPIs, PipelineStats, BusinessMatch, CareerMatch, CLEARFramework, ClientExperienceStage, SessionOutline, Client, Document, Session, AuditEntry, BackupLog, SearchResult, PipelineData, DashboardStats  
**Types:** DISCStyle, PipelineStage, PersonaType, RecommendationAction

---

## CHECK 7 — TOOLS.md operations

| Operation | Input | Output |
|-----------|-------|--------|
| get_recommendation | client_id: string | recommendation, confidence_score, top_reasons[], pink_flags[], next_action, reasoning_chain, model_used, audit_id |
| check_completeness | client_id: string | completeness_status, missing_documents[], confidence_impact, recommendation_blocked, message |
| detect_pink_flags | client_id: string | pink_flags_detected[], severity, immediate_action_required, suggested_clear_questions[], reasoning |
| score_readiness | client_id: string | identity, commitment, financial, execution, average, scoring_basis |
| surface_clear_questions | client_id, stage, disc_style, session_number, pink_flags_active[], coach_query? | primary_question, follow_up_question, disc_communication_note, pink_flag_alerts[], confidence_score, stage_guidance |
| extract_disc_profile (file) | file_path, client_id | D/I/S/C scores, style_label, strengths[], etc. |
| extract_you2_profile (file) | file_path, client_id | vision_statement, strengths[], dangers[], etc. |
| extract_fathom_transcript | file_path, client_id | session_date, stage_at_time, key_topics[], etc. |
| evaluate_session | session_id | overall_score, clear_framework_score, etc. |
| log_audit_entry | client_id, action_type, input_data, output_data, reasoning, model_used | audit_id, timestamp |
| extract_disc_profile (doc) | client_id, file_path, raw_text | ExtractionResult<DiscProfile> |
| extract_you2_profile (doc) | client_id, file_path, raw_text | ExtractionResult<You2Profile> |
| extract_fathom_session (doc) | client_id, file_path, raw_text | ExtractionResult<FathomSession> |
| get_extraction_status | client_id: string | Record<DocumentType, ExtractionStatus> |
| synthesize_vision_statement | client_id, disc_data, you2_data, transcript_data | vision_statement, confidence, sources_used[], audit_id |
| generate_intro_document | client_id, linkedin_data?, all_transcripts[], disc_data, you2_data | intro_document, entry_points[], confidence, audit_id |
| send_gmail_outreach | client_id, email_type, context, coach_approval | sent_at, subject, gmail_thread_id, pipeline_updated, audit_id |
| query_similar_clients | client_id | ROADMAP |
| get_outcome_patterns | disc_style, stage | ROADMAP |

---

## CHECK 8 — schema audit

### clients
- id, name, email, phone, company, stage, disc_style, disc_scores, you2_statement, you2_dangers, you2_opportunities, tumay_data, vision_statement, readiness_identity, readiness_commitment, readiness_financial, readiness_execution, confidence, recommendation, outcome, notes, created_at, updated_at  
- **Missing (per FIX 3 spec):** outcome_bucket, inferred_stage, stage_confirmed, readiness_score, pink_flags — not in current schema (future Phase 4+)

### document_extractions
- id, client_id, document_type, file_path, file_name, extraction_status, extracted_data, extraction_date, error_message  
- **All expected columns present**

### client_disc_profiles
- id, client_id, adapted_d/i/s/c, natural_d/i/s/c, primary_style_label, primary_style_combination, driving_forces_primary, communication_dos/donts, stress_signals, assessment_date, updated_at, driving_forces_situational, driving_forces_indifferent, ideal_environment, value_to_organization, areas_for_improvement  
- **All expected columns present**

### client_you2_profiles
- id, client_id, one_year_vision, spouse_name, spouse_role, spouse_on_calls, spouse_mindset, financial_net_worth_range, credit_score, launch_timeline, dangers, strengths, opportunities, areas_of_interest, updated_at, time_commitment, reasons_for_change, location_preference, skills, prior_business_experience, self_sufficiency_excitement, additional_stakeholders  
- **All expected columns present**

### audit_log
- id, timestamp, client_id, action_type, input_data, output_data, reasoning, model_used  
- **All expected columns present**

---

## Commit
**Condition:** tsc and cargo both PASS ✓  
**Message:** Pre-phase4 integrity fixes and audit
