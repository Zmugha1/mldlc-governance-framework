import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useContext,
  createContext,
} from 'react';
import { flushSync } from 'react-dom';
import {
  Sun,
  Target,
  Users,
  Zap,
  BarChart2,
  Menu,
  Bot,
  Shield,
  HelpCircle,
  Layers,
  Activity,
} from 'lucide-react';
import { invoke, Channel } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { dbExecute, getDb } from '@/services/db';
import { createBackup, getLastBackup } from '@/services/backupService';

// Module Components
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ExecutiveDashboard from '@/modules/ExecutiveDashboard';
import ClientIntelligence from '@/modules/ClientIntelligence';
import BusinessGoals from './modules/BusinessGoals';
import CoachingActions from './modules/CoachingActions';
import MyPractice from './modules/MyPractice';
import AdminStreamliner from '@/modules/AdminStreamliner';
import AuditTransparency from '@/modules/AuditTransparency';
import HowToUse from '@/modules/HowToUse';
import SystemHealth from '@/modules/SystemHealth';
import { seedKnowledgeBase } from '@/services/knowledgeSeed';
import { registerGmailTool } from './services/gmailTool';
import { registerCalendarTool } from './services/calendarTool';
import { isGoogleConnected } from './services/googleAuthService';

const REFLECTION_LAST_SHOWN_KEY = 'reflection_last_shown';

export type GoogleContextValue = {
  googleConnected: boolean;
  setGoogleConnected: (v: boolean) => void;
};

export const GoogleContext = createContext<GoogleContextValue>({
  googleConnected: false,
  setGoogleConnected: () => {},
});

const brandRootStyle = {
  '--color-navy': '#2D4459',
  '--color-teal': '#3BBFBF',
  '--color-teal-light': '#C8E8E5',
  '--color-coral': '#F05F57',
  '--color-coral-light': '#E8A99A',
  '--color-burnt': '#C8613F',
  '--color-slate': '#7A8F95',
  '--color-offwhite': '#FEFAF5',
  '--color-lightgray': '#F4F7F8',
  '--color-border': '#C8E8E5',
  '--color-white': '#ffffff',
} as React.CSSProperties;

function localCalendarDateYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hasShownReflectionToday(): boolean {
  try {
    return localStorage.getItem(REFLECTION_LAST_SHOWN_KEY) === localCalendarDateYyyyMmDd();
  } catch {
    return false;
  }
}

function markReflectionShownToday(): void {
  try {
    localStorage.setItem(REFLECTION_LAST_SHOWN_KEY, localCalendarDateYyyyMmDd());
  } catch {
    /* ignore */
  }
}

/** Tauri SQL may return a single row object instead of an array. */
function normalizeSqlRows<T>(rows: T | T[] | null | undefined): T[] {
  if (rows == null) return [];
  return Array.isArray(rows) ? rows : [rows];
}

type ModuleType =
  | 'morning'
  | 'business'
  | 'clients'
  | 'coaching'
  | 'practice'
  | 'systemhealth'
  | 'admin'
  | 'audit'
  | 'help';

interface MainNavItem {
  id: ModuleType;
  label: string;
  icon: React.ElementType;
}

const mainNavItems: MainNavItem[] = [
  { id: 'morning', label: 'Morning Brief', icon: Sun },
  { id: 'business', label: 'Business Goals', icon: Target },
  { id: 'clients', label: 'Client Intelligence', icon: Users },
  { id: 'coaching', label: 'Coaching Actions', icon: Zap },
  { id: 'practice', label: 'My Practice', icon: BarChart2 },
  { id: 'systemhealth', label: 'System Health', icon: Activity },
];

const footerNavItems: Array<{
  id: Extract<ModuleType, 'admin' | 'help' | 'audit'>;
  icon: React.ElementType;
  ariaLabel: string;
}> = [
  { id: 'admin', icon: Layers, ariaLabel: 'The Capture' },
  { id: 'help', icon: HelpCircle, ariaLabel: 'Help' },
  { id: 'audit', icon: Shield, ariaLabel: 'Audit and transparency' },
];

type AIStatus = 'offline' | 'starting' | 'ready';

async function pingOllamaGenerate(): Promise<boolean> {
  try {
    await invoke<string>('ollama_generate', {
      prompt: 'ping',
      system: ' ',
      model: 'qwen2.5:7b',
    });
    return true;
  } catch {
    return false;
  }
}

async function trySpawnOllamaServe(): Promise<void> {
  const onEvent = new Channel();
  onEvent.onmessage = () => {};
  await invoke<number>('plugin:shell|spawn', {
    program: 'ollama',
    args: ['serve'],
    options: {},
    onEvent,
  });
}

function Sidebar({
  activeModule,
  onModuleChange,
}: {
  activeModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
}) {
  const { googleConnected } = useContext(GoogleContext);
  const [aiStatus, setAiStatus] = useState<AIStatus>('offline');
  const aiPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAiPollers = useCallback(() => {
    if (aiPollRef.current != null) {
      clearInterval(aiPollRef.current);
      aiPollRef.current = null;
    }
    if (aiTimeoutRef.current != null) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await pingOllamaGenerate();
      if (!cancelled) {
        setAiStatus(ok ? 'ready' : 'offline');
      }
    })();
    return () => {
      cancelled = true;
      clearAiPollers();
    };
  }, [clearAiPollers]);

  const handleStartAiEngine = useCallback(() => {
    setAiStatus('starting');
    clearAiPollers();
    void (async () => {
      try {
        await trySpawnOllamaServe();
      } catch (e) {
        console.error('spawn ollama serve:', e);
      }

      const alreadyUp = await pingOllamaGenerate();
      if (alreadyUp) {
        setAiStatus('ready');
        toast.success('AI is ready');
        return;
      }

      aiPollRef.current = setInterval(() => {
        void (async () => {
          const ok = await pingOllamaGenerate();
          if (ok) {
            clearAiPollers();
            setAiStatus('ready');
            toast.success('AI is ready');
          }
        })();
      }, 3000);

      aiTimeoutRef.current = setTimeout(() => {
        clearAiPollers();
        void (async () => {
          const ok = await pingOllamaGenerate();
          if (ok) {
            setAiStatus('ready');
            toast.success('AI is ready');
          } else {
            setAiStatus('offline');
            toast.error('Could not start AI. Please start Ollama manually.');
          }
        })();
      }, 30000);
    })();
  }, [clearAiPollers]);

  return (
    <div
      className="flex h-full flex-col text-white"
      style={{ backgroundColor: '#2D4459' }}
    >
      <div
        className="flex items-center gap-3 p-6"
        style={{ borderBottom: '1px solid rgba(200, 232, 229, 0.15)' }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: '#3BBFBF' }}
        >
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold leading-tight text-white" style={{ fontSize: 16 }}>
            Coach Bot
          </h1>
          <p
            className="mt-0.5 leading-tight"
            style={{ fontSize: 10, color: 'rgba(200, 232, 229, 0.6)' }}
          >
            Your practice. Compounding.
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-auto p-4">
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModuleChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  isActive
                    ? 'text-[#3BBFBF]'
                    : 'text-[#7A8F95] hover:bg-[rgba(200,232,229,0.1)]'
                )}
                style={
                  isActive
                    ? {
                        borderLeft: '3px solid #3BBFBF',
                        marginLeft: 0,
                        paddingLeft: 'calc(0.75rem - 3px)',
                      }
                    : { borderLeft: '3px solid transparent' }
                }
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        className="flex items-center justify-center gap-1 px-4 py-3"
        style={{ borderTop: '1px solid rgba(200, 232, 229, 0.15)' }}
      >
        {footerNavItems.map(({ id, icon: Icon, ariaLabel }) => {
          const isActive = activeModule === id;
          return (
            <button
              key={id}
              type="button"
              aria-label={ariaLabel}
              onClick={() => onModuleChange(id)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                isActive
                  ? 'text-[#3BBFBF]'
                  : 'text-[#7A8F95] hover:bg-[rgba(200,232,229,0.1)]'
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </button>
          );
        })}
      </div>

      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          margin: '8px 0',
        }}
        aria-hidden
      />

      <div className="px-3 pb-2">
        {aiStatus === 'offline' ? (
          <>
            <p className="text-center" style={{ color: '#7A8F95', fontSize: 12 }}>
              ⚪ AI Offline
            </p>
            <div style={{ margin: '8px 12px' }}>
              <button
                type="button"
                className="w-full font-bold text-white transition-opacity hover:opacity-90"
                style={{
                  background: '#F05F57',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 12,
                  border: 'none',
                }}
                onClick={handleStartAiEngine}
              >
                Start AI Engine
              </button>
            </div>
          </>
        ) : null}
        {aiStatus === 'starting' ? (
          <p
            className="text-center font-medium"
            style={{ color: '#F05F57', fontSize: 12 }}
          >
            🔄 Starting AI...
          </p>
        ) : null}
        {aiStatus === 'ready' ? (
          <p className="text-center font-bold" style={{ color: '#3BBFBF', fontSize: 12 }}>
            🟢 AI Ready
          </p>
        ) : null}
        {googleConnected ? (
          <p
            className="mt-1 text-center"
            style={{ color: '#3BBFBF', fontSize: 11 }}
          >
            🔗 Google Connected
          </p>
        ) : null}
      </div>

      <div
        className="p-4"
        style={{ borderTop: '1px solid rgba(200, 232, 229, 0.15)' }}
      >
        <div
          className="flex items-center gap-3 rounded-lg px-3 py-2"
          style={{ backgroundColor: 'rgba(200, 232, 229, 0.08)' }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #F05F57, #C8613F)' }}
          >
            SS
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">Sandi Stahl</p>
            <p className="truncate text-xs" style={{ color: '#7A8F95' }}>
              Franchise Coach
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type FooterBackupState = {
  backup_count: number;
  last_backup: string | null;
  ever_succeeded: boolean;
};

function FooterDot({ color }: { color: 'red' | 'green' | 'amber' | 'gray' }) {
  const map = {
    red: 'bg-red-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    gray: 'bg-slate-400',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[color]}`} />;
}

/** Bottom bar: backup + client count only (AI status lives in Sidebar only). */
function AppFooterStatusBar() {
  const [backup, setBackup] = useState<FooterBackupState>({
    backup_count: 0,
    last_backup: null,
    ever_succeeded: false,
  });
  const [clientCount, setClientCount] = useState(0);
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
      text: `Last backup: ${daysAgo} days ago`,
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
    <>
      <div className="h-8 bg-slate-900 text-slate-200 text-xs px-4 flex items-center justify-between border-t border-slate-800">
        <button
          type="button"
          onClick={handleBackupClick}
          disabled={backupRunning}
          className="inline-flex items-center gap-2 hover:text-white transition-colors disabled:opacity-70"
        >
          <FooterDot color={backupUi.dot} />
          <span>{backupRunning ? 'Backing up...' : backupUi.text}</span>
        </button>

        <div className="inline-flex items-center gap-4">
          <span>{clientCount} clients</span>
          {backupMessage ? (
            <span className="text-slate-300">{backupMessage}</span>
          ) : null}
        </div>
      </div>
    </>
  );
}

function MobileSidebar({
  activeModule,
  onModuleChange,
}: {
  activeModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-4 z-50 shadow-lg lg:hidden"
          style={{ backgroundColor: '#ffffff', border: '1px solid #C8E8E5' }}
        >
          <Menu className="h-5 w-5" style={{ color: '#2D4459' }} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <Sidebar
          activeModule={activeModule}
          onModuleChange={(module) => {
            onModuleChange(module);
            setOpen(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function ModuleHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold" style={{ color: '#2D4459' }}>
        {title}
      </h2>
      <p className="mt-1" style={{ color: '#7A8F95' }}>
        {description}
      </p>
    </div>
  );
}

function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>('morning');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionWorked, setReflectionWorked] = useState('');
  const [reflectionHard, setReflectionHard] = useState('');
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [reflectionSaveError, setReflectionSaveError] = useState<string | null>(null);

  const reflectionOpenRef = useRef(false);
  const activeSecondsRef = useRef(0);

  useEffect(() => {
    reflectionOpenRef.current = reflectionOpen;
  }, [reflectionOpen]);

  const tryOpenReflection = useCallback(() => {
    if (hasShownReflectionToday()) return;
    if (reflectionOpenRef.current) return;
    setReflectionOpen(true);
  }, []);

  useEffect(() => {
    seedKnowledgeBase().catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;
    registerGmailTool();
    registerCalendarTool();
    console.log('Tools registered: Gmail, Google Calendar');

    const refreshGoogle = async () => {
      try {
        const connected = await isGoogleConnected();
        if (!cancelled) setGoogleConnected(connected);
      } catch {
        if (!cancelled) setGoogleConnected(false);
      }
    };

    void refreshGoogle();
    const pollId = window.setInterval(() => {
      void refreshGoogle();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const db = await getDb();
        await db.execute(`
          CREATE TABLE IF NOT EXISTS app_preferences (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          )
        `);
        const today = localCalendarDateYyyyMmDd();
        const raw = await db.select<{ value: string | null }>(
          `SELECT value FROM app_preferences WHERE key = 'last_auto_backup_date'`,
          []
        );
        const rows = normalizeSqlRows(raw);
        const last = rows[0]?.value?.trim() ?? null;
        if (last === today) return;

        const result = await createBackup();
        if (cancelled) return;
        if (!result.success) {
          console.error('Auto-backup failed');
          return;
        }

        try {
          await dbExecute(
            `INSERT INTO app_preferences (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            ['last_auto_backup_date', today]
          );
        } catch (persistErr) {
          console.error('Auto-backup preference save failed:', persistErr);
          return;
        }

        toast.custom(
          () => (
            <div
              className="rounded-md px-3 py-2 shadow-md"
              style={{
                background: '#F4F7F8',
                borderLeft: '3px solid #3BBFBF',
                color: '#7A8F95',
                fontSize: 11,
              }}
            >
              ✓ Backed up today
            </div>
          ),
          { duration: 3000, position: 'bottom-left' }
        );
      } catch (e) {
        console.error('Auto-backup check failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const THIRTY_MIN_SEC = 30 * 60;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      activeSecondsRef.current += 1;
      if (activeSecondsRef.current >= THIRTY_MIN_SEC) {
        window.clearInterval(id);
        tryOpenReflection();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [tryOpenReflection]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasShownReflectionToday()) return;
      if (reflectionOpenRef.current) return;
      e.preventDefault();
      e.returnValue = '';
      flushSync(() => {
        setReflectionOpen(true);
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const closeReflectionModal = useCallback(() => {
    setReflectionOpen(false);
    setReflectionWorked('');
    setReflectionHard('');
    setReflectionSaveError(null);
  }, []);

  const handleReflectionSkip = useCallback(() => {
    markReflectionShownToday();
    closeReflectionModal();
  }, [closeReflectionModal]);

  const handleReflectionSave = useCallback(async () => {
    setReflectionSaving(true);
    setReflectionSaveError(null);
    try {
      const id = crypto.randomUUID();
      const sessionDate = localCalendarDateYyyyMmDd();
      const createdAt = new Date().toISOString();
      const w = reflectionWorked.trim();
      const h = reflectionHard.trim();
      const feedbackText = `WORKED: ${w} | HARD: ${h}`;
      await dbExecute(
        `INSERT INTO user_feedback
         (id, page_name, feedback_type, rating, feedback_text, feature_name, thumbs_up, session_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          'daily_reflection',
          'daily_reflection',
          null,
          feedbackText,
          null,
          null,
          sessionDate,
          createdAt,
        ]
      );
      markReflectionShownToday();
      closeReflectionModal();
    } catch (err) {
      console.error('daily reflection insert failed:', err);
      setReflectionSaveError('Could not save reflection');
    } finally {
      setReflectionSaving(false);
    }
  }, [reflectionWorked, reflectionHard, closeReflectionModal]);

  const renderModule = () => {
    switch (activeModule) {
      case 'morning':
        return (
          <ErrorBoundary moduleName="Morning Brief">
            <ModuleHeader
              title="Morning Brief"
              description="Real-time KPIs and pipeline performance overview"
            />
            <ExecutiveDashboard />
          </ErrorBoundary>
        );
      case 'business':
        return (
          <ErrorBoundary moduleName="Business Goals">
            <BusinessGoals />
          </ErrorBoundary>
        );
      case 'clients':
        return (
          <ErrorBoundary moduleName="Client Intelligence">
            <ModuleHeader
              title="Client Intelligence"
              description="DISC profiles, You 2.0, Vision Statements, and TUMAY data"
            />
            <ClientIntelligence />
          </ErrorBoundary>
        );
      case 'coaching':
        return (
          <ErrorBoundary moduleName="Coaching Actions">
            <CoachingActions />
          </ErrorBoundary>
        );
      case 'practice':
        return (
          <ErrorBoundary moduleName="My Practice">
            <MyPractice />
          </ErrorBoundary>
        );
      case 'systemhealth':
        return (
          <ErrorBoundary moduleName="System Health">
            <SystemHealth
              onNavigateToCaptureUat={() => {
                setActiveModule('admin');
                window.setTimeout(() => {
                  const list = document.querySelector('[data-slot="tabs-list"].mb-4');
                  const triggers = list?.querySelectorAll('[data-slot="tabs-trigger"]');
                  triggers?.forEach((el) => {
                    if (el.textContent?.includes('Feedback')) {
                      (el as HTMLButtonElement).click();
                    }
                  });
                }, 600);
              }}
            />
          </ErrorBoundary>
        );
      case 'admin':
        return (
          <ErrorBoundary moduleName="The Capture">
            <AdminStreamliner />
          </ErrorBoundary>
        );
      case 'audit':
        return (
          <ErrorBoundary moduleName="Audit & Transparency">
            <ModuleHeader
              title="Audit & Transparency"
              description="Source citations, audit logs, and transparency metrics"
            />
            <AuditTransparency />
          </ErrorBoundary>
        );
      case 'help':
        return (
          <ErrorBoundary moduleName="How to Use This Dashboard">
            <ModuleHeader
              title="How to Use This Dashboard"
              description="Complete guide to all features and best practices"
            />
            <HowToUse />
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <GoogleContext.Provider
      value={{ googleConnected, setGoogleConnected }}
    >
    <div className="flex min-h-screen" style={brandRootStyle}>
      <Toaster richColors closeButton position="top-center" />
      {reflectionOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reflection-title"
        >
          <div
            className="box-border w-full max-w-[420px] bg-white shadow-lg"
            style={{
              width: 420,
              maxWidth: '100%',
              borderRadius: 12,
              padding: '28px 32px',
              border: '1px solid #C8E8E5',
            }}
          >
            <h2
              id="reflection-title"
              className="text-base font-bold"
              style={{ color: '#2D4459' }}
            >
              Quick Reflection
            </h2>
            <p className="mt-1 text-xs" style={{ color: '#7A8F95' }}>
              30 seconds — helps Coach Bot learn what&apos;s working
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="reflection-worked"
                  className="text-sm font-medium"
                  style={{ color: '#2D4459' }}
                >
                  What worked well today?
                </Label>
                <Textarea
                  id="reflection-worked"
                  rows={2}
                  value={reflectionWorked}
                  onChange={(e) => setReflectionWorked(e.target.value)}
                  placeholder="A client conversation, a coaching moment, something that felt right..."
                  className="resize-y border-[#C8E8E5]"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="reflection-hard"
                  className="text-sm font-medium"
                  style={{ color: '#2D4459' }}
                >
                  What felt hard or missing?
                </Label>
                <Textarea
                  id="reflection-hard"
                  rows={2}
                  value={reflectionHard}
                  onChange={(e) => setReflectionHard(e.target.value)}
                  placeholder="Something confusing, a feature you wished existed, something that slowed you down..."
                  className="resize-y border-[#C8E8E5]"
                />
              </div>
            </div>

            {reflectionSaveError && (
              <p className="mt-3 text-sm text-red-600">{reflectionSaveError}</p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleReflectionSkip}
                disabled={reflectionSaving}
                className="text-sm underline-offset-4 hover:underline disabled:opacity-50"
                style={{ color: '#7A8F95' }}
              >
                Skip for today
              </button>
              <Button
                type="button"
                onClick={() => void handleReflectionSave()}
                disabled={reflectionSaving}
                style={{ backgroundColor: '#3BBFBF' }}
                className="text-white hover:opacity-90"
              >
                {reflectionSaving ? 'Saving…' : 'Save Reflection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden w-72 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-72">
          <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
        </div>
      </div>

      <MobileSidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <div
        className="flex min-h-screen min-w-0 flex-1 flex-col"
        style={{ backgroundColor: '#FEFAF5' }}
      >
        <main className="flex-1">
          <div className="mx-auto max-w-7xl p-4 lg:p-8">{renderModule()}</div>
        </main>
        <AppFooterStatusBar />
      </div>
    </div>
    </GoogleContext.Provider>
  );
}

export default App;
