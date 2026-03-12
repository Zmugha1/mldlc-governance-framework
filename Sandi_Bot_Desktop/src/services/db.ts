import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:sandi_bot.db');
  }
  return dbInstance;
}

export async function dbSelect<T>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(query, params);
}

export async function dbExecute(
  query: string,
  params: unknown[] = []
): Promise<{ rowsAffected: number; lastInsertId: number }> {
  const db = await getDb();
  return db.execute(query, params);
}
