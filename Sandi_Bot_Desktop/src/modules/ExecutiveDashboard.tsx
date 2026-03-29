import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  TrendingUp,
  Target,
  Phone,
  ArrowUpRight,
  Zap,
  RefreshCw,
  AlertTriangle,
  Award,
  Compass,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { SkeletonCard } from '@/components/SkeletonCard';
import FeedbackButton from '../components/FeedbackButton';
import { stageConfig } from '@/data/sampleClients';
import { getDashboardStats, getAllClients } from '@/services/clientService';
import { getDiscStyleBreakdown, getDashboardKPIs } from '@/services/dashboardService';
import { getAllStageReadiness } from '@/services/stageReadinessService';
import { getConversionRate } from '@/services/pipelineService';
import type { Client, DashboardStats } from '@/types';
import { normalizeDisplayStage } from '@/services/clientAdapter';
import { deriveDominantStyle } from '@/config/discCoachingTips';
import { dbSelect } from '@/services/db';
import { cn } from '@/lib/utils';

const STAGES = [
  'Initial Contact',
  'Seeker Connection',
  'Seeker Clarification',
  'Possibilities',
  'Client Career 2.0',
  'Business Purchase',
];

/** Dashboard subtitles by pipeline stage (Sandi language). */
const COMPARTMENT_SUBTITLE_BY_STAGE: Record<string, string> = {
  'Initial Contact': 'Compartment 1',
  'Seeker Connection': 'Compartment 2',
  'Seeker Clarification': 'Compartment 3',
  Possibilities: 'Compartment 4',
  'Client Career 2.0': 'Compartment 5',
  'Business Purchase': 'Business Complete',
};

const recommendationStyleMap: Record<
  'VALIDATE' | 'GATHER' | 'PAUSE',
  { color: string; bgColor: string }
> = {
  VALIDATE: { color: '#22C55E', bgColor: '#DCFCE7' },
  GATHER: { color: '#F59E0B', bgColor: '#FEF3C7' },
  PAUSE: { color: '#6B7280', bgColor: '#F3F4F6' },
};

const REC_ORDER: Record<'VALIDATE' | 'GATHER' | 'PAUSE', number> = {
  VALIDATE: 0,
  GATHER: 1,
  PAUSE: 2,
};

const DISC_LETTER_COLORS: Record<'D' | 'I' | 'S' | 'C', string> = {
  D: '#EF4444',
  I: '#EAB308',
  S: '#22C55E',
  C: '#3B82F6',
};

/** Last session before this is shown with stale warning (uploaded Fathom dates). */
const STALE_SESSION_INSTANT = Date.UTC(2024, 0, 1);

function activePinkFlagCount(flags: string[]): number {
  return flags.filter((f) => !String(f).startsWith('resolved:')).length;
}

/** Parse client.pink_flags JSON array; on failure returns []. */
function pinkFlagsFromClientJson(raw: string | null | undefined): string[] {
  try {
    if (raw == null || String(raw).trim() === '') return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item));
  } catch {
    return [];
  }
}

function parseDiscLetter(style: string | undefined | null): 'D' | 'I' | 'S' | 'C' | null {
  const ch = (style ?? '').trim().charAt(0).toUpperCase();
  if (ch === 'D' || ch === 'I' || ch === 'S' || ch === 'C') return ch;
  return null;
}

function discLetterFromClient(cl: Client | undefined): 'D' | 'I' | 'S' | 'C' | null {
  if (!cl) return null;
  const fromStyle = parseDiscLetter(cl.disc_style);
  if (fromStyle) return fromStyle;
  const raw = cl.disc_scores?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const d = Number(parsed.D ?? parsed.d ?? 0);
    const i = Number(parsed.I ?? parsed.i ?? 0);
    const s = Number(parsed.S ?? parsed.s ?? 0);
    const c = Number(parsed.C ?? parsed.c ?? 0);
    if (![d, i, s, c].some((n) => n > 0)) return null;
    return parseDiscLetter(deriveDominantStyle(d, i, s, c));
  } catch {
    return null;
  }
}

function glanceDiscLetter(
  cl: Client | undefined,
  profileLetter: 'D' | 'I' | 'S' | 'C' | undefined
): 'D' | 'I' | 'S' | 'C' | null {
  return discLetterFromClient(cl) ?? profileLetter ?? null;
}

function outcomeBucketDisplay(bucket: string | undefined | null): string {
  const b = (bucket ?? '').toLowerCase();
  if (b === 'active') return 'Active';
  if (b === 'paused') return 'Paused';
  return bucket?.trim() || '—';
}

function formatSessionDate(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isStaleFathomSessionDate(iso: string | null | undefined): boolean {
  if (iso == null || String(iso).trim() === '') return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t < STALE_SESSION_INSTANT;
}

function salutationForLocalHour(hour: number): string {
  if (hour < 12) return 'Good morning, Sandi';
  if (hour <= 17) return 'Good afternoon, Sandi';
  return 'Good evening, Sandi';
}

function formatExecutiveDashboardDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatLocalYyyyMmDd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Monday 00:00 local calendar date (week starts Monday). */
function startOfWeekMondayLocal(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

const C3_WEEKLY_TARGET = 2.5;

const PLACEMENT_TARGET_COUNT = 11;

/** Display stage label → pipeline code for active-client counts (Sandi plan table). */
const PIPELINE_YTD_CODE_FROM_DISPLAY: Record<
  string,
  'IC' | 'C1' | 'C2' | 'C3' | 'C4'
> = {
  'Initial Contact': 'IC',
  'Seeker Connection': 'C1',
  'Seeker Clarification': 'C2',
  Possibilities: 'C3',
  'Client Career 2.0': 'C4',
};

const PIPELINE_YTD_ROW_DEF = [
  { stage: 'IC', weeklyTarget: '22/wk', ytdTarget: 'n/a', c5: false },
  { stage: 'C1', weeklyTarget: '6/wk', ytdTarget: 'n/a', c5: false },
  { stage: 'C2', weeklyTarget: '2.81/wk', ytdTarget: 'n/a', c5: false },
  { stage: 'C3', weeklyTarget: '2.33/wk', ytdTarget: 'n/a', c5: false },
  { stage: 'C4', weeklyTarget: '1.68/wk', ytdTarget: 'n/a', c5: false },
  { stage: 'C5', weeklyTarget: '0.21/wk', ytdTarget: '11', c5: true },
] as const;
const PLACEMENT_REVENUE_PER_UNIT = 28_000;
const PLACEMENT_REVENUE_GOAL = 300_000;

function placementTrackerProgressColor(count: number): string {
  if (count >= 8) return '#22C55E';
  if (count >= 4) return '#F59E0B';
  return '#EF4444';
}

function PlacementTrackerCard({ placementCount }: { placementCount: number }) {
  const pctTowardTarget = Math.min(
    100,
    Math.round((placementCount / PLACEMENT_TARGET_COUNT) * 1000) / 10
  );
  const revenue = placementCount * PLACEMENT_REVENUE_PER_UNIT;
  const barColor = placementTrackerProgressColor(placementCount);
  const moneyFmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-500">Placement Tracker</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">
              {placementCount} of {PLACEMENT_TARGET_COUNT} placements
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              {moneyFmt.format(revenue)} of {moneyFmt.format(PLACEMENT_REVENUE_GOAL)}
            </p>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pctTowardTarget}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </div>
          </div>
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${barColor}20` }}
          >
            <Award className="h-6 w-6" style={{ color: barColor }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function C3ThisWeekCard({
  weekCount,
  ytdCount,
}: {
  weekCount: number;
  ytdCount: number;
}) {
  const accent =
    weekCount >= C3_WEEKLY_TARGET
      ? '#22C55E'
      : weekCount >= 1
        ? '#F59E0B'
        : '#EF4444';
  let statusText: string;
  let statusClass: string;
  if (weekCount >= C3_WEEKLY_TARGET) {
    statusText = 'On track';
    statusClass = 'text-green-600';
  } else if (weekCount >= 1) {
    statusText = 'Below target';
    statusClass = 'text-amber-600';
  } else {
    statusText = 'None yet this week';
    statusClass = 'text-red-600';
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-500">C3 This Week</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">
              {weekCount.toFixed(1)} this week
            </h3>
            <p className="text-sm text-slate-600 mt-2">target: 2.5 per week</p>
            <p className={cn('text-sm font-medium mt-2', statusClass)}>{statusText}</p>
            <p className="text-sm text-slate-500 mt-2">{ytdCount} total this year</p>
          </div>
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accent}20` }}
          >
            <Compass className="h-6 w-6" style={{ color: accent }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  description: string;
  color: string;
}

function KPICard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description,
  color,
}: KPICardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{value}</h3>
            {change && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-sm',
                  changeType === 'positive' && 'text-green-600',
                  changeType === 'negative' && 'text-red-600',
                  changeType === 'neutral' && 'text-slate-500'
                )}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>{change}</span>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2 whitespace-pre-line">{description}</p>
          </div>
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineStageCard({
  stage,
  count,
}: {
  stage: string;
  count: number;
}) {
  const config = stageConfig[stage as keyof typeof stageConfig];
  if (!config) return null;
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:shadow-md transition-shadow">
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center text-slate-700 font-bold text-sm shrink-0"
        style={{ backgroundColor: config.color }}
      >
        {count}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900">{config.label}</h4>
        <p className="text-sm text-slate-500">
          {COMPARTMENT_SUBTITLE_BY_STAGE[stage] ?? config.compartment}
        </p>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<Awaited<ReturnType<typeof getAllClients>>>([]);
  const [discDistribution, setDiscDistribution] = useState<Awaited<ReturnType<typeof getDiscStyleBreakdown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [readinessRows, setReadinessRows] = useState<Awaited<ReturnType<typeof getAllStageReadiness>>>([]);
  const [activeConversationCount, setActiveConversationCount] = useState(0);
  const [dashboardKpis, setDashboardKpis] = useState<Awaited<ReturnType<typeof getDashboardKPIs>> | null>(null);
  const [sessionStatsByClient, setSessionStatsByClient] = useState<
    Map<string, { count: number; lastDate: string | null }>
  >(new Map());
  const [discLetterByProfileClientId, setDiscLetterByProfileClientId] = useState<
    Map<string, 'D' | 'I' | 'S' | 'C'>
  >(() => new Map());
  const [greetingNow, setGreetingNow] = useState(() => Date.now());
  const [placementTrackerCount, setPlacementTrackerCount] = useState(0);
  const [c3WeekCount, setC3WeekCount] = useState(0);
  const [c3YtdCount, setC3YtdCount] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setGreetingNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greetingSalutation = useMemo(() => {
    const d = new Date(greetingNow);
    return salutationForLocalHour(d.getHours());
  }, [greetingNow]);

  const greetingDateLine = useMemo(
    () => formatExecutiveDashboardDate(new Date(greetingNow)),
    [greetingNow]
  );

  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const now = new Date();
      const weekStartLocal = startOfWeekMondayLocal(now);
      const weekStartStr = formatLocalYyyyMmDd(weekStartLocal);
      const todayStr = formatLocalYyyyMmDd(now);
      const calendarYear = now.getFullYear();

      const [
        s,
        c,
        d,
        readiness,
        conversationRows,
        kpis,
        sessionRows,
        discProfileRows,
        placementRows,
        c3WeekRows,
        c3YtdRows,
      ] = await Promise.all([
        getDashboardStats(),
        getAllClients(),
        getDiscStyleBreakdown(),
        getAllStageReadiness(),
        dbSelect<{ count: number }>(
          `SELECT COUNT(DISTINCT client_id) as count
           FROM coaching_sessions
           WHERE client_id IN (
             SELECT id FROM clients
             WHERE outcome_bucket = 'active'
           )`,
          []
        ),
        getDashboardKPIs(),
        dbSelect<{
          client_id: string;
          session_count: number;
          last_session_date: string | null;
        }>(
          `SELECT client_id,
                  COUNT(*) as session_count,
                  MAX(session_date) as last_session_date
           FROM coaching_sessions
           GROUP BY client_id`,
          []
        ),
        dbSelect<{
          client_id: string;
          natural_d: number | null;
          natural_i: number | null;
          natural_s: number | null;
          natural_c: number | null;
        }>(
          `SELECT client_id, natural_d, natural_i, natural_s, natural_c
           FROM client_disc_profiles`,
          []
        ),
        dbSelect<{ count: number }>(
          `SELECT COUNT(*) as count
           FROM clients
           WHERE business_purchase_date IS NOT NULL
             AND outcome_bucket = 'converted'`,
          []
        ),
        dbSelect<{ count: number }>(
          `SELECT COUNT(*) as count
           FROM coaching_sessions
           WHERE stage = 'C3'
             AND session_date IS NOT NULL
             AND TRIM(session_date) != ''
             AND date(session_date) >= date($1)
             AND date(session_date) <= date($2)`,
          [weekStartStr, todayStr]
        ),
        dbSelect<{ count: number }>(
          `SELECT COUNT(*) as count
           FROM coaching_sessions
           WHERE stage = 'C3'
             AND session_date IS NOT NULL
             AND TRIM(session_date) != ''
             AND CAST(strftime('%Y', date(session_date)) AS INTEGER) = $1`,
          [calendarYear]
        ),
      ]);
      setStats(s);
      setClients(c);
      setDiscDistribution(d);
      setReadinessRows(readiness);
      const sessMap = new Map<string, { count: number; lastDate: string | null }>();
      for (const row of sessionRows) {
        sessMap.set(row.client_id, {
          count: Number(row.session_count ?? 0),
          lastDate: row.last_session_date ?? null,
        });
      }
      setSessionStatsByClient(sessMap);
      const discFromProfiles = new Map<string, 'D' | 'I' | 'S' | 'C'>();
      for (const row of discProfileRows) {
        const d = Number(row.natural_d ?? 0);
        const i = Number(row.natural_i ?? 0);
        const s = Number(row.natural_s ?? 0);
        const c = Number(row.natural_c ?? 0);
        if (Math.max(d, i, s, c) <= 0) continue;
        const letter = parseDiscLetter(deriveDominantStyle(d, i, s, c));
        if (letter) discFromProfiles.set(row.client_id, letter);
      }
      setDiscLetterByProfileClientId(discFromProfiles);
      setActiveConversationCount(Number(conversationRows[0]?.count ?? 0));
      setPlacementTrackerCount(Number(placementRows[0]?.count ?? 0));
      setC3WeekCount(Number(c3WeekRows[0]?.count ?? 0));
      setC3YtdCount(Number(c3YtdRows[0]?.count ?? 0));

      setDashboardKpis(kpis);

      const activeReadiness = readiness.filter((row) => row.outcome_bucket === 'active');
      const validateIds = activeReadiness
        .filter((r) => r.recommendation === 'VALIDATE')
        .sort((a, b) => b.readiness_score - a.readiness_score)
        .slice(0, 3)
        .map((r) => r.client_id);
      const readinessById = new Map(activeReadiness.map((r) => [r.client_id, r]));
      const validateClients = c
        .filter((client) => validateIds.includes(client.id))
        .sort((a, b) => validateIds.indexOf(a.id) - validateIds.indexOf(b.id))
        .map((client) => {
          const row = readinessById.get(client.id);
          return {
            id: client.id,
            name: client.name,
            stageLabel: normalizeDisplayStage(client.inferred_stage ?? client.stage),
            recommendation: (row?.recommendation ?? 'GATHER') as 'VALIDATE' | 'GATHER' | 'PAUSE',
            readinessPercent: Math.max(
              0,
              Math.min(100, Math.round(Number(row?.readiness_score ?? 0)))
            ),
          };
        });
      setPriorityClients(validateClients);
    } catch (err) {
      console.error('Dashboard load:', err);
      setError(String((err as { message?: string })?.message ?? err ?? 'Failed to load dashboard'));
    } finally {
      if (isManualRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const recommendationData = useMemo(() => {
    const activeRows = readinessRows.filter((r) => r.outcome_bucket === 'active');
    const validateCount = activeRows.filter((r) => r.recommendation === 'VALIDATE').length;
    const gatherCount = activeRows.filter((r) => r.recommendation === 'GATHER').length;
    const pauseCount = dashboardKpis?.pause_count ?? 0;
    return [
      { name: 'VALIDATE', value: validateCount, color: recommendationStyleMap.VALIDATE.color },
      { name: 'GATHER', value: gatherCount, color: recommendationStyleMap.GATHER.color },
      { name: 'PAUSE', value: pauseCount, color: recommendationStyleMap.PAUSE.color },
    ];
  }, [readinessRows, dashboardKpis]);

  const avgReadinessPercent = useMemo(() => {
    const activeRows = readinessRows.filter((r) => r.outcome_bucket === 'active');
    if (activeRows.length === 0) return 0;
    const avg = activeRows.reduce((sum, row) => sum + Number(row.readiness_score ?? 0), 0) / activeRows.length;
    return Math.max(0, Math.min(100, Math.round(avg)));
  }, [readinessRows]);

  const pipelineChartData = useMemo(() => {
    return STAGES.map((stage) => {
      const count = clients.filter((c) => normalizeDisplayStage(c.inferred_stage ?? c.stage) === stage).length;
      const config = stageConfig[stage as keyof typeof stageConfig];
      return {
        stage: config?.label ?? stage,
        count,
        conversion: getConversionRate(count),
      };
    });
  }, [clients]);

  const weeklyData = [
    { day: 'Mon', calls: 2, emails: 4 },
    { day: 'Tue', calls: 3, emails: 3 },
    { day: 'Wed', calls: 1, emails: 5 },
    { day: 'Thu', calls: 4, emails: 3 },
    { day: 'Fri', calls: 2, emails: 4 },
  ];

  const [priorityClients, setPriorityClients] = useState<Array<{
    id: string;
    name: string;
    stageLabel: string;
    recommendation: 'VALIDATE' | 'GATHER' | 'PAUSE';
    readinessPercent: number;
  }>>([]);

  // Priority clients are loaded in loadDashboardData().

  const pipelineStageCards = useMemo(() => {
    return STAGES.map((stage) => {
      const count = clients.filter((c) => normalizeDisplayStage(c.inferred_stage ?? c.stage) === stage).length;
      return { stage, count };
    });
  }, [clients]);

  const pipelineYtdProgressRows = useMemo(() => {
    const stageCounts: Record<'IC' | 'C1' | 'C2' | 'C3' | 'C4', number> = {
      IC: 0,
      C1: 0,
      C2: 0,
      C3: 0,
      C4: 0,
    };
    for (const cl of clients) {
      if ((cl.outcome_bucket ?? '').toLowerCase() !== 'active') continue;
      const display = normalizeDisplayStage(cl.inferred_stage ?? cl.stage);
      const code = PIPELINE_YTD_CODE_FROM_DISPLAY[display];
      if (code) stageCounts[code] += 1;
    }
    const convertedTotal = clients.filter(
      (cl) => (cl.outcome_bucket ?? '').toLowerCase() === 'converted'
    ).length;

    return PIPELINE_YTD_ROW_DEF.map((def) => ({
      stage: def.stage,
      weeklyTarget: def.weeklyTarget,
      ytdTarget: def.ytdTarget,
      c5: def.c5,
      clientCount: def.c5
        ? convertedTotal
        : stageCounts[def.stage as keyof typeof stageCounts],
    }));
  }, [clients]);

  const clientsAtAGlanceRows = useMemo(() => {
    const byId = new Map(clients.map((cl) => [cl.id, cl]));
    type Row = {
      id: string;
      name: string;
      compartment: string;
      statusLabel: string;
      recommendation: 'VALIDATE' | 'GATHER' | 'PAUSE';
      discLetter: 'D' | 'I' | 'S' | 'C' | null;
      sessionCount: number;
      lastSessionDate: string | null;
      pinkCount: number;
    };
    const list: Row[] = [];
    for (const r of readinessRows) {
      const ob = (r.outcome_bucket ?? '').toLowerCase();
      if (ob !== 'active' && ob !== 'paused') continue;
      const cl = byId.get(r.client_id);
      if (!cl) continue;
      const rec = r.recommendation;
      if (rec !== 'VALIDATE' && rec !== 'GATHER' && rec !== 'PAUSE') continue;
      const sess = sessionStatsByClient.get(r.client_id);
      const sessionCount = sess?.count ?? 0;
      const lastSessionDate = sess?.lastDate ?? null;
      list.push({
        id: r.client_id,
        name: r.client_name,
        compartment: normalizeDisplayStage(cl.inferred_stage ?? cl.stage),
        statusLabel: outcomeBucketDisplay(r.outcome_bucket),
        recommendation: rec,
        discLetter: glanceDiscLetter(cl, discLetterByProfileClientId.get(r.client_id)),
        sessionCount,
        lastSessionDate,
        pinkCount: activePinkFlagCount(pinkFlagsFromClientJson(cl.pink_flags)),
      });
    }
    list.sort((a, b) => {
      const ra = REC_ORDER[a.recommendation];
      const rb = REC_ORDER[b.recommendation];
      if (ra !== rb) return ra - rb;
      if (b.pinkCount !== a.pinkCount) return b.pinkCount - a.pinkCount;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [readinessRows, clients, sessionStatsByClient, discLetterByProfileClientId]);

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

  if (!stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FeedbackButton pageName="Executive Dashboard" />
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          {greetingSalutation}
        </h1>
        <p className="text-sm text-slate-500">{greetingDateLine}</p>
      </div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => { void loadDashboardData(true); }}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Total Clients"
          value={stats.totalClients}
          change="Active pipeline"
          changeType="positive"
          icon={Users}
          description="Prospects in coaching journey"
          color="#3B82F6"
        />
        <KPICard
          title="Clients with Sessions"
          value={activeConversationCount}
          change="Have at least one Fathom call"
          changeType="positive"
          icon={Phone}
          description="Fathom calls uploaded"
          color="#22C55E"
        />
        <KPICard
          title="Profile Completeness"
          value={`${avgReadinessPercent}%`}
          change="Clients with complete files"
          changeType="positive"
          icon={Target}
          description="DISC + You 2.0 + TUMAY + Fathom"
          color="#F59E0B"
        />
        <KPICard
          title="Conversion Rate"
          value={`${dashboardKpis?.conversion_rate ?? 0}%`}
          change="IC to Closed"
          changeType="positive"
          icon={TrendingUp}
          description="Pipeline conversion efficiency"
          color="#8B5CF6"
        />
        <PlacementTrackerCard placementCount={placementTrackerCount} />
        <C3ThisWeekCard weekCount={c3WeekCount} ytdCount={c3YtdCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Progress — Year to Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">Stage</TableHead>
                  <TableHead className="font-semibold text-slate-700">Clients</TableHead>
                  <TableHead className="font-semibold text-slate-700">Weekly Target</TableHead>
                  <TableHead className="font-semibold text-slate-700">YTD Target</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelineYtdProgressRows.map((row) => (
                  <TableRow key={row.stage} className="border-b border-slate-100">
                    <TableCell className="font-medium text-slate-900">{row.stage}</TableCell>
                    <TableCell className="text-slate-800">{row.clientCount}</TableCell>
                    <TableCell className="text-slate-700">{row.weeklyTarget}</TableCell>
                    <TableCell className="text-slate-700">{row.ytdTarget}</TableCell>
                    <TableCell>
                      {row.c5 ? (
                        <span className="text-slate-800">
                          {placementTrackerCount} of {PLACEMENT_TARGET_COUNT}
                        </span>
                      ) : row.clientCount > 0 ? (
                        <span className="font-medium text-green-600">Active</span>
                      ) : (
                        <span className="font-medium text-red-600">Empty</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p
            className="mt-4 text-xs italic leading-relaxed whitespace-pre-line"
            style={{ color: '#7A8F95' }}
          >
            {`C3 is your north star. 2.5 presentations
per week puts you on track for 11 placements.`}
          </p>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pipelineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={recommendationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {recommendationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 shrink-0">
                {recommendationData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm text-slate-500">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity & DISC Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="emails"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={{ fill: '#22C55E', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-600">Calls</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm text-slate-600">Emails</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">DISC Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={discDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {discDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 shrink-0">
                {discDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-slate-500">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Clients */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">Validate Clients</CardTitle>
            <p className="mt-1 text-xs italic text-amber-900/80">
              Vision statements for these clients are coming in Month 2 — Coach Bot will generate them automatically.
            </p>
          </div>
          <Zap className="h-5 w-5 shrink-0 text-yellow-500" aria-hidden />
        </CardHeader>
        <CardContent>
          {priorityClients.length === 0 ? (
            <p className="text-slate-500 text-sm">No VALIDATE clients yet. Create clients and recommendations will appear here.</p>
          ) : (
            <div className="space-y-3">
              {priorityClients.map((client) => {
                const normalizedRecommendation = client.recommendation;
                const style =
                  recommendationStyleMap[
                    normalizedRecommendation as keyof typeof recommendationStyleMap
                  ] ?? recommendationStyleMap.GATHER;

                return (
                  <div
                    key={client.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{client.name}</p>
                      <Badge variant="outline" className="mt-1">
                        {client.stageLabel}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        style={{
                          backgroundColor: style.bgColor,
                          color: style.color,
                        }}
                      >
                        {normalizedRecommendation}
                      </Badge>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{client.readinessPercent}%</p>
                        <p className="text-xs text-slate-500">readiness</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5-Compartment Coaching Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pipelineStageCards.map(({ stage, count }) => (
              <PipelineStageCard
                key={stage}
                stage={stage}
                count={count}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-none">
        <CardHeader>
          <CardTitle className="text-lg">Clients at a Glance</CardTitle>
          <CardDescription className="text-slate-500">
            Your full pipeline in one view
          </CardDescription>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 mt-2">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Last Contact dates are based on uploaded Fathom sessions. Upload new call transcripts to
              keep dates current.
            </span>
          </p>
        </CardHeader>
        <CardContent className="w-full max-w-none space-y-0">
          <div className="w-full max-w-none">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Name</TableHead>
                <TableHead className="min-w-[180px]">Compartment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead>DISC</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Pink flags</TableHead>
                <TableHead className="h-auto min-h-10 align-top whitespace-normal py-2">
                  <span className="block font-medium">Last Contact</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-500 normal-case">
                    (click client to update)
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientsAtAGlanceRows.map((row) => {
                const recStyle = recommendationStyleMap[row.recommendation];
                const stale =
                  row.sessionCount > 0 &&
                  row.lastSessionDate != null &&
                  isStaleFathomSessionDate(row.lastSessionDate);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="min-w-[160px] font-semibold text-slate-900">
                      {row.name}
                    </TableCell>
                    <TableCell className="min-w-[180px] text-slate-700">{row.compartment}</TableCell>
                    <TableCell className="text-slate-600">{row.statusLabel}</TableCell>
                    <TableCell>
                      <span
                        className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: recStyle.bgColor,
                          color: recStyle.color,
                        }}
                      >
                        {row.recommendation}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.discLetter ? (
                        <span
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                            row.discLetter === 'I'
                              ? 'text-slate-900'
                              : 'text-white'
                          )}
                          style={{
                            backgroundColor: DISC_LETTER_COLORS[row.discLetter],
                          }}
                        >
                          {row.discLetter}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="tabular-nums">{row.sessionCount}</span>
                        {row.sessionCount === 0 ? (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-50 px-1 py-0 text-amber-800"
                            title="No Fathom sessions uploaded"
                          >
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.pinkCount > 0 ? (
                        <Badge className="bg-red-600 text-white hover:bg-red-600">
                          {row.pinkCount}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {row.sessionCount === 0 ? (
                        <span className="text-slate-500 text-sm">No sessions yet</span>
                      ) : row.lastSessionDate ? (
                        <span className="inline-flex flex-wrap items-center gap-1">
                          <span className={cn(stale && 'text-amber-900 font-medium')}>
                            {formatSessionDate(row.lastSessionDate)}
                          </span>
                          {stale ? (
                            <UiTooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex rounded p-0.5 hover:bg-amber-100"
                                  aria-label="Last contact may be outdated"
                                >
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                May not reflect most recent call. Upload latest Fathom to update.
                              </TooltipContent>
                            </UiTooltip>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
