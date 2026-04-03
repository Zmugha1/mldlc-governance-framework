import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getDb } from '../services/db';

const HEADER = '#2D4459';
const MUTED = '#7A8F95';
const BORDER = '#C8E8E5';
const TEAL = '#3BBFBF';
const CORAL = '#C8613F';
const CORAL_SOFT = '#F05F57';

const PLACEMENT_TARGET = 11;
const REVENUE_GOAL = 300_000;
const DEFAULT_PLACEMENT_REVENUE = 28_000;
const DEFAULT_REVENUE_TO_DATE = 84_000;
const C3_WEEKLY_TARGET = 2.5;
const TARGET_C1 = 75;
const TARGET_C4 = 80;
const WORKING_DAYS_MONTH_TARGET = 20;

type PipelineStage = 'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

const STAGE_INPUT_TO_PIPELINE: Record<string, PipelineStage> = {
  IC: 'IC',
  C1: 'C1',
  C2: 'C2',
  C3: 'C3',
  C4: 'C4',
  C5: 'C5',
  'Initial Contact': 'IC',
  'Seeker Connection': 'C1',
  'Seeker Clarification': 'C2',
  Possibilities: 'C3',
  'Coach Client Collaboration': 'C3',
  'Client Career 2.0': 'C4',
  'Business Purchase': 'C5',
};

const GONE_QUIET_DAYS: Record<PipelineStage, number> = {
  IC: 14,
  C1: 21,
  C2: 14,
  C3: 14,
  C4: 60,
  C5: 60,
};

const FALLBACK_INSTALL = new Date(2026, 2, 27);

type TierTab = 'revenue' | 'pipeline' | 'coaching' | 'adoption' | 'intelligence';

type AhaMomentType =
  | 'client_specific'
  | 'pattern'
  | 'disc_insight'
  | 'stage_insight'
  | 'general';

type AhaMomentRow = {
  id: string;
  client_id: string | null;
  moment_text: string;
  moment_type: string | null;
  disc_style: string | null;
  stage: string | null;
  created_at: string | null;
  client_name: string | null;
};

type AhaFilter =
  | 'all'
  | 'client_specific'
  | 'pattern'
  | 'disc_insight'
  | 'stage_insight'
  | 'general';

const AHA_FILTER_PILLS: { key: AhaFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'client_specific', label: 'Client' },
  { key: 'pattern', label: 'Pattern' },
  { key: 'disc_insight', label: 'DISC' },
  { key: 'stage_insight', label: 'Stage' },
  { key: 'general', label: 'General' },
];

const AHA_TYPE_LEFT_BORDER: Record<string, string> = {
  client_specific: '#3BBFBF',
  pattern: '#F05F57',
  disc_insight: '#C8613F',
  stage_insight: '#2D4459',
  general: '#7A8F95',
};

const AHA_TYPE_BADGE_LABEL: Record<string, string> = {
  client_specific: 'Client',
  pattern: 'Pattern',
  disc_insight: 'DISC',
  stage_insight: 'Stage',
  general: 'General',
};

type GoldenRuleRow = {
  name: string;
  golden_rules_notes: string;
};

type ClearAgg = {
  contracting: number | null;
  listening: number | null;
  exploring: number | null;
  action: number | null;
  reflection: number | null;
  total_sessions: number | null;
};

type DiscAgg = {
  d_count: number | null;
  i_count: number | null;
  s_count: number | null;
  c_count: number | null;
};

type ClientCompletenessRow = {
  id: string;
  name: string;
  one_year_vision: string | null;
  spouse_name: string | null;
  financial_net_worth_range: string | null;
  launch_timeline: string | null;
  dangers: string | null;
  strengths: string | null;
  opportunities: string | null;
  areas_of_interest: string | null;
  time_commitment: string | null;
  reasons_for_change: string | null;
  has_disc: number;
  /** Count of sessions with date + notes (or CLEAR notes) longer than 20 chars */
  sessions_notes_ok: number;
  tumay_contact_ok: number;
  /** DISC profile row exists — used for coaching "data complete" score only */
  disc_profile_linked: number;
  /** Dated coaching sessions (any notes) — used for data complete score only */
  dated_session_count: number;
};

type GoneQuietClientRow = {
  id: string;
  inferred_stage: string | null;
  updated_at: string | null;
  last_sess: string | null;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatLocalYyyyMmDd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfWeekMondayLocal(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

function startOfMonthLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function parseRevenue(raw: string | null | undefined): number {
  if (raw == null || String(raw).trim() === '') return DEFAULT_PLACEMENT_REVENUE;
  const n = Number(String(raw).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PLACEMENT_REVENUE;
}

function monthsElapsedInYear(now: Date): number {
  const start = new Date(now.getFullYear(), 0, 1);
  const days = (now.getTime() - start.getTime()) / 86_400_000;
  return Math.max(0.25, days / 30.437);
}

function safePct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 1000) / 10);
}

function normalizeStage(stage: string | null | undefined): PipelineStage {
  const s = (stage ?? '').trim();
  if (!s) return 'IC';
  const upper = s.toUpperCase();
  if (['IC', 'C1', 'C2', 'C3', 'C4', 'C5'].includes(upper)) return upper as PipelineStage;
  const direct = STAGE_INPUT_TO_PIPELINE[s];
  if (direct) return direct;
  const lower = s.toLowerCase();
  for (const [key, val] of Object.entries(STAGE_INPUT_TO_PIPELINE)) {
    if (key.toLowerCase() === lower) return val;
  }
  return 'IC';
}

function daysSinceReferenceLocal(isoOrSqlDate: string | null | undefined): number | null {
  if (isoOrSqlDate == null || String(isoOrSqlDate).trim() === '') return null;
  const d = new Date(isoOrSqlDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ref = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((today.getTime() - ref.getTime()) / 86_400_000);
}

function formatAhaMomentDate(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function normalizeAhaType(raw: string | null | undefined): AhaMomentType {
  const t = (raw ?? '').trim();
  if (
    t === 'client_specific' ||
    t === 'pattern' ||
    t === 'disc_insight' ||
    t === 'stage_insight' ||
    t === 'general'
  ) {
    return t;
  }
  return 'general';
}

function profileDiscOk(row: ClientCompletenessRow): boolean {
  return Number(row.has_disc) === 1;
}

function profileYou2Ok(row: ClientCompletenessRow): boolean {
  const v = row.one_year_vision;
  return v != null && String(v).trim().length > 20;
}

function profileSessionsOk(row: ClientCompletenessRow): boolean {
  return Number(row.sessions_notes_ok) > 0;
}

function profileTumayOk(row: ClientCompletenessRow): boolean {
  return Number(row.tumay_contact_ok) === 1;
}

function profileWeightedPct(row: ClientCompletenessRow): number {
  let pts = 0;
  if (profileDiscOk(row)) pts += 25;
  if (profileYou2Ok(row)) pts += 25;
  if (profileSessionsOk(row)) pts += 30;
  if (profileTumayOk(row)) pts += 20;
  return pts;
}

function isActiveClientProfileComplete(row: ClientCompletenessRow): boolean {
  return (
    profileDiscOk(row) &&
    profileYou2Ok(row) &&
    profileSessionsOk(row) &&
    profileTumayOk(row)
  );
}

/** Legacy bar used for coaching performance "data complete" points (pre–status-icons definition). */
function isDataScoreProfileComplete(row: ClientCompletenessRow): boolean {
  const vision = row.one_year_vision;
  return (
    Number(row.disc_profile_linked) === 1 &&
    vision != null &&
    String(vision).trim().length > 0 &&
    Number(row.dated_session_count) > 0
  );
}

function profileStatusLabel(pct: number): string {
  if (pct >= 100) return 'Complete profile';
  if (pct >= 75) return 'Missing TUMAY data';
  if (pct >= 50) return 'Missing sessions or TUMAY';
  return 'Needs attention';
}

function profileBarColor(pct: number): string {
  if (pct >= 100) return '#3BBFBF';
  if (pct >= 75) return '#C8613F';
  return '#F05F57';
}

function ProfileCompletenessStatusIcons({ row }: { row: ClientCompletenessRow }) {
  const discOk = profileDiscOk(row);
  const you2Ok = profileYou2Ok(row);
  const sessOk = profileSessionsOk(row);
  const tumayOk = profileTumayOk(row);
  const sep = (
    <span className="mx-1" style={{ color: MUTED }}>
      ·
    </span>
  );
  const cell = (label: string, ok: boolean) => (
    <span style={{ color: ok ? TEAL : CORAL_SOFT, fontSize: 12 }}>
      {label} {ok ? '✅' : '❌'}
    </span>
  );
  return (
    <p className="mt-1 flex flex-wrap items-center" style={{ lineHeight: 1.5 }}>
      {cell('DISC', discOk)}
      {sep}
      {cell('You 2.0', you2Ok)}
      {sep}
      {cell('Sessions', sessOk)}
      {sep}
      {cell('TUMAY', tumayOk)}
    </p>
  );
}

function parseUserPrefsInstallDate(
  raw: string | null | undefined
): { date: Date; wasNull: boolean } {
  if (raw == null || String(raw).trim() === '') {
    return { date: new Date(FALLBACK_INSTALL), wasNull: true };
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
  return { date: new Date(FALLBACK_INSTALL), wasNull: true };
}

function daysSinceInstall(install: Date, ref: Date): number {
  const a = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const b = new Date(install.getFullYear(), install.getMonth(), install.getDate());
  return Math.max(0, Math.floor((a.getTime() - b.getTime()) / 86_400_000));
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
  return Math.round((diffDays / 7) * 10) / 10;
}

const DISC_INSIGHT: Record<'D' | 'I' | 'S' | 'C', string> = {
  D: 'Most clients are Driver style. Be direct and results-focused.',
  I: 'Most clients are Influencer style. Lead with vision and excitement.',
  S: 'Most clients are Supporter style. Prioritize safety and steady steps.',
  C: 'Most clients are Analyst style. Lead with data and give them time.',
};

function HeroMiniBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/90">{label}</span>
        <span className="text-[10px] tabular-nums text-white">
          {Math.round(value * 10) / 10} / {max}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: TEAL }} />
      </div>
    </div>
  );
}

function TierProgressRow({
  title,
  description,
  valueLabel,
  targetLabel,
  pct,
  valueColor,
}: {
  title: string;
  description: string;
  valueLabel: string;
  targetLabel: string;
  pct: number;
  valueColor?: string;
}) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.1fr)_2fr_minmax(0,0.9fr)] md:items-center md:gap-4">
      <div>
        <p className="text-sm font-semibold" style={{ color: HEADER }}>
          {title}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
          {description}
        </p>
      </div>
      <div className="min-w-0">
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: '#F4F7F8' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: TEAL }} />
        </div>
      </div>
      <div className="text-right text-sm tabular-nums" style={{ color: valueColor ?? HEADER }}>
        <span className="font-semibold">{valueLabel}</span>
        <span className="text-xs font-normal" style={{ color: MUTED }}>
          {' '}
          / {targetLabel}
        </span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  valueNode,
  subNode,
  progressPct,
}: {
  label: string;
  valueNode: ReactNode;
  subNode?: ReactNode;
  progressPct: number;
}) {
  const w = Math.min(100, Math.max(0, progressPct));
  return (
    <div
      className="flex min-w-0 flex-1 flex-col rounded-xl border bg-white p-4"
      style={{ borderColor: BORDER }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
        {label}
      </p>
      <div className="mt-2 min-h-[2.5rem] text-lg font-bold leading-tight" style={{ color: HEADER }}>
        {valueNode}
      </div>
      {subNode ? <div className="mt-1 text-xs" style={{ color: MUTED }}>{subNode}</div> : null}
      <div className="mt-3 h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#F4F7F8' }}>
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: TEAL }} />
      </div>
    </div>
  );
}

export default function MyPractice() {
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierTab, setTierTab] = useState<TierTab>('revenue');
  const [goldenRules, setGoldenRules] = useState<GoldenRuleRow[]>([]);
  const [clearAgg, setClearAgg] = useState<ClearAgg | null>(null);
  const [discAgg, setDiscAgg] = useState<DiscAgg | null>(null);
  const [clientsComplete, setClientsComplete] = useState<ClientCompletenessRow[]>([]);
  const [activeClientTotal, setActiveClientTotal] = useState(0);
  const [ahaMoments, setAhaMoments] = useState<AhaMomentRow[]>([]);
  const [ahaFilter, setAhaFilter] = useState<AhaFilter>('all');

  const [placementCount, setPlacementCount] = useState(0);
  const [revenueSumRaw, setRevenueSumRaw] = useState(0);
  const [c3WeekCount, setC3WeekCount] = useState(0);
  const [c3YtdCount, setC3YtdCount] = useState(0);
  const [c1Scheduled, setC1Scheduled] = useState(0);
  const [c1Held, setC1Held] = useState(0);
  const [c4WithPoc, setC4WithPoc] = useState(0);
  const [c4Total, setC4Total] = useState(0);
  const [interventionTotal, setInterventionTotal] = useState(0);
  const [interventionResponded, setInterventionResponded] = useState(0);
  const [goneQuietCountState, setGoneQuietCountState] = useState(0);
  const [activeDaysMonth, setActiveDaysMonth] = useState(0);
  const [reflectionsMonth, setReflectionsMonth] = useState(0);
  const [ahaMonthCount, setAhaMonthCount] = useState(0);
  const [installDate, setInstallDate] = useState<Date>(() => new Date(FALLBACK_INSTALL));
  const [installWasNull, setInstallWasNull] = useState(true);
  const [hourlyRate, setHourlyRate] = useState(150);
  const [weeklyHoursSaved, setWeeklyHoursSaved] = useState(2);
  const [emotionalWith, setEmotionalWith] = useState(0);
  const [emotionalTotal, setEmotionalTotal] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const db = await getDb();
        const now = new Date();
        const weekStart = formatLocalYyyyMmDd(startOfWeekMondayLocal(now));
        const today = formatLocalYyyyMmDd(now);
        const yearStart = `${now.getFullYear()}-01-01`;
        const monthStart = formatLocalYyyyMmDd(startOfMonthLocal(now));

        const activeSql = `c.outcome_bucket = 'active'`;

        const [
          rules,
          clear,
          disc,
          activeClients,
          activeTotalRows,
          ahas,
          placementRows,
          revenueRows,
          c3WeekRows,
          c3YtdRows,
          c1SchedRows,
          c1HeldRows,
          c4Rows,
          ivRows,
          gqRows,
          prefsRows,
          activeDaysRows,
          reflRows,
          ahaMonthRows,
          emotionalRows,
        ] = await Promise.all([
          db.select<GoldenRuleRow>(
            `SELECT name, golden_rules_notes
             FROM clients
             WHERE LOWER(COALESCE(outcome_bucket, '')) = 'converted'
               AND golden_rules_notes IS NOT NULL
               AND LENGTH(TRIM(golden_rules_notes)) > 5
             ORDER BY name COLLATE NOCASE`,
            []
          ),
          db.select<ClearAgg>(
            `SELECT
               AVG(clear_curiosity) as contracting,
               AVG(clear_locating) as listening,
               AVG(clear_engagement) as exploring,
               AVG(clear_accountability) as action,
               AVG(clear_reflection) as reflection,
               COUNT(*) as total_sessions
             FROM coaching_sessions
             WHERE overall_clear_score IS NOT NULL`,
            []
          ),
          db.select<DiscAgg>(
            `SELECT
               SUM(CASE
                 WHEN COALESCE(p.natural_d, 0) > COALESCE(p.natural_i, 0)
                  AND COALESCE(p.natural_d, 0) > COALESCE(p.natural_s, 0)
                  AND COALESCE(p.natural_d, 0) > COALESCE(p.natural_c, 0)
                 THEN 1 ELSE 0 END) as d_count,
               SUM(CASE
                 WHEN COALESCE(p.natural_i, 0) >= COALESCE(p.natural_d, 0)
                  AND COALESCE(p.natural_i, 0) > COALESCE(p.natural_s, 0)
                  AND COALESCE(p.natural_i, 0) > COALESCE(p.natural_c, 0)
                 THEN 1 ELSE 0 END) as i_count,
               SUM(CASE
                 WHEN COALESCE(p.natural_s, 0) >= COALESCE(p.natural_d, 0)
                  AND COALESCE(p.natural_s, 0) >= COALESCE(p.natural_i, 0)
                  AND COALESCE(p.natural_s, 0) > COALESCE(p.natural_c, 0)
                 THEN 1 ELSE 0 END) as s_count,
               SUM(CASE
                 WHEN COALESCE(p.natural_c, 0) >= COALESCE(p.natural_d, 0)
                  AND COALESCE(p.natural_c, 0) >= COALESCE(p.natural_i, 0)
                  AND COALESCE(p.natural_c, 0) >= COALESCE(p.natural_s, 0)
                 THEN 1 ELSE 0 END) as c_count
             FROM client_disc_profiles p
             INNER JOIN clients c ON c.id = p.client_id
             WHERE c.outcome_bucket = 'active'`,
            []
          ),
          db.select<ClientCompletenessRow>(
            `SELECT
               c.id,
               c.name,
               y.one_year_vision,
               y.spouse_name,
               y.financial_net_worth_range,
               y.launch_timeline,
               y.dangers,
               y.strengths,
               y.opportunities,
               y.areas_of_interest,
               y.time_commitment,
               y.reasons_for_change,
               CASE
                 WHEN d.natural_d IS NOT NULL
                   OR d.natural_i IS NOT NULL
                   OR d.natural_s IS NOT NULL
                   OR d.natural_c IS NOT NULL
                 THEN 1
                 ELSE 0
               END AS has_disc,
               (
                 SELECT COUNT(*)
                 FROM coaching_sessions cs
                 WHERE cs.client_id = c.id
                   AND cs.session_date IS NOT NULL
                   AND TRIM(cs.session_date) != ''
                   AND (
                     LENGTH(TRIM(COALESCE(cs.notes, ''))) > 20
                     OR LENGTH(TRIM(COALESCE(cs.clear_notes, ''))) > 20
                   )
               ) AS sessions_notes_ok,
               CASE
                 WHEN c.tumay_data IS NOT NULL
                   AND LENGTH(TRIM(c.tumay_data)) > 2
                   AND LOWER(TRIM(c.tumay_data)) NOT IN ('{}', 'null', '[]')
                   AND NULLIF(TRIM(json_extract(c.tumay_data, '$.contact_name')), '') IS NOT NULL
                 THEN 1
                 ELSE 0
               END AS tumay_contact_ok,
               CASE WHEN d.client_id IS NOT NULL THEN 1 ELSE 0 END AS disc_profile_linked,
               (
                 SELECT COUNT(*)
                 FROM coaching_sessions cs2
                 WHERE cs2.client_id = c.id
                   AND cs2.session_date IS NOT NULL
                   AND TRIM(cs2.session_date) != ''
               ) AS dated_session_count
             FROM clients c
             LEFT JOIN client_you2_profiles y ON y.client_id = c.id
             LEFT JOIN client_disc_profiles d ON d.client_id = c.id
             WHERE c.outcome_bucket = 'active'
             ORDER BY c.name COLLATE NOCASE`,
            []
          ),
          db.select<{ total: number }>(
            `SELECT COUNT(*) as total
             FROM clients
             WHERE outcome_bucket = 'active'`,
            []
          ),
          db.select<AhaMomentRow>(
            `SELECT a.*, c.name as client_name
             FROM aha_moments a
             LEFT JOIN clients c ON c.id = a.client_id
             ORDER BY a.created_at DESC`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM clients c
             WHERE c.business_purchase_date IS NOT NULL AND TRIM(c.business_purchase_date) != ''`,
            []
          ),
          db.select<{ placement_revenue: string | null }>(
            `SELECT c.placement_revenue FROM clients c
             WHERE c.business_purchase_date IS NOT NULL AND TRIM(c.business_purchase_date) != ''`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM coaching_sessions s
             WHERE s.stage = 'C3'
               AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
               AND date(s.session_date) >= date($1)
               AND date(s.session_date) <= date($2)`,
            [weekStart, today]
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM coaching_sessions s
             WHERE s.stage = 'C3'
               AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
               AND date(s.session_date) >= date($1)
               AND date(s.session_date) <= date($2)`,
            [yearStart, today]
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM coaching_sessions s
             WHERE s.stage = 'C1'
                 AND s.session_scheduled = 1
                 AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
                 AND date(s.session_date) >= date('now', 'start of year')`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM coaching_sessions s
             WHERE s.stage = 'C1'
                 AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
                 AND date(s.session_date) >= date('now', 'start of year')`,
            []
          ),
          db.select<{ with_poc: number; total: number }>(
            `SELECT
               SUM(CASE WHEN c.poc_reached_date IS NOT NULL AND TRIM(c.poc_reached_date) != '' THEN 1 ELSE 0 END) as with_poc,
               COUNT(*) as total
             FROM clients c
             WHERE ${activeSql}
               AND TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('C4', 'Client Career 2.0')`,
            []
          ),
          db.select<{ total: number; responded: number }>(
            `SELECT
               COUNT(*) as total,
               SUM(CASE
                 WHEN response_type IS NOT NULL AND TRIM(response_type) != ''
                   AND response_type != 'No action yet'
                 THEN 1 ELSE 0 END) as responded
             FROM intervention_logs`,
            []
          ),
          db.select<GoneQuietClientRow>(
            `SELECT c.id, c.inferred_stage, c.updated_at,
              (SELECT MAX(cs.session_date) FROM coaching_sessions cs
               WHERE cs.client_id = c.id
                 AND cs.session_date IS NOT NULL AND TRIM(cs.session_date) != '') AS last_sess
             FROM clients c
             WHERE c.outcome_bucket = 'active'`,
            []
          ),
          db.select<{ install_date: string | null; coach_hourly_rate: number | null; weekly_hours_saved: number | null }>(
            `SELECT install_date, coach_hourly_rate, weekly_hours_saved
             FROM user_preferences WHERE id = 'singleton'`,
            []
          ),
          db.select<{ d: string }>(
            `SELECT DISTINCT date(created_at) as d FROM user_feedback
             WHERE date(created_at) >= date($1)`,
            [monthStart]
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM user_feedback
             WHERE feedback_type = 'daily_reflection'
               AND date(created_at) >= date($1)`,
            [monthStart]
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM aha_moments
             WHERE created_at IS NOT NULL AND TRIM(created_at) != ''
               AND date(created_at) >= date($1)`,
            [monthStart]
          ),
          db.select<{ total: number; with_em: number }>(
            `SELECT
               COUNT(*) as total,
               SUM(CASE
                 WHEN block_emotional IS NOT NULL AND LENGTH(TRIM(block_emotional)) > 20
                 THEN 1 ELSE 0 END) as with_em
             FROM coaching_sessions
             WHERE session_date IS NOT NULL AND TRIM(session_date) != ''`,
            []
          ),
        ]);

        if (cancelled) return;

        let goneQuietN = 0;
        for (const row of gqRows) {
          const stage = normalizeStage(row.inferred_stage);
          const ref = row.last_sess?.trim() || row.updated_at?.trim() || '';
          const days = daysSinceReferenceLocal(ref || null);
          const th = GONE_QUIET_DAYS[stage] ?? 14;
          if (days !== null && days > th) goneQuietN += 1;
        }

        const pref = prefsRows[0];
        const parsedInstall = parseUserPrefsInstallDate(pref?.install_date ?? null);
        const hr =
          pref?.coach_hourly_rate != null && Number.isFinite(Number(pref.coach_hourly_rate))
            ? Number(pref.coach_hourly_rate)
            : 150;
        const wh =
          pref?.weekly_hours_saved != null && Number.isFinite(Number(pref.weekly_hours_saved))
            ? Number(pref.weekly_hours_saved)
            : 2;

        setGoldenRules(rules);
        setClearAgg(clear[0] ?? null);
        setDiscAgg(disc[0] ?? null);
        setClientsComplete(activeClients);
        setActiveClientTotal(Number(activeTotalRows[0]?.total ?? 0));
        setAhaMoments(ahas);
        setPlacementCount(Number(placementRows[0]?.cnt ?? 0));
        setRevenueSumRaw(revenueRows.reduce((sum, r) => sum + parseRevenue(r.placement_revenue), 0));
        setC3WeekCount(Number(c3WeekRows[0]?.cnt ?? 0));
        setC3YtdCount(Number(c3YtdRows[0]?.cnt ?? 0));
        setC1Scheduled(Number(c1SchedRows[0]?.cnt ?? 0));
        setC1Held(Number(c1HeldRows[0]?.cnt ?? 0));
        setC4WithPoc(Number(c4Rows[0]?.with_poc ?? 0));
        setC4Total(Number(c4Rows[0]?.total ?? 0));
        setInterventionTotal(Number(ivRows[0]?.total ?? 0));
        setInterventionResponded(Number(ivRows[0]?.responded ?? 0));
        setGoneQuietCountState(goneQuietN);
        setActiveDaysMonth(activeDaysRows.length);
        setReflectionsMonth(Number(reflRows[0]?.cnt ?? 0));
        setAhaMonthCount(Number(ahaMonthRows[0]?.cnt ?? 0));
        setInstallDate(parsedInstall.date);
        setInstallWasNull(parsedInstall.wasNull);
        setHourlyRate(hr);
        setWeeklyHoursSaved(wh);
        setEmotionalWith(Number(emotionalRows[0]?.with_em ?? 0));
        setEmotionalTotal(Number(emotionalRows[0]?.total ?? 0));
      } catch (e) {
        if (!cancelled) {
          setError(String((e as { message?: string })?.message ?? e ?? 'Failed to load'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refNow = useMemo(() => new Date(nowTick), [nowTick]);

  const moneyFmt = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    []
  );

  const headerDateLine = useMemo(
    () =>
      refNow.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [refNow]
  );

  const revenueToDate = revenueSumRaw > 0 ? revenueSumRaw : DEFAULT_REVENUE_TO_DATE;
  const monthsElapsed = monthsElapsedInYear(refNow);
  const projectedYearEnd = Math.round((placementCount / monthsElapsed) * 12 * DEFAULT_PLACEMENT_REVENUE);
  const revenueProgressPct = Math.min(100, (revenueToDate / REVENUE_GOAL) * 100);
  const placementProgressPct = Math.min(100, (placementCount / PLACEMENT_TARGET) * 100);
  const onRevenuePace = projectedYearEnd >= REVENUE_GOAL;
  const placementsBehind = Math.max(0, PLACEMENT_TARGET - placementCount);
  const placementsNeededMessage = onRevenuePace
    ? 0
    : Math.max(1, placementsBehind > 0 ? placementsBehind : 1);

  const jan1 = new Date(refNow.getFullYear(), 0, 1);
  const weeksElapsedYtd = Math.max(1, Math.ceil((refNow.getTime() - jan1.getTime()) / (7 * 86_400_000)));
  const c3WeeklyAvgYtd = c3YtdCount / weeksElapsedYtd;
  const c3ForNorthStar = c3WeekCount > 0 ? c3WeekCount : c3WeeklyAvgYtd;

  const c1ShowPct =
    c1Scheduled === 0 ? null : Math.min(100, Math.round((c1Held / c1Scheduled) * 1000) / 10);
  const c4ConversionPct = safePct(c4WithPoc, c4Total);
  const interventionRatePct =
    interventionTotal <= 0 ? 100 : safePct(interventionResponded, interventionTotal);

  const completeCount = clientsComplete.filter((row) => isActiveClientProfileComplete(row)).length;
  const dataScoreCompleteCount = clientsComplete.filter((row) =>
    isDataScoreProfileComplete(row)
  ).length;

  const clearDims: {
    key: keyof Pick<ClearAgg, 'contracting' | 'listening' | 'exploring' | 'action' | 'reflection'>;
    label: string;
  }[] = [
    { key: 'contracting', label: 'Contracting' },
    { key: 'listening', label: 'Listening' },
    { key: 'exploring', label: 'Exploring' },
    { key: 'action', label: 'Action' },
    { key: 'reflection', label: 'Reflection' },
  ];

  const totalSessions = Math.round(Number(clearAgg?.total_sessions ?? 0));

  const dimAvgs = clearDims.map(({ key }) => {
    const raw = clearAgg?.[key];
    return raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null;
  });
  const finiteDims = dimAvgs.filter((x): x is number => x != null);
  const avgClear =
    finiteDims.length > 0 ? finiteDims.reduce((a, b) => a + b, 0) / finiteDims.length : null;

  const placementPacePts = Math.min(25, (placementCount / PLACEMENT_TARGET) * 25);
  const c3NorthStarPts = Math.min(20, (c3ForNorthStar / C3_WEEKLY_TARGET) * 20);
  const interventionPts =
    interventionTotal <= 0 ? 20 : (interventionResponded / interventionTotal) * 20;
  const dataCompletePts =
    activeClientTotal <= 0 ? 0 : (dataScoreCompleteCount / activeClientTotal) * 15;
  let clearQualityPts = 10;
  if (totalSessions > 0 && avgClear != null) {
    if (avgClear >= 4) clearQualityPts = 10;
    else if (avgClear >= 3) clearQualityPts = 7;
    else if (avgClear >= 2) clearQualityPts = 4;
    else clearQualityPts = 0;
  }
  let ahaPts = 0;
  if (ahaMonthCount >= 4) ahaPts = 10;
  else if (ahaMonthCount >= 2) ahaPts = 7;
  else if (ahaMonthCount >= 1) ahaPts = 4;

  const performanceScore = Math.round(
    Math.min(
      100,
      placementPacePts +
        c3NorthStarPts +
        interventionPts +
        dataCompletePts +
        clearQualityPts +
        ahaPts
    )
  );

  const scoreLabelSpec = (() => {
    if (performanceScore >= 90) return { text: 'Elite', color: TEAL };
    if (performanceScore >= 75) return { text: 'Strong', color: TEAL };
    if (performanceScore >= 60) return { text: 'Building', color: CORAL };
    if (performanceScore >= 40) return { text: 'Developing', color: CORAL };
    return { text: 'Early Stage', color: MUTED };
  })();

  const weeksSince = weeksSinceInstallRounded(refNow, installDate);
  const timeSavedHours = Math.round(weeksSince * weeklyHoursSaved * 10) / 10;
  const timeSavedDollars = Math.round(timeSavedHours * hourlyRate);

  const emotionalPct =
    emotionalTotal > 0 ? Math.round((emotionalWith / emotionalTotal) * 1000) / 10 : null;

  const reflectionCompletionPct = Math.min(
    100,
    Math.round((reflectionsMonth / WORKING_DAYS_MONTH_TARGET) * 1000) / 10
  );

  const adoptionActiveDaysPct = Math.min(100, (activeDaysMonth / WORKING_DAYS_MONTH_TARGET) * 100);
  const ahaMonthProgressPct = Math.min(100, (ahaMonthCount / 4) * 100);

  const timeSavedBarPct = Math.min(100, (weeksSince / 52) * 100);

  const daysIn = daysSinceInstall(installDate, refNow);

  const installFootnote = installWasNull
    ? 'Since Mar 27 2026'
    : `Since ${installDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const d = Number(discAgg?.d_count ?? 0);
  const i = Number(discAgg?.i_count ?? 0);
  const s = Number(discAgg?.s_count ?? 0);
  const cN = Number(discAgg?.c_count ?? 0);
  const discCounts = { D: d, I: i, S: s, C: cN } as const;
  let topLetter: 'D' | 'I' | 'S' | 'C' = 'D';
  let topCount = -1;
  for (const [letter, n] of [
    ['D', d],
    ['I', i],
    ['S', s],
    ['C', cN],
  ] as const) {
    if (n > topCount) {
      topCount = n;
      topLetter = letter;
    }
  }
  const discInsight = topCount <= 0 ? null : DISC_INSIGHT[topLetter];

  const filteredAhaMoments = useMemo(() => {
    if (ahaFilter === 'all') return ahaMoments;
    return ahaMoments.filter((row) => normalizeAhaType(row.moment_type) === ahaFilter);
  }, [ahaMoments, ahaFilter]);

  let lowestDimIdx = -1;
  let lowestVal = Infinity;
  if (totalSessions >= 3) {
    clearDims.forEach(({ key }, idx) => {
      const raw = clearAgg?.[key];
      const v = raw != null && Number.isFinite(Number(raw)) ? Number(raw) : 0;
      if (v < lowestVal) {
        lowestVal = v;
        lowestDimIdx = idx;
      }
    });
  }

  const tierTabs: { id: TierTab; label: string }[] = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'coaching', label: 'Coaching' },
    { id: 'adoption', label: 'Adoption' },
    { id: 'intelligence', label: 'Intelligence' },
  ];

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: MUTED }}>
        Loading My Practice…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 pb-12">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-bold leading-tight" style={{ fontSize: 22, color: HEADER }}>
            My Practice
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-snug" style={{ color: MUTED }}>
            Your coaching intelligence — compounding over time.
          </p>
        </div>
        <p className="text-right text-xs sm:pt-1" style={{ color: MUTED }}>
          {headerDateLine}
        </p>
      </header>

      {/* ZONE 1 — PERFORMANCE SCORE */}
      <section
        className="overflow-hidden text-white shadow-lg"
        style={{
          borderRadius: 16,
          padding: '28px 32px',
          background: 'linear-gradient(135deg, #2D4459 0%, #1a2d3d 100%)',
        }}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 lg:w-1/2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              Coaching performance score
            </p>
            <p className="mt-2 font-bold tabular-nums leading-none" style={{ fontSize: 56 }}>
              {performanceScore}
            </p>
            <p className="mt-2 text-lg font-semibold" style={{ color: scoreLabelSpec.color }}>
              {scoreLabelSpec.text}
            </p>
            <p
              className="mx-auto italic"
              style={{
                color: '#7A8F95',
                fontSize: 12,
                marginTop: 8,
                maxWidth: 300,
                textAlign: 'center',
              }}
            >
              This score starts low and grows every day you use Coach Bot. Response rate and CLEAR
              quality are already perfect. Keep coaching.
            </p>
            <p className="mt-3 text-xs text-white/60">Updated daily as you coach</p>
          </div>
          <div className="min-w-0 flex-1 lg:w-1/2 lg:pl-4">
            <HeroMiniBar label="Placement pace" value={placementPacePts} max={25} />
            <HeroMiniBar label="C3 north star" value={c3NorthStarPts} max={20} />
            <HeroMiniBar label="Response rate" value={interventionPts} max={20} />
            <HeroMiniBar label="Data complete" value={dataCompletePts} max={15} />
            <HeroMiniBar label="CLEAR quality" value={clearQualityPts} max={10} />
            <HeroMiniBar label="Aha moments" value={ahaPts} max={10} />
            <p className="mt-1 text-sm font-bold text-white">
              Total: {performanceScore} / 100
            </p>
          </div>
        </div>
        <p className="mt-8 border-t border-white/10 pt-4 text-[10px] italic leading-relaxed text-white/40">
          Year 2: Coach Bot begins learning from your coaching patterns and feedback. The longer you use it,
          the smarter it gets. Your coaching style becomes part of the intelligence. Your AI learns your
          clients, your language, and your coaching style. This score compounds.
        </p>
      </section>

      {/* ZONE 2 — TABS */}
      <div>
        <div className="flex flex-wrap gap-0 bg-white">
          {tierTabs.map((t) => {
            const active = tierTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTierTab(t.id)}
                className="px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  borderRadius: '12px 12px 0 0',
                  color: active ? TEAL : MUTED,
                  borderBottom: active ? `2px solid ${TEAL}` : '2px solid transparent',
                  background: 'white',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div
          className="border border-t-0 bg-white p-6"
          style={{
            borderColor: BORDER,
            borderRadius: '0 12px 12px 12px',
          }}
        >
          {tierTab === 'revenue' ? (
            <div>
              <h2 className="text-base font-bold" style={{ color: HEADER }}>
                Revenue Performance
              </h2>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>
                The ultimate proof of coaching effectiveness
              </p>
              <div className="mt-6 flex flex-col gap-4 lg:flex-row">
                <MetricCard
                  label="Revenue to date"
                  valueNode={moneyFmt.format(revenueToDate)}
                  subNode={`Target: ${moneyFmt.format(REVENUE_GOAL)}`}
                  progressPct={revenueProgressPct}
                />
                <MetricCard
                  label="Placements"
                  valueNode={
                    <span>
                      {placementCount} of {PLACEMENT_TARGET}
                    </span>
                  }
                  progressPct={placementProgressPct}
                />
                <MetricCard
                  label="Projected"
                  valueNode={
                    <span style={{ color: projectedYearEnd >= REVENUE_GOAL ? TEAL : CORAL_SOFT }}>
                      {moneyFmt.format(projectedYearEnd)}
                    </span>
                  }
                  subNode="at current pace"
                  progressPct={Math.min(100, (projectedYearEnd / REVENUE_GOAL) * 100)}
                />
              </div>
              <p
                className="mt-6 text-center text-sm font-medium"
                style={{ color: onRevenuePace ? TEAL : CORAL_SOFT }}
              >
                {onRevenuePace
                  ? `You are on track for ${moneyFmt.format(REVENUE_GOAL)}. Keep coaching.`
                  : `You need ${placementsNeededMessage} more placements to hit your goal. C3 is the lever.`}
              </p>
            </div>
          ) : null}

          {tierTab === 'pipeline' ? (
            <div>
              <h2 className="text-base font-bold" style={{ color: HEADER }}>
                Pipeline Velocity
              </h2>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>
                How fast clients move through your coaching
              </p>
              <div className="mt-6">
                <TierProgressRow
                  title="C3 this week"
                  description="Your north star metric"
                  valueLabel={String(c3WeekCount)}
                  targetLabel={`${C3_WEEKLY_TARGET} target`}
                  pct={Math.min(100, (c3WeekCount / C3_WEEKLY_TARGET) * 100)}
                />
                <TierProgressRow
                  title="C1 show rate"
                  description="Scheduled sessions held"
                  valueLabel={c1ShowPct == null ? '—' : `${c1ShowPct}%`}
                  targetLabel={`${TARGET_C1}% target`}
                  pct={c1ShowPct == null ? 0 : (c1ShowPct / TARGET_C1) * 100}
                />
                <TierProgressRow
                  title="C4 conversion"
                  description="C4 clients reaching POC"
                  valueLabel={`${c4ConversionPct}%`}
                  targetLabel={`${TARGET_C4}% target`}
                  pct={(c4ConversionPct / TARGET_C4) * 100}
                />
                <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.1fr)_2fr_minmax(0,0.9fr)] md:items-center md:gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: HEADER }}>
                      Gone quiet
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
                      Active clients gone quiet
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: '#F4F7F8' }} />
                  <div
                    className="text-right text-sm font-semibold tabular-nums"
                    style={{ color: goneQuietCountState > 0 ? CORAL_SOFT : TEAL }}
                  >
                    {goneQuietCountState} clients
                  </div>
                </div>
                <TierProgressRow
                  title="Intervention rate"
                  description="Signals you responded to"
                  valueLabel={`${Math.round(interventionRatePct)}%`}
                  targetLabel="100%"
                  pct={interventionRatePct}
                />
              </div>
            </div>
          ) : null}

          {tierTab === 'coaching' ? (
            <div>
              <h2 className="text-base font-bold" style={{ color: HEADER }}>
                Coaching Quality
              </h2>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>
                What your sessions reveal about your craft
              </p>
              <div className="mt-6">
                {totalSessions < 3 ? (
                  <div
                    className="rounded-xl border-2 px-5 py-6 text-sm"
                    style={{ borderColor: TEAL, color: MUTED }}
                  >
                    Complete 3 post-call analyses to see your CLEAR trends.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clearDims.map(({ key, label }, idx) => {
                      const raw = clearAgg?.[key];
                      const avg = raw != null && Number.isFinite(Number(raw)) ? Number(raw) : 0;
                      const display = Math.round(avg * 10) / 10;
                      const isLow = idx === lowestDimIdx;
                      return (
                        <div key={key}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-medium" style={{ color: HEADER }}>
                              {label}
                            </span>
                            <span className="tabular-nums" style={{ color: HEADER }}>
                              {display.toFixed(1)} / 5.0
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#F4F7F8]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (avg / 5) * 100)}%`,
                                background: isLow ? '#F59E0B' : TEAL,
                              }}
                            />
                          </div>
                          {isLow ? (
                            <p className="mt-1 text-xs font-medium text-amber-600">Your growth opportunity</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="mt-8 border-t pt-6" style={{ borderColor: BORDER }}>
                {emotionalPct != null && emotionalTotal > 0 ? (
                  <div>
                    <p className="text-sm" style={{ color: HEADER }}>
                      <span className="font-semibold">{emotionalPct}%</span> of your sessions include
                      emotional discovery blocks — target is 50%+
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F4F7F8]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (emotionalPct / 50) * 100)}%`,
                          background: emotionalPct >= 50 ? TEAL : CORAL,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: MUTED }}>
                    Emotional depth tracking coming in Month 2
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {tierTab === 'adoption' ? (
            <div>
              <h2 className="text-base font-bold" style={{ color: HEADER }}>
                System Adoption
              </h2>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>
                How consistently you use Coach Bot as a habit
              </p>
              <div className="mt-6 space-y-6">
                <TierProgressRow
                  title="Daily active days"
                  description="Opens per month"
                  valueLabel={`${activeDaysMonth} days`}
                  targetLabel={`${WORKING_DAYS_MONTH_TARGET} working days`}
                  pct={adoptionActiveDaysPct}
                />
                <div>
                  <TierProgressRow
                    title="Aha moments this month"
                    description="Target: 4 per month"
                    valueLabel={`${ahaMonthCount} captured`}
                    targetLabel="4 / month"
                    pct={ahaMonthProgressPct}
                  />
                  {ahaMonthCount === 0 ? (
                    <p className="mt-1 text-xs font-medium text-amber-600">
                      Capture your first insight on any client card
                    </p>
                  ) : null}
                </div>
                <TierProgressRow
                  title="Daily reflections"
                  description="Completion vs working days"
                  valueLabel={`${reflectionCompletionPct}%`}
                  targetLabel="100%"
                  pct={reflectionCompletionPct}
                />
                <div>
                  <p className="text-sm font-semibold" style={{ color: HEADER }}>
                    Time saved YTD
                  </p>
                  <p className="mt-1 text-sm tabular-nums" style={{ color: HEADER }}>
                    {timeSavedHours} hours / {moneyFmt.format(timeSavedDollars)} value
                  </p>
                  <p className="text-xs" style={{ color: MUTED }}>
                    {installFootnote}
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F4F7F8]">
                    <div className="h-full rounded-full" style={{ width: `${timeSavedBarPct}%`, background: TEAL }} />
                  </div>
                </div>
              </div>
              <p className="mt-8 text-center text-[13px] italic" style={{ color: MUTED }}>
                Every day you use Coach Bot your data gets richer, your patterns get clearer, and your
                coaching gets sharper.
              </p>
            </div>
          ) : null}

          {tierTab === 'intelligence' ? (
            <div>
              <h2 className="text-base font-bold" style={{ color: HEADER }}>
                Coaching Intelligence
              </h2>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>
                What Coach Bot has learned about your coaching
              </p>

              <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: HEADER }}>
                    Aha moments
                  </p>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                    style={{ background: TEAL }}
                  >
                    {ahaMoments.length}
                  </span>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {AHA_FILTER_PILLS.map(({ key, label: lbl }) => {
                    const active = ahaFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAhaFilter(key)}
                        className="rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
                        style={{
                          border: `1px solid ${active ? TEAL : BORDER}`,
                          background: active ? 'rgba(59, 191, 191, 0.12)' : 'white',
                          color: active ? TEAL : HEADER,
                        }}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
                {ahaMoments.length === 0 ? (
                  <p className="text-sm" style={{ color: MUTED }}>
                    No aha moments yet — capture insights from any client card.
                  </p>
                ) : (
                  <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {filteredAhaMoments.map((row) => {
                      const mt = normalizeAhaType(row.moment_type);
                      const leftColor = AHA_TYPE_LEFT_BORDER[mt] ?? MUTED;
                      const badgeLabel = AHA_TYPE_BADGE_LABEL[mt] ?? mt;
                      return (
                        <div
                          key={row.id}
                          className="border bg-white"
                          style={{
                            border: `1px solid ${BORDER}`,
                            borderLeft: `4px solid ${leftColor}`,
                            borderRadius: 10,
                            padding: '12px 16px',
                          }}
                        >
                          <p className="text-[13px] leading-relaxed" style={{ color: HEADER }}>
                            {row.moment_text}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold" style={{ color: leftColor }}>
                              {badgeLabel}
                            </span>
                            <span style={{ color: MUTED }}>
                              {mt === 'client_specific' && row.client_name?.trim()
                                ? `— from ${row.client_name.trim()}`
                                : ''}
                            </span>
                            <span className="tabular-nums text-[10px]" style={{ color: MUTED }}>
                              {formatAhaMomentDate(row.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-10">
                <h3 className="text-sm font-bold" style={{ color: HEADER }}>
                  Golden rules
                </h3>
                <p className="mt-1 text-xs" style={{ color: MUTED }}>
                  From converted clients
                </p>
                {goldenRules.length === 0 ? (
                  <p className="mt-3 text-sm" style={{ color: MUTED }}>
                    Golden rules appear as you capture what converts.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {goldenRules.map((row, idx) => (
                      <div
                        key={`gr-${idx}`}
                        className="rounded-[10px] border bg-white"
                        style={{
                          border: `1px solid ${BORDER}`,
                          borderLeft: `4px solid ${TEAL}`,
                          padding: '14px 16px',
                        }}
                      >
                        <p className="text-[13px] leading-relaxed" style={{ color: HEADER }}>
                          {row.golden_rules_notes.trim()}
                        </p>
                        <p className="mt-2 text-[11px] italic" style={{ color: MUTED }}>
                          — from {row.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-10">
                <h3 className="text-sm font-bold" style={{ color: HEADER }}>
                  DISC distribution
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      { letter: 'D' as const, color: '#F05F57' },
                      { letter: 'I' as const, color: '#C8613F' },
                      { letter: 'S' as const, color: '#3BBFBF' },
                      { letter: 'C' as const, color: '#7A8F95' },
                    ] as const
                  ).map(({ letter, color }) => (
                    <div
                      key={letter}
                      className="rounded-[10px] border bg-white px-3 py-3"
                      style={{ borderColor: BORDER }}
                    >
                      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
                        {discCounts[letter]}
                      </p>
                      <p className="text-sm font-semibold" style={{ color: HEADER }}>
                        {letter}
                      </p>
                    </div>
                  ))}
                </div>
                {discInsight ? (
                  <p className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
                    {discInsight}
                  </p>
                ) : null}
              </div>

              <div
                className="mt-10"
                style={{
                  background: '#F4F7F8',
                  border: `1px solid ${BORDER}`,
                  borderLeft: `4px solid ${TEAL}`,
                  borderRadius: 10,
                  padding: '16px 20px',
                }}
              >
                <h3 className="text-[13px] font-bold" style={{ color: HEADER }}>
                  What comes next
                </h3>
                <div className="mt-3 space-y-3 text-xs leading-relaxed" style={{ color: MUTED }}>
                  <p>
                    Month 6: Coach Bot runs its first QLoRA fine-tuning on your session data. Your AI begins
                    learning your clients, your language, and your coaching patterns.
                  </p>
                  <p>
                    Month 12: A fine-tuned model replaces the base model. Coach Bot now speaks your coaching
                    language — not generic AI language.
                  </p>
                  <p>
                    Year 2: Every correction you make, every aha moment you capture, every golden rule you
                    write becomes training data. The system compounds. Your institutional knowledge becomes
                    permanent, transferable, and exponentially more valuable.
                  </p>
                  <p>The coaches who start now build the biggest advantage.</p>
                </div>
                <p className="mt-4 text-[11px] font-bold" style={{ color: TEAL }}>
                  You are {daysIn} days in. Keep going.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ZONE 3 — PROFILE COMPLETENESS */}
      <section
        className="rounded-xl border bg-white p-6"
        style={{ borderColor: BORDER }}
      >
        <h2 className="text-base font-bold" style={{ color: HEADER }}>
          Profile completeness
        </h2>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          {completeCount} of {activeClientTotal} active clients have complete profiles (DISC, You 2.0, sessions
          with notes, and TUMAY contact).
        </p>
        <p className="mt-2 text-[11px] italic" style={{ color: MUTED }}>
          Profiles improve as you upload Fathom transcripts and log sessions.
        </p>
        <div className="mt-5 space-y-4">
          {activeClientTotal === 0 ? (
            <p className="text-sm" style={{ color: MUTED }}>
              No active clients yet.
            </p>
          ) : (
            clientsComplete.map((row) => {
              const pct = profileWeightedPct(row);
              const barColor = profileBarColor(pct);
              return (
                <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span
                    className="min-w-[140px] shrink-0 text-sm font-medium sm:w-48"
                    style={{ color: HEADER }}
                  >
                    {row.name}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs tabular-nums font-semibold" style={{ color: HEADER }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[#F4F7F8]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
                      {profileStatusLabel(pct)}
                    </p>
                    <ProfileCompletenessStatusIcons row={row} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
