// Outreach Agent
// Trigger: Coach clicks send or re-engagement fires
// Feeds: Gmail integration and activity logging
// Status: FRED ONLY — PHASE 5 — not yet implemented

export interface OutreachAgentInput {
  client_id: string;
  email_type: string;
  context: string;
  coach_approval: boolean;
}

export interface OutreachAgentOutput {
  sent_at: string;
  subject: string;
  gmail_thread_id: string;
  pipeline_updated: boolean;
  audit_id: string;
}

export async function runOutreachAgent(
  _input: OutreachAgentInput
): Promise<OutreachAgentOutput> {
  // TODO Phase 5 — Fred only
  // Requires: configs/fred_webster.json
  //   external_integrations.gmail === true
  // RULE: Never sends without coach_approval === true
  throw new Error('Outreach Agent not yet implemented');
}
