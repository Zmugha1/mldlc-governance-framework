import { dbSelect, dbExecute } from './db';

export type OutcomeBucket =
  'active' | 'converted' | 'paused' | 'various';

// Maps Sandi's actual folder names to system buckets
export const FOLDER_TO_BUCKET: Record<string, OutcomeBucket> = {
  'Active': 'active',
  'Paused': 'paused',
  'WIN': 'converted',
  'Various': 'various'
};

// Maps system buckets back to display labels
export const BUCKET_LABELS: Record<OutcomeBucket, string> = {
  active: 'Active',
  converted: 'WIN',
  paused: 'Paused',
  various: 'Various'
};

export type PipelineStageShort =
  'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

// Maps short stage codes to full PipelineStage names
// used by existing pipelineService and index.ts
export const STAGE_TO_FULL: Record<PipelineStageShort, string> = {
  IC: 'Initial Contact',
  C1: 'Seeker Connection',
  C2: 'Seeker Clarification',
  C3: 'Possibilities',
  C4: 'Validation',
  C5: 'Business Purchase'
};

export interface DocumentCompleteness {
  has_tumay: boolean;
  has_disc: boolean;
  has_you2: boolean;
  has_fathom: boolean;
  fathom_session_count: number;
  has_vision: boolean;
}

export interface StageInference {
  inferred_stage: PipelineStageShort;
  full_stage_name: string;
  confidence: number;
  reasoning: string;
  ready_for_next_stage: boolean;
  missing_documents: string[];
}

export function inferStageFromDocuments(
  completeness: DocumentCompleteness,
  bucket: OutcomeBucket
): StageInference {

  // WIN clients are always C5
  if (bucket === 'converted') {
    return {
      inferred_stage: 'C5',
      full_stage_name: STAGE_TO_FULL['C5'],
      confidence: 1.0,
      reasoning: 'Client is in WIN bucket — franchise purchased',
      ready_for_next_stage: false,
      missing_documents: []
    };
  }

  const stage = inferFromDocs(completeness);
  const confidence = calcConfidence(completeness, bucket);
  const reasoning = buildReasoning(completeness, stage, bucket);

  return {
    inferred_stage: stage,
    full_stage_name: STAGE_TO_FULL[stage],
    confidence,
    reasoning,
    ready_for_next_stage: isReadyForNext(completeness, stage),
    missing_documents: getMissingDocs(completeness)
  };
}

function inferFromDocs(c: DocumentCompleteness): PipelineStageShort {
  if (!c.has_tumay && !c.has_disc) return 'IC';
  if (c.has_tumay && !c.has_disc) return 'IC';
  if (c.has_disc && !c.has_you2) return 'C1';
  if (c.has_disc && c.has_you2 &&
      c.fathom_session_count === 0) return 'C1';
  if (c.has_disc && c.has_you2 &&
      c.fathom_session_count >= 1 &&
      c.fathom_session_count <= 2) return 'C2';
  if (c.has_disc && c.has_you2 &&
      c.fathom_session_count >= 3 &&
      !c.has_vision) return 'C3';
  if (c.has_vision &&
      c.fathom_session_count >= 4) return 'C4';
  return 'C1';
}

function calcConfidence(
  c: DocumentCompleteness,
  bucket: OutcomeBucket
): number {
  if (bucket === 'paused') return 0.5;
  let score = 0.4;
  if (c.has_tumay) score += 0.1;
  if (c.has_disc) score += 0.15;
  if (c.has_you2) score += 0.15;
  if (c.fathom_session_count > 0) score += 0.1;
  // Never above 0.85 — Sandi must confirm
  return Math.min(score, 0.85);
}

function isReadyForNext(
  c: DocumentCompleteness,
  stage: PipelineStageShort
): boolean {
  switch (stage) {
    case 'IC': return c.has_disc;
    case 'C1': return c.has_disc && c.has_you2;
    case 'C2': return c.fathom_session_count >= 2;
    case 'C3': return c.has_vision;
    case 'C4': return c.fathom_session_count >= 4;
    default: return false;
  }
}

function getMissingDocs(c: DocumentCompleteness): string[] {
  const missing: string[] = [];
  if (!c.has_tumay) missing.push('TUMAY intake form');
  if (!c.has_disc) missing.push('DISC assessment');
  if (!c.has_you2) missing.push('You 2.0 profile');
  if (!c.has_vision) missing.push('Vision statement');
  return missing;
}

function buildReasoning(
  c: DocumentCompleteness,
  stage: PipelineStageShort,
  bucket: OutcomeBucket
): string {
  const docs: string[] = [];
  if (c.has_tumay) docs.push('TUMAY');
  if (c.has_disc) docs.push('DISC');
  if (c.has_you2) docs.push('You 2.0');
  if (c.has_fathom) docs.push(
    `${c.fathom_session_count} Fathom session(s)`
  );
  if (c.has_vision) docs.push('Vision statement');
  if (bucket === 'paused') docs.push('(Paused bucket)');

  const docText = docs.length > 0
    ? docs.join(', ')
    : 'no documents yet';

  return `Stage ${stage} inferred from: ${docText}. ` +
    `Confidence below 85% — awaiting Sandi confirmation.`;
}

export async function getDocumentCompleteness(
  clientId: string
): Promise<DocumentCompleteness> {
  const rows = await dbSelect<{ document_type: string }>(
    `SELECT document_type FROM document_extractions
     WHERE client_id = $1 AND extraction_status = 'complete'`,
    [clientId]
  );

  const types = rows.map(r => r.document_type);

  const fathomRows = await dbSelect<{ count: number }>(
    `SELECT COUNT(*) as count FROM coaching_sessions
     WHERE client_id = $1`,
    [clientId]
  );

  return {
    has_tumay: types.includes('you2') || types.includes('you2_intake'),
    has_disc: types.includes('disc'),
    has_you2: types.includes('you2'),
    has_fathom: types.includes('fathom'),
    fathom_session_count: fathomRows[0]?.count ?? 0,
    has_vision: types.includes('vision')
  };
}

export async function updateClientStage(
  clientId: string,
  bucket: OutcomeBucket
): Promise<StageInference> {
  const completeness = await getDocumentCompleteness(clientId);
  const inference = inferStageFromDocuments(completeness, bucket);

  // Get current stage for log
  const current = await dbSelect<{
    inferred_stage: string;
    outcome_bucket: string;
  }>(
    `SELECT inferred_stage, outcome_bucket
     FROM clients WHERE id = $1`,
    [clientId]
  );

  await dbExecute(
    `UPDATE clients SET
     outcome_bucket = $1,
     inferred_stage = $2,
     stage = $3,
     stage_confirmed = 0,
     updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [
      bucket,
      inference.inferred_stage,
      inference.full_stage_name,
      clientId
    ]
  );

  // Log the stage change
  await dbExecute(
    `INSERT INTO client_stage_log
     (client_id, previous_stage, new_stage,
      previous_bucket, new_bucket, changed_by)
     VALUES ($1, $2, $3, $4, $5, 'system')`,
    [
      clientId,
      current[0]?.inferred_stage ?? 'unknown',
      inference.inferred_stage,
      current[0]?.outcome_bucket ?? 'unknown',
      bucket
    ]
  );

  return inference;
}

export async function confirmClientStage(
  clientId: string,
  confirmedStage: PipelineStageShort
): Promise<void> {
  await dbExecute(
    `UPDATE clients SET
     inferred_stage = $1,
     stage = $2,
     stage_confirmed = 1,
     updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [
      confirmedStage,
      STAGE_TO_FULL[confirmedStage],
      clientId
    ]
  );

  await dbExecute(
    `INSERT INTO client_stage_log
     (client_id, new_stage, changed_by)
     VALUES ($1, $2, 'sandi')`,
    [clientId, confirmedStage]
  );
}
