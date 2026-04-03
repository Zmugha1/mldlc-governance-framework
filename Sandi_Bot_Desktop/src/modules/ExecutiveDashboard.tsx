import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { RefreshCw, Loader2, AlertTriangle, Info } from 'lucide-react';
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
import UATFeedback from '@/components/UATFeedback';
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

/** Last contact on or after this ISO day displays as a real date; older/null → "Not yet contacted". */
const GLANCE_LAST_CONTACT_MIN_DAY = '2024-01-01';

function isValidGlanceLastContact(raw: string | null | undefined): boolean {
  if (raw == null || String(raw).trim() === '') return false;
  const day = String(raw).trim().slice(0, 10);
  return day >= GLANCE_LAST_CONTACT_MIN_DAY;
}

function clientLastContactDateField(cl: Client): string | null {
  const raw = (cl as Client & { last_contact_date?: string | null }).last_contact_date;
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).trim();
}

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

type GlancePipelineCode = Exclude<GlanceStageFilter, 'all'>;

/** Compartment column: C-code from DB → "C4 · Initial Validation". */
const GLANCE_COMPARTMENT_DISPLAY: Record<GlancePipelineCode, string> = {
  IC: 'IC · Initial Contact',
  C1: 'C1 · Seeker Connection',
  C2: 'C2 · Seeker Clarification',
  C3: 'C3 · Possibilities',
  C4: 'C4 · Initial Validation',
  C5: 'C5 · Continued Validation',
};

/** Gone-quiet thresholds by pipeline code (Clients at a Glance). */
const GLANCE_GONE_QUIET_DAYS_BY_CODE: Record<GlancePipelineCode, number> = {
  IC: 14,
  C1: 21,
  C2: 14,
  C3: 14,
  C4: 60,
  C5: 60,
};

function goneQuietThresholdDaysForGlanceCode(code: GlancePipelineCode): number {
  return GLANCE_GONE_QUIET_DAYS_BY_CODE[code] ?? 14;
}

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

/** Whole calendar days since `isoOrDate` (local midnight), or null if missing/invalid. */
function daysSinceCalendarLocal(isoOrDate: string | null | undefined): number | null {
  if (isoOrDate == null || String(isoOrDate).trim() === '') return null;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const t1 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((t0.getTime() - t1.getTime()) / 86_400_000);
}

/** Switch to Coaching Actions (sidebar); also dispatches a custom event for future listeners. */
function navigateToCoachingActions(): void {
  window.dispatchEvent(
    new CustomEvent('coachbot:navigate-module', {
      bubbles: true,
      detail: { module: 'coaching' as const },
    })
  );
  const rail = document.querySelector('.fixed.inset-y-0.left-0');
  const nav = rail?.querySelector('nav .space-y-1');
  const btns = nav?.querySelectorAll(':scope > button');
  if (btns && btns.length >= 4) {
    (btns[3] as HTMLButtonElement).click();
  }
}

const NEED_ATTENTION_GONE_QUIET_DAYS: Record<
  'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5',
  number
> = {
  IC: 14,
  C1: 21,
  C2: 14,
  C3: 14,
  C4: 60,
  C5: 60,
};

/** Gone quiet SQL thresholds (matches dashboard COUNT query). */
const GONE_QUIET_LAST_CONTACT_THRESHOLDS: Record<
  'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5',
  number
> = {
  IC: 14,
  C1: 21,
  C2: 14,
  C3: 14,
  C4: 60,
  C5: 60,
};

type NeedAttentionKind = 'at_risk' | 'pink_flag' | 'gone_quiet';

type NeedAttentionEntry = {
  clientId: string;
  name: string;
  kind: NeedAttentionKind;
  stageCode: string;
  reasonLine: string;
  discLetter: 'D' | 'I' | 'S' | 'C' | null;
};

function clientLastContactDate(cl: Client): string | null {
  const raw = (cl as Client & { last_contact_date?: string | null }).last_contact_date;
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).trim();
}

function stagePipelineCodeForAttention(cl: Client): keyof typeof NEED_ATTENTION_GONE_QUIET_DAYS {
  const raw = (cl.inferred_stage ?? '').trim().toUpperCase();
  if (
    raw === 'IC' ||
    raw === 'C1' ||
    raw === 'C2' ||
    raw === 'C3' ||
    raw === 'C4' ||
    raw === 'C5'
  ) {
    return raw;
  }
  const d = normalizeDisplayStage(cl.inferred_stage ?? cl.stage);
  const map: Record<string, keyof typeof NEED_ATTENTION_GONE_QUIET_DAYS> = {
    'Initial Contact': 'IC',
    'Seeker Connection': 'C1',
    'Seeker Clarification': 'C2',
    Possibilities: 'C3',
    'Coach Client Collaboration': 'C3',
    'Client Career 2.0': 'C4',
    'Business Purchase': 'C5',
  };
  return map[d] ?? 'IC';
}

function needAttentionBorderColor(kind: NeedAttentionKind): string {
  if (kind === 'at_risk') return '#2D4459';
  if (kind === 'pink_flag') return '#F05F57';
  return '#C8613F';
}

function needAttentionSignalLabel(kind: NeedAttentionKind): string {
  if (kind === 'at_risk') return 'At Risk';
  if (kind === 'pink_flag') return 'Pink Flag';
  return 'Gone Quiet';
}

/** Switch to Client Intelligence and stash name for auto-select (read in Client Intelligence). */
function navigateToClientIntelligence(clientName: string): void {
  try {
    localStorage.setItem('selected_client_name', clientName);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent('coachbot:navigate-module', {
      bubbles: true,
      detail: { module: 'clients' as const },
    })
  );
  const rail = document.querySelector('.fixed.inset-y-0.left-0');
  const nav = rail?.querySelector('nav .space-y-1');
  const btns = nav?.querySelectorAll(':scope > button');
  if (btns && btns.length >= 3) {
    (btns[2] as HTMLButtonElement).click();
  }
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

/** Fallback when `user_preferences.install_date` is null (local midnight). */
const FALLBACK_INSTALL_DATE = new Date(2026, 2, 27);

type TimeSavedPrefs = {
  installDate: Date;
  hourlyRate: number;
  weeklyHoursSaved: number;
  installDateWasNull: boolean;
};

function roundTo1Decimal(n: number): number {
  return Math.round(n * 10) / 10;
}

function parseUserPrefsInstallDate(
  raw: string | null | undefined
): { date: Date; wasNull: boolean } {
  if (raw == null || String(raw).trim() === '') {
    return { date: new Date(FALLBACK_INSTALL_DATE), wasNull: true };
  }
  const s = String(raw).trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return { date: new Date(y, mo, d), wasNull: false };
  }
  const t = new Date(raw);
  if (!Number.isNaN(t.getTime())) {
    return {
      date: new Date(t.getFullYear(), t.getMonth(), t.getDate()),
      wasNull: false,
    };
  }
  return { date: new Date(FALLBACK_INSTALL_DATE), wasNull: true };
}

function weeksSinceInstallRounded(ref: Date, installDate: Date): number {
  const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const start = new Date(
    installDate.getFullYear(),
    installDate.getMonth(),
    installDate.getDate()
  );
  if (end < start) return 0;
  const diffDays = (end.getTime() - start.getTime()) / 86_400_000;
  return roundTo1Decimal(diffDays / 7);
}

function timeSavedForPeriod(
  period: KpiPeriod,
  ref: Date,
  prefs: TimeSavedPrefs
): { hours: number; dollars: number } {
  const h = prefs.weeklyHoursSaved;
  const r = prefs.hourlyRate;
  const weeks = weeksSinceInstallRounded(ref, prefs.installDate);

  switch (period) {
    case 'weekly': {
      const hours = roundTo1Decimal(h);
      return { hours, dollars: Math.round(h * r) };
    }
    case 'monthly': {
      const hours = roundTo1Decimal(h * 4.33);
      return { hours, dollars: Math.round(h * 4.33 * r) };
    }
    case 'quarterly': {
      const hours = roundTo1Decimal(h * 13);
      return { hours, dollars: Math.round(h * 13 * r) };
    }
    case 'ytd': {
      const hours = roundTo1Decimal(weeks * h);
      return { hours, dollars: Math.round(weeks * h * r) };
    }
    default:
      return { hours: 0, dollars: 0 };
  }
}

/** Morning Brief Time Saved card — week 1 baseline floor. */
const TIME_SAVED_CARD_MIN_HOURS = 2;
const TIME_SAVED_CARD_MIN_DOLLARS = 300;

function formatTimeSavedHours(h: number): string {
  const x = roundTo1Decimal(h);
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

function formatTimeSavedInstallFootnote(prefs: TimeSavedPrefs): string {
  if (prefs.installDateWasNull) {
    return 'Install date: Mar 27 2026';
  }
  const d = prefs.installDate;
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `since ${month} ${d.getDate()} ${d.getFullYear()}`;
}

const PLACEMENT_COUNT_SQL = `SELECT COUNT(*) as count
             FROM clients
             WHERE business_purchase_date IS NOT NULL
               AND outcome_bucket = 'converted'
               AND date(business_purchase_date) >= date($1)
               AND date(business_purchase_date) <= date($2)`;

function formatUsdWhole(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

const PLACEMENT_TARGET_COUNT = 11;
const GREETING_REVENUE_GOAL = 300_000;
const DEFAULT_GREETING_PLACEMENT_REVENUE = 28_000;

function parseGreetingPlacementRevenue(raw: string | null | undefined): number {
  if (raw == null || String(raw).trim() === '') return DEFAULT_GREETING_PLACEMENT_REVENUE;
  const n = Number(String(raw).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_GREETING_PLACEMENT_REVENUE;
}

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
  infoTooltip,
}: {
  label: string;
  value: string | number;
  sub: string;
  valueColor?: string;
  footnote?: string;
  infoTooltip?: string;
}) {
  return (
    <div
      className="rounded-[12px] bg-white"
      style={{
        border: '1px solid #C8E8E5',
        padding: '16px 20px',
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <p
          className="uppercase tracking-wide font-medium"
          style={{ fontSize: 11, color: '#7A8F95' }}
        >
          {label}
        </p>
        {infoTooltip ? (
          <UiTooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="-mr-0.5 shrink-0 rounded p-0.5 text-[#7A8F95] hover:text-[#2D4459] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8E8E5]"
                aria-label={`About ${label}`}
              >
                <Info className="h-3.5 w-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-xs">
              {infoTooltip}
            </TooltipContent>
          </UiTooltip>
        ) : null}
      </div>
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
        <p className="mt-1.5 whitespace-pre-line" style={{ fontSize: 10, color: '#7A8F95' }}>
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
  const [glanceAtTableByClientId, setGlanceAtTableByClientId] = useState<
    Map<string, { last_contact_date: string | null; session_count: number }>
  >(() => new Map());
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
  const [glanceRecFilter, setGlanceRecFilter] = useState<GlanceRecFilter>('all');
  const [glanceStageFilter, setGlanceStageFilter] = useState<GlanceStageFilter>('all');
  const [anchorSeekerLogClientId, setAnchorSeekerLogClientId] = useState<string | null>(null);
  const [weeklySeekerEntries, setWeeklySeekerEntries] = useState<WeeklySeekerEntry[]>([]);
  const [seekerWeeklyEditMode, setSeekerWeeklyEditMode] = useState(true);
  const [seekerContactedInput, setSeekerContactedInput] = useState('');
  const [seekerRespondedInput, setSeekerRespondedInput] = useState('');
  const [seekerWeekSaveOk, setSeekerWeekSaveOk] = useState(false);
  const [goneQuietAttentionCount, setGoneQuietAttentionCount] = useState(0);
  const [pinkNeedResponseCount, setPinkNeedResponseCount] = useState(0);
  const [_highPriorityStaleCount, setHighPriorityStaleCount] = useState(0);
  const [_sessionsScheduledNullCount, setSessionsScheduledNullCount] = useState(0);
  const [timeSavedPrefs, setTimeSavedPrefs] = useState<TimeSavedPrefs>(() => ({
    installDate: new Date(FALLBACK_INSTALL_DATE),
    hourlyRate: 150,
    weeklyHoursSaved: 2,
    installDateWasNull: true,
  }));

  useEffect(() => {
    const id = window.setInterval(() => setGreetingNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!seekerWeekSaveOk) return;
    const t = window.setTimeout(() => setSeekerWeekSaveOk(false), 3000);
    return () => window.clearTimeout(t);
  }, [seekerWeekSaveOk]);

  const morningBriefShellRef = useRef<HTMLDivElement>(null);

  /** App.tsx ModuleHeader subtitle; hide so only in-module copy shows. */
  useLayoutEffect(() => {
    if (loading || error || !stats) return;
    const root = morningBriefShellRef.current;
    if (!root?.parentElement) return;
    const legacyDesc = root.parentElement.querySelector(
      ':scope > div.mb-6 > p.mt-1'
    ) as HTMLElement | null;
    if (!legacyDesc?.textContent?.includes('Real-time KPIs')) return;
    const prev = legacyDesc.style.display;
    legacyDesc.style.display = 'none';
    return () => {
      if (document.body.contains(legacyDesc)) {
        legacyDesc.style.display = prev;
      }
    };
  }, [loading, error, stats]);

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
        pinkFlagWeekClients,
        sessionsNullSchedRows,
        anchorSeekerRows,
        userPrefsRows,
        glanceAtTableRows,
        goneQuietCountRows,
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
        dbSelect<{ client_id: string }>(
          `SELECT DISTINCT client_id FROM intervention_logs
           WHERE signal_type = 'pink_flag'
             AND date(COALESCE(created_at, signal_date)) >= date($1)
             AND date(COALESCE(created_at, signal_date)) <= date($2)`,
          [weekStartStr, todayStr]
        ),
        dbSelect<{ count: number }>(
          `SELECT COUNT(*) as count FROM coaching_sessions
           WHERE session_date IS NOT NULL AND TRIM(session_date) != ''
             AND date(session_date) >= date($1)
             AND date(session_date) <= date($2)
             AND session_scheduled IS NULL`,
          [weekStartStr, todayStr]
        ),
        dbSelect<{ id: string; weekly_seeker_contacts: string | null }>(
          `SELECT id, weekly_seeker_contacts FROM clients ORDER BY datetime(created_at) ASC LIMIT 1`,
          []
        ),
        dbSelect<{
          install_date: string | null;
          coach_hourly_rate: number | null;
          weekly_hours_saved: number | null;
        }>(
          `SELECT install_date, coach_hourly_rate, weekly_hours_saved
           FROM user_preferences
           WHERE id = 'singleton'`,
          []
        ),
        dbSelect<{
          id: string;
          name: string;
          inferred_stage: string | null;
          outcome_bucket: string | null;
          pink_flags: string | null;
          last_contact_date: string | null;
          session_count: number;
        }>(
          `SELECT c.id, c.name, c.inferred_stage,
                  c.outcome_bucket, c.pink_flags,
                  c.last_contact_date,
                  COUNT(cs.id) as session_count
           FROM clients c
           LEFT JOIN coaching_sessions cs ON cs.client_id = c.id
           WHERE c.outcome_bucket != 'inactive'
           GROUP BY c.id
           ORDER BY c.name`,
          []
        ),
        dbSelect<{ gone_quiet_count: number }>(
          `SELECT COUNT(*) as gone_quiet_count
           FROM clients c
           WHERE c.outcome_bucket = 'active'
           AND (
             (c.inferred_stage = 'IC'
               AND c.last_contact_date < date('now', '-14 days'))
             OR
             (c.inferred_stage = 'C1'
               AND c.last_contact_date < date('now', '-21 days'))
             OR
             (c.inferred_stage = 'C2'
               AND c.last_contact_date < date('now', '-14 days'))
             OR
             (c.inferred_stage = 'C3'
               AND c.last_contact_date < date('now', '-14 days'))
             OR
             (c.inferred_stage = 'C4'
               AND c.last_contact_date < date('now', '-60 days'))
             OR
             (c.inferred_stage = 'C5'
               AND c.last_contact_date < date('now', '-60 days'))
           )`,
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

      const glanceMap = new Map<string, { last_contact_date: string | null; session_count: number }>();
      for (const gRow of glanceAtTableRows) {
        const rawLc = gRow.last_contact_date;
        const lc =
          rawLc != null && String(rawLc).trim() !== '' ? String(rawLc).trim() : null;
        glanceMap.set(gRow.id, {
          last_contact_date: lc,
          session_count: Number(gRow.session_count ?? 0),
        });
      }
      setGlanceAtTableByClientId(glanceMap);

      setGoneQuietAttentionCount(Number(goneQuietCountRows[0]?.gone_quiet_count ?? 0));

      const pinkWeekSet = new Set(
        pinkFlagWeekClients.map((row) => row.client_id).filter(Boolean)
      );
      let pinkNeed = 0;
      for (const cl of c) {
        if ((cl.outcome_bucket ?? '').toLowerCase() !== 'active') continue;
        const n = activePinkFlagCount(pinkFlagsFromClientJson(cl.pink_flags));
        if (n === 0) continue;
        if (pinkWeekSet.has(cl.id)) continue;
        pinkNeed += n;
      }
      setPinkNeedResponseCount(pinkNeed);

      let hpStale = 0;
      for (const cl of c) {
        if ((cl.outcome_bucket ?? '').toLowerCase() !== 'active') continue;
        const code = (cl.inferred_stage ?? '').trim().toUpperCase();
        if (code !== 'C3' && code !== 'C4') continue;
        const lastSess = sessMap.get(cl.id)?.lastDate ?? null;
        const trimmed = lastSess != null ? String(lastSess).trim() : '';
        const days = daysSinceCalendarLocal(trimmed || null);
        if (!trimmed || days === null || days > 14) hpStale += 1;
      }
      setHighPriorityStaleCount(hpStale);

      setSessionsScheduledNullCount(Number(sessionsNullSchedRows[0]?.count ?? 0));

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
      const prefRow = userPrefsRows[0];
      const parsedInstall = parseUserPrefsInstallDate(prefRow?.install_date ?? null);
      const hourlyRate =
        prefRow?.coach_hourly_rate != null &&
        Number.isFinite(Number(prefRow.coach_hourly_rate))
          ? Number(prefRow.coach_hourly_rate)
          : 150;
      const weeklyHoursSaved =
        prefRow?.weekly_hours_saved != null &&
        Number.isFinite(Number(prefRow.weekly_hours_saved))
          ? Number(prefRow.weekly_hours_saved)
          : 2.0;
      setTimeSavedPrefs({
        installDate: parsedInstall.date,
        hourlyRate,
        weeklyHoursSaved,
        installDateWasNull: parsedInstall.wasNull,
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

  const clientsAtAGlanceRows = useMemo(() => {
    const byId = new Map(clients.map((cl) => [cl.id, cl]));
    type Row = {
      id: string;
      name: string;
      compartment: string;
      glanceStageCode: GlancePipelineCode;
      statusLabel: string;
      recommendation: 'VALIDATE' | 'GATHER' | 'PAUSE';
      discLetter: 'D' | 'I' | 'S' | 'C' | null;
      sessionCount: number;
      lastContactDate: string | null;
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
      const glance = glanceAtTableByClientId.get(r.client_id);
      const sessionCount = glance?.session_count ?? sess?.count ?? 0;
      const lastContactDate =
        glance !== undefined
          ? glance.last_contact_date
          : clientLastContactDateField(cl);
      const glanceCode = stagePipelineCodeForAttention(cl) as GlancePipelineCode;
      list.push({
        id: r.client_id,
        name: r.client_name,
        compartment: GLANCE_COMPARTMENT_DISPLAY[glanceCode],
        glanceStageCode: glanceCode,
        statusLabel: outcomeBucketDisplay(r.outcome_bucket),
        recommendation: rec,
        discLetter: glanceDiscLetter(cl, discLetterByProfileClientId.get(r.client_id)),
        sessionCount,
        lastContactDate,
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
  }, [
    readinessRows,
    clients,
    sessionStatsByClient,
    glanceAtTableByClientId,
    discLetterByProfileClientId,
  ]);

  const filteredGlanceRows = useMemo(() => {
    return clientsAtAGlanceRows.filter((row) => {
      if (glanceStageFilter !== 'all' && row.glanceStageCode !== glanceStageFilter) {
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

  /** Matches At Risk / Gone Quiet / Pink Flags queries on active clients (priority: at risk → pink → gone quiet). */
  const needsAttentionOrdered = useMemo((): NeedAttentionEntry[] => {
    const isActive = (cl: Client) => (cl.outcome_bucket ?? '').toLowerCase() === 'active';

    const atRisk: NeedAttentionEntry[] = [];
    const pinks: NeedAttentionEntry[] = [];
    const goneQ: NeedAttentionEntry[] = [];

    for (const cl of clients) {
      if (!isActive(cl)) continue;
      const code = stagePipelineCodeForAttention(cl);
      const lc = clientLastContactDate(cl);
      const contactDays = lc ? daysSinceCalendarLocal(lc) : null;
      if (contactDays === null) continue;
      const th = NEED_ATTENTION_GONE_QUIET_DAYS[code];
      if (contactDays <= th) continue;

      const earlyStage =
        code === 'IC' ||
        code === 'C1' ||
        code === 'C2' ||
        code === 'C3';
      const reasonLine = earlyStage
        ? `No session in ${contactDays}d — follow up needed`
        : `No contact in ${contactDays}d — validation check needed`;

      atRisk.push({
        clientId: cl.id,
        name: cl.name,
        kind: 'at_risk',
        stageCode: code,
        reasonLine,
        discLetter: glanceDiscLetter(cl, discLetterByProfileClientId.get(cl.id)),
      });
    }

    for (const cl of clients) {
      if (!isActive(cl)) continue;
      const pf = cl.pink_flags;
      if (pf == null || String(pf).trim() === '' || String(pf).trim() === '[]') continue;
      const n = activePinkFlagCount(pinkFlagsFromClientJson(pf));
      if (n === 0) continue;
      pinks.push({
        clientId: cl.id,
        name: cl.name,
        kind: 'pink_flag',
        stageCode: stagePipelineCodeForAttention(cl),
        reasonLine: `${n} active pink flags`,
        discLetter: glanceDiscLetter(cl, discLetterByProfileClientId.get(cl.id)),
      });
    }

    for (const cl of clients) {
      if (cl.outcome_bucket !== 'active') continue;
      const lc = clientLastContactDate(cl);
      if (!lc) continue;
      const days = daysSinceCalendarLocal(lc);
      if (days === null) continue;
      const code = stagePipelineCodeForAttention(cl);
      const th = GONE_QUIET_LAST_CONTACT_THRESHOLDS[code as keyof typeof GONE_QUIET_LAST_CONTACT_THRESHOLDS];
      if (th === undefined) continue;
      if (days <= th) continue;
      goneQ.push({
        clientId: cl.id,
        name: cl.name,
        kind: 'gone_quiet',
        stageCode: code,
        reasonLine: `No contact in ${days} days`,
        discLetter: glanceDiscLetter(cl, discLetterByProfileClientId.get(cl.id)),
      });
    }

    const byName = (a: NeedAttentionEntry, b: NeedAttentionEntry) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    atRisk.sort(byName);
    pinks.sort(byName);
    goneQ.sort(byName);

    const used = new Set<string>();
    const ordered: NeedAttentionEntry[] = [];
    const push = (e: NeedAttentionEntry) => {
      if (used.has(e.clientId)) return;
      used.add(e.clientId);
      ordered.push(e);
    };
    for (const e of atRisk) push(e);
    for (const e of pinks) push(e);
    for (const e of goneQ) push(e);
    return ordered;
  }, [clients, discLetterByProfileClientId]);

  const greetingPlacementRevenueYtd = useMemo(() => {
    let sum = 0;
    for (const cl of clients) {
      const ext = cl as Client & {
        business_purchase_date?: string | null;
        placement_revenue?: string | null;
      };
      if (ext.business_purchase_date == null || String(ext.business_purchase_date).trim() === '') {
        continue;
      }
      sum += parseGreetingPlacementRevenue(ext.placement_revenue);
    }
    return sum;
  }, [clients]);

  const atRiskGreetingCount = useMemo(
    () => needsAttentionOrdered.filter((e) => e.kind === 'at_risk').length,
    [needsAttentionOrdered]
  );

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

  type GreetingPillSpec = {
    id: string;
    label: string;
    dotColor: string;
    dotRing?: boolean;
  };

  const greetingSignalPills = useMemo((): GreetingPillSpec[] => {
    const pills: GreetingPillSpec[] = [];
    if (goneQuietAttentionCount > 0) {
      pills.push({
        id: 'gq',
        dotColor: '#C8613F',
        label: `${goneQuietAttentionCount} gone quiet`,
      });
    }
    if (pinkNeedResponseCount > 0) {
      pills.push({
        id: 'pink',
        dotColor: '#F05F57',
        label: `${pinkNeedResponseCount} pink flags`,
      });
    }
    if (anchorSeekerLogClientId && !seekerWeekLoggedComplete) {
      pills.push({
        id: 'weekly',
        dotColor: '#C8E8E5',
        label: 'Weekly input needed',
      });
    }
    if (atRiskGreetingCount > 0) {
      pills.push({
        id: 'atrisk',
        dotColor: '#2D4459',
        dotRing: true,
        label: `${atRiskGreetingCount} at risk`,
      });
    }
    return pills;
  }, [
    goneQuietAttentionCount,
    pinkNeedResponseCount,
    anchorSeekerLogClientId,
    seekerWeekLoggedComplete,
    atRiskGreetingCount,
  ]);

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

  const handleSaveSeekerWeek = useCallback(async () => {
    if (!anchorSeekerLogClientId) return;
    const contactedN = Math.max(0, Math.floor(Number(seekerContactedInput) || 0));
    const respondedN = Math.max(0, Math.floor(Number(seekerRespondedInput) || 0));
    const week = isoWeekStringLocal(new Date());
    const next = upsertWeeklySeekerEntry(weeklySeekerEntries, week, {
      count: contactedN,
      contacted: contactedN,
      responded: respondedN,
    });
    await persistWeeklySeekerEntries(next);
    setSeekerWeekSaveOk(true);
    const merged = next.find((e) => e.week === week);
    if (entryContacted(merged) !== undefined && entryResponded(merged) !== undefined) {
      setSeekerWeeklyEditMode(false);
    }
  }, [
    anchorSeekerLogClientId,
    weeklySeekerEntries,
    seekerContactedInput,
    seekerRespondedInput,
    persistWeeklySeekerEntries,
  ]);

  const tableShellClass = 'overflow-x-auto rounded-lg border border-[#C8E8E5]';
  const tableHeaderRowClass = 'border-b border-[#C8E8E5] hover:bg-transparent';
  const tableHeadClass =
    'font-semibold border-[#C8E8E5] text-[#2D4459] bg-[#F4F7F8]';
  const tableBodyRowClass = 'border-b border-[#C8E8E5]';

  const timeSavedRaw = useMemo(
    () => timeSavedForPeriod(kpiPeriod, new Date(greetingNow), timeSavedPrefs),
    [kpiPeriod, greetingNow, timeSavedPrefs]
  );

  const timeSavedInstallFootnote = useMemo(
    () => formatTimeSavedInstallFootnote(timeSavedPrefs),
    [timeSavedPrefs]
  );

  const timeSavedCard = useMemo(() => {
    const raw = timeSavedRaw;
    if (raw.hours < TIME_SAVED_CARD_MIN_HOURS) {
      return {
        hours: TIME_SAVED_CARD_MIN_HOURS,
        dollars: TIME_SAVED_CARD_MIN_DOLLARS,
        firstWeekBaseline: true,
      };
    }
    return {
      hours: raw.hours,
      dollars: Math.max(raw.dollars, TIME_SAVED_CARD_MIN_DOLLARS),
      firstWeekBaseline: false,
    };
  }, [timeSavedRaw]);

  const timeSavedCardFootnote = useMemo(() => {
    if (timeSavedCard.firstWeekBaseline) {
      return 'First week — tracking from Mar 27 2026';
    }
    return timeSavedInstallFootnote;
  }, [timeSavedCard.firstWeekBaseline, timeSavedInstallFootnote]);

  const selectedPlacementCount = placementByPeriod[kpiPeriod];

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

  const greetingMoneyFmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const ytdPlacementsForGreeting = placementByPeriod.ytd;
  const placementPulseBarPct = Math.min(
    100,
    (ytdPlacementsForGreeting / PLACEMENT_TARGET_COUNT) * 100
  );

  return (
    <div ref={morningBriefShellRef} className="space-y-6">
      <FeedbackButton pageName="Executive Dashboard" />
      <p className="-mt-2 text-sm leading-snug" style={{ color: '#7A8F95' }}>
        Your daily coaching command center
      </p>

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
          background: 'linear-gradient(180deg, #2D4459 0%, #1a2d3d 100%)',
          borderRadius: 16,
          padding: '32px 36px',
          marginBottom: 24,
          minHeight: 160,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1
              className="font-bold text-white"
              style={{ fontSize: 28, letterSpacing: '-0.5px' }}
            >
              {greetingSalutation}
            </h1>
            <p style={{ fontSize: 14, color: '#C8E8E5', marginTop: 4 }}>{greetingDateLine}</p>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              padding: '12px 20px',
              textAlign: 'center',
            }}
          >
            <p className="uppercase" style={{ fontSize: 10, color: '#fff', opacity: 0.7 }}>
              PLACEMENTS
            </p>
            <p className="font-bold tabular-nums text-white" style={{ fontSize: 24 }}>
              {ytdPlacementsForGreeting} / {PLACEMENT_TARGET_COUNT}
            </p>
            <p style={{ fontSize: 11, color: '#3BBFBF' }}>
              {greetingMoneyFmt.format(greetingPlacementRevenueYtd)} of{' '}
              {greetingMoneyFmt.format(GREETING_REVENUE_GOAL)}
            </p>
            <div
              className="mt-2 w-full overflow-hidden rounded-full"
              style={{ height: 3, background: 'rgba(255,255,255,0.2)' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${placementPulseBarPct}%`,
                  background: '#3BBFBF',
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0' }} />
        {greetingSignalPills.length === 0 ? (
          <p style={{ fontSize: 14, color: '#C8E8E5' }}>
            ✓ Your pipeline is in good shape. Nothing urgent today.
          </p>
        ) : (
          <div>
            <p
              className="uppercase"
              style={{
                fontSize: 10,
                color: '#C8E8E5',
                opacity: 0.7,
                marginBottom: 8,
              }}
            >
              TODAY&apos;S FOCUS
            </p>
            <div className="flex flex-wrap items-center">
              {greetingSignalPills.map((pill) => (
                <div
                  key={pill.id}
                  className="inline-flex items-center gap-1.5"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 20,
                    padding: '4px 12px',
                    fontSize: 12,
                    color: '#fff',
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <span
                    className="inline-block shrink-0 rounded-full"
                    style={{
                      width: 6,
                      height: 6,
                      background: pill.dotColor,
                      ...(pill.dotRing ? { boxShadow: '0 0 0 1px #fff' } : {}),
                    }}
                    aria-hidden
                  />
                  {pill.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {needsAttentionOrdered.length > 0 ? (
        <section className="w-full">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-bold" style={{ fontSize: 14, color: '#2D4459' }}>
              Needs Attention
            </h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
              style={{ background: '#F05F57' }}
            >
              {needsAttentionOrdered.length}
            </span>
          </div>
          <div>
            {needsAttentionOrdered.slice(0, 3).map((entry) => {
              const border = needAttentionBorderColor(entry.kind);
              const letter = entry.discLetter;
              const discFill = letter
                ? `color-mix(in srgb, ${DISC_LETTER_COLORS[letter]} 20%, transparent)`
                : 'rgba(122, 143, 149, 0.2)';
              const discInk = letter ? DISC_LETTER_COLORS[letter] : '#2D4459';
              return (
                <div
                  key={`${entry.kind}:${entry.clientId}`}
                  className="flex flex-row items-center bg-white"
                  style={{
                    border: '1px solid #C8E8E5',
                    borderRadius: 12,
                    borderLeft: `4px solid ${border}`,
                    padding: '14px 18px',
                    marginBottom: 8,
                    gap: 14,
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: discFill, color: discInk }}
                  >
                    {letter ?? '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold" style={{ fontSize: 14, color: '#2D4459' }}>
                        {entry.name}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                        style={{ background: border }}
                      >
                        {needAttentionSignalLabel(entry.kind)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: '#F4F7F8', color: '#2D4459' }}
                      >
                        {entry.stageCode}
                      </span>
                    </div>
                    <p className="mt-1" style={{ fontSize: 12, color: '#7A8F95' }}>
                      {entry.reasonLine}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 font-bold text-white transition-opacity hover:opacity-90"
                    style={{
                      background: '#3BBFBF',
                      borderRadius: 8,
                      fontSize: 12,
                      padding: '6px 14px',
                    }}
                    onClick={() => navigateToClientIntelligence(entry.name)}
                  >
                    Open Client
                  </button>
                </div>
              );
            })}
            {needsAttentionOrdered.length > 3 ? (
              <button
                type="button"
                className="mt-1 text-left text-sm font-semibold underline-offset-2 hover:underline"
                style={{ color: '#3BBFBF' }}
                onClick={navigateToCoachingActions}
              >
                + {needsAttentionOrdered.length - 3} more in Coaching Actions →
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

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
        <h2 className="flex flex-wrap items-center gap-1.5 font-bold" style={{ fontSize: 14, color: '#2D4459' }}>
          <span>{"This Week's Inputs"}</span>
          {seekerWeekLoggedComplete ? (
            <span style={{ color: '#22c55e' }} aria-hidden>
              ✓
            </span>
          ) : (
            <span style={{ color: '#F59E0B' }} aria-hidden>
              ●
            </span>
          )}
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
            </span>
            {contactedLogged != null &&
            respondedLogged !== undefined ? (
              <span className="flex w-full flex-col gap-0.5 font-semibold sm:w-auto">
                <span
                  style={{
                    color:
                      contactedLogged >= 15 ? '#3BBFBF' : '#F05F57',
                  }}
                >
                  Scheduled: {contactedLogged} this week (target 15)
                </span>
                <span
                  style={{
                    color:
                      respondedLogged >= 10 ? '#3BBFBF' : '#F05F57',
                  }}
                >
                  Spoken To: {respondedLogged} this week (target 10)
                </span>
              </span>
            ) : null}
            <button
              type="button"
              className="text-sm font-medium text-[#3BBFBF] underline-offset-2 hover:underline"
              onClick={() => setSeekerWeeklyEditMode(true)}
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold" style={{ color: '#2D4459' }} htmlFor="seeker-contacted-week">
                  Seekers Scheduled
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
                  target: 15 per week
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold" style={{ color: '#2D4459' }} htmlFor="seeker-responded-week">
                  Seekers Spoken To
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
                  target: 10 per week
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSaveSeekerWeek()}
              disabled={!anchorSeekerLogClientId}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: '#3BBFBF' }}
            >
              Save This Week&apos;s Numbers
            </button>
            {seekerWeekSaveOk ? (
              <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                Saved ✓
              </p>
            ) : null}
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
          label="VALIDATE"
          value={kpiFunnelCounts.validate}
          sub="Active clients in C4 / C5"
          infoTooltip={
            'Clients in C4 or C5 actively exploring business ownership.\nThese are your closest to placement.'
          }
        />
        <MorningBriefKpiCard
          label="GATHER"
          value={kpiFunnelCounts.gather}
          sub="Active clients in IC through C3"
          infoTooltip={
            'Clients in IC through C3 still\nin the discovery phase. Focus on\nmoving them toward C3 presentations.'
          }
        />
        <MorningBriefKpiCard
          label="PAUSE"
          value={pauseClientCount}
          sub="Clients currently paused"
        />
        <MorningBriefKpiCard
          label="Placement Tracker"
          value={placementKpiValue}
          sub={placementKpiSub[kpiPeriod]}
        />
        <MorningBriefKpiCard
          label="TIME SAVED"
          value={`${formatTimeSavedHours(timeSavedCard.hours)} hours`}
          sub={`${formatUsdWhole(timeSavedCard.dollars)} in coaching time`}
          valueColor="#3BBFBF"
          footnote={timeSavedCardFootnote}
        />
      </section>

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
                  const showValidDate = isValidGlanceLastContact(row.lastContactDate);
                  const daysSinceLc = showValidDate
                    ? daysSinceCalendarLocal(row.lastContactDate)
                    : null;
                  const gqThreshold = goneQuietThresholdDaysForGlanceCode(row.glanceStageCode);
                  const showGoneQuietDot =
                    showValidDate &&
                    daysSinceLc !== null &&
                    daysSinceLc > gqThreshold;
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
                        {showValidDate ? (
                          showGoneQuietDot ? (
                            <UiTooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex cursor-default items-center gap-1.5 text-sm">
                                  <span className="text-sm leading-none" style={{ color: '#F59E0B' }}>
                                    ●
                                  </span>
                                  <span style={{ color: '#2D4459' }}>
                                    {formatSessionDate(row.lastContactDate)}
                                  </span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                Gone quiet
                              </TooltipContent>
                            </UiTooltip>
                          ) : (
                            <span className="text-sm" style={{ color: '#2D4459' }}>
                              {formatSessionDate(row.lastContactDate)}
                            </span>
                          )
                        ) : (
                          <span className="text-sm" style={{ color: '#7A8F95' }}>
                            Not yet contacted
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
      <UATFeedback currentPage="Morning Brief" />
    </div>
  );
}
