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
