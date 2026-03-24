import { dbExecute, dbSelect } from './db';

export interface You2ReviewData {
  client_id: string;
  client_name: string;
  one_year_vision: string;
  spouse_name: string;
  spouse_role: string;
  spouse_mindset: string;
  credit_score: number;
  financial_net_worth_range: string;
  launch_timeline: string;
  dangers: string;
  strengths: string;
  opportunities: string;
  you2_confirmed: boolean;
  confirmed_by?: string;
}

export interface DiscReviewData {
  client_id: string;
  client_name: string;
  natural_d: number;
  natural_i: number;
  natural_s: number;
  natural_c: number;
  adapted_d: number;
  adapted_i: number;
  adapted_s: number;
  adapted_c: number;
  primary_style_label: string;
  primary_style_combination: string;
  communication_dos: string;
  communication_donts: string;
  disc_confirmed: boolean;
  manually_entered: boolean;
  confirmed_by?: string;
}

export async function getAllClientsForReview(): Promise<{
  clients: Array<{
    id: string;
    name: string;
    outcome_bucket: string;
    you2_status: 'complete' | 'pending' | 'confirmed';
    disc_status: 'complete' | 'pending' | 'confirmed' | 'manual';
  }>;
}> {
  const clients = await dbSelect<{
    id: string;
    name: string;
    outcome_bucket: string;
  }>(
    `SELECT id, name, outcome_bucket FROM clients
     ORDER BY outcome_bucket, name`
  );

  const result: Array<{
    id: string;
    name: string;
    outcome_bucket: string;
    you2_status: 'complete' | 'pending' | 'confirmed';
    disc_status: 'complete' | 'pending' | 'confirmed' | 'manual';
  }> = [];

  for (const client of clients) {
    const you2 = await dbSelect<{
      you2_confirmed: number;
      one_year_vision: string;
    }>(
      `SELECT you2_confirmed, one_year_vision
       FROM client_you2_profiles
       WHERE client_id = $1`,
      [client.id]
    );

    const disc = await dbSelect<{
      disc_confirmed: number;
      manually_entered: number;
      natural_d: number | null;
    }>(
      `SELECT disc_confirmed, manually_entered, natural_d
       FROM client_disc_profiles
       WHERE client_id = $1`,
      [client.id]
    );

    const you2Status =
      you2.length === 0
        ? 'pending'
        : you2[0].you2_confirmed
          ? 'confirmed'
          : 'complete';

    const discStatus =
      disc.length === 0
        ? 'pending'
        : disc[0].disc_confirmed
          ? 'confirmed'
          : disc[0].manually_entered
            ? 'manual'
            : 'complete';

    result.push({
      ...client,
      you2_status: you2Status,
      disc_status: discStatus,
    });
  }

  return { clients: result };
}

type You2ReviewRow = Omit<You2ReviewData, 'you2_confirmed'> & {
  you2_confirmed: number;
};

export async function getClientYou2ForReview(
  clientId: string
): Promise<You2ReviewData | null> {
  const rows = await dbSelect<You2ReviewRow>(
    `SELECT c.id as client_id, c.name as client_name,
     y.one_year_vision, y.spouse_name, y.spouse_role,
     y.spouse_mindset, y.credit_score,
     y.financial_net_worth_range, y.launch_timeline,
     y.dangers, y.strengths, y.opportunities,
     y.you2_confirmed, y.confirmed_by
     FROM clients c
     JOIN client_you2_profiles y ON c.id = y.client_id
     WHERE c.id = $1`,
    [clientId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    you2_confirmed: Boolean(row.you2_confirmed),
  };
}

type DiscReviewRow = Omit<DiscReviewData, 'disc_confirmed' | 'manually_entered'> & {
  disc_confirmed: number;
  manually_entered: number;
};

export async function getClientDiscForReview(
  clientId: string
): Promise<DiscReviewData | null> {
  const rows = await dbSelect<DiscReviewRow>(
    `SELECT c.id as client_id, c.name as client_name,
     d.natural_d, d.natural_i, d.natural_s, d.natural_c,
     d.adapted_d, d.adapted_i, d.adapted_s, d.adapted_c,
     d.primary_style_label, d.primary_style_combination,
     d.communication_dos, d.communication_donts,
     d.disc_confirmed, d.manually_entered, d.confirmed_by
     FROM clients c
     JOIN client_disc_profiles d ON c.id = d.client_id
     WHERE c.id = $1`,
    [clientId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    disc_confirmed: Boolean(row.disc_confirmed),
    manually_entered: Boolean(row.manually_entered),
  };
}

export async function confirmYou2Data(
  clientId: string,
  updatedData: Partial<You2ReviewData>,
  confirmedBy: string
): Promise<void> {
  await dbExecute(
    `UPDATE client_you2_profiles SET
     one_year_vision = $1,
     spouse_name = $2,
     spouse_role = $3,
     spouse_mindset = $4,
     credit_score = $5,
     financial_net_worth_range = $6,
     launch_timeline = $7,
     dangers = $8,
     strengths = $9,
     opportunities = $10,
     you2_confirmed = 1,
     confirmed_by = $11,
     confirmed_at = CURRENT_TIMESTAMP,
     updated_at = CURRENT_TIMESTAMP
     WHERE client_id = $12`,
    [
      updatedData.one_year_vision ?? '',
      updatedData.spouse_name ?? '',
      updatedData.spouse_role ?? 'unsure',
      updatedData.spouse_mindset ?? '',
      updatedData.credit_score ?? 0,
      updatedData.financial_net_worth_range ?? '',
      updatedData.launch_timeline ?? '',
      updatedData.dangers ?? '[]',
      updatedData.strengths ?? '[]',
      updatedData.opportunities ?? '[]',
      confirmedBy,
      clientId,
    ]
  );

  await dbExecute(
    `INSERT INTO audit_log
     (client_id, action_type, reasoning)
     VALUES ($1, 'you2_confirmed', $2)`,
    [clientId, `You2 data confirmed by ${confirmedBy}`]
  );
}

export async function saveDiscData(
  clientId: string,
  discData: Partial<DiscReviewData>,
  confirmedBy: string,
  isManual: boolean
): Promise<void> {
  const existing = await dbSelect<{ id: number }>(
    `SELECT id FROM client_disc_profiles
     WHERE client_id = $1`,
    [clientId]
  );

  if (existing.length > 0) {
    await dbExecute(
      `UPDATE client_disc_profiles SET
       natural_d = $1, natural_i = $2,
       natural_s = $3, natural_c = $4,
       adapted_d = $5, adapted_i = $6,
       adapted_s = $7, adapted_c = $8,
       primary_style_label = $9,
       primary_style_combination = $10,
       disc_confirmed = 1,
       manually_entered = $11,
       confirmed_by = $12,
       confirmed_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
       WHERE client_id = $13`,
      [
        discData.natural_d ?? 0,
        discData.natural_i ?? 0,
        discData.natural_s ?? 0,
        discData.natural_c ?? 0,
        discData.adapted_d ?? 0,
        discData.adapted_i ?? 0,
        discData.adapted_s ?? 0,
        discData.adapted_c ?? 0,
        discData.primary_style_label ?? '',
        discData.primary_style_combination ?? '',
        isManual ? 1 : 0,
        confirmedBy,
        clientId,
      ]
    );
  } else {
    await dbExecute(
      `INSERT INTO client_disc_profiles
       (client_id, natural_d, natural_i, natural_s, natural_c,
        adapted_d, adapted_i, adapted_s, adapted_c,
        primary_style_label, primary_style_combination,
        disc_confirmed, manually_entered,
        confirmed_by, confirmed_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,$12,$13,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        clientId,
        discData.natural_d ?? 0,
        discData.natural_i ?? 0,
        discData.natural_s ?? 0,
        discData.natural_c ?? 0,
        discData.adapted_d ?? 0,
        discData.adapted_i ?? 0,
        discData.adapted_s ?? 0,
        discData.adapted_c ?? 0,
        discData.primary_style_label ?? '',
        discData.primary_style_combination ?? '',
        isManual ? 1 : 0,
        confirmedBy,
      ]
    );
  }

  await dbExecute(
    `INSERT INTO audit_log
     (client_id, action_type, reasoning)
     VALUES ($1, 'disc_confirmed', $2)`,
    [
      clientId,
      `DISC data ${isManual ? 'manually entered' : 'confirmed'} by ${confirmedBy}`,
    ]
  );
}
