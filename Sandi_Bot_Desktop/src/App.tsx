import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import {
  Sun,
  Target,
  Users,
  Zap,
  BarChart2,
  Settings,
  Menu,
  Bot,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { dbExecute } from '@/services/db';

// Module Components
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ExecutiveDashboard from '@/modules/ExecutiveDashboard';
import ClientIntelligence from '@/modules/ClientIntelligence';
import AdminStreamliner from '@/modules/AdminStreamliner';
import AuditTransparency from '@/modules/AuditTransparency';
import HowToUse from '@/modules/HowToUse';
import { seedKnowledgeBase } from '@/services/knowledgeSeed';
import StatusBar from '@/components/StatusBar';

const REFLECTION_LAST_SHOWN_KEY = 'reflection_last_shown';

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

type ModuleType =
  | 'morning'
  | 'business'
  | 'clients'
  | 'coaching'
  | 'practice'
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
];

const footerNavItems: Array<{
  id: Extract<ModuleType, 'admin' | 'help' | 'audit'>;
  icon: React.ElementType;
  ariaLabel: string;
}> = [
  { id: 'admin', icon: Settings, ariaLabel: 'Settings' },
  { id: 'help', icon: HelpCircle, ariaLabel: 'Help' },
  { id: 'audit', icon: Shield, ariaLabel: 'Audit and transparency' },
];

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div
      className="rounded-[12px] border border-[#C8E8E5] bg-white p-6 shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: '#3BBFBF' }}
    >
      <h2 className="text-xl font-semibold mb-2" style={{ color: '#2D4459' }}>
        {title}
      </h2>
      <p className="text-[#7A8F95]">Coming in this build.</p>
    </div>
  );
}

function Sidebar({
  activeModule,
  onModuleChange,
}: {
  activeModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
}) {
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
        return <PlaceholderPage title="Business Goals" />;
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
        return <PlaceholderPage title="Coaching Actions" />;
      case 'practice':
        return <PlaceholderPage title="My Practice" />;
      case 'admin':
        return (
          <ErrorBoundary moduleName="Admin Streamliner">
            <ModuleHeader
              title="Admin Streamliner"
              description="Activity logs, system settings, and data management"
            />
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
    <div className="flex min-h-screen" style={brandRootStyle}>
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
        <StatusBar />
      </div>
    </div>
  );
}

export default App;
