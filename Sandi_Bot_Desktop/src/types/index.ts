// Sandy Stahl Coaching Intelligence - Type Definitions

// ============================================
// DISC BEHAVIORAL STYLES
// ============================================

export type DISCStyle = 'D' | 'I' | 'S' | 'C';

export interface DISCScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface DISCProfile {
  style: DISCStyle;
  description: string;
  traits: string[];
  coachingTips: string[];
  scores?: DISCScores;
}

// ============================================
// YOU 2.0 PROFILE
// ============================================

export interface You2Profile {
  statement: string;
  dangers: string[];
  opportunities: string[];
  skills: {
    favorites: string[];
    delegate: string[];
    interested: string[];
  };
  priorities: ('Income' | 'Lifestyle' | 'Wealth' | 'Equity')[];
}

// ============================================
// TWO MAY (TUMAY) PROFILE
// ============================================

export interface SpouseInfo {
  name: string;
  occupation: string;
  supportive: boolean;
  involvement: string;
}

export interface TUMAYProfile {
  age: number;
  spouse: SpouseInfo;
  location: string;
  workPreference: string;
  creditScore: number;
  netWorth: string;
  liquidCapital: string;
  timeline: string;
  industriesOfInterest: string[];
  skills: string[];
  notInterestedIn: string[];
  whyNow: string;
}

// ============================================
// VISION STATEMENT
// ============================================

export interface VisionStatement {
  paragraph: string;
  journeyMindset: string;
  successDefinition: string;
  motivators: {
    income: string;
    financialFreedom: string;
    workLife: string;
  };
}

// ============================================
// ILWE GOALS FRAMEWORK
// ============================================

export interface ILWEGoal {
  current: string;
  target: string;
  timeline: string;
}

export interface ILWEGoals {
  income: ILWEGoal;
  lifestyle: {
    desired: string;
    current: string;
    gap: string;
  };
  wealth: {
    strategy: string;
    target: string;
  };
  equity: {
    goal: string;
    timeline: string;
  };
}

// ============================================
// FATHOM NOTES (CALL NOTES)
// ============================================

export interface FathomNote {
  date: string;
  stage: string;
  notes: string;
  nextSteps: string;
  blockers: string[];
  wins: string[];
}

// ============================================
// READINESS DIMENSIONS
// ============================================

export interface ReadinessScores {
  identity: number;      // 1-5
  commitment: number;    // 1-5
  financial: number;     // 1-5
  execution: number;     // 1-5
}

// ============================================
// PIPELINE STAGES (SANDY'S ACTUAL NAMES)
// ============================================

export type PipelineStage = 
  | 'Initial Contact'
  | 'Seeker Connection'
  | 'Seeker Clarification' 
  | 'Possibilities'
  | 'Client Career 2.0'
  | 'Business Purchase';

// ============================================
// PERSONAS
// ============================================

export type PersonaType = 
  | 'Quiet Decider' 
  | 'Overthinker' 
  | 'Burning Bridge' 
  | 'Strategic';

// ============================================
// RECOMMENDATIONS
// ============================================

export type RecommendationAction = 'PUSH' | 'NURTURE' | 'PAUSE';

// ============================================
// COMPLETE CLIENT PROFILE (Rich POC/sample data)
// ============================================

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  
  // Pipeline
  stage: PipelineStage;
  
  // Assessments
  disc: DISCProfile;
  you2: You2Profile;
  tumay: TUMAYProfile;
  visionStatement: VisionStatement;
  ilwe: ILWEGoals;
  
  // Readiness
  readiness: ReadinessScores;
  
  // Coaching
  persona: PersonaType;
  recommendation: RecommendationAction;
  confidence: number; // 0-100
  
  // Notes
  fathomNotes: FathomNote[];
  notes: string[];
  
  // Tracking
  lastContact: string;
  nextAction: string;
  createdAt: string;
  avatar: string;
}

// ============================================
// CLEAR COACHING SCORING
// ============================================

export interface CLEARScores {
  curiosity: number;      // 1-5
  locating: number;       // 1-5
  engagement: number;     // 1-5
  accountability: number; // 1-5
  reflection: number;     // 1-5
  notes: string;
  date: string;
}

// ============================================
// ACTIVITY LOG
// ============================================

export interface ActivityLog {
  id: string;
  clientId: string;
  clientName: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | 'recommendation';
}

// ============================================
// COACHING SCRIPT
// ============================================

export interface CoachingScript {
  id: string;
  title: string;
  content: string;
  persona: PersonaType;
  stage: PipelineStage;
  category: 'opening' | 'discovery' | 'objection' | 'close' | 'followup';
}

// ============================================
// DASHBOARD KPIs
// ============================================

export interface DashboardKPIs {
  totalClients: number;
  activeConversations: number;
  avgReadiness: number;
  conversionRate: number;
  callsThisWeek: number;
  timeSaved: number;
}

// ============================================
// PIPELINE STATS
// ============================================

export interface PipelineStats {
  stage: PipelineStage;
  count: number;
  avgDaysInStage: number;
  conversionRate: number;
}

// ============================================
// TOP 5 CAREER/BUSINESS MATCH
// ============================================

export interface BusinessMatch {
  id: string;
  name: string;
  matchPercentage: number;
  why: string;
  tesFit: string;
  caution: string;
  investmentLevel: string;
  industry: string;
}

export interface CareerMatch {
  id: string;
  title: string;
  matchPercentage: number;
  why: string;
  income: string;
  growth: string;
}

// ============================================
// KNOWLEDGE GRAPH TYPES
// ============================================

export interface CLEARFramework {
  name: string;
  description: string;
  curiosity: {
    title: string;
    description: string;
    keyPoints: string[];
    questions: Record<string, string[]>;
  };
  locating: {
    title: string;
    description: string;
    keyPoints: string[];
    example: {
      coach: string;
      seeker: string;
      followUp: string;
    };
  };
  engagement: {
    title: string;
    description: string;
    keyPoints: string[];
    example: {
      coach: string;
      seeker: string;
      engagement1: string;
      seeker2: string;
      engagement2: string;
    };
  };
  accountability: {
    title: string;
    description: string;
    keyPoints: string[];
    example: {
      coach: string;
      seeker: string;
      followUp: string;
      commitment: string;
    };
  };
  reflection: {
    title: string;
    description: string;
    keyPoints: string[];
    prompts: string[];
  };
}

export interface ClientExperienceStage {
  compartment: string;
  name: string;
  color: string;
  objective: string;
  experience: string;
  milestone: string;
  pinkFlags: string[];
}

export interface SessionOutline {
  name: string;
  prep?: string[];
  before?: string[];
  during: string[];
  after: string[];
}

// ============================================
// DATABASE SCHEMA TYPES (Phase 2 - SQLite)
// ============================================

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  stage: string;
  disc_style?: string;
  disc_scores?: string;
  you2_statement?: string;
  you2_dangers?: string;
  you2_opportunities?: string;
  tumay_data?: string;
  vision_statement?: string;
  readiness_identity: number;
  readiness_commitment: number;
  readiness_financial: number;
  readiness_execution: number;
  confidence: number;
  recommendation: 'PUSH' | 'NURTURE' | 'PAUSE';
  outcome?: 'ACTIVE' | 'CONVERTED' | 'STALLED' | 'CLOSED';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  client_id: string;
  filename: string;
  document_type: 'DISC' | 'You2' | 'Fathom' | 'Vision';
  file_path: string;
  raw_text?: string;
  extracted_data?: string;
  validation_passed: boolean;
  uploaded_at: string;
}

export interface Session {
  id: string;
  client_id: string;
  session_date: string;
  stage_before?: string;
  stage_after?: string;
  summary?: string;
  objections_raised?: string;
  scripts_used?: string;
  outcome_signal?: 'PROGRESS' | 'STALL' | 'CONCERN';
  next_action?: string;
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  client_id?: string;
  action_type: string;
  input_data?: string;
  output_data?: string;
  reasoning?: string;
  model_used?: string;
}

export interface BackupLog {
  id: number;
  timestamp: string;
  backup_path?: string;
  success: boolean;
  error_message?: string;
}

export interface SearchResult {
  content: string;
  content_type: string;
  stage?: string;
  client_id?: string;
}

export interface PipelineData {
  stage: string;
  count: number;
  clients: Client[];
}

export interface DashboardStats {
  totalClients: number;
  activeConversations: number;
  avgReadinessScore: number;
  conversionRate: number;
  callsThisWeek: number;
  timeSavedHours: number;
  pushCount: number;
  nurtureCount: number;
  pauseCount: number;
}
