// Agent Orchestrator
// Reads client config and routes triggers to correct agents
// Status: PHASE 3 — not yet implemented

export type AgentName =
  | 'document_agent'
  | 'coaching_agent'
  | 'synthesis_agent'
  | 'outreach_agent'
  | 'pattern_agent';

export interface OrchestratorConfig {
  client_id: string;
  agents: Record<AgentName, boolean>;
  triggers: {
    coaching_prep: string;
    synthesis_fire: string;
    post_call: string;
  };
  external_integrations: {
    gmail: boolean;
    linkedin: boolean;
    calendar: boolean;
  };
}

export async function loadClientConfig(
  _client_id: string
): Promise<OrchestratorConfig> {
  // TODO Phase 3 — load from configs/[client_id].json
  throw new Error('Orchestrator not yet implemented');
}

export async function routeTrigger(
  _trigger: string,
  _client_id: string,
  _payload: object
): Promise<void> {
  // TODO Phase 3 — read config, load permitted agents,
  // route trigger to correct agent sequence
  throw new Error('Orchestrator not yet implemented');
}
