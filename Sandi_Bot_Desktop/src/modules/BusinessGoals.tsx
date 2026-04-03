import { useEffect, useState, type ReactNode } from 'react';
import { Star, MessageSquare, CheckCircle, Target, Info } from 'lucide-react';
import { getDb } from '../services/db';
import UATFeedback from '@/components/UATFeedback';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PLACEMENT_TARGET = 11;
const REVENUE_GOAL = 300_000;
const DEFAULT_PLACEMENT_REVENUE = 28_000;
const DEFAULT_REVENUE_TO_DATE = 84_000;
const C3_WEEKLY_TARGET = 2.5;

const TARGET_IC = 70;
const TARGET_C1 = 75;
const TARGET_C2 = 65;
const TARGET_C3 = 83;
const TARGET_C4 = 80;

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

function parseRevenue(raw: string | null | undefined): number {
  if (raw == null || String(raw).trim() === '') return DEFAULT_PLACEMENT_REVENUE;
  const n = Number(String(raw).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PLACEMENT_REVENUE;
}

function safePct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 1000) / 10);
}

function monthsElapsedInYear(now: Date): number {
  const start = new Date(now.getFullYear(), 0, 1);
  const days = (now.getTime() - start.getTime()) / 86_400_000;
  return Math.max(0.25, days / 30.437);
}

function countResolvedFlagsInJson(raw: string | null | undefined): number {
  try {
    if (raw == null || String(raw).trim() === '' || String(raw).trim() === '[]') return 0;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return 0;
    return arr.filter((x) => String(x).startsWith('resolved:')).length;
  } catch {
    return 0;
  }
}

const STORAGE_STAGE_FILTER = 'client_intelligence_stage_filter';

function navigateToClientIntelligence(stageFilter?: 'C1' | 'C2' | 'C4'): void {
  try {
    localStorage.removeItem('selected_client_name');
    if (stageFilter) {
      localStorage.setItem(STORAGE_STAGE_FILTER, stageFilter);
    } else {
      localStorage.removeItem(STORAGE_STAGE_FILTER);
    }
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

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded p-0.5 text-[#7A8F95] hover:bg-[#F4F7F8] hover:text-[#2D4459]"
          aria-label="More info"
        >
          <Info className="h-4 w-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed" side="top">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

type GapRowDef = {
  key: string;
  stage: string;
  description: string;
  actual: number | null;
  target: number;
  actionLabel: string;
  onAction: () => void;
  nullTooltip?: string;
  /** Shown below "—" when actual is null or 0 (Where to Focus). */
  emptyHint?: string;
  /** C4 keeps legacy green; funnel rows use teal vs coral */
  colorMode?: 'funnel' | 'legacy';
};

export default function BusinessGoals() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerNow, setHeaderNow] = useState(() => new Date());
  const [placementCount, setPlacementCount] = useState(0);
  const [revenueSumRaw, setRevenueSumRaw] = useState(0);
  const [c3WeekCount, setC3WeekCount] = useState(0);
  const [c3YtdCount, setC3YtdCount] = useState(0);
  const [icShowPct, setIcShowPct] = useState<number | null>(null);
  const [c1ShowPct, setC1ShowPct] = useState<number | null>(null);
  const [c4ConversionPct, setC4ConversionPct] = useState(0);
  const [c2MovementPct, setC2MovementPct] = useState<number | null>(null);
  const [c3MovementPct, setC3MovementPct] = useState<number | null>(null);
  const [interventionCount, setInterventionCount] = useState(0);
  const [flagsResolvedCount, setFlagsResolvedCount] = useState(0);
  const [clientsReadyCount, setClientsReadyCount] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setHeaderNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const db = await getDb();
        const now = new Date();
        const weekStart = formatLocalYyyyMmDd(startOfWeekMondayLocal(now));
        const today = formatLocalYyyyMmDd(now);
        const yearStart = `${now.getFullYear()}-01-01`;

        const activeSql = `LOWER(COALESCE(c.outcome_bucket, 'active')) = 'active'`;

        const [
          placementRows,
          revenueRows,
          c3WeekRows,
          c3YtdRows,
          icScheduledRows,
          icHeldRows,
          c1ScheduledRows,
          c1HeldRows,
          c4Rows,
          interventionRows,
          pinkRows,
          readyRows,
        ] = await Promise.all([
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
             WHERE s.stage = 'IC'
                 AND s.session_scheduled = 1
                 AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
                 AND date(s.session_date) >= date('now', 'start of year')`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM coaching_sessions s
             WHERE s.stage = 'IC'
                 AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
                 AND date(s.session_date) >= date('now', 'start of year')`,
            []
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
          db.select<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM intervention_logs`, []),
          db.select<{ pink_flags: string | null }>(
            `SELECT pink_flags FROM clients c
             WHERE c.pink_flags IS NOT NULL AND TRIM(c.pink_flags) != '' AND c.pink_flags != '[]'`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM clients c
             WHERE ${activeSql}
               AND TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN (
                 'C4', 'C5', 'Client Career 2.0', 'Business Purchase'
               )`,
            []
          ),
        ]);

        if (cancelled) return;

        const icSched = Number(icScheduledRows[0]?.cnt ?? 0);
        const icHeld = Number(icHeldRows[0]?.cnt ?? 0);
        const c1Sched = Number(c1ScheduledRows[0]?.cnt ?? 0);
        const c1Held = Number(c1HeldRows[0]?.cnt ?? 0);
        const c4 = c4Rows[0];
        const c4Total = Number(c4?.total ?? 0);
        const c4Poc = Number(c4?.with_poc ?? 0);

        setPlacementCount(Number(placementRows[0]?.cnt ?? 0));
        setRevenueSumRaw(revenueRows.reduce((sum, r) => sum + parseRevenue(r.placement_revenue), 0));
        setC3WeekCount(Number(c3WeekRows[0]?.cnt ?? 0));
        setC3YtdCount(Number(c3YtdRows[0]?.cnt ?? 0));
        setIcShowPct(
          icSched === 0 ? null : Math.min(100, Math.round((icHeld / icSched) * 1000) / 10)
        );
        setC1ShowPct(
          c1Sched === 0 ? null : Math.min(100, Math.round((c1Held / c1Sched) * 1000) / 10)
        );
        setC4ConversionPct(safePct(c4Poc, c4Total));

        setC2MovementPct(null);
        setC3MovementPct(null);

        setInterventionCount(Number(interventionRows[0]?.cnt ?? 0));
        let resolved = 0;
        for (const pr of pinkRows) {
          resolved += countResolvedFlagsInJson(pr.pink_flags);
        }
        setFlagsResolvedCount(resolved);
        setClientsReadyCount(Number(readyRows[0]?.cnt ?? 0));
      } catch (e) {
        if (!cancelled) {
          setError(String((e as { message?: string })?.message ?? e ?? 'Failed to load'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const moneyFmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const revenueToDate =
    revenueSumRaw > 0 ? revenueSumRaw : DEFAULT_REVENUE_TO_DATE;
  const revenueProgressPct = Math.min(100, (revenueToDate / REVENUE_GOAL) * 100);

  const monthsElapsed = monthsElapsedInYear(headerNow);
  const projectedYearEnd = Math.round(
    (placementCount / monthsElapsed) * 12 * DEFAULT_PLACEMENT_REVENUE
  );
  const projectedColor = projectedYearEnd > REVENUE_GOAL ? '#3BBFBF' : '#F05F57';

  const c3WeekNum = c3WeekCount;
  const c3Display = `${c3WeekNum.toFixed(1)} / ${C3_WEEKLY_TARGET}`;
  const c3NumberColor = c3WeekNum >= C3_WEEKLY_TARGET ? '#3BBFBF' : '#F05F57';

  let verdictNode: ReactNode;
  if (c3WeekNum >= C3_WEEKLY_TARGET) {
    verdictNode = (
      <p className="mt-2" style={{ fontSize: 14, color: '#3BBFBF' }}>
        On track this week ✓
      </p>
    );
  } else if (c3WeekNum >= 1) {
    const need = Math.max(0, C3_WEEKLY_TARGET - c3WeekNum);
    verdictNode = (
      <p className="mt-2" style={{ fontSize: 14, color: '#C8613F' }}>
        {need.toFixed(1)} more needed this week
      </p>
    );
  } else {
    verdictNode = (
      <p className="mt-2 font-bold" style={{ fontSize: 14, color: '#F05F57' }}>
        No C3 presentations yet this week — this is your most important action today
      </p>
    );
  }

  const headerDateStr = headerNow.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const IC_EMPTY_HINT =
    'Mark IC sessions scheduled in Client Intelligence to calculate';
  const C1_EMPTY_HINT =
    'Mark C1 sessions scheduled in Client Intelligence to calculate';
  const C2_EMPTY_HINT = 'Move C1 clients forward to calculate';
  const C3_EMPTY_HINT = 'Move C2 clients forward to calculate';

  const gapRows: GapRowDef[] = [
    {
      key: 'ic',
      stage: 'IC Session Held Rate',
      description: 'Scheduled ICs actually held',
      actual: icShowPct,
      target: TARGET_IC,
      actionLabel: 'Mark sessions scheduled →',
      onAction: () => navigateToClientIntelligence(),
      nullTooltip: IC_EMPTY_HINT,
      emptyHint: IC_EMPTY_HINT,
      colorMode: 'funnel',
    },
    {
      key: 'c1',
      stage: 'C1 Show Rate',
      description: 'Scheduled sessions held',
      actual: c1ShowPct,
      target: TARGET_C1,
      actionLabel: 'Mark sessions scheduled →',
      onAction: () => navigateToClientIntelligence(),
      nullTooltip: C1_EMPTY_HINT,
      emptyHint: C1_EMPTY_HINT,
      colorMode: 'funnel',
    },
    {
      key: 'c2',
      stage: 'C2 Movement',
      description: 'C1 clients advancing',
      actual: c2MovementPct,
      target: TARGET_C2,
      actionLabel: 'Review C1 clients →',
      onAction: () => navigateToClientIntelligence('C1'),
      nullTooltip: C2_EMPTY_HINT,
      emptyHint: C2_EMPTY_HINT,
      colorMode: 'funnel',
    },
    {
      key: 'c3',
      stage: 'C3 Movement',
      description: 'C2 clients advancing',
      actual: c3MovementPct,
      target: TARGET_C3,
      actionLabel: 'Review C2 clients →',
      onAction: () => navigateToClientIntelligence('C2'),
      nullTooltip: C3_EMPTY_HINT,
      emptyHint: C3_EMPTY_HINT,
      colorMode: 'funnel',
    },
    {
      key: 'c4',
      stage: 'C4 Conversion',
      description: 'C4 clients reaching POC',
      actual: c4ConversionPct,
      target: TARGET_C4,
      actionLabel: 'Mark POC reached →',
      onAction: () => navigateToClientIntelligence('C4'),
      colorMode: 'legacy',
    },
  ];

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: '#7A8F95' }}>
        Loading business goals…
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
    <div className="space-y-0 p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-bold" style={{ fontSize: 22, color: '#2D4459' }}>
            Business Goals
          </h1>
          <p className="mt-1" style={{ fontSize: 13, color: '#7A8F95' }}>
            Your $300,000 year — year to date
          </p>
        </div>
        <p className="text-right text-xs" style={{ color: '#7A8F95', fontSize: 12 }}>
          {headerDateStr}
        </p>
      </header>

      {/* ZONE 1 — NORTH STAR */}
      <section
        className="flex flex-col gap-6 lg:flex-row"
        style={{
          background: 'white',
          border: '1px solid #C8E8E5',
          borderTop: '4px solid #F05F57',
          borderRadius: 12,
          padding: '24px 28px',
        }}
      >
        <div className="min-w-0 lg:w-[60%] lg:flex-none">
          <p
            className="font-medium uppercase tracking-wide"
            style={{ fontSize: 11, color: '#7A8F95', letterSpacing: '0.06em' }}
          >
            C3 PRESENTATIONS THIS WEEK
          </p>
          <p
            className="mt-2 font-bold tabular-nums"
            style={{ fontSize: 48, color: c3NumberColor, lineHeight: 1.1 }}
          >
            {c3Display}
          </p>
          {verdictNode}
          <p className="mt-3" style={{ fontSize: 12, color: '#7A8F95' }}>
            YTD: {c3YtdCount} presentations total
          </p>
        </div>
        <div
          className="relative min-w-0 flex-1 lg:w-[40%] lg:flex-none"
          style={{
            background: '#F4F7F8',
            borderRadius: 8,
            padding: '16px 20px',
          }}
        >
          <Star
            className="absolute right-4 top-4 h-5 w-5 shrink-0"
            style={{ color: '#F05F57' }}
            fill="#F05F57"
            aria-hidden
          />
          <p
            className="pr-8 font-medium uppercase tracking-wide"
            style={{ fontSize: 10, color: '#7A8F95' }}
          >
            WHY THIS MATTERS
          </p>
          <p
            className="mt-3 pr-6"
            style={{ fontSize: 12, color: '#2D4459', lineHeight: 1.6 }}
          >
            2.5 C3 presentations per week = 11 placements per year = $300,000 gross revenue. Every week
            you hit this number you are on track for your goal.
          </p>
        </div>
      </section>

      {/* ZONE 2 — REVENUE STORY */}
      <section
        className="mt-4"
        style={{
          background: '#2D4459',
          borderRadius: 12,
          padding: '24px 28px',
        }}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <p className="uppercase tracking-wide" style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
              REVENUE TO DATE
            </p>
            <p className="mt-2 font-bold tabular-nums text-white" style={{ fontSize: 32 }}>
              {moneyFmt.format(revenueToDate)}
            </p>
            <p className="mt-1" style={{ fontSize: 12, color: '#C8E8E5' }}>
              {placementCount} of {PLACEMENT_TARGET} placements
            </p>
          </div>
          <div>
            <p className="uppercase tracking-wide" style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
              ANNUAL TARGET
            </p>
            <p className="mt-2 font-bold tabular-nums" style={{ fontSize: 28, color: '#C8E8E5' }}>
              $300,000
            </p>
            <p className="mt-1" style={{ fontSize: 12, color: 'rgba(200,232,229,0.7)' }}>
              11 placements at $28K avg
            </p>
          </div>
          <div>
            <p className="uppercase tracking-wide" style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
              PROJECTED YEAR END
            </p>
            <p className="mt-2 font-bold tabular-nums" style={{ fontSize: 28, color: projectedColor }}>
              {moneyFmt.format(projectedYearEnd)}
            </p>
            <p className="mt-1" style={{ fontSize: 12, color: 'rgba(200,232,229,0.7)' }}>
              based on current pace
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between" style={{ fontSize: 10, color: 'white' }}>
            <span>$0</span>
            <span>$300,000</span>
          </div>
          <div className="relative pt-1">
            <div
              className="relative h-2.5 w-full overflow-hidden rounded-[5px]"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <div
                className="h-2.5 rounded-[5px] transition-all"
                style={{
                  width: `${revenueProgressPct}%`,
                  background: '#3BBFBF',
                }}
              />
            </div>
            <div className="pointer-events-none absolute left-0 top-1/2 h-2.5 w-full -translate-y-1/2">
              {[25, 50, 75].map((pct, i) => {
                const labels = ['$75K', '$150K', '$225K'];
                return (
                  <Tooltip key={pct}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="pointer-events-auto absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm"
                        style={{ left: `${pct}%` }}
                        aria-label={labels[i]}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {labels[i]}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 3 — GAP ANALYSIS */}
      <section
        className="mt-4"
        style={{
          background: 'white',
          border: '1px solid #C8E8E5',
          borderRadius: 12,
          padding: '24px 28px',
        }}
      >
        <h2 className="font-bold" style={{ fontSize: 16, color: '#2D4459' }}>
          Where to Focus
        </h2>
        <p className="mt-1" style={{ fontSize: 12, color: '#7A8F95' }}>
          Your business plan gaps and what to do about them.
        </p>
        <div className="mt-2">
          {gapRows.map((row, idx) => {
            const mode = row.colorMode ?? 'funnel';
            const showAsEmpty =
              row.actual === null ||
              (row.emptyHint != null && row.actual === 0);
            const showEmptyHint = Boolean(row.emptyHint) && showAsEmpty;
            const met =
              !showAsEmpty && row.actual !== null && row.actual >= row.target;
            const actualColor =
              showAsEmpty
                ? '#7A8F95'
                : mode === 'legacy'
                  ? met
                    ? '#22C55E'
                    : '#F05F57'
                  : met
                    ? '#3BBFBF'
                    : '#F05F57';
            const isLast = idx === gapRows.length - 1;
            const actualMain =
              showAsEmpty ? (
                row.nullTooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help tabular-nums">—</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs leading-relaxed" side="top">
                      {row.nullTooltip}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  '—'
                )
              ) : (
                `${row.actual}%`
              );
            return (
              <div
                key={row.key}
                className="group flex flex-wrap items-center gap-y-3 border-[#C8E8E5] py-3.5 transition-colors hover:bg-[#F4F7F8]"
                style={{
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomStyle: 'solid',
                }}
              >
                <div className="w-full min-w-[140px] basis-[30%]">
                  <p className="font-bold" style={{ fontSize: 13, color: '#2D4459' }}>
                    {row.stage}
                  </p>
                  <p style={{ fontSize: 11, color: '#7A8F95' }}>{row.description}</p>
                </div>
                <div
                  className="flex w-full min-w-[72px] basis-[20%] flex-col text-left md:items-center md:text-center"
                  style={{ fontSize: 20, color: actualColor }}
                >
                  <span className="font-bold tabular-nums">{actualMain}</span>
                  {showEmptyHint ? (
                    <p
                      className="max-w-[min(100%,220px)] font-normal md:mx-auto"
                      style={{
                        fontSize: 11,
                        color: '#7A8F95',
                        fontStyle: 'italic',
                        marginTop: 4,
                      }}
                    >
                      {row.emptyHint}
                    </p>
                  ) : null}
                </div>
                <div
                  className="hidden w-full basis-[15%] justify-center text-center md:flex"
                  style={{ color: '#C8E8E5' }}
                >
                  →
                </div>
                <div
                  className="w-full min-w-[56px] basis-[15%] text-left font-semibold md:text-center"
                  style={{ fontSize: 13, color: '#2D4459' }}
                >
                  {row.target}%
                </div>
                <div className="w-full min-w-[160px] basis-[20%] md:flex md:justify-end">
                  <button
                    type="button"
                    className="rounded-full px-3 py-1.5 font-bold text-white transition-opacity hover:opacity-90"
                    style={{ background: '#3BBFBF', fontSize: 11 }}
                    onClick={row.onAction}
                  >
                    {row.actionLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ZONE 4 — INTELLIGENCE CARDS */}
      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          className="relative rounded-xl border border-[#C8E8E5] bg-white"
          style={{ borderTopWidth: 3, borderTopColor: '#3BBFBF', padding: '16px 20px' }}
        >
          <div className="absolute right-3 top-3">
            <InfoTip text="Every time you respond to a signal in Coaching Actions, Coach Bot logs your decision. These build your coaching playbook over time." />
          </div>
          <MessageSquare className="h-5 w-5" style={{ color: '#3BBFBF' }} aria-hidden />
          <p className="mt-2 font-medium uppercase tracking-wide" style={{ fontSize: 10, color: '#7A8F95' }}>
            DECISIONS LOGGED
          </p>
          <p className="mt-2 font-bold tabular-nums" style={{ fontSize: 28, color: '#2D4459' }}>
            {interventionCount}
          </p>
          <p style={{ fontSize: 11, color: '#7A8F95' }}>responses to signals</p>
        </div>

        <div
          className="relative rounded-xl border border-[#C8E8E5] bg-white"
          style={{ borderTopWidth: 3, borderTopColor: '#27ae60', padding: '16px 20px' }}
        >
          <div className="absolute right-3 top-3">
            <InfoTip text="Pink flags you marked as resolved on client cards. Each one represents a coaching challenge you navigated." />
          </div>
          <CheckCircle className="h-5 w-5" style={{ color: '#27ae60' }} aria-hidden />
          <p className="mt-2 font-medium uppercase tracking-wide" style={{ fontSize: 10, color: '#7A8F95' }}>
            FLAGS RESOLVED
          </p>
          <p className="mt-2 font-bold tabular-nums" style={{ fontSize: 28, color: '#2D4459' }}>
            {flagsResolvedCount}
          </p>
          <p style={{ fontSize: 11, color: '#7A8F95' }}>pink flags turned green</p>
        </div>

        <div
          className="relative rounded-xl border border-[#C8E8E5] bg-white"
          style={{ borderTopWidth: 3, borderTopColor: '#F05F57', padding: '16px 20px' }}
        >
          <div className="absolute right-3 top-3">
            <InfoTip text="Active clients in C4 or C5 who are exploring business ownership. These clients are closest to your next placement." />
          </div>
          <Target className="h-5 w-5" style={{ color: '#F05F57' }} aria-hidden />
          <p className="mt-2 font-medium uppercase tracking-wide" style={{ fontSize: 10, color: '#7A8F95' }}>
            CLIENTS READY
          </p>
          <p className="mt-2 font-bold tabular-nums" style={{ fontSize: 28, color: '#2D4459' }}>
            {clientsReadyCount}
          </p>
          <p style={{ fontSize: 11, color: '#7A8F95' }}>in VALIDATE stage</p>
        </div>
      </section>

      <p
        className="mt-8 text-center text-xs italic leading-relaxed"
        style={{ color: '#7A8F95', fontSize: 12 }}
      >
        C3 is your north star.
        <br />
        2.5 presentations per week puts you
        <br />
        on track for 11 placements and $300,000.
      </p>
      <UATFeedback currentPage="Business Goals" />
    </div>
  );
}
