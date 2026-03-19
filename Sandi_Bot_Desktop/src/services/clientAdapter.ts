import type { Client } from '../types';
import { discColors } from '@/data/sampleClients';

const STAGE_TO_DISPLAY: Record<string, string> = {
  IC: 'Initial Contact',
  C1: 'Seeker Connection',
  C2: 'Seeker Clarification',
  C3: 'Possibilities',
  C4: 'Client Career 2.0',
  C5: 'Business Purchase',
  'Initial Contact': 'Initial Contact',
  'Seeker Connection': 'Seeker Connection',
  'Seeker Clarification': 'Seeker Clarification',
  'Possibilities': 'Possibilities',
  'Coach Client Collaboration': 'Possibilities',
  'Client Career 2.0': 'Client Career 2.0',
  'Business Purchase': 'Business Purchase',
};

/** Map raw stage (IC, C1, Validation, etc.) to display stage for stageConfig lookup */
export function normalizeDisplayStage(stage: string | undefined): string {
  const s = (stage ?? '').trim();
  return STAGE_TO_DISPLAY[s] ?? 'Initial Contact';
}

export interface DiscEnrichment {
  style: 'D' | 'I' | 'S' | 'C';
  label: string;
}

export interface ClientDisplayOptions {
  disc?: DiscEnrichment;
  readinessScore?: number;
}

/** Convert flat Client to display format for UI components that expect avatar, disc.style, etc. */
export function clientToDisplay(client: Client, options?: ClientDisplayOptions | DiscEnrichment) {
  const discEnrichment = options && 'style' in options ? options : options?.disc;
  const readinessScoreOverride = options && 'readinessScore' in options ? (options as ClientDisplayOptions).readinessScore : undefined;

  const discStyle = (discEnrichment?.style ?? client.disc_style ?? 'I') as 'D' | 'I' | 'S' | 'C';
  const discLabel = discEnrichment?.label ?? `DISC style: ${client.disc_style || 'Pending'}`;
  const displayStage = normalizeDisplayStage(client.inferred_stage ?? client.stage);
  const base = {
    ...client,
    stage: displayStage,
    avatar: client.name.charAt(0).toUpperCase(),
    disc: {
      style: discStyle,
      description: discLabel,
      traits: client.disc_scores ? [client.disc_scores] : [],
      coachingTips: [],
      scores: undefined,
    },
    readiness: {
      identity: client.readiness_identity,
      commitment: client.readiness_commitment,
      financial: client.readiness_financial,
      execution: client.readiness_execution,
    },
    you2: {
      statement: client.you2_statement || '',
      dangers: client.you2_dangers ? client.you2_dangers.split('\n').filter(Boolean) : [],
      opportunities: client.you2_opportunities ? client.you2_opportunities.split('\n').filter(Boolean) : [],
      skills: { favorites: [], delegate: [], interested: [] },
      priorities: ['Income', 'Lifestyle', 'Wealth', 'Equity'] as const,
    },
    tumay: {
      industriesOfInterest: client.tumay_data ? [client.tumay_data] : ['—'],
      spouse: { name: '', occupation: '', supportive: false, involvement: '' },
      age: 0,
      location: '',
      workPreference: '',
      timeline: '',
      creditScore: 0,
      netWorth: '',
      liquidCapital: '',
      skills: [],
      notInterestedIn: [],
      whyNow: '',
    },
    visionStatement: {
      paragraph: client.vision_statement || '',
      journeyMindset: '',
      successDefinition: '',
      motivators: { income: '', financialFreedom: '', workLife: '' },
    },
    notes: client.notes ? client.notes.split('\n').filter(Boolean) : [],
    industry: client.company || '—',
    persona: 'Strategic' as const,
    fathomNotes: [],
    ilwe: {
      income: { current: '', target: '', timeline: '' },
      lifestyle: { desired: '', current: '', gap: '' },
      wealth: { strategy: '', target: '' },
      equity: { goal: '', timeline: '' },
    },
    lastContact: client.updated_at,
    nextAction: '',
    createdAt: client.created_at,
  };
  if (readinessScoreOverride !== undefined) {
    return { ...base, readinessScorePct: readinessScoreOverride };
  }
  return base;
}

export function getDiscColor(style: string): string {
  return discColors[style as keyof typeof discColors] ?? '#6B7280';
}
