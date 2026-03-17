mod pdf_parser;
mod file_watcher;
mod backup;
mod text_extractor;

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
async fn bulk_import_folder(folder_path: String) -> Result<String, String> {
    // Phase 3 implementation pending
    Ok(format!("Bulk importing: {}", folder_path))
}

#[tauri::command]
fn read_prompt_file(name: String) -> Result<String, String> {
    let prompt_path = format!("prompts/{}.txt", name);
    std::fs::read_to_string(&prompt_path)
        .map_err(|e| format!("Failed to read prompt {}: {}", name, e))
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
            get_app_dir,
            watch_client_folders,
            process_document,
            extract_text_from_any_file,
            bulk_import_folder,
            pdf_parser::parse_pdf,
            file_watcher::watch_folder,
            backup::create_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
