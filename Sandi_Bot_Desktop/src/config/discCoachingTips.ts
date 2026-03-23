// discCoachingTips.ts
// Source: Joanna Transcript + Sandi March 2026
// Use: ClientIntelligence.tsx DISC tab,
//      LiveCoachingAssistant.tsx,
//      CoachingPlan Phase 5E

export interface DISCCoachingProfile {
  style: string;
  label: string;
  description: string;
  traits: string[];
  coaching_approach: string;
  emotional_questions: string[];
  avoid: string;
  reengagement: string;
  pink_flag_patterns: string[];
  clear_emphasis: string;
}

export const DISC_COACHING_TIPS:
  Record<string, DISCCoachingProfile> = {

  D: {
    style: 'D',
    label: 'Dominance',
    description: 'Driver — Direct, decisive, ' +
      'results-oriented, competitive. ' +
      'Motivated by control, results, and winning.',
    traits: [
      'Results-oriented', 'Direct', 'Decisive',
      'Competitive', 'Takes charge', 'Goal-focused'
    ],
    coaching_approach:
      'Be direct and purposeful. ' +
      'Get to the point immediately. ' +
      'Focus on results and bottom-line impact. ' +
      'Give options and let them choose. ' +
      'Respect their authority and competence.',
    emotional_questions: [
      'What result are you trying to achieve?',
      'What is holding you back from deciding?',
      'What does winning look like for you?',
      'What would you regret NOT doing?',
      'If you had full control — what would you build?'
    ],
    avoid:
      'Long explanations, excessive process detail, ' +
      'wishy-washy language, small talk filler.',
    reengagement:
      'Send direct email, one specific question, ' +
      'no fluff. Example: ' +
      '"Ready to move forward — yes or no?"',
    pink_flag_patterns: [
      'too many rules',
      'too much oversight',
      'I want to do this my way',
      'how long does this take'
    ],
    clear_emphasis:
      'C dimension — High D wants to own the ' +
      'agenda. Always open with the gold question: ' +
      '"What would make this valuable for you?"'
  },

  I: {
    style: 'I',
    label: 'Influence',
    description: 'Influencer — Enthusiastic, ' +
      'people-oriented, persuasive, optimistic. ' +
      'Motivated by recognition, excitement, ' +
      'and social connection.',
    traits: [
      'Enthusiastic', 'Optimistic', 'Talkative',
      'Social', 'Persuasive', 'People-oriented'
    ],
    coaching_approach:
      'Be warm and friendly. Build rapport first. ' +
      'Lead with enthusiasm and possibility. ' +
      'Use stories and testimonials. ' +
      'Let them talk — they coach themselves.',
    emotional_questions: [
      'How would your friends react when you ' +
        'tell them?',
      'What excites you most about this ' +
        'possibility?',
      'What would your life feel like 3 years ' +
        'from now?',
      'What story do you want to tell about ' +
        'this chapter?',
      'Who do you know who has built something ' +
        'like this?'
    ],
    avoid:
      'Data-heavy presentations, spreadsheet ' +
      'thinking, leading with fees and structures.',
    reengagement:
      'Tell a success story. Reconnect with ' +
      'excitement. Example: "I was just thinking ' +
      'about you — reminded me of a story."',
    pink_flag_patterns: [
      "I've been really busy",
      'a lot going on right now',
      'enthusiasm dropping',
      'shorter answers than usual'
    ],
    clear_emphasis:
      'E dimension — High I responds to vision. ' +
      'Paint the picture, let them embellish it. ' +
      'They will talk themselves into action.'
  },

  S: {
    style: 'S',
    label: 'Steadiness',
    description: 'Supporter — Patient, stable, ' +
      'sincere, team-oriented. Motivated by ' +
      'security, stability, and protecting ' +
      'what they love.',
    traits: [
      'Patient', 'Stable', 'Sincere',
      'Loyal', 'Thorough', 'Team-oriented'
    ],
    coaching_approach:
      'Be thorough and patient. Never rush. ' +
      'Focus on security, stability, ' +
      'step-by-step process. ' +
      'Involve family and support systems. ' +
      'Show how this protects what they value.',
    emotional_questions: [
      'What would make this feel safe for you?',
      'How would this affect your family?',
      'What would staying the same cost you ' +
        'in 3 years?',
      'What does security look like to you?',
      'Who else matters in this decision?'
    ],
    avoid:
      'Rushing, pressure, urgency language. ' +
      'Never say "you need to decide now."',
    reengagement:
      'Check in warmly. Ask about family first. ' +
      'No pressure. Example: "Just checking in — ' +
      'how is everything going?"',
    pink_flag_patterns: [
      "my spouse isn't sure",
      "family isn't on board",
      'what if it fails',
      'I need stability',
      'what about benefits'
    ],
    clear_emphasis:
      'A dimension — High S needs to choose ' +
      'their own next step. Never assign action. ' +
      'They will not do it if it feels imposed.'
  },

  C: {
    style: 'C',
    label: 'Conscientiousness',
    description: 'Analyzer — Analytical, ' +
      'systematic, accurate, quality-focused. ' +
      'Motivated by certainty, proven systems, ' +
      'and being right.',
    traits: [
      'Analytical', 'Systematic', 'Accurate',
      'Cautious', 'Detail-oriented',
      'Quality-focused'
    ],
    coaching_approach:
      'Provide facts, data, proven systems. ' +
      'Give time to analyze. Never pressure. ' +
      'Use logical frameworks. ' +
      'Answer every question completely. ' +
      'Ask more than you explain — ' +
      'explaining triggers their skepticism.',
    emotional_questions: [
      'What information would give you confidence?',
      'What would need to be true for you ' +
        'to feel ready?',
      'What is the cost of waiting another year?',
      'When have you felt most certain about ' +
        'a big decision?',
      'What would a logical next step look like?'
    ],
    avoid:
      'Vision-only selling, emotional pressure, ' +
      'rushing, explaining instead of asking. ' +
      'Every explanation is a missed question. ' +
      'High C disengages when lectured to.',
    reengagement:
      'Send data. Give time. Ask one specific ' +
      'question. Example: "I have data on 3 ' +
      'models matching your criteria. What ' +
      'question would help you most right now?"',
    pink_flag_patterns: [
      'needs more time',
      'wants to think about it',
      'that makes sense',
      'I understand',
      "my current job isn't that bad",
      'I need to do more research on my own',
      'asking only about fees and structure'
    ],
    clear_emphasis:
      'L dimension — High C disengages when ' +
      'explained to. Ask 2 questions for every ' +
      'statement. Emotional ratio must be >= 0.6.'
  }
};

export function getDISCTips(
  dominantStyle: string
): DISCCoachingProfile {
  const style = dominantStyle
    ?.toUpperCase()?.charAt(0) ?? 'C';
  return DISC_COACHING_TIPS[style]
    ?? DISC_COACHING_TIPS['C'];
}

export function deriveDominantStyle(
  natural_d: number,
  natural_i: number,
  natural_s: number,
  natural_c: number
): string {
  const scores = {
    D: natural_d,
    I: natural_i,
    S: natural_s,
    C: natural_c
  };
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0];
}
// discCoachingTips.ts
// Source: Joanna Transcript + Sandi March 2026
// Use: ClientIntelligence.tsx DISC tab,
//      LiveCoachingAssistant.tsx,
//      CoachingPlan Phase 5E

export interface DISCCoachingProfile {
  style: string;
  label: string;
  description: string;
  traits: string[];
  coaching_approach: string;
  emotional_questions: string[];
  avoid: string;
  reengagement: string;
  pink_flag_patterns: string[];
  clear_emphasis: string;
}

export const DISC_COACHING_TIPS:
  Record<string, DISCCoachingProfile> = {

  D: {
    style: 'D',
    label: 'Dominance',
    description: 'Driver — Direct, decisive, ' +
      'results-oriented, competitive. ' +
      'Motivated by control, results, and winning.',
    traits: [
      'Results-oriented', 'Direct', 'Decisive',
      'Competitive', 'Takes charge', 'Goal-focused'
    ],
    coaching_approach:
      'Be direct and purposeful. ' +
      'Get to the point immediately. ' +
      'Focus on results and bottom-line impact. ' +
      'Give options and let them choose. ' +
      'Respect their authority and competence.',
    emotional_questions: [
      'What result are you trying to achieve?',
      'What is holding you back from deciding?',
      'What does winning look like for you?',
      'What would you regret NOT doing?',
      'If you had full control — what would you build?'
    ],
    avoid:
      'Long explanations, excessive process detail, ' +
      'wishy-washy language, small talk filler.',
    reengagement:
      'Send direct email, one specific question, ' +
      'no fluff. Example: ' +
      '"Ready to move forward — yes or no?"',
    pink_flag_patterns: [
      'too many rules',
      'too much oversight',
      'I want to do this my way',
      'how long does this take'
    ],
    clear_emphasis:
      'C dimension — High D wants to own the ' +
      'agenda. Always open with the gold question: ' +
      '"What would make this valuable for you?"'
  },

  I: {
    style: 'I',
    label: 'Influence',
    description: 'Influencer — Enthusiastic, ' +
      'people-oriented, persuasive, optimistic. ' +
      'Motivated by recognition, excitement, ' +
      'and social connection.',
    traits: [
      'Enthusiastic', 'Optimistic', 'Talkative',
      'Social', 'Persuasive', 'People-oriented'
    ],
    coaching_approach:
      'Be warm and friendly. Build rapport first. ' +
      'Lead with enthusiasm and possibility. ' +
      'Use stories and testimonials. ' +
      'Let them talk — they coach themselves.',
    emotional_questions: [
      'How would your friends react when you ' +
        'tell them?',
      'What excites you most about this ' +
        'possibility?',
      'What would your life feel like 3 years ' +
        'from now?',
      'What story do you want to tell about ' +
        'this chapter?',
      'Who do you know who has built something ' +
        'like this?'
    ],
    avoid:
      'Data-heavy presentations, spreadsheet ' +
      'thinking, leading with fees and structures.',
    reengagement:
      'Tell a success story. Reconnect with ' +
      'excitement. Example: "I was just thinking ' +
      'about you — reminded me of a story."',
    pink_flag_patterns: [
      "I've been really busy",
      'a lot going on right now',
      'enthusiasm dropping',
      'shorter answers than usual'
    ],
    clear_emphasis:
      'E dimension — High I responds to vision. ' +
      'Paint the picture, let them embellish it. ' +
      'They will talk themselves into action.'
  },

  S: {
    style: 'S',
    label: 'Steadiness',
    description: 'Supporter — Patient, stable, ' +
      'sincere, team-oriented. Motivated by ' +
      'security, stability, and protecting ' +
      'what they love.',
    traits: [
      'Patient', 'Stable', 'Sincere',
      'Loyal', 'Thorough', 'Team-oriented'
    ],
    coaching_approach:
      'Be thorough and patient. Never rush. ' +
      'Focus on security, stability, ' +
      'step-by-step process. ' +
      'Involve family and support systems. ' +
      'Show how this protects what they value.',
    emotional_questions: [
      'What would make this feel safe for you?',
      'How would this affect your family?',
      'What would staying the same cost you ' +
        'in 3 years?',
      'What does security look like to you?',
      'Who else matters in this decision?'
    ],
    avoid:
      'Rushing, pressure, urgency language. ' +
      'Never say "you need to decide now."',
    reengagement:
      'Check in warmly. Ask about family first. ' +
      'No pressure. Example: "Just checking in — ' +
      'how is everything going?"',
    pink_flag_patterns: [
      "my spouse isn't sure",
      "family isn't on board",
      'what if it fails',
      'I need stability',
      'what about benefits'
    ],
    clear_emphasis:
      'A dimension — High S needs to choose ' +
      'their own next step. Never assign action. ' +
      'They will not do it if it feels imposed.'
  },

  C: {
    style: 'C',
    label: 'Conscientiousness',
    description: 'Analyzer — Analytical, ' +
      'systematic, accurate, quality-focused. ' +
      'Motivated by certainty, proven systems, ' +
      'and being right.',
    traits: [
      'Analytical', 'Systematic', 'Accurate',
      'Cautious', 'Detail-oriented',
      'Quality-focused'
    ],
    coaching_approach:
      'Provide facts, data, proven systems. ' +
      'Give time to analyze. Never pressure. ' +
      'Use logical frameworks. ' +
      'Answer every question completely. ' +
      'Ask more than you explain — ' +
      'explaining triggers their skepticism.',
    emotional_questions: [
      'What information would give you confidence?',
      'What would need to be true for you ' +
        'to feel ready?',
      'What is the cost of waiting another year?',
      'When have you felt most certain about ' +
        'a big decision?',
      'What would a logical next step look like?'
    ],
    avoid:
      'Vision-only selling, emotional pressure, ' +
      'rushing, explaining instead of asking. ' +
      'Every explanation is a missed question. ' +
      'High C disengages when lectured to.',
    reengagement:
      'Send data. Give time. Ask one specific ' +
      'question. Example: "I have data on 3 ' +
      'models matching your criteria. What ' +
      'question would help you most right now?"',
    pink_flag_patterns: [
      'needs more time',
      'wants to think about it',
      'that makes sense',
      'I understand',
      "my current job isn't that bad",
      'I need to do more research on my own',
      'asking only about fees and structure'
    ],
    clear_emphasis:
      'L dimension — High C disengages when ' +
      'explained to. Ask 2 questions for every ' +
      'statement. Emotional ratio must be >= 0.6.'
  }
};

export function getDISCTips(
  dominantStyle: string
): DISCCoachingProfile {
  const style = dominantStyle
    ?.toUpperCase()?.charAt(0) ?? 'C';
  return DISC_COACHING_TIPS[style]
    ?? DISC_COACHING_TIPS['C'];
}

export function deriveDominantStyle(
  natural_d: number,
  natural_i: number,
  natural_s: number,
  natural_c: number
): string {
  const scores = {
    D: natural_d,
    I: natural_i,
    S: natural_s,
    C: natural_c
  };
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0];
}
