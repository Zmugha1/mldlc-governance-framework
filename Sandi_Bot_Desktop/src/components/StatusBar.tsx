import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDb } from '@/services/db';
import { createBackup, getLastBackup } from '@/services/backupService';

type BackupState = {
  backup_count: number;
  last_backup: string | null;
  ever_succeeded: boolean;
};

function Dot({ color }: { color: 'red' | 'green' | 'amber' | 'gray' }) {
  const map = {
    red: 'bg-red-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    gray: 'bg-slate-400',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[color]}`} />;
}

export default function StatusBar() {
  const [backup, setBackup] = useState<BackupState>({
    backup_count: 0,
    last_backup: null,
    ever_succeeded: false,
  });
  const [clientCount, setClientCount] = useState(0);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');

  const refreshStatus = useCallback(async () => {
    const db = await getDb();
    const [backupInfo, clientResult] = await Promise.all([
      getLastBackup(),
      db.select<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM clients WHERE outcome_bucket != 'inactive'",
        []
      ),
    ]);
    setBackup(backupInfo);
    setClientCount(Number(clientResult[0]?.count ?? 0));

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 1500);
      const res = await fetch('http://localhost:11434', { signal: controller.signal });
      window.clearTimeout(timeout);
      setOllamaOnline(res.ok);
    } catch {
      setOllamaOnline(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus().catch(console.error);
  }, [refreshStatus]);

  const backupUi = useMemo(() => {
    if (!backup.ever_succeeded || !backup.last_backup) {
      return {
        dot: 'red' as const,
        text: 'No backup yet — click to backup now',
      };
    }
    const then = new Date(backup.last_backup).getTime();
    const now = Date.now();
    const daysAgo = Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
    if (daysAgo <= 7) {
      return {
        dot: 'green' as const,
        text: `Last backup: ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`,
      };
    }
    return {
      dot: 'amber' as const,
      text: 'Backup overdue — click to backup now',
    };
  }, [backup.ever_succeeded, backup.last_backup]);

  const handleBackupClick = async () => {
    setBackupRunning(true);
    setBackupMessage('Backing up...');
    const result = await createBackup();
    await refreshStatus();
    setBackupMessage(result.success ? 'Backup complete' : 'Backup failed');
    setBackupRunning(false);
    window.setTimeout(() => setBackupMessage(''), 2000);
  };

  return (
    <div className="h-8 bg-slate-900 text-slate-200 text-xs px-4 flex items-center justify-between border-t border-slate-800">
      <button
        type="button"
        onClick={handleBackupClick}
        disabled={backupRunning}
        className="inline-flex items-center gap-2 hover:text-white transition-colors disabled:opacity-70"
      >
        <Dot color={backupUi.dot} />
        <span>{backupRunning ? 'Backing up...' : backupUi.text}</span>
      </button>

      <div className="inline-flex items-center gap-4">
        <span>{clientCount} clients</span>
        <span className="inline-flex items-center gap-2">
          <Dot color={ollamaOnline ? 'green' : 'gray'} />
          {ollamaOnline ? 'Ollama running' : 'Ollama offline'}
        </span>
        {backupMessage && <span className="text-slate-300">{backupMessage}</span>}
      </div>
    </div>
  );
}
