// Sandy Stahl Coaching Intelligence - Sample Data
// Re-exports from clientProfiles.ts and knowledgeGraph.ts

import { allClients } from './clientProfiles';
import { knowledgeGraph } from './knowledgeGraph';

// Export all clients
export const sampleClients = allClients;

// Export knowledge graph
export { knowledgeGraph };

// ============================================
// STAGE CONFIGURATION (SANDY'S ACTUAL NAMES)
// ============================================

export const stageConfig = {
  'Initial Contact': { 
    label: 'Initial Contact', 
    color: '#FEF3C7', 
    description: 'Curiosity piqued, scheduling first call',
    compartment: 'Business Development'
  },
  'Seeker Connection': { 
    label: 'Seeker Connection', 
    color: '#DBEAFE', 
    description: 'DISC, You 2.0, building rapport',
    compartment: 'Compartment 1'
  },
  'Seeker Clarification': { 
    label: 'Seeker Clarification', 
    color: '#FFEDD5', 
    description: 'Vehicles, funding, TUMAY',
    compartment: 'Compartment 2'
  },
  'Possibilities': { 
    label: 'Possibilities', 
    color: '#E9D5FF', 
    description: 'Presenting 3 options, Discovery Center',
    compartment: 'Compartment 3'
  },
  'Client Career 2.0': { 
    label: 'Client Career 2.0', 
    color: '#DCFCE7', 
    description: 'Zor calls, debrief, Point of Clarity',
    compartment: 'Compartment 4'
  },
  'Business Purchase': { 
    label: 'Business Purchase', 
    color: '#22C55E', 
    description: 'Agreement signed, training begins!',
    compartment: 'Closed'
  }
};

// ============================================
// DISC COLORS
// ============================================

export const discColors = {
  D: '#EF4444', // Red
  I: '#F97316', // Orange
  S: '#22C55E', // Green
  C: '#3B82F6'  // Blue
};

// ============================================
// RECOMMENDATION CONFIG
// ============================================

export const recommendationConfig = {
  PUSH: { 
    color: '#22C55E', 
    bgColor: '#DCFCE7', 
    icon: 'ArrowUp', 
    description: 'High readiness - advance aggressively' 
  },
  NURTURE: { 
    color: '#F59E0B', 
    bgColor: '#FEF3C7', 
    icon: 'Heart', 
    description: 'Moderate readiness - build relationship' 
  },
  PAUSE: { 
    color: '#6B7280', 
    bgColor: '#F3F4F6', 
    icon: 'Pause', 
    description: 'Low readiness - give space' 
  }
};

// ============================================
// ACTIVITY LOGS
// ============================================

import type { ActivityLog } from '@/types';

export const activityLogs: ActivityLog[] = [
  { 
    id: 'A001', 
    clientId: 'C001', 
    clientName: 'Andrea Kelleher', 
    action: 'Possibilities Presentation', 
    details: 'Presented 3 wellness brands, Andrea excited about home services option',
    timestamp: '2026-03-10T14:30:00Z', 
    type: 'meeting' 
  },
  { 
    id: 'A002', 
    clientId: 'C002', 
    clientName: 'Alex Raiyn', 
    action: 'Discovery Center Access', 
    details: 'Granted access to Discovery Center for 3 semi-absentee brands',
    timestamp: '2026-03-08T11:00:00Z', 
    type: 'stage_change' 
  },
  { 
    id: 'A003', 
    clientId: 'C003', 
    clientName: 'Marcus Chen', 
    action: 'Financial Projections Sent', 
    details: 'Sent detailed FDD and financial projections for business services brand',
    timestamp: '2026-03-05T16:00:00Z', 
    type: 'email' 
  },
  { 
    id: 'A004', 
    clientId: 'C004', 
    clientName: 'Sarah Williams', 
    action: 'Follow-up Call', 
    details: 'Discussed DISC results, building confidence in experience value',
    timestamp: '2026-03-01T10:30:00Z', 
    type: 'call' 
  },
  { 
    id: 'A005', 
    clientId: 'C005', 
    clientName: 'David Park', 
    action: 'Spouse Call Scheduled', 
    details: 'Scheduled call with Michelle to address concerns and questions',
    timestamp: '2026-03-09T09:00:00Z', 
    type: 'call' 
  },
  { 
    id: 'A006', 
    clientId: 'C001', 
    clientName: 'Andrea Kelleher', 
    action: 'Recommendation: PUSH', 
    details: 'High confidence - health insurance blocker addressed, ready to move',
    timestamp: '2026-03-10T15:00:00Z', 
    type: 'recommendation' 
  },
  { 
    id: 'A007', 
    clientId: 'C003', 
    clientName: 'Marcus Chen', 
    action: 'Recommendation: NURTURE', 
    details: 'Needs more data and time for analysis - provide detailed research',
    timestamp: '2026-03-05T17:00:00Z', 
    type: 'recommendation' 
  },
  { 
    id: 'A008', 
    clientId: 'C004', 
    clientName: 'Sarah Williams', 
    action: 'Note Added', 
    details: 'Age discrimination concerns - needs reassurance and confidence building',
    timestamp: '2026-03-01T11:00:00Z', 
    type: 'note' 
  }
];

// ============================================
// COACHING SCRIPTS (FROM CLEAR FRAMEWORK)
// ============================================

import type { CoachingScript } from '@/types';

export const coachingScripts: CoachingScript[] = [
  {
    id: 'S001',
    title: 'IC Opening - Curiosity',
    content: "Tell me a little bit about yourself and what piqued your interest to join our call today? Before I dive in, what do you think a career ownership coach is?",
    persona: 'Strategic',
    stage: 'Initial Contact',
    category: 'opening'
  },
  {
    id: 'S002',
    title: 'C1 Locating Question',
    content: "What is your experience with coaching? Why do you think we review the DISC? What do you want more of in your life right now? What do you want less of?",
    persona: 'Quiet Decider',
    stage: 'Seeker Connection',
    category: 'discovery'
  },
  {
    id: 'S003',
    title: 'C2 Engagement - Funding',
    content: "How do you feel about investments? What's your comfort level in regard to investments? What do you like about potentially owning a business? What gives you pause?",
    persona: 'Overthinker',
    stage: 'Seeker Clarification',
    category: 'discovery'
  },
  {
    id: 'S004',
    title: 'C3 Possibilities Setup',
    content: "What does discovery mean to you? What are you most excited to learn about? How will you keep an open mind? Remember the 95% rule - keep an open mind and learn the business model.",
    persona: 'Burning Bridge',
    stage: 'Possibilities',
    category: 'opening'
  },
  {
    id: 'S005',
    title: 'C4 Debrief',
    content: "What did you learn? How do you feel? Could it reach your goals? What are your next steps? What surprised you about this possibility?",
    persona: 'Strategic',
    stage: 'Client Career 2.0',
    category: 'discovery'
  },
  {
    id: 'S006',
    title: 'Reflection Prompt',
    content: "What would make our time together today valuable? What insight or 'a-ha' did you gain today? Of everything we covered, what do you value most—and why?",
    persona: 'Quiet Decider',
    stage: 'Seeker Connection',
    category: 'close'
  },
  {
    id: 'S007',
    title: 'Handling Spouse Concerns',
    content: "I understand this is a big decision for your family. What questions does your spouse have? What concerns need to be addressed? Let's schedule a time to talk together.",
    persona: 'Strategic',
    stage: 'Client Career 2.0',
    category: 'objection'
  },
  {
    id: 'S008',
    title: 'Addressing Analysis Paralysis',
    content: "I can see you've done a lot of research. What specific information do you need to feel comfortable moving forward? What's the one piece of data that would help you decide?",
    persona: 'Overthinker',
    stage: 'Seeker Clarification',
    category: 'objection'
  }
];

// ============================================
// DASHBOARD KPIs
// ============================================

import type { DashboardKPIs } from '@/types';

export const dashboardKPIs: DashboardKPIs = {
  totalClients: 5,
  activeConversations: 5,
  avgReadiness: 3.8,
  conversionRate: 20,
  callsThisWeek: 8,
  timeSaved: 6.5
};

// ============================================
// PIPELINE STATS
// ============================================

import type { PipelineStats } from '@/types';

export const pipelineStats: PipelineStats[] = [
  { stage: 'Initial Contact', count: 0, avgDaysInStage: 7, conversionRate: 80 },
  { stage: 'Seeker Connection', count: 1, avgDaysInStage: 14, conversionRate: 75 },
  { stage: 'Seeker Clarification', count: 1, avgDaysInStage: 21, conversionRate: 70 },
  { stage: 'Possibilities', count: 2, avgDaysInStage: 28, conversionRate: 60 },
  { stage: 'Client Career 2.0', count: 1, avgDaysInStage: 35, conversionRate: 50 },
  { stage: 'Business Purchase', count: 0, avgDaysInStage: 0, conversionRate: 100 }
];

// ============================================
// TOP 5 BUSINESS/CAREER MATCHES (FROM POC)
// ============================================

import type { BusinessMatch, CareerMatch } from '@/types';

export const sampleBusinessMatches: BusinessMatch[] = [
  {
    id: 'B001',
    name: 'Home Care Assistance',
    matchPercentage: 92,
    why: 'Strong relationship skills, desire to help others, virtual management possible',
    tesFit: 'High demand market, recurring revenue, meaningful work',
    caution: 'Requires emotional resilience, staffing challenges',
    investmentLevel: '$100K-$150K',
    industry: 'Health & Wellness'
  },
  {
    id: 'B002',
    name: 'Business Coaching Franchise',
    matchPercentage: 88,
    why: 'Leverages PM background, virtual work, helping others succeed',
    tesFit: 'Low overhead, high margin, scalable',
    caution: 'Sales-heavy, requires prospecting',
    investmentLevel: '$75K-$125K',
    industry: 'Business Services'
  },
  {
    id: 'B003',
    name: 'Property Management',
    matchPercentage: 85,
    why: 'Systems-oriented, process-driven, recurring revenue',
    tesFit: 'Stable market, growth potential, semi-absentee possible',
    caution: '24/7 nature, tenant issues',
    investmentLevel: '$100K-$200K',
    industry: 'Real Estate'
  },
  {
    id: 'B004',
    name: 'Senior Care Placement',
    matchPercentage: 82,
    why: 'Helping families, relationship-focused, meaningful work',
    tesFit: 'Growing market, referral-based, home-based',
    caution: 'Emotional work, competitive market',
    investmentLevel: '$50K-$100K',
    industry: 'Health & Wellness'
  },
  {
    id: 'B005',
    name: 'Commercial Cleaning',
    matchPercentage: 78,
    why: 'B2B focus, contract-based, systems-driven',
    tesFit: 'Recession-resistant, scalable, manager-run model',
    caution: 'Labor management, thin margins',
    investmentLevel: '$75K-$150K',
    industry: 'Business Services'
  }
];

export const sampleCareerMatches: CareerMatch[] = [
  {
    id: 'J001',
    title: 'Operations Manager',
    matchPercentage: 90,
    why: 'Strong PM background, systems thinking, leadership skills',
    income: '$90K-$120K',
    growth: 'High - can advance to Director/VP'
  },
  {
    id: 'J002',
    title: 'Business Development Director',
    matchPercentage: 85,
    why: 'Relationship building, strategic thinking, growth focus',
    income: '$100K-$150K',
    growth: 'High - C-suite potential'
  },
  {
    id: 'J003',
    title: 'Corporate Trainer',
    matchPercentage: 82,
    why: 'Helping others develop, communication skills, teaching',
    income: '$75K-$100K',
    growth: 'Moderate - can become Training Director'
  },
  {
    id: 'J004',
    title: 'Project Management Consultant',
    matchPercentage: 80,
    why: 'Leverages PM expertise, independent work, variety',
    income: '$100K-$140K',
    growth: 'High - can build consulting practice'
  },
  {
    id: 'J005',
    title: 'Non-Profit Program Director',
    matchPercentage: 75,
    why: 'Mission-driven, community impact, leadership',
    income: '$70K-$95K',
    growth: 'Moderate - can become Executive Director'
  }
];

// ============================================
// DISC PROFILES FOR REFERENCE
// ============================================

export const discProfiles = {
  D: {
    style: 'D' as const,
    description: 'Dominance - Results-driven, direct, decisive, competitive',
    traits: ['Results-oriented', 'Direct', 'Decisive', 'Competitive', 'Takes charge'],
    coachingTips: [
      'Be direct and get to the point quickly',
      'Focus on results and outcomes',
      'Provide options and let them choose',
      'Respect their authority and competence',
      'Don\'t waste time with small talk'
    ]
  },
  I: {
    style: 'I' as const,
    description: 'Influence - Enthusiastic, people-oriented, persuasive, optimistic',
    traits: ['Enthusiastic', 'Optimistic', 'Talkative', 'Social', 'Persuasive'],
    coachingTips: [
      'Be friendly and warm',
      'Allow time for conversation and stories',
      'Recognize their ideas and enthusiasm',
      'Show excitement about possibilities',
      'Use testimonials and success stories'
    ]
  },
  S: {
    style: 'S' as const,
    description: 'Steadiness - Patient, reliable, supportive, calm',
    traits: ['Patient', 'Reliable', 'Supportive', 'Calm', 'Good listener'],
    coachingTips: [
      'Be patient and calm',
      'Show sincere interest in them as a person',
      'Provide reassurance and support',
      'Give time to process and decide',
      'Emphasize stability and security'
    ]
  },
  C: {
    style: 'C' as const,
    description: 'Conscientiousness - Analytical, precise, systematic, careful',
    traits: ['Analytical', 'Precise', 'Systematic', 'Careful', 'Detail-oriented'],
    coachingTips: [
      'Be thorough and accurate',
      'Provide data, facts, and research',
      'Allow time for analysis',
      'Be organized and structured',
      'Answer questions with detail'
    ]
  }
};
