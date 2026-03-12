use std::fs;

use chrono::Utc;
use tauri::Manager;

#[tauri::command]
pub fn create_backup(app: tauri::AppHandle) -> Result<String, String> {
    // tauri-plugin-sql stores DB in AppConfig directory
    let app_config = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let db_path = app_config.join("sandi_bot.db");
    if !db_path.exists() {
        return Err("Database not found".to_string());
    }
    let backup_dir = app_config.join("backups");
    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let backup_path = backup_dir.join(format!("sandi_bot_{}.db", timestamp));
    fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
    Ok(backup_path.to_string_lossy().to_string())
}
