import { getDb } from './db';
import { v4 as uuidv4 } from 'uuid';

export interface Correction {
  id: string;
  coach_id: string;
  client_id: string | null;
  field_name: string;
  original_value: string | null;
  corrected_value: string;
  correction_type: string;
  page: string | null;
  session_id: string | null;
  created_at: string;
}

export interface CorrectionStats {
  total: number;
  vision_edits: number;
  question_thumbs_up: number;
  question_thumbs_down: number;
  question_edits: number;
  field_corrections: number;
  approval_rate: number;
  weekly_trend: WeeklyTrend[];
}

export interface WeeklyTrend {
  week: string;
  approval_rate: number;
  total_corrections: number;
}

export interface HealthScore {
  page: string;
  data_completeness: number;
  rating_score: number;
  combined_score: number;
  sample_size: number;
  trend: 'up' | 'down' | 'stable';
  last_updated: string;
}

export async function logCorrection(params: {
  clientId?: string;
  fieldName: string;
  originalValue?: string;
  correctedValue: string;
  correctionType: string;
  page?: string;
  sessionId?: string;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO extraction_corrections
      (id, coach_id, client_id,
       field_name, original_value,
       corrected_value, correction_type,
       page, session_id, created_at)
     VALUES ($1, $2, $3, $4, $5,
       $6, $7, $8, $9, datetime('now'))`,
    [
      uuidv4(),
      'coach',
      params.clientId || null,
      params.fieldName,
      params.originalValue || null,
      params.correctedValue,
      params.correctionType,
      params.page || null,
      params.sessionId || null,
    ]
  );
}

export async function getCorrectionStats(): Promise<CorrectionStats> {
  const db = await getDb();

  const totalRows = await db.select<{ cnt: number }[]>(
    `SELECT COUNT(*) as cnt
     FROM extraction_corrections`
  );

  const byType = await db.select<{ correction_type: string; cnt: number }[]>(
    `SELECT correction_type,
       COUNT(*) as cnt
     FROM extraction_corrections
     GROUP BY correction_type`
  );

  const thumbsUp =
    byType.find((r) => r.correction_type === 'question_thumbs_up')?.cnt || 0;
  const thumbsDown =
    byType.find((r) => r.correction_type === 'question_thumbs_down')?.cnt || 0;

  const totalRatings = thumbsUp + thumbsDown;
  const approvalRate =
    totalRatings > 0
      ? Math.round((thumbsUp / totalRatings) * 100)
      : 0;

  const weeklyTrendRows = await db.select<
    {
      week: string;
      ups: number;
      downs: number;
      total: number;
    }[]
  >(
    `SELECT
       strftime('%Y-W%W', created_at) as week,
       COUNT(CASE WHEN correction_type =
         'question_thumbs_up' THEN 1 END)
         as ups,
       COUNT(CASE WHEN correction_type =
         'question_thumbs_down' THEN 1 END)
         as downs,
       COUNT(*) as total
     FROM extraction_corrections
     GROUP BY week
     ORDER BY week DESC
     LIMIT 8`
  );

  const totalCount = Number(totalRows[0]?.cnt ?? 0);

  return {
    total: totalCount,
    vision_edits:
      byType.find((r) => r.correction_type === 'vision_edit')?.cnt || 0,
    question_thumbs_up: thumbsUp,
    question_thumbs_down: thumbsDown,
    question_edits:
      byType.find((r) => r.correction_type === 'question_edit')?.cnt || 0,
    field_corrections:
      byType.find((r) => r.correction_type === 'field_correction')?.cnt || 0,
    approval_rate: approvalRate,
    weekly_trend: weeklyTrendRows.map((w) => ({
      week: w.week,
      approval_rate:
        w.ups + w.downs > 0
          ? Math.round((w.ups / (w.ups + w.downs)) * 100)
          : 0,
      total_corrections: w.total,
    })),
  };
}

export async function logHealthScore(
  page: string,
  dataCompleteness: number,
  ratingScore: number
): Promise<void> {
  const combined = Math.round(dataCompleteness * 0.5 + ratingScore * 0.5);

  const db = await getDb();
  await db.execute(
    `INSERT INTO system_health_log
      (id, page, metric_name,
       metric_value, data_completeness_score,
       rating_score, combined_score,
       logged_at)
     VALUES ($1, $2, $3, $4, $5,
       $6, $7, datetime('now'))`,
    [
      uuidv4(),
      page,
      'health_score',
      combined,
      dataCompleteness,
      ratingScore,
      combined,
    ]
  );
}

export async function getHealthScore(page: string): Promise<HealthScore> {
  const db = await getDb();

  const latest = await db.select<
    {
      combined_score: number;
      data_completeness_score: number | null;
      rating_score: number | null;
      logged_at: string;
    }[]
  >(
    `SELECT combined_score,
       data_completeness_score,
       rating_score,
       logged_at
     FROM system_health_log
     WHERE page = $1
     ORDER BY logged_at DESC
     LIMIT 2`,
    [page]
  );

  const rows = latest;
  const current = rows[0]?.combined_score ?? 0;
  const previous = rows[1]?.combined_score ?? 0;

  const trend =
    current > previous ? 'up' : current < previous ? 'down' : 'stable';

  return {
    page,
    data_completeness: rows[0]?.data_completeness_score ?? 0,
    rating_score: rows[0]?.rating_score ?? 0,
    combined_score: current,
    sample_size: rows.length,
    trend,
    last_updated: rows[0]?.logged_at ?? '',
  };
}

export async function exportQLoRAReport(): Promise<string> {
  const db = await getDb();

  const corrections = await db.select<
    {
      correction_type: string;
      field_name: string;
      original_value: string | null;
      corrected_value: string;
      page: string | null;
      created_at: string;
      client_name: string | null;
      stage: string | null;
    }[]
  >(
    `SELECT
       ec.correction_type,
       ec.field_name,
       ec.original_value,
       ec.corrected_value,
       ec.page,
       ec.created_at,
       c.name as client_name,
       c.inferred_stage as stage
     FROM extraction_corrections ec
     LEFT JOIN clients c
       ON ec.client_id = c.id
     ORDER BY ec.created_at ASC`
  );

  const rows = corrections;

  let csv =
    'date,correction_type,field_name,' +
    'client_name,stage,original_value,' +
    'corrected_value,page\n';

  const escape = (val: unknown) => {
    const str = String(val ?? '');
    return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
  };

  for (const row of rows) {
    csv +=
      [
        escape(row.created_at),
        escape(row.correction_type),
        escape(row.field_name),
        escape(row.client_name),
        escape(row.stage),
        escape(row.original_value),
        escape(row.corrected_value),
        escape(row.page),
      ].join(',') + '\n';
  }

  return csv;
}

export async function getTrainingReadiness(): Promise<{
  total: number;
  target: number;
  percentage: number;
  weeks_remaining: number;
  weekly_rate: number;
}> {
  const stats = await getCorrectionStats();
  const target = 300;
  const remaining = Math.max(0, target - stats.total);
  const weeklyRate = stats.weekly_trend[0]?.total_corrections || 1;
  const weeksRemaining = Math.ceil(remaining / Math.max(weeklyRate, 1));

  return {
    total: stats.total,
    target,
    percentage: Math.min(100, Math.round((stats.total / target) * 100)),
    weeks_remaining: weeksRemaining,
    weekly_rate: weeklyRate,
  };
}
