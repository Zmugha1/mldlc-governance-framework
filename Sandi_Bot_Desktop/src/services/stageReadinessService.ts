import { dbSelect, dbExecute } from './db';

export type PipelineStage =
  'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

export type Recommendation =
  'PUSH' | 'NURTURE' | 'PAUSE';

export interface StageReadiness {
  client_id: string;
  client_name: string;
  current_stage: PipelineStage;
  current_stage_full: string;
  outcome_bucket: string;
  recommendation: Recommendation;
  recommendation_reason: string;
  readiness_score: number;
  why_here: string[];
  ready_to_advance: boolean;
  what_is_needed: string[];
  pink_flags: string[];
  next_stage: PipelineStage | null;
  next_stage_full: string | null;
}

const STAGE_FULL_NAMES: Record<PipelineStage, string> = {
  IC: 'Initial Contact',
  C1: 'Seeker Connection',
  C2: 'Seeker Clarification',
  C3: 'Coach Client Collaboration',
  C4: 'Client Career 2.0',
  C5: 'Business Purchase'
};

const STAGE_NEXT: Record<PipelineStage, PipelineStage | null> = {
  IC: 'C1', C1: 'C2', C2: 'C3',
  C3: 'C4', C4: 'C5', C5: null
};

const ADVANCEMENT_REQUIREMENTS: Record<PipelineStage, string[]> = {
  IC: [
    'Complete DISC assessment',
    'Schedule first coaching session'
  ],
  C1: [
    'Complete You 2.0 profile',
    'Review DISC results together',
    'Resolve spouse alignment if unsure'
  ],
  C2: [
    'Complete minimum 2 Fathom sessions',
    'Discuss vehicles and funding options',
    'Resolve any pink flags'
  ],
  C3: [
    'Complete vision statement',
    'Present three franchise possibilities',
    'Schedule validation calls',
    'Minimum 3 sessions completed'
  ],
  C4: [
    'Complete validation calls',
    'Client selects preferred franchise',
    'Review financial requirements',
    'Minimum 4 sessions completed'
  ],
  C5: []
};

interface ClientData {
  id: string;
  name: string;
  inferred_stage: string;
  outcome_bucket: string;
  readiness_score: number;
  recommendation: string;
  pink_flags: string;
}

interface Completeness {
  has_disc: boolean;
  has_you2: boolean;
  has_fathom: boolean;
  fathom_count: number;
  has_vision: boolean;
  spouse_aligned: boolean;
}

async function getClientData(clientId: string): Promise<ClientData | null> {
  const rows = await dbSelect<ClientData[]>(
    `SELECT id, name, inferred_stage,
     outcome_bucket, readiness_score,
     recommendation, pink_flags
     FROM clients WHERE id = $1`,
    [clientId]
  );
  return rows[0] ?? null;
}

function normalizeStage(stage: string): PipelineStage {
  const valid: PipelineStage[] = ['IC', 'C1', 'C2', 'C3', 'C4', 'C5'];
  if (valid.includes(stage as PipelineStage)) {
    return stage as PipelineStage;
  }
  return 'IC';
}

function calculateReadinessScore(
  comp: Completeness | null | undefined,
  _stage: PipelineStage
): number {
  if (!comp) return 0;
  let score = 0;
  let max = 0;

  max += 25;
  if (comp?.has_disc) score += 25;

  max += 25;
  if (comp?.has_you2) score += 25;

  max += 25;
  const fathomCount = comp?.fathom_count ?? 0;
  if (fathomCount >= 1) score += 10;
  if (fathomCount >= 2) score += 10;
  if (fathomCount >= 3) score += 5;

  max += 25;
  if (comp?.has_vision) score += 25;

  return max > 0 ? Math.round((score / max) * 100) : 0;
}

async function getCompleteness(clientId: string): Promise<Completeness> {
  const disc = await dbSelect<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM client_disc_profiles
     WHERE client_id = $1`,
    [clientId]
  );

  const you2 = await dbSelect<Array<{
    count: number;
    spouse_on_calls: string;
  }>>(
    `SELECT COUNT(*) as count,
     spouse_on_calls
     FROM client_you2_profiles
     WHERE client_id = $1`,
    [clientId]
  );

  const fathom = await dbSelect<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM coaching_sessions
     WHERE client_id = $1`,
    [clientId]
  );

  const vision = await dbSelect<Array<{ count: number }>>(
    `SELECT COUNT(*) as count
     FROM document_extractions
     WHERE client_id = $1
     AND document_type = 'vision'
     AND extraction_status = 'complete'`,
    [clientId]
  );

  return {
    has_disc: (disc[0]?.count ?? 0) > 0,
    has_you2: (you2[0]?.count ?? 0) > 0,
    has_fathom: (fathom[0]?.count ?? 0) > 0,
    fathom_count: fathom[0]?.count ?? 0,
    has_vision: (vision[0]?.count ?? 0) > 0,
    spouse_aligned: you2[0]?.spouse_on_calls === 'yes'
  };
}

function buildWhyHere(stage: PipelineStage, comp: Completeness | null | undefined): string[] {
  const reasons: string[] = [];
  const fc = comp?.fathom_count ?? 0;

  switch (stage) {
    case 'IC':
      reasons.push('Just entered the pipeline');
      if (!comp?.has_disc) {
        reasons.push('DISC assessment not yet complete');
      }
      break;
    case 'C1':
      if (comp?.has_disc) {
        reasons.push('DISC assessment complete');
      }
      if (!comp?.has_you2) {
        reasons.push('You 2.0 profile pending');
      } else {
        reasons.push('You 2.0 profile complete');
      }
      if (fc === 0) {
        reasons.push('No coaching sessions yet');
      } else {
        reasons.push(`${fc} session(s) completed`);
      }
      break;
    case 'C2':
      reasons.push('DISC and You 2.0 complete');
      reasons.push(`${fc} coaching session(s)`);
      if (!comp?.has_vision) {
        reasons.push('Vision statement pending');
      }
      break;
    case 'C3':
      reasons.push('Full profile complete');
      reasons.push(`${fc} sessions completed`);
      reasons.push('Ready for franchise presentation');
      break;
    case 'C4':
      reasons.push('Franchise possibilities presented');
      reasons.push(`${fc} sessions completed`);
      break;
    case 'C5':
      reasons.push('Client selected a franchise');
      reasons.push('Purchase process completed');
      break;
  }

  return reasons;
}

function buildWhatIsNeeded(
  stage: PipelineStage,
  comp: Completeness | null | undefined,
  pinkFlags: string[]
): string[] {
  const needed = [...ADVANCEMENT_REQUIREMENTS[stage]];
  const fc = comp?.fathom_count ?? 0;

  const filtered = needed.filter(item => {
    if (item.includes('DISC') && comp?.has_disc) return false;
    if (item.includes('You 2.0') && comp?.has_you2) return false;
    if (item.includes('vision') && comp?.has_vision) return false;
    if (item.includes('2 Fathom') && fc >= 2) return false;
    if (item.includes('3 sessions') && fc >= 3) return false;
    if (item.includes('4 sessions') && fc >= 4) return false;
    return true;
  });

  if (pinkFlags.length > 0) {
    filtered.push(`Resolve ${pinkFlags.length} pink flag(s)`);
  }

  return filtered.length > 0
    ? filtered
    : ['All requirements met — ready to advance'];
}

function calculateRecommendation(
  stage: PipelineStage,
  comp: Completeness | null | undefined,
  readinessScore: number,
  pinkFlags: string[],
  whatIsNeeded: string[]
): { rec: Recommendation; reason: string } {
  const readyToAdvance =
    whatIsNeeded.length === 1 &&
    whatIsNeeded[0].includes('All requirements met');

  if (pinkFlags.length >= 2) {
    return {
      rec: 'PAUSE',
      reason: `PAUSE — ${pinkFlags.length} pink flags need resolution`
    };
  }

  if (!comp?.spouse_aligned && comp?.has_you2) {
    return {
      rec: 'PAUSE',
      reason: 'PAUSE — Spouse alignment not confirmed'
    };
  }

  const qualifiesForPush =
    (readyToAdvance && readinessScore >= 50) ||
    (comp?.has_disc && comp?.has_you2 && (comp?.fathom_count ?? 0) >= 2);

  if (qualifiesForPush) {
    const next = STAGE_NEXT[stage];
    return {
      rec: 'PUSH',
      reason: next
        ? `PUSH — Ready to advance to ${STAGE_FULL_NAMES[next]}`
        : 'PUSH — Client has completed the journey'
    };
  }

  const missing = whatIsNeeded[0] ?? 'Continue building readiness';
  return {
    rec: 'NURTURE',
    reason: `NURTURE — ${missing}`
  };
}

export async function getStageReadiness(
  clientId: string
): Promise<StageReadiness | null> {
  const client = await getClientData(clientId);
  if (!client) return null;

  const comp = await getCompleteness(clientId);

  const pinkFlags: string[] = [];
  try {
    const parsed = JSON.parse(client.pink_flags ?? '[]');
    if (Array.isArray(parsed)) {
      pinkFlags.push(...parsed);
    }
  } catch { /* no pink flags */ }

  const rawStage = client?.inferred_stage ?? 'IC';
  const stage = normalizeStage(rawStage);

  const whyHere = buildWhyHere(stage, comp);

  const whatIsNeeded = buildWhatIsNeeded(stage, comp, pinkFlags);

  const readinessScore = calculateReadinessScore(comp, stage);

  const readyToAdvance =
    whatIsNeeded.length === 1 &&
    whatIsNeeded[0].includes('All requirements met');

  const { rec, reason } = calculateRecommendation(
    stage,
    comp,
    readinessScore,
    pinkFlags,
    whatIsNeeded
  );

  const nextStage = STAGE_NEXT[stage];

  return {
    client_id: clientId,
    client_name: client.name,
    current_stage: stage,
    current_stage_full: STAGE_FULL_NAMES[stage],
    outcome_bucket: client.outcome_bucket ?? 'active',
    recommendation: rec,
    recommendation_reason: reason,
    readiness_score: readinessScore,
    why_here: whyHere,
    ready_to_advance: readyToAdvance,
    what_is_needed: whatIsNeeded,
    pink_flags: pinkFlags,
    next_stage: nextStage,
    next_stage_full: nextStage ? STAGE_FULL_NAMES[nextStage] : null
  };
}

export async function getAllStageReadiness(): Promise<StageReadiness[]> {
  try {
    const clients = await dbSelect<Array<{ id: string }>>(
      `SELECT id FROM clients
       WHERE outcome_bucket = 'active'
       ORDER BY name`
    );

    const results = await Promise.all(
      clients.map(c => getStageReadiness(c.id))
    );

    return results.filter((r): r is StageReadiness => r !== null);
  } catch (err) {
    console.error('getAllStageReadiness failed:', err);
    return [];
  }
}

export async function moveClientStage(
  clientId: string,
  newStage: PipelineStage,
  reason: string,
  movedBy: string
): Promise<boolean> {
  try {
    const current = await dbSelect<Array<{
      inferred_stage: string;
      name: string;
    }>>(
      `SELECT inferred_stage, name
       FROM clients WHERE id = $1`,
      [clientId]
    );

    if (current.length === 0) return false;

    const previousStage = current[0].inferred_stage;
    const clientName = current[0].name;

    await dbExecute(
      `UPDATE clients SET
       inferred_stage = $1,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newStage, clientId]
    );

    await dbExecute(
      `INSERT INTO audit_log
       (client_id, action_type, reasoning)
       VALUES ($1, 'stage_change', $2)`,
      [
        clientId,
        `${clientName} moved from ${previousStage} to ${newStage} by ${movedBy}. Reason: ${reason}`
      ]
    );

    return true;
  } catch (error) {
    console.error('Stage move failed:', error);
    return false;
  }
}
