import { dbSelect, dbExecute, getDb } from './db';
import { deriveDominantStyle } from '../config/discCoachingTips';

export function calculateCLEARFromBlocks(
  session: Record<string, unknown>
): {
  c_score: number;
  l_score: number;
  e_score: number;
  a_score: number;
  r_score: number;
  overall: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let c = 1; let l = 1; let e = 1; let a = 1; let r = 1;

  // C - Contracting
  try {
    if (session.block_opening) {
      const opening = typeof session.block_opening
        === 'string'
        ? JSON.parse(session.block_opening)
        : session.block_opening;
      if ((opening as { contracting_done?: boolean; client_set_agenda?: boolean })?.contracting_done &&
          (opening as { contracting_done?: boolean; client_set_agenda?: boolean })?.client_set_agenda) {
        c = 5;
      } else if ((opening as { contracting_done?: boolean })?.contracting_done) {
        c = 3;
        feedback.push(
          'C: Goal set but client did not own ' +
          'the agenda. Try: "What would make ' +
          'this valuable for you?"'
        );
      } else {
        c = 1;
        feedback.push(
          'C: No contracting detected. ' +
          'Always open with the gold question.'
        );
      }
    }
  } catch { c = 1; }

  // L - Listening
  try {
    if (session.block_emotional) {
      const emotional = typeof session.block_emotional
        === 'string'
        ? JSON.parse(session.block_emotional)
        : session.block_emotional;
      const emo = emotional as {
        emotions_expressed?: unknown[];
        fears_mentioned?: unknown[];
        identity_statements?: unknown[];
      };
      const count =
        (emo?.emotions_expressed?.length ?? 0) +
        (emo?.fears_mentioned?.length ?? 0) +
        (emo?.identity_statements?.length ?? 0);
      if (count >= 5) {
        l = 5;
      } else if (count >= 3) {
        l = 3;
        feedback.push(
          'L: Some emotional discovery. ' +
          'Push deeper with "what else?" ' +
          'after every emotional answer.'
        );
      } else {
        l = 1;
        feedback.push(
          'L: Low emotional discovery. ' +
          'Target: emotional questions >= 60%. ' +
          'Are you explaining instead of asking?'
        );
      }
    }
  } catch { l = 1; }

  // E - Exploring
  try {
    if (session.block_vision) {
      const vision = typeof session.block_vision
        === 'string'
        ? JSON.parse(session.block_vision)
        : session.block_vision;
      const v = vision as {
        future_life_described?: boolean;
        lifestyle_details?: unknown[];
      };
      if (v?.future_life_described &&
          (v?.lifestyle_details?.length ?? 0) >= 3) {
        e = 5;
      } else if (v?.future_life_described) {
        e = 3;
        feedback.push(
          'E: Client described future but ' +
          'stayed surface-level. Ask: ' +
          '"What does your ideal Thursday ' +
          'look like?"'
        );
      } else {
        e = 1;
        feedback.push(
          'E: No future life vision captured. ' +
          'Ask: "Imagine 3 years from now - ' +
          'what does your life look like?"'
        );
      }
    }
  } catch { e = 1; }

  // A - Action
  try {
    if (session.block_commitments) {
      const commits =
        typeof session.block_commitments === 'string'
          ? JSON.parse(session.block_commitments)
          : session.block_commitments;
      const cm = commits as {
        client_chose_action?: boolean;
        client_commitments?: unknown[];
      };
      if (cm?.client_chose_action &&
          (cm?.client_commitments?.length ?? 0) > 0) {
        a = 5;
      } else if ((cm?.client_commitments?.length ?? 0) > 0) {
        a = 3;
        feedback.push(
          'A: Next steps set but coach assigned. ' +
          'Ask: "What would be a smart next ' +
          'step for you?" Let client choose.'
        );
      } else {
        a = 1;
        feedback.push(
          'A: No commitments recorded. ' +
          'Every session must end with a ' +
          'client-chosen next step.'
        );
      }
    }
  } catch { a = 1; }

  // R - Reflection
  try {
    if (session.block_reflection_block) {
      const reflection =
        typeof session.block_reflection_block === 'string'
          ? JSON.parse(session.block_reflection_block)
          : session.block_reflection_block;
      const rf = reflection as {
        insight_surfaced?: unknown;
        mindset_shift?: unknown;
      };
      if (rf?.insight_surfaced &&
          String(rf.insight_surfaced).length > 20) {
        r = 5;
      } else if (rf?.mindset_shift) {
        r = 3;
        feedback.push(
          'R: Some reflection captured. ' +
          'Look for the insight they cannot name. ' +
          'Benchmark: "There is no fun in ' +
          'your life."'
        );
      } else {
        r = 1;
        feedback.push(
          'R: No reflection detected. ' +
          'Before ending: name one thing the ' +
          'client showed but never said.'
        );
      }
    }
  } catch { r = 1; }

  const overall =
    Math.round(((c + l + e + a + r) / 5) * 10) / 10;

  return {
    c_score: c, l_score: l, e_score: e,
    a_score: a, r_score: r,
    overall, feedback
  };
}

export function getCLEARLabel(
  score: number
): string {
  if (score >= 7.5) return 'Elite';
  if (score >= 6.0) return 'Good';
  if (score >= 4.0) return 'Developing';
  return 'Informational';
}

export function getCLEARColor(
  score: number
): string {
  if (score >= 7.5) return 'text-teal-600';
  if (score >= 6.0) return 'text-blue-600';
  if (score >= 4.0) return 'text-amber-600';
  return 'text-red-600';
}

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
  natural_d: number | null;
  natural_i: number | null;
  natural_s: number | null;
  natural_c: number | null;
}

export async function detectAndSavePinkFlags(
  clientId: string,
  sessionId: number,
  discStyle: string
): Promise<string[]> {
  const _sessionId = sessionId;
  void _sessionId;
  const db = await getDb();
  const flags: string[] = [];

  const sessions = await db.select<Array<{
    block_objections: string | null;
    notes: string | null;
  }>>(
    `SELECT block_objections, notes
     FROM coaching_sessions
     WHERE client_id = ?
     ORDER BY session_date DESC
     LIMIT 1`,
    [clientId]
  );

  if (!sessions.length) return flags;

  const session = sessions[0];

  // Get text to scan — prefer block_objections, fall back to notes
  let scanText = '';
  if (session.block_objections) {
    try {
      const obj = JSON.parse(
        session.block_objections
      ) as {
        pink_flag_language?: unknown[];
        objections?: unknown[];
      };
      scanText = [
        ...(obj.pink_flag_language ?? []),
        ...(obj.objections ?? [])
      ].join(' ').toLowerCase();
    } catch {
      scanText = session.block_objections
        .toLowerCase();
    }
  } else if (session.notes) {
    scanText = session.notes.toLowerCase();
  }

  if (!scanText) return flags;

  // Universal flags
  if (scanText.includes('needs more time') ||
      scanText.includes('wants to think')) {
    flags.push('timeline_slipping');
  }
  if (scanText.includes("job isn't that bad") ||
      scanText.includes('maybe i should stay') ||
      scanText.includes('not sure this is')) {
    flags.push('fear_reframing');
  }
  if (scanText.includes('research on my own') ||
      scanText.includes("i'll reach out when") ||
      scanText.includes('enough information')) {
    flags.push('exit_signal');
  }
  if (scanText.includes('financial concern') ||
      scanText.includes('worried about the')) {
    flags.push('financial_concern');
  }

  // DISC-specific
  const style = discStyle?.toUpperCase()
    ?.charAt(0) ?? '';

  if (style === 'C') {
    if (scanText.includes('what are the fees') ||
        scanText.includes('what is the structure') ||
        scanText.includes('royalty')) {
      flags.push('technical_question_mode');
    }
    if (scanText.includes('that makes sense') ||
        (scanText.includes('i understand') &&
        scanText.length < 200)) {
      flags.push('overly_agreeable');
    }
  }
  if (style === 'S') {
    if (scanText.includes("spouse isn't sure") ||
        scanText.includes("family isn't on")) {
      flags.push('family_concern');
    }
    if (scanText.includes('too risky') ||
        scanText.includes('what about benefits')) {
      flags.push('security_fear');
    }
  }
  if (style === 'D') {
    if (scanText.includes('too many rules') ||
        scanText.includes('too much oversight')) {
      flags.push('control_loss');
    }
  }
  if (style === 'I') {
    if (scanText.includes('really busy') ||
        scanText.includes('a lot going on')) {
      flags.push('distraction_pattern');
    }
  }

  if (!flags.length) return flags;

  // Merge with existing flags
  const clients = await db.select<Array<{
    pink_flags: string | null;
  }>>(
    `SELECT pink_flags FROM clients
     WHERE id = ?`,
    [clientId]
  );

  const existing = clients[0]?.pink_flags
    ? JSON.parse(clients[0].pink_flags) as string[]
    : [];

  const merged = [
    ...new Set([...existing, ...flags])
  ];

  await db.execute(
    `UPDATE clients
     SET pink_flags = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [JSON.stringify(merged), clientId]
  );

  await db.execute(
    `INSERT INTO audit_log
     (action_type, client_id, new_value,
      reasoning, source)
     VALUES (?, ?, ?, ?, ?)`,
    [
      'pink_flags_detected',
      clientId,
      JSON.stringify(flags),
      'Auto-detected from session analysis',
      'deterministic'
    ]
  );

  return merged;
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
  has_vision: boolean,
  max_blocks: number
): number {
  let score = 0;
  if (has_disc) score += 25;
  if (has_you2) score += 25;
  if (fathom_count >= 1) score += 10;
  if (fathom_count >= 2) score += 10;
  if (fathom_count >= 3) score += 5;
  if (has_vision) score += 25;
  if (max_blocks >= 9) score += 15;
  else if (max_blocks >= 6) score += 10;
  else if (max_blocks >= 3) score += 5;
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
  pink_flags: string[],
  coachRecommendation: string | null
): Recommendation {
  let recommendation: Recommendation | null = null;
  const normalizedCoachRecommendation = (coachRecommendation ?? '')
    .toUpperCase()
    .trim();
  if (normalizedCoachRecommendation === 'VALIDATE' ||
      normalizedCoachRecommendation === 'GATHER' ||
      normalizedCoachRecommendation === 'PAUSE') {
    recommendation = normalizedCoachRecommendation as Recommendation;
  }

  if (!recommendation) {
    if (has_disc && has_you2 && fathom_count >= 1) {
      recommendation = 'VALIDATE';
    } else {
      recommendation = 'GATHER';
    }
  }

  // Overrides
  if (outcome_bucket === 'paused') {
    recommendation = 'PAUSE';
  } else if (!has_disc && !has_you2 && fathom_count === 0) {
    recommendation = 'GATHER';
  }

  console.log(
    '[stageReadiness] recommendation',
    client_name,
    outcome_bucket,
    JSON.stringify(pink_flags),
    normalizedCoachRecommendation || null,
    recommendation
  );
  return recommendation;
}

async function getLatestCoachRecommendation(
  clientId: string
): Promise<string | null> {
  const rows = await dbSelect<{
    block_coach_assessment: string | null;
  }>(
    `SELECT block_coach_assessment
     FROM coaching_sessions
     WHERE client_id = ?
     ORDER BY session_date DESC, id DESC
     LIMIT 1`,
    [clientId]
  );

  const latestSession = rows[0];
  let coachRecommendation: string | null = null;

  if (latestSession?.block_coach_assessment) {
    try {
      const assessment = JSON.parse(
        latestSession.block_coach_assessment
      ) as { recommendation?: string };
      coachRecommendation =
        assessment?.recommendation ?? null;
    } catch {
      coachRecommendation = null;
    }
  }

  return coachRecommendation;
}

async function getMaxBlocksComplete(
  clientId: string
): Promise<number> {
  const rows = await dbSelect<{
    max_blocks: number | null;
  }>(
    `SELECT MAX(blocks_complete) as max_blocks
     FROM coaching_sessions
     WHERE client_id = ?`,
    [clientId]
  );
  return Number(rows[0]?.max_blocks ?? 0);
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

async function rowToStageReadiness(row: StageReadinessRow): Promise<StageReadiness> {
  const hasDisc = row.has_disc === 1;
  const hasYou2 = row.has_you2 === 1;
  const hasVision = row.has_vision === 1;
  const fathomCount = Number(row.fathom_count ?? 0);
  const maxBlocks = await getMaxBlocksComplete(row.id);
  const coachRecommendation = await getLatestCoachRecommendation(row.id);
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
    hasVision,
    maxBlocks
  );
  const rec = calculateRecommendation(
    row.name,
    row.outcome_bucket,
    hasDisc,
    hasYou2,
    fathomCount,
    pinkFlags,
    coachRecommendation
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
       MAX(dp.natural_d) as natural_d,
       MAX(dp.natural_i) as natural_i,
       MAX(dp.natural_s) as natural_s,
       MAX(dp.natural_c) as natural_c,
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
  return await rowToStageReadiness(row);
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
         MAX(dp.natural_d) as natural_d,
         MAX(dp.natural_i) as natural_i,
         MAX(dp.natural_s) as natural_s,
         MAX(dp.natural_c) as natural_c,
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
    for (const client of rows) {
      const style = deriveDominantStyle(
        Number(client.natural_d ?? 0),
        Number(client.natural_i ?? 0),
        Number(client.natural_s ?? 0),
        Number(client.natural_c ?? 0)
      );
      const mergedFlags = await detectAndSavePinkFlags(
        client.id,
        0,
        style
      );
      client.pink_flags = JSON.stringify(mergedFlags);
    }
    const result: StageReadiness[] = [];
    for (const row of rows) {
      result.push(await rowToStageReadiness(row));
    }
    return result;
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
    const current = await dbSelect<{
      inferred_stage: string;
      name: string;
    }>(
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

export async function moveClientToPause(
  clientId: string,
  pauseReason: string,
  followUpDate: string
): Promise<boolean> {
  try {
    await dbExecute(
      `UPDATE clients
       SET outcome_bucket = 'paused',
           pause_reason = ?,
           follow_up_date = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [pauseReason, followUpDate, clientId]
    );

    await dbExecute(
      `INSERT INTO audit_log
       (client_id, action_type, reasoning, model_used)
       VALUES (?, 'client_paused', ?, 'deterministic')`,
      [
        clientId,
        `Client paused. Reason: ${pauseReason}. Follow up: ${followUpDate}`
      ]
    );

    return true;
  } catch (error) {
    console.error('Pause move failed:', error);
    return false;
  }
}
