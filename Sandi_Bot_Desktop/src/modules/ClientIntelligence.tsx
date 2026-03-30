import { useState, useMemo, useEffect, useRef, type ChangeEvent } from 'react';
import {
  Search,
  Briefcase,
  Mail,
  Phone,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Plus,
  Check,
  ClipboardList,
  Clock,
  Calendar,
  Loader2,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/SkeletonCard';
import FeedbackButton from '../components/FeedbackButton';
import { stageConfig, discColors } from '@/data/sampleClients';
import type { Client } from '@/types';
import { getAllClients, createClient, inactivateClient } from '@/services/clientService';
import { clientToDisplay } from '@/services/clientAdapter';
import { dbExecute, dbSelect } from '@/services/db';
import { logEntry } from '@/services/auditService';
import {
  getAllClientsForReview,
  getClientYou2ForReview,
  getClientDiscForReview,
  confirmYou2Data,
  saveDiscData,
  type You2ReviewData,
  type DiscReviewData,
} from '@/services/extractionReviewService';
import {
  getStageReadiness,
  moveClientStage,
  getAllStageReadiness,
  type Recommendation,
  type StageReadiness,
} from '@/services/stageReadinessService';
import {
  generateVisionStatement,
  saveVisionStatement,
  approveVisionStatement,
} from '../services/visionGenerationService';
import { getDiscProfilesMap } from '@/services/dashboardService';
import { cn } from '@/lib/utils';

const CONFIRMED_BY = 'Zubia';

/** Client Intelligence sidebar / header — DISC ring colors (solid + ~20% fill). */
const CI_DISC_STYLE: Record<'D' | 'I' | 'S' | 'C', { solid: string; muted: string }> = {
  D: { solid: '#F05F57', muted: 'rgba(240, 95, 87, 0.2)' },
  I: { solid: '#C8613F', muted: 'rgba(200, 97, 63, 0.2)' },
  S: { solid: '#3BBFBF', muted: 'rgba(59, 191, 191, 0.2)' },
  C: { solid: '#7A8F95', muted: 'rgba(122, 143, 149, 0.2)' },
};

type SidebarRecFilter = 'all' | 'VALIDATE' | 'GATHER' | 'PAUSE' | 'gone_quiet';

const STAGE_DISPLAY_NAMES: Record<string, string> = {
  IC: 'Initial Contact',
  C1: 'Seeker Connection',
  C2: 'Seeker Clarification',
  C3: 'Possibilities',
  C4: 'Client Career 2.0',
  C5: 'Business Purchase',
};

function getStageDisplayName(stage: string): string {
  return STAGE_DISPLAY_NAMES[stage] ?? 'Unknown Stage';
}

const BUCKET_DISPLAY_NAMES: Record<string, string> = {
  active: 'Active',
  converted: 'Business Complete',
  paused: 'Paused',
  inactive: 'Inactive',
};

function getBucketDisplayName(bucket: string | null | undefined): string {
  const k = (bucket ?? '').toLowerCase();
  return BUCKET_DISPLAY_NAMES[k] ?? (bucket?.trim() ? bucket : '—');
}

type PipelineStageCode = 'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

function parsePipelineStageCode(
  raw: string | null | undefined
): PipelineStageCode | null {
  const v = (raw ?? '').trim();
  if (
    v === 'IC' ||
    v === 'C1' ||
    v === 'C2' ||
    v === 'C3' ||
    v === 'C4' ||
    v === 'C5'
  ) {
    return v;
  }
  return null;
}

/** Full display labels and legacy aliases → pipeline code (for DB/UI that store names, not IC/C1…). */
const DISPLAY_LABEL_TO_PIPELINE_CODE: Record<string, PipelineStageCode> = {
  'Initial Contact': 'IC',
  'Seeker Connection': 'C1',
  'Seeker Clarification': 'C2',
  Possibilities: 'C3',
  'Coach Client Collaboration': 'C3',
  'Client Career 2.0': 'C4',
  'Business Purchase': 'C5',
};

function resolvePipelineStageCode(
  raw: string | null | undefined
): PipelineStageCode | null {
  const asCode = parsePipelineStageCode(raw);
  if (asCode) return asCode;
  const label = (raw ?? '').trim();
  return DISPLAY_LABEL_TO_PIPELINE_CODE[label] ?? null;
}

function shouldShowPlacementMilestones(client: {
  inferred_stage?: string | null;
  outcome_bucket?: string | null;
}): boolean {
  if ((client.outcome_bucket ?? '').toLowerCase() === 'converted') return true;
  const code = resolvePipelineStageCode(client.inferred_stage);
  return code === 'C4' || code === 'C5';
}

/** Sandi: IC has no numbered compartment; C1–C5 → Compartment 1–5. */
function stageCardCompartmentSubtitle(code: PipelineStageCode | null): string {
  if (code === null) return 'Compartment —';
  if (code === 'IC') return 'Initial Contact';
  const n: Record<Exclude<PipelineStageCode, 'IC'>, number> = {
    C1: 1,
    C2: 2,
    C3: 3,
    C4: 4,
    C5: 5,
  };
  return `Compartment ${n[code]}`;
}

function getStageBadgeColor(stageCode: string): string {
  const label = getStageDisplayName(stageCode);
  if (label === 'Unknown Stage') return '#E2E8F0';
  return (
    stageConfig[label as keyof typeof stageConfig]?.color ?? '#E2E8F0'
  );
}

const PINK_FLAG_LABELS: Record<string, string> = {
  timeline_slipping: 'Timeline Concern',
  engagement_risk: 'Engagement Risk',
  financial_concern: 'Financial Review',
  spouse_alignment: 'Spouse Not Aligned',
  ghosting_risk: 'Ghosting Pattern',
};

function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .map((w) =>
      w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''
    )
    .join(' ');
}

function pinkFlagDisplayName(flagKey: string): string {
  if (PINK_FLAG_LABELS[flagKey]) return PINK_FLAG_LABELS[flagKey];
  return titleCaseWords(flagKey.replace(/_/g, ' '));
}

/** Raw JSON array from clients.pink_flags; invalid JSON → [] */
function parseClientPinkFlagsJson(
  raw: string | null | undefined
): string[] {
  try {
    const p = JSON.parse(raw || '[]');
    if (!Array.isArray(p)) return [];
    return p.filter((f): f is string => typeof f === 'string');
  } catch {
    return [];
  }
}

function splitPinkFlags(allFlags: string[]): {
  activeFlags: string[];
  resolvedFlags: string[];
} {
  const activeFlags = allFlags.filter((f) => !f.startsWith('resolved:'));
  const resolvedFlags = allFlags
    .filter((f) => f.startsWith('resolved:'))
    .map((f) => f.replace(/^resolved:/, ''));
  return { activeFlags, resolvedFlags };
}

function countActivePinkFlagsOnClient(client: Client): number {
  const { activeFlags } = splitPinkFlags(parseClientPinkFlagsJson(client.pink_flags));
  return activeFlags.length;
}

type DisplayClient = ReturnType<typeof clientToDisplay> & {
  gone_quiet?: boolean;
  gone_quiet_days?: number;
  /** From getAllStageReadiness — overrides legacy client.recommendation (PUSH/NURTURE) for badges */
  recommendationFromReadiness?: Recommendation;
  vision_approved?: number | null;
  vision_approved_date?: string | null;
};

function shouldShowGoneQuietBadge(client: {
  gone_quiet?: boolean | null;
  outcome_bucket?: string | null;
}): boolean {
  if (client?.gone_quiet !== true) return false;
  const b = (client.outcome_bucket ?? '').toLowerCase();
  return b === 'active';
}

const GONE_QUIET_REENGAGEMENT_TIPS: Record<'D' | 'I' | 'S' | 'C', string> = {
  D: 'Send a direct email with one specific question. No fluff.',
  I: 'Share a success story. Reconnect with the vision and excitement of what they wanted.',
  S: 'Check in warmly. Ask about the family first. No pressure.',
  C: 'Send relevant data or an article. Give time. Ask one specific question.',
};

function goneQuietTipFromNaturalScores(
  scores: { d: number; i: number; s: number; c: number } | null
): string | null {
  if (!scores) return null;
  const style = deriveStyleLetter(
    scores.d,
    scores.i,
    scores.s,
    scores.c
  );
  return GONE_QUIET_REENGAGEMENT_TIPS[style] ?? null;
}

function formatGoneQuietLabel(days: number | null | undefined): string {
  const base = 'Gone Quiet';
  if (days != null && days > 0) {
    return `${base} · ${days}d`;
  }
  return base;
}

const GONE_QUIET_SESSION_DISCLAIMER =
  'Based on last uploaded Fathom session. Upload new calls to keep this current.';

const GONE_QUIET_RESPONSE_PLACEHOLDER = 'Select response...';

const GONE_QUIET_RESPONSE_OPTIONS = [
  'Called — left voicemail',
  'Sent email',
  'Scheduled session',
  'Had conversation — still engaged',
  'Going cold — considering pause',
  'No action yet',
] as const;

const PINK_FLAG_RESPONSE_OPTIONS = [
  'Called — left voicemail',
  'Sent email',
  'Scheduled session',
  'Had conversation — still engaged',
  'Addressed in last call',
  'Monitoring — no action yet',
] as const;

const GOLDEN_RULES_TEXTAREA_PLACEHOLDER =
  'What coaching moves led to this conversion? What worked with this client that you want to remember and repeat with similar clients?';

// TODO Migration 54: add territory_check_notes column to clients table and replace
// localStorage with DB persistence
function territoryCheckStorageKey(clientId: string): string {
  return `territory_check_${clientId}`;
}

const TERRITORY_CHECK_TEXTAREA_PLACEHOLDER =
  'Paste your territory check results here. This information will be included when generating the vision statement PowerPoint.';

function formatVisionApprovedDateLabel(raw: string | null | undefined): string {
  const t = (raw ?? '').trim();
  if (!t) return '';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLastContactDisplay(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toDateInputValue(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function localCalendarDateYyyyMmDd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function deriveStyleLabel(
  d: number,
  i: number,
  s: number,
  c: number
): string {
  const scores: Record<string, number> = {
    D: Number(d ?? 0),
    I: Number(i ?? 0),
    S: Number(s ?? 0),
    C: Number(c ?? 0)
  };
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);
  const top = sorted[0][0];
  const second = sorted[1][0];
  const labels: Record<string, string> = {
    DS: 'Driving Supporter',
    DI: 'Driving Influencer',
    DC: 'Driving Analyzer',
    ID: 'Influencing Driver',
    IS: 'Influencing Supporter',
    IC: 'Influencing Analyzer',
    SD: 'Supporting Driver',
    SI: 'Supporting Influencer',
    SC: 'Supporting Analyzer',
    CD: 'Analyzing Driver',
    CI: 'Analyzing Influencer',
    CS: 'Analyzing Supporter',
    D: 'Driver', I: 'Influencer',
    S: 'Supporter', C: 'Analyzer',
  };
  return labels[`${top}${second}`]
    ?? labels[top]
    ?? `High ${top}`;
}

function deriveStyleLetter(
  d: number,
  i: number,
  s: number,
  c: number
): 'D' | 'I' | 'S' | 'C' {
  const scores = {
    D: Number(d ?? 0),
    I: Number(i ?? 0),
    S: Number(s ?? 0),
    C: Number(c ?? 0)
  };
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0] as 'D' | 'I' | 'S' | 'C';
}

function DISCBadge({ style }: { style: 'D' | 'I' | 'S' | 'C' }) {
  const color = discColors[style];
  const labels = { D: 'Dominance', I: 'Influence', S: 'Steadiness', C: 'Conscientiousness' };
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white font-bold text-sm"
      style={{ backgroundColor: color }}
    >
      <span className="text-lg">{style}</span>
      <span className="text-xs font-normal opacity-90">{labels[style]}</span>
    </div>
  );
}

function RecommendationBadge({
  action,
  confidence,
}: {
  action: string;
  confidence: number;
}) {
  const recommendationStyleMap: Record<
    'VALIDATE' | 'GATHER' | 'PAUSE',
    { bgColor: string; color: string }
  > = {
    VALIDATE: { bgColor: '#DCFCE7', color: '#22C55E' },
    GATHER: { bgColor: '#FEF3C7', color: '#F59E0B' },
    PAUSE: { bgColor: '#F3F4F6', color: '#6B7280' },
  };
  const normalizedRecommendation =
    action === 'PUSH'
      ? 'VALIDATE'
      : action === 'NURTURE'
        ? 'GATHER'
        : action;
  const config =
    recommendationStyleMap[
      normalizedRecommendation as keyof typeof recommendationStyleMap
    ] ?? recommendationStyleMap.GATHER;
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm"
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      <span>{normalizedRecommendation}</span>
      <span className="text-xs opacity-75">{confidence}%</span>
    </div>
  );
}

const DISC_STYLE_DESCRIPTIONS: Record<'D' | 'I' | 'S' | 'C', string> = {
  D: 'Fast-paced and results-driven. Prefers direct communication and clear outcomes.',
  I: 'People-oriented and persuasive. Energized by collaboration, stories, and momentum.',
  S: 'Steady and relationship-centered. Values trust, consistency, and thoughtful progress.',
  C: 'Analytical and detail-focused. Prefers logic, structure, and complete information.',
};

const DISC_TRAITS: Record<'D' | 'I' | 'S' | 'C', string[]> = {
  D: ['Results-oriented', 'Direct', 'Decisive', 'Competitive', 'Takes charge', 'Goal-focused'],
  I: ['Enthusiastic', 'Optimistic', 'Talkative', 'Social', 'Persuasive', 'People-oriented'],
  S: ['Patient', 'Stable', 'Sincere', 'Loyal', 'Thorough', 'Team-oriented'],
  C: ['Analytical', 'Systematic', 'Accurate', 'Cautious', 'Detail-oriented', 'Quality-focused'],
};

const DISC_COACHING_TIPS: Record<'D' | 'I' | 'S' | 'C', string[]> = {
  D: ['Be direct', 'Focus on results', 'Give options', 'Respect authority', 'Skip small talk'],
  I: ['Be friendly', 'Allow stories', 'Recognize ideas', 'Show excitement', 'Use testimonials'],
  S: ['Coach thoroughly', 'Focus on stability', 'Give time', 'Involve family', 'Show security'],
  C: ['Provide facts', 'Give time to analyze', 'Use logic', 'Acknowledge thoroughness', 'Answer every question'],
};

function safeParseJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toDisplayValue(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
}

function parseListField(
  field: unknown,
  primaryKey?: string
): string[] {
  if (!field) return [];

  let arr: unknown[] = [];

  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      arr = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return field
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
  } else if (Array.isArray(field)) {
    arr = field;
  } else {
    return [String(field)];
  }

  return arr
    .map((item) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        if (primaryKey && obj[primaryKey]) return String(obj[primaryKey]);
        if (obj.text) return String(obj.text);
        if (obj.value) return String(obj.value);
        if (obj.name) return String(obj.name);
        if (obj.danger) return String(obj.danger);
        if (obj.opportunity) return String(obj.opportunity);
        if (obj.strength) return String(obj.strength);
        const firstVal = Object.values(obj).find((v) => typeof v === 'string');
        return firstVal ? String(firstVal) : JSON.stringify(obj);
      }
      return String(item);
    })
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function ClientDetailModal({
  client,
  onInactivate,
  onVisionUpdated,
}: {
  client: DisplayClient;
  onInactivate?: (id: string) => void;
  onVisionUpdated?: () => void;
}) {
  const [readiness, setReadiness] = useState<StageReadiness | null>(null);
  const [you2Vision, setYou2Vision] = useState('No statement yet');
  const [you2Details, setYou2Details] = useState<{
    spouse_name: string;
    financial_net_worth_range: string;
    credit_score: number | null;
    launch_timeline: string;
    dangers: string[];
    strengths: string[];
    opportunities: string[];
    areas_of_interest: string[];
    skills: string[];
    time_commitment: string;
    reasons_for_change: string[];
  } | null>(null);
  const [tumayData, setTumayData] = useState<Record<string, unknown> | null>(null);
  const [readinessScorePct, setReadinessScorePct] = useState(0);
  const [contact, setContact] = useState<{ email: string | null; phone: string | null; company: string | null }>({
    email: null,
    phone: null,
    company: null,
  });
  const [discStyleLabel, setDiscStyleLabel] = useState<string>('—');
  const [modalDiscStyle, setModalDiscStyle] = useState<'D' | 'I' | 'S' | 'C'>(client?.disc?.style ?? 'I');
  const [discScores, setDiscScores] = useState<{ d: number; i: number; s: number; c: number } | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState<{ email: string; phone: string; company: string }>({
    email: '',
    phone: '',
    company: '',
  });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [lastContactDateDb, setLastContactDateDb] = useState<string | null>(
    null
  );
  const [isEditingLastContact, setIsEditingLastContact] = useState(false);
  const [lastContactDraft, setLastContactDraft] = useState('');
  const [isSavingLastContact, setIsSavingLastContact] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState<{
    session_date: string;
    stage: 'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
    notes: string;
    next_actions: string;
  }>({
    session_date: new Date().toISOString().split('T')[0],
    stage: 'IC',
    notes: '',
    next_actions: '',
  });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [fathomSessions, setFathomSessions] = useState<Array<{
    id: number;
    client_id: string | null;
    session_date: string | null;
    session_number: number | null;
    stage: string | null;
    notes: string | null;
    next_actions: string | null;
    overall_clear_score: number | null;
    call_duration: string | null;
    block_opening: string | null;
    block_emotional: string | null;
    block_life_context: string | null;
    block_vision: string | null;
    block_disc_signals: string | null;
    block_objections: string | null;
    block_commitments: string | null;
    block_reflection_block: string | null;
    block_coach_assessment: string | null;
    blocks_complete: number | null;
    updated_at: string | null;
  }>>([]);
  const [fathomSessionCount, setFathomSessionCount] = useState<number>(0);
  const [showInactivateConfirm, setShowInactivateConfirm] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [localPinkFlagsJson, setLocalPinkFlagsJson] = useState<string>('[]');
  const [resolvingPinkFlag, setResolvingPinkFlag] = useState<string | null>(
    null
  );
  const [goneQuietResponseValue, setGoneQuietResponseValue] = useState('');
  const [goneQuietResponseLogged, setGoneQuietResponseLogged] = useState(false);
  const [goneQuietResponseSaving, setGoneQuietResponseSaving] = useState(false);
  const goneQuietResponseResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinkFlagResponseValues, setPinkFlagResponseValues] = useState<
    Record<string, string>
  >({});
  const [pinkFlagResponseLogged, setPinkFlagResponseLogged] = useState<
    Record<string, boolean>
  >({});
  const [pinkFlagResponseSaving, setPinkFlagResponseSaving] = useState<
    Record<string, boolean>
  >({});
  const pinkFlagResponseTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const [goldenRulesDraft, setGoldenRulesDraft] = useState('');
  const [goldenRulesHasPersisted, setGoldenRulesHasPersisted] = useState(false);
  const [goldenRulesSaving, setGoldenRulesSaving] = useState(false);
  const [goldenRulesSavedConfirm, setGoldenRulesSavedConfirm] = useState(false);
  const [manualSessionDate, setManualSessionDate] = useState(() =>
    localCalendarDateYyyyMmDd()
  );
  const [manualSessionNotes, setManualSessionNotes] = useState('');
  const [manualSessionSaving, setManualSessionSaving] = useState(false);
  const [manualSessionConfirm, setManualSessionConfirm] = useState<string | null>(
    null
  );
  const [placementPocReached, setPlacementPocReached] = useState<string | null>(
    null
  );
  const [placementTriggerSubmitted, setPlacementTriggerSubmitted] = useState<
    string | null
  >(null);
  const [placementBusinessPurchase, setPlacementBusinessPurchase] = useState<
    string | null
  >(null);
  const [placementRevenueStored, setPlacementRevenueStored] = useState<
    string | null
  >(null);
  const [pocDateDraft, setPocDateDraft] = useState('');
  const [triggerDateDraft, setTriggerDateDraft] = useState('');
  const [purchaseDateDraft, setPurchaseDateDraft] = useState('');
  const [purchaseRevenueDraft, setPurchaseRevenueDraft] = useState('');
  const [placementMilestoneSaving, setPlacementMilestoneSaving] = useState<
    | null
    | 'poc'
    | 'trigger'
    | 'purchase'
    | 'clear_poc'
    | 'clear_trigger'
    | 'clear_purchase'
  >(null);
  const [territoryCheckDraft, setTerritoryCheckDraft] = useState('');
  const [territoryCheckSavedMsg, setTerritoryCheckSavedMsg] = useState(false);
  const [visionGenerating, setVisionGenerating] = useState(false);
  const [visionGenError, setVisionGenError] = useState<string | null>(null);
  const [visionDraftMode, setVisionDraftMode] = useState(false);
  const [visionEditText, setVisionEditText] = useState('');
  const [visionApproveMsg, setVisionApproveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!client?.id) return;
    setVisionGenerating(false);
    setVisionGenError(null);
    setVisionApproveMsg(null);
    setVisionDraftMode(false);
    setVisionEditText((client.visionStatement.paragraph ?? '').trim());
  }, [client?.id]);

  useEffect(() => {
    setDetailTab('overview');
    setShowInactivateConfirm(false);
  }, [client?.id]);

  useEffect(() => {
    if (client?.id) {
      setGoneQuietResponseValue('');
      setGoneQuietResponseLogged(false);
      if (goneQuietResponseResetTimerRef.current) {
        clearTimeout(goneQuietResponseResetTimerRef.current);
        goneQuietResponseResetTimerRef.current = null;
      }
      pinkFlagResponseTimersRef.current.forEach(clearTimeout);
      pinkFlagResponseTimersRef.current.clear();
      setPinkFlagResponseValues({});
      setPinkFlagResponseLogged({});
      setPinkFlagResponseSaving({});
    }
  }, [client?.id]);

  useEffect(() => {
    return () => {
      if (goneQuietResponseResetTimerRef.current) {
        clearTimeout(goneQuietResponseResetTimerRef.current);
      }
      pinkFlagResponseTimersRef.current.forEach(clearTimeout);
      pinkFlagResponseTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!client) return;
    const ob = (client.outcome_bucket ?? '').toLowerCase();
    if (ob !== 'converted') {
      setGoldenRulesDraft('');
      setGoldenRulesHasPersisted(false);
      setGoldenRulesSavedConfirm(false);
      return;
    }
    void dbSelect<{ golden_rules_notes: string | null }>(
      `SELECT golden_rules_notes FROM clients WHERE id = ?`,
      [client.id]
    )
      .then((rows) => {
        const raw = rows[0]?.golden_rules_notes ?? '';
        setGoldenRulesDraft(raw);
        setGoldenRulesHasPersisted(raw.trim().length > 0);
        setGoldenRulesSavedConfirm(false);
      })
      .catch(() => {
        setGoldenRulesDraft('');
        setGoldenRulesHasPersisted(false);
      });
  }, [client?.id, client?.outcome_bucket]);

  useEffect(() => {
    if (!client) return;
    setManualSessionDate(localCalendarDateYyyyMmDd());
    setManualSessionNotes('');
    setManualSessionConfirm(null);
  }, [client?.id]);

  useEffect(() => {
    if (!client?.id) return;
    if (!shouldShowPlacementMilestones(client)) {
      setPlacementPocReached(null);
      setPlacementTriggerSubmitted(null);
      setPlacementBusinessPurchase(null);
      setPlacementRevenueStored(null);
      setPocDateDraft('');
      setTriggerDateDraft('');
      setPurchaseDateDraft('');
      setPurchaseRevenueDraft('');
      return;
    }
    const today = localCalendarDateYyyyMmDd();
    void dbSelect<{
      poc_reached_date: string | null;
      trigger_submitted_date: string | null;
      business_purchase_date: string | null;
      placement_revenue: string | null;
    }>(
      `SELECT poc_reached_date, trigger_submitted_date, business_purchase_date, placement_revenue
       FROM clients WHERE id = ?`,
      [client.id]
    )
      .then((rows) => {
        const r = rows[0];
        setPlacementPocReached(r?.poc_reached_date ?? null);
        setPlacementTriggerSubmitted(r?.trigger_submitted_date ?? null);
        setPlacementBusinessPurchase(r?.business_purchase_date ?? null);
        setPlacementRevenueStored(r?.placement_revenue ?? null);
        setPocDateDraft(today);
        setTriggerDateDraft(today);
        setPurchaseDateDraft(today);
        setPurchaseRevenueDraft((r?.placement_revenue ?? '').trim());
      })
      .catch(() => {
        setPlacementPocReached(null);
        setPlacementTriggerSubmitted(null);
        setPlacementBusinessPurchase(null);
        setPlacementRevenueStored(null);
      });
  }, [client?.id, client?.inferred_stage, client?.outcome_bucket]);

  useEffect(() => {
    if (client) {
      const stageForDraft =
        parsePipelineStageCode(client.inferred_stage) ?? 'IC';
      setNoteDraft((prev) => ({ ...prev, stage: stageForDraft }));
      getStageReadiness(client.id).then(setReadiness);
      getAllStageReadiness()
        .then((allReadiness) => {
          const matched = allReadiness.find((r) => r.client_id === client.id);
          setReadinessScorePct(matched?.readiness_score ?? 0);
        })
        .catch(() => setReadinessScorePct(0));
      dbSelect<{
        email: string | null;
        phone: string | null;
        company: string | null;
        last_contact_date: string | null;
      }>(
        `SELECT email, phone, company, last_contact_date FROM clients
         WHERE id = ?`,
        [client.id]
      )
        .then((rows) => {
          setContact({
            email: rows[0]?.email ?? null,
            phone: rows[0]?.phone ?? null,
            company: rows[0]?.company ?? null,
          });
          setContactDraft({
            email: rows[0]?.email ?? '',
            phone: rows[0]?.phone ?? '',
            company: rows[0]?.company ?? '',
          });
          setLastContactDateDb(rows[0]?.last_contact_date ?? null);
        })
        .catch(() => {
          setContact({ email: null, phone: null, company: null });
          setContactDraft({ email: '', phone: '', company: '' });
          setLastContactDateDb(null);
        });
      dbSelect<{
        natural_d: number | null;
        natural_i: number | null;
        natural_s: number | null;
        natural_c: number | null;
      }>(
        `SELECT natural_d, natural_i, natural_s, natural_c
         FROM client_disc_profiles
         WHERE client_id = ?`,
        [client.id]
      )
        .then((rows) => {
          const row = rows[0];
          if (!row) {
            setDiscStyleLabel('—');
            setModalDiscStyle(client.disc.style);
            setDiscScores(null);
            return;
          }
          setDiscScores({
            d: Number(row.natural_d ?? 0),
            i: Number(row.natural_i ?? 0),
            s: Number(row.natural_s ?? 0),
            c: Number(row.natural_c ?? 0),
          });
          setDiscStyleLabel(
            deriveStyleLabel(
              Number(row.natural_d ?? 0),
              Number(row.natural_i ?? 0),
              Number(row.natural_s ?? 0),
              Number(row.natural_c ?? 0)
            )
          );
          setModalDiscStyle(
            deriveStyleLetter(
              Number(row.natural_d ?? 0),
              Number(row.natural_i ?? 0),
              Number(row.natural_s ?? 0),
              Number(row.natural_c ?? 0)
            )
          );
        })
        .catch(() => {
          setDiscStyleLabel('—');
          setModalDiscStyle(client.disc.style);
          setDiscScores(null);
        });
      dbSelect<Record<string, unknown>>(
        `SELECT *
         FROM client_you2_profiles
         WHERE client_id = ?`,
        [client.id]
      )
        .then((you2Result) => {
          const row = you2Result[0];
          const vision = String(row?.one_year_vision ?? '')
            ?? 'No statement yet';
          setYou2Vision(vision || 'No statement yet');
          setYou2Details(
            row
              ? {
                  spouse_name: String(row.spouse_name ?? ''),
                  financial_net_worth_range: String(row.financial_net_worth_range ?? ''),
                  credit_score: typeof row.credit_score === 'number' ? row.credit_score : Number(row.credit_score ?? 0) || null,
                  launch_timeline: String(row.launch_timeline ?? ''),
                  dangers: parseListField(row.top_3_dangers ?? row.dangers, 'danger'),
                  strengths: parseListField(row.top_3_strengths ?? row.strengths, 'strength'),
                  opportunities: parseListField(row.top_3_opportunities ?? row.opportunities, 'opportunity'),
                  areas_of_interest: parseListField(row.areas_of_interest),
                  skills: parseListField(row.skills),
                  time_commitment: String(row.time_commitment ?? ''),
                  reasons_for_change: parseListField(row.reasons_for_change),
                }
              : null
          );
        })
        .catch(() => {
          setYou2Vision('No statement yet');
          setYou2Details(null);
        });
      dbSelect<{
        tumay_data: string;
      }>(
        `SELECT tumay_data FROM clients
         WHERE id = ?`,
        [client.id]
      )
        .then((tumayResult) => {
          const tumayDataRaw = tumayResult[0]?.tumay_data;
          if (!tumayDataRaw) {
            setTumayData(null);
            return;
          }
          try {
            setTumayData(JSON.parse(tumayDataRaw));
          } catch {
            setTumayData(null);
          }
        })
        .catch(() => setTumayData(null));
      dbSelect<{
        id: number;
        client_id: string | null;
        session_date: string | null;
        session_number: number | null;
        stage: string | null;
        notes: string | null;
        next_actions: string | null;
        overall_clear_score: number | null;
        call_duration: string | null;
        block_opening: string | null;
        block_emotional: string | null;
        block_life_context: string | null;
        block_vision: string | null;
        block_disc_signals: string | null;
        block_objections: string | null;
        block_commitments: string | null;
        block_reflection_block: string | null;
        block_coach_assessment: string | null;
        blocks_complete: number | null;
        updated_at: string | null;
      }>(
        `SELECT
         id,
         client_id,
         session_date,
         session_number,
         stage,
         notes,
         next_actions,
         overall_clear_score,
         call_duration,
         block_opening,
         block_emotional,
         block_life_context,
         block_vision,
         block_disc_signals,
         block_objections,
         block_commitments,
         block_reflection_block,
         block_coach_assessment,
         blocks_complete,
         updated_at
         FROM coaching_sessions
         WHERE client_id = ?
         ORDER BY session_date DESC, id DESC`,
        [client.id]
      )
        .then((rows) => {
          setFathomSessions(rows);
          setFathomSessionCount(rows.length);
        })
        .catch(() => {
          setFathomSessions([]);
          setFathomSessionCount(0);
        });
      dbSelect<{ pink_flags: string | null }>(
        `SELECT pink_flags FROM clients WHERE id = ?`,
        [client.id]
      )
        .then((rows) => {
          setLocalPinkFlagsJson(rows[0]?.pink_flags ?? '[]');
        })
        .catch(() => {
          setLocalPinkFlagsJson(client.pink_flags ?? '[]');
        });
    } else {
      setLocalPinkFlagsJson('[]');
      setReadiness(null);
      setYou2Vision('No statement yet');
      setYou2Details(null);
      setTumayData(null);
      setReadinessScorePct(0);
      setContact({ email: null, phone: null, company: null });
      setContactDraft({ email: '', phone: '', company: '' });
      setDiscStyleLabel('—');
      setModalDiscStyle('I');
      setDiscScores(null);
      setFathomSessions([]);
      setFathomSessionCount(0);
      setIsEditingContact(false);
      setShowAddNote(false);
      setLastContactDateDb(null);
      setIsEditingLastContact(false);
      setLastContactDraft('');
    }
  }, [client?.id]);

  const mostRecentSessionDate = useMemo(() => {
    for (const s of fathomSessions) {
      const d = s.session_date?.trim();
      if (d) return d;
    }
    return null;
  }, [fathomSessions]);

  const lastContactedDisplay = useMemo(() => {
    const db = lastContactDateDb?.trim();
    if (db) return formatLastContactDisplay(db);
    if (mostRecentSessionDate)
      return formatLastContactDisplay(mostRecentSessionDate);
    return 'Not set';
  }, [lastContactDateDb, mostRecentSessionDate]);

  const resolvedPipelineCode = resolvePipelineStageCode(client.inferred_stage);
  const stageLabel =
    resolvedPipelineCode != null
      ? STAGE_DISPLAY_NAMES[resolvedPipelineCode]
      : getStageDisplayName(client.inferred_stage?.trim() ?? '');
  const stageCompartmentSubtitle =
    stageCardCompartmentSubtitle(resolvedPipelineCode);

  const persistedVisionText = (client.visionStatement.paragraph ?? '').trim();
  const visionIsApproved = client.vision_approved === 1;

  const allPinkParsed = parseClientPinkFlagsJson(localPinkFlagsJson);
  const { activeFlags: activePinkFlags, resolvedFlags: resolvedPinkFlags } =
    splitPinkFlags(allPinkParsed);

  const goneQuietReengagementTipText =
    shouldShowGoneQuietBadge(client) && discScores
      ? goneQuietTipFromNaturalScores(discScores)
      : null;

  const handleInactivate = () => {
    if (!onInactivate) return;
    onInactivate(client.id);
    setShowInactivateConfirm(false);
  };

  const loadFathomSessions = async () => {
    const rows = await dbSelect<{
      id: number;
      client_id: string | null;
      session_date: string | null;
      session_number: number | null;
      stage: string | null;
      notes: string | null;
      next_actions: string | null;
      overall_clear_score: number | null;
      call_duration: string | null;
      block_opening: string | null;
      block_emotional: string | null;
      block_life_context: string | null;
      block_vision: string | null;
      block_disc_signals: string | null;
      block_objections: string | null;
      block_commitments: string | null;
      block_reflection_block: string | null;
      block_coach_assessment: string | null;
      blocks_complete: number | null;
      updated_at: string | null;
    }>(
      `SELECT
       id,
       client_id,
       session_date,
       session_number,
       stage,
       notes,
       next_actions,
       overall_clear_score,
       call_duration,
       block_opening,
       block_emotional,
       block_life_context,
       block_vision,
       block_disc_signals,
       block_objections,
       block_commitments,
       block_reflection_block,
       block_coach_assessment,
       blocks_complete,
       updated_at
       FROM coaching_sessions
       WHERE client_id = ?
       ORDER BY session_date DESC, id DESC`,
      [client.id]
    );
    setFathomSessions(rows);
    setFathomSessionCount(rows.length);
  };

  const handleSaveContact = async () => {
    setIsSavingContact(true);
    try {
      await dbExecute(
        `UPDATE clients
         SET email = ?,
             phone = ?,
             company = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [contactDraft.email, contactDraft.phone, contactDraft.company, client.id]
      );
      const rows = await dbSelect<{
        email: string | null;
        phone: string | null;
        company: string | null;
        last_contact_date: string | null;
      }>(
        `SELECT email, phone, company, last_contact_date FROM clients
         WHERE id = ?`,
        [client.id]
      );
      setContact({
        email: rows[0]?.email ?? null,
        phone: rows[0]?.phone ?? null,
        company: rows[0]?.company ?? null,
      });
      setContactDraft({
        email: rows[0]?.email ?? '',
        phone: rows[0]?.phone ?? '',
        company: rows[0]?.company ?? '',
      });
      setLastContactDateDb(rows[0]?.last_contact_date ?? null);
      setIsEditingContact(false);
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleSaveLastContact = async () => {
    const trimmed = lastContactDraft.trim();
    if (!trimmed) return;
    setIsSavingLastContact(true);
    try {
      const updatedAt = new Date().toISOString();
      const oldVal = lastContactDateDb?.trim() ?? '';
      await dbExecute(
        `UPDATE clients SET last_contact_date = ?, updated_at = ? WHERE id = ?`,
        [trimmed, updatedAt, client.id]
      );
      await logEntry(
        'LAST_CONTACT_UPDATED',
        client.id,
        oldVal || null,
        trimmed,
        null,
        'deterministic'
      );
      setLastContactDateDb(trimmed);
      setIsEditingLastContact(false);
    } finally {
      setIsSavingLastContact(false);
    }
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      await dbExecute(
        `INSERT INTO coaching_sessions
         (client_id, session_date, stage, notes, next_actions)
         VALUES (?, ?, ?, ?, ?)`,
        [client.id, noteDraft.session_date, noteDraft.stage, noteDraft.notes, noteDraft.next_actions]
      );
      await loadFathomSessions();
      setShowAddNote(false);
      setNoteDraft({
        session_date: new Date().toISOString().split('T')[0],
        stage: parsePipelineStageCode(client.inferred_stage) ?? 'IC',
        notes: '',
        next_actions: '',
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleAddManualSession = async () => {
    if (!client) return;
    const dateStr = manualSessionDate.trim();
    if (!dateStr) return;
    setManualSessionSaving(true);
    setManualSessionConfirm(null);
    try {
      const countRows = await dbSelect<{ c: number }>(
        `SELECT COUNT(*) as c FROM coaching_sessions WHERE client_id = ?`,
        [client.id]
      );
      const nextSessionNumber = Number(countRows[0]?.c ?? 0) + 1;
      const stageCode =
        resolvePipelineStageCode(client.inferred_stage) ?? 'IC';
      const notesVal = manualSessionNotes.trim() || null;
      const now = new Date().toISOString();
      await dbExecute(
        `INSERT INTO coaching_sessions
         (client_id, session_date, session_number, stage, notes, next_actions, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          client.id,
          dateStr,
          nextSessionNumber,
          stageCode,
          notesVal,
          null,
          now,
        ]
      );
      await dbExecute(
        `UPDATE clients SET last_contact_date = ?, updated_at = ? WHERE id = ?`,
        [dateStr, now, client.id]
      );
      setLastContactDateDb(dateStr);
      await logEntry(
        'manual_session_added',
        client.id,
        null,
        dateStr,
        null,
        'deterministic'
      );
      await loadFathomSessions();
      const friendly = formatLastContactDisplay(dateStr);
      setManualSessionConfirm(friendly || dateStr);
      setManualSessionDate(localCalendarDateYyyyMmDd());
      setManualSessionNotes('');
    } catch (e) {
      console.error('manual session add failed:', e);
    } finally {
      setManualSessionSaving(false);
    }
  };

  const handleGoneQuietResponseChange = async (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;
    if (!value || !client) return;
    if (goneQuietResponseResetTimerRef.current) {
      clearTimeout(goneQuietResponseResetTimerRef.current);
      goneQuietResponseResetTimerRef.current = null;
    }
    setGoneQuietResponseValue(value);
    setGoneQuietResponseSaving(true);
    try {
      const today = localCalendarDateYyyyMmDd();
      const createdAt = new Date().toISOString();
      await dbExecute(
        `INSERT INTO intervention_logs
         (id, client_id, signal_type, signal_date, response_type, response_date, response_notes, outcome, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          client.id,
          'gone_quiet',
          today,
          value,
          today,
          null,
          null,
          createdAt,
        ]
      );
      setGoneQuietResponseLogged(true);
      goneQuietResponseResetTimerRef.current = setTimeout(() => {
        setGoneQuietResponseValue('');
        setGoneQuietResponseLogged(false);
        goneQuietResponseResetTimerRef.current = null;
      }, 2000);
    } catch (e) {
      console.error('intervention_logs insert failed:', e);
      setGoneQuietResponseValue('');
    } finally {
      setGoneQuietResponseSaving(false);
    }
  };

  const handlePinkFlagResponseChange = async (
    flag: string,
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;
    if (!value || !client) return;
    const prevTimer = pinkFlagResponseTimersRef.current.get(flag);
    if (prevTimer) {
      clearTimeout(prevTimer);
      pinkFlagResponseTimersRef.current.delete(flag);
    }
    setPinkFlagResponseValues((prev) => ({ ...prev, [flag]: value }));
    setPinkFlagResponseSaving((prev) => ({ ...prev, [flag]: true }));
    try {
      const today = localCalendarDateYyyyMmDd();
      const createdAt = new Date().toISOString();
      await dbExecute(
        `INSERT INTO intervention_logs
         (id, client_id, signal_type, signal_date, response_type, response_date, response_notes, outcome, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          client.id,
          'pink_flag',
          today,
          value,
          today,
          null,
          null,
          createdAt,
        ]
      );
      setPinkFlagResponseLogged((prev) => ({ ...prev, [flag]: true }));
      const t = setTimeout(() => {
        setPinkFlagResponseValues((prev) => {
          const next = { ...prev };
          delete next[flag];
          return next;
        });
        setPinkFlagResponseLogged((prev) => {
          const next = { ...prev };
          delete next[flag];
          return next;
        });
        pinkFlagResponseTimersRef.current.delete(flag);
      }, 2000);
      pinkFlagResponseTimersRef.current.set(flag, t);
    } catch (e) {
      console.error('intervention_logs insert failed (pink_flag):', e);
      setPinkFlagResponseValues((prev) => {
        const next = { ...prev };
        delete next[flag];
        return next;
      });
    } finally {
      setPinkFlagResponseSaving((prev) => {
        const next = { ...prev };
        delete next[flag];
        return next;
      });
    }
  };

  const handleSaveGoldenRules = async () => {
    if (!client) return;
    const ob = (client.outcome_bucket ?? '').toLowerCase();
    if (ob !== 'converted') return;
    setGoldenRulesSaving(true);
    setGoldenRulesSavedConfirm(false);
    try {
      const trimmed = goldenRulesDraft.trim();
      const now = new Date().toISOString();
      await dbExecute(
        `UPDATE clients SET golden_rules_notes = ?, updated_at = ? WHERE id = ?`,
        [trimmed, now, client.id]
      );
      setGoldenRulesHasPersisted(trimmed.length > 0);
      setGoldenRulesSavedConfirm(true);
      const detailsSnippet =
        trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed;
      await logEntry(
        'golden_rule_saved',
        client.id,
        null,
        detailsSnippet || null,
        null,
        'deterministic'
      );
    } catch (e) {
      console.error('golden_rules_notes save failed:', e);
    } finally {
      setGoldenRulesSaving(false);
    }
  };

  const handlePlacementPocMark = async () => {
    if (!client || !shouldShowPlacementMilestones(client)) return;
    const d = pocDateDraft.trim();
    if (!d) return;
    setPlacementMilestoneSaving('poc');
    try {
      const now = new Date().toISOString();
      await dbExecute(
        `UPDATE clients SET poc_reached_date = ?, updated_at = ? WHERE id = ?`,
        [d, now, client.id]
      );
      setPlacementPocReached(d);
      await logEntry(
        'placement_milestone_set',
        client.id,
        null,
        `Point of Clarity: ${d}`,
        null,
        'deterministic'
      );
    } catch (e) {
      console.error('placement POC save failed:', e);
    } finally {
      setPlacementMilestoneSaving(null);
    }
  };

  const handlePlacementPocClear = async () => {
    if (!client || !shouldShowPlacementMilestones(client)) return;
    setPlacementMilestoneSaving('clear_poc');
    try {
      const now = new Date().toISOString();
      await dbExecute(
        `UPDATE clients SET poc_reached_date = NULL, updated_at = ? WHERE id = ?`,
        [now, client.id]
      );
      setPlacementPocReached(null);
      setPocDateDraft(localCalendarDateYyyyMmDd());
      await logEntry(
        'placement_milestone_set',
        client.id,
        null,
        'Point of Clarity: cleared',
        null,
        'deterministic'
      );
    } catch (e) {
      console.error('placement POC clear failed:', e);
    } finally {
      setPlacementMilestoneSaving(null);
    }
  };

  const handlePlacementTriggerMark = async () => {
    if (!client || !shouldShowPlacementMilestones(client)) return;
    if (!placementPocReached) return;
    const d = triggerDateDraft.trim();
    if (!d) return;
    setPlacementMilestoneSaving('trigger');
    try {
      const now = new Date().toISOString();
      await dbExecute(
        `UPDATE clients SET trigger_submitted_date = ?, updated_at = ? WHERE id = ?`,
        [d, now, client.id]
      );
      setPlacementTriggerSubmitted(d);
      await logEntry(
        'placement_milestone_set',
        client.id,
        null,
        `Trigger Submitted: ${d}`,
        null,
        'deterministic'
      );
    } catch (e) {
      console.error('placement trigger save failed:', e);
    } finally {
      setPlacementMilestoneSaving(null);
    }
  };

  const handlePlacementTriggerClear = async () => {
    if (!client || !shouldShowPlacementMilestones(client)) return;
    setPlacementMilestoneSaving('clear_trigger');
    try {
      const now = new Date().toISOString();
      await dbExecute(
        `UPDATE clients SET trigger_submitted_date = NULL, updated_at = ? WHERE id = ?`,
        [now, client.id]
      );
      setPlacementTriggerSubmitted(null);
      setTriggerDateDraft(localCalendarDateYyyyMmDd());
      await logEntry(
        'placement_milestone_set',
        client.id,
        null,
        'Trigger Submitted: cleared',
        null,
        'deterministic'
      );
    } catch (e) {
      console.error('placement trigger clear failed:', e);
    } finally {
      setPlacementMilestoneSaving(null);
    }
  };

  const handlePlacementPurchaseMark = async () => {
    if (!client || !shouldShowPlacementMilestones(client)) return;
    if (!placementTriggerSubmitted) return;
    const d = purchaseDateDraft.trim();
    if (!d) return;
    const rev = purchaseRevenueDraft.trim() || null;
    setPlacementMilestoneSaving('purchase');
    try {
      const now = new Date().toISOString();
      await dbExecute(
        `UPDATE clients SET business_purchase_date = ?, placement_revenue = ?, updated_at = ? WHERE id = ?`,
        [d, rev, now, client.id]
      );
      setPlacementBusinessPurchase(d);
      setPlacementRevenueStored(rev);
      await logEntry(
        'placement_milestone_set',
        client.id,
        null,
        `Business Purchase: ${d}${rev ? `; ${rev}` : ''}`,
        null,
        'deterministic'
      );
    } catch (e) {
      console.error('placement purchase save failed:', e);
    } finally {
      setPlacementMilestoneSaving(null);
    }
  };

  const handlePlacementPurchaseClear = async () => {
    if (!client || !shouldShowPlacementMilestones(client)) return;
    setPlacementMilestoneSaving('clear_purchase');
    try {
      const now = new Date().toISOString();
      await dbExecute(
        `UPDATE clients SET business_purchase_date = NULL, placement_revenue = NULL, updated_at = ? WHERE id = ?`,
        [now, client.id]
      );
      setPlacementBusinessPurchase(null);
      setPlacementRevenueStored(null);
      setPurchaseDateDraft(localCalendarDateYyyyMmDd());
      setPurchaseRevenueDraft('');
      await logEntry(
        'placement_milestone_set',
        client.id,
        null,
        'Business Purchase: cleared',
        null,
        'deterministic'
      );
    } catch (e) {
      console.error('placement purchase clear failed:', e);
    } finally {
      setPlacementMilestoneSaving(null);
    }
  };

  const handleSaveTerritoryCheck = () => {
    if (!client) return;
    try {
      localStorage.setItem(
        territoryCheckStorageKey(client.id),
        territoryCheckDraft
      );
      setTerritoryCheckSavedMsg(true);
    } catch (e) {
      console.error('territory check localStorage save failed:', e);
    }
  };

  const handleGenerateVision = async () => {
    if (!client?.id) return;
    setVisionGenError(null);
    setVisionApproveMsg(null);
    setVisionGenerating(true);
    try {
      const result = await generateVisionStatement(client.id);
      await saveVisionStatement(client.id, result);
      setVisionEditText(result.trim());
      setVisionDraftMode(true);
      onVisionUpdated?.();
    } catch {
      setVisionGenError('Generation failed. Is Ollama running?');
    } finally {
      setVisionGenerating(false);
    }
  };

  const handleRegenerateVision = async () => {
    if (!client?.id) return;
    setVisionGenError(null);
    setVisionApproveMsg(null);
    setVisionGenerating(true);
    try {
      const result = await generateVisionStatement(client.id);
      setVisionEditText(result.trim());
      await saveVisionStatement(client.id, result.trim());
      onVisionUpdated?.();
    } catch {
      setVisionGenError('Generation failed. Is Ollama running?');
    } finally {
      setVisionGenerating(false);
    }
  };

  const handleApproveVision = async () => {
    if (!client?.id) return;
    setVisionGenError(null);
    try {
      await approveVisionStatement(client.id, visionEditText.trim());
      setVisionDraftMode(false);
      setVisionApproveMsg('Vision statement approved and saved');
      onVisionUpdated?.();
    } catch (e) {
      console.error(e);
      setVisionGenError('Could not approve vision. Try again.');
    }
  };

  const handleMarkPinkFlagResolved = async (flagName: string) => {
    if (!client) return;
    const allFlags = parseClientPinkFlagsJson(localPinkFlagsJson);
    const idx = allFlags.findIndex((f) => f === flagName);
    if (idx === -1) return;
    setResolvingPinkFlag(flagName);
    try {
      const updatedFlags = [...allFlags];
      updatedFlags[idx] = `resolved:${flagName}`;
      const serialized = JSON.stringify(updatedFlags);
      const iso = new Date().toISOString();
      await dbExecute(
        `UPDATE clients
         SET pink_flags = ?, updated_at = ?
         WHERE id = ?`,
        [serialized, iso, client.id]
      );
      await dbExecute(
        `INSERT INTO audit_log
         (action_type, client_id, input_data, output_data, reasoning, model_used)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'PINK_FLAG_RESOLVED',
          client.id,
          flagName,
          `resolved:${flagName}`,
          'Sandi marked flag as addressed',
          'deterministic',
        ]
      );
      setLocalPinkFlagsJson(serialized);
      getStageReadiness(client.id).then(setReadiness);
    } finally {
      setResolvingPinkFlag(null);
    }
  };

  const blockDefinitions = [
    { key: 'block_opening', title: 'Session Opening', icon: '🎯', color: 'text-blue-700', checklist: 'Session Opening — confirm energy and contracting' },
    { key: 'block_emotional', title: 'Emotional Discovery', icon: '💭', color: 'text-purple-700', checklist: 'Emotional Discovery — ask what feelings emerged' },
    { key: 'block_life_context', title: 'Life Context', icon: '🏠', color: 'text-green-700', checklist: 'Life Context — update family and financial context' },
    { key: 'block_vision', title: 'Vision and Possibility', icon: '🌟', color: 'text-amber-700', checklist: 'Vision — help client describe future life' },
    { key: 'block_disc_signals', title: 'DISC Signals', icon: '🧠', color: 'text-teal-700', checklist: 'DISC Signals — capture observed style and match' },
    { key: 'block_objections', title: 'Objections and Blockers', icon: '⚠️', color: 'text-red-700', checklist: 'Objections — capture blockers and pink-flag language' },
    { key: 'block_commitments', title: 'Commitments', icon: '✅', color: 'text-green-700', checklist: 'Commitments — lock next client-owned action' },
    { key: 'block_reflection_block', title: 'Reflection', icon: '💡', color: 'text-yellow-700', checklist: 'Reflection — surface insight and mindset shift' },
    { key: 'block_coach_assessment', title: 'Coach Assessment', icon: '📊', color: 'text-blue-700', checklist: 'Coach Assessment — record your recommendation' },
  ] as const;

  const parseSessionBlock = (raw: string | null): Record<string, unknown> | null => {
    const parsed = safeParseJson(raw ?? '');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  };

  const discUi = CI_DISC_STYLE[client.disc.style];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showInactivateConfirm ? (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
          style={{ borderColor: '#C8E8E5', background: '#FEFAF5' }}
        >
          <p className="max-w-xl text-sm" style={{ color: '#2D4459' }}>
            Inactivate <span className="font-semibold">{client.name}</span>? They will be removed from
            your active pipeline but all data is preserved. You can reactivate them at any time.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowInactivateConfirm(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-slate-600 text-white hover:bg-slate-700"
              onClick={handleInactivate}
            >
              Inactivate
            </Button>
          </div>
        </div>
      ) : null}

      <div
        className="mb-5 flex min-w-0 flex-wrap items-start justify-between gap-4"
        style={{ marginBottom: 20 }}
      >
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{ backgroundColor: discUi.muted, color: discUi.solid }}
          >
            {client.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold" style={{ fontSize: 24, color: '#2D4459' }}>
              {client.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium" style={{ color: '#7A8F95' }}>
                {discStyleLabel}
              </span>
              <Badge
                className="border-0 text-xs font-semibold text-slate-800"
                style={{
                  backgroundColor: getStageBadgeColor(client.inferred_stage?.trim() ?? ''),
                }}
              >
                {getStageDisplayName(client.inferred_stage?.trim() ?? '')}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getBucketDisplayName(client.outcome_bucket)}
              </Badge>
              {activePinkFlags.length > 0 ? (
                <Badge
                  className="min-h-6 min-w-6 shrink-0 border-0 bg-red-600 px-2 text-xs font-bold text-white hover:bg-red-600"
                  title={`${activePinkFlags.length} active pink flag(s)`}
                >
                  {activePinkFlags.length}
                </Badge>
              ) : null}
            </div>
            <div className="mt-1 text-xs" style={{ color: '#7A8F95' }}>
              {[contact.email, contact.phone].filter(Boolean).join(' · ') || '—'}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {onInactivate ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#2D4459] hover:bg-[#C8E8E5]/30"
              onClick={() => setShowInactivateConfirm(true)}
            >
              Inactivate
            </Button>
          ) : null}
          {isEditingLastContact ? (
            <div className="flex flex-col items-end gap-2">
              <Input
                type="date"
                value={lastContactDraft}
                onChange={(e) => setLastContactDraft(e.target.value)}
                className="w-[11rem]"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#3BBFBF] text-white hover:bg-[#3BBFBF]/90"
                  onClick={() => {
                    void handleSaveLastContact();
                  }}
                  disabled={isSavingLastContact || !lastContactDraft.trim()}
                >
                  {isSavingLastContact ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingLastContact(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-[11px] font-medium" style={{ color: '#7A8F95' }}>
                  Last contacted
                </p>
                <p className="text-sm" style={{ color: '#2D4459' }}>
                  {lastContactedDisplay}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-[#3BBFBF] hover:text-[#3BBFBF]"
                onClick={() => {
                  const db = lastContactDateDb?.trim();
                  setLastContactDraft(
                    db
                      ? toDateInputValue(db)
                      : mostRecentSessionDate
                        ? toDateInputValue(mostRecentSessionDate)
                        : ''
                  );
                  setIsEditingLastContact(true);
                }}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs value={detailTab} onValueChange={setDetailTab} className="flex min-h-0 flex-1 flex-col">
        <div
          className="shrink-0 border border-b-0 px-1"
          style={{ background: 'white', borderColor: '#C8E8E5', borderRadius: '12px 12px 0 0' }}
        >
          <TabsList className="mb-0 grid h-auto w-full grid-cols-7 gap-0 rounded-none border-0 bg-transparent p-1">
            <TabsTrigger
              value="overview"
              className="rounded-md border-0 border-b-[3px] border-transparent bg-transparent px-2 py-2.5 text-sm font-medium shadow-none data-[state=active]:border-[#3BBFBF] data-[state=active]:bg-transparent data-[state=active]:text-[#3BBFBF] data-[state=inactive]:text-[#7A8F95]"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="disc"
              className="rounded-md border-0 border-b-[3px] border-transparent bg-transparent px-2 py-2.5 text-sm font-medium shadow-none data-[state=active]:border-[#3BBFBF] data-[state=active]:bg-transparent data-[state=active]:text-[#3BBFBF] data-[state=inactive]:text-[#7A8F95]"
            >
              DISC
            </TabsTrigger>
            <TabsTrigger
              value="you2"
              className="rounded-md border-0 border-b-[3px] border-transparent bg-transparent px-2 py-2.5 text-sm font-medium shadow-none data-[state=active]:border-[#3BBFBF] data-[state=active]:bg-transparent data-[state=active]:text-[#3BBFBF] data-[state=inactive]:text-[#7A8F95]"
            >
              You 2.0
            </TabsTrigger>
            <TabsTrigger
              value="tumay"
              className="rounded-md border-0 border-b-[3px] border-transparent bg-transparent px-2 py-2.5 text-sm font-medium shadow-none data-[state=active]:border-[#3BBFBF] data-[state=active]:bg-transparent data-[state=active]:text-[#3BBFBF] data-[state=inactive]:text-[#7A8F95]"
            >
              TUMAY
            </TabsTrigger>
            <TabsTrigger
              value="vision"
              className="rounded-md border-0 border-b-[3px] border-transparent bg-transparent px-2 py-2.5 text-sm font-medium shadow-none data-[state=active]:border-[#3BBFBF] data-[state=active]:bg-transparent data-[state=active]:text-[#3BBFBF] data-[state=inactive]:text-[#7A8F95]"
            >
              Vision
            </TabsTrigger>
            <TabsTrigger
              value="fathom"
              className="rounded-md border-0 border-b-[3px] border-transparent bg-transparent px-2 py-2.5 text-sm font-medium shadow-none data-[state=active]:border-[#3BBFBF] data-[state=active]:bg-transparent data-[state=active]:text-[#3BBFBF] data-[state=inactive]:text-[#7A8F95]"
            >
              Fathom
            </TabsTrigger>
            <TabsTrigger
              value="reminders"
              className="rounded-md border-0 border-b-[3px] border-transparent bg-transparent px-2 py-2.5 text-sm font-medium shadow-none data-[state=active]:border-[#3BBFBF] data-[state=active]:bg-transparent data-[state=active]:text-[#3BBFBF] data-[state=inactive]:text-[#7A8F95]"
            >
              Reminders
            </TabsTrigger>
          </TabsList>
        </div>

        <div
          className="flex min-h-[400px] min-h-0 flex-1 flex-col overflow-y-auto border border-t-0"
          style={{ background: 'white', borderColor: '#C8E8E5', borderRadius: '0 0 12px 12px' }}
        >
          <TabsContent value="overview" className="h-full min-h-0 mt-0 focus-visible:outline-none">
            <div className="overflow-y-auto h-full max-h-[75vh] p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge
                    className="text-slate-800"
                    style={{
                      backgroundColor: getStageBadgeColor(
                        resolvedPipelineCode ??
                          client.inferred_stage?.trim() ??
                          ''
                      ),
                    }}
                  >
                    {stageLabel}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-2">
                    {stageCompartmentSubtitle}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Persona</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{client.persona}</p>
                  <div className="mt-2 flex flex-col gap-2">
                    <RecommendationBadge
                      action={
                        readiness?.recommendation ??
                        client.recommendationFromReadiness ??
                        client.recommendation
                      }
                      confidence={client.confidence}
                    />
                    {shouldShowGoneQuietBadge(client) && (
                      <>
                        <Badge
                          className="w-fit border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100"
                        >
                          <Clock
                            className="mr-1 h-3.5 w-3.5 shrink-0"
                            aria-hidden
                          />
                          {formatGoneQuietLabel(client.gone_quiet_days)}
                        </Badge>
                        <div className="mt-2 max-w-md space-y-1.5">
                          <Label
                            htmlFor="gone-quiet-response"
                            className="text-xs font-medium text-slate-600"
                          >
                            Log your response
                          </Label>
                          <select
                            id="gone-quiet-response"
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
                            value={goneQuietResponseValue}
                            disabled={goneQuietResponseSaving}
                            onChange={(e) => {
                              void handleGoneQuietResponseChange(e);
                            }}
                          >
                            <option value="">{GONE_QUIET_RESPONSE_PLACEHOLDER}</option>
                            {GONE_QUIET_RESPONSE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          {goneQuietResponseLogged ? (
                            <p className="text-sm font-medium text-green-600">
                              Response logged
                            </p>
                          ) : null}
                        </div>
                        <p className="max-w-md text-xs italic text-slate-500">
                          {GONE_QUIET_SESSION_DISCLAIMER}
                        </p>
                        {goneQuietReengagementTipText ? (
                          <p className="max-w-md text-xs italic text-slate-500">
                            {goneQuietReengagementTipText}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Readiness</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Readiness Score</span>
                      <span className="text-sm font-bold text-slate-900">{readinessScorePct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, readinessScorePct))}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">
                  Pink flags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activePinkFlags.length === 0 ? (
                  <p className="text-sm text-slate-500">No active flags</p>
                ) : (
                  <ul className="space-y-2">
                    {activePinkFlags.map((flag, pinkFlagIdx) => (
                      <li
                        key={flag}
                        className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-red-900">
                            <AlertTriangle
                              className="h-4 w-4 shrink-0 text-amber-600"
                              aria-hidden
                            />
                            {pinkFlagDisplayName(flag)}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-800 hover:bg-red-100 hover:text-red-900"
                            disabled={resolvingPinkFlag === flag}
                            onClick={() => handleMarkPinkFlagResolved(flag)}
                          >
                            {resolvingPinkFlag === flag
                              ? 'Saving…'
                              : 'Mark Resolved'}
                          </Button>
                        </div>
                        <div className="space-y-1.5 border-t border-red-100 pt-2">
                          <Label
                            htmlFor={`pink-flag-response-${client.id}-${pinkFlagIdx}`}
                            className="text-xs font-medium text-slate-600"
                          >
                            Log your response
                          </Label>
                          <select
                            id={`pink-flag-response-${client.id}-${pinkFlagIdx}`}
                            className="w-full max-w-md rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
                            value={pinkFlagResponseValues[flag] ?? ''}
                            disabled={Boolean(pinkFlagResponseSaving[flag])}
                            onChange={(e) => {
                              void handlePinkFlagResponseChange(flag, e);
                            }}
                          >
                            <option value="">{GONE_QUIET_RESPONSE_PLACEHOLDER}</option>
                            {PINK_FLAG_RESPONSE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          {pinkFlagResponseLogged[flag] ? (
                            <p className="text-sm font-medium text-green-600">
                              Response logged
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {resolvedPinkFlags.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      Addressed Flags
                    </p>
                    <ul className="space-y-2">
                      {resolvedPinkFlags.map((flag, i) => (
                        <li
                          key={`${flag}-${i}`}
                          className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-900"
                        >
                          <Check
                            className="h-4 w-4 shrink-0 text-green-600"
                            aria-hidden
                          />
                          {pinkFlagDisplayName(flag)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setContactDraft({
                        email: contact.email ?? '',
                        phone: contact.phone ?? '',
                        company: contact.company ?? '',
                      });
                      setIsEditingContact((v) => !v);
                    }}
                  >
                    {isEditingContact ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {isEditingContact ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={contactDraft.email}
                        onChange={(e) => setContactDraft((prev) => ({ ...prev, email: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={contactDraft.phone}
                        onChange={(e) => setContactDraft((prev) => ({ ...prev, phone: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input
                        value={contactDraft.company}
                        onChange={(e) => setContactDraft((prev) => ({ ...prev, company: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      type="button"
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                      onClick={handleSaveContact}
                      disabled={isSavingContact}
                    >
                      {isSavingContact ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">{contact.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">{contact.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">{contact.company || '—'}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-slate-100 pt-3 mt-1 space-y-2">
                  {isEditingLastContact ? (
                    <div className="space-y-2">
                      <Label htmlFor="last-contact-date">Last Contacted</Label>
                      <Input
                        id="last-contact-date"
                        type="date"
                        value={lastContactDraft}
                        onChange={(e) => setLastContactDraft(e.target.value)}
                        className="mt-1 max-w-[12rem]"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                          onClick={handleSaveLastContact}
                          disabled={isSavingLastContact || !lastContactDraft.trim()}
                        >
                          {isSavingLastContact ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingLastContact(false)}
                          disabled={isSavingLastContact}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <Calendar
                          className="h-4 w-4 text-slate-400 shrink-0 mt-0.5"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">Last Contacted</p>
                          <p className="text-sm">{lastContactedDisplay}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          const db = lastContactDateDb?.trim();
                          setLastContactDraft(
                            db
                              ? toDateInputValue(db)
                              : mostRecentSessionDate
                                ? toDateInputValue(mostRecentSessionDate)
                                : ''
                          );
                          setIsEditingLastContact(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {readiness && (
              <Card className="readiness-card">
                <CardHeader>
                  <CardTitle className="text-lg">Stage Readiness</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="recommendation-badge inline-flex px-3 py-1.5 rounded-lg font-semibold text-sm"
                    data-rec={readiness.recommendation}
                    style={{
                      backgroundColor:
                        readiness.recommendation === 'VALIDATE'
                          ? '#22c55e'
                          : readiness.recommendation === 'GATHER'
                            ? '#f59e0b'
                            : '#ef4444',
                      color: 'white',
                    }}
                  >
                    {readiness.recommendation}
                  </div>
                  <p className="text-sm text-slate-600">{readiness.recommendation_reason}</p>
                  <div className="why-here">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      Why at {getStageDisplayName(readiness.current_stage)}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                      {readiness.why_here.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="what-needed">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      To advance to{' '}
                      {readiness.next_stage
                        ? getStageDisplayName(readiness.next_stage)
                        : '—'}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                      {readiness.what_is_needed.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  {readiness.ready_to_advance && readiness.next_stage && (
                    <Button
                      onClick={() => {
                        const nextStage = readiness.next_stage;
                        const reason = prompt(
                          `Reason for moving to ${readiness.next_stage_full}?`
                        );
                        if (reason && nextStage) {
                          moveClientStage(
                            readiness.client_id,
                            nextStage,
                            reason,
                            'Sandi Stahl'
                          ).then(() => {
                            getStageReadiness(readiness.client_id).then(setReadiness);
                          });
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Move to{' '}
                      {readiness.next_stage
                        ? getStageDisplayName(readiness.next_stage)
                        : '—'}{' '}
                      →
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Coaching Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {client.notes.length === 0 ? (
                    <li className="text-sm text-slate-500">No notes yet.</li>
                  ) : (
                    client.notes.map((note, i) => (
                      <li
                        key={i}
                        className="text-sm text-slate-600 flex items-start gap-2 p-2 rounded bg-slate-50"
                      >
                        <span className="text-blue-500 mt-0.5">•</span>
                        {note}
                      </li>
                    ))
                  )}
                </ul>
              </CardContent>
            </Card>

            {shouldShowPlacementMilestones(client) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Placement Milestones
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    Track progress toward business purchase
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2 border-b border-slate-100 pb-4">
                    <p className="text-sm font-semibold text-slate-800">
                      Point of Clarity reached
                    </p>
                    {placementPocReached ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Check
                          className="h-4 w-4 shrink-0 text-green-600"
                          aria-hidden
                        />
                        <span className="text-slate-700">
                          {formatLastContactDisplay(placementPocReached)}
                        </span>
                        <button
                          type="button"
                          className="text-sm text-slate-500 underline hover:text-slate-800 disabled:opacity-50"
                          disabled={placementMilestoneSaving !== null}
                          onClick={() => {
                            void handlePlacementPocClear();
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-end gap-2">
                          <div>
                            <Label
                              htmlFor="placement-poc-date"
                              className="text-xs text-slate-600"
                            >
                              Date
                            </Label>
                            <Input
                              id="placement-poc-date"
                              type="date"
                              className="mt-1 w-full max-w-[11rem]"
                              value={pocDateDraft}
                              onChange={(e) => setPocDateDraft(e.target.value)}
                              disabled={placementMilestoneSaving !== null}
                            />
                          </div>
                          <Button
                            type="button"
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                            disabled={
                              placementMilestoneSaving !== null ||
                              !pocDateDraft.trim()
                            }
                            onClick={() => {
                              void handlePlacementPocMark();
                            }}
                          >
                            {placementMilestoneSaving === 'poc'
                              ? 'Saving…'
                              : 'Mark Reached'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-b border-slate-100 pb-4">
                    <p className="text-sm font-semibold text-slate-800">
                      Trigger Submitted
                    </p>
                    {placementTriggerSubmitted ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Check
                          className="h-4 w-4 shrink-0 text-green-600"
                          aria-hidden
                        />
                        <span className="text-slate-700">
                          {formatLastContactDisplay(placementTriggerSubmitted)}
                        </span>
                        <button
                          type="button"
                          className="text-sm text-slate-500 underline hover:text-slate-800 disabled:opacity-50"
                          disabled={placementMilestoneSaving !== null}
                          onClick={() => {
                            void handlePlacementTriggerClear();
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {!placementPocReached ? (
                          <p className="text-sm text-slate-500">Mark POC first</p>
                        ) : null}
                        <div className="flex flex-wrap items-end gap-2">
                          <div>
                            <Label
                              htmlFor="placement-trigger-date"
                              className="text-xs text-slate-600"
                            >
                              Date
                            </Label>
                            <Input
                              id="placement-trigger-date"
                              type="date"
                              className="mt-1 w-full max-w-[11rem]"
                              value={triggerDateDraft}
                              onChange={(e) =>
                                setTriggerDateDraft(e.target.value)
                              }
                              disabled={
                                placementMilestoneSaving !== null ||
                                !placementPocReached
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                            disabled={
                              placementMilestoneSaving !== null ||
                              !placementPocReached ||
                              !triggerDateDraft.trim()
                            }
                            onClick={() => {
                              void handlePlacementTriggerMark();
                            }}
                          >
                            {placementMilestoneSaving === 'trigger'
                              ? 'Saving…'
                              : 'Mark Submitted'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-800">
                      Business Purchase
                    </p>
                    {placementBusinessPurchase ? (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <Check
                          className="h-4 w-4 shrink-0 text-green-600"
                          aria-hidden
                        />
                        <span className="text-slate-700">
                          {formatLastContactDisplay(placementBusinessPurchase)}
                        </span>
                        {placementRevenueStored ? (
                          <span className="text-slate-600">
                            · {placementRevenueStored}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="text-sm text-slate-500 underline hover:text-slate-800 disabled:opacity-50"
                          disabled={placementMilestoneSaving !== null}
                          onClick={() => {
                            void handlePlacementPurchaseClear();
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {!placementTriggerSubmitted ? (
                          <p className="text-sm text-slate-500">
                            Mark Trigger first
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-end gap-2">
                          <div>
                            <Label
                              htmlFor="placement-purchase-date"
                              className="text-xs text-slate-600"
                            >
                              Date
                            </Label>
                            <Input
                              id="placement-purchase-date"
                              type="date"
                              className="mt-1 w-full max-w-[11rem]"
                              value={purchaseDateDraft}
                              onChange={(e) =>
                                setPurchaseDateDraft(e.target.value)
                              }
                              disabled={
                                placementMilestoneSaving !== null ||
                                !placementTriggerSubmitted
                              }
                            />
                          </div>
                          <div className="min-w-[8rem] flex-1 max-w-xs">
                            <Label
                              htmlFor="placement-purchase-revenue"
                              className="text-xs text-slate-600"
                            >
                              Revenue
                            </Label>
                            <Input
                              id="placement-purchase-revenue"
                              type="text"
                              className="mt-1 w-full"
                              placeholder="$28,000"
                              value={purchaseRevenueDraft}
                              onChange={(e) =>
                                setPurchaseRevenueDraft(e.target.value)
                              }
                              disabled={
                                placementMilestoneSaving !== null ||
                                !placementTriggerSubmitted
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                            disabled={
                              placementMilestoneSaving !== null ||
                              !placementTriggerSubmitted ||
                              !purchaseDateDraft.trim()
                            }
                            onClick={() => {
                              void handlePlacementPurchaseMark();
                            }}
                          >
                            {placementMilestoneSaving === 'purchase'
                              ? 'Saving…'
                              : 'Mark Complete'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {(client.outcome_bucket ?? '').toLowerCase() === 'converted' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Golden Rules
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    What made this client convert?
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    rows={4}
                    className="w-full min-h-0 resize-y"
                    placeholder={GOLDEN_RULES_TEXTAREA_PLACEHOLDER}
                    value={goldenRulesDraft}
                    onChange={(e) => {
                      setGoldenRulesDraft(e.target.value);
                      setGoldenRulesSavedConfirm(false);
                    }}
                  />
                  <Button
                    type="button"
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => {
                      void handleSaveGoldenRules();
                    }}
                    disabled={goldenRulesSaving}
                  >
                    {goldenRulesSaving
                      ? 'Saving…'
                      : goldenRulesHasPersisted
                        ? 'Update Golden Rule'
                        : 'Save Golden Rule'}
                  </Button>
                  {goldenRulesSavedConfirm ? (
                    <p className="text-sm font-medium text-green-600">
                      Golden rule saved
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )}
            </div>
          </TabsContent>

          <TabsContent value="disc" className="h-full min-h-0 mt-0">
            <div className="overflow-y-auto h-full max-h-[75vh] p-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DISCBadge style={modalDiscStyle} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-semibold text-slate-700">{discStyleLabel}</p>
                <p className="text-slate-600">{DISC_STYLE_DESCRIPTIONS[modalDiscStyle]}</p>

                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Key Traits</p>
                  <div className="flex flex-wrap gap-2">
                    {DISC_TRAITS[modalDiscStyle].map((trait, i) => (
                      <Badge key={i} variant="secondary" className="rounded-full">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Scores</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'D', value: Number(discScores?.d ?? 0), color: '#DC2626' },
                      { label: 'I', value: Number(discScores?.i ?? 0), color: '#D97706' },
                      { label: 'S', value: Number(discScores?.s ?? 0), color: '#16A34A' },
                      { label: 'C', value: Number(discScores?.c ?? 0), color: '#2563EB' },
                    ].map((score) => (
                      <div key={score.label} className="rounded-lg border p-2">
                        <div className="text-xs font-semibold text-slate-600 mb-2">{score.label}</div>
                        <div className="h-28 w-full rounded bg-slate-100 relative overflow-hidden">
                          <div
                            className="absolute bottom-0 left-0 right-0"
                            style={{
                              height: `${Math.max(0, Math.min(100, score.value))}%`,
                              backgroundColor: score.color,
                            }}
                          />
                        </div>
                        <div className="mt-1 text-center text-xs font-medium text-slate-700">{score.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Coaching Tips</p>
                  <ul className="space-y-1">
                    {DISC_COACHING_TIPS[modalDiscStyle].map((tip, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {discScores === null && (
                  <p className="text-xs text-slate-500">
                    No DISC scores recorded yet.
                  </p>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="you2" className="h-full min-h-0 mt-0">
            <div className="overflow-y-auto h-full max-h-[75vh] p-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">You 2.0 Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-slate-700 italic">
                    &quot;{you2Vision || 'No statement yet'}&quot;
                  </p>
                </div>
              </CardContent>
            </Card>
            {you2Details && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">You 2.0 Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  {you2Details.spouse_name && <p><span className="font-semibold">Spouse:</span> {you2Details.spouse_name}</p>}
                  {you2Details.financial_net_worth_range && <p><span className="font-semibold">Net worth range:</span> {you2Details.financial_net_worth_range}</p>}
                  {you2Details.credit_score !== null && <p><span className="font-semibold">Credit score:</span> {you2Details.credit_score}</p>}
                  {you2Details.launch_timeline && <p><span className="font-semibold">Launch timeline:</span> {you2Details.launch_timeline}</p>}
                  {you2Details.time_commitment && <p><span className="font-semibold">Time commitment:</span> {you2Details.time_commitment}</p>}
                  {you2Details.areas_of_interest.length > 0 && (
                    <div>
                      <p className="font-semibold mb-1">Areas of interest:</p>
                      <ul className="space-y-1">
                        {you2Details.areas_of_interest.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-teal-600">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {you2Details.skills.length > 0 && (
                    <div>
                      <p className="font-semibold mb-1">Skills:</p>
                      <ul className="space-y-1">
                        {you2Details.skills.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-teal-600">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {you2Details.reasons_for_change.length > 0 && (
                    <div>
                      <p className="font-semibold mb-1">Reasons for change:</p>
                      <ul className="space-y-1">
                        {you2Details.reasons_for_change.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-teal-600">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {you2Details && (you2Details.dangers.length > 0 || you2Details.opportunities.length > 0 || you2Details.strengths.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      Dangers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {you2Details.dangers.map((danger, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          {danger}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {you2Details.opportunities.map((opp, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
            {you2Details && you2Details.strengths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {you2Details.strengths.map((strength, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            </div>
          </TabsContent>

          <TabsContent value="tumay" className="h-full min-h-0 mt-0">
            <div className="overflow-y-auto h-full max-h-[75vh] p-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">TUMAY Data</CardTitle>
              </CardHeader>
              <CardContent>
                {tumayData ? (
                  <div className="space-y-5 text-sm text-slate-700">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2">Personal Info</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div><span className="font-medium">Contact Name:</span> {toDisplayValue(tumayData.contact_name ?? client.name)}</div>
                        <div><span className="font-medium">Email:</span> {toDisplayValue(tumayData.email ?? contact.email)}</div>
                        <div><span className="font-medium">Phone:</span> {toDisplayValue(tumayData.phone ?? contact.phone)}</div>
                        <div><span className="font-medium">City + State:</span> {toDisplayValue([tumayData.city, tumayData.state].filter(Boolean).join(', '))}</div>
                        <div><span className="font-medium">Timeline:</span> {toDisplayValue(tumayData.launch_timeline)}</div>
                        <div><span className="font-medium">Time Commitment:</span> {toDisplayValue(tumayData.time_commitment)}</div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2">Financial Profile</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><span className="font-medium">Credit Score:</span> {toDisplayValue(tumayData.credit_score)}</div>
                        <div><span className="font-medium">Net Worth Range:</span> {toDisplayValue(tumayData.financial_net_worth_range)}</div>
                        <div><span className="font-medium">Future Growth:</span> {toDisplayValue(tumayData.future_growth)}</div>
                        <div><span className="font-medium">Funding Education:</span> {toDisplayValue(tumayData.funding_education)}</div>
                      </div>
                    </div>

                    {String(tumayData.spouse_name ?? '').trim() ? (
                      <div>
                        <p className="text-sm font-semibold text-slate-900 mb-2">Spouse/Partner</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div><span className="font-medium">Name:</span> {toDisplayValue(tumayData.spouse_name)}</div>
                          <div><span className="font-medium">Role:</span> {toDisplayValue(tumayData.spouse_role)}</div>
                          <div><span className="font-medium">On Calls:</span> {toDisplayValue(tumayData.spouse_on_calls)}</div>
                        </div>
                        <p className="mt-2"><span className="font-medium">Mindset:</span> {toDisplayValue(tumayData.spouse_mindset)}</p>
                      </div>
                    ) : null}

                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2">Industries of Interest</p>
                      <div className="flex flex-wrap gap-2">
                        {parseListField(tumayData.areas_of_interest).length > 0 ? (
                          parseListField(tumayData.areas_of_interest).map((item, idx) => (
                            <Badge key={`${item}-${idx}`} className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                              {item}
                            </Badge>
                          ))
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2">Why Now</p>
                      <p>{toDisplayValue(tumayData.self_sufficiency_excitement)}</p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2">Reasons for Change</p>
                      {parseListField(tumayData.reasons_for_change).length > 0 ? (
                        <ul className="space-y-1">
                          {parseListField(tumayData.reasons_for_change).map((item, idx) => (
                            <li key={`${item}-${idx}`} className="flex items-start gap-2">
                              <span className="text-slate-400">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>—</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-600">No TUMAY data yet.</p>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="vision" className="h-full min-h-0 mt-0">
            <div className="overflow-y-auto h-full max-h-[75vh] p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Current Vision Statement
                </h3>
                {visionIsApproved ? (
                  <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100">
                    Approved
                  </Badge>
                ) : null}
              </div>
              {visionIsApproved &&
              formatVisionApprovedDateLabel(client.vision_approved_date) ? (
                <p className="text-xs text-slate-500">
                  {formatVisionApprovedDateLabel(client.vision_approved_date)}
                </p>
              ) : null}
              {!persistedVisionText ? (
                <p className="text-sm text-slate-500">
                  No vision statement yet.
                  <br />
                  Click Generate to create one from this client&apos;s DISC, You 2.0, and
                  Fathom data.
                </p>
              ) : (
                <div
                  className="rounded-lg border border-[#e2e8f0] text-[14px] leading-[1.7] text-slate-800 whitespace-pre-wrap"
                  style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 8 }}
                >
                  {persistedVisionText}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-900">
                Generate / Edit
              </h3>
              <Button
                type="button"
                onClick={() => void handleGenerateVision()}
                disabled={visionGenerating || !client.id}
              >
                {visionGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Vision Statement'
                )}
              </Button>
              {visionGenError ? (
                <p className="text-sm text-red-600">{visionGenError}</p>
              ) : null}
              {visionApproveMsg ? (
                <p className="text-sm font-medium text-green-600">{visionApproveMsg}</p>
              ) : null}
              {visionDraftMode ? (
                <div className="space-y-3">
                  <Textarea
                    rows={12}
                    className="w-full min-h-0 resize-y font-sans text-sm leading-relaxed"
                    value={visionEditText}
                    onChange={(e) => setVisionEditText(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="bg-green-600 text-white hover:bg-green-700"
                      onClick={() => void handleApproveVision()}
                      disabled={visionGenerating}
                    >
                      Approve Vision
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleRegenerateVision()}
                      disabled={visionGenerating}
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Territory Check
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Paste territory check results here before generating the vision
                  statement.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="territory-check-results">
                    Territory Check Results
                  </Label>
                  <Textarea
                    id="territory-check-results"
                    rows={6}
                    className="mt-1 w-full min-h-0 resize-y"
                    placeholder={TERRITORY_CHECK_TEXTAREA_PLACEHOLDER}
                    value={territoryCheckDraft}
                    onChange={(e) => {
                      setTerritoryCheckDraft(e.target.value);
                      setTerritoryCheckSavedMsg(false);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={handleSaveTerritoryCheck}
                >
                  Save Territory Notes
                </Button>
                {territoryCheckSavedMsg ? (
                  <p className="text-sm font-medium text-green-600">
                    Territory notes saved. These will be included when you
                    generate the vision statement.
                  </p>
                ) : null}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="fathom" className="h-full min-h-0 mt-0">
            <div className="overflow-y-auto h-full max-h-[75vh] p-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Session Manually</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="manual-session-date">Session Date</Label>
                  <Input
                    id="manual-session-date"
                    type="date"
                    className="mt-1 w-full max-w-xs"
                    value={manualSessionDate}
                    onChange={(e) => {
                      setManualSessionDate(e.target.value);
                      setManualSessionConfirm(null);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="manual-session-notes">
                    Session Notes (optional)
                  </Label>
                  <Textarea
                    id="manual-session-notes"
                    rows={2}
                    className="mt-1 w-full"
                    placeholder="Brief notes about this session"
                    value={manualSessionNotes}
                    onChange={(e) => {
                      setManualSessionNotes(e.target.value);
                      setManualSessionConfirm(null);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => {
                    void handleAddManualSession();
                  }}
                  disabled={manualSessionSaving || !manualSessionDate.trim()}
                >
                  {manualSessionSaving ? 'Adding…' : 'Add Session'}
                </Button>
                {manualSessionConfirm ? (
                  <p className="text-sm font-medium text-green-600">
                    Session added for {manualSessionConfirm}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Fathom Notes</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddNote((v) => !v)}
                  >
                    {showAddNote ? 'Cancel' : 'Add Note'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showAddNote && (
                  <div className="mb-4 p-3 rounded-lg border bg-white space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Session Date</Label>
                        <Input
                          type="date"
                          value={noteDraft.session_date}
                          onChange={(e) => setNoteDraft((prev) => ({ ...prev, session_date: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Stage</Label>
                        <select
                          className="mt-1 w-full border rounded-md h-10 px-3 text-sm"
                          value={noteDraft.stage}
                          onChange={(e) =>
                            setNoteDraft((prev) => ({
                              ...prev,
                              stage: e.target.value as 'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5',
                            }))
                          }
                        >
                          {(
                            [
                              'IC',
                              'C1',
                              'C2',
                              'C3',
                              'C4',
                              'C5',
                            ] as const
                          ).map((code) => (
                            <option key={code} value={code}>
                              {getStageDisplayName(code)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        rows={3}
                        value={noteDraft.notes}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, notes: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Next Steps</Label>
                      <Textarea
                        rows={2}
                        value={noteDraft.next_actions}
                        onChange={(e) => setNoteDraft((prev) => ({ ...prev, next_actions: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      type="button"
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                    >
                      {isSavingNote ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
                {fathomSessionCount === 0 ? (
                  <p className="text-slate-600">No sessions recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {fathomSessions.map((s, idx) => {
                      const opening = parseSessionBlock(s.block_opening);
                      const emotional = parseSessionBlock(s.block_emotional);
                      const life = parseSessionBlock(s.block_life_context);
                      const vision = parseSessionBlock(s.block_vision);
                      const disc = parseSessionBlock(s.block_disc_signals);
                      const objections = parseSessionBlock(s.block_objections);
                      const commitments = parseSessionBlock(s.block_commitments);
                      const reflection = parseSessionBlock(s.block_reflection_block);
                      const assessment = parseSessionBlock(s.block_coach_assessment);
                      const isStructured = [opening, emotional, life, vision, disc, objections, commitments, reflection, assessment]
                        .some((v) => v !== null);
                      const blocksComplete = Number(s.blocks_complete ?? 0);
                      const missingForSession = blockDefinitions.filter((d) => parseSessionBlock(s[d.key]) === null);
                      const parsedNotes = safeParseJson(s.notes ?? '');
                      const legacySummary =
                        parsedNotes && typeof parsedNotes === 'object'
                          ? String((parsedNotes as { summary?: unknown }).summary ?? '').trim()
                          : '';
                      const legacyNotes = legacySummary
                        || (s.notes && s.notes.trim() !== '{}' ? s.notes : '')
                        || 'No notes recorded for this session.';

                      return (
                        <div key={`${s.id}-${idx}`} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {s.session_date || 'Date not recorded'} |{' '}
                              {getStageDisplayName(
                                String(s.stage ?? '').trim()
                              )}{' '}
                              | {blocksComplete}/9 blocks
                            </p>
                            <div className="flex items-center gap-2">
                              {!isStructured && (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                  Pre-structure session
                                </Badge>
                              )}
                              {s.overall_clear_score !== null && (
                                <Badge variant="outline" className="text-xs">
                                  CLEAR {Number(s.overall_clear_score).toFixed(1)}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {!isStructured ? (
                            <div className="space-y-2">
                              <p className="text-sm text-slate-700">{legacyNotes}</p>
                              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                                <p className="text-sm font-semibold text-amber-900">NEXT CALL PLANNING</p>
                                <p className="text-sm text-amber-800 mb-2">Missing from last session — address next call:</p>
                                <ul className="space-y-1">
                                  {blockDefinitions.map((block) => (
                                    <li key={block.key} className="text-sm text-amber-900 flex items-start gap-2">
                                      <span>- [ ]</span>
                                      <span>{block.checklist}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <details open className="rounded border p-2 bg-white">
                                <summary className="font-medium text-blue-700">🎯 Session Opening</summary>
                                <div className="mt-2 text-sm space-y-1">
                                  <div>Energy: <Badge variant="outline">{toDisplayValue(opening?.client_energy)}</Badge></div>
                                  <div>Contracting: {opening?.contracting_done ? '✓' : '✗'}</div>
                                  <div>Client set agenda: {opening?.client_set_agenda ? '✓' : '✗'}</div>
                                  <p>{toDisplayValue(opening?.opening_summary)}</p>
                                </div>
                              </details>
                              <details className="rounded border p-2 bg-white">
                                <summary className="font-medium text-purple-700">💭 Emotional Discovery</summary>
                                <div className="mt-2 text-sm space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    {parseListField(emotional?.emotions_expressed).map((v, i) => <Badge key={`e-${i}`} className="bg-purple-100 text-purple-800 hover:bg-purple-100">{v}</Badge>)}
                                  </div>
                                  <ul className="list-disc list-inside">{parseListField(emotional?.fears_mentioned).map((v, i) => <li key={`f-${i}`}>{v}</li>)}</ul>
                                  <blockquote className="border-l-2 pl-2 text-slate-700">{parseListField(emotional?.identity_statements).join(' | ') || '—'}</blockquote>
                                </div>
                              </details>
                              <details className="rounded border p-2 bg-white">
                                <summary className="font-medium text-green-700">🏠 Life Context</summary>
                                <div className="mt-2 text-sm space-y-1">
                                  <div className="flex gap-2 flex-wrap">
                                    <Badge variant="outline">{toDisplayValue(life?.spouse_sentiment)}</Badge>
                                    <Badge variant="outline">{toDisplayValue(life?.current_job_situation)}</Badge>
                                    <Badge variant="outline">{toDisplayValue(life?.financial_comfort)}</Badge>
                                  </div>
                                  <p>{toDisplayValue(life?.personal_circumstances)}</p>
                                </div>
                              </details>
                              <details className="rounded border p-2 bg-white">
                                <summary className="font-medium text-amber-700">🌟 Vision and Possibility</summary>
                                <div className="mt-2 text-sm space-y-1">
                                  <div>Future described: {vision?.future_life_described ? '✓' : '✗'}</div>
                                  <ul className="list-disc list-inside">{parseListField(vision?.lifestyle_details).map((v, i) => <li key={`l-${i}`}>{v}</li>)}</ul>
                                  <div className="flex flex-wrap gap-2">{parseListField(vision?.business_models_discussed).map((v, i) => <Badge key={`bm-${i}`} variant="secondary">{v}</Badge>)}</div>
                                  <div>Ownership identity: <Badge variant="outline">{toDisplayValue(vision?.ownership_identity)}</Badge></div>
                                </div>
                              </details>
                              <details className="rounded border p-2 bg-white">
                                <summary className="font-medium text-teal-700">🧠 DISC Signals</summary>
                                <div className="mt-2 text-sm space-y-1">
                                  <div>Observed style: <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">{toDisplayValue(disc?.observed_style)}</Badge></div>
                                  <ul className="list-disc list-inside">{parseListField(disc?.style_observations).map((v, i) => <li key={`so-${i}`}>{v}</li>)}</ul>
                                  <div>Matches profile: {disc?.matches_profile ? '✓' : '✗'}</div>
                                  <p className="italic">{toDisplayValue(disc?.coaching_note)}</p>
                                </div>
                              </details>
                              <details className="rounded border p-2 bg-white">
                                <summary className="font-medium text-red-700">⚠️ Objections and Blockers</summary>
                                <div className="mt-2 text-sm space-y-1">
                                  <ul className="list-disc list-inside">{parseListField(objections?.objections).map((v, i) => <li key={`o-${i}`}>{v}</li>)}</ul>
                                  <div className="flex flex-wrap gap-2">{parseListField(objections?.pink_flag_language).map((v, i) => <Badge key={`pfl-${i}`} className="bg-red-100 text-red-800 hover:bg-red-100">{v}</Badge>)}</div>
                                  <p className="font-medium">Repeat: {parseListField(objections?.repeat_objections).join(', ') || '—'}</p>
                                </div>
                              </details>
                              <details className="rounded border p-2 bg-white">
                                <summary className="font-medium text-green-700">✅ Commitments</summary>
                                <div className="mt-2 text-sm space-y-1">
                                  <ul className="list-disc list-inside">{parseListField(commitments?.client_commitments).map((v, i) => <li key={`cc-${i}`}>{v}</li>)}</ul>
                                  <div>Client chose action: {commitments?.client_chose_action ? '✓' : '✗'}</div>
                                  <div>Next call: {toDisplayValue(commitments?.next_call_date)}</div>
                                </div>
                              </details>
                              <details className="rounded border p-2 bg-white">
                                <summary className="font-medium text-yellow-700">💡 Reflection</summary>
                                <div className="mt-2 text-sm space-y-1">
                                  <blockquote className="border-l-2 pl-2">{toDisplayValue(reflection?.insight_surfaced)}</blockquote>
                                  <p>{toDisplayValue(reflection?.mindset_shift)}</p>
                                  <Badge variant="outline">{toDisplayValue(reflection?.engagement_quality)}</Badge>
                                </div>
                              </details>
                              <details className="rounded border p-2 bg-white">
                                <summary className="font-medium text-blue-700">📊 Coach Assessment</summary>
                                <div className="mt-2 text-sm space-y-2">
                                  <Badge
                                    className={
                                      String(assessment?.recommendation ?? '') === 'VALIDATE'
                                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                        : String(assessment?.recommendation ?? '') === 'PAUSE'
                                          ? 'bg-slate-200 text-slate-800 hover:bg-slate-200'
                                          : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                    }
                                  >
                                    {toDisplayValue(assessment?.recommendation)}
                                  </Badge>
                                  <p>
                                    {String(assessment?.readiness_direction ?? '') === 'improving'
                                      ? '↑ '
                                      : String(assessment?.readiness_direction ?? '') === 'declining'
                                        ? '↓ '
                                        : '→ '}
                                    {toDisplayValue(assessment?.readiness_direction)}
                                  </p>
                                  <p>{toDisplayValue(assessment?.next_call_focus)}</p>
                                  <div className="rounded bg-blue-50 p-2 text-blue-900">
                                    {toDisplayValue(assessment?.priority_question)}
                                  </div>
                                </div>
                              </details>

                              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                <p className="text-sm font-semibold text-slate-900">NEXT CALL PLANNING</p>
                                {missingForSession.length > 0 ? (
                                  <>
                                    <p className="text-sm text-slate-700 mb-2">Missing from last session — address next call:</p>
                                    <ul className="space-y-1">
                                      {missingForSession.map((block) => (
                                        <li key={block.key} className="text-sm text-slate-800 flex items-start gap-2">
                                          <span>- [ ]</span>
                                          <span>{block.checklist}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                ) : (
                                  <p className="text-sm text-green-700">✓ Complete session record</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {(() => {
                      const last = fathomSessions[0];
                      if (!last) return null;
                      const missingLast = blockDefinitions.filter((d) => parseSessionBlock(last[d.key]) === null);
                      return (
                        <div className="rounded-md border border-slate-300 bg-white p-4">
                          <p className="text-sm font-semibold text-slate-900">NEXT CALL PLANNING</p>
                          {missingLast.length > 0 ? (
                            <>
                              <p className="text-sm text-slate-700 mb-2">Missing from last session — address next call:</p>
                              <ul className="space-y-1">
                                {missingLast.map((block) => (
                                  <li key={`last-${block.key}`} className="text-sm text-slate-800 flex items-start gap-2">
                                    <span>- [ ]</span>
                                    <span>{block.checklist}</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            <p className="text-sm text-green-700">✓ Complete session record</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="reminders" className="h-full min-h-0 mt-0 focus-visible:outline-none">
            <div className="overflow-y-auto h-full max-h-[75vh] p-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reminders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    Reminders coming in Phase 6. Set follow-up dates and task reminders for any client.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
        </Tabs>
    </div>
  );
}

function StatusBadge({
  status,
  label: _label,
}: {
  status: 'complete' | 'pending' | 'confirmed' | 'manual';
  label: string;
}) {
  if (status === 'confirmed') {
    return (
      <Badge className="bg-green-600 text-white">
        <Check className="h-3 w-3 mr-1" />
        Confirmed
      </Badge>
    );
  }
  if (status === 'manual') {
    return (
      <Badge className="bg-amber-600 text-white">
        <Check className="h-3 w-3 mr-1" />
        Manual
      </Badge>
    );
  }
  if (status === 'complete') {
    return (
      <Badge className="bg-blue-600 text-white">
        <Check className="h-3 w-3 mr-1" />
        Complete
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-500 text-amber-700">
      <AlertCircle className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  );
}

function DataReviewModal({
  clientId,
  clientName,
  isOpen,
  onClose,
  onSaved,
}: {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [you2Data, setYou2Data] = useState<You2ReviewData | null>(null);
  const [discData, setDiscData] = useState<DiscReviewData | null>(null);
  const [you2Edits, setYou2Edits] = useState<Partial<You2ReviewData>>({});
  const [discEdits, setDiscEdits] = useState<Partial<DiscReviewData>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !clientId) return;
    setLoading(true);
    Promise.all([
      getClientYou2ForReview(clientId),
      getClientDiscForReview(clientId),
    ])
      .then(([you2, disc]) => {
        setYou2Data(you2 ?? null);
        setDiscData(disc ?? null);
        setYou2Edits(you2 ?? {});
        setDiscEdits(disc ?? {});
      })
      .finally(() => setLoading(false));
  }, [isOpen, clientId]);

  const handleConfirmYou2 = async () => {
    setSaving(true);
    try {
      await confirmYou2Data(clientId, you2Edits, CONFIRMED_BY);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDisc = async (isManual: boolean) => {
    setSaving(true);
    try {
      await saveDiscData(clientId, discEdits, CONFIRMED_BY, isManual);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatForEdit = (arr: unknown): string => {
    if (Array.isArray(arr)) return arr.map(String).join('\n');
    if (typeof arr === 'string') {
      try {
        const parsed = JSON.parse(arr);
        return Array.isArray(parsed) ? parsed.join('\n') : arr;
      } catch {
        return arr;
      }
    }
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Data Review — {clientName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <SkeletonCard lines={6} lineHeight={16} />
        ) : (
          <div className="space-y-6">
            {/* You2 section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">You 2.0</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {you2Data ? (
                  <>
                    <div>
                      <Label>One year vision</Label>
                      <Textarea
                        value={you2Edits.one_year_vision ?? you2Data.one_year_vision ?? ''}
                        onChange={(e) =>
                          setYou2Edits((p) => ({ ...p, one_year_vision: e.target.value }))
                        }
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Spouse name</Label>
                        <Input
                          value={you2Edits.spouse_name ?? you2Data.spouse_name ?? ''}
                          onChange={(e) =>
                            setYou2Edits((p) => ({ ...p, spouse_name: e.target.value }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Spouse role</Label>
                        <Input
                          value={you2Edits.spouse_role ?? you2Data.spouse_role ?? ''}
                          onChange={(e) =>
                            setYou2Edits((p) => ({ ...p, spouse_role: e.target.value }))
                          }
                          className="mt-1"
                          placeholder="owner|employee|unsure|none"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Spouse mindset</Label>
                        <Textarea
                          value={you2Edits.spouse_mindset ?? you2Data.spouse_mindset ?? ''}
                          onChange={(e) =>
                            setYou2Edits((p) => ({ ...p, spouse_mindset: e.target.value }))
                          }
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Credit score</Label>
                        <Input
                          type="number"
                          value={you2Edits.credit_score ?? you2Data.credit_score ?? ''}
                          onChange={(e) =>
                            setYou2Edits((p) => ({
                              ...p,
                              credit_score: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Net worth range</Label>
                        <Input
                          value={
                            you2Edits.financial_net_worth_range ??
                            you2Data.financial_net_worth_range ??
                            ''
                          }
                          onChange={(e) =>
                            setYou2Edits((p) => ({
                              ...p,
                              financial_net_worth_range: e.target.value,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Launch timeline</Label>
                        <Input
                          value={you2Edits.launch_timeline ?? you2Data.launch_timeline ?? ''}
                          onChange={(e) =>
                            setYou2Edits((p) => ({ ...p, launch_timeline: e.target.value }))
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Dangers (one per line)</Label>
                      <Textarea
                        value={formatForEdit(
                          you2Edits.dangers ?? you2Data.dangers ?? '[]'
                        )}
                        onChange={(e) =>
                          setYou2Edits((p) => ({
                            ...p,
                            dangers: JSON.stringify(
                              e.target.value.split('\n').filter(Boolean)
                            ),
                          }))
                        }
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Strengths (one per line)</Label>
                      <Textarea
                        value={formatForEdit(
                          you2Edits.strengths ?? you2Data.strengths ?? '[]'
                        )}
                        onChange={(e) =>
                          setYou2Edits((p) => ({
                            ...p,
                            strengths: JSON.stringify(
                              e.target.value.split('\n').filter(Boolean)
                            ),
                          }))
                        }
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={handleConfirmYou2}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Confirm You2
                    </Button>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">No You 2.0 data yet.</p>
                )}
              </CardContent>
            </Card>

            {/* DISC section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">DISC</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {discData || discEdits.natural_d !== undefined ? (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>Natural D</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={
                            discEdits.natural_d ?? discData?.natural_d ?? ''
                          }
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              natural_d: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Natural I</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={
                            discEdits.natural_i ?? discData?.natural_i ?? ''
                          }
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              natural_i: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Natural S</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={
                            discEdits.natural_s ?? discData?.natural_s ?? ''
                          }
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              natural_s: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Natural C</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={
                            discEdits.natural_c ?? discData?.natural_c ?? ''
                          }
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              natural_c: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>Adapted D</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={
                            discEdits.adapted_d ?? discData?.adapted_d ?? ''
                          }
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              adapted_d: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Adapted I</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={
                            discEdits.adapted_i ?? discData?.adapted_i ?? ''
                          }
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              adapted_i: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Adapted S</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={
                            discEdits.adapted_s ?? discData?.adapted_s ?? ''
                          }
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              adapted_s: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Adapted C</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={
                            discEdits.adapted_c ?? discData?.adapted_c ?? ''
                          }
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              adapted_c: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Style label</Label>
                      <Input
                        value={
                          discEdits.primary_style_label ??
                          discData?.primary_style_label ??
                          ''
                        }
                        onChange={(e) =>
                          setDiscEdits((p) => ({
                            ...p,
                            primary_style_label: e.target.value,
                          }))
                        }
                        className="mt-1"
                        placeholder="e.g. SUPPORTING COORDINATOR"
                      />
                    </div>
                    <div>
                      <Label>Style combination</Label>
                      <Input
                        value={
                          discEdits.primary_style_combination ??
                          discData?.primary_style_combination ??
                          ''
                        }
                        onChange={(e) =>
                          setDiscEdits((p) => ({
                            ...p,
                            primary_style_combination: e.target.value,
                          }))
                        }
                        className="mt-1"
                        placeholder="e.g. SC"
                      />
                    </div>
                    <div>
                      <Label>Communication DOs</Label>
                      <Textarea
                        value={formatForEdit(
                          discEdits.communication_dos ??
                            discData?.communication_dos ??
                            '[]'
                        )}
                        onChange={(e) =>
                          setDiscEdits((p) => ({
                            ...p,
                            communication_dos: JSON.stringify(
                              e.target.value.split('\n').filter(Boolean)
                            ),
                          }))
                        }
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Communication DON&apos;Ts</Label>
                      <Textarea
                        value={formatForEdit(
                          discEdits.communication_donts ??
                            discData?.communication_donts ??
                            '[]'
                        )}
                        onChange={(e) =>
                          setDiscEdits((p) => ({
                            ...p,
                            communication_donts: JSON.stringify(
                              e.target.value.split('\n').filter(Boolean)
                            ),
                          }))
                        }
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConfirmDisc(false)}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Confirm DISC
                      </Button>
                      {!discData && (
                        <Button
                          onClick={() => handleConfirmDisc(true)}
                          disabled={saving}
                          variant="outline"
                        >
                          Enter Manually
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-slate-500 text-sm mb-4">
                      No DISC data yet. Enter manually from the TTI report.
                    </p>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>Natural D</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={discEdits.natural_d ?? ''}
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              natural_d: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Natural I</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={discEdits.natural_i ?? ''}
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              natural_i: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Natural S</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={discEdits.natural_s ?? ''}
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              natural_s: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Natural C</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={discEdits.natural_c ?? ''}
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              natural_c: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>Adapted D</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={discEdits.adapted_d ?? ''}
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              adapted_d: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Adapted I</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={discEdits.adapted_i ?? ''}
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              adapted_i: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Adapted S</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={discEdits.adapted_s ?? ''}
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              adapted_s: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Adapted C</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={discEdits.adapted_c ?? ''}
                          onChange={(e) =>
                            setDiscEdits((p) => ({
                              ...p,
                              adapted_c: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Style label</Label>
                      <Input
                        value={discEdits.primary_style_label ?? ''}
                        onChange={(e) =>
                          setDiscEdits((p) => ({
                            ...p,
                            primary_style_label: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Style combination</Label>
                      <Input
                        value={discEdits.primary_style_combination ?? ''}
                        onChange={(e) =>
                          setDiscEdits((p) => ({
                            ...p,
                            primary_style_combination: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={() => handleConfirmDisc(true)}
                      disabled={saving}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Enter Manually
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ClientIntelligence() {
  const [mainTab, setMainTab] = useState<'clients' | 'review'>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [sidebarRecFilter, setSidebarRecFilter] = useState<SidebarRecFilter>('all');
  const [showSidebarCreate, setShowSidebarCreate] = useState(false);
  const [reviewClients, setReviewClients] = useState<
    Array<{
      id: string;
      name: string;
      outcome_bucket: string;
      you2_status: 'complete' | 'pending' | 'confirmed';
      disc_status: 'complete' | 'pending' | 'confirmed' | 'manual';
    }>
  >([]);
  const [selectedReviewClient, setSelectedReviewClient] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const [discProfiles, setDiscProfiles] = useState<Awaited<ReturnType<typeof getDiscProfilesMap>>>(new Map());
  const [readinessMap, setReadinessMap] = useState<Map<string, number>>(new Map());
  const [recommendationById, setRecommendationById] = useState<
    Map<string, Recommendation>
  >(new Map());
  const [goneQuietById, setGoneQuietById] = useState<
    Map<string, { gone_quiet: boolean; gone_quiet_days: number }>
  >(new Map());
  const [discDerivedMap, setDiscDerivedMap] = useState<Map<string, { style: 'D' | 'I' | 'S' | 'C'; label: string }>>(new Map());

  const loadClients = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      getAllClients(),
      getDiscProfilesMap(),
      getAllStageReadiness(),
      dbSelect<{
        client_id: string;
        natural_d: number | null;
        natural_i: number | null;
        natural_s: number | null;
        natural_c: number | null;
      }>(
        `SELECT client_id, natural_d, natural_i, natural_s, natural_c
         FROM client_disc_profiles`,
        []
      ),
    ])
      .then(([c, profiles, readiness, discRows]) => {
        setClients(c);
        setDiscProfiles(profiles);
        const rMap = new Map<string, number>();
        const recMap = new Map<string, Recommendation>();
        const gqMap = new Map<
          string,
          { gone_quiet: boolean; gone_quiet_days: number }
        >();
        readiness.forEach((r) => {
          rMap.set(r.client_id, r.readiness_score);
          recMap.set(r.client_id, r.recommendation);
          gqMap.set(r.client_id, {
            gone_quiet: Boolean(r.gone_quiet),
            gone_quiet_days: Number(r.gone_quiet_days ?? 0),
          });
        });
        setReadinessMap(rMap);
        setRecommendationById(recMap);
        setGoneQuietById(gqMap);
        const dMap = new Map<string, { style: 'D' | 'I' | 'S' | 'C'; label: string }>();
        discRows.forEach((row) => {
          const style = deriveStyleLetter(
            Number(row.natural_d ?? 0),
            Number(row.natural_i ?? 0),
            Number(row.natural_s ?? 0),
            Number(row.natural_c ?? 0)
          );
          const label = deriveStyleLabel(
            Number(row.natural_d ?? 0),
            Number(row.natural_i ?? 0),
            Number(row.natural_s ?? 0),
            Number(row.natural_c ?? 0)
          );
          dMap.set(row.client_id, { style, label });
        });
        setDiscDerivedMap(dMap);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err?.message ?? err ?? 'Failed to load clients'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClients();
  }, []);

  const loadReviewClients = () => {
    getAllClientsForReview()
      .then((r) => setReviewClients(r.clients))
      .catch((err) => console.error('Failed to load review list:', err));
  };

  useEffect(() => {
    if (mainTab === 'review') loadReviewClients();
  }, [mainTab]);

  const handleCreateClient = async () => {
    if (!createName.trim()) return;
    try {
      await createClient({ name: createName.trim(), stage: 'Initial Contact' });
      setCreateName('');
      setShowSidebarCreate(false);
      loadClients();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInactivateClient = async (id: string) => {
    try {
      await inactivateClient(id);
      setSelectedClient(null);
      loadClients();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if ((client.outcome_bucket ?? '').toLowerCase() === 'inactive') {
        return false;
      }
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const stageCode = resolvePipelineStageCode(client.inferred_stage);
      const matchesStage = selectedStage === 'all' || stageCode === selectedStage;
      const rec = recommendationById.get(client.id);
      let matchesRec = true;
      if (sidebarRecFilter === 'VALIDATE') matchesRec = rec === 'VALIDATE';
      else if (sidebarRecFilter === 'GATHER') matchesRec = rec === 'GATHER';
      else if (sidebarRecFilter === 'PAUSE') matchesRec = rec === 'PAUSE';
      else if (sidebarRecFilter === 'gone_quiet')
        matchesRec = Boolean(goneQuietById.get(client.id)?.gone_quiet);
      return matchesSearch && matchesStage && matchesRec;
    });
  }, [clients, searchTerm, selectedStage, sidebarRecFilter, recommendationById, goneQuietById]);

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
  };

  const displayClients = useMemo(
    () =>
      filteredClients.map((client) => {
        const gq = goneQuietById.get(client.id);
        const rawVision = client as Client & {
          vision_approved?: number | null;
          vision_approved_date?: string | null;
        };
        return {
          ...clientToDisplay(client, {
            disc: discDerivedMap.get(client.id) ?? discProfiles.get(client.id),
            readinessScore: readinessMap.get(client.id),
          }),
          gone_quiet: gq?.gone_quiet,
          gone_quiet_days: gq?.gone_quiet_days,
          recommendationFromReadiness: recommendationById.get(client.id),
          vision_approved: rawVision.vision_approved ?? null,
          vision_approved_date: rawVision.vision_approved_date ?? null,
        } satisfies DisplayClient;
      }),
    [
      filteredClients,
      discDerivedMap,
      discProfiles,
      readinessMap,
      recommendationById,
      goneQuietById,
    ]
  );
  const selectedDisplay: DisplayClient | null = selectedClient
    ? (() => {
        const gq = goneQuietById.get(selectedClient.id);
        const rawVision = selectedClient as Client & {
          vision_approved?: number | null;
          vision_approved_date?: string | null;
        };
        return {
          ...clientToDisplay(selectedClient, {
            disc:
              discDerivedMap.get(selectedClient.id) ??
              discProfiles.get(selectedClient.id),
            readinessScore: readinessMap.get(selectedClient.id),
          }),
          gone_quiet: gq?.gone_quiet,
          gone_quiet_days: gq?.gone_quiet_days,
          recommendationFromReadiness: recommendationById.get(selectedClient.id),
          vision_approved: rawVision.vision_approved ?? null,
          vision_approved_date: rawVision.vision_approved_date ?? null,
        };
      })()
    : null;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonCard lines={4} lineHeight={20} />
        <SkeletonCard lines={3} lineHeight={16} />
        <SkeletonCard lines={5} lineHeight={14} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FeedbackButton pageName="Client Intelligence" />
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'clients' | 'review')}>
        <TabsList className="mb-4">
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Data Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-0 flex min-h-0 min-h-[calc(100dvh-200px)] flex-1 flex-col p-0">
          <div className="flex min-h-0 min-h-[calc(100dvh-200px)] w-full flex-1 overflow-hidden rounded-lg border border-[#C8E8E5] bg-white">
            <aside
              className="flex w-[260px] shrink-0 flex-col overflow-y-auto border-r border-[#C8E8E5] bg-white"
              style={{ maxHeight: 'calc(100dvh - 200px)' }}
            >
              <div className="shrink-0 space-y-3 p-3">
                <input
                  type="search"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-[#C8E8E5] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3BBFBF]/40"
                  style={{ background: '#F4F7F8', padding: '8px 12px', borderRadius: 8 }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { key: 'all' as const, label: 'All' },
                      { key: 'VALIDATE' as const, label: 'VALIDATE' },
                      { key: 'GATHER' as const, label: 'GATHER' },
                      { key: 'PAUSE' as const, label: 'PAUSE' },
                      { key: 'gone_quiet' as const, label: 'Gone Quiet' },
                    ] as const
                  ).map(({ key, label }) => {
                    const sel = sidebarRecFilter === key;
                    const base =
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors border';
                    let cls = base;
                    if (key === 'all') {
                      cls += sel
                        ? ' border-[#3BBFBF] bg-[#C8E8E5]/30 text-[#2D4459]'
                        : ' border-transparent bg-[#F4F7F8] text-[#7A8F95] hover:bg-[#F4F7F8]/80';
                    } else if (key === 'VALIDATE') {
                      cls += sel
                        ? ' border-[#3BBFBF] bg-[#3BBFBF]/15 text-[#3BBFBF]'
                        : ' border-transparent bg-[#F4F7F8] text-[#7A8F95] hover:bg-[#3BBFBF]/10';
                    } else if (key === 'GATHER') {
                      cls += sel
                        ? ' border-amber-400 bg-amber-50 text-amber-800'
                        : ' border-transparent bg-[#F4F7F8] text-[#7A8F95] hover:bg-amber-50/80';
                    } else if (key === 'PAUSE') {
                      cls += sel
                        ? ' border-slate-400 bg-slate-100 text-slate-700'
                        : ' border-transparent bg-[#F4F7F8] text-[#7A8F95] hover:bg-slate-50';
                    } else {
                      cls += sel
                        ? ' border-[#F05F57] bg-[#F05F57]/12 text-[#F05F57]'
                        : ' border-transparent bg-[#F4F7F8] text-[#7A8F95] hover:bg-[#F05F57]/10';
                    }
                    return (
                      <button
                        key={key}
                        type="button"
                        className={cls}
                        onClick={() => setSidebarRecFilter(key)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full rounded-lg border border-[#C8E8E5] bg-white px-2 py-2 text-xs font-medium text-[#2D4459] outline-none focus:ring-2 focus:ring-[#3BBFBF]/40"
                >
                  <option value="all">All Stages</option>
                  {(['IC', 'C1', 'C2', 'C3', 'C4', 'C5'] as const).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-[#C8E8E5] text-[#2D4459]"
                  onClick={() => setShowSidebarCreate((v) => !v)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {showSidebarCreate ? 'Cancel' : 'New client'}
                </Button>
                {showSidebarCreate ? (
                  <div className="space-y-2 rounded-lg border border-[#C8E8E5] bg-[#F4F7F8] p-2">
                    <Input
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="Client name"
                      className="bg-white text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="w-full bg-[#3BBFBF] text-white hover:bg-[#3BBFBF]/90"
                      onClick={() => void handleCreateClient()}
                      disabled={!createName.trim()}
                    >
                      Create
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {displayClients.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs" style={{ color: '#7A8F95' }}>
                    No clients match filters.
                  </p>
                ) : (
                  displayClients.map((dc) => {
                    const raw = filteredClients.find((c) => c.id === dc.id);
                    if (!raw) return null;
                    const selected = selectedClient?.id === raw.id;
                    const discSt = dc.disc.style;
                    const ring = CI_DISC_STYLE[discSt];
                    const pinkN = countActivePinkFlagsOnClient(raw);
                    const gq = shouldShowGoneQuietBadge(dc);
                    const rec = dc.recommendationFromReadiness ?? 'GATHER';
                    return (
                      <button
                        key={raw.id}
                        type="button"
                        onClick={() => handleClientClick(raw)}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-2 border-b border-[#F4F7F8] text-left transition-colors',
                          selected ? 'bg-[#C8E8E5]/20' : 'hover:bg-[#F4F7F8]'
                        )}
                        style={{
                          minHeight: 64,
                          padding: '10px 14px',
                          borderLeft: selected ? '3px solid #3BBFBF' : '3px solid transparent',
                        }}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ backgroundColor: ring.muted, color: ring.solid }}
                        >
                          {dc.avatar}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold" style={{ fontSize: 13, color: '#2D4459' }}>
                            {dc.name}
                          </p>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            <span
                              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-800"
                              style={{
                                backgroundColor: getStageBadgeColor(dc.inferred_stage?.trim() ?? ''),
                              }}
                            >
                              {resolvePipelineStageCode(dc.inferred_stage) ?? '—'}
                            </span>
                            <span className="inline-block rounded border border-[#C8E8E5] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#7A8F95]">
                              {getBucketDisplayName(raw.outcome_bucket)}
                            </span>
                            {rec === 'VALIDATE' || rec === 'GATHER' || rec === 'PAUSE' ? (
                              <span
                                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
                                style={{
                                  backgroundColor:
                                    rec === 'VALIDATE'
                                      ? 'rgba(59, 191, 191, 0.15)'
                                      : rec === 'GATHER'
                                        ? 'rgba(245, 158, 11, 0.15)'
                                        : 'rgba(107, 114, 128, 0.15)',
                                  color:
                                    rec === 'VALIDATE'
                                      ? '#3BBFBF'
                                      : rec === 'GATHER'
                                        ? '#D97706'
                                        : '#6B7280',
                                }}
                              >
                                {rec}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {pinkN > 0 ? (
                            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {pinkN}
                            </span>
                          ) : null}
                          {gq ? (
                            <Clock className="h-4 w-4 text-amber-500" aria-hidden title="Gone quiet" />
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
            <div
              className="min-h-0 min-w-0 flex-1 overflow-y-auto"
              style={{ background: '#FEFAF5', padding: '24px 28px' }}
            >
              {selectedDisplay ? (
                <ClientDetailModal
                  client={selectedDisplay}
                  onInactivate={handleInactivateClient}
                  onVisionUpdated={loadClients}
                />
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center">
                  <Users className="h-16 w-16" style={{ color: '#C8E8E5' }} aria-hidden />
                  <p className="text-sm" style={{ color: '#7A8F95' }}>
                    Select a client to view their profile
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="review" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Extraction Review — Human in the Loop</CardTitle>
              <p className="text-sm text-slate-500">
                Review extracted data, correct errors, and manually enter DISC scores for failed extractions.
              </p>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Client Name</th>
                      <th className="text-left p-3 font-medium">Bucket</th>
                      <th className="text-left p-3 font-medium">You2</th>
                      <th className="text-left p-3 font-medium">DISC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewClients.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          setSelectedReviewClient({ id: c.id, name: c.name });
                          setReviewModalOpen(true);
                        }}
                      >
                        <td className="p-3 font-medium">{c.name}</td>
                        <td className="p-3 text-slate-600">
                          {getBucketDisplayName(c.outcome_bucket)}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={c.you2_status} label="You2" />
                        </td>
                        <td className="p-3">
                          <StatusBadge status={c.disc_status} label="DISC" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DataReviewModal
        clientId={selectedReviewClient?.id ?? ''}
        clientName={selectedReviewClient?.name ?? ''}
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedReviewClient(null);
        }}
        onSaved={loadReviewClients}
      />
    </div>
  );
}
