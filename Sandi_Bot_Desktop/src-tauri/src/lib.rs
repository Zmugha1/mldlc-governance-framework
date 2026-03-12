mod database;
mod pdf_parser;
mod file_watcher;
mod backup;

use tauri::Manager;

#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello, {}! Sandi Bot is ready.", name)
}

#[tauri::command]
fn get_app_dir(app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(windows)]
    let home = std::env::var("USERPROFILE").map_err(|e| e.to_string())?;
    #[cfg(not(windows))]
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let sandi_bot = std::path::Path::new(&home).join("SandiBot");
    Ok(sandi_bot.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_app_dir,
            database::init_db,
            database::query_clients,
            pdf_parser::parse_pdf,
            file_watcher::watch_folder,
            backup::create_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
