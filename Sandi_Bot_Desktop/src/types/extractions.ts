export interface DiscAdaptedScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface DiscNaturalScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface DrivingForce {
  name: string;
  score: number;
  rank?: number;
}

export interface DiscProfile {
  client_name: string;
  assessment_date: string;
  adapted_scores: DiscAdaptedScores;
  natural_scores: DiscNaturalScores;
  primary_style_label: string;
  primary_style_combination: string;
  driving_forces_primary: DrivingForce[];
  driving_forces_situational: DrivingForce[];
  driving_forces_indifferent: DrivingForce[];
  motivation_summary: string;
  communication_dos: string[];
  communication_donts: string[];
  stress_signals_moderate: string[];
  stress_signals_extreme: string[];
  ideal_environment: string[];
  value_to_organization: string[];
  areas_for_improvement: string[];
}

export interface DangerGoalPair {
  danger: string;
  goal: string;
}

export interface StrengthGoalPair {
  strength: string;
  goal: string;
}

export interface OpportunityGoalPair {
  opportunity: string;
  goal: string;
}

export interface You2Profile {
  client_name: string;
  one_year_vision: string;
  spouse_name: string;
  spouse_role: 'owner' | 'employee' | 'unsure' | 'none';
  spouse_on_calls: 'yes' | 'no';
  spouse_mindset_verbatim: string;
  financial_net_worth_range: string;
  credit_score: number;
  launch_timeline: string;
  time_commitment: string;
  dangers: DangerGoalPair[];
  strengths: StrengthGoalPair[];
  opportunities: OpportunityGoalPair[];
  areas_of_interest: string[];
  reasons_for_change: string[];
  location_preference: string;
  skills: string[];
  prior_business_experience: string;
  self_sufficiency_excitement: string;
  additional_stakeholders: Array<{
    name: string;
    relationship: string;
  }>;
}

export interface FathomSession {
  client_name: string;
  session_date: string;
  session_number: number;
  duration_minutes: number;
  stage_at_time: string;
  key_topics: string[];
  objections: string[];
  commitments: string[];
  next_steps: string[];
  spouse_mentions: string[];
  engagement_quality: 'high' | 'medium' | 'low';
  pink_flag_signals: string[];
  positive_signals: string[];
  coach_questions_used: string[];
  session_summary: string;
}

export type DocumentType = 'disc' | 'you2' | 'fathom' | 'vision';

export type ExtractionStatus =
  | 'pending'
  | 'complete'
  | 'failed'
  | 'skipped';

export interface ExtractionResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  extraction_status: ExtractionStatus;
}
