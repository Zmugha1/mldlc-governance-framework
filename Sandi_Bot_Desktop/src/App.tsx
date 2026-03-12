import { useState } from 'react';
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
import { cn } from '@/lib/utils';

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
    description: 'Sandi Bot with CLEAR framework'
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
          <h1 className="font-bold text-lg leading-tight">Sandi Bot</h1>
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
            <p className="text-sm font-medium text-white">Sandy Stahl</p>
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
              description="Sandi Bot with CLEAR framework and source citations"
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
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 shrink-0">
        <div className="fixed inset-y-0 left-0 w-72">
          <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {renderModule()}
        </div>
      </main>
    </div>
  );
}

export default App;
