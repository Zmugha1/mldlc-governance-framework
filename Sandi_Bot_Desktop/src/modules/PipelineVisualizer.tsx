import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { SkeletonCard } from '@/components/SkeletonCard';
import { stageConfig, discColors, knowledgeGraph } from '@/data/sampleClients';
import { getAllClients } from '@/services/clientService';
import {
  getAllStageReadiness,
  moveClientStage,
  moveClientToPause,
  type PipelineStage,
} from '@/services/stageReadinessService';
import { getPipelineStageDefaults } from '@/services/pipelineService';
import { getDashboardKPIs } from '@/services/dashboardService';
import { clientToDisplay } from '@/services/clientAdapter';
import type { Client } from '@/types';
import { cn } from '@/lib/utils';
import { dbExecute, dbSelect } from '@/services/db';

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

const REC_COLORS: Record<string, string> = {
  VALIDATE: '#22c55e',
  GATHER: '#f59e0b',
  PAUSE: '#ef4444',
};

const STAGE_DISPLAY_NAMES = [
  'Initial Contact',
  'Seeker Connection',
  'Seeker Clarification',
  'Possibilities',
  'Client Career 2.0',
  'Business Purchase',
] as const;

/** Knowledge graph uses legacy names; show Sandi labels in this module only. */
function pipelineKnowledgeStageTitle(name: string): string {
  if (/coach,?\s*client,?\s*collaboration/i.test(name.trim())) return 'Possibilities';
  return name;
}

function knowledgePinkFlagsForStageColumn(
  displayStage: (typeof STAGE_DISPLAY_NAMES)[number]
): string[] {
  const stages = knowledgeGraph.clientExperience.stages;
  if (displayStage === 'Possibilities') {
    const s = stages.find((kg) => /coach,?\s*client,?\s*collaboration/i.test(kg.name));
    return s?.pinkFlags ?? [];
  }
  const s = stages.find(
    (kg) => kg.name === displayStage || kg.name.startsWith(`${displayStage} (`)
  );
  return s?.pinkFlags ?? [];
}

const DISPLAY_TO_STAGE_CODE: Record<(typeof STAGE_DISPLAY_NAMES)[number], PipelineStage> = {
  'Initial Contact': 'IC',
  'Seeker Connection': 'C1',
  'Seeker Clarification': 'C2',
  Possibilities: 'C3',
  'Client Career 2.0': 'C4',
  'Business Purchase': 'C5',
};

const NEXT_STAGE_CODE: Record<PipelineStage, PipelineStage | null> = {
  IC: 'C1',
  C1: 'C2',
  C2: 'C3',
  C3: 'C4',
  C4: 'C5',
  C5: null,
};

interface GateFacts {
  name: string;
  has_disc: boolean;
  has_you2: boolean;
  fathom_count: number;
  vision_statement: string | null;
}

type PipelineStageClient = { raw: Client; display: DisplayClient };

function pipelineCardSubtitle(raw: Client, display: DisplayClient): string {
  const industry = display.tumay.industriesOfInterest[0];
  if (!industry || industry === '—') return raw.company?.trim() || '—';
  if (industry.trimStart().startsWith('{')) return raw.company?.trim() || '—';
  return industry;
}

// Stage Column Component
function StageColumn({
  stage,
  clients,
  clientRecommendations,
  readinessById,
  isActive,
  onClick,
  onMoveNext,
  onPauseClient,
}: {
  stage: (typeof STAGE_DISPLAY_NAMES)[number];
  clients: PipelineStageClient[];
  clientRecommendations: Map<string, string>;
  readinessById: Map<string, number>;
  isActive: boolean;
  onClick: () => void;
  onMoveNext: (clientId: string, clientName: string, stageDisplay: (typeof STAGE_DISPLAY_NAMES)[number]) => void;
  onPauseClient: (clientId: string, clientName: string) => void;
}) {
  const config = stageConfig[stage as keyof typeof stageConfig];
  const pinkFlags = knowledgePinkFlagsForStageColumn(stage);

  return (
    <div 
      className={cn(
        "flex flex-col rounded-xl border-2 transition-all cursor-pointer min-w-[260px]",
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
        {!isActive ? (
          <div className="text-xs text-slate-500 p-2">
            Click this stage to view clients and actions.
          </div>
        ) : clients.length === 0 ? (
          <div className="text-xs text-slate-500 p-2">
            No clients in this stage.
          </div>
        ) : clients.map(({ raw, display: client }) => {
          const rec = clientRecommendations.get(raw.id) ?? 'GATHER';
          const recColor = REC_COLORS[rec] ?? '#f59e0b';
          const displayName = (raw.name ?? '').trim() || '—';
          return (
            <div
              key={raw.id}
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
                  <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {pipelineCardSubtitle(raw, client)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ backgroundColor: recColor, color: 'white' }}
                >
                  {rec}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {Math.round(readinessById.get(raw.id) ?? 0)}%
                </span>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-auto min-h-8 shrink-0 px-2 py-1.5 text-xs whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveNext(raw.id, displayName, stage);
                  }}
                >
                  Move to next stage
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-auto min-h-8 shrink-0 px-2 py-1.5 text-xs whitespace-nowrap border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPauseClient(raw.id, displayName);
                  }}
                >
                  Move to PAUSE
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage reference: pink flag themes for this compartment */}
      <div className="p-3 border-t border-slate-100 rounded-b-xl bg-slate-50/50">
        <PinkFlagAlert flags={pinkFlags} />
      </div>
    </div>
  );
}

const STAGE_READINESS_TO_COLUMN: Record<string, string> = {
  'Coach Client Collaboration': 'Possibilities',
};

// Conversion Funnel Component
function ConversionFunnel({ clients }: { clients: Client[] }) {
  const funnelData = useMemo(() => {
    return STAGE_DISPLAY_NAMES.map(stage => {
      const count = clients.filter(c => c.stage === stage).length;
      const config = stageConfig[stage as keyof typeof stageConfig];
      return {
        stage,
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
  const [readiness, setReadiness] = useState<Awaited<ReturnType<typeof getAllStageReadiness>>>([]);
  const [gateFactsByClient, setGateFactsByClient] = useState<Map<string, GateFacts>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseClient, setPauseClient] = useState<{ id: string; name: string } | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [dashboardKpis, setDashboardKpis] = useState<Awaited<
    ReturnType<typeof getDashboardKPIs>
  > | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    clientId: string;
    clientName: string;
    fromStage: PipelineStage;
    toStage: PipelineStage;
    missingRequirement: string;
    warningMessage: string;
  } | null>(null);

  const loadPipelineData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      getAllClients(),
      getAllStageReadiness(),
      getDashboardKPIs(),
      dbSelect<{
        id: string;
        name: string;
        inferred_stage: string | null;
        outcome_bucket: string | null;
        readiness_score: number | null;
        pink_flags: string | null;
        vision_statement: string | null;
        has_disc: number;
        has_you2: number;
        fathom_count: number;
      }>(
        `SELECT
           c.id,
           c.name,
           c.inferred_stage,
           c.outcome_bucket,
           c.readiness_score,
           c.pink_flags,
           c.vision_statement,
           CASE WHEN dp.client_id IS NOT NULL
             THEN 1 ELSE 0 END as has_disc,
           CASE WHEN y.client_id IS NOT NULL
             THEN 1 ELSE 0 END as has_you2,
           COUNT(cs.id) as fathom_count
         FROM clients c
         LEFT JOIN client_disc_profiles dp
           ON dp.client_id = c.id
         LEFT JOIN client_you2_profiles y
           ON y.client_id = c.id
         LEFT JOIN coaching_sessions cs
           ON cs.client_id = c.id
         WHERE c.outcome_bucket IN
           ('active', 'converted', 'paused')
         GROUP BY c.id`,
        []
      ),
    ])
      .then(([c, r, kpis, gateRows]) => {
        setClients(c);
        setReadiness(r);
        setDashboardKpis(kpis);
        const m = new Map<string, GateFacts>();
        gateRows.forEach((row) => {
          m.set(row.id, {
            name: row.name,
            has_disc: row.has_disc === 1,
            has_you2: row.has_you2 === 1,
            fathom_count: Number(row.fathom_count ?? 0),
            vision_statement: row.vision_statement ?? null,
          });
        });
        setGateFactsByClient(m);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err?.message ?? err ?? 'Failed to load pipeline'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPipelineData();
  }, []);

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const isReasonValid = pauseReason.trim().length >= 10;
  const isDateValid = followUpDate.length > 0 && followUpDate >= tomorrow;
  const canConfirmPause = isReasonValid && isDateValid;

  const openPauseModal = (clientId: string, clientName: string) => {
    setPauseClient({ id: clientId, name: clientName });
    setPauseReason('');
    setFollowUpDate('');
    setPauseError(null);
    setPauseModalOpen(true);
  };

  const closePauseModal = () => {
    setPauseModalOpen(false);
    setPauseClient(null);
    setPauseReason('');
    setFollowUpDate('');
    setPauseError(null);
  };

  const handleConfirmPause = async () => {
    if (!pauseClient || !canConfirmPause) {
      setPauseError('Please provide a valid reason and a future follow-up date.');
      return;
    }
    const ok = await moveClientToPause(
      pauseClient.id,
      pauseReason.trim(),
      followUpDate
    );
    if (!ok) {
      setPauseError('Failed to pause client. Please try again.');
      return;
    }
    closePauseModal();
    loadPipelineData();
  };

  const checkStageGate = (
    client: GateFacts,
    _fromStage: PipelineStage,
    toStage: PipelineStage
  ): {
    requiresWarning: boolean;
    missingRequirement: string;
    message: string;
  } => {
    if (toStage === 'C2' && !client.has_disc) {
      return {
        requiresWarning: true,
        missingRequirement: 'DISC profile missing',
        message: `DISC profile missing for ${client.name}. Move anyway?`,
      };
    }
    if (toStage === 'C3' && (!client.has_disc || !client.has_you2)) {
      return {
        requiresWarning: true,
        missingRequirement: !client.has_you2 ? 'You 2.0 profile missing' : 'DISC profile missing',
        message: `You 2.0 profile missing for ${client.name}. Move anyway?`,
      };
    }
    if (
      toStage === 'C4' &&
      (!client.has_disc || !client.has_you2 || client.fathom_count < 1)
    ) {
      return {
        requiresWarning: true,
        missingRequirement: client.fathom_count < 1 ? 'No coaching sessions recorded' : 'Required profile data missing',
        message: `No coaching sessions recorded for ${client.name}. Move anyway?`,
      };
    }
    if (
      toStage === 'C5' &&
      (!client.has_disc || !client.has_you2 || !client.vision_statement)
    ) {
      return {
        requiresWarning: true,
        missingRequirement: !client.vision_statement ? 'Vision statement missing' : 'Required profile data missing',
        message: `Vision statement missing for ${client.name}. Move anyway?`,
      };
    }
    return { requiresWarning: false, missingRequirement: '', message: '' };
  };

  const handleMoveNext = async (
    clientId: string,
    clientName: string,
    stageDisplay: (typeof STAGE_DISPLAY_NAMES)[number]
  ) => {
    const fromStage = DISPLAY_TO_STAGE_CODE[stageDisplay];
    const toStage = NEXT_STAGE_CODE[fromStage];
    if (!toStage) return;

    const gateFacts = gateFactsByClient.get(clientId) ?? {
      name: clientName,
      has_disc: false,
      has_you2: false,
      fathom_count: 0,
      vision_statement: null,
    };

    const gateDecision = checkStageGate(gateFacts, fromStage, toStage);
    if (gateDecision.requiresWarning) {
      setPendingMove({
        clientId,
        clientName,
        fromStage,
        toStage,
        missingRequirement: gateDecision.missingRequirement,
        warningMessage: gateDecision.message,
      });
      setGateModalOpen(true);
      return;
    }

    const moved = await moveClientStage(
      clientId,
      toStage,
      `Pipeline stage move from ${fromStage} to ${toStage}`,
      'Sandi Stahl'
    );
    if (moved) loadPipelineData();
  };

  const handleOverrideMove = async () => {
    if (!pendingMove) return;
    const moved = await moveClientStage(
      pendingMove.clientId,
      pendingMove.toStage,
      `Stage gate override from ${pendingMove.fromStage} to ${pendingMove.toStage}`,
      'Sandi Stahl'
    );
    if (moved) {
      await dbExecute(
        `INSERT INTO audit_log
         (client_id, action_type, reasoning, model_used)
         VALUES (?, 'stage_gate_override', ?, 'deterministic')`,
        [
          pendingMove.clientId,
          `${pendingMove.clientName} moved from ${pendingMove.fromStage} to ${pendingMove.toStage} without meeting gate. Missing: ${pendingMove.missingRequirement}`
        ]
      );
      setGateModalOpen(false);
      setPendingMove(null);
      loadPipelineData();
    }
  };

  const clientRecommendations = useMemo(() => {
    const m = new Map<string, string>();
    readiness.forEach(r => m.set(r.client_id, r.recommendation));
    return m;
  }, [readiness]);

  const readinessById = useMemo(() => {
    const m = new Map<string, number>();
    readiness.forEach((r) => m.set(r.client_id, r.readiness_score));
    return m;
  }, [readiness]);

  const clientMap = useMemo(() => {
    const m = new Map<string, Client>();
    clients.forEach(c => m.set(c.id, c));
    return m;
  }, [clients]);

  // Group clients by stage from readiness (display format for StageColumn)
  const clientsByStage = useMemo(() => {
    return STAGE_DISPLAY_NAMES.map(stage => ({
      stage,
      clients: readiness
        .filter(r => (STAGE_READINESS_TO_COLUMN[r.current_stage_full] ?? r.current_stage_full) === stage)
        .map(r => clientMap.get(r.client_id))
        .filter((c): c is Client => c != null)
        .map((c) => ({ raw: c, display: clientToDisplay(c) })),
    }));
  }, [readiness, clientMap]);

  // Pipeline flow data from real clients
  const flowData = useMemo(() => {
    const defaults = getPipelineStageDefaults();
    return STAGE_DISPLAY_NAMES.map(stage => {
      const count = clients.filter(c => c.stage === stage).length;
      return {
        name: stage,
        clients: count,
        conversion: defaults.flowConversion
      };
    });
  }, [clients]);

  const totalClients = clients.length;
  const totalActivePinkFlags = useMemo(
    () => totalActivePinkFlagsForClients(clients),
    [clients]
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonCard lines={4} lineHeight={20} />
        <SkeletonCard lines={3} lineHeight={16} />
        <SkeletonCard lines={5} lineHeight={14} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <p className="text-2xl font-bold">{dashboardKpis?.conversion_rate ?? 0}%</p>
                <p className="text-xs text-slate-500">Conversion Rate</p>
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
                <p className="text-2xl font-bold">{totalActivePinkFlags}</p>
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
          <CardDescription>Your clients organized by compartment</CardDescription>
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
                  <h4 className="font-semibold text-slate-900 min-w-0">
                    {pipelineKnowledgeStageTitle(stage.name)}
                  </h4>
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
            {clientsByStage.map(({ stage, clients: stageClients }) => (
              <StageColumn
                key={stage}
                stage={stage}
                clients={stageClients}
                clientRecommendations={clientRecommendations}
                readinessById={readinessById}
                isActive={selectedStage === stage}
                onClick={() => setSelectedStage(selectedStage === stage ? null : stage)}
                onMoveNext={handleMoveNext}
                onPauseClient={openPauseModal}
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
                <h4 className="font-semibold text-pink-900 mb-2">
                  {pipelineKnowledgeStageTitle(stage.name)}
                </h4>
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

      <Dialog
        open={gateModalOpen}
        onOpenChange={(open) => {
          setGateModalOpen(open);
          if (!open) setPendingMove(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stage Gate Warning</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-700">
            {pendingMove?.warningMessage}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGateModalOpen(false);
                setPendingMove(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleOverrideMove}
            >
              Move anyway - log override
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pauseModalOpen} onOpenChange={setPauseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pause {pauseClient?.name ?? 'client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pause-reason">Reason for pause</Label>
              <Textarea
                id="pause-reason"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="e.g. Family situation — follow up in 2 months"
                rows={3}
              />
              {pauseReason.length > 0 && !isReasonValid && (
                <p className="text-xs text-red-600">Reason must be at least 10 characters.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pause-follow-up">Follow-up reminder date</Label>
              <input
                id="pause-follow-up"
                type="date"
                min={tomorrow}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {followUpDate.length > 0 && !isDateValid && (
                <p className="text-xs text-red-600">Follow-up date must be a future date.</p>
              )}
            </div>
            {pauseError && <p className="text-sm text-red-600">{pauseError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closePauseModal}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60"
                onClick={handleConfirmPause}
                disabled={!canConfirmPause}
              >
                Confirm Pause
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
