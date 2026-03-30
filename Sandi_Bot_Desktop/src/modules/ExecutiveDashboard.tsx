import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
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
import { SkeletonCard } from '@/components/SkeletonCard';
import FeedbackButton from '../components/FeedbackButton';
import { getDashboardStats, getAllClients } from '@/services/clientService';
import { getAllStageReadiness } from '@/services/stageReadinessService';
import type { Client, DashboardStats } from '@/types';
import { normalizeDisplayStage } from '@/services/clientAdapter';
import { deriveDominantStyle } from '@/config/discCoachingTips';
import { dbSelect, dbExecute } from '@/services/db';
import { cn } from '@/lib/utils';

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

const GLANCE_REC_FILTERS = [
  'all',
  'VALIDATE',
  'GATHER',
  'PAUSE',
  'gone_quiet',
  'pink_flags',
] as const;
type GlanceRecFilter = (typeof GLANCE_REC_FILTERS)[number];

const GLANCE_STAGE_FILTERS = ['all', 'IC', 'C1', 'C2', 'C3', 'C4', 'C5'] as const;
type GlanceStageFilter = (typeof GLANCE_STAGE_FILTERS)[number];

const STAGE_CODE_TO_DISPLAY: Record<Exclude<GlanceStageFilter, 'all'>, string> = {
  IC: 'Initial Contact',
  C1: 'Seeker Connection',
  C2: 'Seeker Clarification',
  C3: 'Possibilities',
  C4: 'Client Career 2.0',
  C5: 'Business Purchase',
};

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
  if (hour < 12) return 'Good morning, Sandi.';
  if (hour <= 17) return 'Good afternoon, Sandi.';
  return 'Good evening, Sandi.';
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

function formatLastUpdatedDisplay(d: Date): string {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  if (sameDay) {
    return `today at ${timeStr}`;
  }
  return `${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} at ${timeStr}`;
}

function formatLocalYyyyMmDd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** ISO week label e.g. 2026-W13 (local calendar). */
function isoWeekStringLocal(d: Date): string {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const week = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
  const y = target.getFullYear();
  return `${y}-W${pad2(week)}`;
}

type WeeklySeekerEntry = {
  week: string;
  contacted?: number;
  responded?: number;
  /** Legacy / field-1 shape from spec */
  count?: number;
};

function parseWeeklySeekerContactsJson(raw: string | null | undefined): WeeklySeekerEntry[] {
  try {
    if (raw == null || String(raw).trim() === '') return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x === 'object') as WeeklySeekerEntry[];
  } catch {
    return [];
  }
}

function entryContacted(e: WeeklySeekerEntry | undefined): number | undefined {
  if (!e) return undefined;
  if (typeof e.contacted === 'number' && !Number.isNaN(e.contacted)) return e.contacted;
  if (typeof e.count === 'number' && !Number.isNaN(e.count)) return e.count;
  return undefined;
}

function entryResponded(e: WeeklySeekerEntry | undefined): number | undefined {
  if (!e || typeof e.responded !== 'number' || Number.isNaN(e.responded)) return undefined;
  return e.responded;
}

function upsertWeeklySeekerEntry(
  arr: WeeklySeekerEntry[],
  week: string,
  patch: Partial<Pick<WeeklySeekerEntry, 'contacted' | 'responded' | 'count'>>
): WeeklySeekerEntry[] {
  const next = arr.map((e) => ({ ...e }));
  const i = next.findIndex((e) => e.week === week);
  if (i === -1) {
    next.push({ week, ...patch });
    return next;
  }
  next[i] = { ...next[i], ...patch };
  return next;
}

/** Monday 00:00 local calendar date (week starts Monday). */
function startOfWeekMondayLocal(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

function startOfMonthLocal(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), 1);
}

function startOfQuarterLocal(ref: Date): Date {
  const q = Math.floor(ref.getMonth() / 3) * 3;
  return new Date(ref.getFullYear(), q, 1);
}

function startOfYearLocal(ref: Date): Date {
  return new Date(ref.getFullYear(), 0, 1);
}

type KpiPeriod = 'weekly' | 'monthly' | 'quarterly' | 'ytd';

const COACH_BOT_INSTALL_LOCAL = new Date(2026, 2, 27);

const PLACEMENT_COUNT_SQL = `SELECT COUNT(*) as count
             FROM clients
             WHERE business_purchase_date IS NOT NULL
               AND outcome_bucket = 'converted'
               AND date(business_purchase_date) >= date($1)
               AND date(business_purchase_date) <= date($2)`;

const C3_SESSION_COUNT_SQL = `SELECT COUNT(*) as count
             FROM coaching_sessions
             WHERE stage = 'C3'
               AND session_date IS NOT NULL
               AND TRIM(session_date) != ''
               AND date(session_date) >= date($1)
               AND date(session_date) <= date($2)`;

function formatUsdWhole(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function timeSavedForPeriod(period: KpiPeriod, ref: Date): { hours: number; dollars: number } {
  switch (period) {
    case 'weekly':
      return { hours: 2, dollars: 300 };
    case 'monthly':
      return { hours: 8, dollars: 1200 };
    case 'quarterly':
      return { hours: 26, dollars: 3900 };
    case 'ytd': {
      const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
      const start = new Date(
        COACH_BOT_INSTALL_LOCAL.getFullYear(),
        COACH_BOT_INSTALL_LOCAL.getMonth(),
        COACH_BOT_INSTALL_LOCAL.getDate()
      );
      if (end < start) return { hours: 0, dollars: 0 };
      const msPerDay = 86400000;
      const diffDays = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
      const weeks = Math.max(1, Math.ceil(diffDays / 7));
      return { hours: weeks * 2, dollars: weeks * 300 };
    }
    default:
      return { hours: 0, dollars: 0 };
  }
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

const GATHER_DISPLAY_STAGES = new Set([
  'Initial Contact',
  'Seeker Connection',
  'Seeker Clarification',
  'Possibilities',
]);

function MorningBriefKpiCard({
  label,
  value,
  sub,
  valueColor,
  footnote,
}: {
  label: string;
  value: string | number;
  sub: string;
  valueColor?: string;
  footnote?: string;
}) {
  return (
    <div
      className="rounded-[12px] bg-white"
      style={{
        border: '1px solid #C8E8E5',
        padding: '16px 20px',
      }}
    >
      <p
        className="uppercase tracking-wide font-medium"
        style={{ fontSize: 11, color: '#7A8F95' }}
      >
        {label}
      </p>
      <p
        className="mt-1 font-bold tabular-nums"
        style={{ fontSize: 28, color: valueColor ?? '#2D4459' }}
      >
        {value}
      </p>
      <p className="mt-1" style={{ fontSize: 12, color: '#7A8F95' }}>
        {sub}
      </p>
      {footnote ? (
        <p className="mt-1.5" style={{ fontSize: 10, color: '#7A8F95' }}>
          {footnote}
        </p>
      ) : null}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<Awaited<ReturnType<typeof getAllClients>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [readinessRows, setReadinessRows] = useState<Awaited<ReturnType<typeof getAllStageReadiness>>>([]);
  const [sessionStatsByClient, setSessionStatsByClient] = useState<
    Map<string, { count: number; lastDate: string | null }>
  >(new Map());
  const [discLetterByProfileClientId, setDiscLetterByProfileClientId] = useState<
    Map<string, 'D' | 'I' | 'S' | 'C'>
  >(() => new Map());
  const [greetingNow, setGreetingNow] = useState(() => Date.now());
  const [kpiPeriod, setKpiPeriod] = useState<KpiPeriod>('ytd');
  const [placementByPeriod, setPlacementByPeriod] = useState({
    weekly: 0,
    monthly: 0,
    quarterly: 0,
    ytd: 0,
  });
  const [c3ByPeriod, setC3ByPeriod] = useState({
    weekly: 0,
    monthly: 0,
    quarterly: 0,
    ytd: 0,
  });
  const [glanceRecFilter, setGlanceRecFilter] = useState<GlanceRecFilter>('all');
  const [glanceStageFilter, setGlanceStageFilter] = useState<GlanceStageFilter>('all');
  const [anchorSeekerLogClientId, setAnchorSeekerLogClientId] = useState<string | null>(null);
  const [weeklySeekerEntries, setWeeklySeekerEntries] = useState<WeeklySeekerEntry[]>([]);
  const [seekerWeeklyEditMode, setSeekerWeeklyEditMode] = useState(true);
  const [seekerContactedInput, setSeekerContactedInput] = useState('');
  const [seekerRespondedInput, setSeekerRespondedInput] = useState('');
  const [seekerLogOkContacted, setSeekerLogOkContacted] = useState(false);
  const [seekerLogOkResponded, setSeekerLogOkResponded] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setGreetingNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!seekerLogOkContacted && !seekerLogOkResponded) return;
    const t = window.setTimeout(() => {
      setSeekerLogOkContacted(false);
      setSeekerLogOkResponded(false);
    }, 3000);
    return () => window.clearTimeout(t);
  }, [seekerLogOkContacted, seekerLogOkResponded]);

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
      const monthStartStr = formatLocalYyyyMmDd(startOfMonthLocal(now));
      const quarterStartStr = formatLocalYyyyMmDd(startOfQuarterLocal(now));
      const yearStartStr = formatLocalYyyyMmDd(startOfYearLocal(now));

      const [
        s,
        c,
        readiness,
        sessionRows,
        discProfileRows,
        placementW,
        placementM,
        placementQ,
        placementY,
        c3W,
        c3M,
        c3Q,
        c3Y,
        anchorSeekerRows,
      ] = await Promise.all([
        getDashboardStats(),
        getAllClients(),
        getAllStageReadiness(),
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
        dbSelect<{ count: number }>(PLACEMENT_COUNT_SQL, [weekStartStr, todayStr]),
        dbSelect<{ count: number }>(PLACEMENT_COUNT_SQL, [monthStartStr, todayStr]),
        dbSelect<{ count: number }>(PLACEMENT_COUNT_SQL, [quarterStartStr, todayStr]),
        dbSelect<{ count: number }>(PLACEMENT_COUNT_SQL, [yearStartStr, todayStr]),
        dbSelect<{ count: number }>(C3_SESSION_COUNT_SQL, [weekStartStr, todayStr]),
        dbSelect<{ count: number }>(C3_SESSION_COUNT_SQL, [monthStartStr, todayStr]),
        dbSelect<{ count: number }>(C3_SESSION_COUNT_SQL, [quarterStartStr, todayStr]),
        dbSelect<{ count: number }>(C3_SESSION_COUNT_SQL, [yearStartStr, todayStr]),
        dbSelect<{ id: string; weekly_seeker_contacts: string | null }>(
          `SELECT id, weekly_seeker_contacts FROM clients ORDER BY datetime(created_at) ASC LIMIT 1`,
          []
        ),
      ]);
      setStats(s);
      setClients(c);
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
        const cDisc = Number(row.natural_c ?? 0);
        if (Math.max(d, i, s, cDisc) <= 0) continue;
        const letter = parseDiscLetter(deriveDominantStyle(d, i, s, cDisc));
        if (letter) discFromProfiles.set(row.client_id, letter);
      }
      setDiscLetterByProfileClientId(discFromProfiles);
      setPlacementByPeriod({
        weekly: Number(placementW[0]?.count ?? 0),
        monthly: Number(placementM[0]?.count ?? 0),
        quarterly: Number(placementQ[0]?.count ?? 0),
        ytd: Number(placementY[0]?.count ?? 0),
      });
      setC3ByPeriod({
        weekly: Number(c3W[0]?.count ?? 0),
        monthly: Number(c3M[0]?.count ?? 0),
        quarterly: Number(c3Q[0]?.count ?? 0),
        ytd: Number(c3Y[0]?.count ?? 0),
      });

      const anchorRow = anchorSeekerRows[0];
      if (anchorRow) {
        setAnchorSeekerLogClientId(anchorRow.id);
        const parsed = parseWeeklySeekerContactsJson(anchorRow.weekly_seeker_contacts);
        setWeeklySeekerEntries(parsed);
        const wk = isoWeekStringLocal(new Date());
        const cur = parsed.find((e) => e.week === wk);
        const contactedN = entryContacted(cur);
        const respondedN = entryResponded(cur);
        setSeekerContactedInput(contactedN !== undefined ? String(contactedN) : '');
        setSeekerRespondedInput(respondedN !== undefined ? String(respondedN) : '');
        const weekComplete =
          contactedN !== undefined && respondedN !== undefined;
        setSeekerWeeklyEditMode(!weekComplete);
      } else {
        setAnchorSeekerLogClientId(null);
        setWeeklySeekerEntries([]);
        setSeekerContactedInput('');
        setSeekerRespondedInput('');
        setSeekerWeeklyEditMode(true);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard load:', err);
      setError(String((err as { message?: string })?.message ?? err ?? 'Failed to load dashboard'));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData(true);
  }, [loadDashboardData]);

  const clientsNeedingAttentionCount = useMemo(() => {
    const byId = new Map(clients.map((cl) => [cl.id, cl]));
    const ids = new Set<string>();
    for (const r of readinessRows) {
      if ((r.outcome_bucket ?? '').toLowerCase() !== 'active') continue;
      const cl = byId.get(r.client_id);
      if (!cl) continue;
      const pink = activePinkFlagCount(pinkFlagsFromClientJson(cl.pink_flags)) > 0;
      if (r.gone_quiet || pink) ids.add(r.client_id);
    }
    return ids.size;
  }, [readinessRows, clients]);

  const greetingSummaryLine =
    clientsNeedingAttentionCount === 0
      ? 'Your pipeline is in good shape today.'
      : `You have ${clientsNeedingAttentionCount} clients needing attention today.`;

  const kpiFunnelCounts = useMemo(() => {
    let validate = 0;
    let gather = 0;
    for (const cl of clients) {
      if ((cl.outcome_bucket ?? '').toLowerCase() !== 'active') continue;
      const display = normalizeDisplayStage(cl.inferred_stage ?? cl.stage);
      if (display === 'Client Career 2.0' || display === 'Business Purchase') validate += 1;
      else if (GATHER_DISPLAY_STAGES.has(display)) gather += 1;
    }
    return { validate, gather };
  }, [clients]);

  const pauseClientCount = useMemo(
    () => clients.filter((cl) => (cl.outcome_bucket ?? '').toLowerCase() === 'paused').length,
    [clients]
  );

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
      goneQuiet: boolean;
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
        goneQuiet: Boolean(r.gone_quiet),
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

  const filteredGlanceRows = useMemo(() => {
    return clientsAtAGlanceRows.filter((row) => {
      if (glanceStageFilter !== 'all' && row.compartment !== STAGE_CODE_TO_DISPLAY[glanceStageFilter]) {
        return false;
      }
      switch (glanceRecFilter) {
        case 'all':
          return true;
        case 'VALIDATE':
        case 'GATHER':
        case 'PAUSE':
          return row.recommendation === glanceRecFilter;
        case 'gone_quiet':
          return row.goneQuiet;
        case 'pink_flags':
          return row.pinkCount > 0;
        default:
          return true;
      }
    });
  }, [clientsAtAGlanceRows, glanceRecFilter, glanceStageFilter]);

  const seekerWeekKey = useMemo(
    () => isoWeekStringLocal(new Date(greetingNow)),
    [greetingNow]
  );

  const currentSeekerWeekEntry = useMemo(
    () => weeklySeekerEntries.find((e) => e.week === seekerWeekKey),
    [weeklySeekerEntries, seekerWeekKey]
  );

  const contactedLogged = entryContacted(currentSeekerWeekEntry);
  const respondedLogged = entryResponded(currentSeekerWeekEntry);
  const seekerWeekLoggedComplete =
    contactedLogged !== undefined && respondedLogged !== undefined;

  const draftContactedNum = Math.max(0, Math.floor(Number(seekerContactedInput) || 0));
  const draftRespondedNum = Math.max(0, Math.floor(Number(seekerRespondedInput) || 0));
  const engagementPreviewPct =
    draftContactedNum > 0
      ? Math.round((draftRespondedNum / draftContactedNum) * 1000) / 10
      : null;

  const persistedEngagementPct =
    contactedLogged != null &&
    contactedLogged > 0 &&
    respondedLogged !== undefined
      ? Math.round((respondedLogged / contactedLogged) * 1000) / 10
      : null;

  const persistWeeklySeekerEntries = useCallback(async (next: WeeklySeekerEntry[]) => {
    if (!anchorSeekerLogClientId) return;
    const json = JSON.stringify(next);
    const now = new Date().toISOString();
    await dbExecute(
      `UPDATE clients SET weekly_seeker_contacts = $1, updated_at = $2 WHERE id = $3`,
      [json, now, anchorSeekerLogClientId]
    );
    setWeeklySeekerEntries(next);
  }, [anchorSeekerLogClientId]);

  const handleLogSeekerContacted = useCallback(async () => {
    if (!anchorSeekerLogClientId) return;
    const n = Math.max(0, Math.floor(Number(seekerContactedInput) || 0));
    const week = isoWeekStringLocal(new Date());
    const next = upsertWeeklySeekerEntry(weeklySeekerEntries, week, {
      count: n,
      contacted: n,
    });
    await persistWeeklySeekerEntries(next);
    setSeekerLogOkContacted(true);
    const merged = next.find((e) => e.week === week);
    if (entryContacted(merged) !== undefined && entryResponded(merged) !== undefined) {
      setSeekerWeeklyEditMode(false);
    }
  }, [
    anchorSeekerLogClientId,
    weeklySeekerEntries,
    seekerContactedInput,
    persistWeeklySeekerEntries,
  ]);

  const handleLogSeekerResponded = useCallback(async () => {
    if (!anchorSeekerLogClientId) return;
    const n = Math.max(0, Math.floor(Number(seekerRespondedInput) || 0));
    const week = isoWeekStringLocal(new Date());
    const next = upsertWeeklySeekerEntry(weeklySeekerEntries, week, { responded: n });
    await persistWeeklySeekerEntries(next);
    setSeekerLogOkResponded(true);
    const merged = next.find((e) => e.week === week);
    if (entryContacted(merged) !== undefined && entryResponded(merged) !== undefined) {
      setSeekerWeeklyEditMode(false);
    }
  }, [
    anchorSeekerLogClientId,
    weeklySeekerEntries,
    seekerRespondedInput,
    persistWeeklySeekerEntries,
  ]);

  const tableShellClass = 'overflow-x-auto rounded-lg border border-[#C8E8E5]';
  const tableHeaderRowClass = 'border-b border-[#C8E8E5] hover:bg-transparent';
  const tableHeadClass =
    'font-semibold border-[#C8E8E5] text-[#2D4459] bg-[#F4F7F8]';
  const tableBodyRowClass = 'border-b border-[#C8E8E5]';

  const timeSavedDisplay = useMemo(
    () => timeSavedForPeriod(kpiPeriod, new Date(greetingNow)),
    [kpiPeriod, greetingNow]
  );

  const selectedPlacementCount = placementByPeriod[kpiPeriod];
  const selectedC3Count = c3ByPeriod[kpiPeriod];

  const placementKpiValue =
    kpiPeriod === 'ytd'
      ? `${selectedPlacementCount} of ${PLACEMENT_TARGET_COUNT}`
      : selectedPlacementCount;

  const placementKpiSub: Record<KpiPeriod, string> = {
    weekly: 'Placements this week',
    monthly: 'Placements this month',
    quarterly: 'Placements this quarter',
    ytd: 'Placements this year vs annual target',
  };

  const c3KpiLabel = kpiPeriod === 'weekly' ? 'C3 This Week' : 'C3 SESSIONS';

  const c3KpiValue =
    kpiPeriod === 'weekly'
      ? `${selectedC3Count} / ${C3_WEEKLY_TARGET}`
      : String(selectedC3Count);

  const c3KpiSub: Record<KpiPeriod, string> = {
    weekly: 'C3 sessions this week vs weekly target',
    monthly: 'C3 sessions this month',
    quarterly: 'C3 sessions this quarter',
    ytd: 'C3 sessions this year',
  };

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

      <div className="flex flex-wrap items-center justify-end gap-3">
        {lastUpdated ? (
          <span className="text-[11px]" style={{ color: '#7A8F95' }}>
            Last updated: {formatLastUpdatedDisplay(lastUpdated)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void loadDashboardData(true);
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 bg-white hover:bg-[#F4F7F8]"
          style={{
            border: '1px solid #C8E8E5',
            color: '#2D4459',
          }}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <section
        className="w-full"
        style={{
          background: '#2D4459',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
        }}
      >
        <h1 className="font-bold text-white" style={{ fontSize: 24 }}>
          {greetingSalutation}
        </h1>
        <p className="mt-1" style={{ fontSize: 14, color: '#C8E8E5' }}>
          {greetingDateLine}
        </p>
        <p className="mt-2" style={{ fontSize: 12, color: '#C8E8E5' }}>
          {greetingSummaryLine}
        </p>
      </section>

      <section
        className="w-full bg-white"
        style={{
          border: '1px solid #C8E8E5',
          borderLeft: '4px solid #C8613F',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
        }}
      >
        <h2 className="font-bold" style={{ fontSize: 14, color: '#2D4459' }}>
          {"This Week's Inputs"}
        </h2>
        <p className="mt-1 text-[12px] leading-snug" style={{ color: '#7A8F95' }}>
          Coach Bot needs your input to calculate these KPIs accurately.
        </p>

        {!anchorSeekerLogClientId ? (
          <p className="mt-3 text-sm" style={{ color: '#7A8F95' }}>
            Add at least one client to your database to save weekly seeker logs.
          </p>
        ) : seekerWeekLoggedComplete && !seekerWeeklyEditMode ? (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm" style={{ color: '#2D4459' }}>
            <span>
              <span className="font-semibold" style={{ color: '#22c55e' }}>
                Week logged ✓
              </span>
              {` — contacted ${contactedLogged}, responded ${respondedLogged}`}
              {persistedEngagementPct !== null ? (
                <>
                  {' ('}
                  <span
                    className="font-semibold"
                    style={{
                      color: persistedEngagementPct >= 65 ? '#22c55e' : '#dc2626',
                    }}
                  >
                    {persistedEngagementPct}% engagement
                  </span>
                  {')'}
                </>
              ) : null}
            </span>
            <button
              type="button"
              className="text-sm font-medium text-[#3BBFBF] underline-offset-2 hover:underline"
              onClick={() => setSeekerWeeklyEditMode(true)}
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-bold" style={{ color: '#2D4459' }} htmlFor="seeker-contacted-week">
                Seekers contacted this week
              </label>
              <input
                id="seeker-contacted-week"
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={seekerContactedInput}
                onChange={(e) => setSeekerContactedInput(e.target.value)}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3BBFBF]/40"
                style={{ borderColor: '#C8E8E5' }}
              />
              <p className="text-[12px]" style={{ color: '#7A8F95' }}>
                target: 22 per week
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleLogSeekerContacted()}
                  disabled={!anchorSeekerLogClientId}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                  style={{ background: '#3BBFBF' }}
                >
                  Log
                </button>
                {seekerLogOkContacted ? (
                  <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                    Logged ✓
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold" style={{ color: '#2D4459' }} htmlFor="seeker-responded-week">
                Seekers who responded
              </label>
              <input
                id="seeker-responded-week"
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={seekerRespondedInput}
                onChange={(e) => setSeekerRespondedInput(e.target.value)}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3BBFBF]/40"
                style={{ borderColor: '#C8E8E5' }}
              />
              <p className="text-[12px]" style={{ color: '#7A8F95' }}>
                target: 65% engagement rate
              </p>
              {engagementPreviewPct !== null ? (
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: engagementPreviewPct >= 65 ? '#22c55e' : '#dc2626',
                  }}
                >
                  This week: {engagementPreviewPct}% engagement
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleLogSeekerResponded()}
                  disabled={!anchorSeekerLogClientId}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                  style={{ background: '#3BBFBF' }}
                >
                  Log
                </button>
                {seekerLogOkResponded ? (
                  <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                    Logged ✓
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#7A8F95' }}>
          Period
        </span>
        {(
          [
            { key: 'weekly' as const, label: 'Weekly' },
            { key: 'monthly' as const, label: 'Monthly' },
            { key: 'quarterly' as const, label: 'Quarterly' },
            { key: 'ytd' as const, label: 'YTD' },
          ] as const
        ).map(({ key, label }) => {
          const active = kpiPeriod === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setKpiPeriod(key)}
              className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              style={{
                border: '1px solid #C8E8E5',
                background: active ? '#C8E8E5' : 'white',
                color: '#2D4459',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MorningBriefKpiCard
          label="Total Clients"
          value={stats.totalClients}
          sub="All records in your database"
        />
        <MorningBriefKpiCard
          label="Validate"
          value={kpiFunnelCounts.validate}
          sub="Active clients in C4 / C5"
        />
        <MorningBriefKpiCard
          label="Gather"
          value={kpiFunnelCounts.gather}
          sub="Active clients in IC through C3"
        />
        <MorningBriefKpiCard
          label="Pause"
          value={pauseClientCount}
          sub="Clients currently paused"
        />
        <MorningBriefKpiCard
          label="TIME SAVED"
          value={`${timeSavedDisplay.hours} hours`}
          sub={`${formatUsdWhole(timeSavedDisplay.dollars)} in coaching time`}
          valueColor="#3BBFBF"
          footnote="vs manual admin baseline"
        />
        <MorningBriefKpiCard
          label="Placement Tracker"
          value={placementKpiValue}
          sub={placementKpiSub[kpiPeriod]}
        />
        <MorningBriefKpiCard
          label={c3KpiLabel}
          value={c3KpiValue}
          sub={c3KpiSub[kpiPeriod]}
        />
      </section>

      <Card className="border-[#C8E8E5] shadow-none">
        <CardHeader>
          <CardTitle className="text-lg" style={{ color: '#2D4459' }}>
            Pipeline Progress — Year to Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={tableShellClass}>
            <Table>
              <TableHeader>
                <TableRow className={tableHeaderRowClass}>
                  <TableHead className={tableHeadClass}>Stage</TableHead>
                  <TableHead className={tableHeadClass}>Clients</TableHead>
                  <TableHead className={tableHeadClass}>Weekly Target</TableHead>
                  <TableHead className={tableHeadClass}>YTD Target</TableHead>
                  <TableHead className={tableHeadClass}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelineYtdProgressRows.map((row) => (
                  <TableRow key={row.stage} className={tableBodyRowClass}>
                    <TableCell className="font-medium" style={{ color: '#2D4459' }}>
                      {row.stage}
                    </TableCell>
                    <TableCell style={{ color: '#2D4459' }}>{row.clientCount}</TableCell>
                    <TableCell style={{ color: '#2D4459' }}>{row.weeklyTarget}</TableCell>
                    <TableCell style={{ color: '#2D4459' }}>{row.ytdTarget}</TableCell>
                    <TableCell>
                      {row.c5 ? (
                        <span style={{ color: '#2D4459' }}>
                          {placementByPeriod.ytd} of {PLACEMENT_TARGET_COUNT}
                        </span>
                      ) : row.clientCount > 0 ? (
                        <span className="font-medium" style={{ color: '#3BBFBF' }}>
                          Active
                        </span>
                      ) : (
                        <span className="font-medium" style={{ color: '#F05F57' }}>
                          Empty
                        </span>
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

      <Card className="w-full max-w-none border-[#C8E8E5] shadow-none">
        <CardHeader>
          <CardTitle className="text-lg" style={{ color: '#2D4459' }}>
            Clients at a Glance
          </CardTitle>
          <CardDescription style={{ color: '#7A8F95' }}>
            Your full pipeline in one view
          </CardDescription>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide font-medium" style={{ color: '#7A8F95' }}>
              View
              <select
                value={glanceRecFilter}
                onChange={(e) => setGlanceRecFilter(e.target.value as GlanceRecFilter)}
                className="normal-case font-normal rounded-[10px] px-3 py-2 text-sm min-w-[160px] bg-white"
                style={{ border: '1px solid #C8E8E5', color: '#2D4459' }}
              >
                <option value="all">All Clients</option>
                <option value="VALIDATE">VALIDATE only</option>
                <option value="GATHER">GATHER only</option>
                <option value="PAUSE">PAUSE only</option>
                <option value="gone_quiet">Gone Quiet only</option>
                <option value="pink_flags">Pink Flags only</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide font-medium" style={{ color: '#7A8F95' }}>
              Stage
              <select
                value={glanceStageFilter}
                onChange={(e) => setGlanceStageFilter(e.target.value as GlanceStageFilter)}
                className="normal-case font-normal rounded-[10px] px-3 py-2 text-sm min-w-[140px] bg-white"
                style={{ border: '1px solid #C8E8E5', color: '#2D4459' }}
              >
                <option value="all">All Stages</option>
                <option value="IC">IC</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
                <option value="C3">C3</option>
                <option value="C4">C4</option>
                <option value="C5">C5</option>
              </select>
            </label>
          </div>
          <p
            className="text-xs rounded-md px-3 py-2 mt-2"
            style={{
              color: '#2D4459',
              background: '#F4F7F8',
              border: '1px solid #C8E8E5',
            }}
          >
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Last Contact dates are based on uploaded Fathom sessions. Upload new call transcripts to
              keep dates current.
            </span>
          </p>
        </CardHeader>
        <CardContent className="w-full max-w-none space-y-0">
          <div className={cn('w-full max-w-none', tableShellClass)}>
            <Table>
              <TableHeader>
                <TableRow className={tableHeaderRowClass}>
                  <TableHead className={cn('min-w-[160px]', tableHeadClass)}>Name</TableHead>
                  <TableHead className={cn('min-w-[180px]', tableHeadClass)}>Compartment</TableHead>
                  <TableHead className={tableHeadClass}>Status</TableHead>
                  <TableHead className={tableHeadClass}>Recommendation</TableHead>
                  <TableHead className={tableHeadClass}>DISC</TableHead>
                  <TableHead className={tableHeadClass}>Sessions</TableHead>
                  <TableHead className={tableHeadClass}>Pink flags</TableHead>
                  <TableHead
                    className={cn('h-auto min-h-10 align-top whitespace-normal py-2', tableHeadClass)}
                  >
                    <span className="block font-medium">Last Contact</span>
                    <span
                      className="mt-0.5 block text-xs font-normal normal-case"
                      style={{ color: '#7A8F95' }}
                    >
                      (click client to update)
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGlanceRows.map((row) => {
                  const recStyle = recommendationStyleMap[row.recommendation];
                  const stale =
                    row.sessionCount > 0 &&
                    row.lastSessionDate != null &&
                    isStaleFathomSessionDate(row.lastSessionDate);
                  return (
                    <TableRow key={row.id} className={tableBodyRowClass}>
                      <TableCell
                        className="min-w-[160px] font-semibold"
                        style={{ color: '#2D4459' }}
                      >
                        {row.name}
                      </TableCell>
                      <TableCell className="min-w-[180px]" style={{ color: '#2D4459' }}>
                        {row.compartment}
                      </TableCell>
                      <TableCell style={{ color: '#2D4459' }}>{row.statusLabel}</TableCell>
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
                              row.discLetter === 'I' ? 'text-slate-900' : 'text-white'
                            )}
                            style={{
                              backgroundColor: DISC_LETTER_COLORS[row.discLetter],
                            }}
                          >
                            {row.discLetter}
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: '#7A8F95' }}>
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="tabular-nums" style={{ color: '#2D4459' }}>
                            {row.sessionCount}
                          </span>
                          {row.sessionCount === 0 ? (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 px-1 py-0 text-amber-800"
                              title="No Fathom sessions uploaded"
                            >
                              <AlertTriangle className="h-3 w-3" />
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
                          <span className="text-sm" style={{ color: '#7A8F95' }}>
                            No sessions yet
                          </span>
                        ) : row.lastSessionDate ? (
                          <span className="inline-flex flex-wrap items-center gap-1">
                            <span
                              className={cn(stale && 'font-medium')}
                              style={stale ? { color: '#2D4459' } : { color: '#2D4459' }}
                            >
                              {formatSessionDate(row.lastSessionDate)}
                            </span>
                            {stale ? (
                              <UiTooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex rounded p-0.5 hover:bg-[#F4F7F8]"
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
                          <span className="text-sm" style={{ color: '#7A8F95' }}>
                            —
                          </span>
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
