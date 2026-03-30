use tauri_plugin_sql::{Migration, MigrationKind};

/// Migration 54: `territory_check_notes`, `weekly_seeker_contacts` on `clients`;
/// `session_scheduled` on `coaching_sessions`; `aha_moments` table.
///
/// `moment_type` values (application-level): `general`, `client_specific`, `pattern`,
/// `disc_insight`, `stage_insight`.
pub fn migration_54() -> Migration {
    Migration {
        version: 54,
        description: "aha_moments_territory_weekly_seeker_session_scheduled",
        sql: "ALTER TABLE clients ADD COLUMN territory_check_notes TEXT;
              ALTER TABLE clients ADD COLUMN weekly_seeker_contacts TEXT;
              ALTER TABLE coaching_sessions ADD COLUMN session_scheduled INTEGER DEFAULT 0;
              CREATE TABLE IF NOT EXISTS aha_moments (
                id TEXT PRIMARY KEY,
                client_id TEXT,
                moment_text TEXT NOT NULL,
                moment_type TEXT DEFAULT 'general',
                disc_style TEXT,
                stage TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (client_id) REFERENCES clients(id)
              );",
        kind: MigrationKind::Up,
    }
}
