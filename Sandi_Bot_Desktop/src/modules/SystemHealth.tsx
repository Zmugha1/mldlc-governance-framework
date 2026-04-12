import { useState, useEffect } from 'react';
import { Activity, Download, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCorrectionStats,
  getHealthScore,
  getTrainingReadiness,
  exportQLoRAReport,
  type CorrectionStats,
  type HealthScore,
} from '../services/correctionService';
import { dbSelect } from '../services/db';

const PAGES = [
  'Morning Brief',
  'Business Goals',
  'Client Intelligence',
  'Coaching Actions',
  'My Practice',
  'The Capture',
] as const;

function scoreBorderColor(combined: number): string {
  if (combined >= 80) return '#3BBFBF';
  if (combined >= 60) return '#F59E0B';
  return '#F05F57';
}

function approvalLargeColor(rate: number): string {
  if (rate > 70) return '#3BBFBF';
  if (rate < 50) return '#F05F57';
  return '#F59E0B';
}

function weekDisplayLabel(weekKey: string): string {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(weekKey.trim());
  if (!m) return `Week of ${weekKey}`;
  return `Week of ${m[1]} · W${m[2]}`;
}

function parseCouncilRuns(rows: { corrected_value: string | null }[]): { n: number; avg: number | null } {
  const vals: number[] = [];
  for (const r of rows) {
    try {
      const raw = r.corrected_value;
      if (raw == null || String(raw).trim() === '') continue;
      const j = JSON.parse(String(raw)) as { overallConfidence?: unknown };
      if (typeof j.overallConfidence === 'number' && !Number.isNaN(j.overallConfidence)) {
        vals.push(j.overallConfidence);
      }
    } catch {
      /* skip */
    }
  }
  const n = rows.length;
  if (vals.length === 0) return { n, avg: null };
  return { n, avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
}

function readinessMotivation(pct: number): string {
  if (pct < 25) {
    return 'Every correction you make teaches Coach Bot your voice. Keep coaching.';
  }
  if (pct < 50) {
    return 'Good progress. Coach Bot is starting to learn your patterns.';
  }
  if (pct < 75) {
    return 'Strong foundation. The first model improvement is in sight.';
  }
  return 'Almost there. The next version of Coach Bot will sound like you.';
}

export default function SystemHealth({
  onNavigateToCaptureUat,
}: {
  onNavigateToCaptureUat?: () => void;
}) {
  const [stats, setStats] = useState<CorrectionStats | null>(null);
  const [readiness, setReadiness] = useState<Awaited<ReturnType<typeof getTrainingReadiness>> | null>(
    null
  );
  const [pageHealthScores, setPageHealthScores] = useState<Record<string, HealthScore>>({});
  const [councilRuns, setCouncilRuns] = useState<{ n: number; avg: number | null }>({ n: 0, avg: null });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const healthPromises = PAGES.map((p) => getHealthScore(p));
        const [statsData, readinessData, councilRows, ...healthData] = await Promise.all([
          getCorrectionStats(),
          getTrainingReadiness(),
          dbSelect<{ corrected_value: string | null }>(
            `SELECT corrected_value FROM extraction_corrections WHERE correction_type = 'council_feedback'`,
            []
          ),
          ...healthPromises,
        ]);
        if (cancelled) return;
        setStats(statsData);
        setReadiness(readinessData);
        setCouncilRuns(parseCouncilRuns(councilRows));
        const scores: Record<string, HealthScore> = {};
        PAGES.forEach((p, i) => {
          scores[p] = healthData[i] as HealthScore;
        });
        setPageHealthScores(scores);
      } catch (e) {
        console.error('SystemHealth load:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const overallHealthPct = (() => {
    const vals = PAGES.map((p) => pageHealthScores[p]?.combined_score ?? 0);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();

  const totalRated =
    stats != null ? stats.question_thumbs_up + stats.question_thumbs_down : 0;

  const noTrendYet = totalRated === 0;

  const visionAccuracyDisplay =
    stats != null && stats.vision_edits > 0 ? `${stats.approval_rate}%` : '--';

  const noCorrectionsYet = stats != null && stats.total === 0;

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: '#7A8F95' }}>
        Loading system health…
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 pb-12">
      <header className="flex flex-wrap items-start gap-4">
        <Activity className="shrink-0" style={{ color: '#3BBFBF', width: 24, height: 24 }} aria-hidden />
        <div>
          <h1 className="font-bold" style={{ color: '#2D4459', fontSize: 24 }}>
            System Health
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed" style={{ color: '#7A8F95' }}>
            How Coach Bot is performing and improving over time
          </p>
        </div>
      </header>

      {/* SECTION 1 */}
      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div
            style={{
              background: '#2D4459',
              borderRadius: 12,
              padding: 20,
              color: 'white',
            }}
          >
            <p className="font-bold tabular-nums leading-tight text-white" style={{ fontSize: 36 }}>
              {overallHealthPct}%
            </p>
            <p className="mt-2 uppercase" style={{ color: '#C8E8E5', fontSize: 11 }}>
              Overall Health
            </p>
          </div>

          <div
            style={{
              background: 'white',
              border: '1px solid #C8E8E5',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <p
              className="font-bold tabular-nums leading-tight"
              style={{ fontSize: 36, color: approvalLargeColor(stats?.approval_rate ?? 0) }}
            >
              {stats?.approval_rate ?? 0}%
            </p>
            <p className="mt-2 uppercase" style={{ color: '#7A8F95', fontSize: 11 }}>
              Question Approval Rate
            </p>
            <p className="mt-1" style={{ color: '#7A8F95', fontSize: 11 }}>
              {stats?.question_thumbs_up ?? 0} approved of {totalRated} rated
            </p>
          </div>

          <div
            style={{
              background: 'white',
              border: '1px solid #C8E8E5',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <p className="font-bold tabular-nums leading-tight" style={{ fontSize: 36, color: '#2D4459' }}>
              {stats?.total ?? 0}
            </p>
            <p className="mt-2 uppercase" style={{ color: '#7A8F95', fontSize: 11 }}>
              Total Corrections
            </p>
            <p className="mt-1" style={{ color: '#7A8F95', fontSize: 11 }}>
              Teaching Coach Bot your voice
            </p>
          </div>

          <div
            style={{
              background: 'white',
              border: '1px solid #C8E8E5',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <p className="font-bold tabular-nums leading-tight" style={{ fontSize: 36, color: '#2D4459' }}>
              {visionAccuracyDisplay}
            </p>
            <p className="mt-2 uppercase" style={{ color: '#7A8F95', fontSize: 11 }}>
              Vision Accuracy
            </p>
            <p className="mt-1" style={{ color: '#7A8F95', fontSize: 11 }}>
              {stats?.vision_edits ?? 0} statements reviewed
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2 */}
      <section
        style={{
          background: 'white',
          border: '1px solid #C8E8E5',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <h2 className="font-bold" style={{ color: '#2D4459', fontSize: 16 }}>
            QLoRA Training Readiness
          </h2>
          <p className="font-bold tabular-nums" style={{ color: '#2D4459', fontSize: 20 }}>
            {readiness?.percentage ?? 0}%
          </p>
        </div>

        {noCorrectionsYet ? (
          <div className="flex flex-col items-center py-6 text-center">
            <TrendingUp className="mb-3" style={{ color: '#C8E8E5', width: 32, height: 32 }} aria-hidden />
            <p style={{ color: '#7A8F95', fontSize: 13 }}>Start coaching to see metrics</p>
            <p className="mt-2 max-w-md" style={{ color: '#7A8F95', fontSize: 12 }}>
              Rate questions in Best Next Questions and approve vision statements to build your improvement data
            </p>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden" style={{ height: 16, borderRadius: 8, background: '#F4F7F8' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, readiness?.percentage ?? 0)}%`,
                  borderRadius: 8,
                  background: '#3BBFBF',
                  transition: 'width 0.35s ease',
                }}
              />
              {[25, 50, 75].map((pct) => (
                <span
                  key={pct}
                  className="pointer-events-none absolute top-0 z-[1] h-full w-px"
                  style={{ left: `${pct}%`, background: 'rgba(45, 68, 89, 0.2)' }}
                  aria-hidden
                />
              ))}
              <span
                className="pointer-events-none absolute right-1.5 top-1/2 z-[2] -translate-y-1/2 text-xs font-bold leading-none"
                style={{ color: (readiness?.percentage ?? 0) >= 100 ? '#2D4459' : 'transparent' }}
                aria-hidden
              >
                ✓
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1" style={{ color: '#7A8F95', fontSize: 12 }}>
              <span>{readiness?.total ?? 0} corrections</span>
              <span>of {readiness?.target ?? 300} needed</span>
              <span>
                {readiness?.weeks_remaining ?? 0} weeks at current pace
              </span>
            </div>
            <p className="mt-2 italic" style={{ color: '#7A8F95', fontSize: 12 }}>
              {readinessMotivation(readiness?.percentage ?? 0)}
            </p>
          </>
        )}
      </section>

      {/* SECTION 3 */}
      <section>
        <h2 className="mb-3 font-bold" style={{ color: '#2D4459', fontSize: 16 }}>
          Health by Page
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAGES.map((page) => {
            const h = pageHealthScores[page];
            const combined = h?.combined_score ?? 0;
            const dataC = h?.data_completeness ?? 0;
            const rating = h?.rating_score ?? 0;
            const border = scoreBorderColor(combined);
            const trend = h?.trend ?? 'stable';
            const trendLabel =
              trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable';
            const trendColor =
              trend === 'up' ? '#3BBFBF' : trend === 'down' ? '#F05F57' : '#7A8F95';
            const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
            return (
              <div
                key={page}
                style={{
                  background: 'white',
                  border: '1px solid #C8E8E5',
                  borderRadius: 10,
                  padding: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: border,
                }}
              >
                <p className="font-bold" style={{ color: '#2D4459', fontSize: 13 }}>
                  {page}
                </p>
                <p className="mt-1 font-bold tabular-nums" style={{ fontSize: 20, color: border }}>
                  {combined}%
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0" style={{ color: '#7A8F95', fontSize: 10 }}>
                      Data
                    </span>
                    <div className="min-w-0 flex-1 overflow-hidden" style={{ height: 4, borderRadius: 2, background: '#F4F7F8' }}>
                      <div style={{ width: `${Math.min(100, dataC)}%`, height: '100%', background: '#3BBFBF' }} />
                    </div>
                    <span className="shrink-0 tabular-nums" style={{ color: '#2D4459', fontSize: 10 }}>
                      {dataC}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0" style={{ color: '#7A8F95', fontSize: 10 }}>
                      Ratings
                    </span>
                    <div className="min-w-0 flex-1 overflow-hidden" style={{ height: 4, borderRadius: 2, background: '#F4F7F8' }}>
                      <div style={{ width: `${Math.min(100, rating)}%`, height: '100%', background: '#F05F57' }} />
                    </div>
                    <span className="shrink-0 tabular-nums" style={{ color: '#2D4459', fontSize: 10 }}>
                      {rating}%
                    </span>
                  </div>
                </div>
                <p className="mt-2" style={{ color: trendColor, fontSize: 11 }}>
                  {trendArrow} {trendLabel}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4 */}
      <section>
        <h2 className="mb-3 font-bold" style={{ color: '#2D4459', fontSize: 16 }}>
          Approval Rate Over Time
        </h2>
        {noTrendYet ? (
          <div className="flex flex-col items-center rounded-lg border border-[#C8E8E5] bg-white py-8 text-center">
            <TrendingUp className="mb-3" style={{ color: '#C8E8E5', width: 32, height: 32 }} aria-hidden />
            <p className="max-w-md px-4 italic" style={{ color: '#7A8F95', fontSize: 12 }}>
              Rate your first coaching questions to start seeing trends here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(stats?.weekly_trend ?? []).map((w) => (
              <div key={w.week} className="flex items-center gap-2">
                <span className="shrink-0" style={{ width: 80, color: '#7A8F95', fontSize: 10 }}>
                  {weekDisplayLabel(w.week)}
                </span>
                <div className="min-w-0 flex-1 overflow-hidden" style={{ height: 20, borderRadius: 4, background: '#F4F7F8' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, w.approval_rate)}%`,
                      borderRadius: 4,
                      background: '#3BBFBF',
                    }}
                  />
                </div>
                <span className="shrink-0 font-bold tabular-nums" style={{ color: '#2D4459', fontSize: 11, marginLeft: 8 }}>
                  {w.approval_rate}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 5 */}
      <section>
        <h2 className="mb-3 font-bold" style={{ color: '#2D4459', fontSize: 16 }}>
          Coaching Council Performance
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              name: 'Readiness Lens',
              framework: 'ICF + Stage Methodology',
            },
            {
              name: 'Alignment Lens',
              framework: 'Motivational Interviewing',
            },
            {
              name: 'Coaching Integrity Lens',
              framework: 'ICF Ethics + CLEAR',
            },
          ].map((lens) => (
            <div
              key={lens.name}
              style={{
                background: '#F4F7F8',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <p className="font-bold" style={{ color: '#2D4459', fontSize: 13 }}>
                {lens.name}
              </p>
              <p className="mt-1" style={{ color: '#7A8F95', fontSize: 11 }}>
                {lens.framework}
              </p>
              <p className="mt-3 font-bold tabular-nums" style={{ color: '#2D4459', fontSize: 18 }}>
                {councilRuns.avg != null ? `${councilRuns.avg}%` : '--'}
              </p>
              <p className="mt-1" style={{ color: '#7A8F95', fontSize: 11 }}>
                Avg. run confidence (from council logs)
              </p>
              <p className="mt-2" style={{ color: '#7A8F95', fontSize: 11 }}>
                Sessions run: {councilRuns.n}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6 */}
      <section>
        <h2 className="mb-3 font-bold" style={{ color: '#2D4459', fontSize: 16 }}>
          Export Data
        </h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-[200px] flex-col gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 font-bold text-white transition-opacity hover:opacity-90"
              style={{
                background: '#3BBFBF',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => {
                onNavigateToCaptureUat?.();
              }}
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              UAT Feedback Report
            </button>
          </div>
          <div className="flex min-w-[200px] flex-col gap-2">
            <button
              type="button"
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                background: '#2D4459',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 13,
                border: 'none',
                cursor: exporting ? 'wait' : 'pointer',
              }}
              onClick={() => {
                void (async () => {
                  setExporting(true);
                  try {
                    const csv = await exportQLoRAReport();
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `coachbot_training_data_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Training data exported. Send to Zubia for model improvement.', {
                      style: { background: '#2D4459', color: 'white' },
                      duration: 4000,
                    });
                  } catch (e) {
                    console.error(e);
                    toast.error('Export failed');
                  } finally {
                    setExporting(false);
                  }
                })();
              }}
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              {exporting ? 'Exporting…' : 'QLoRA Training Report'}
            </button>
            <p style={{ color: '#7A8F95', fontSize: 11 }}>
              Contains all corrections and question ratings formatted for model training
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
