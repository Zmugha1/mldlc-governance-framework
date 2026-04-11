import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  getHealthScore,
  logHealthScore,
  type HealthScore,
} from '../services/correctionService';

export interface HealthIndicatorProps {
  page: string;
  dataCompleteness: number;
  className?: string;
}

function scoreColor(combined: number): string {
  if (combined >= 80) return '#3BBFBF';
  if (combined >= 60) return '#F59E0B';
  return '#F05F57';
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function HealthIndicator({ page, dataCompleteness, className }: HealthIndicatorProps) {
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const h = await getHealthScore(page);
      if (cancelled) return;
      setHealth(h);
      await logHealthScore(page, dataCompleteness, h.rating_score || 50);
      const h2 = await getHealthScore(page);
      if (!cancelled) setHealth(h2);
    })();
    return () => {
      cancelled = true;
    };
  }, [page, dataCompleteness]);

  useEffect(() => {
    if (!expanded) return;
    const onDocMouseDown = (ev: MouseEvent) => {
      const el = rootRef.current;
      if (!el || el.contains(ev.target as Node)) return;
      setExpanded(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [expanded]);

  const toggle = useCallback(() => {
    setExpanded((e) => !e);
  }, []);

  const dataPct = clampPct(dataCompleteness);
  const combined =
    health != null ? clampPct(health.combined_score) : clampPct(dataCompleteness * 0.5 + 50 * 0.5);
  const ratingPct = health != null ? clampPct(health.rating_score) : 50;
  const trend = health?.trend ?? 'stable';

  const trendIcon =
    trend === 'up' ? (
      <span style={{ color: '#3BBFBF', fontSize: 12 }} aria-hidden>
        ↑
      </span>
    ) : trend === 'down' ? (
      <span style={{ color: '#F05F57', fontSize: 12 }} aria-hidden>
        ↓
      </span>
    ) : (
      <span style={{ color: '#7A8F95', fontSize: 12 }} aria-hidden>
        →
      </span>
    );

  const lastUpdatedLabel = (() => {
    const raw = health?.last_updated;
    if (raw == null || String(raw).trim() === '') return '—';
    try {
      return formatDistanceToNow(new Date(raw), { addSuffix: true });
    } catch {
      return String(raw);
    }
  })();

  const trendText =
    trend === 'up' ? (
      <span style={{ color: '#3BBFBF', fontSize: 11 }}>↑ Improving</span>
    ) : trend === 'down' ? (
      <span style={{ color: '#F05F57', fontSize: 11 }}>↓ Needs attention</span>
    ) : (
      <span style={{ color: '#7A8F95', fontSize: 11 }}>→ Stable</span>
    );

  return (
    <div ref={rootRef} className={className} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center"
        style={{
          background: 'white',
          border: '1px solid #C8E8E5',
          borderRadius: 20,
          padding: '4px 10px',
          cursor: 'pointer',
          gap: 6,
        }}
        aria-expanded={expanded}
        aria-label="System health"
      >
        {trendIcon}
        <span className="font-bold tabular-nums" style={{ fontSize: 12, color: scoreColor(combined) }}>
          {combined}%
        </span>
        <span style={{ fontSize: 10, color: '#7A8F95' }}>System health</span>
      </button>

      {expanded ? (
        <div
          className="absolute z-[100]"
          style={{
            top: '100%',
            right: 0,
            marginTop: 6,
            width: 260,
            background: 'white',
            border: '1px solid #C8E8E5',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="font-bold leading-tight" style={{ color: '#2D4459', fontSize: 13 }}>
              System Health: {page}
            </p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="shrink-0 leading-none"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#7A8F95',
                cursor: 'pointer',
                fontSize: 16,
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p style={{ color: '#7A8F95', fontSize: 11 }}>Data completeness</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="min-w-0 flex-1 overflow-hidden" style={{ height: 6, borderRadius: 3, background: '#F4F7F8' }}>
                  <div style={{ width: `${dataPct}%`, height: '100%', borderRadius: 3, background: '#3BBFBF' }} />
                </div>
                <span className="shrink-0 font-bold tabular-nums" style={{ color: '#2D4459', fontSize: 11 }}>
                  {dataPct}%
                </span>
              </div>
            </div>

            <div>
              <p style={{ color: '#7A8F95', fontSize: 11 }}>Your ratings</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="min-w-0 flex-1 overflow-hidden" style={{ height: 6, borderRadius: 3, background: '#F4F7F8' }}>
                  <div style={{ width: `${ratingPct}%`, height: '100%', borderRadius: 3, background: '#F05F57' }} />
                </div>
                <span className="shrink-0 font-bold tabular-nums" style={{ color: '#2D4459', fontSize: 11 }}>
                  {ratingPct}%
                </span>
              </div>
            </div>
          </div>

          <hr className="my-3" style={{ border: 0, borderTop: '1px solid #C8E8E5' }} />

          <div className="flex items-end justify-between gap-2">
            <p className="font-bold" style={{ color: '#2D4459', fontSize: 12 }}>
              Combined health
            </p>
            <span className="font-bold tabular-nums" style={{ fontSize: 20, color: scoreColor(combined) }}>
              {combined}%
            </span>
          </div>

          <div className="mt-2">{trendText}</div>
          <p className="mt-2" style={{ color: '#7A8F95', fontSize: 10 }}>
            Updated {lastUpdatedLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}
