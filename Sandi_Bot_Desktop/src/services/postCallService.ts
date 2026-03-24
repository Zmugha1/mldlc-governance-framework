// Post-Call Analysis Service
// CLEAR scoring logic extracted from PostCallAnalysis.tsx

const CLEAR_KEYS = ['curiosity', 'locating', 'engagement', 'accountability', 'reflection'] as const;
const DIMENSION_LABELS: Record<string, string> = {
  curiosity: 'Curiosity',
  locating: 'Locating',
  engagement: 'Engagement',
  accountability: 'Accountability',
  reflection: 'Reflection',
};

const COACHING_TIPS: Record<string, string> = {
  curiosity: 'Try asking more open-ended questions like "What would make our time together today valuable?"',
  locating: 'Spend more time understanding exactly where they are in their decision process.',
  engagement: 'Use 1-3 exact words they spoke in your follow-up questions.',
  accountability: 'Be more specific about next steps and get clear commitments with deadlines.',
  reflection: 'Ask "What insight or a-ha did you gain today?" at the end of the call.',
};

/** Score color rule: >=4 green, >=3 yellow, else red */
export function getScoreColor(score: number): string {
  if (score >= 4) return 'bg-green-500';
  if (score >= 3) return 'bg-yellow-500';
  return 'bg-red-500';
}

/** Overall CLEAR score: sum of 5 dimensions / 5 */
export function calculateOverallScore(scores: Record<string, number>): number {
  const values = CLEAR_KEYS.map((k) => scores[k] ?? 0);
  return values.reduce((a, b) => a + b, 0) / 5;
}

/** Per-call average: (curiosity + locating + engagement + accountability + reflection) / 5 */
export function calculateCallAverage(scores: Record<string, number>): number {
  return calculateOverallScore(scores);
}

/** Historical averages over CLEAR sessions, with current scores for comparison */
export function getHistoricalAverages(
  sessions: Array<Record<string, number>>,
  currentScores: Record<string, number>
): Array<{ dimension: string; current: number; average: number }> {
  const totals: Record<string, number> = {
    curiosity: 0,
    locating: 0,
    engagement: 0,
    accountability: 0,
    reflection: 0,
  };
  sessions.forEach((s) => {
    CLEAR_KEYS.forEach((k) => {
      totals[k] += s[k] ?? 0;
    });
  });
  const count = sessions.length;
  return CLEAR_KEYS.map((key) => ({
    dimension: DIMENSION_LABELS[key] ?? key,
    current: currentScores[key] ?? 0,
    average: count > 0 ? totals[key] / count : 0,
  }));
}

/** Lowest dimension + coaching tip */
type ClearKey = (typeof CLEAR_KEYS)[number];

export function getCoachingTip(scores: Record<string, number>): {
  dimension: string;
  tip: string;
} {
  let lowestKey: ClearKey = CLEAR_KEYS[0];
  let lowestScore = scores[lowestKey] ?? 5;
  CLEAR_KEYS.forEach((key) => {
    const v = scores[key] ?? 5;
    if (v < lowestScore) {
      lowestScore = v;
      lowestKey = key;
    }
  });
  return {
    dimension: DIMENSION_LABELS[lowestKey] ?? lowestKey,
    tip: COACHING_TIPS[lowestKey] ?? '',
  };
}

/** Strengths (top 2 by score) and opportunities (bottom 2 by score) */
export function getStrengthsAndOpportunities(scores: Record<string, number>): {
  strengths: Array<{ label: string; score: number }>;
  opportunities: Array<{ label: string; score: number }>;
} {
  const withScores = CLEAR_KEYS.map((key) => ({
    label: DIMENSION_LABELS[key] ?? key,
    score: scores[key] ?? 0,
  }));
  const byScoreDesc = [...withScores].sort((a, b) => b.score - a.score);
  const byScoreAsc = [...withScores].sort((a, b) => a.score - b.score);
  return {
    strengths: byScoreDesc.slice(0, 2),
    opportunities: byScoreAsc.slice(0, 2),
  };
}
