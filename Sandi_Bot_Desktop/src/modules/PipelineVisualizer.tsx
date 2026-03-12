import { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { stageConfig, discColors, knowledgeGraph } from '@/data/sampleClients';
import { getAllClients } from '@/services/clientService';
import { clientToDisplay } from '@/services/clientAdapter';
import type { Client } from '@/types';
import { cn } from '@/lib/utils';

// Pink Flag Alert Component
function PinkFlagAlert({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  
  return (
    <div className="mt-3 p-3 rounded-lg bg-pink-50 border border-pink-200">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-pink-600" />
        <span className="text-sm font-semibold text-pink-800">Pink Flags</span>
      </div>
      <ul className="space-y-1">
        {flags.map((flag, i) => (
          <li key={i} className="text-xs text-pink-700 flex items-start gap-2">
            <span className="text-pink-500 mt-0.5">•</span>
            {flag}
          </li>
        ))}
      </ul>
    </div>
  );
}

type DisplayClient = ReturnType<typeof clientToDisplay>;

// Stage Column Component
function StageColumn({ 
  stage, 
  clients, 
  isActive,
  onClick,
  stats
}: { 
  stage: string; 
  clients: DisplayClient[];
  isActive: boolean;
  onClick: () => void;
  stats?: { avgDaysInStage: number; conversionRate: number };
}) {
  const config = stageConfig[stage as keyof typeof stageConfig];
  const pinkFlags = knowledgeGraph.clientExperience.stages.find(s => s.name === stage)?.pinkFlags || [];

  return (
    <div 
      className={cn(
        "flex flex-col rounded-xl border-2 transition-all cursor-pointer min-w-[220px]",
        isActive 
          ? "border-blue-500 bg-blue-50/50 shadow-lg" 
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
      onClick={onClick}
    >
      {/* Stage Header */}
      <div 
        className="p-4 rounded-t-xl"
        style={{ backgroundColor: config.color }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            {config.compartment}
          </span>
          <span className="text-lg font-bold text-slate-800">
            {clients.length}
          </span>
        </div>
        <h4 className="font-semibold text-slate-900">{config.label}</h4>
        <p className="text-xs text-slate-600 mt-1">{config.description}</p>
      </div>

      {/* Clients in Stage */}
      <div className="flex-1 p-3 space-y-2 min-h-[200px] max-h-[400px] overflow-auto">
        {clients.map((client) => (
          <div 
            key={client.id}
            className="p-3 rounded-lg bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: discColors[client.disc.style] }}
              >
                {client.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{client.name}</p>
                <p className="text-xs text-slate-500 truncate">{client.tumay.industriesOfInterest[0]}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {client.persona}
              </Badge>
              <span className={cn(
                "text-xs font-medium",
                client.confidence >= 80 ? "text-green-600" : 
                client.confidence >= 60 ? "text-yellow-600" : "text-red-600"
              )}>
                {client.confidence}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Stage Stats */}
      <div className="p-3 border-t border-slate-100 rounded-b-xl bg-slate-50/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Avg: {stats?.avgDaysInStage ?? 0} days</span>
          <span className="text-slate-500">Convert: {stats?.conversionRate ?? 0}%</span>
        </div>
        <PinkFlagAlert flags={pinkFlags} />
      </div>
    </div>
  );
}

const STAGES = ['Initial Contact', 'Seeker Connection', 'Seeker Clarification', 'Possibilities', 'Client Career 2.0', 'Business Purchase'];

// Conversion Funnel Component
function ConversionFunnel({ clients }: { clients: Client[] }) {
  const funnelData = useMemo(() => {
    return STAGES.map(stage => {
      const count = clients.filter(c => c.stage === stage).length;
      const config = stageConfig[stage as keyof typeof stageConfig];
      return {
        stage: config?.label ?? stage,
        count,
        color: config?.color ?? '#94A3B8'
      };
    });
  }, [clients]);

  return (
    <div className="space-y-3">
      {funnelData.map((item, index) => {
        const maxCount = Math.max(...funnelData.map(d => d.count), 5);
        const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        
        return (
          <div key={index} className="flex items-center gap-4">
            <span className="text-sm text-slate-600 w-36 shrink-0">{item.stage}</span>
            <div className="flex-1">
              <div 
                className="h-8 rounded-lg flex items-center justify-end pr-3 transition-all"
                style={{ 
                  width: `${Math.max(width, 15)}%`,
                  backgroundColor: item.color,
                  minWidth: '60px'
                }}
              >
                <span className="text-slate-800 font-bold text-sm">{item.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PipelineVisualizer() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllClients()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Group clients by stage (display format for StageColumn)
  const clientsByStage = useMemo(() => {
    return STAGES.map(stage => ({
      stage,
      clients: clients
        .filter(c => c.stage === stage)
        .map(clientToDisplay),
      stats: { avgDaysInStage: 0, conversionRate: 0 }
    }));
  }, [clients]);

  // Pipeline flow data from real clients
  const flowData = useMemo(() => {
    return STAGES.map(stage => {
      const count = clients.filter(c => c.stage === stage).length;
      const config = stageConfig[stage as keyof typeof stageConfig];
      return {
        name: config?.label ?? stage,
        clients: count,
        conversion: 0
      };
    });
  }, [clients]);

  const totalClients = clients.length;
  const convertedCount = clients.filter(c => c.outcome === 'CONVERTED').length;
  const conversionRate = totalClients > 0 ? Math.round((convertedCount / totalClients) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500">Loading pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClients}</p>
                <p className="text-xs text-slate-500">Total Seekers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-slate-500">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-slate-500">Avg. Days/Stage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pink-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-slate-500">Pink Flags</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Experience Journey */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5-Compartment Client Experience Journey</CardTitle>
          <CardDescription>Based on TES Coaching Experience Framework</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {knowledgeGraph.clientExperience.stages.map((stage) => {
              const compartmentAbbr = stage.compartment === 'Business Development'
                ? 'BD'
                : stage.compartment.split(' ')[1] || stage.compartment.slice(0, 2);
              return (
              <div key={stage.name} className="p-4 rounded-xl border-2" style={{ borderColor: stage.color, backgroundColor: `${stage.color}40` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: stage.color }}>
                    {compartmentAbbr}
                  </div>
                  <h4 className="font-semibold text-slate-900 min-w-0">{stage.name}</h4>
                </div>
                <p className="text-sm text-slate-600 mb-2">{stage.objective}</p>
                <div className="text-xs text-slate-500">
                  <span className="font-medium">Milestone:</span> {stage.milestone}
                </div>
              </div>
            );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Board */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-500" />
            Pipeline Board
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {clientsByStage.map(({ stage, clients: stageClients, stats }) => (
              <StageColumn
                key={stage}
                stage={stage}
                clients={stageClients}
                isActive={selectedStage === stage}
                onClick={() => setSelectedStage(selectedStage === stage ? null : stage)}
                stats={stats}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionFunnel clients={clients} />
          </CardContent>
        </Card>

        {/* Stage Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stage Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={flowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 9 }}
                  angle={-30}
                  textAnchor="end"
                  height={70}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px'
                  }}
                />
                <Bar yAxisId="left" dataKey="clients" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="conversion" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-600">Clients</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm text-slate-600">Conversion %</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pink Flags Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-pink-500" />
            Pink Flags by Stage
          </CardTitle>
          <CardDescription>Warning signs that indicate coaching opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeGraph.clientExperience.stages.map((stage) => (
              <div key={stage.name} className="p-4 rounded-xl bg-pink-50 border border-pink-100">
                <h4 className="font-semibold text-pink-900 mb-2">{stage.name}</h4>
                <ul className="space-y-1">
                  {stage.pinkFlags.map((flag, i) => (
                    <li key={i} className="text-sm text-pink-700 flex items-start gap-2">
                      <span className="text-pink-500 mt-0.5">•</span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4 italic">
            Pink Flags are indicators of potential coaching opportunities. Not all need immediate attention, but patterns should be addressed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
