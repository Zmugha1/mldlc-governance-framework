import { useEffect, useState, type CSSProperties } from 'react';
import { Star } from 'lucide-react';
import { getDb } from '../services/db';

const PLACEMENT_TARGET = 11;
const REVENUE_GOAL = 300_000;
const DEFAULT_PLACEMENT_REVENUE = 28_000;
const C3_WEEKLY_TARGET = 2.5;

const TARGET_C1 = 75;
const TARGET_C2 = 65;
const TARGET_C3 = 83;
const TARGET_C4 = 80;

const STAGE_ORDER = ['IC', 'C1', 'C2', 'C3', 'C4', 'C5'] as const;

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

const kpiCardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #C8E8E5',
  borderRadius: 12,
  padding: '16px 20px',
};

function ProgressBar({ fraction, fillColor }: { fraction: number; fillColor: string }) {
  const w = Math.max(0, Math.min(100, fraction * 100));
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ background: '#F4F7F8' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: fillColor }} />
    </div>
  );
}

export default function BusinessGoals() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placementCount, setPlacementCount] = useState(0);
  const [revenueSum, setRevenueSum] = useState(0);
  const [c3WeekCount, setC3WeekCount] = useState(0);
  const [c1ShowPct, setC1ShowPct] = useState(0);
  const [c4ConversionPct, setC4ConversionPct] = useState(0);
  const [avgDaysInStage, setAvgDaysInStage] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [c2MovementPct, setC2MovementPct] = useState(0);
  const [c3MovementPct, setC3MovementPct] = useState(0);

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

        const activeSql = `LOWER(COALESCE(c.outcome_bucket, 'active')) = 'active'`;

        const [
          placementRows,
          revenueRows,
          c3WeekRows,
          c1DenomRows,
          c1NumRowsCorrect,
          c4Rows,
          velocityRows,
          atRiskRows,
          stageRows,
          c2DenomRows,
          c2NumRows,
          c3DenomRows,
          c3NumRows,
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
            `SELECT COUNT(*) as cnt FROM clients c
             WHERE ${activeSql}
               AND TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('C1', 'Seeker Connection')`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(DISTINCT s.client_id) as cnt
             FROM coaching_sessions s
             JOIN clients c ON c.id = s.client_id
             WHERE ${activeSql}
               AND s.stage = 'C1'
               AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
               AND strftime('%Y-%m', date(s.session_date)) = strftime('%Y-%m', date('now'))`,
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
          db.select<{ avg_days: number | null }>(
            `SELECT AVG(julianday(date('now')) - julianday(date(mx.last_dt))) as avg_days
             FROM (
               SELECT s.client_id, MAX(s.session_date) as last_dt
               FROM coaching_sessions s
               JOIN clients c ON c.id = s.client_id
               WHERE ${activeSql}
                 AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
               GROUP BY s.client_id
             ) mx`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM clients c
             WHERE ${activeSql}
               AND TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN (
                 'C3', 'Possibilities', 'Coach Client Collaboration', 'C4', 'Client Career 2.0'
               )
               AND (
                 NOT EXISTS (
                   SELECT 1 FROM coaching_sessions s
                   WHERE s.client_id = c.id
                     AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
                 )
                 OR (
                   SELECT MAX(date(s.session_date)) FROM coaching_sessions s
                   WHERE s.client_id = c.id
                     AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
                 ) < date('now', '-14 days')
               )`,
            []
          ),
          db.select<{ code: string; cnt: number }>(
            `SELECT t.code, COUNT(*) as cnt FROM (
               SELECT CASE
                 WHEN TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('IC', 'Initial Contact') THEN 'IC'
                 WHEN TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('C1', 'Seeker Connection') THEN 'C1'
                 WHEN TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('C2', 'Seeker Clarification') THEN 'C2'
                 WHEN TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('C3', 'Possibilities', 'Coach Client Collaboration') THEN 'C3'
                 WHEN TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('C4', 'Client Career 2.0') THEN 'C4'
                 WHEN TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('C5', 'Business Purchase') THEN 'C5'
                 ELSE 'IC'
               END as code
               FROM clients c
               WHERE ${activeSql}
             ) t
             GROUP BY t.code`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM clients c
             WHERE ${activeSql}
               AND TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('C2', 'Seeker Clarification')`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM clients c
             WHERE ${activeSql}
               AND TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('C2', 'Seeker Clarification')
               AND EXISTS (
                 SELECT 1 FROM coaching_sessions s
                 WHERE s.client_id = c.id
                   AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
                   AND date(s.session_date) >= date('now', '-30 days')
               )`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM clients c
             WHERE ${activeSql}
               AND TRIM(COALESCE(NULLIF(c.inferred_stage, ''), c.stage)) IN ('C3', 'Possibilities', 'Coach Client Collaboration')`,
            []
          ),
          db.select<{ cnt: number }>(
            `SELECT COUNT(DISTINCT s.client_id) as cnt
             FROM coaching_sessions s
             JOIN clients c ON c.id = s.client_id
             WHERE ${activeSql}
               AND s.stage = 'C3'
               AND s.session_date IS NOT NULL AND TRIM(s.session_date) != ''
               AND date(s.session_date) >= date('now', '-30 days')`,
            []
          ),
        ]);

        if (cancelled) return;

        const c1Denom = Number(c1DenomRows[0]?.cnt ?? 0);
        const c1Num = Number(c1NumRowsCorrect[0]?.cnt ?? 0);

        const c4 = c4Rows[0];
        const c4Total = Number(c4?.total ?? 0);
        const c4Poc = Number(c4?.with_poc ?? 0);

        const counts: Record<string, number> = {};
        for (const code of STAGE_ORDER) counts[code] = 0;
        for (const row of stageRows) {
          const code = row.code;
          if (STAGE_ORDER.includes(code as (typeof STAGE_ORDER)[number])) {
            counts[code] = Number(row.cnt ?? 0);
          }
        }

        setPlacementCount(Number(placementRows[0]?.cnt ?? 0));
        setRevenueSum(revenueRows.reduce((sum, r) => sum + parseRevenue(r.placement_revenue), 0));
        setC3WeekCount(Number(c3WeekRows[0]?.cnt ?? 0));
        setC1ShowPct(safePct(c1Num, c1Denom));
        setC4ConversionPct(safePct(c4Poc, c4Total));
        const v = velocityRows[0]?.avg_days;
        setAvgDaysInStage(v != null && Number.isFinite(v) ? Math.round(Number(v)) : 0);
        setAtRiskCount(Number(atRiskRows[0]?.cnt ?? 0));
        setStageCounts(counts);

        const c2d = Number(c2DenomRows[0]?.cnt ?? 0);
        const c2n = Number(c2NumRows[0]?.cnt ?? 0);
        setC2MovementPct(safePct(c2n, c2d));

        const c3d = Number(c3DenomRows[0]?.cnt ?? 0);
        const c3n = Number(c3NumRows[0]?.cnt ?? 0);
        setC3MovementPct(safePct(c3n, c3d));
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

  const c3WeekDisplay = c3WeekCount.toFixed(1);
  const c3OnTrack = c3WeekCount >= C3_WEEKLY_TARGET;
  const maxStage = Math.max(1, ...STAGE_ORDER.map((k) => stageCounts[k] ?? 0));

  const planRows = [
    { label: 'C1 Show Rate', actual: c1ShowPct, target: TARGET_C1 },
    { label: 'C2 Movement', actual: c2MovementPct, target: TARGET_C2 },
    { label: 'C3 Movement', actual: c3MovementPct, target: TARGET_C3 },
    { label: 'C4 Movement', actual: c4ConversionPct, target: TARGET_C4 },
  ];

  const atRiskColor =
    atRiskCount >= 2 ? '#F05F57' : atRiskCount === 1 ? '#F59E0B' : '#22C55E';

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

  const moneyFmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="font-bold" style={{ fontSize: 22, color: '#2D4459' }}>
          Business Goals
        </h1>
        <p className="mt-1" style={{ fontSize: 13, color: '#7A8F95' }}>
          Your $300,000 year — year to date
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div style={kpiCardStyle}>
          <p className="font-medium uppercase tracking-wide" style={{ fontSize: 11, color: '#7A8F95' }}>
            Placements
          </p>
          <p className="mt-1 font-bold tabular-nums" style={{ fontSize: 28, color: '#2D4459' }}>
            {placementCount} of {PLACEMENT_TARGET}
          </p>
          <p className="mt-1" style={{ fontSize: 12, color: '#7A8F95' }}>
            {moneyFmt.format(revenueSum)} of {moneyFmt.format(REVENUE_GOAL)}
          </p>
          <ProgressBar fraction={placementCount / PLACEMENT_TARGET} fillColor="#3BBFBF" />
        </div>

        <div style={kpiCardStyle} className="relative">
          <div className="absolute right-5 top-5">
            <Star className="h-6 w-6" stroke="#F05F57" fill="#F05F57" aria-hidden />
          </div>
          <p className="font-medium uppercase tracking-wide" style={{ fontSize: 11, color: '#7A8F95' }}>
            C3 this week
          </p>
          <p className="mt-1 font-bold tabular-nums" style={{ fontSize: 28, color: '#2D4459' }}>
            {c3WeekDisplay} / {C3_WEEKLY_TARGET}
          </p>
          <p className="mt-1 font-medium" style={{ fontSize: 12, color: c3OnTrack ? '#3BBFBF' : '#F05F57' }}>
            {c3OnTrack ? 'On track' : 'Below target'}
          </p>
        </div>

        <div style={kpiCardStyle}>
          <p className="font-medium uppercase tracking-wide" style={{ fontSize: 11, color: '#7A8F95' }}>
            C1 show rate
          </p>
          <p className="mt-1 font-bold tabular-nums" style={{ fontSize: 28, color: '#2D4459' }}>
            {c1ShowPct}%
          </p>
          <p className="mt-1" style={{ fontSize: 12, color: '#7A8F95' }}>
            target: 75%
          </p>
          <ProgressBar fraction={c1ShowPct / TARGET_C1} fillColor="#3BBFBF" />
        </div>

        <div style={kpiCardStyle}>
          <p className="font-medium uppercase tracking-wide" style={{ fontSize: 11, color: '#7A8F95' }}>
            C4 conversion
          </p>
          <p className="mt-1 font-bold tabular-nums" style={{ fontSize: 28, color: '#2D4459' }}>
            {c4ConversionPct}%
          </p>
          <p className="mt-1" style={{ fontSize: 12, color: '#7A8F95' }}>
            target: 80%
          </p>
          <ProgressBar fraction={c4ConversionPct / TARGET_C4} fillColor="#3BBFBF" />
        </div>

        <div style={kpiCardStyle}>
          <p className="font-medium uppercase tracking-wide" style={{ fontSize: 11, color: '#7A8F95' }}>
            Avg days in stage
          </p>
          <p className="mt-1 font-bold tabular-nums" style={{ fontSize: 28, color: '#2D4459' }}>
            {avgDaysInStage} days
          </p>
          <p className="mt-1" style={{ fontSize: 12, color: '#7A8F95' }}>
            across active clients
          </p>
        </div>

        <div style={kpiCardStyle}>
          <p className="font-medium uppercase tracking-wide" style={{ fontSize: 11, color: '#7A8F95' }}>
            At risk this week
          </p>
          <p className="mt-1 font-bold tabular-nums" style={{ fontSize: 28, color: atRiskColor }}>
            {atRiskCount} clients
          </p>
          <p className="mt-1" style={{ fontSize: 12, color: '#7A8F95' }}>
            C3/C4 no session in 14 days
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-semibold" style={{ color: '#2D4459' }}>
            Stage distribution
          </h2>
          <div className="space-y-3">
            {STAGE_ORDER.map((code) => {
              const n = stageCounts[code] ?? 0;
              const barW = maxStage > 0 ? (n / maxStage) * 100 : 0;
              return (
                <div key={code} className="flex items-center gap-3">
                  <span
                    className="w-8 shrink-0 text-sm font-medium tabular-nums"
                    style={{ color: '#2D4459' }}
                  >
                    {code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="h-3 overflow-hidden rounded-full" style={{ background: '#F4F7F8' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${barW}%`, background: '#3BBFBF' }}
                      />
                    </div>
                  </div>
                  <span
                    className="w-8 shrink-0 text-right text-sm tabular-nums"
                    style={{ color: '#7A8F95' }}
                  >
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-4 font-semibold" style={{ color: '#2D4459' }}>
            Business plan targets
          </h2>
          <div
            className="overflow-x-auto rounded-xl border"
            style={{ borderColor: '#C8E8E5' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F4F7F8', color: '#2D4459' }}>
                  <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: '#C8E8E5' }}>
                    Stage
                  </th>
                  <th className="border-b px-3 py-2 text-right font-semibold" style={{ borderColor: '#C8E8E5' }}>
                    Actual %
                  </th>
                  <th className="border-b px-3 py-2 text-right font-semibold" style={{ borderColor: '#C8E8E5' }}>
                    Target %
                  </th>
                  <th className="border-b px-3 py-2 text-right font-semibold" style={{ borderColor: '#C8E8E5' }}>
                    Gap
                  </th>
                </tr>
              </thead>
              <tbody>
                {planRows.map((row) => {
                  const met = row.actual >= row.target;
                  const gapPp = Math.round((row.target - row.actual) * 10) / 10;
                  const statusColor = met ? '#22C55E' : '#F05F57';
                  return (
                    <tr key={row.label}>
                      <td
                        className="border-b px-3 py-2 font-medium"
                        style={{ borderColor: '#C8E8E5', color: '#2D4459' }}
                      >
                        {row.label}
                      </td>
                      <td
                        className="border-b px-3 py-2 text-right tabular-nums font-medium"
                        style={{ borderColor: '#C8E8E5', color: statusColor }}
                      >
                        {row.actual}%
                      </td>
                      <td
                        className="border-b px-3 py-2 text-right tabular-nums"
                        style={{ borderColor: '#C8E8E5', color: '#7A8F95' }}
                      >
                        {row.target}%
                      </td>
                      <td
                        className="border-b px-3 py-2 text-right tabular-nums font-medium"
                        style={{ borderColor: '#C8E8E5', color: statusColor }}
                      >
                        {met ? '—' : `${gapPp} pp`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <p
        className="text-center text-xs italic leading-relaxed"
        style={{ color: '#7A8F95', fontSize: 12 }}
      >
        C3 is your north star.
        <br />
        2.5 presentations per week puts you
        <br />
        on track for 11 placements and $300,000.
      </p>
    </div>
  );
}
