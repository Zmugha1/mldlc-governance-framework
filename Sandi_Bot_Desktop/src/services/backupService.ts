import { invoke } from '@tauri-apps/api/core';
import { getDb } from '@/services/db';

export async function createBackup(): Promise<{ success: boolean; path: string }> {
  const db = await getDb();
  try {
    const result = await invoke<string | { success: boolean; path: string }>('create_backup');
    const path = typeof result === 'string' ? result : result.path;
    const success = typeof result === 'string' ? true : Boolean(result?.success);

    await db.execute(
      `INSERT INTO backup_log (backup_path, success, error_message)
       VALUES (?, ?, ?)`,
      [path || null, success ? 1 : 0, success ? null : 'Backup command returned unsuccessful result']
    );

    return { success, path: path ?? '' };
  } catch (err) {
    const message = String(err ?? 'Unknown backup error');
    console.error('Backup failed:', err);
    await db.execute(
      `INSERT INTO backup_log (backup_path, success, error_message)
       VALUES (?, ?, ?)`,
      [null, 0, message]
    );
    return { success: false, path: '' };
  }
}

export async function getLastBackup(): Promise<{
  backup_count: number;
  last_backup: string | null;
  ever_succeeded: boolean;
}> {
  const db = await getDb();
  const result = await db.select<Array<{
    backup_count: number;
    last_backup: string | null;
    ever_succeeded: number;
  }>>(
    `SELECT COUNT(*) as backup_count,
     MAX(timestamp) as last_backup,
     MAX(success) as ever_succeeded
     FROM backup_log`,
    []
  );
  return {
    backup_count: result[0]?.backup_count ?? 0,
    last_backup: result[0]?.last_backup ?? null,
    ever_succeeded: result[0]?.ever_succeeded === 1,
  };
}
