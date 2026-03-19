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
  d: number,
  i: number,
  s: number,
  c: number
): string {
  const scores = { D: d, I: i, S: s, C: c };
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = sorted[0][0];
  const second = sorted[1][0];

  const labels: Record<string, string> = {
    D: 'Driver',
    I: 'Influencer',
    S: 'Supporter',
    C: 'Analyzer',
    DI: 'Driving Influencer',
    DS: 'Driving Supporter',
    ID: 'Influencing Driver',
    IS: 'Influencing Supporter',
    SD: 'Supporting Driver',
    SI: 'Supporting Influencer',
    SC: 'Supporting Analyzer',
    CS: 'Analyzing Supporter',
    CD: 'Analyzing Driver',
    CI: 'Analyzing Influencer',
  };

  return labels[`${top}${second}`] ?? labels[top] ?? `High ${top}`;
}

export async function getDiscStyleBreakdown(): Promise<DiscDistributionEntry[]> {
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
    const dominant = getDominantFromScores(
      r.natural_d ?? 0,
      r.natural_i ?? 0,
      r.natural_s ?? 0,
      r.natural_c ?? 0
    );
    if (dominant in counts) counts[dominant as keyof typeof counts]++;
  }

  return [
    { name: 'D', value: counts.D, color: discColors.D },
    { name: 'I', value: counts.I, color: discColors.I },
    { name: 'S', value: counts.S, color: discColors.S },
    { name: 'C', value: counts.C, color: discColors.C },
  ];
}

export interface DiscProfileEnrichment {
  style: 'D' | 'I' | 'S' | 'C';
  label: string;
}

export async function getDiscProfilesMap(): Promise<Map<string, DiscProfileEnrichment>> {
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
    const d = r.natural_d ?? 0;
    const i = r.natural_i ?? 0;
    const s = r.natural_s ?? 0;
    const c = r.natural_c ?? 0;
    const style = getDominantFromScores(d, i, s, c);
    const label =
      r.primary_style_label?.trim() ||
      deriveStyleLabel(d, i, s, c);
    map.set(r.client_id, { style, label });
  }
  return map;
}
