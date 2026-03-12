use rusqlite::Connection;
use tauri::AppHandle;

#[tauri::command]
pub fn init_db(app: AppHandle) -> std::result::Result<String, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;
    let db_path = app_data.join("sandi_bot.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY,
            name TEXT,
            disc_style TEXT,
            stage TEXT,
            notes TEXT,
            created_at TEXT
        )",
        [],
    ).map_err(|e| e.to_string())?;
    Ok(db_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn query_clients(app: AppHandle) -> std::result::Result<Vec<serde_json::Value>, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data.join("sandi_bot.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, disc_style, stage, notes, created_at FROM clients").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, i64>(0)?,
            "name": row.get::<_, Option<String>>(1)?,
            "disc_style": row.get::<_, Option<String>>(2)?,
            "stage": row.get::<_, Option<String>>(3)?,
            "notes": row.get::<_, Option<String>>(4)?,
            "created_at": row.get::<_, Option<String>>(5)?,
        }))
    }).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}
