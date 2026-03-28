# TOOLS.md — Sandi Bot Named Operations Registry
## Version 1.0 | March 2026
## Dr. Data Decision Intelligence

This document defines every named operation the system
can perform. Every IPC command, every service function,
and every future MCP tool maps to an entry here.

RULE: If an operation is not in this document it should
not be in the codebase. Add here first, build second.

---

## CORE OPERATIONS

### get_recommendation(client_id)
Layer: Skills + Contracts
Prompt: prompts/recommendation.txt
Input: { client_id: string }
Output: { recommendation, confidence_score,
          top_reasons[], pink_flags[], next_action,
          reasoning_chain, model_used, audit_id }
Approval required: confidence below 0.85
Audit: always
Config controls: llm.model, llm.approval_required_below

### check_completeness(client_id)
Layer: Skills
Prompt: prompts/completeness_check.txt
Input: { client_id: string }
Output: { completeness_status, missing_documents[],
          confidence_impact, recommendation_blocked,
          message }
Approval required: never
Audit: always
Config controls: none

### detect_pink_flags(client_id)
Layer: Skills
Prompt: prompts/pink_flag_detection.txt
Input: { client_id: string }
Output: { pink_flags_detected[], severity,
          immediate_action_required,
          suggested_clear_questions[], reasoning }
Approval required: never
Audit: always
Config controls: methodology.pink_flag_rules

### score_readiness(client_id)
Layer: Skills
Prompt: deterministic — no LLM required
Input: { client_id: string }
Output: { identity: 1-5, commitment: 1-5,
          financial: 1-5, execution: 1-5,
          average: 0-5, scoring_basis: string }
Approval required: never
Audit: always
Config controls: methodology.scoring_dimensions

### surface_clear_questions(client_id, stage, disc_style)
Layer: Skills
Prompt: prompts/coaching_assistant.txt
Input: { client_id, stage, disc_style,
         session_number, pink_flags_active[],
         coach_query? }
Output: { primary_question, follow_up_question,
          disc_communication_note,
          pink_flag_alerts[], confidence_score,
          stage_guidance }
Approval required: never
Audit: always
Config controls: methodology.framework_version

### extract_disc_profile(file_path, client_id)
Layer: Skills
Prompt: prompts/disc_extraction.txt
Input: { file_path: string, client_id: string }
Output: { D_score, I_score, S_score, C_score,
          style_label, style_description,
          strengths[], communication_preference,
          motivation_factors[],
          coaching_implications{},
          extraction_confidence, extraction_notes }
Approval required: extraction_confidence below 0.70
Audit: always
Config controls: llm.model

### extract_you2_profile(file_path, client_id)
Layer: Skills
Prompt: prompts/you2_extraction.txt
Input: { file_path: string, client_id: string }
Output: { vision_statement, strengths[],
          dangers[], opportunities[], tumay_data{},
          success_definition, key_motivators[],
          limiting_beliefs[], you2_score,
          extraction_confidence, extraction_notes }
Approval required: extraction_confidence below 0.70
Audit: always
Config controls: llm.model

### extract_fathom_transcript(file_path, client_id)
Layer: Skills
Prompt: prompts/fathom_extraction.txt
Input: { file_path: string, client_id: string }
Output: { session_date, session_duration,
          stage_at_time, key_topics[],
          objections_raised[], objection_type,
          engagement_quality, spouse_mentions[],
          financial_signals[],
          pink_flags_in_transcript[],
          outcome_signal, next_action_mentioned,
          coach_questions_used[],
          client_energy_shift,
          extraction_confidence, extraction_notes }
Approval required: extraction_confidence below 0.70
Audit: always
Config controls: llm.model

### evaluate_session(session_id)
Layer: Skills
Prompt: prompts/post_call_evaluation.txt
Input: { session_id: string }
Output: { overall_score, clear_framework_score,
          pink_flags_addressed_score,
          engagement_score, outcome_score,
          methodology_score, improvement_areas[],
          what_worked[],
          suggested_focus_next_session,
          coaching_brief }
Approval required: never
Audit: always
Config controls: methodology.framework

### log_audit_entry(operation, input, output, reasoning)
Layer: Governance
Prompt: none — deterministic
Input: { client_id, action_type, input_data,
         output_data, reasoning, model_used,
         confidence_score, coach_override? }
Output: { audit_id, timestamp }
Approval required: never
Audit: self-logging
Config controls: audit.reasoning_required

---

## Document Extraction Operations

### extract_disc_profile(client_id, file_path, raw_text)
Layer: Skills
Prompt: prompts/disc_extraction.txt
Input: { client_id: string, file_path: string, raw_text: string }
Output: ExtractionResult<DiscProfile>
Calibrated for TTI Talent Insights format.
Approval required: extraction_confidence below 0.70
Audit: always
Config controls: llm.model

### extract_you2_profile(client_id, file_path, raw_text)
Layer: Skills
Prompt: prompts/you2_extraction.txt
Input: { client_id: string, file_path: string, raw_text: string }
Output: ExtractionResult<You2Profile>
Calibrated for TES You 2.0 + TUMAY format.
Approval required: extraction_confidence below 0.70
Audit: always
Config controls: llm.model

### extract_fathom_session(client_id, file_path, raw_text)
Layer: Skills
Prompt: prompts/fathom_extraction.txt
Input: { client_id: string, file_path: string, raw_text: string }
Output: ExtractionResult<FathomSession>
Approval required: extraction_confidence below 0.70
Audit: always
Config controls: llm.model

### get_extraction_status(client_id)
Layer: Skills
Prompt: none — deterministic
Input: { client_id: string }
Output: Record<DocumentType, ExtractionStatus>
Approval required: never
Audit: always
Config controls: none

---

## PDF Extraction IPC Commands

### extract_pdf_pages
Input: { file_path: string, page_numbers: number[] }
Output: { text: string, format: string,
          success: boolean, error: string | null }
Backend: pdfium-render + Tesseract CLI fallback
Audit: no
LLM: no
Notes: pdfium primary, OCR for image-based PDFs
       BMP temp format, 15s OCR timeout

### parse_disc_scores_from_text
Input: { text: string }
Output: {
  adapted_d/i/s/c: number | null,
  natural_d/i/s/c: number | null,
  found: boolean
}
Backend: disc_parser.rs deterministic regex
Audit: no
LLM: no
Notes: 4 fallback patterns, covers both
       TTI DISC standard and Talent Insights
       Executive format

### debug_disc_pages
Input: { file_path: string }
Output: string (raw page text)
Backend: text_extractor.rs
Audit: no
LLM: no
Notes: development/diagnostic only

### test_disc_extraction
Input: { file_path: string }
Output: {
  scores: DiscScores,
  text_preview: string,
  text_length: number,
  page_numbers: number[],
  success: boolean,
  error: string | null
}
Backend: disc_parser + text_extractor
Audit: no
LLM: no
Notes: single file verbose test mode

### check_tesseract
Input: none
Output: boolean
Backend: Tesseract CLI version check
Audit: no
LLM: no

### log_human_correction (PENDING — mig 48)
Input: {
  client_id: string,
  document_type: string,
  field_corrected: string,
  original_value: string,
  corrected_value: string,
  correction_scope: 'once' | 'retrain' | 'flag',
  confirmed_by: string
}
Output: { success: boolean }
Audit: always
LLM: no
Notes: requires migration 48 to run first

---

## STAGE INFERENCE & PROFILE BUILDER

### infer_client_stage
Layer: Skills
Prompt: none — pure logic
Input: { client_id: string, bucket: OutcomeBucket }
Output: { inferred_stage, confidence, reasoning,
          missing_documents }
Audit: always
Approval: none — system infers, Sandi confirms
LLM: no

### confirm_client_stage
Layer: Skills
Prompt: none
Input: { client_id: string, stage: string,
         confirmed_by: string }
Output: { success: boolean }
Audit: always
Approval: none — this IS the approval
LLM: no

### rebuild_client_profile
Layer: Skills
Prompt: none
Input: { client_id: string }
Output: { success: boolean, readiness_score: number,
          recommendation: string, pink_flags: string[] }
Audit: always
Approval: none
LLM: no — calls existing recommendationService

### bulk_import_folder
Layer: Skills
Prompt: none — orchestrates documentExtractionService
Input: { base_path: string }
Output: { processed: number, failed: number,
          clients_created: number, errors: string[] }
Audit: always
Approval: none
LLM: yes — calls documentExtractionService

### log_stz_interaction
Layer: Skills
Prompt: none — deterministic
Input: { STZInteractionLog }
Output: { success: boolean }
Audit: never — this IS the audit system
Approval: none
LLM: no

### update_l5_signals
Layer: Skills
Prompt: none — deterministic
Input: { session_id: string, l5: L5Signals }
Output: { success: boolean }
Audit: never
Approval: none
LLM: no

---

## FRED-ONLY OPERATIONS
Loads only when agents.synthesis_agent: true in config

### synthesize_vision_statement(client_id)
Layer: Skills — Synthesis Agent
Prompt: prompts/vision_synthesis.txt
Input: { client_id, disc_data{}, you2_data{},
         transcript_data{},
         coach_voice_samples[] }
Output: { vision_statement, confidence,
          sources_used[], coach_voice_match_score,
          audit_id }
Approval required: always — coach reviews before saving
Audit: always
Config controls: agents.synthesis_agent, llm.model

### generate_intro_document(client_id)
Layer: Skills — Synthesis Agent
Prompt: prompts/intro_doc_synthesis.txt
Input: { client_id, linkedin_data?,
         all_transcripts[], disc_data{},
         you2_data{} }
Output: { intro_document, entry_points[],
          confidence, sources_used[], audit_id }
Approval required: always
Audit: always
Config controls: agents.synthesis_agent

### send_gmail_outreach(client_id, email_type, context)
Layer: Skills — Outreach Agent
Prompt: none — template based
Input: { client_id, email_type, context,
         coach_approval: boolean }
Output: { sent_at, subject, gmail_thread_id,
          pipeline_updated, audit_id }
Approval required: always
coach_approval must be true — never sends without it
Audit: always — every external call logged
Config controls: external_integrations.gmail

---

## PHASE 5 OPERATIONS — NOT YET BUILT

### query_similar_clients(client_id)
Layer: Pattern Agent
Status: ROADMAP — requires Neo4j Phase 5

### get_outcome_patterns(disc_style, stage)
Layer: Pattern Agent
Status: ROADMAP — requires Neo4j Phase 5

---

## AUDIT TABLE REQUIREMENTS
Every operation marked Audit: always must write:
- client_id
- action_type (operation name)
- input_data (what was passed in)
- output_data (what was returned)
- reasoning (step by step — never a summary)
- model_used (deterministic | phi3:mini | llama3.1:8b)
- confidence_score (where applicable)
- similar_clients (empty array until Phase 5)
- coach_override (null unless coach changed output)
- timestamp

---

## CONFIG CONTROLS REFERENCE
Every operation that says Config controls references
a field in the client config file.
Changing client behavior means changing their config.
Never hardcode client-specific values in code.

sandi_stahl.json — document + coaching + pattern agents
fred_webster.json — all agents + gmail + linkedin
base_client.config.json — template for new clients

---

## ollama_generate
invoke('ollama_generate', {
  prompt: string,
  system: string,
  model: string
})
Returns: Promise<string>
Timeout: 120 seconds
Options: num_ctx 4096, num_predict 1024
CRITICAL: Only way to call Ollama.
Direct fetch() is blocked by Tauri v2.
CONFIRMED WORKING: These options extracted
17/17 TUMAY profiles successfully.
num_predict: 512 causes JSON truncation errors.
num_ctx: 2048 is too small for full TUMAY docs.
Always use num_predict: 1024, num_ctx: 4096.

## check_ollama_status
invoke('check_ollama_status')
Returns: Promise<boolean>
Use before any extraction.

## extract_pdf_pages
invoke('extract_pdf_pages', {
  filePath: string,
  pageNumbers: number[]
})
Returns: Promise<{ text: string, success: boolean }>
Uses pdfium-render. Always use for PDFs.

## extract_text
invoke('extract_text', { filePath: string })
Returns: Promise<string>
Handles PDF, PPTX, DOCX, TXT, CSV.

---

## REGISTERED TAURI COMMANDS (confirmed working)

- invoke('ollama_generate') — Ollama proxy
  Options: num_ctx:4096, num_predict:1024,
  temperature:0.1, timeout:120s
  Model: qwen2.5:7b
  NEVER call fetch localhost:11434 directly

- invoke('extract_pdf_pages') — PDF extraction
  Uses pdfium-render (primary)
  Falls back to Tesseract OCR
  NEVER use lopdf or JS PDF libraries

## BINARY DEPENDENCIES

- pdfium.dll — Windows, src-tauri/pdfium.dll
- icon.ico — src-tauri/icons/icon.ico
- icon.png — src-tauri/icons/icon.png

All force-committed to repo (in .gitignore)

## DATABASE

- File: sandi_bot.db
- Location: %APPDATA%\com.sandibot.desktop\
- Access: getDb() via tauri-plugin-sql
- Migrations: 1-50 complete, never edit
- Next migration: 51+
- client_id: always TEXT UUID never integer

## CONFIRMED WORKING OLLAMA OPTIONS

num_ctx: 4096 (minimum for full TUMAY docs)
num_predict: 1024 (minimum to avoid truncation)
temperature: 0.1
timeout: 120 seconds
NEVER use num_predict: 512 (causes JSON truncation)
NEVER use num_ctx: 2048 (insufficient)

## CI/CD

Workflow: .github/workflows/build.yml
Trigger: every push to dev branch
Outputs: Windows MSI + Mac DMG
Secret required: GH_PAT in repo settings
