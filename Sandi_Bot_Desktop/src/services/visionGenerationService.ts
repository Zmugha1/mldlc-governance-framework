import { invoke } from '@tauri-apps/api/core';
import { getDb } from './db';

export interface ClientVisionContext {
  client_id: string;
  client_name: string;
  disc_style: string;
  disc_dominant_trait: string;
  one_year_vision: string;
  dangers: string;
  opportunities: string;
  strengths: string;
  skills: string;
  launch_timeline: string;
  financial_net_worth_range: string;
  spouse_name: string;
  spouse_on_calls: string;
  areas_of_interest: string;
  recent_fathom_notes: string;
  territory_check_notes: string;
}

const DISC_STYLE_LABELS: Record<'D' | 'I' | 'S' | 'C', string> = {
  D: 'Driver',
  I: 'Influencer',
  S: 'Supporter',
  C: 'Analyst',
};

const VISION_MODEL = 'qwen2.5:7b-instruct-q4_k_m';

const VISION_SYSTEM =
  'You are a franchise coaching vision statement writer. Return only the vision statement paragraphs. No labels. No headers. No markdown.';

/** Fallback when read_prompt_file does not return the real template (unknown name uses generic Rust fallback). */
const VISION_GENERATION_FALLBACK = `You are generating a franchise coaching vision
statement for a client of franchise coach
Sandi Stahl.

The vision statement must:
- Be written in flowing prose — no bullet points
- Be 3 to 4 paragraphs
- Cover three themes in order:
  1. Professional: career direction, business
     ownership goals, income targets, timeline
  2. Personal: family, relationships, lifestyle,
     community, what energizes them
  3. Desires: financial goals, legacy, freedom,
     what they are ultimately building toward
- Sound personal and specific to this client
- Reflect entrepreneurial business ownership
  mindset — not just employment goals
- Be written in third person:
  "[Name] is..." or "[Name] will..."
- If too long, the final version should be
  reducible by 20% without losing meaning

Return ONLY the vision statement paragraphs.
No labels. No headers. No markdown.
No explanation. Just the paragraphs.

Client profile:
Name: {client_name}
DISC Style: {disc_style}
Dominant trait: {disc_dominant_trait}

You 2.0 Vision: {one_year_vision}
Dangers to overcome: {dangers}
Opportunities to pursue: {opportunities}
Strengths to leverage: {strengths}
Skills: {skills}
Launch timeline: {launch_timeline}
Financial goal: {financial_net_worth_range}
Spouse/partner: {spouse_name}
Spouse on calls: {spouse_on_calls}
Industries of interest: {areas_of_interest}

Recent coaching notes: {recent_fathom_notes}

Territory check results: {territory_check_notes}

---

FEW-SHOT EXAMPLES:

Example 1 — High I profile (Vito Sciscioli):
"In the coming years, Vito will be doing what
he loves most — helping people thrive both
professionally and personally. He will use his
passion for engaging with others to mentor,
train, and develop individuals into confident,
successful professionals. Whether owning a
thriving business or working with a top-tier
organization, he will use his experience and
the art of needs-based solutions to guide
others to their next level of achievement.

His success will not only be measured by
professional accomplishments, but also by
the financial freedom to fully support his
family — covering monthly expenses, saving
for retirement, and paying off mortgages.
This freedom will also allow him to be
present for his family and travel to warm,
exotic destinations twice a year.

Living in alignment with these goals will
allow Vito to lead a fulfilling, impactful
life — grounded in purpose, balance, and joy."

Example 2 — High S profile (Andrew Tait):
"Within one year, Andrew is working on
something meaningful and impactful in real
estate development or another venture that
creates tangible community value. He is no
longer feeling stale or fatigued but instead
energized by projects that allow him to grow
in place. He is leveraging his strong
transferable skills in strategic thinking,
project management, and sound decision-making.

Andrew feels significantly less financial
stress and more confident in his long-term
trajectory. He is actively building wealth
and equity rather than relying solely on
short-lived job cycles. He is re-energized
and passionate about his work, investing in
his own growth.

Andrew's career supports rather than competes
with his family life. He is present on
weekends, spending intentional quality time
with his wife and child. One year from now,
Andrew feels balanced, purposeful, financially
steady, and fully present for the people who
matter most."

Example 3 — High D profile (financial focus):
"One year from now, Jeff is engaged in a
values-driven venture that energizes him and
aligns with his integrity. He has moved away
from quota-driven pressure into a collaborative
business where ethics, knowledge, and service
matter more than short-term gains.

Jeff is leveraging his strengths — relationship
building, thoughtful decision-making, and
steady leadership — to help others achieve
meaningful results. His work allows him to
contribute in a supportive yet influential role
built on trust and long-term relationships.

Financially, Jeff has created a sustainable
income within the first year through a model
that protects retirement assets and avoids
unreasonable debt. He feels re-energized,
confident, and proud — building something
valuable he can grow over the next decade
and eventually pass along as a lasting legacy."`;

function str(v: string | null | undefined): string {
  return (v ?? '').trim();
}

function localCalendarDateYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function deriveDiscFromNaturalScores(row: {
  natural_d: number | null;
  natural_i: number | null;
  natural_s: number | null;
  natural_c: number | null;
  primary_style_label: string | null;
} | undefined): { disc_style: string; disc_dominant_trait: string } {
  if (!row) {
    return { disc_style: '', disc_dominant_trait: '' };
  }
  const d = Number(row.natural_d ?? 0);
  const i = Number(row.natural_i ?? 0);
  const s = Number(row.natural_s ?? 0);
  const c = Number(row.natural_c ?? 0);
  const scores: Array<{ key: 'D' | 'I' | 'S' | 'C'; v: number }> = [
    { key: 'D', v: d },
    { key: 'I', v: i },
    { key: 'S', v: s },
    { key: 'C', v: c },
  ];
  let best = scores[0];
  for (const item of scores) {
    if (item.v > best.v) best = item;
  }
  const label = DISC_STYLE_LABELS[best.key];
  const disc_style = best.v > 0 ? label : '';
  const traitFromLabel = str(row.primary_style_label);
  const disc_dominant_trait =
    traitFromLabel || (best.v > 0 ? `${best.key} — ${label}` : '');
  return { disc_style, disc_dominant_trait };
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(val);
  }
  return out;
}

async function loadVisionPromptTemplate(): Promise<string> {
  try {
    const text = await invoke<string>('read_prompt_file', { name: 'vision_generation' });
    if (text.includes('{client_name}')) return text;
  } catch {
    /* use fallback */
  }
  return VISION_GENERATION_FALLBACK;
}

async function insertAuditVision(
  actionType: 'vision_generated' | 'vision_approved',
  clientId: string,
  detailsSnippet: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO audit_log
     (client_id, action_type, input_data, output_data, reasoning, model_used)
     VALUES (?, ?, NULL, ?, NULL, ?)`,
    [clientId, actionType, detailsSnippet, 'deterministic']
  );
}

export async function getClientVisionContext(clientId: string): Promise<ClientVisionContext> {
  const db = await getDb();

  const clientRows = (await db.select(
    'SELECT name FROM clients WHERE id = ?',
    [clientId]
  )) as { name: string }[];
  if (clientRows.length === 0) {
    throw new Error('Client not found');
  }
  const client_name = str(clientRows[0].name);

  const discRows = (await db.select(
    `SELECT natural_d, natural_i, natural_s, natural_c, primary_style_label
     FROM client_disc_profiles WHERE client_id = ?`,
    [clientId]
  )) as {
    natural_d: number | null;
    natural_i: number | null;
    natural_s: number | null;
    natural_c: number | null;
    primary_style_label: string | null;
  }[];
  const { disc_style, disc_dominant_trait } = deriveDiscFromNaturalScores(discRows[0]);

  const you2Rows = (await db.select(
    `SELECT one_year_vision, dangers, opportunities, strengths, skills,
            launch_timeline, financial_net_worth_range, spouse_name,
            spouse_on_calls, areas_of_interest
     FROM client_you2_profiles WHERE client_id = ?`,
    [clientId]
  )) as {
    one_year_vision: string | null;
    dangers: string | null;
    opportunities: string | null;
    strengths: string | null;
    skills: string | null;
    launch_timeline: string | null;
    financial_net_worth_range: string | null;
    spouse_name: string | null;
    spouse_on_calls: string | null;
    areas_of_interest: string | null;
  }[];
  const y2 = you2Rows[0];

  const noteRows = (await db.select(
    `SELECT notes FROM coaching_sessions
     WHERE client_id = ?
       AND notes IS NOT NULL
       AND TRIM(notes) != ''
     ORDER BY COALESCE(session_date, updated_at) DESC, id DESC
     LIMIT 3`,
    [clientId]
  )) as { notes: string }[];
  const recent_fathom_notes = noteRows.map((r) => str(r.notes)).filter(Boolean).join('\n\n---\n\n');

  let territory_check_notes = '';
  try {
    territory_check_notes = str(localStorage.getItem(`territory_check_${clientId}`));
  } catch {
    territory_check_notes = '';
  }

  return {
    client_id: clientId,
    client_name,
    disc_style,
    disc_dominant_trait,
    one_year_vision: str(y2?.one_year_vision),
    dangers: str(y2?.dangers),
    opportunities: str(y2?.opportunities),
    strengths: str(y2?.strengths),
    skills: str(y2?.skills),
    launch_timeline: str(y2?.launch_timeline),
    financial_net_worth_range: str(y2?.financial_net_worth_range),
    spouse_name: str(y2?.spouse_name),
    spouse_on_calls: str(y2?.spouse_on_calls),
    areas_of_interest: str(y2?.areas_of_interest),
    recent_fathom_notes,
    territory_check_notes,
  };
}

export async function generateVisionStatement(clientId: string): Promise<string> {
  const ctx = await getClientVisionContext(clientId);
  const template = await loadVisionPromptTemplate();
  const filled = applyTemplate(template, {
    client_name: ctx.client_name,
    disc_style: ctx.disc_style,
    disc_dominant_trait: ctx.disc_dominant_trait,
    one_year_vision: ctx.one_year_vision,
    dangers: ctx.dangers,
    opportunities: ctx.opportunities,
    strengths: ctx.strengths,
    skills: ctx.skills,
    launch_timeline: ctx.launch_timeline,
    financial_net_worth_range: ctx.financial_net_worth_range,
    spouse_name: ctx.spouse_name,
    spouse_on_calls: ctx.spouse_on_calls,
    areas_of_interest: ctx.areas_of_interest,
    recent_fathom_notes: ctx.recent_fathom_notes,
    territory_check_notes: ctx.territory_check_notes,
  });
  return invoke<string>('ollama_generate', {
    prompt: filled,
    system: VISION_SYSTEM,
    model: VISION_MODEL,
  });
}

export async function saveVisionStatement(clientId: string, visionText: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clients SET
       vision_statement = ?,
       vision_approved = 0,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [visionText, clientId]
  );
  await insertAuditVision('vision_generated', clientId, visionText.slice(0, 100));
}

export async function approveVisionStatement(clientId: string, visionText: string): Promise<void> {
  const db = await getDb();
  const today = localCalendarDateYyyyMmDd();
  await db.execute(
    `UPDATE clients SET
       vision_statement = ?,
       vision_approved = 1,
       vision_approved_date = ?,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [visionText, today, clientId]
  );
  await insertAuditVision('vision_approved', clientId, visionText.slice(0, 100));
}
