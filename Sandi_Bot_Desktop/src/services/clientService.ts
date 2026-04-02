import { dbSelect, dbExecute, getDb } from './db';
import { logEntry as logAuditEntry } from './auditService';
import type { Client } from '../types';
import { getRecommendation } from './recommendationService';
import {
  getAllStageReadiness,
  type PipelineStage,
} from './stageReadinessService';
import type { DashboardStats } from '../types';

const NET_WORTH_PINK_FLAG_TEXT =
  'Net worth below $250k — validate funding path early';

let netWorthPinkFlagCleanupOnce: Promise<void> | null = null;

/**
 * Removes stale net-worth pink flags from `clients.pink_flags` when You 2.0 range
 * is at/above $250k (schema uses JSON on clients — there is no client_pink_flags table).
 */
async function cleanupIncorrectNetWorthPinkFlags(): Promise<void> {
  const rows = await dbSelect<{
    id: string;
    pink_flags: string | null;
    financial_net_worth_range: string | null;
  }>(
    `SELECT c.id, c.pink_flags, y.financial_net_worth_range
     FROM clients c
     LEFT JOIN client_you2_profiles y ON y.client_id = c.id
     WHERE c.pink_flags IS NOT NULL
       AND TRIM(COALESCE(c.pink_flags, '')) NOT IN ('', '[]')`,
    []
  );

  for (const r of rows) {
    const rangeRaw = r.financial_net_worth_range;
    if (rangeRaw == null || String(rangeRaw).trim() === '') continue;
    if (isNetWorthBelowThreshold(rangeRaw)) continue;

    let flags: string[];
    try {
      const p = JSON.parse(r.pink_flags ?? '[]');
      if (!Array.isArray(p)) continue;
      flags = p.filter((x): x is string => typeof x === 'string');
    } catch {
      continue;
    }

    const filtered = flags.filter((f) => {
      const low = f.toLowerCase();
      if (low.includes('net worth below')) return false;
      if (f === NET_WORTH_PINK_FLAG_TEXT) return false;
      return true;
    });

    if (filtered.length === flags.length) continue;

    await dbExecute(
      `UPDATE clients SET pink_flags = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [JSON.stringify(filtered), r.id]
    );
  }
}

function ensureNetWorthPinkFlagCleanup(): Promise<void> {
  if (!netWorthPinkFlagCleanupOnce) {
    netWorthPinkFlagCleanupOnce = cleanupIncorrectNetWorthPinkFlags().catch(
      (e) => {
        console.error('[clientService] net worth pink flag cleanup failed:', e);
      }
    );
  }
  return netWorthPinkFlagCleanupOnce;
}

export async function getAllClients(): Promise<Client[]> {
  await ensureNetWorthPinkFlagCleanup();
  return dbSelect<Client>(
    `SELECT * FROM clients
     WHERE outcome_bucket IN ('active', 'converted', 'paused')
     ORDER BY updated_at DESC`
  );
}

export async function getClient(id: string): Promise<Client> {
  await ensureNetWorthPinkFlagCleanup();
  const results = await dbSelect<Client>(
    `SELECT * FROM clients WHERE id = $1`,
    [id]
  );
  if (results.length === 0) throw new Error('Client not found');
  return results[0];
}

export async function createClient(data: Partial<Client>): Promise<Client> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const client: Client = {
    id,
    name: data.name ?? 'New Client',
    email: data.email,
    phone: data.phone,
    company: data.company,
    stage: data.stage ?? 'Initial Contact',
    disc_style: data.disc_style,
    disc_scores: data.disc_scores,
    you2_statement: data.you2_statement,
    you2_dangers: data.you2_dangers,
    you2_opportunities: data.you2_opportunities,
    tumay_data: data.tumay_data,
    vision_statement: data.vision_statement,
    readiness_identity: data.readiness_identity ?? 3,
    readiness_commitment: data.readiness_commitment ?? 3,
    readiness_financial: data.readiness_financial ?? 3,
    readiness_execution: data.readiness_execution ?? 3,
    confidence: data.confidence ?? 50,
    recommendation: (data.recommendation ?? 'GATHER') as Client['recommendation'],
    outcome: data.outcome,
    notes: data.notes,
    created_at: now,
    updated_at: now,
  };

  await dbExecute(
    `INSERT INTO clients VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
    )`,
    [
      client.id,
      client.name,
      client.email ?? null,
      client.phone ?? null,
      client.company ?? null,
      client.stage,
      client.disc_style ?? null,
      client.disc_scores ?? null,
      client.you2_statement ?? null,
      client.you2_dangers ?? null,
      client.you2_opportunities ?? null,
      client.tumay_data ?? null,
      client.vision_statement ?? null,
      client.readiness_identity,
      client.readiness_commitment,
      client.readiness_financial,
      client.readiness_execution,
      client.confidence,
      client.recommendation,
      client.outcome ?? null,
      client.notes ?? null,
      client.created_at,
      client.updated_at,
    ]
  );

  const result = await getRecommendation(client);
  return { ...client, recommendation: result.recommendation };
}

export async function updateClient(
  id: string,
  data: Partial<Client>
): Promise<Client> {
  const now = new Date().toISOString();
  const existing = await getClient(id);
  const updated: Client = {
    ...existing,
    ...data,
    id,
    updated_at: now,
  };

  await dbExecute(
    `UPDATE clients SET
      name=$1, email=$2, phone=$3, company=$4, stage=$5,
      disc_style=$6, disc_scores=$7, you2_statement=$8,
      you2_dangers=$9, you2_opportunities=$10, tumay_data=$11,
      vision_statement=$12, readiness_identity=$13,
      readiness_commitment=$14, readiness_financial=$15,
      readiness_execution=$16, confidence=$17,
      recommendation=$18, outcome=$19, notes=$20, updated_at=$21
     WHERE id=$22`,
    [
      updated.name,
      updated.email ?? null,
      updated.phone ?? null,
      updated.company ?? null,
      updated.stage,
      updated.disc_style ?? null,
      updated.disc_scores ?? null,
      updated.you2_statement ?? null,
      updated.you2_dangers ?? null,
      updated.you2_opportunities ?? null,
      updated.tumay_data ?? null,
      updated.vision_statement ?? null,
      updated.readiness_identity,
      updated.readiness_commitment,
      updated.readiness_financial,
      updated.readiness_execution,
      updated.confidence,
      updated.recommendation,
      updated.outcome ?? null,
      updated.notes ?? null,
      now,
      id,
    ]
  );

  const result = await getRecommendation(updated);
  return { ...updated, recommendation: result.recommendation };
}

export interface ClientStageLogRow {
  id: string;
  client_id: string;
  from_stage: string | null;
  to_stage: string;
  moved_at: string;
  moved_by: string | null;
  notes: string | null;
}

function normalizeStageCode(s: string | null | undefined): string {
  return String(s ?? '').trim();
}

/**
 * Updates `inferred_stage` when Sandi moves a client, logs `client_stage_log`,
 * and writes `audit_log` (action_type `stage_transition`).
 */
export async function moveClientStage(
  clientId: string,
  newStage: PipelineStage,
  _reason: string,
  _movedBy: string
): Promise<boolean> {
  try {
    const current = await dbSelect<{ inferred_stage: string | null }>(
      `SELECT inferred_stage FROM clients WHERE id = $1`,
      [clientId]
    );
    if (current.length === 0) return false;

    const fromStage = current[0].inferred_stage ?? null;
    const toStage = normalizeStageCode(newStage);
    if (normalizeStageCode(fromStage) === toStage) return true;

    await dbExecute(
      `UPDATE clients SET
         inferred_stage = $1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [toStage, clientId]
    );

    const logId = crypto.randomUUID();
    const movedAt = new Date().toISOString();

    await dbExecute(
      `INSERT INTO client_stage_log
         (id, client_id, from_stage, to_stage, moved_at, moved_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [logId, clientId, fromStage, toStage, movedAt, 'sandi', null]
    );

    const detail = `${fromStage ?? ''} → ${toStage}`;
    await logAuditEntry(
      'stage_transition',
      clientId,
      fromStage,
      toStage,
      detail,
      'deterministic'
    );

    return true;
  } catch (error) {
    console.error('moveClientStage failed:', error);
    return false;
  }
}

export async function getStageTransitions(
  clientId: string
): Promise<ClientStageLogRow[]> {
  return dbSelect<ClientStageLogRow>(
    `SELECT id, client_id, from_stage, to_stage, moved_at, moved_by, notes
     FROM client_stage_log
     WHERE client_id = $1
     ORDER BY moved_at DESC`,
    [clientId]
  );
}

export async function getConversionRate(
  fromStage: string,
  toStage: string
): Promise<number> {
  const numRows = await dbSelect<{ n: number }>(
    `SELECT COUNT(DISTINCT client_id) AS n
     FROM client_stage_log
     WHERE to_stage = $1`,
    [toStage]
  );
  const numerator = Number(numRows[0]?.n ?? 0);

  const denomRows = await dbSelect<{ n: number }>(
    `SELECT COUNT(*) AS n FROM (
       SELECT DISTINCT client_id AS cid
       FROM client_stage_log
       WHERE to_stage = $1
       UNION
       SELECT DISTINCT id AS cid
       FROM clients
       WHERE inferred_stage = $1
     ) AS d`,
    [fromStage]
  );
  const denominator = Number(denomRows[0]?.n ?? 0);

  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

export async function inactivateClient(
  clientId: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clients
     SET outcome_bucket = 'inactive',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [clientId]
  );
  await logAuditEntry(
    'client_inactivated',
    clientId,
    null,
    'inactive',
    'Client inactivated by coach. Data preserved.',
    'deterministic'
  );
}

export async function reactivateClient(
  clientId: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clients
     SET outcome_bucket = 'active',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [clientId]
  );
  await logAuditEntry(
    'client_reactivated',
    clientId,
    null,
    'active',
    'Client reactivated by coach.',
    'deterministic'
  );
}

const DEFAULT_DASHBOARD_STATS: DashboardStats = {
  totalClients: 0,
  activeConversations: 0,
  avgReadinessScore: 0,
  conversionRate: 0,
  callsThisWeek: 0,
  timeSavedHours: 0,
  pushCount: 0,
  nurtureCount: 0,
  pauseCount: 0,
};

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const clients = await getAllClients();
    let allReadiness: Awaited<ReturnType<typeof getAllStageReadiness>> = [];
    try {
      allReadiness = await getAllStageReadiness();
    } catch (err) {
      console.error('getAllStageReadiness failed:', err);
    }

    const totalClients = clients.length;
    const activeConversations = clients.filter(
      (c) => c.outcome === 'ACTIVE' || !c.outcome
    ).length;

    const avgReadiness =
      clients.length > 0
        ? clients.reduce(
            (sum, c) =>
              sum +
              (c.readiness_identity +
                c.readiness_commitment +
                c.readiness_financial +
                c.readiness_execution) /
                4,
            0
          ) / clients.length
        : 0;

    const converted = clients.filter((c) => c.outcome === 'CONVERTED').length;

    const conversionRate =
      totalClients > 0 ? Math.round((converted / totalClients) * 100) : 0;

    const pushCount = allReadiness.filter((r) => r.recommendation === 'VALIDATE').length;
    const nurtureCount = allReadiness.filter((r) => r.recommendation === 'GATHER').length;
    const pauseCount = allReadiness.filter((r) => r.recommendation === 'PAUSE').length;

    return {
      totalClients,
      activeConversations,
      avgReadinessScore: Math.round(avgReadiness * 10) / 10,
      conversionRate,
      callsThisWeek: 0,
      timeSavedHours: Math.round(totalClients * 0.5 * 10) / 10,
      pushCount,
      nurtureCount,
      pauseCount,
    };
  } catch (err) {
    console.error('getDashboardStats failed:', err);
    return DEFAULT_DASHBOARD_STATS;
  }
}

/** Clients sorted by confidence descending (highest first) */
export function getRankedClients<T extends { confidence?: number }>(clients: T[]): T[] {
  return [...clients].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

/** Clients with recommendation === 'VALIDATE' */
export function getPushClients(clients: { recommendation?: string }[]): { recommendation?: string }[] {
  return clients.filter((c) => c.recommendation === 'VALIDATE');
}

/** Average confidence across clients (0 if empty) */
export function getAverageConfidence<T extends { confidence?: number }>(clients: T[]): number {
  if (clients.length === 0) return 0;
  const sum = clients.reduce((acc, c) => acc + (c.confidence ?? 0), 0);
  return Math.round(sum / clients.length);
}

/** Clients with supportive spouse (tumay.spouse.supportive === true) */
export function getSupportiveSpouseClients(
  clients: { tumay?: { spouse?: { supportive?: boolean } } }[]
): { tumay?: { spouse?: { supportive?: boolean } } }[] {
  return clients.filter((c) => c.tumay?.spouse?.supportive === true);
}

function parseNetWorthMoneyToken(
  numStr: string,
  unit: string | undefined
): number {
  let n = parseFloat(numStr);
  if (Number.isNaN(n)) return NaN;
  const u = (unit ?? '').toLowerCase();
  if (u === 'k') n *= 1000;
  if (u === 'm') n *= 1_000_000;
  return n;
}

/**
 * True when You 2.0 net worth range is below $250k (fires pink flag).
 * Below: "Below $50k", "50k - 250k". Not below: "250k - 500k", "500k - 1M", "1M+".
 *
 * Avoid naive substring checks (e.g. "150k - 250k" must not match "50k - 250k").
 */
export function isNetWorthBelowThreshold(
  netWorthRange: string | null
): boolean {
  if (!netWorthRange || !String(netWorthRange).trim()) return false;

  const s = String(netWorthRange)
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // At or above $250k — never flag
  if (/^1\s*m\s*\+$/i.test(s)) return false;
  if (/^250\s*k\s*[-–]\s*500\s*k$/i.test(s)) return false;
  if (/^500\s*k\s*[-–]\s*1\s*m$/i.test(s)) return false;

  // Explicit low bucket labels
  if (/^below\s*50\s*k$/i.test(s)) return true;
  if (/below\s*50\s*k/i.test(s) && !/\d+\s*k\s*[-–]/i.test(s)) return true;

  // Single hyphenated range: must not start at 250k+ (e.g. 250k–500k)
  const fullRange = s.match(
    /^(\d+\.?\d*)\s*(k|m)?\s*[-–]\s*(\d+\.?\d*)\s*(k|m)?$/i
  );
  if (fullRange) {
    const low = parseNetWorthMoneyToken(fullRange[1], fullRange[2]);
    const high = parseNetWorthMoneyToken(fullRange[3], fullRange[4]);
    if (Number.isNaN(low) || Number.isNaN(high)) return false;
    if (low >= 250_000) return false;
    return high <= 250_000;
  }

  return false;
}

export async function seedConvertedClientDates(): Promise<void> {
  await dbExecute(
    `UPDATE clients
     SET
       business_purchase_date = '2026-01-15',
       poc_reached_date = '2025-12-01',
       trigger_submitted_date = '2026-01-01',
       placement_revenue = '28000'
     WHERE name = 'David Van Abbema'
       AND outcome_bucket = 'converted'`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET
       business_purchase_date = '2026-02-10',
       poc_reached_date = '2026-01-15',
       trigger_submitted_date = '2026-02-01',
       placement_revenue = '28000'
     WHERE name = 'Kevin Lynch'
       AND outcome_bucket = 'converted'`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET
       business_purchase_date = '2026-03-05',
       poc_reached_date = '2026-02-01',
       trigger_submitted_date = '2026-02-20',
       placement_revenue = '28000'
     WHERE name = 'Mike Cain'
       AND outcome_bucket = 'converted'`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET last_contact_date = '2026-01-15'
     WHERE name = 'David Van Abbema'
       AND (
         last_contact_date IS NULL
         OR last_contact_date < '2024-01-01'
       )`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET last_contact_date = '2026-01-20'
     WHERE name = 'Kevin Lynch'
       AND (
         last_contact_date IS NULL
         OR last_contact_date < '2024-01-01'
       )`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET last_contact_date = '2026-02-01'
     WHERE name = 'Mike Cain'
       AND (
         last_contact_date IS NULL
         OR last_contact_date < '2024-01-01'
       )`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET last_contact_date = '2026-01-10'
     WHERE name = 'Mike Brooks'
       AND (
         last_contact_date IS NULL
         OR last_contact_date < '2024-01-01'
       )`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET email = COALESCE(
       NULLIF(email, ''),
       'not provided'
     )
     WHERE name = 'Mike Brooks'
       AND (email IS NULL OR email = '')`,
    []
  );
  console.log('Converted client dates seeded');
}

export async function seedPocDates(): Promise<void> {
  await dbExecute(
    `UPDATE clients
     SET
       poc_reached_date = '2026-01-01',
       last_contact_date = '2026-03-15'
     WHERE name = 'Alex Raiyn'
       AND outcome_bucket = 'active'`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET
       poc_reached_date = '2026-02-01',
       last_contact_date = '2026-03-10'
     WHERE name = 'Jeff Dayton'
       AND outcome_bucket = 'active'`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET last_contact_date = '2026-02-14'
     WHERE outcome_bucket = 'active'
       AND inferred_stage IN ('C2')
       AND (
         last_contact_date IS NULL
         OR last_contact_date < '2024-01-01'
       )`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET last_contact_date = '2026-02-20'
     WHERE outcome_bucket = 'active'
       AND inferred_stage IN ('C3')
       AND (
         last_contact_date IS NULL
         OR last_contact_date < '2024-01-01'
       )`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET last_contact_date = '2026-03-10'
     WHERE outcome_bucket = 'active'
       AND inferred_stage IN ('C4', 'C5')
       AND (
         last_contact_date IS NULL
         OR last_contact_date < '2024-01-01'
       )`,
    []
  );
  await dbExecute(
    `UPDATE clients
     SET last_contact_date = '2026-01-15'
     WHERE outcome_bucket = 'paused'
       AND (
         last_contact_date IS NULL
         OR last_contact_date < '2024-01-01'
       )`,
    []
  );
  console.log('POC dates and last contact dates seeded');
}

export async function fixPlaceholderDates(): Promise<void> {
  const now = new Date().toISOString();

  await dbExecute(
    `UPDATE clients
     SET updated_at = '2026-03-15',
         updated_at = $1
     WHERE outcome_bucket = 'active'
       AND inferred_stage IN ('C4', 'C5')
       AND (
         updated_at < '2024-01-01'
         OR updated_at IS NULL
       )`,
    [now]
  );
  await dbExecute(
    `UPDATE clients
     SET updated_at = '2026-02-20',
         updated_at = $1
     WHERE outcome_bucket = 'active'
       AND inferred_stage = 'C3'
       AND (
         updated_at < '2024-01-01'
         OR updated_at IS NULL
       )`,
    [now]
  );
  await dbExecute(
    `UPDATE clients
     SET updated_at = '2026-02-14',
         updated_at = $1
     WHERE outcome_bucket = 'active'
       AND inferred_stage = 'C2'
       AND (
         updated_at < '2024-01-01'
         OR updated_at IS NULL
       )`,
    [now]
  );
  await dbExecute(
    `UPDATE clients
     SET updated_at = '2026-01-15',
         updated_at = $1
     WHERE outcome_bucket = 'paused'
       AND (
         updated_at < '2024-01-01'
         OR updated_at IS NULL
       )`,
    [now]
  );
  await dbExecute(
    `UPDATE coaching_sessions
     SET session_date = '2026-02-14'
     WHERE session_date < '2024-01-01'
       AND stage IN ('C1', 'C2')`,
    []
  );
  await dbExecute(
    `UPDATE coaching_sessions
     SET session_date = '2026-02-20'
     WHERE session_date < '2024-01-01'
       AND stage IN ('C3', 'C4', 'C5')`,
    []
  );

  console.log('Placeholder dates fixed');
}

export async function clearPlaceholderSessions(): Promise<void> {
  await dbExecute(
    `DELETE FROM coaching_sessions
     WHERE notes LIKE '%John Doe%'`,
    []
  );
  await dbExecute(
    `DELETE FROM coaching_sessions
     WHERE notes LIKE '%john doe%'`,
    []
  );
  await dbExecute(
    `DELETE FROM coaching_sessions
     WHERE (
       notes IS NULL
       OR notes = ''
       OR notes = 'No notes recorded for this session.'
     )
     AND (
       session_date = '2026-02-14'
       OR session_date = '2026-02-20'
       OR session_date = '2023-02-15'
       OR session_date = '2023-02-20'
     )
     AND next_actions IS NULL`,
    []
  );
  await dbExecute(
    `DELETE FROM coaching_sessions
     WHERE clear_curiosity = 3
       AND clear_locating = 3
       AND clear_engagement = 3
       AND clear_accountability = 3
       AND clear_reflection = 3
       AND (notes IS NULL OR notes = '')
       AND next_actions IS NULL`,
    []
  );
  console.log('Placeholder sessions cleared');
}

// ONE-TIME SEED — last_contact_date
// for converted and paused clients
// missing 2026 dates
// (also placement dates for 3 converted clients — Placement Tracker)
void (async () => {
  try {
    await seedConvertedClientDates();
  } catch (e) {
    console.error('seedConvertedClientDates failed:', e);
  }
})();

// ONE-TIME FIX — updates 2023 placeholder
// dates to 2026 so gone quiet and
// at risk calculations are accurate
void (async () => {
  try {
    await fixPlaceholderDates();
  } catch (e) {
    console.error('fixPlaceholderDates failed:', e);
  }
})();

// ONE-TIME SEED — POC dates for Alex
// and Jeff + fix remaining 2023 dates
void (async () => {
  try {
    await seedPocDates();
  } catch (e) {
    console.error('seedPocDates failed:', e);
  }
})();

// ONE-TIME CLEANUP — removes John Doe
// placeholder sessions and empty
// pre-structure sessions before RAG
// embedding
void (async () => {
  try {
    await clearPlaceholderSessions();
  } catch (e) {
    console.error('clearPlaceholderSessions failed:', e);
  }
})();
