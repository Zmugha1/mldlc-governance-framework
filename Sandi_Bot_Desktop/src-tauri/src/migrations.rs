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

/// Migration 55: `client_stage_log` for pipeline stage transitions.
pub fn migration_55() -> Migration {
    Migration {
        version: 55,
        description: "create_client_stage_log",
        sql: "CREATE TABLE IF NOT EXISTS client_stage_log (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                from_stage TEXT,
                to_stage TEXT NOT NULL,
                moved_at TEXT DEFAULT (datetime('now')),
                moved_by TEXT DEFAULT 'sandi',
                notes TEXT,
                FOREIGN KEY (client_id)
                  REFERENCES clients(id)
              );",
        kind: MigrationKind::Up,
    }
}

/// Migration 56: `user_preferences` singleton (install date, coach settings, time saved).
pub fn migration_56() -> Migration {
    Migration {
        version: 56,
        description: "create_user_preferences",
        sql: "CREATE TABLE IF NOT EXISTS user_preferences (
                id TEXT PRIMARY KEY DEFAULT 'singleton',
                install_date TEXT,
                coach_name TEXT DEFAULT 'Sandi',
                coach_hourly_rate INTEGER DEFAULT 150,
                weekly_hours_saved REAL DEFAULT 2.0,
                timezone TEXT DEFAULT 'America/Chicago',
                updated_at TEXT DEFAULT (datetime('now'))
              );
              INSERT OR IGNORE INTO user_preferences
                (id, install_date)
                VALUES (
                  'singleton',
                  date('now')
                );",
        kind: MigrationKind::Up,
    }
}

/// Migration 57: `document_embeddings` for RAG (Sequence 12).
///
/// Application-level `chunk_type`: `disc` (DISC profile), `you2` (You 2.0), `tumay` (TUMAY),
/// `fathom` (session notes), `vision` (vision statement), `aha` (aha moment).
pub fn migration_57() -> Migration {
    Migration {
        version: 57,
        description: "create_document_embeddings",
        sql: "CREATE TABLE IF NOT EXISTS document_embeddings (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                chunk_text TEXT NOT NULL,
                chunk_type TEXT NOT NULL,
                embedding TEXT NOT NULL,
                model_used TEXT DEFAULT 'nomic-embed-text',
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (client_id)
                  REFERENCES clients(id)
              );",
        kind: MigrationKind::Up,
    }
}

/// Migration 58: `last_contact_date` on `clients` (backfilled from `updated_at`).
pub fn migration_58() -> Migration {
    Migration {
        version: 58,
        description: "add_last_contact_date_to_clients",
        sql: "ALTER TABLE clients ADD COLUMN last_contact_date TEXT;
              UPDATE clients
                SET last_contact_date = updated_at
                WHERE last_contact_date IS NULL;",
        kind: MigrationKind::Up,
    }
}
