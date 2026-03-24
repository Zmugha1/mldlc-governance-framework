// Coaching Agent
// Trigger: Coach opens Live Coaching Assistant for a client
// Feeds: Real-time coaching guidance
// Status: PHASE 3 — not yet implemented

export interface CoachingAgentInput {
  client_id: string;
  current_stage: string;
  session_context?: string;
}

export interface CoachingAgentOutput {
  clear_questions: string[];
  disc_scripts: string[];
  pink_flags: string[];
  confidence_scores: number[];
  audit_id: string;
}

export async function runCoachingAgent(
  _input: CoachingAgentInput
): Promise<CoachingAgentOutput> {
  // TODO Phase 3 — implement coaching agent
  throw new Error('Coaching Agent not yet implemented');
}
