import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

/** Runs after `Database.load` (Rust migrations). Safety net if a migration was skipped. */
async function runStartupSchemaSafetyNet(db: Database): Promise<void> {
  await db.execute(`
  CREATE TABLE IF NOT EXISTS client_stage_log (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    moved_at TEXT DEFAULT (datetime('now')),
    moved_by TEXT DEFAULT 'sandi',
    notes TEXT
  )
`);

  await db.execute(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    install_date TEXT,
    coach_name TEXT DEFAULT 'Sandi',
    coach_hourly_rate INTEGER DEFAULT 150,
    weekly_hours_saved REAL DEFAULT 2.0,
    timezone TEXT DEFAULT 'America/Chicago',
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

  await db.execute(`
  INSERT OR IGNORE INTO user_preferences
    (id, install_date)
    VALUES ('singleton', date('now'))
`);

  await db.execute(`
  CREATE TABLE IF NOT EXISTS document_embeddings (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_type TEXT NOT NULL,
    embedding TEXT NOT NULL,
    model_used TEXT DEFAULT 'nomic-embed-text',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

  try {
    await db.execute(`
    ALTER TABLE clients
    ADD COLUMN last_contact_date TEXT
  `);
  } catch (e) {
    // column already exists, ignore
  }
}

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    const db = await Database.load('sqlite:sandi_bot.db');
    await runStartupSchemaSafetyNet(db);
    dbInstance = db;
  }
  return dbInstance;
}

export async function dbSelect<T>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = await getDb();
  // tauri-plugin-sql returns an array of row objects; cast keeps row type T per caller.
  return (await db.select(query, params)) as T[];
}

export async function dbExecute(
  query: string,
  params: unknown[] = []
): Promise<{ rowsAffected: number; lastInsertId: number }> {
  const db = await getDb();
  const result = await db.execute(query, params);
  return {
    rowsAffected: result.rowsAffected,
    lastInsertId: result.lastInsertId ?? 0,
  };
}
