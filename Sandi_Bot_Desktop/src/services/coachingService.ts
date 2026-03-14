// Coaching Service
// DISC tips, homework, pink flags, readiness - extracted from LiveCoachingAssistant

import { knowledgeGraph } from '@/data/knowledgeGraph';

/** DISC coaching tips for a given style (D, I, S, C) */
export function getDiscCoachingTips(discStyle: string): string[] {
  const style = (discStyle?.toUpperCase().charAt(0) || 'I') as 'D' | 'I' | 'S' | 'C';
  const disc = knowledgeGraph.discCoaching[style];
  return disc?.coachingTips ?? [];
}

/** Stage-to-homework mapping (IC, C1, C2, C3, C4) */
const HOMEWORK_BY_STAGE: Record<string, string> = {
  'Initial Contact': '• **IC:** Send DISC and You 2.0 assessments',
  IC: '• **IC:** Send DISC and You 2.0 assessments',
  'Seeker Connection': '• **C1:** Review DISC results, discuss You 2.0 statement',
  'Seeker Connection (C1)': '• **C1:** Review DISC results, discuss You 2.0 statement',
  C1: '• **C1:** Review DISC results, discuss You 2.0 statement',
  'Seeker Clarification': '• **C2:** Complete TUMAY, discuss funding options',
  'Seeker Clarification (C2)': '• **C2:** Complete TUMAY, discuss funding options',
  C2: '• **C2:** Complete TUMAY, discuss funding options',
  Possibilities: '• **C3:** Prepare for Discovery Center, research possibilities',
  'Coach, Client, Collaboration (C3)': '• **C3:** Prepare for Discovery Center, research possibilities',
  C3: '• **C3:** Prepare for Discovery Center, research possibilities',
  'Client Career 2.0': '• **C4:** Contact franchise owners, complete validation',
  'Client Career 2.0 (C4)': '• **C4:** Contact franchise owners, complete validation',
  C4: '• **C4:** Contact franchise owners, complete validation',
};

const HOMEWORK_ALL: string[] = [
  '• **IC:** Send DISC and You 2.0 assessments',
  '• **C1:** Review DISC results, discuss You 2.0 statement',
  '• **C2:** Complete TUMAY, discuss funding options',
  '• **C3:** Prepare for Discovery Center, research possibilities',
  '• **C4:** Contact franchise owners, complete validation',
];

/** Homework suggestions by stage. Returns stage-specific or full list when no match. */
export function getHomeworkByStage(stage: string): string[] {
  const normalized = stage?.trim() || '';
  const item = HOMEWORK_BY_STAGE[normalized];
  if (item) return [item];
  return HOMEWORK_ALL;
}

/** Pink flags for a stage (from knowledgeGraph) */
export function getPinkFlagsByStage(stage: string): string[] {
  const s = stage?.trim() || '';
  const found = knowledgeGraph.clientExperience.stages.find((st) => {
    const n = st.name ?? '';
    return (
      n === s ||
      n.includes(s) ||
      s.includes(n) ||
      (s === 'IC' && n.includes('Initial Contact')) ||
      (s === 'C1' && n.includes('Seeker Connection')) ||
      (s === 'C2' && n.includes('Seeker Clarification')) ||
      ((s === 'C3' || s === 'Possibilities') && (n.includes('Collaboration') || n.includes('C3'))) ||
      (s === 'C4' && n.includes('Client Career'))
    );
  });
  return found?.pinkFlags ?? [];
}

/** Readiness percentage: (sum of 4 dimensions / 20) * 100. readiness has identity, commitment, financial, execution (each 1-5). */
export function calculateReadinessScore(readiness: Record<string, number>): number {
  const values = Object.values(readiness);
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / 20) * 100);
}
