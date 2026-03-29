import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { 
  LayoutDashboard, 
  Users, 
  GitBranch, 
  MessageSquare, 
  BarChart3, 
  Settings,
  Menu,
  Bot,
  ChevronRight,
  Shield,
  BookOpen
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
import PipelineVisualizer from '@/modules/PipelineVisualizer';
import LiveCoachingAssistant from '@/modules/LiveCoachingAssistant';
import PostCallAnalysis from '@/modules/PostCallAnalysis';
import AdminStreamliner from '@/modules/AdminStreamliner';
import AuditTransparency from '@/modules/AuditTransparency';
import HowToUse from '@/modules/HowToUse';
import { seedKnowledgeBase } from '@/services/knowledgeSeed';
import StatusBar from '@/components/StatusBar';

const REFLECTION_LAST_SHOWN_KEY = 'reflection_last_shown';

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

type ModuleType = 'dashboard' | 'clients' | 'pipeline' | 'coaching' | 'analysis' | 'admin' | 'audit' | 'help';

interface NavItem {
  id: ModuleType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const navItems: NavItem[] = [
  { 
    id: 'dashboard', 
    label: 'Executive Dashboard', 
    icon: LayoutDashboard,
    description: 'KPIs & pipeline performance'
  },
  { 
    id: 'clients', 
    label: 'Client Intelligence', 
    icon: Users,
    description: 'DISC, You 2.0, Vision Statements'
  },
  { 
    id: 'pipeline', 
    label: 'Pipeline Visualizer', 
    icon: GitBranch,
    description: '5-compartment coaching journey'
  },
  { 
    id: 'coaching', 
    label: 'Live Coaching Assistant', 
    icon: MessageSquare,
    description: 'Coach Bot with CLEAR framework'
  },
  { 
    id: 'analysis', 
    label: 'Post-Call Analysis', 
    icon: BarChart3,
    description: 'CLEAR scoring & insights'
  },
  { 
    id: 'admin', 
    label: 'Admin Streamliner', 
    icon: Settings,
    description: 'Activity logs & settings'
  },
  { 
    id: 'audit', 
    label: 'Audit & Transparency', 
    icon: Shield,
    description: 'Source citations & audit logs'
  },
  { 
    id: 'help', 
    label: 'How to Use', 
    icon: BookOpen,
    description: 'Detailed instructions & guide'
  },
];

function Sidebar({ 
  activeModule, 
  onModuleChange 
}: { 
  activeModule: ModuleType; 
  onModuleChange: (module: ModuleType) => void;
}) {
  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Coach Bot</h1>
          <p className="text-xs text-slate-400">Coaching Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onModuleChange(item.id)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-lg px-3 py-3 text-left transition-all",
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 mt-0.5 shrink-0",
                  isActive ? "text-white" : "text-slate-400"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm",
                    isActive && "text-white"
                  )}>
                    {item.label}
                  </p>
                  <p className={cn(
                    "text-xs mt-0.5",
                    isActive ? "text-blue-100" : "text-slate-500"
                  )}>
                    {item.description}
                  </p>
                </div>
                {isActive && (
                  <ChevronRight className="h-4 w-4 mt-1 shrink-0 opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-xs font-bold">
            SS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Sandi Stahl</p>
            <p className="text-xs text-slate-400">Franchise Coach</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileSidebar({ 
  activeModule, 
  onModuleChange 
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
          className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-lg"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <Sidebar activeModule={activeModule} onModuleChange={(module) => {
          onModuleChange(module);
          setOpen(false);
        }} />
      </SheetContent>
    </Sheet>
  );
}

function ModuleHeader({ 
  title, 
  description 
}: { 
  title: string; 
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <p className="text-slate-500 mt-1">{description}</p>
    </div>
  );
}

function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');
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

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return (
          <ErrorBoundary moduleName="Executive Dashboard">
            <ModuleHeader 
              title="Executive Dashboard" 
              description="Real-time KPIs and pipeline performance overview"
            />
            <ExecutiveDashboard />
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
      case 'pipeline':
        return (
          <ErrorBoundary moduleName="Pipeline Visualizer">
            <ModuleHeader 
              title="Pipeline Visualizer" 
              description="5-compartment coaching journey with Pink Flags"
            />
            <PipelineVisualizer />
          </ErrorBoundary>
        );
      case 'coaching':
        return (
          <ErrorBoundary moduleName="Live Coaching Assistant">
            <ModuleHeader 
              title="Live Coaching Assistant" 
              description="Coach Bot with CLEAR framework and source citations"
            />
            <LiveCoachingAssistant />
          </ErrorBoundary>
        );
      case 'analysis':
        return (
          <ErrorBoundary moduleName="Post-Call Analysis">
            <ModuleHeader 
              title="Post-Call Analysis" 
              description="CLEAR scoring methodology and coaching effectiveness"
            />
            <PostCallAnalysis />
          </ErrorBoundary>
        );
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
    <div className="min-h-screen bg-slate-50 flex">
      {reflectionOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reflection-title"
        >
          <div
            className="box-border w-full max-w-[420px] bg-white shadow-lg"
            style={{ width: 420, maxWidth: '100%', borderRadius: 12, padding: '28px 32px' }}
          >
            <h2
              id="reflection-title"
              className="text-base font-bold text-slate-900"
            >
              Quick Reflection
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              30 seconds — helps Coach Bot learn what&apos;s working
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reflection-worked" className="text-sm font-medium text-slate-800">
                  What worked well today?
                </Label>
                <Textarea
                  id="reflection-worked"
                  rows={2}
                  value={reflectionWorked}
                  onChange={(e) => setReflectionWorked(e.target.value)}
                  placeholder={
                    'A client conversation, a coaching moment, something that felt right...'
                  }
                  className="resize-y"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reflection-hard" className="text-sm font-medium text-slate-800">
                  What felt hard or missing?
                </Label>
                <Textarea
                  id="reflection-hard"
                  rows={2}
                  value={reflectionHard}
                  onChange={(e) => setReflectionHard(e.target.value)}
                  placeholder={
                    'Something confusing, a feature you wished existed, something that slowed you down...'
                  }
                  className="resize-y"
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
                className="text-sm text-slate-600 underline-offset-4 hover:underline disabled:opacity-50"
              >
                Skip for today
              </button>
              <Button
                type="button"
                onClick={() => void handleReflectionSave()}
                disabled={reflectionSaving}
              >
                {reflectionSaving ? 'Saving…' : 'Save Reflection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 shrink-0">
        <div className="fixed inset-y-0 left-0 w-72">
          <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      {/* Main Content */}
      <div className="flex-1 min-w-0 min-h-screen flex flex-col">
        <main className="flex-1">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {renderModule()}
          </div>
        </main>
        <StatusBar />
      </div>
    </div>
  );
}

export default App;
