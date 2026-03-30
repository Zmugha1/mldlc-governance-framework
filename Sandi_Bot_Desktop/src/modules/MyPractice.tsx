import { useEffect, useState } from 'react';
import { getDb } from '../services/db';

const HEADER = '#2D4459';
const MUTED = '#7A8F95';
const BORDER = '#C8E8E5';
const TEAL = '#3BBFBF';

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
};

const YOU2_FIELD_KEYS: (keyof Omit<ClientCompletenessRow, 'id' | 'name'>)[] = [
  'one_year_vision',
  'spouse_name',
  'financial_net_worth_range',
  'launch_timeline',
  'dangers',
  'strengths',
  'opportunities',
  'areas_of_interest',
  'time_commitment',
  'reasons_for_change',
];

function fieldFilled(v: string | null | undefined): boolean {
  return v != null && String(v).trim().length > 0;
}

function you2CompletenessPct(row: ClientCompletenessRow): number {
  let n = 0;
  for (const k of YOU2_FIELD_KEYS) {
    if (fieldFilled(row[k])) n += 1;
  }
  return Math.round((n / YOU2_FIELD_KEYS.length) * 1000) / 10;
}

function clearScoreColor(avg: number): string {
  if (avg >= 4) return '#22C55E';
  if (avg >= 3) return '#F59E0B';
  return '#F05F57';
}

function completenessBarColor(pct: number): string {
  if (pct >= 100) return '#22C55E';
  if (pct > 0) return '#F59E0B';
  return '#F05F57';
}

const DISC_INSIGHT: Record<'D' | 'I' | 'S' | 'C', string> = {
  D: 'Most clients are Driver style. Be direct and results-focused.',
  I: 'Most clients are Influencer style. Lead with vision and excitement.',
  S: 'Most clients are Supporter style. Prioritize safety and steady steps.',
  C: 'Most clients are Analyst style. Lead with data and give them time.',
};

export default function MyPractice() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goldenRules, setGoldenRules] = useState<GoldenRuleRow[]>([]);
  const [clearAgg, setClearAgg] = useState<ClearAgg | null>(null);
  const [discAgg, setDiscAgg] = useState<DiscAgg | null>(null);
  const [clientsComplete, setClientsComplete] = useState<ClientCompletenessRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const db = await getDb();

        const rules = await db.select<GoldenRuleRow>(
          `SELECT name, golden_rules_notes
           FROM clients
           WHERE LOWER(COALESCE(outcome_bucket, '')) = 'converted'
             AND golden_rules_notes IS NOT NULL
             AND LENGTH(TRIM(golden_rules_notes)) > 5
           ORDER BY name COLLATE NOCASE`,
          []
        );

        const clear = await db.select<ClearAgg>(
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
        );

        const disc = await db.select<DiscAgg>(
          `SELECT
             SUM(CASE
               WHEN COALESCE(natural_d, 0) > COALESCE(natural_i, 0)
                AND COALESCE(natural_d, 0) > COALESCE(natural_s, 0)
                AND COALESCE(natural_d, 0) > COALESCE(natural_c, 0)
               THEN 1 ELSE 0 END) as d_count,
             SUM(CASE
               WHEN COALESCE(natural_i, 0) >= COALESCE(natural_d, 0)
                AND COALESCE(natural_i, 0) > COALESCE(natural_s, 0)
                AND COALESCE(natural_i, 0) > COALESCE(natural_c, 0)
               THEN 1 ELSE 0 END) as i_count,
             SUM(CASE
               WHEN COALESCE(natural_s, 0) >= COALESCE(natural_d, 0)
                AND COALESCE(natural_s, 0) >= COALESCE(natural_i, 0)
                AND COALESCE(natural_s, 0) > COALESCE(natural_c, 0)
               THEN 1 ELSE 0 END) as s_count,
             SUM(CASE
               WHEN COALESCE(natural_c, 0) >= COALESCE(natural_d, 0)
                AND COALESCE(natural_c, 0) >= COALESCE(natural_i, 0)
                AND COALESCE(natural_c, 0) >= COALESCE(natural_s, 0)
               THEN 1 ELSE 0 END) as c_count
           FROM client_disc_profiles`,
          []
        );

        const activeClients = await db.select<ClientCompletenessRow>(
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
             y.reasons_for_change
           FROM clients c
           LEFT JOIN client_you2_profiles y ON y.client_id = c.id
           WHERE LOWER(COALESCE(c.outcome_bucket, 'active')) = 'active'
           ORDER BY c.name COLLATE NOCASE`,
          []
        );

        if (!cancelled) {
          setGoldenRules(rules);
          setClearAgg(clear[0] ?? null);
          setDiscAgg(disc[0] ?? null);
          setClientsComplete(activeClients);
        }
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

  const totalSessions = Math.round(Number(clearAgg?.total_sessions ?? 0));

  const clearDims: { key: keyof Pick<ClearAgg, 'contracting' | 'listening' | 'exploring' | 'action' | 'reflection'>; label: string }[] = [
    { key: 'contracting', label: 'Contracting' },
    { key: 'listening', label: 'Listening' },
    { key: 'exploring', label: 'Exploring' },
    { key: 'action', label: 'Action' },
    { key: 'reflection', label: 'Reflection' },
  ];

  const d = Number(discAgg?.d_count ?? 0);
  const i = Number(discAgg?.i_count ?? 0);
  const s = Number(discAgg?.s_count ?? 0);
  const c = Number(discAgg?.c_count ?? 0);
  const discCounts = { D: d, I: i, S: s, C: c } as const;
  let topLetter: 'D' | 'I' | 'S' | 'C' = 'D';
  let topCount = -1;
  for (const [letter, n] of [
    ['D', d],
    ['I', i],
    ['S', s],
    ['C', c],
  ] as const) {
    if (n > topCount) {
      topCount = n;
      topLetter = letter;
    }
  }
  const discInsight = topCount <= 0 ? null : DISC_INSIGHT[topLetter];

  const completeCount = clientsComplete.filter((row) => you2CompletenessPct(row) >= 100).length;
  const totalActive = clientsComplete.length;

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
    <div className="space-y-10 p-6">
      <header>
        <h1 className="font-bold" style={{ fontSize: 22, color: HEADER }}>
          My Practice
        </h1>
        <p className="mt-1 whitespace-pre-line" style={{ fontSize: 13, color: MUTED }}>
          What the system has learned{'\n'}
          about your coaching.
        </p>
      </header>

      <section>
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="#C8613F"
            />
          </svg>
          <h2 className="font-bold" style={{ fontSize: 14, color: HEADER }}>
            Patterns That Convert
          </h2>
        </div>

        {goldenRules.length === 0 ? (
          <div
            className="mt-3 rounded-[10px] border bg-white px-4 py-4 text-sm"
            style={{ borderColor: BORDER, color: HEADER }}
          >
            Golden rules will appear here as you capture what converts your clients. Go to Coaching
            Actions to add them.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {goldenRules.map((row, idx) => (
              <div
                key={`golden-rule-${idx}`}
                className="rounded-[10px] border bg-white"
                style={{
                  border: `1px solid ${BORDER}`,
                  borderLeft: `4px solid ${TEAL}`,
                  padding: '14px 16px',
                }}
              >
                <p className="font-bold" style={{ fontSize: 11, color: TEAL }}>
                  {String(idx + 1).padStart(2, '0')}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: HEADER }}>
                  {row.golden_rules_notes.trim()}
                </p>
                <p className="mt-2 text-[11px] italic" style={{ color: MUTED }}>
                  — from {row.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold" style={{ fontSize: 14, color: HEADER }}>
          Coaching Quality
        </h2>
        {totalSessions < 3 ? (
          <p className="mt-3 text-sm" style={{ color: MUTED }}>
            CLEAR trends will appear after 3 or more post-call analyses.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {clearDims.map(({ key, label }) => {
              const raw = clearAgg?.[key];
              const avg = raw != null && Number.isFinite(Number(raw)) ? Number(raw) : 0;
              const display = Math.round(avg * 10) / 10;
              const color = clearScoreColor(avg);
              return (
                <div
                  key={key}
                  className="rounded-[10px] border bg-white px-3 py-3"
                  style={{ borderColor: BORDER }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums" style={{ color }}>
                    {display.toFixed(1)} / 5
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold" style={{ fontSize: 14, color: HEADER }}>
          Your Client Personality Mix
        </h2>
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
          <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
            {discInsight}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="font-bold" style={{ fontSize: 14, color: HEADER }}>
          Profile Completeness
        </h2>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          {completeCount} of {totalActive} clients have complete profiles.
        </p>
        <div className="mt-4 space-y-3">
          {clientsComplete.length === 0 ? (
            <p className="text-sm" style={{ color: MUTED }}>
              No active clients yet.
            </p>
          ) : (
            clientsComplete.map((row) => {
              const pct = you2CompletenessPct(row);
              const barColor = completenessBarColor(pct);
              return (
                <div key={row.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <span
                    className="min-w-[140px] shrink-0 text-sm font-medium sm:w-48"
                    style={{ color: HEADER }}
                  >
                    {row.name}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: '#F4F7F8' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
                      {pct.toFixed(0)}% You 2.0 fields
                    </p>
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
