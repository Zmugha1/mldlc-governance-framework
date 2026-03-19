import { dbSelect } from './db';
import { discColors } from '@/data/sampleClients';

export interface DiscDistributionEntry {
  name: string;
  value: number;
  color: string;
}

function getDominantFromScores(
  natural_d: number,
  natural_i: number,
  natural_s: number,
  natural_c: number
): 'D' | 'I' | 'S' | 'C' {
  const scores: Record<string, number> = {
    D: natural_d ?? 0,
    I: natural_i ?? 0,
    S: natural_s ?? 0,
    C: natural_c ?? 0,
  };
  const dominant = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0];
  return dominant as 'D' | 'I' | 'S' | 'C';
}

export function deriveStyleLabel(
  d: number | null | undefined,
  i: number | null | undefined,
  s: number | null | undefined,
  c: number | null | undefined
): string {
  const scores = {
    D: Number(d ?? 0),
    I: Number(i ?? 0),
    S: Number(s ?? 0),
    C: Number(c ?? 0)
  };
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);
  const top = sorted[0][0];
  const second = sorted[1][0];

  const labels: Record<string, string> = {
    DS: 'Driving Supporter',
    DI: 'Driving Influencer',
    DC: 'Driving Analyzer',
    ID: 'Influencing Driver',
    IS: 'Influencing Supporter',
    IC: 'Influencing Analyzer',
    SD: 'Supporting Driver',
    SI: 'Supporting Influencer',
    SC: 'Supporting Analyzer',
    CD: 'Analyzing Driver',
    CI: 'Analyzing Influencer',
    CS: 'Analyzing Supporter',
    D: 'Driver',
    I: 'Influencer',
    S: 'Supporter',
    C: 'Analyzer',
  };

  return labels[`${top}${second}`]
    ?? labels[top]
    ?? `High ${top}`;
}

export async function getDiscStyleBreakdown(): Promise<DiscDistributionEntry[]> {
  try {
    const rows = await dbSelect<Array<{
      client_id: string;
      natural_d: number;
      natural_i: number;
      natural_s: number;
      natural_c: number;
    }>>(
      `SELECT client_id, natural_d, natural_i, natural_s, natural_c
       FROM client_disc_profiles
       WHERE natural_d IS NOT NULL OR natural_i IS NOT NULL
          OR natural_s IS NOT NULL OR natural_c IS NOT NULL`
    );

    const counts = { D: 0, I: 0, S: 0, C: 0 };
    for (const r of rows) {
      const scores = {
        D: Number(r.natural_d ?? 0),
        I: Number(r.natural_i ?? 0),
        S: Number(r.natural_s ?? 0),
        C: Number(r.natural_c ?? 0)
      };
      const dominant = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])[0][0];
      if (dominant in counts) counts[dominant as keyof typeof counts]++;
    }

    return [
      { name: 'D', value: counts.D, color: discColors.D },
      { name: 'I', value: counts.I, color: discColors.I },
      { name: 'S', value: counts.S, color: discColors.S },
      { name: 'C', value: counts.C, color: discColors.C },
    ];
  } catch (err) {
    console.error('getDiscStyleBreakdown failed:', err);
    return [
      { name: 'D', value: 0, color: discColors.D },
      { name: 'I', value: 0, color: discColors.I },
      { name: 'S', value: 0, color: discColors.S },
      { name: 'C', value: 0, color: discColors.C },
    ];
  }
}

export interface DiscProfileEnrichment {
  style: 'D' | 'I' | 'S' | 'C';
  label: string;
}

export async function getDiscProfilesMap(): Promise<Map<string, DiscProfileEnrichment>> {
  try {
    const rows = await dbSelect<Array<{
      client_id: string;
      natural_d: number;
      natural_i: number;
      natural_s: number;
      natural_c: number;
      primary_style_label: string | null;
    }>>(
    `SELECT client_id, natural_d, natural_i, natural_s, natural_c,
            primary_style_label
     FROM client_disc_profiles`
    );

    const map = new Map<string, DiscProfileEnrichment>();
    for (const r of rows) {
    const d = Number(r.natural_d ?? 0);
    const i = Number(r.natural_i ?? 0);
    const s = Number(r.natural_s ?? 0);
    const c = Number(r.natural_c ?? 0);
    const style = getDominantFromScores(d, i, s, c);
    const label =
      r.primary_style_label?.trim() ??
      deriveStyleLabel(d, i, s, c);
      map.set(r.client_id, { style, label });
    }
    return map;
  } catch (err) {
    console.error('getDiscProfilesMap failed:', err);
    return new Map();
  }
}
