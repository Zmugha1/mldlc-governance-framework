// Synthesis Agent
// Trigger: All three source documents present for a client
// Feeds: Vision statement + franchise intro doc generation
// Status: FRED ONLY — PHASE 4 — not yet implemented

export interface SynthesisAgentInput {
  client_id: string;
  disc_data: object;
  you2_data: object;
  transcript_data: object;
  coach_voice_samples: string[];
}

export interface SynthesisAgentOutput {
  vision_statement: string;
  intro_document: string;
  confidence: number;
  sources_used: string[];
  audit_id: string;
}

export async function runSynthesisAgent(
  input: SynthesisAgentInput
): Promise<SynthesisAgentOutput> {
  // TODO Phase 4 — Fred only
  // Requires: configs/fred_webster.json
  //   agents.synthesis_agent === true
  throw new Error('Synthesis Agent not yet implemented');
}
