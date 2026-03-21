import { dbSelect, dbExecute } from './db';
import type { Client } from '../types';
import { getRecommendation } from './recommendationService';
import { getAllStageReadiness } from './stageReadinessService';
import type { DashboardStats } from '../types';

export async function getAllClients(): Promise<Client[]> {
  return dbSelect<Client>(
    `SELECT * FROM clients ORDER BY updated_at DESC`
  );
}

export async function getClient(id: string): Promise<Client> {
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
    recommendation: data.recommendation ?? 'GATHER',
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

export async function deleteClient(id: string): Promise<void> {
  await dbExecute(`DELETE FROM clients WHERE id = $1`, [id]);
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
export function getRankedClients(clients: { confidence?: number }[]): { confidence?: number }[] {
  return [...clients].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

/** Clients with recommendation === 'VALIDATE' */
export function getPushClients(clients: { recommendation?: string }[]): { recommendation?: string }[] {
  return clients.filter((c) => c.recommendation === 'VALIDATE');
}

/** Average confidence across clients (0 if empty) */
export function getAverageConfidence(clients: { confidence?: number }[]): number {
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
