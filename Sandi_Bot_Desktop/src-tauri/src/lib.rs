mod pdf_parser;
mod file_watcher;
mod backup;

use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello, {}! Sandi Bot is ready.", name)
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
            get_app_dir,
            pdf_parser::parse_pdf,
            file_watcher::watch_folder,
            backup::create_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
