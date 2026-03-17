import { getDb, dbSelect, dbExecute } from './db';
import type { Client } from '../types';
import { getRecommendation } from './recommendationService';
import {
  updateClientStage,
  type OutcomeBucket
} from './stageInferenceService';

export interface ProfileRebuildResult {
  success: boolean;
  readiness_score: number;
  recommendation: string;
  pink_flags: string[];
  inferred_stage: string;
}

async function detectPinkFlags(
  clientId: string
): Promise<string[]> {
  const flags: string[] = [];

  const rows = await dbSelect<Array<{
    spouse_role: string;
    spouse_mindset: string;
    credit_score: number;
    dangers: string;
    financial_net_worth_range: string;
  }>>(
    `SELECT spouse_role, spouse_mindset, credit_score,
     dangers, financial_net_worth_range
     FROM client_you2_profiles WHERE client_id = $1`,
    [clientId]
  );

  if (rows.length === 0) return flags;
  const you2 = rows[0];

  if (you2.spouse_role === 'unsure') {
    flags.push('Spouse alignment unsure — must resolve before C3');
  }

  if (you2.credit_score > 0 && you2.credit_score < 650) {
    flags.push(
      `Credit score ${you2.credit_score} — funding may be limited`
    );
  }

  if (you2.spouse_mindset && you2.dangers) {
    const mindset = you2.spouse_mindset.toLowerCase();
    const dangers = you2.dangers.toLowerCase();
    const riskTerms = ['retirement', 'risk', 'debt', 'income', 'savings'];
    const echo = riskTerms.some(
      t => mindset.includes(t) && dangers.includes(t)
    );
    if (echo) {
      flags.push(
        'Spouse mindset echoes client danger — compound risk signal'
      );
    }
  }

  const nw = (you2.financial_net_worth_range || '').toLowerCase();
  if (nw && !nw.includes('250k') && !nw.includes('500k') &&
      !nw.includes('1m')) {
    flags.push('Net worth below $250k — validate funding path early');
  }

  return flags;
}

export async function rebuildClientProfile(
  clientId: string
): Promise<ProfileRebuildResult> {
  try {
    const pinkFlags = await detectPinkFlags(clientId);

    // Get current client for recommendation engine
    const clientRows = await dbSelect<Client>(
      `SELECT * FROM clients WHERE id = $1`,
      [clientId]
    );

    if (clientRows.length === 0) {
      return {
        success: false,
        readiness_score: 0,
        recommendation: 'PAUSE: Client not found',
        pink_flags: [],
        inferred_stage: 'IC'
      };
    }

    const client = clientRows[0];

    // Use existing recommendationService — do not rewrite
    const recResult = await getRecommendation(client);

    // Update client with new data
    await dbExecute(
      `UPDATE clients SET
       pink_flags = $1,
       recommendation = $2,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [
        JSON.stringify(pinkFlags),
        recResult.recommendation,
        clientId
      ]
    );

    // Update stage inference
    const bucket = (client.outcome_bucket as OutcomeBucket) || 'active';
    const stageResult = await updateClientStage(clientId, bucket);

    return {
      success: true,
      readiness_score: recResult.score ?? 0,
      recommendation: recResult.recommendation,
      pink_flags: pinkFlags,
      inferred_stage: stageResult.inferred_stage
    };

  } catch (error) {
    const message = error instanceof Error
      ? error.message : 'Unknown error';
    console.error('Profile rebuild failed:', message);
    return {
      success: false,
      readiness_score: 0,
      recommendation: 'PAUSE: Profile rebuild error — review manually',
      pink_flags: ['System: profile calculation error'],
      inferred_stage: 'IC'
    };
  }
}
