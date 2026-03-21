import { dbSelect, dbExecute } from './db';

export type PipelineStage =
  'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

export type Recommendation =
  'VALIDATE' | 'GATHER' | 'PAUSE';

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

interface Completeness {
  has_disc: boolean;
  has_you2: boolean;
  has_fathom: boolean;
  fathom_count: number;
  has_vision: boolean;
  spouse_aligned: boolean;
}

interface StageReadinessRow {
  id: string;
  name: string;
  outcome_bucket: string;
  inferred_stage: string;
  readiness_score: number;
  pink_flags: string;
  has_disc: number;
  has_you2: number;
  has_vision: number;
  fathom_count: number;
}

function normalizeStage(
  stage: string
): PipelineStage {
  const valid = [
    'IC', 'C1', 'C2', 'C3', 'C4', 'C5'
  ];
  return valid.includes(stage)
    ? stage as PipelineStage
    : 'IC';
}

function calculateReadinessScore(
  has_disc: boolean,
  has_you2: boolean,
  fathom_count: number,
  has_vision: boolean
): number {
  let score = 0;
  if (has_disc) score += 25;
  if (has_you2) score += 25;
  if (fathom_count >= 1) score += 10;
  if (fathom_count >= 2) score += 10;
  if (fathom_count >= 3) score += 5;
  if (has_vision) score += 25;
  return score;
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
  client_name: string,
  outcome_bucket: string,
  has_disc: boolean,
  has_you2: boolean,
  fathom_count: number,
  pink_flags: string[]
): Recommendation {
  let recommendation: Recommendation;
  if (outcome_bucket === 'paused') {
    recommendation = 'PAUSE';
  } else if (has_disc && has_you2 && fathom_count >= 1) {
    recommendation = 'VALIDATE';
  } else {
    recommendation = 'GATHER';
  }
  console.log(
    '[stageReadiness] recommendation',
    client_name,
    outcome_bucket,
    JSON.stringify(pink_flags),
    recommendation
  );
  return recommendation;
}

function parsePinkFlags(raw: string | null | undefined): string[] {
  const pinkFlags: string[] = [];
  try {
    const parsed = JSON.parse(raw ?? '[]');
    if (Array.isArray(parsed)) {
      pinkFlags.push(...parsed);
    }
  } catch {
    // no pink flags
  }
  return pinkFlags;
}

function rowToStageReadiness(row: StageReadinessRow): StageReadiness {
  const hasDisc = row.has_disc === 1;
  const hasYou2 = row.has_you2 === 1;
  const hasVision = row.has_vision === 1;
  const fathomCount = Number(row.fathom_count ?? 0);
  const stage = normalizeStage(row.inferred_stage ?? '');
  const comp: Completeness = {
    has_disc: hasDisc,
    has_you2: hasYou2,
    has_fathom: fathomCount > 0,
    fathom_count: fathomCount,
    has_vision: hasVision,
    spouse_aligned: true
  };
  const pinkFlags = parsePinkFlags(row.pink_flags);
  const whyHere = buildWhyHere(stage, comp);
  const whatIsNeeded = buildWhatIsNeeded(stage, comp, pinkFlags);
  const readinessScore = calculateReadinessScore(
    hasDisc,
    hasYou2,
    fathomCount,
    hasVision
  );
  const rec = calculateRecommendation(
    row.name,
    row.outcome_bucket,
    hasDisc,
    hasYou2,
    fathomCount,
    pinkFlags
  );
  const nextStage = STAGE_NEXT[stage];
  const recommendationReason =
    rec === 'PAUSE'
      ? row.outcome_bucket === 'paused'
        ? 'PAUSE — Client is in paused bucket'
        : `PAUSE — ${pinkFlags.length} pink flags need resolution`
      : rec === 'VALIDATE'
        ? nextStage
          ? `VALIDATE — Ready to advance to ${STAGE_FULL_NAMES[nextStage]}`
          : 'VALIDATE — Client has completed the journey'
        : `GATHER — ${whatIsNeeded[0] ?? 'Continue building readiness'}`;

  return {
    client_id: row.id,
    client_name: row.name,
    current_stage: stage,
    current_stage_full: STAGE_FULL_NAMES[stage],
    outcome_bucket: row.outcome_bucket ?? 'active',
    recommendation: rec,
    recommendation_reason: recommendationReason,
    readiness_score: readinessScore,
    why_here: whyHere,
    ready_to_advance: rec === 'VALIDATE',
    what_is_needed: whatIsNeeded,
    pink_flags: pinkFlags,
    next_stage: nextStage,
    next_stage_full: nextStage ? STAGE_FULL_NAMES[nextStage] : null
  };
}

export async function getStageReadiness(
  clientId: string
): Promise<StageReadiness | null> {
  const rows = await dbSelect<StageReadinessRow>(
    `SELECT
       c.id,
       c.name,
       c.outcome_bucket,
       c.inferred_stage,
       c.readiness_score,
       c.pink_flags,
       CASE WHEN dp.client_id IS NOT NULL
         THEN 1 ELSE 0 END as has_disc,
       CASE WHEN y.client_id IS NOT NULL
         THEN 1 ELSE 0 END as has_you2,
       CASE WHEN y.one_year_vision IS NOT NULL
         AND LENGTH(y.one_year_vision) > 20
         THEN 1 ELSE 0 END as has_vision,
       COUNT(cs.id) as fathom_count
     FROM clients c
     LEFT JOIN client_disc_profiles dp
       ON dp.client_id = c.id
     LEFT JOIN client_you2_profiles y
       ON y.client_id = c.id
     LEFT JOIN coaching_sessions cs
       ON cs.client_id = c.id
     WHERE c.id = ?
     GROUP BY c.id`,
    [clientId]
  );

  const row = rows[0];
  if (!row) return null;
  return rowToStageReadiness(row);
}

export async function getAllStageReadiness(): Promise<StageReadiness[]> {
  try {
    const rows = await dbSelect<StageReadinessRow>(
      `SELECT
         c.id,
         c.name,
         c.outcome_bucket,
         c.inferred_stage,
         c.readiness_score,
         c.pink_flags,
         CASE WHEN dp.client_id IS NOT NULL
           THEN 1 ELSE 0 END as has_disc,
         CASE WHEN y.client_id IS NOT NULL
           THEN 1 ELSE 0 END as has_you2,
         CASE WHEN y.one_year_vision IS NOT NULL
           AND LENGTH(y.one_year_vision) > 20
           THEN 1 ELSE 0 END as has_vision,
         COUNT(cs.id) as fathom_count
       FROM clients c
       LEFT JOIN client_disc_profiles dp
         ON dp.client_id = c.id
       LEFT JOIN client_you2_profiles y
         ON y.client_id = c.id
       LEFT JOIN coaching_sessions cs
         ON cs.client_id = c.id
       GROUP BY c.id
       ORDER BY c.name`,
      []
    );
    const scores = rows
      .filter(r => r.outcome_bucket !== 'converted')
      .map(r => calculateReadinessScore(
        r.has_disc === 1,
        r.has_you2 === 1,
        Number(r.fathom_count ?? 0),
        r.has_vision === 1
      ))
      .filter(s => s > 0);
    void scores;
    return rows.map(rowToStageReadiness);
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
