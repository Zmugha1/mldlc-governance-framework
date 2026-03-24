mod pdf_parser;
mod file_watcher;
mod backup;
mod text_extractor;
mod disc_parser;
mod you2_parser;
mod tumay_parser;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello, {}! Sandi Bot is ready.", name)
}

#[tauri::command]
async fn watch_client_folders(base_path: String) -> Result<String, String> {
    // Phase 3 implementation pending
    Ok(format!("Watching: {}", base_path))
}

#[tauri::command]
async fn process_document(file_path: String, doc_type: String) -> Result<String, String> {
    // Phase 3 implementation pending
    Ok(format!("Processing: {} as {}", file_path, doc_type))
}

#[tauri::command]
async fn extract_text_from_any_file(file_path: String) -> Result<serde_json::Value, String> {
    let result = text_extractor::extract_text(&file_path);
    Ok(serde_json::json!({
        "text": result.text,
        "format": result.format,
        "success": result.success,
        "error": result.error
    }))
}

#[tauri::command]
async fn extract_pdf_pages(
    file_path: String,
    page_numbers: Vec<u32>,
) -> Result<serde_json::Value, String> {
    let result = text_extractor::extract_pages_by_numbers(&file_path, page_numbers);
    if result.success {
        Ok(serde_json::json!({
            "text": result.text,
            "format": result.format,
            "success": true,
            "error": null
        }))
    } else {
        let err_msg = result.error.unwrap_or_else(|| "Unknown extraction error".to_string());
        Err(err_msg)
    }
}

#[tauri::command]
fn check_tesseract() -> bool {
    let tesseract_exe = if cfg!(target_os = "windows") {
        let default = r"C:\Program Files\Tesseract-OCR\tesseract.exe";
        if std::path::Path::new(default).exists() {
            default
        } else {
            "tesseract"
        }
    } else {
        "tesseract"
    };
    std::process::Command::new(tesseract_exe)
        .arg("--version")
        .output()
        .is_ok()
}

#[tauri::command]
fn debug_disc_pages(file_path: String) -> String {
    let result = text_extractor::extract_pages_by_numbers(&file_path, vec![23, 24, 25]);
    result.text
}

/// Test You2 extraction for a single file — uses pdfium (pages 1–5), runs deterministic vision + top 3.
#[tauri::command]
fn test_you2_extraction(file_path: String) -> Result<serde_json::Value, String> {
    let result = text_extractor::extract_pages_by_numbers(
        &file_path,
        vec![1, 2, 3, 4, 5], // You2 is typically 2 pages; pdfium handles missing pages gracefully
    );
    let extracted = you2_parser::extract_you2_vision_deterministic(&result.text);
    Ok(serde_json::json!({
        "vision": extracted.vision,
        "top_3_dangers": extracted.top_3_dangers,
        "top_3_strengths": extracted.top_3_strengths,
        "top_3_opportunities": extracted.top_3_opportunities,
        "success": result.success && extracted.found,
        "error": result.error
    }))
}

/// Test DISC extraction for a single file — returns verbose JSON with logs for debugging.
#[tauri::command]
fn test_disc_extraction(file_path: String) -> Result<serde_json::Value, String> {
    let page_numbers = vec![23, 24, 25, 28, 34, 35, 36];
    let result = text_extractor::extract_pages_by_numbers(&file_path, page_numbers.clone());

    let scores = if result.success && !result.text.is_empty() {
        let parsed = disc_parser::parse_disc_scores(&result.text);
        serde_json::json!({
            "adapted_d": parsed.adapted_d,
            "adapted_i": parsed.adapted_i,
            "adapted_s": parsed.adapted_s,
            "adapted_c": parsed.adapted_c,
            "natural_d": parsed.natural_d,
            "natural_i": parsed.natural_i,
            "natural_s": parsed.natural_s,
            "natural_c": parsed.natural_c,
            "found": parsed.found
        })
    } else {
        serde_json::Value::Null
    };

    Ok(serde_json::json!({
        "success": result.success,
        "format": result.format,
        "error": result.error,
        "text_length": result.text.len(),
        "text_preview": if result.text.len() > 500 {
            format!("{}...", &result.text[..500])
        } else {
            result.text.clone()
        },
        "scores": scores,
        "file_path": file_path,
        "page_numbers": page_numbers
    }))
}

#[tauri::command]
fn parse_disc_scores_from_text(text: String) -> Result<serde_json::Value, String> {
    let scores = disc_parser::parse_disc_scores(&text);
    println!("[DISC] Regex match result: {:?}", scores);
    Ok(serde_json::json!({
        "adapted_d": scores.adapted_d,
        "adapted_i": scores.adapted_i,
        "adapted_s": scores.adapted_s,
        "adapted_c": scores.adapted_c,
        "natural_d": scores.natural_d,
        "natural_i": scores.natural_i,
        "natural_s": scores.natural_s,
        "natural_c": scores.natural_c,
        "found": scores.found
    }))
}

#[tauri::command]
fn parse_tumay(text: String) -> Result<String, String> {
    let parsed = tumay_parser::parse_tumay_deterministic(&text);
    serde_json::to_string(&parsed).map_err(|e| e.to_string())
}

#[tauri::command]
async fn bulk_import_folder(folder_path: String) -> Result<String, String> {
    // Phase 3 implementation pending
    Ok(format!("Bulk importing: {}", folder_path))
}

#[tauri::command]
fn read_prompt_file(name: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    // Try multiple locations for prompts (dev cwd is unpredictable)
    let possible_paths = vec![
        format!("prompts/{}.txt", name),
        format!("../prompts/{}.txt", name),
        format!("../../prompts/{}.txt", name),
    ];

    for path in &possible_paths {
        if let Ok(content) = std::fs::read_to_string(path) {
            if !content.trim().is_empty() {
                return Ok(content);
            }
        }
    }

    // Try Tauri resource path
    if let Ok(resource_path) = app_handle.path().resource_dir() {
        let prompt_path = resource_path
            .join("prompts")
            .join(format!("{}.txt", name));
        if let Ok(content) = std::fs::read_to_string(&prompt_path) {
            if !content.trim().is_empty() {
                return Ok(content);
            }
        }
    }

    // Fallback so extraction can proceed without file
    let fallback = match name.as_str() {
        "disc_extraction" => "Extract DISC behavioral assessment data from this TTI report. Return structured JSON only.",
        "you2_extraction" => "Extract You 2.0 and TUMAY intake form data. Return structured JSON only.",
        "fathom_extraction" => "Extract coaching session data from this transcript. Return structured JSON only.",
        _ => "Extract structured data from this document. Return JSON only.",
    };

    Ok(fallback.to_string())
}

#[tauri::command]
fn list_directory_files(path: String) -> Result<Vec<String>, String> {
    let dir = std::fs::read_dir(&path)
        .map_err(|e| format!("Cannot read dir {}: {}", path, e))?;

    let mut files = Vec::new();

    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        println!("[RUST SCAN] Found file: {}", file_name);

        files.push(file_name);
    }

    println!("[RUST SCAN] Total files in {}: {}", path, files.len());

    Ok(files)
}

#[tauri::command]
fn list_directory(
    path: String
) -> Result<Vec<String>, String> {
    let dir = std::fs::read_dir(&path)
        .map_err(|e| format!(
            "Cannot read dir {}: {}", path, e
        ))?;
    let files: Vec<String> = dir
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file())
        .map(|e| e.path()
            .to_string_lossy()
            .to_string())
        .collect();
    Ok(files)
}

#[tauri::command]
fn debug_list_path(
    path: String
) -> String {
    match std::fs::read_dir(&path) {
        Ok(dir) => {
            let files: Vec<String> = dir
                .filter_map(|e| e.ok())
                .map(|e| e.path()
                    .to_string_lossy()
                    .to_string())
                .collect();
            format!("OK: {} files found: {:?}",
                files.len(), files)
        }
        Err(e) => format!("ERROR: {}", e)
    }
}

#[tauri::command]
fn create_client_folder(
    base_path: String,
    bucket: String,
    client_name: String,
) -> Result<String, String> {
    let folder_path = std::path::Path::new(&base_path)
        .join(&bucket)
        .join(&client_name);
    std::fs::create_dir_all(&folder_path).map_err(|e| {
        format!("Failed to create folder {}: {}", folder_path.display(), e)
    })?;
    Ok(folder_path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_app_dir(_app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(windows)]
    let home = std::env::var("USERPROFILE").map_err(|e| e.to_string())?;
    #[cfg(not(windows))]
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let sandi_bot = std::path::Path::new(&home).join("SandiBot");
    Ok(sandi_bot.to_string_lossy().to_string())
}

#[tauri::command]
async fn ollama_generate(
    prompt: String,
    system: String,
    model: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": false,
        "options": {
            "temperature": 0.1,
            "num_ctx": 4096,
            "num_predict": 1024
        }
    });
    let resp = client
        .post("http://localhost:11434/api/generate")
        .json(&body)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| format!("Ollama connection failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Ollama returned status: {}", resp.status()
        ));
    }
    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!(
            "Parse error: {}", e
        ))?;
    Ok(data["response"]
        .as_str()
        .unwrap_or("")
        .to_string())
}

#[tauri::command]
async fn check_ollama_status() -> bool {
    let client = reqwest::Client::new();
    client
        .get("http://localhost:11434/api/tags")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ─────────────────────────────────────────────
    // MIGRATION RULES — READ BEFORE EDITING
    // ─────────────────────────────────────────────
    // 1. NEVER edit an existing migration.
    //    tauri-plugin-sql checksums every entry.
    //    Editing any migration after first run
    //    crashes the app on next launch.
    //
    // 2. ALWAYS add new migrations at the end.
    //    Current highest version: 28 (check below)
    //
    // 3. To find current highest version:
    //    grep for the last Migration block.
    //
    // 4. If you see this error:
    //    "migration X was previously applied but
    //     has been modified" — do NOT edit more
    //    migrations. Delete the dev database at:
    //    %APPDATA%\com.sandibot.desktop\sandi_bot.db
    //    and fix the modified migration using
    //    git to restore its original content.
    // ─────────────────────────────────────────────
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_clients_table",
            sql: "CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                company TEXT,
                stage TEXT DEFAULT 'Initial Contact',
                disc_style TEXT,
                disc_scores TEXT,
                you2_statement TEXT,
                you2_dangers TEXT,
                you2_opportunities TEXT,
                tumay_data TEXT,
                vision_statement TEXT,
                readiness_identity INTEGER DEFAULT 3,
                readiness_commitment INTEGER DEFAULT 3,
                readiness_financial INTEGER DEFAULT 3,
                readiness_execution INTEGER DEFAULT 3,
                confidence INTEGER DEFAULT 50,
                recommendation TEXT DEFAULT 'NURTURE',
                outcome TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_documents_table",
            sql: "CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                document_type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                raw_text TEXT,
                extracted_data TEXT,
                validation_passed BOOLEAN DEFAULT false,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_sessions_table",
            sql: "CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                stage_before TEXT,
                stage_after TEXT,
                summary TEXT,
                objections_raised TEXT,
                scripts_used TEXT,
                outcome_signal TEXT,
                next_action TEXT,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_audit_log_table",
            sql: "CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                client_id TEXT,
                action_type TEXT NOT NULL,
                input_data TEXT,
                output_data TEXT,
                reasoning TEXT,
                model_used TEXT
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_backup_log_table",
            sql: "CREATE TABLE IF NOT EXISTS backup_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                backup_path TEXT,
                success BOOLEAN,
                error_message TEXT
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_knowledge_search_fts5",
            sql: "CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_search
                USING fts5(
                    content,
                    content_type,
                    stage,
                    client_id
                )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_document_extractions_table",
            sql: "CREATE TABLE IF NOT EXISTS document_extractions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                document_type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_name TEXT NOT NULL,
                extraction_status TEXT DEFAULT 'pending',
                extracted_data TEXT,
                extraction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                error_message TEXT,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "create_client_disc_profiles_table",
            sql: "CREATE TABLE IF NOT EXISTS client_disc_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT UNIQUE NOT NULL,
                adapted_d INTEGER, adapted_i INTEGER,
                adapted_s INTEGER, adapted_c INTEGER,
                natural_d INTEGER, natural_i INTEGER,
                natural_s INTEGER, natural_c INTEGER,
                primary_style_label TEXT,
                primary_style_combination TEXT,
                driving_forces_primary TEXT,
                communication_dos TEXT,
                communication_donts TEXT,
                stress_signals TEXT,
                assessment_date TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "create_client_you2_profiles_table",
            sql: "CREATE TABLE IF NOT EXISTS client_you2_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT UNIQUE NOT NULL,
                one_year_vision TEXT,
                spouse_name TEXT,
                spouse_role TEXT,
                spouse_on_calls TEXT,
                spouse_mindset TEXT,
                financial_net_worth_range TEXT,
                credit_score INTEGER,
                launch_timeline TEXT,
                dangers TEXT,
                strengths TEXT,
                opportunities TEXT,
                areas_of_interest TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "add_disc_driving_forces_situational",
            sql: "ALTER TABLE client_disc_profiles ADD COLUMN driving_forces_situational TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "add_disc_driving_forces_indifferent",
            sql: "ALTER TABLE client_disc_profiles ADD COLUMN driving_forces_indifferent TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "add_disc_ideal_environment",
            sql: "ALTER TABLE client_disc_profiles ADD COLUMN ideal_environment TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "add_disc_value_to_organization",
            sql: "ALTER TABLE client_disc_profiles ADD COLUMN value_to_organization TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "add_disc_areas_for_improvement",
            sql: "ALTER TABLE client_disc_profiles ADD COLUMN areas_for_improvement TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "add_you2_time_commitment",
            sql: "ALTER TABLE client_you2_profiles ADD COLUMN time_commitment TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "add_you2_reasons_for_change",
            sql: "ALTER TABLE client_you2_profiles ADD COLUMN reasons_for_change TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "add_you2_location_preference",
            sql: "ALTER TABLE client_you2_profiles ADD COLUMN location_preference TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "add_you2_skills",
            sql: "ALTER TABLE client_you2_profiles ADD COLUMN skills TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "add_you2_prior_business_experience",
            sql: "ALTER TABLE client_you2_profiles ADD COLUMN prior_business_experience TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "add_you2_self_sufficiency_excitement",
            sql: "ALTER TABLE client_you2_profiles ADD COLUMN self_sufficiency_excitement TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "add_you2_additional_stakeholders",
            sql: "ALTER TABLE client_you2_profiles ADD COLUMN additional_stakeholders TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 22,
            description: "create_coaching_sessions_table",
            sql: "CREATE TABLE IF NOT EXISTS coaching_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                session_date TEXT,
                session_number INTEGER,
                stage TEXT,
                notes TEXT,
                next_actions TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 23,
            description: "add_clients_outcome_bucket",
            sql: "ALTER TABLE clients ADD COLUMN outcome_bucket TEXT DEFAULT 'active'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 24,
            description: "add_clients_inferred_stage",
            sql: "ALTER TABLE clients ADD COLUMN inferred_stage TEXT DEFAULT 'IC'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 25,
            description: "add_clients_stage_confirmed",
            sql: "ALTER TABLE clients ADD COLUMN stage_confirmed INTEGER DEFAULT 0",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 26,
            description: "add_clients_readiness_score",
            sql: "ALTER TABLE clients ADD COLUMN readiness_score INTEGER DEFAULT 0",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 27,
            description: "add_clients_pink_flags",
            sql: "ALTER TABLE clients ADD COLUMN pink_flags TEXT DEFAULT '[]'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 28,
            description: "create_client_stage_log_table",
            sql: "CREATE TABLE IF NOT EXISTS client_stage_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                previous_stage TEXT,
                new_stage TEXT,
                previous_bucket TEXT,
                new_bucket TEXT,
                changed_by TEXT DEFAULT 'system',
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 29,
            description: "create_stz_feedback_log_table",
            sql: "CREATE TABLE IF NOT EXISTS stz_feedback_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sme_id TEXT DEFAULT 'sandi_stahl',
                client_id TEXT NOT NULL,
                aop_id TEXT DEFAULT 'franchise_coaching_tes',
                session_number INTEGER,
                pipeline_stage TEXT,
                outcome_bucket TEXT,
                l1_prompt_quality_score INTEGER,
                l1_vocabulary_match INTEGER DEFAULT 0,
                l1_output_grade TEXT,
                l1_edge_case_triggered INTEGER DEFAULT 0,
                l1_edge_case_type TEXT,
                l1_reasoning_chain_present INTEGER DEFAULT 1,
                l1_source_documents TEXT,
                l2_skills_invoked TEXT,
                l2_readiness_identity REAL,
                l2_readiness_commitment REAL,
                l2_readiness_financial REAL,
                l2_readiness_execution REAL,
                l2_readiness_composite REAL,
                l2_flag_detected INTEGER DEFAULT 0,
                l2_flag_types TEXT,
                l2_flag_count INTEGER DEFAULT 0,
                l2_hesitation_type TEXT,
                l2_spouse_alignment_status TEXT,
                l2_days_in_stage INTEGER,
                l2_session_engagement_quality TEXT,
                l3_agent_triggered TEXT,
                l3_workflow_completed INTEGER DEFAULT 0,
                l3_workflow_steps_completed INTEGER,
                l3_workflow_steps_total INTEGER,
                l3_human_interrupt_point TEXT,
                l3_time_to_ready_seconds REAL,
                l3_documents_processed TEXT,
                l4_approval_required INTEGER DEFAULT 0,
                l4_approval_given INTEGER,
                l4_modification_made INTEGER DEFAULT 0,
                l4_modification_rationale TEXT,
                l4_confidence_score REAL,
                l4_completeness_gate_status TEXT,
                l4_missing_documents TEXT,
                l4_handoff_triggered INTEGER DEFAULT 0,
                l4_handoff_reason TEXT,
                l4_recommendation_label TEXT,
                l4_recommendation_reasons TEXT,
                l5_rubric_clear REAL,
                l5_rubric_flag_detection REAL,
                l5_rubric_question_quality REAL,
                l5_rubric_outcome_signal REAL,
                l5_rubric_methodology REAL,
                l5_rubric_composite REAL,
                l5_correction_scope TEXT,
                l5_zone_signal_rating INTEGER,
                l5_review_triggered INTEGER DEFAULT 0,
                l5_passive_accept INTEGER DEFAULT 0,
                l5_prep_time_minutes REAL,
                l5_coaching_self_score REAL,
                l5_coach_note TEXT,
                study_week INTEGER,
                study_phase TEXT DEFAULT 'baseline',
                data_quality TEXT DEFAULT 'complete',
                anonymization_verified INTEGER DEFAULT 1
            );
            CREATE INDEX IF NOT EXISTS idx_feedback_client ON stz_feedback_log(client_id);
            CREATE INDEX IF NOT EXISTS idx_feedback_week ON stz_feedback_log(study_week);
            CREATE INDEX IF NOT EXISTS idx_feedback_stage ON stz_feedback_log(pipeline_stage);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 30,
            description: "clear_failed_extractions",
            sql: "DELETE FROM document_extractions WHERE extraction_status = 'failed' OR extraction_status = 'pending'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 31,
            description: "clear_empty_disc_profiles",
            sql: "DELETE FROM client_disc_profiles WHERE natural_d IS NULL AND natural_i IS NULL AND natural_s IS NULL AND natural_c IS NULL",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 32,
            description: "clear_failed_extractions_v2",
            sql: "DELETE FROM document_extractions WHERE extraction_status IN ('failed', 'pending')",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 33,
            description: "clear_failed_for_llama_retry",
            sql: "DELETE FROM document_extractions WHERE extraction_status = 'failed'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 34,
            description: "clear_failed_for_qwen_retry",
            sql: "DELETE FROM document_extractions WHERE extraction_status = 'failed'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 35,
            description: "clear_failed_for_llama_final",
            sql: "DELETE FROM document_extractions WHERE extraction_status = 'failed'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 36,
            description: "clear_failed_disc_retry",
            sql: "DELETE FROM document_extractions WHERE extraction_status = 'failed'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 37,
            description: "add_you2_confirmed",
            sql: "ALTER TABLE client_you2_profiles ADD COLUMN you2_confirmed INTEGER DEFAULT 0",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 38,
            description: "add_you2_confirmed_by",
            sql: "ALTER TABLE client_you2_profiles ADD COLUMN confirmed_by TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 39,
            description: "add_you2_confirmed_at",
            sql: "ALTER TABLE client_you2_profiles ADD COLUMN confirmed_at TIMESTAMP",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 40,
            description: "add_disc_confirmed",
            sql: "ALTER TABLE client_disc_profiles ADD COLUMN disc_confirmed INTEGER DEFAULT 0",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 41,
            description: "add_disc_manually_entered",
            sql: "ALTER TABLE client_disc_profiles ADD COLUMN manually_entered INTEGER DEFAULT 0",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 42,
            description: "add_disc_confirmed_by",
            sql: "ALTER TABLE client_disc_profiles ADD COLUMN confirmed_by TEXT",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 43,
            description: "add_disc_confirmed_at",
            sql: "ALTER TABLE client_disc_profiles ADD COLUMN confirmed_at TIMESTAMP",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 44,
            description: "clear_failed_for_calibrated_prompts",
            sql: "DELETE FROM document_extractions WHERE extraction_status = 'failed'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 45,
            description: "clear_failed_for_calibrated_prompts_v2",
            sql: "DELETE FROM document_extractions WHERE extraction_status = 'failed'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 46,
            description: "clear_contaminated_extractions",
            sql: "DELETE FROM client_you2_profiles; DELETE FROM client_disc_profiles; DELETE FROM document_extractions WHERE extraction_status IN ('complete', 'failed')",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 47,
            description: "clear_failed_for_page_targeted_extraction",
            sql: "DELETE FROM document_extractions WHERE extraction_status = 'failed'",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 48,
            description: "add_clear_scoring_columns_to_coaching_sessions",
            sql: "ALTER TABLE coaching_sessions ADD COLUMN clear_curiosity INTEGER DEFAULT 3;
                  ALTER TABLE coaching_sessions ADD COLUMN clear_locating INTEGER DEFAULT 3;
                  ALTER TABLE coaching_sessions ADD COLUMN clear_engagement INTEGER DEFAULT 3;
                  ALTER TABLE coaching_sessions ADD COLUMN clear_accountability INTEGER DEFAULT 3;
                  ALTER TABLE coaching_sessions ADD COLUMN clear_reflection INTEGER DEFAULT 3;
                  ALTER TABLE coaching_sessions ADD COLUMN clear_notes TEXT;
                  ALTER TABLE coaching_sessions ADD COLUMN overall_clear_score REAL;
                  ALTER TABLE coaching_sessions ADD COLUMN call_duration TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 49,
            description: "add_pause_and_referral_fields_to_clients",
            sql: "ALTER TABLE clients ADD COLUMN pause_reason TEXT;
                  ALTER TABLE clients ADD COLUMN follow_up_date DATE;
                  ALTER TABLE clients ADD COLUMN referral_source TEXT;
                  ALTER TABLE clients ADD COLUMN referred_by TEXT;
                  ALTER TABLE clients ADD COLUMN referral_ask_sent DATE;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 50,
            description: "add_structured_fathom_blocks",
            sql: "ALTER TABLE coaching_sessions ADD COLUMN block_opening TEXT;
                  ALTER TABLE coaching_sessions ADD COLUMN block_emotional TEXT;
                  ALTER TABLE coaching_sessions ADD COLUMN block_life_context TEXT;
                  ALTER TABLE coaching_sessions ADD COLUMN block_vision TEXT;
                  ALTER TABLE coaching_sessions ADD COLUMN block_disc_signals TEXT;
                  ALTER TABLE coaching_sessions ADD COLUMN block_objections TEXT;
                  ALTER TABLE coaching_sessions ADD COLUMN block_commitments TEXT;
                  ALTER TABLE coaching_sessions ADD COLUMN block_reflection TEXT;
                  ALTER TABLE coaching_sessions ADD COLUMN block_coach_assessment TEXT;
                  ALTER TABLE coaching_sessions ADD COLUMN blocks_complete INTEGER DEFAULT 0;",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:sandi_bot.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            greet,
            read_prompt_file,
            list_directory_files,
            list_directory,
            debug_list_path,
            get_app_dir,
            create_client_folder,
            watch_client_folders,
            process_document,
            extract_text_from_any_file,
            extract_pdf_pages,
            check_tesseract,
            debug_disc_pages,
            test_disc_extraction,
            test_you2_extraction,
            parse_disc_scores_from_text,
            parse_tumay,
            ollama_generate,
            check_ollama_status,
            bulk_import_folder,
            pdf_parser::parse_pdf,
            file_watcher::watch_folder,
            backup::create_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
