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

/// Migration 58: backfill `clients.last_contact_date` from `updated_at`.
/// Does not `ADD COLUMN` — `last_contact_date` may already exist from startup safety net / earlier migration.
pub fn migration_58() -> Migration {
    Migration {
        version: 58,
        description: "add_last_contact_date_to_clients",
        sql: "UPDATE clients
                SET last_contact_date = updated_at
                WHERE last_contact_date IS NULL;",
        kind: MigrationKind::Up,
    }
}

/// Migration 59: normalize legacy `clients.inferred_stage` labels to IC / C1–C5 codes.
pub fn migration_59() -> Migration {
    Migration {
        version: 59,
        description: "normalize_inferred_stage_to_pipeline_codes",
        sql: "UPDATE clients
              SET inferred_stage = 'C4'
              WHERE inferred_stage = 'Career 2.0'
                 OR inferred_stage = 'career_2_0'
                 OR inferred_stage = 'career2'
                 OR inferred_stage = 'Initial Validation';
              UPDATE clients
              SET inferred_stage = 'C5'
              WHERE inferred_stage = 'Business Purchase'
                 OR inferred_stage = 'business_purchase'
                 OR inferred_stage = 'Closed'
                 OR inferred_stage = 'closed'
                 OR inferred_stage = 'Continued Validation';
              UPDATE clients
              SET inferred_stage = 'IC'
              WHERE inferred_stage = 'Initial Contact'
                 OR inferred_stage = 'initial_contact';
              UPDATE clients
              SET inferred_stage = 'C1'
              WHERE inferred_stage = 'Seeker Connection'
                 OR inferred_stage = 'seeker_connection'
                 OR inferred_stage = 'Seeker Conn.';
              UPDATE clients
              SET inferred_stage = 'C2'
              WHERE inferred_stage = 'Seeker Clarification'
                 OR inferred_stage = 'seeker_clarification'
                 OR inferred_stage = 'Seeker Clarif.';
              UPDATE clients
              SET inferred_stage = 'C3'
              WHERE inferred_stage = 'Possibilities'
                 OR inferred_stage = 'possibilities';",
        kind: MigrationKind::Up,
    }
}

/// Migration 60: readiness-related client fields, ZOR session flag, franchise JSON,
/// and `user_preferences` onboarding / practice name.
///
/// Each `ALTER` is a separate statement (semicolon-separated). The SQL plugin runs
/// the migration once per DB version; re-apply safety for duplicate columns is handled
/// at the application / startup layer if needed.
pub fn migration_60() -> Migration {
    Migration {
        version: 60,
        description: "readiness_big_overlay_ilwe_zor_franchise_prefs",
        sql: "ALTER TABLE clients ADD COLUMN big_overlay_completed INTEGER DEFAULT 0;
              ALTER TABLE clients ADD COLUMN ilwe_key_motivators TEXT;
              ALTER TABLE clients ADD COLUMN zor_learning_notes TEXT;
              ALTER TABLE clients ADD COLUMN franchise_recommendations TEXT;
              ALTER TABLE coaching_sessions ADD COLUMN is_zor_session INTEGER DEFAULT 0;
              ALTER TABLE user_preferences ADD COLUMN onboarding_complete INTEGER DEFAULT 0;
              ALTER TABLE user_preferences ADD COLUMN practice_name TEXT DEFAULT 'My Practice';",
        kind: MigrationKind::Up,
    }
}

/// Migration 61: legacy `client_stage_log` (v28) lacked pipeline columns; add for stage movement INSERTs.
pub fn migration_61() -> Migration {
    Migration {
        version: 61,
        description: "add_from_stage_to_stage_columns_to_client_stage_log",
        sql: "ALTER TABLE client_stage_log ADD COLUMN from_stage TEXT;
              ALTER TABLE client_stage_log ADD COLUMN to_stage TEXT;
              ALTER TABLE client_stage_log ADD COLUMN moved_by TEXT DEFAULT 'coach';
              ALTER TABLE client_stage_log ADD COLUMN notes TEXT;
              ALTER TABLE client_stage_log ADD COLUMN moved_at TEXT;",
        kind: MigrationKind::Up,
    }
}
