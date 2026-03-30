import { useEffect, useState } from 'react';
import { getDb } from '../services/db';

type PipelineStage = 'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

/** Mirrors stageReadinessService — gone-quiet thresholds (days). */
const GONE_QUIET_DAYS: Record<PipelineStage, number> = {
  IC: 14,
  C1: 21,
  C2: 14,
  C3: 14,
  C4: 60,
  C5: 60,
};

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

function normalizeStage(stage: string): PipelineStage {
  const s = (stage ?? '').trim();
  if (!s) return 'IC';
  const valid: PipelineStage[] = ['IC', 'C1', 'C2', 'C3', 'C4', 'C5'];
  const upper = s.toUpperCase();
  if (valid.includes(upper as PipelineStage)) return upper as PipelineStage;
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

function parsePinkFlagsJson(raw: string | null | undefined): string[] {
  try {
    const p = JSON.parse(raw ?? '[]');
    if (!Array.isArray(p)) return [];
    return p.filter((f): f is string => typeof f === 'string');
  } catch {
    return [];
  }
}

function activePinkFlags(flags: string[]): string[] {
  return flags.filter((f) => !String(f).startsWith('resolved:'));
}

function localYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${m < 10 ? `0${m}` : m}-${day < 10 ? `0${day}` : day}`;
}

const RESPONSE_PLACEHOLDER = 'Select response...';

const RESPONSE_OPTIONS = [
  RESPONSE_PLACEHOLDER,
  'Called — left voicemail',
  'Sent email',
  'Scheduled session',
  'Had conversation — still engaged',
  'Going cold — considering pause',
  'No action yet',
] as const;

const RESPONSE_CONFIRM_MS = 1000;

type SignalKind = 'gone_quiet' | 'pink_flag';

type SignalItem = {
  id: string;
  clientId: string;
  clientName: string;
  kind: SignalKind;
  description: string;
  pinkFlagKey?: string;
};

type ConvertedRow = {
  id: string;
  name: string;
  golden_rules_notes: string | null;
};

type HistoryRow = {
  id: string;
  client_id: string;
  signal_type: string;
  signal_date: string;
  response_type: string | null;
  response_date: string | null;
  response_notes: string | null;
  created_at: string | null;
  client_name: string | null;
};

type PageData = {
  signals: SignalItem[];
  converted: ConvertedRow[];
  history: HistoryRow[];
  goldenDrafts: Record<string, string>;
};

async function loadCoachingActionsPageData(): Promise<PageData> {
  const db = await getDb();

  const respondedToday = await db.select<{ client_id: string; signal_type: string }>(
    `SELECT client_id, signal_type FROM intervention_logs
     WHERE response_type IS NOT NULL AND TRIM(response_type) != ''
       AND date(COALESCE(response_date, created_at)) = date('now')`,
    []
  );
  const respondedKey = new Set(respondedToday.map((r) => `${r.client_id}:${r.signal_type}`));

  const clientRows = await db.select<{
    id: string;
    name: string;
    pink_flags: string | null;
    inferred_stage: string | null;
    updated_at: string | null;
    outcome_bucket: string | null;
  }>(
    `SELECT id, name, pink_flags, inferred_stage, updated_at, outcome_bucket
     FROM clients
     WHERE LOWER(COALESCE(outcome_bucket, 'active')) = 'active'`,
    []
  );

  const sessionRows = await db.select<{ client_id: string; last_dt: string | null }>(
    `SELECT client_id, MAX(session_date) as last_dt
     FROM coaching_sessions
     WHERE session_date IS NOT NULL AND TRIM(session_date) != ''
     GROUP BY client_id`,
    []
  );
  const lastSessionByClient = new Map(sessionRows.map((r) => [r.client_id, r.last_dt]));

  const nextSignals: SignalItem[] = [];

  for (const c of clientRows) {
    const stage = normalizeStage(c.inferred_stage ?? '');
    const threshold = GONE_QUIET_DAYS[stage] ?? 14;
    const lastSess = lastSessionByClient.get(c.id) ?? null;
    const refDate = lastSess ?? c.updated_at ?? '';
    const daysSince = daysSinceReferenceLocal(refDate);
    const goneQuiet =
      daysSince !== null && daysSince > threshold && !respondedKey.has(`${c.id}:gone_quiet`);

    if (goneQuiet) {
      nextSignals.push({
        id: `gq:${c.id}`,
        clientId: c.id,
        clientName: c.name,
        kind: 'gone_quiet',
        description: `No coaching contact within ${threshold} days for stage ${stage} (${daysSince} days since last touch).`,
      });
    }

    const actPink = activePinkFlags(parsePinkFlagsJson(c.pink_flags));
    if (actPink.length > 0 && !respondedKey.has(`${c.id}:pink_flag`)) {
      for (const flag of actPink) {
        const label = flag.replace(/_/g, ' ');
        nextSignals.push({
          id: `pf:${c.id}:${flag}`,
          clientId: c.id,
          clientName: c.name,
          kind: 'pink_flag',
          pinkFlagKey: flag,
          description: `Active pink flag: ${label}`,
        });
      }
    }
  }

  const conv = await db.select<ConvertedRow>(
    `SELECT id, name, golden_rules_notes FROM clients
     WHERE LOWER(COALESCE(outcome_bucket, '')) = 'converted'
     ORDER BY name COLLATE NOCASE`,
    []
  );

  const hist = await db.select<HistoryRow>(
    `SELECT
       il.id,
       il.client_id,
       il.signal_type,
       il.signal_date,
       il.response_type,
       il.response_date,
       il.response_notes,
       il.created_at,
       c.name AS client_name
     FROM intervention_logs il
     LEFT JOIN clients c ON c.id = il.client_id
     ORDER BY datetime(COALESCE(il.created_at, il.response_date, il.signal_date)) DESC
     LIMIT 50`,
    []
  );

  const goldenDrafts: Record<string, string> = {};
  for (const row of conv) {
    goldenDrafts[row.id] = row.golden_rules_notes ?? '';
  }

  return {
    signals: nextSignals,
    converted: conv,
    history: hist,
    goldenDrafts,
  };
}

function signalLabel(kind: SignalKind): string {
  return kind === 'gone_quiet' ? 'Gone quiet' : 'Pink flag';
}

function signalBorderColor(kind: SignalKind): string {
  return kind === 'gone_quiet' ? '#C8613F' : '#F05F57';
}

function formatHistorySignal(t: string): string {
  if (t === 'gone_quiet') return 'Gone quiet';
  if (t === 'pink_flag') return 'Pink flag';
  return t;
}

function daysSinceFromDateStr(iso: string | null | undefined): number {
  if (iso == null || String(iso).trim() === '') return 0;
  const n = daysSinceReferenceLocal(iso);
  return n ?? 0;
}

export default function CoachingActions() {
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [converted, setConverted] = useState<ConvertedRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [goldenDrafts, setGoldenDrafts] = useState<Record<string, string>>({});
  const [dropdownValue, setDropdownValue] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loggedId, setLoggedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const data = await loadCoachingActionsPageData();
        if (!cancelled) {
          setSignals(data.signals);
          setConverted(data.converted);
          setHistory(data.history);
          setGoldenDrafts(data.goldenDrafts);
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

  const applyPageData = (data: PageData) => {
    setSignals(data.signals);
    setConverted(data.converted);
    setHistory(data.history);
    setGoldenDrafts(data.goldenDrafts);
  };

  const handleResponseChange = async (item: SignalItem, value: string) => {
    if (!value || value === RESPONSE_PLACEHOLDER) return;
    setSavingId(item.id);
    setLoggedId(null);
    try {
      const db = await getDb();
      const today = localYyyyMmDd(new Date());
      const createdAt = new Date().toISOString();
      await db.execute(
        `INSERT INTO intervention_logs
         (id, client_id, signal_type, signal_date, response_type, response_date, response_notes, outcome, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          item.clientId,
          item.kind,
          today,
          value,
          today,
          item.pinkFlagKey ?? null,
          null,
          createdAt,
        ]
      );
      setLoggedId(item.id);
      window.setTimeout(() => {
        setLoggedId(null);
        setDropdownValue((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        void loadCoachingActionsPageData().then(applyPageData).catch(console.error);
      }, RESPONSE_CONFIRM_MS);
    } catch (err) {
      console.error(err);
      setError(String((err as { message?: string })?.message ?? err));
    } finally {
      setSavingId(null);
    }
  };

  const handleGoldenBlur = async (clientId: string) => {
    const text = goldenDrafts[clientId] ?? '';
    try {
      const db = await getDb();
      await db.execute(
        `UPDATE clients SET golden_rules_notes = ?, updated_at = ? WHERE id = ?`,
        [text, new Date().toISOString(), clientId]
      );
    } catch (err) {
      console.error(err);
      setError(String((err as { message?: string })?.message ?? err));
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: '#7A8F95' }}>
        Loading coaching actions…
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
        <h1 className="font-bold" style={{ fontSize: 22, color: '#2D4459' }}>
          Coaching Actions
        </h1>
        <p className="mt-1 whitespace-pre-line" style={{ fontSize: 13, color: '#7A8F95' }}>
          Every signal. Every response.{'\n'}
          Every outcome.
        </p>
      </header>

      <section>
        <h2 className="font-bold" style={{ fontSize: 14, color: '#2D4459' }}>
          Signals Needing Response
        </h2>
        {signals.length === 0 ? (
          <div
            className="mt-3 rounded-[10px] border px-4 py-4 text-sm"
            style={{
              background: 'rgba(59, 191, 191, 0.12)',
              borderColor: '#3BBFBF',
              color: '#2D4459',
            }}
          >
            No signals needing response right now. Your pipeline is in good shape.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {signals.map((item) => (
              <div
                key={item.id}
                className="rounded-[10px] border bg-white"
                style={{
                  border: '1px solid #C8E8E5',
                  borderLeft: `4px solid ${signalBorderColor(item.kind)}`,
                  padding: '14px 18px',
                  marginBottom: 8,
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold" style={{ color: '#2D4459' }}>
                    {item.clientName}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ background: signalBorderColor(item.kind) }}
                  >
                    {signalLabel(item.kind)}
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: '#7A8F95' }}>
                  {item.description}
                </p>
                <select
                  className="mt-3 w-full max-w-md rounded-lg border border-[#C8E8E5] bg-white px-3 py-2 text-sm text-[#2D4459] outline-none focus:ring-2 focus:ring-[#3BBFBF]/40"
                  value={dropdownValue[item.id] ?? RESPONSE_PLACEHOLDER}
                  disabled={savingId === item.id}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDropdownValue((prev) => ({ ...prev, [item.id]: v }));
                    void handleResponseChange(item, v);
                  }}
                >
                  {RESPONSE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {loggedId === item.id ? (
                  <p className="mt-2 text-sm font-medium text-green-600">Response logged ✓</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold" style={{ fontSize: 14, color: '#2D4459' }}>
          Golden Rules
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: '#7A8F95' }}>
          What made each client convert?
        </p>
        <div className="mt-3 space-y-3">
          {converted.length === 0 ? (
            <p className="text-sm" style={{ color: '#7A8F95' }}>
              No converted clients yet.
            </p>
          ) : (
            converted.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-[10px] border bg-white sm:flex-row sm:items-start sm:justify-between"
                style={{ border: '1px solid #C8E8E5', padding: '14px 18px' }}
              >
                <div className="min-w-0 shrink-0">
                  <p className="font-semibold" style={{ color: '#2D4459' }}>
                    {row.name}
                  </p>
                  <span
                    className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: '#C8E8E5', color: '#2D4459' }}
                  >
                    Converted
                  </span>
                </div>
                <textarea
                  className="min-h-[88px] w-full min-w-0 flex-1 rounded-lg border border-[#C8E8E5] px-3 py-2 text-sm text-[#2D4459] outline-none focus:ring-2 focus:ring-[#3BBFBF]/40 sm:max-w-xl"
                  placeholder={'What coaching move\nled to this conversion?'}
                  value={goldenDrafts[row.id] ?? ''}
                  onChange={(e) =>
                    setGoldenDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                  }
                  onBlur={() => void handleGoldenBlur(row.id)}
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-bold" style={{ fontSize: 14, color: '#2D4459' }}>
          Decision History
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: '#7A8F95' }}>
            No decisions logged yet. Responses to signals will appear here.
          </p>
        ) : (
          <div
            className="mt-3 overflow-x-auto rounded-[10px] border"
            style={{ borderColor: '#C8E8E5' }}
          >
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr style={{ background: '#F4F7F8', color: '#2D4459' }}>
                  <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: '#C8E8E5' }}>
                    Date
                  </th>
                  <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: '#C8E8E5' }}>
                    Client
                  </th>
                  <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: '#C8E8E5' }}>
                    Signal
                  </th>
                  <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: '#C8E8E5' }}>
                    Response
                  </th>
                  <th className="border-b px-3 py-2 text-right font-semibold" style={{ borderColor: '#C8E8E5' }}>
                    Days Since
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const ref = h.response_date ?? h.created_at ?? h.signal_date;
                  return (
                    <tr key={h.id}>
                      <td className="border-b px-3 py-2" style={{ borderColor: '#F4F7F8', color: '#2D4459' }}>
                        {ref ?? '—'}
                      </td>
                      <td className="border-b px-3 py-2" style={{ borderColor: '#F4F7F8', color: '#2D4459' }}>
                        {h.client_name ?? h.client_id}
                      </td>
                      <td className="border-b px-3 py-2" style={{ borderColor: '#F4F7F8', color: '#7A8F95' }}>
                        {formatHistorySignal(h.signal_type)}
                      </td>
                      <td className="border-b px-3 py-2" style={{ borderColor: '#F4F7F8', color: '#2D4459' }}>
                        {h.response_type ?? '—'}
                      </td>
                      <td
                        className="border-b px-3 py-2 text-right tabular-nums"
                        style={{ borderColor: '#F4F7F8', color: '#7A8F95' }}
                      >
                        {daysSinceFromDateStr(ref)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
