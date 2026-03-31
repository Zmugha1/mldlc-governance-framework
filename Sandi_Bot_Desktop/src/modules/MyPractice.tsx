import { useEffect, useMemo, useState } from 'react';
import { getDb } from '../services/db';

const HEADER = '#2D4459';
const MUTED = '#7A8F95';
const BORDER = '#C8E8E5';
const TEAL = '#3BBFBF';
const CORAL = '#C8613F';

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
  { key: 'client_specific', label: 'Client Insights' },
  { key: 'pattern', label: 'Patterns' },
  { key: 'disc_insight', label: 'DISC Insights' },
  { key: 'stage_insight', label: 'Stage Insights' },
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
  client_specific: 'Client insight',
  pattern: 'Pattern',
  disc_insight: 'DISC insight',
  stage_insight: 'Stage insight',
  general: 'General',
};

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
  fathom_count: number;
  tumay_ok: number;
};

function fieldFilled(v: string | null | undefined): boolean {
  return v != null && String(v).trim().length > 0;
}

/** DISC 25 + You2 vision 25 + ≥1 session 30 + TUMAY 20 = 100 */
function profileWeightedPct(row: ClientCompletenessRow): number {
  let pts = 0;
  if (Number(row.has_disc) === 1) pts += 25;
  if (fieldFilled(row.one_year_vision)) pts += 25;
  if (Number(row.fathom_count) > 0) pts += 30;
  if (Number(row.tumay_ok) === 1) pts += 20;
  return pts;
}

function isActiveClientProfileComplete(row: ClientCompletenessRow): boolean {
  return (
    Number(row.has_disc) === 1 &&
    fieldFilled(row.one_year_vision) &&
    Number(row.fathom_count) > 0
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

function clearScoreColor(avg: number): string {
  if (avg >= 4) return '#22C55E';
  if (avg >= 3) return '#F59E0B';
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
  const [ahaMoments, setAhaMoments] = useState<AhaMomentRow[]>([]);
  const [ahaFilter, setAhaFilter] = useState<AhaFilter>('all');

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
             y.reasons_for_change,
             CASE WHEN d.client_id IS NOT NULL THEN 1 ELSE 0 END AS has_disc,
             (
               SELECT COUNT(*)
               FROM coaching_sessions cs
               WHERE cs.client_id = c.id
                 AND cs.session_date IS NOT NULL
                 AND TRIM(cs.session_date) != ''
             ) AS fathom_count,
             CASE
               WHEN c.tumay_data IS NOT NULL
                 AND LENGTH(TRIM(c.tumay_data)) > 2
                 AND LOWER(TRIM(c.tumay_data)) NOT IN ('{}', 'null', '[]')
               THEN 1
               ELSE 0
             END AS tumay_ok
           FROM clients c
           LEFT JOIN client_you2_profiles y ON y.client_id = c.id
           LEFT JOIN client_disc_profiles d ON d.client_id = c.id
           WHERE LOWER(COALESCE(c.outcome_bucket, 'active')) = 'active'
           ORDER BY c.name COLLATE NOCASE`,
          []
        );

        const ahas = await db.select<AhaMomentRow>(
          `SELECT a.*, c.name as client_name
           FROM aha_moments a
           LEFT JOIN clients c ON c.id = a.client_id
           ORDER BY a.created_at DESC`,
          []
        );

        if (!cancelled) {
          setGoldenRules(rules);
          setClearAgg(clear[0] ?? null);
          setDiscAgg(disc[0] ?? null);
          setClientsComplete(activeClients);
          setAhaMoments(ahas);
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

  const completeCount = clientsComplete.filter((row) => isActiveClientProfileComplete(row)).length;
  const totalActive = clientsComplete.length;

  const filteredAhaMoments = useMemo(() => {
    if (ahaFilter === 'all') return ahaMoments;
    return ahaMoments.filter((row) => normalizeAhaType(row.moment_type) === ahaFilter);
  }, [ahaMoments, ahaFilter]);

  const ahaCountsByType = useMemo(() => {
    let pattern = 0;
    let disc = 0;
    let stage = 0;
    for (const row of ahaMoments) {
      const t = normalizeAhaType(row.moment_type);
      if (t === 'pattern') pattern += 1;
      if (t === 'disc_insight') disc += 1;
      if (t === 'stage_insight') stage += 1;
    }
    return { pattern, disc, stage };
  }, [ahaMoments]);

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

      <section
        style={{
          background: 'rgba(250, 238, 218, 0.3)',
          border: '1px solid rgba(200, 97, 63, 0.3)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
        }}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold" style={{ fontSize: 16, color: CORAL }}>
              💡 Aha Moments
            </h2>
            <p className="mt-1 max-w-xl text-[12px] leading-snug" style={{ color: MUTED }}>
              Your coaching intelligence — insights captured in the moment.
            </p>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
            style={{ background: CORAL }}
          >
            {ahaMoments.length}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {AHA_FILTER_PILLS.map(({ key, label }) => {
            const active = ahaFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAhaFilter(key)}
                className="rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
                style={{
                  border: `1px solid ${active ? CORAL : BORDER}`,
                  background: active ? 'rgba(200, 97, 63, 0.12)' : 'white',
                  color: active ? CORAL : HEADER,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {ahaMoments.length === 0 ? (
            <div
              className="rounded-[10px] border bg-white px-4 py-5"
              style={{
                borderColor: BORDER,
                borderLeft: `4px solid ${CORAL}`,
              }}
            >
              <p className="text-[13px] font-medium" style={{ color: MUTED }}>
                💡 No aha moments yet.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: MUTED }}>
                Tap the Aha Moment button on any client card to capture insights as they happen.
              </p>
            </div>
          ) : (
            filteredAhaMoments.map((row) => {
              const mt = normalizeAhaType(row.moment_type);
              const leftColor = AHA_TYPE_LEFT_BORDER[mt] ?? MUTED;
              const badgeLabel = AHA_TYPE_BADGE_LABEL[mt] ?? mt;
              return (
                <div
                  key={row.id}
                  className="mb-2 bg-white last:mb-0"
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
                  <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                    <span className="text-[11px] font-semibold" style={{ color: leftColor }}>
                      {badgeLabel}
                    </span>
                    <span className="min-w-0 text-center text-[11px]" style={{ color: MUTED }}>
                      {mt === 'client_specific' && row.client_name?.trim()
                        ? `— ${row.client_name.trim()}`
                        : ''}
                    </span>
                    <span className="text-right text-[10px] tabular-nums" style={{ color: MUTED }}>
                      {formatAhaMomentDate(row.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {ahaMoments.length >= 5 ? (
          <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(200, 97, 63, 0.2)' }}>
            <p className="text-[13px] font-bold" style={{ color: HEADER }}>
              Emerging Patterns
            </p>
            <ul className="mt-2 space-y-1 text-[12px]" style={{ color: MUTED }}>
              <li>Pattern insights: {ahaCountsByType.pattern}</li>
              <li>DISC insights: {ahaCountsByType.disc}</li>
              <li>Stage insights: {ahaCountsByType.stage}</li>
            </ul>
            {ahaCountsByType.pattern >= 3 ? (
              <p className="mt-3 text-[12px] leading-relaxed" style={{ color: CORAL }}>
                You have {ahaCountsByType.pattern} pattern insights. These may reveal your coaching
                signature. Review in Sequence 12.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

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
          {completeCount} of {totalActive} active clients have complete profiles.
        </p>
        <div className="mt-4 space-y-3">
          {clientsComplete.length === 0 ? (
            <p className="text-sm" style={{ color: MUTED }}>
              No active clients yet.
            </p>
          ) : (
            clientsComplete.map((row) => {
              const pct = profileWeightedPct(row);
              const barColor = profileBarColor(pct);
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
                      {pct}% · {profileStatusLabel(pct)}
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
