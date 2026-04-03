import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDb } from '@/services/db';
import { createBackup, getLastBackup } from '@/services/backupService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const [ollamaHelpOpen, setOllamaHelpOpen] = useState(false);
  const [ollamaModalChecking, setOllamaModalChecking] = useState(false);

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

  const showBackupOverdueBanner = backupUi.dot === 'amber';

  const handleOllamaModalRefresh = useCallback(async () => {
    setOllamaModalChecking(true);
    try {
      await refreshStatus();
    } finally {
      setOllamaModalChecking(false);
    }
  }, [refreshStatus]);

  const handleBackupClick = async () => {
    setBackupRunning(true);
    setBackupMessage('Backing up...');
    const result = await createBackup();
    await refreshStatus();
    setBackupMessage(result.success ? 'Backup complete' : 'Backup failed');
    setBackupRunning(false);
    window.setTimeout(() => setBackupMessage(''), 2000);
  };

  const ollamaOfflineTooltip =
    "Ollama is not running.\nTo start: open a terminal and type\n'ollama serve'\nThen restart Coach Bot.";

  return (
    <>
      {showBackupOverdueBanner ? (
        <button
          type="button"
          onClick={handleBackupClick}
          disabled={backupRunning}
          className="flex w-full items-center px-4 py-2.5 text-left transition-opacity disabled:opacity-70"
          style={{
            background: '#F4F7F8',
            border: '1px solid #C8E8E5',
            borderLeft: '4px solid #3BBFBF',
            color: '#7A8F95',
            fontSize: 12,
          }}
        >
          {backupRunning ? 'Backing up...' : 'Backup overdue — click to backup now'}
        </button>
      ) : null}
      <div className="h-8 bg-slate-900 text-slate-200 text-xs px-4 flex items-center justify-between border-t border-slate-800">
      <Dialog open={ollamaHelpOpen} onOpenChange={setOllamaHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>AI is Offline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Coach Bot uses a local AI model called Ollama to generate insights.
            </p>
            <div>
              <p className="font-medium text-slate-800">To turn it on:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Open PowerShell or Terminal</li>
                <li>Type: ollama serve</li>
                <li>Press Enter</li>
                <li>Wait 10 seconds</li>
                <li>Click Refresh below</li>
              </ol>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={ollamaModalChecking}
              onClick={() => void handleOllamaModalRefresh()}
            >
              {ollamaModalChecking ? 'Checking…' : 'Refresh Status'}
            </Button>
            <button
              type="button"
              className="text-left text-sm text-slate-500 underline underline-offset-2 hover:text-slate-800"
              onClick={() => setOllamaHelpOpen(false)}
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {!showBackupOverdueBanner ? (
        <button
          type="button"
          onClick={handleBackupClick}
          disabled={backupRunning}
          className="inline-flex items-center gap-2 hover:text-white transition-colors disabled:opacity-70"
        >
          <Dot color={backupUi.dot} />
          <span>{backupRunning ? 'Backing up...' : backupUi.text}</span>
        </button>
      ) : (
        <div className="min-w-0 flex-1" aria-hidden />
      )}

      <div className="inline-flex items-center gap-4">
        <span>{clientCount} clients</span>
        {ollamaOnline ? (
          <span className="inline-flex items-center gap-2">
            <Dot color="green" />
            AI Ready
          </span>
        ) : (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setOllamaHelpOpen(true)}
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Dot color="red" />
                  AI Offline
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs border-slate-700 bg-slate-800 text-slate-100 text-xs"
              >
                <p className="whitespace-pre-line">{ollamaOfflineTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {backupMessage && <span className="text-slate-300">{backupMessage}</span>}
      </div>
    </div>
    </>
  );
}
