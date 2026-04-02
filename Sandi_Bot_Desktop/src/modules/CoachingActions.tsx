import { useEffect, useState } from 'react';
import { getDb } from '../services/db';

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

/** Signals Needing Response — at-risk when days since last contact exceed this (strictly >). */
const AT_RISK_LAST_CONTACT_DAYS: Record<PipelineStage, number> = {
  IC: 14,
  C1: 21,
  C2: 14,
  C3: 14,
  C4: 60,
  C5: 60,
};

function lastContactExceedsAtRiskThreshold(
  stage: PipelineStage,
  lastContactDate: string | null | undefined
): boolean {
  const threshold = AT_RISK_LAST_CONTACT_DAYS[stage];
  const days = daysSinceReferenceLocal(lastContactDate);
  if (days === null) return true;
  return days > threshold;
}

function atRiskReasonLine(
  stage: PipelineStage,
  lastContactDate: string | null | undefined
): string {
  const days = daysSinceReferenceLocal(lastContactDate);
  const isEarly = stage === 'IC' || stage === 'C1' || stage === 'C2' || stage === 'C3';
  if (isEarly) {
    return days === null
      ? 'No session recorded — follow up needed'
      : `No session in ${days}d — follow up needed`;
  }
  return days === null
    ? 'No contact recorded — validation check needed'
    : `No contact in ${days}d — validation check needed`;
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

const DISC_REENGAGEMENT_TIP: Record<'D' | 'I' | 'S' | 'C', string> = {
  D: 'Send direct email with specific question',
  I: 'Call and reconnect with excitement',
  S: 'Check in warmly, ask about family',
  C: 'Send data or article, give them time',
};

function deriveDiscLetter(d: number, i: number, s: number, c: number): 'D' | 'I' | 'S' | 'C' {
  const pairs: ['D' | 'I' | 'S' | 'C', number][] = [
    ['D', d],
    ['I', i],
    ['S', s],
    ['C', c],
  ];
  pairs.sort((a, b) => b[1] - a[1]);
  return pairs[0][0];
}

function pinkLabelPretty(key: string): string {
  const raw = key.replace(/_/g, ' ');
  return raw.replace(/\b\w/g, (ch) => ch.toUpperCase());
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

type SignalKind = 'at_risk' | 'gone_quiet' | 'pink_flag';

/** One card per client in SECTION 1 — may combine at-risk, pink flags, gone-quiet. */
type ClientSignalCard = {
  id: string;
  clientId: string;
  clientName: string;
  /** 1 = at-risk (last contact), 2 = 2+ pink, 3 = 1 pink, 4 = gone quiet (updated_at) */
  sortTier: 1 | 2 | 3 | 4;
  borderColor: string;
  badgeLabel: string;
  badgeBg: string;
  atRiskLine?: string;
  /** Grouped pink flags — "N active signals" + list */
  pinkLabels?: string[];
  goneQuietLine?: string;
  discTip?: string;
  /** Highest-priority kind for intervention_logs.signal_type */
  logSignalType: SignalKind;
  pinkFlagKeys: string[];
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
  signalClients: ClientSignalCard[];
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

  type Acc = {
    clientId: string;
    clientName: string;
    atRiskLine?: string;
    pinkKeys: string[];
    goneQuietLine?: string;
    discTip?: string;
  };
  const byClient = new Map<string, Acc>();

  function ensureAcc(id: string, name: string): Acc {
    let a = byClient.get(id);
    if (!a) {
      a = { clientId: id, clientName: name, pinkKeys: [] };
      byClient.set(id, a);
    }
    return a;
  }

  const clientRows = await db.select<{
    id: string;
    name: string;
    pink_flags: string | null;
    inferred_stage: string | null;
    last_contact_date: string | null;
    updated_at: string | null;
    outcome_bucket: string | null;
    natural_d: number | null;
    natural_i: number | null;
    natural_s: number | null;
    natural_c: number | null;
    gq_stale: number;
  }>(
    `SELECT c.id, c.name, c.pink_flags, c.inferred_stage, c.last_contact_date, c.updated_at, c.outcome_bucket,
            p.natural_d, p.natural_i, p.natural_s, p.natural_c,
            CASE WHEN date(c.updated_at) < date('now', '-14 days') THEN 1 ELSE 0 END AS gq_stale
     FROM clients c
     LEFT JOIN client_disc_profiles p ON p.client_id = c.id
     WHERE LOWER(COALESCE(c.outcome_bucket, 'active')) = 'active'`,
    []
  );

  for (const c of clientRows) {
    const stageCode = normalizeStage(c.inferred_stage ?? '');
    const actPink = activePinkFlags(parsePinkFlagsJson(c.pink_flags));
    if (actPink.length > 0 && !respondedKey.has(`${c.id}:pink_flag`)) {
      const a = ensureAcc(c.id, c.name);
      a.pinkKeys = actPink;
    }

    if (
      !respondedKey.has(`${c.id}:at_risk`) &&
      lastContactExceedsAtRiskThreshold(stageCode, c.last_contact_date)
    ) {
      const a = ensureAcc(c.id, c.name);
      a.atRiskLine = atRiskReasonLine(stageCode, c.last_contact_date);
    }

    const isC234 = stageCode === 'C2' || stageCode === 'C3' || stageCode === 'C4';
    const staleUpdate =
      isC234 && Number(c.gq_stale) === 1 && !respondedKey.has(`${c.id}:gone_quiet`);

    if (staleUpdate) {
      const a = ensureAcc(c.id, c.name);
      a.goneQuietLine = 'No client record update in 14+ days — time to re-engage.';
      const d = Number(c.natural_d ?? 0);
      const i = Number(c.natural_i ?? 0);
      const s = Number(c.natural_s ?? 0);
      const cc = Number(c.natural_c ?? 0);
      const letter =
        d + i + s + cc > 0 ? deriveDiscLetter(d, i, s, cc) : ('S' as const);
      a.discTip = DISC_REENGAGEMENT_TIP[letter];
    }
  }

  const signalClients: ClientSignalCard[] = [];
  for (const a of byClient.values()) {
    const hasPink = a.pinkKeys.length > 0;
    const hasAt = Boolean(a.atRiskLine);
    const hasGq = Boolean(a.goneQuietLine);

    let sortTier: 1 | 2 | 3 | 4;
    let borderColor: string;
    let badgeBg: string;
    let badgeLabel: string;
    let logSignalType: SignalKind;

    if (hasAt) {
      sortTier = 1;
      borderColor = '#2D4459';
      badgeBg = '#2D4459';
      badgeLabel = 'At risk';
      logSignalType = 'at_risk';
    } else if (a.pinkKeys.length >= 2) {
      sortTier = 2;
      borderColor = '#B91C1C';
      badgeBg = '#B91C1C';
      badgeLabel = 'Pink flags';
      logSignalType = 'pink_flag';
    } else if (a.pinkKeys.length === 1) {
      sortTier = 3;
      borderColor = '#F05F57';
      badgeBg = '#F05F57';
      badgeLabel = 'Pink flag';
      logSignalType = 'pink_flag';
    } else {
      sortTier = 4;
      borderColor = '#D97706';
      badgeBg = '#D97706';
      badgeLabel = 'Gone quiet';
      logSignalType = 'gone_quiet';
    }

    const signalTypes =
      (hasAt ? 1 : 0) + (hasPink ? 1 : 0) + (hasGq ? 1 : 0);
    if (signalTypes > 1) {
      badgeLabel = 'Multiple signals';
    }

    signalClients.push({
      id: a.clientId,
      clientId: a.clientId,
      clientName: a.clientName,
      sortTier,
      borderColor,
      badgeLabel,
      badgeBg,
      atRiskLine: a.atRiskLine,
      pinkLabels: hasPink ? a.pinkKeys.map(pinkLabelPretty) : undefined,
      goneQuietLine: a.goneQuietLine,
      discTip: a.discTip,
      logSignalType,
      pinkFlagKeys: [...a.pinkKeys],
    });
  }

  signalClients.sort((x, y) => {
    if (x.sortTier !== y.sortTier) return x.sortTier - y.sortTier;
    return x.clientName.localeCompare(y.clientName, undefined, { sensitivity: 'base' });
  });

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
    signalClients,
    converted: conv,
    history: hist,
    goldenDrafts,
  };
}

function formatHistorySignal(t: string): string {
  if (t === 'at_risk') return 'At risk';
  if (t === 'gone_quiet') return 'Gone quiet';
  if (t === 'pink_flag') return 'Pink flag';
  return t;
}

function daysSinceFromDateStr(iso: string | null | undefined): number {
  if (iso == null || String(iso).trim() === '') return 0;
  const n = daysSinceReferenceLocal(iso);
  return n ?? 0;
}

const SIGNALS_PREVIEW_LIMIT = 5;

export default function CoachingActions() {
  const [loading, setLoading] = useState(true);
  const [signalClients, setSignalClients] = useState<ClientSignalCard[]>([]);
  const [signalsExpanded, setSignalsExpanded] = useState(false);
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
          setSignalClients(data.signalClients);
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
    setSignalClients(data.signalClients);
    setConverted(data.converted);
    setHistory(data.history);
    setGoldenDrafts(data.goldenDrafts);
  };

  const handleResponseChange = async (item: ClientSignalCard, value: string) => {
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
          item.logSignalType,
          today,
          value,
          today,
          item.pinkFlagKeys.length > 0 ? item.pinkFlagKeys.join(',') : null,
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
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold" style={{ fontSize: 14, color: '#2D4459' }}>
            Signals Needing Response
          </h2>
          {signalClients.length > 0 ? (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: '#E8EEF1', color: '#2D4459' }}
            >
              {signalClients.length}{' '}
              {signalClients.length === 1 ? 'client needs' : 'clients need'} your response
            </span>
          ) : null}
        </div>
        {signalClients.length === 0 ? (
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
            {(signalsExpanded ? signalClients : signalClients.slice(0, SIGNALS_PREVIEW_LIMIT)).map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-[10px] border bg-white"
                  style={{
                    border: '1px solid #C8E8E5',
                    borderLeft: `4px solid ${item.borderColor}`,
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
                      style={{ background: item.badgeBg }}
                    >
                      {item.badgeLabel}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2" style={{ fontSize: 12, color: '#7A8F95' }}>
                    {item.atRiskLine ? <p>{item.atRiskLine}</p> : null}
                    {item.pinkLabels && item.pinkLabels.length > 0 ? (
                      <div>
                        <p className="font-semibold text-[#2D4459]">
                          {item.pinkLabels.length} active{' '}
                          {item.pinkLabels.length === 1 ? 'signal' : 'signals'}
                        </p>
                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                          {item.pinkLabels.map((label) => (
                            <li key={label}>{label}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {item.goneQuietLine ? <p>{item.goneQuietLine}</p> : null}
                    {item.discTip ? (
                      <p className="italic" style={{ color: '#2D4459' }}>
                        DISC tip: {item.discTip}
                      </p>
                    ) : null}
                  </div>
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
              )
            )}
            {!signalsExpanded && signalClients.length > SIGNALS_PREVIEW_LIMIT ? (
              <button
                type="button"
                className="text-sm font-semibold underline-offset-2 hover:underline"
                style={{ color: '#3BBFBF' }}
                onClick={() => setSignalsExpanded(true)}
              >
                See {signalClients.length - SIGNALS_PREVIEW_LIMIT} more in full list
              </button>
            ) : null}
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
