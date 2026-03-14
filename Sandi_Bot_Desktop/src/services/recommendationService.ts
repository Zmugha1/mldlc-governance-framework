import type { Client } from '../types';
import { logEntry } from './auditService';

export interface RecommendationResult {
  recommendation: 'PUSH' | 'NURTURE' | 'PAUSE';
  score: number;
  reasoning: string;
  breakdown: {
    readinessScore: number;
    readinessWeight: number;
    confidenceScore: number;
    confidenceWeight: number;
  };
}

export async function getRecommendation(
  client: Client
): Promise<RecommendationResult> {
  const readinessAvg =
    (client.readiness_identity +
      client.readiness_commitment +
      client.readiness_financial +
      client.readiness_execution) /
    4;

  const readinessNormalized = (readinessAvg / 5) * 100;
  const confidenceNormalized = client.confidence;

  const score = Math.round(
    readinessNormalized * 0.6 + confidenceNormalized * 0.4
  );

  let recommendation: 'PUSH' | 'NURTURE' | 'PAUSE';
  let reasoning: string;

  if (score >= 70) {
    recommendation = 'PUSH';
    reasoning = `Score ${score}/100. Readiness avg ${readinessAvg.toFixed(1)}/5 across 4 dimensions. Confidence ${client.confidence}%. Client shows strong readiness signals — increase contact frequency and move toward commitment conversation.`;
  } else if (score >= 40) {
    recommendation = 'NURTURE';
    reasoning = `Score ${score}/100. Readiness avg ${readinessAvg.toFixed(1)}/5 across 4 dimensions. Confidence ${client.confidence}%. Client needs continued development — focus on addressing lowest readiness dimension.`;
  } else {
    recommendation = 'PAUSE';
    reasoning = `Score ${score}/100. Readiness avg ${readinessAvg.toFixed(1)}/5 across 4 dimensions. Confidence ${client.confidence}%. Client not ready to progress — reduce contact frequency and revisit in 30 days.`;
  }

  await logEntry(
    'RECOMMENDATION',
    client.id,
    JSON.stringify({
      readiness: [
        client.readiness_identity,
        client.readiness_commitment,
        client.readiness_financial,
        client.readiness_execution,
      ],
      confidence: client.confidence,
    }),
    recommendation,
    reasoning,
    'deterministic'
  );

  return {
    recommendation,
    score,
    reasoning,
    breakdown: {
      readinessScore: readinessNormalized,
      readinessWeight: 0.6,
      confidenceScore: confidenceNormalized,
      confidenceWeight: 0.4,
    },
  };
}

/** Human-readable explanation for PUSH/NURTURE/PAUSE recommendation */
export function getRecommendationMessage(
  recommendation: 'PUSH' | 'NURTURE' | 'PAUSE'
): string {
  switch (recommendation) {
    case 'PUSH':
      return 'They show high readiness - advance aggressively toward next steps.';
    case 'NURTURE':
      return 'Build the relationship with valuable content and check-ins.';
    case 'PAUSE':
      return 'Give them space - they need more time to evaluate.';
    default:
      return '';
  }
}
