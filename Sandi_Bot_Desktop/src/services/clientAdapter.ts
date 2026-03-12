import type { Client } from '../types';
import { discColors } from '@/data/sampleClients';

/** Convert flat Client to display format for UI components that expect avatar, disc.style, etc. */
export function clientToDisplay(client: Client) {
  const readinessAvg =
    (client.readiness_identity +
      client.readiness_commitment +
      client.readiness_financial +
      client.readiness_execution) /
    4;
  return {
    ...client,
    avatar: client.name.charAt(0).toUpperCase(),
    disc: {
      style: (client.disc_style || 'I') as 'D' | 'I' | 'S' | 'C',
      description: `DISC style: ${client.disc_style || 'Pending'}`,
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
}

export function getDiscColor(style: string): string {
  return discColors[style as keyof typeof discColors] ?? '#6B7280';
}
