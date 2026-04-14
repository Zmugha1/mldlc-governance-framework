import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Briefcase,
  Mail,
  Phone,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  Clock,
  Calendar,
  Loader2,
  Pencil,
  Users,
  MessageSquare,
  UserPlus,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SkeletonCard } from '@/components/SkeletonCard';
import FeedbackButton from '../components/FeedbackButton';
import UATFeedback from '@/components/UATFeedback';
import { stageConfig, discColors } from '@/data/sampleClients';
import type { Client } from '@/types';
import {
  getAllClients,
  getClient,
  inactivateClient,
  isNetWorthBelowThreshold,
} from '@/services/clientService';
import { clientToDisplay } from '@/services/clientAdapter';
import { dbExecute, dbSelect, getDb } from '@/services/db';
import { logEntry } from '@/services/auditService';
import {
  getStageReadiness,
  moveClientStage,
  getAllStageReadiness,
  type PipelineStage,
  type Recommendation,
  type StageReadiness,
} from '@/services/stageReadinessService';
import { getDiscProfilesMap } from '@/services/dashboardService';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  gmailTool,
  getDiscEmailTemplate,
  type EmailMessage,
} from '../services/gmailTool';
import { isGoogleConnected } from '../services/googleAuthService';
import {
  runCoachingCouncil,
  type CouncilInput,
  type CouncilOutput,
} from '../services/coachingCouncil';
import { logCorrection } from '../services/correctionService';
import { extractFathomSession } from '@/services/documentExtractionService';
import {
  withOllamaCheck,
  OLLAMA_NOT_READY_USER_MESSAGE,
} from '@/services/ollamaService';

/**
 * v1.4: Disable Quick Reflection (App.tsx). It treats `reflection_last_shown`
 * in localStorage as today's YYYY-MM-DD to decide whether to open the modal;
 * marking it on load prevents the idle timer and beforeunload hook from firing.
 */
(function disableQuickReflectionPromptV14() {
  try {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    localStorage.setItem('reflection_last_shown', `${y}-${m}-${day}`);
  } catch {
    /* ignore */
  }
})();

/** Client Intelligence sidebar / header — DISC ring colors (solid + ~20% fill). */
const CI_DISC_STYLE: Record<'D' | 'I' | 'S' | 'C', { solid: string; muted: string }> = {
  D: { solid: '#F05F57', muted: 'rgba(240, 95, 87, 0.2)' },
  I: { solid: '#C8613F', muted: 'rgba(200, 97, 63, 0.2)' },
  S: { solid: '#3BBFBF', muted: 'rgba(59, 191, 191, 0.2)' },
  C: { solid: '#7A8F95', muted: 'rgba(122, 143, 149, 0.2)' },
};

type SidebarRecFilter = 'all' | 'VALIDATE' | 'GATHER' | 'PAUSE' | 'gone_quiet';

type NewClientStageCode = 'IC' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

const ADD_CLIENT_STAGE_OPTIONS: { code: NewClientStageCode; label: string }[] = [
  { code: 'IC', label: 'IC — Initial Contact' },
  { code: 'C1', label: 'C1 — Seeker Connection' },
  { code: 'C2', label: 'C2 — Seeker Clarification' },
  { code: 'C3', label: 'C3 — Possibilities' },
  { code: 'C4', label: 'C4 — Initial Validation' },
  { code: 'C5', label: 'C5 — Continued Validation' },
];

const HOW_FOUND_OPTIONS = [
  'Brand Building Fund',
  'Referral from client',
  'BNI referral',
  'LinkedIn',
  'Personal network',
  'Other',
] as const;

/** Navigate to The Capture (admin) and stash client id for upload focus (AdminStreamliner may read localStorage). */
function navigateToTheCapture(clientId: string): void {
  try {
    localStorage.setItem('sandi_capture_pending_client_id', clientId);
    localStorage.setItem('sandi_capture_scroll_my_clients', '1');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent('coachbot:navigate-module', {
      bubbles: true,
      detail: { module: 'admin' as const },
    })
  );
  const rail = document.querySelector('.fixed.inset-y-0.left-0');
  const footer = rail?.querySelector('.flex.items-center.justify-center.gap-1.px-4.py-3');
  const firstBtn = footer?.querySelector('button');
  if (firstBtn) {
    (firstBtn as HTMLButtonElement).click();
  }
}

function getStageDisplay(
  stage: string | null
): { code: string; label: string } {
  const map: Record<string, { code: string; label: string }> = {
    IC: { code: 'IC', label: 'Initial Contact' },
    C1: { code: 'C1', label: 'Seeker Connection' },
    C2: { code: 'C2', label: 'Seeker Clarification' },
    C3: { code: 'C3', label: 'Possibilities' },
    C4: { code: 'C4', label: 'Initial Validation' },
    C5: { code: 'C5', label: 'Continued Validation' },
    'Initial Contact': { code: 'IC', label: 'Initial Contact' },
    'Seeker Connection': { code: 'C1', label: 'Seeker Connection' },
    'Seeker Clarification': { code: 'C2', label: 'Seeker Clarification' },
    Possibilities: { code: 'C3', label: 'Possibilities' },
    'Career 2.0': { code: 'C4', label: 'Initial Validation' },
    'Initial Validation': { code: 'C4', label: 'Initial Validation' },
    'Business Purchase': { code: 'C5', label: 'Continued Validation' },
    'Continued Validation': { code: 'C5', label: 'Continued Validation' },
    Closed: { code: 'C5', label: 'Continued Validation' },
  };
  const result = map[stage ?? ''];
  return (
    result ?? {
      code: stage ?? '?',
      label: stage ?? 'Unknown',
    }
  );
}

function getStageDisplayName(stage: string): string {
  return getStageDisplay(stage).label;
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
  'Career 2.0': 'C4',
  'Initial Validation': 'C4',
  'Business Purchase': 'C5',
  'Continued Validation': 'C5',
  Closed: 'C5',
};

function resolvePipelineStageCode(
  raw: string | null | undefined
): PipelineStageCode | null {
  const asCode = parsePipelineStageCode(raw);
  if (asCode) return asCode;
  const label = (raw ?? '').trim();
  return DISPLAY_LABEL_TO_PIPELINE_CODE[label] ?? null;
}

function clientHasBusinessPurchaseDate(
  client: Client & { business_purchase_date?: string | null }
): boolean {
  const d = client.business_purchase_date;
  return d != null && String(d).trim() !== '';
}

/** Sidebar: converted clients show "Converted" (teal), not "Business Complete". */
function isSidebarConvertedClient(client: Client): boolean {
  if ((client.outcome_bucket ?? '').toLowerCase() === 'converted') return true;
  const code = resolvePipelineStageCode(client.inferred_stage);
  if (code !== 'C5') return false;
  return clientHasBusinessPurchaseDate(
    client as Client & { business_purchase_date?: string | null }
  );
}

function formatFathomSessionCardDate(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).trim();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const NOT_CAPTURED_NEXT = 'Not captured in this session';

function formatNextActions(val: unknown): string {
  if (val === null || val === undefined) return NOT_CAPTURED_NEXT;
  if (Array.isArray(val)) {
    const joined = val
      .filter(Boolean)
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0)
      .join(', ');
    return joined.length > 0 ? joined : NOT_CAPTURED_NEXT;
  }
  const str = String(val).trim();
  if (str === '[]' || str === '' || str.toLowerCase() === 'null') return NOT_CAPTURED_NEXT;
  try {
    const arr = JSON.parse(str) as unknown;
    if (!Array.isArray(arr) || arr.length === 0) return NOT_CAPTURED_NEXT;
    const joined = arr
      .filter(Boolean)
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0)
      .join(', ');
    return joined.length > 0 ? joined : NOT_CAPTURED_NEXT;
  } catch {
    return str.length > 2 ? str : NOT_CAPTURED_NEXT;
  }
}

function sanitizeSessionNotes(notes: string | null): string {
  if (!notes) return '';
  const trimmed = notes.trim();
  if (!trimmed || trimmed === '{}') return '';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        objections?: unknown;
        commitments?: unknown;
        notes?: unknown;
      };
      const parts: string[] = [];
      if (Array.isArray(parsed.objections) && parsed.objections.length > 0) {
        parts.push('Objections: ' + parsed.objections.map(String).join(', '));
      }
      if (Array.isArray(parsed.commitments) && parsed.commitments.length > 0) {
        parts.push('Commitments: ' + parsed.commitments.map(String).join(', '));
      }
      if (parsed.notes) {
        parts.push(String(parsed.notes));
      }
      return parts.length > 0 ? parts.join('. ') : 'Session logged';
    } catch {
      return 'Session logged';
    }
  }
  return trimmed;
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

/** Canonical pipeline order for Move Forward / Move Back (must match DB IC…C5 codes). */
const STAGE_ORDER: readonly PipelineStage[] = [
  'IC',
  'C1',
  'C2',
  'C3',
  'C4',
  'C5',
];

/** Tauri SQL may return a single row object instead of an array — normalize for indexing. */
function normalizeSqlRows<T>(rows: T | T[] | null | undefined): T[] {
  if (rows == null) return [];
  return Array.isArray(rows) ? rows : [rows];
}

/** Advisory warning when moving forward into a stage with typical doc gaps. */
function forwardMoveDocumentWarning(
  target: PipelineStage,
  ctx: {
    sessionCount: number;
    hasDisc: boolean;
    hasYou2: boolean;
    hasVision: boolean;
  }
): string | null {
  if (target === 'C1' && ctx.sessionCount < 1) {
    return 'C1 requires: first session';
  }
  if (target === 'C2' && !ctx.hasDisc) {
    return 'C2 requires: DISC profile';
  }
  if (target === 'C3' && (!ctx.hasDisc || !ctx.hasYou2)) {
    return 'C3 requires: DISC + You 2.0';
  }
  if (
    target === 'C4' &&
    (!ctx.hasDisc || !ctx.hasYou2 || ctx.sessionCount < 1)
  ) {
    return 'C4 requires: DISC + You 2.0 + at least 1 session';
  }
  if (target === 'C5' && (!ctx.hasDisc || !ctx.hasYou2 || !ctx.hasVision)) {
    return 'C5 requires: DISC + You 2.0 + vision statement';
  }
  return null;
}

const PIPELINE_CODE_TO_STAGE_CONFIG_KEY: Record<
  PipelineStageCode,
  keyof typeof stageConfig
> = {
  IC: 'Initial Contact',
  C1: 'Seeker Connection',
  C2: 'Seeker Clarification',
  C3: 'Possibilities',
  C4: 'Client Career 2.0',
  C5: 'Business Purchase',
};

function getStageBadgeColor(stageRaw: string | null | undefined): string {
  const code = resolvePipelineStageCode(
    stageRaw === null || stageRaw === undefined ? '' : String(stageRaw)
  );
  if (!code) return '#E2E8F0';
  const key = PIPELINE_CODE_TO_STAGE_CONFIG_KEY[code];
  return stageConfig[key]?.color ?? '#E2E8F0';
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

function isNetWorthRangePinkFlag(flag: string): boolean {
  return flag.toLowerCase().includes('net worth below');
}

function filterPinkFlagsByKnownNetWorth(
  flags: string[],
  mergedNetWorthRange: string
): string[] {
  const netWorthRange = mergedNetWorthRange.trim();
  return flags.filter((f) => {
    if (!isNetWorthRangePinkFlag(f)) return true;
    if (
      netWorthRange &&
      netWorthRange !== '' &&
      netWorthRange !== 'null' &&
      netWorthRange !== 'Not provided' &&
      netWorthRange !== '0' &&
      isNetWorthBelowThreshold(netWorthRange)
    ) {
      return true;
    }
    return false;
  });
}

function displayTimeCommitmentText(
  timeCommitment: string | null | undefined
): string {
  return (timeCommitment || '')
    .replace(/@/g, ' ; ')
    .replace(/;(\S)/g, '; $1');
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

const DISC_STYLE_LABEL: Record<'D' | 'I' | 'S' | 'C', string> = {
  D: 'High D — Dominance',
  I: 'High I — Influence',
  S: 'High S — Steadiness',
  C: 'High C — Compliance',
};

function formatEmailRelative(dateStr: string): string {
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return '—';
  try {
    return formatDistanceToNow(new Date(t), { addSuffix: true });
  } catch {
    return '—';
  }
}

type AhaMomentType =
  | 'client_specific'
  | 'pattern'
  | 'disc_insight'
  | 'stage_insight'
  | 'general';

const AHA_MOMENT_TYPE_OPTIONS: { value: AhaMomentType; label: string }[] = [
  { value: 'client_specific', label: 'About this client specifically' },
  { value: 'pattern', label: "A pattern I'm seeing across clients" },
  { value: 'disc_insight', label: 'Something about this DISC style' },
  { value: 'stage_insight', label: 'Something about this stage' },
  { value: 'general', label: 'General coaching insight' },
];

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

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const past = new Date(
    parseInt(parts[0]!, 10),
    parseInt(parts[1]!, 10) - 1,
    parseInt(parts[2]!, 10)
  );
  past.setHours(0, 0, 0, 0);
  const diff = today.getTime() - past.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatGoneQuietLabel(days: number | null | undefined): string {
  const base = 'Gone Quiet';
  if (days == null || days <= 0) return base;
  if (days < 30) return `${base} · ${days}d`;
  const mo = Math.floor(days / 30);
  return `${base} · ${mo}mo`;
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

type StoredFranchiseRec = {
  name: string;
  rank: number;
  zor_call_date: string;
  notes: string;
  added_at: string;
};

function franchiseRecsStorageKey(clientId: string): string {
  return `franchise_recs_${clientId}`;
}

function loadFranchiseRecsFromStorage(clientId: string): StoredFranchiseRec[] {
  try {
    const raw = localStorage.getItem(franchiseRecsStorageKey(clientId));
    if (!raw?.trim()) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x != null && typeof x === 'object')
      .map((x) => {
        const o = x as Record<string, unknown>;
        const rankNum = Number(o.rank);
        return {
          name: String(o.name ?? '').trim(),
          rank:
            rankNum === 2 ? 2 : rankNum === 3 ? 3 : 1,
          zor_call_date: String(o.zor_call_date ?? '').trim(),
          notes: String(o.notes ?? '').trim(),
          added_at: String(
            o.added_at ?? new Date().toISOString()
          ),
        };
      })
      .filter((r) => r.name.length > 0);
  } catch {
    return [];
  }
}

function saveFranchiseRecsToStorage(
  clientId: string,
  items: StoredFranchiseRec[]
): void {
  localStorage.setItem(
    franchiseRecsStorageKey(clientId),
    JSON.stringify(items)
  );
}

function formatZorCallDisplay(isoOrDate: string): string {
  const t = isoOrDate.trim();
  if (!t) return '';
  const slice = /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : t;
  const d = new Date(slice);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sandiReadinessStatusLabel(pct: number): {
  text: string;
  color: string;
} {
  if (pct >= 90) return { text: 'Ready', color: '#3BBFBF' };
  if (pct >= 70) return { text: 'Nearly Ready', color: '#C8613F' };
  if (pct >= 50) return { text: 'Building', color: '#C8613F' };
  return { text: 'Needs Attention', color: '#F05F57' };
}

function sandiReadinessOverallBarColor(pct: number): string {
  if (pct >= 70) return '#3BBFBF';
  if (pct >= 50) return '#C8613F';
  return '#F05F57';
}

const FRANCHISE_NOTES_PLACEHOLDER =
  'What is the client learning? What are their pros and cons? What questions are they asking?';

/** {@link https://v2.tauri.app/reference/javascript/api/namespacepath/#downloaddir BaseDirectory.Download} */
const TAURI_BASE_DIRECTORY_DOWNLOAD = 7;

/**
 * Writes bytes into the user's Downloads folder via the Tauri fs plugin
 * (same IPC as @tauri-apps/plugin-fs writeFile), without requiring the
 * optional frontend npm package.
 */
async function visionWriteBytesToDownloads(
  relativeFileName: string,
  bytes: Uint8Array
): Promise<void> {
  await invoke('plugin:fs|write_file', bytes, {
    headers: {
      path: encodeURIComponent(relativeFileName),
      options: JSON.stringify({
        baseDir: TAURI_BASE_DIRECTORY_DOWNLOAD,
      }),
    },
  });
}

// ADR: em dashes never allowed in user-visible or AI-generated content per
// CLAUDE.md rule. LLMs ignore prompt rules for style so must post-process.
function sanitizeText(text: string): string {
  return text
    .replace(/\u2014/g, ',')
    .replace(/\u2013/g, ',')
    .replace(/\u2012/g, ',')
    .replace(/\u2015/g, ',')
    .replace(/--/g, ',')
    .replace(/&mdash;/g, ',')
    .replace(/&ndash;/g, ',')
    .replace(/ , /g, ', ')
    .replace(/, ,/g, ',')
    .replace(/,,/g, ',')
    .trim();
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

const VISION_MOTIVATION_ROAD_QUOTE =
  "You don't have to have it all figured out to move forward";
const VISION_MOTIVATION_CLIFF_QUOTE =
  'Your Only Limit Is YOU';

/** High D/I → cliff (Vito style); High S/C or unknown → road (Alex style). */
function visionMotivationKindFromDiscScores(
  disc: { d: number; i: number; s: number; c: number } | null
): 'road' | 'cliff' {
  if (!disc) return 'road';
  const sum = disc.d + disc.i + disc.s + disc.c;
  if (sum <= 0) return 'road';
  const letter = deriveStyleLetter(disc.d, disc.i, disc.s, disc.c);
  return letter === 'D' || letter === 'I' ? 'cliff' : 'road';
}

function visionMotivationJpegToDataUrl(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < u8.byteLength; i++) {
    binary += String.fromCharCode(u8[i]!);
  }
  return `image/jpeg;base64,${btoa(binary)}`;
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

function chairmanQuestionLensBadge(
  question: string,
  out: CouncilOutput
): string {
  if (out.readinessLens.questions.includes(question)) return 'Readiness';
  if (out.alignmentLens.questions.includes(question)) return 'Alignment';
  if (out.integrityLens.questions.includes(question)) return 'Integrity';
  return 'Council';
}

function toDisplayValue(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
}

const REMINDER_TYPE_OPTIONS = [
  'Follow-up',
  'Re-engagement',
  'Referral ask',
  'C4 revival',
  'Other',
] as const;

type ReminderTypeOption = (typeof REMINDER_TYPE_OPTIONS)[number];

function mapParsedListItems(
  items: unknown[],
  primaryKey?: string
): string[] {
  return items
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

function You2VisionDisplay({ text }: { text: string }) {
  const t = text.trim();
  const ok =
    t.length > 10 && t !== 'Not provided' && t !== 'No statement yet';
  if (ok) {
    return (
      <p style={{ color: '#2D4459', fontSize: 13, lineHeight: 1.6 }}>{t}</p>
    );
  }
  return (
    <p className="italic" style={{ color: '#7A8F95', fontSize: 12 }}>
      Not yet captured
    </p>
  );
}

function You2ParsedListDisplay({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="italic" style={{ color: '#7A8F95', fontSize: 12 }}>
        Not yet captured
      </p>
    );
  }
  return (
    <ul className="m-0 list-none space-y-0 p-0">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-2"
          style={{ color: '#2D4459', fontSize: 13, lineHeight: 1.6 }}
        >
          <span className="shrink-0" aria-hidden>
            •
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Parses You 2.0 list strings (JSON / newline / comma); supports arrays and JSON arrays of objects for Fathom/TUMAY. */
function parseListField(
  field: unknown,
  primaryKey?: string
): string[] {
  if (field === null || field === undefined) return [];

  if (typeof field === 'string') {
    if (field === 'Not provided') return [];
    if (field === 'null') return [];
    if (field === '[]') return [];
    const trimmed = field.trim();
    if (trimmed === '') return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return mapParsedListItems(parsed, primaryKey);
      }
    } catch {
      // not JSON
    }
    if (trimmed.includes('\n')) {
      return trimmed
        .split('\n')
        .map((i) => i.trim())
        .filter((i) => i.length > 0);
    }
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i.length > 0);
    }
    return [trimmed];
  }

  if (Array.isArray(field)) {
    return mapParsedListItems(field, primaryKey);
  }

  return [String(field)]
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type StageUndoPayload = {
  clientId: string;
  clientName: string;
  fromStage: string;
  toStage: string;
};

type UndoState = StageUndoPayload & {
  timeoutId: ReturnType<typeof setTimeout>;
};

type VisionRubricValue = {
  accuracy: number;
  completeness: number;
  tone: number;
  usefulness: number;
  comment: string;
};

type VisionRubricProps = {
  clientName: string | undefined;
  setVisionRubric: Dispatch<SetStateAction<VisionRubricValue | null>>;
  setVisionRubricSubmitted: Dispatch<SetStateAction<boolean>>;
  handleGenerateVision: (feedbackContext?: string) => Promise<void>;
};

function VisionRubric({
  clientName,
  setVisionRubric,
  setVisionRubricSubmitted,
  handleGenerateVision,
}: VisionRubricProps) {
  const [scores, setScores] = useState({
    accuracy: 0,
    completeness: 0,
    tone: 0,
    usefulness: 0,
  });
  const [comment, setComment] = useState('');

  const displayName = clientName || 'this client';

  const dimensions = [
    {
      key: 'accuracy' as const,
      label: 'Accuracy',
      question:
        'Does this sound like ' +
        displayName +
        '?',
    },
    {
      key: 'completeness' as const,
      label: 'Completeness',
      question:
        'Does it capture their goals?',
    },
    {
      key: 'tone' as const,
      label: 'Tone',
      question:
        'Does it sound like their voice?',
    },
    {
      key: 'usefulness' as const,
      label: 'Usefulness',
      question:
        'Would you use this in a presentation?',
    },
  ];

  const totalScore =
    scores.accuracy +
    scores.completeness +
    scores.tone +
    scores.usefulness;

  const avgScore =
    totalScore > 0
      ? totalScore / 4
      : 0;

  const allRated =
    scores.accuracy > 0 &&
    scores.completeness > 0 &&
    scores.tone > 0 &&
    scores.usefulness > 0;

  return (
    <div
      style={{
        background: '#F4F7F8',
        borderRadius: 10,
        border: '1px solid #C8E8E5',
        padding: '16px 20px',
        marginTop: 12,
      }}
    >
      <p
        style={{
          color: '#2D4459',
          fontSize: 13,
          fontWeight: 'bold',
          margin: '0 0 4px',
        }}
      >
        Rate this vision statement
      </p>
      <p
        style={{
          color: '#7A8F95',
          fontSize: 11,
          margin: '0 0 14px',
          fontStyle: 'italic',
        }}
      >
        Your ratings teach Coach Bot
        what a good vision statement
        sounds like
      </p>

      {dimensions.map((dim) => (
        <div
          key={dim.key}
          style={{ marginBottom: 12 }}
        >
          <p
            style={{
              color: '#7A8F95',
              fontSize: 11,
              margin: '0 0 4px',
            }}
          >
            <strong
              style={{
                color: '#2D4459',
              }}
            >
              {dim.label}
            </strong>
            {' — '}
            {dim.question}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 6,
            }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  setScores((prev) => ({
                    ...prev,
                    [dim.key]: n,
                  }))
                }
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  border:
                    '1px solid #C8E8E5',
                  background:
                    scores[dim.key] >= n
                      ? '#3BBFBF'
                      : 'white',
                  color:
                    scores[dim.key] >= n
                      ? 'white'
                      : '#7A8F95',
                  fontSize: 13,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 12 }}>
        <p
          style={{
            color: '#7A8F95',
            fontSize: 11,
            margin: '0 0 4px',
          }}
        >
          What did it miss? (optional)
        </p>
        <textarea
          value={comment}
          onChange={(e) =>
            setComment(e.target.value)
          }
          placeholder="Too formal. Missing her family goals. Wrong tone..."
          style={{
            width: '100%',
            height: 60,
            border: '1px solid #C8E8E5',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12,
            color: '#2D4459',
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {allRated && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
            flexWrap: 'wrap',
          }}
        >
          {avgScore < 3 && (
            <button
              type="button"
              onClick={() => {
                const feedback =
                  `Scores — ` +
                  `Accuracy: ${scores.accuracy}/5, ` +
                  `Completeness: ${scores.completeness}/5, ` +
                  `Tone: ${scores.tone}/5, ` +
                  `Usefulness: ${scores.usefulness}/5. ` +
                  (comment
                    ? `What was missing: ${comment}`
                    : 'No specific feedback.');
                setVisionRubric({
                  ...scores,
                  comment,
                });
                setVisionRubricSubmitted(
                  true
                );
                void handleGenerateVision(
                  feedback
                );
              }}
              style={{
                background: '#F05F57',
                color: 'white',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Regenerate with Feedback
            </button>
          )}

          {avgScore >= 3 && (
            <button
              type="button"
              onClick={() => {
                setVisionRubric({
                  ...scores,
                  comment,
                });
                setVisionRubricSubmitted(
                  true
                );
              }}
              style={{
                background: '#3BBFBF',
                color: 'white',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Looks Good — Download
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setVisionRubric({
                ...scores,
                comment,
              });
              setVisionRubricSubmitted(
                true
              );
            }}
            style={{
              background: 'white',
              color: '#7A8F95',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12,
              border: '1px solid #C8E8E5',
              cursor: 'pointer',
            }}
          >
            Skip Rating
          </button>
        </div>
      )}
    </div>
  );
}

function ClientDetailModal({
  client,
  onInactivate,
  onVisionUpdated: _onVisionUpdated,
  onStageMoved,
  onStageMoveToast,
  onStageMoveUndoOffer,
}: {
  client: DisplayClient;
  onInactivate?: (id: string) => void;
  onVisionUpdated?: () => void;
  onStageMoved?: (
    clientId: string,
    newInferredStage?: string
  ) => void | Promise<void>;
  onStageMoveToast?: (
    message: string,
    variant?: 'success' | 'error'
  ) => void;
  onStageMoveUndoOffer?: (payload: StageUndoPayload) => void;
}) {
  const [readiness, setReadiness] = useState<StageReadiness | null>(null);
  const [clientReadinessDbFields, setClientReadinessDbFields] = useState<{
    zor_learning_notes: string | null;
    franchise_recommendations: string | null;
  }>({ zor_learning_notes: null, franchise_recommendations: null });
  const [you2Vision, setYou2Vision] = useState('');
  const [you2Details, setYou2Details] = useState<{
    spouse_name: string;
    spouse_role: string;
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
  const [tumayReadinessProfile, setTumayReadinessProfile] = useState<{
    financial_net_worth_range: string;
    credit_score: number | string | null;
    time_commitment: string;
  } | null>(null);
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
  const [relocationInterestStored, setRelocationInterestStored] = useState<
    string | null
  >(null);
  const [fundingContactStored, setFundingContactStored] = useState<
    string | null
  >(null);
  const [editingRelocationInterest, setEditingRelocationInterest] =
    useState(false);
  const [editingFundingContact, setEditingFundingContact] = useState(false);
  const [relocationInterestDraft, setRelocationInterestDraft] = useState('');
  const [fundingContactDraft, setFundingContactDraft] = useState('');
  const [savingRelocationInterest, setSavingRelocationInterest] =
    useState(false);
  const [savingFundingContact, setSavingFundingContact] = useState(false);
  const [lastContactDateDb, setLastContactDateDb] = useState<string | null>(
    null
  );
  const [isEditingLastContact, setIsEditingLastContact] = useState(false);
  const [lastContactDraft, setLastContactDraft] = useState('');
  const [isSavingLastContact, setIsSavingLastContact] = useState(false);
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
    session_scheduled: number | null;
    updated_at: string | null;
  }>>([]);
  const [fathomSessionCount, setFathomSessionCount] = useState<number>(0);
  const [showInactivateConfirm, setShowInactivateConfirm] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [reminderFormOpen, setReminderFormOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [reminderType, setReminderType] = useState<ReminderTypeOption>('Follow-up');
  const [reminderSavedLocallyMsg, setReminderSavedLocallyMsg] = useState(false);
  const [reminderSetConfirm, setReminderSetConfirm] = useState(false);
  const [savedReminder, setSavedReminder] = useState<{
    date: string;
    type: string;
    note: string;
    source: 'db' | 'local';
    dbId?: string;
  } | null>(null);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [lastEmail, setLastEmail] = useState<EmailMessage | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyDiscStyle, setReplyDiscStyle] = useState<'D' | 'I' | 'S' | 'C'>('I');
  const [replySending, setReplySending] = useState(false);
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadEmails, setThreadEmails] = useState<EmailMessage[]>([]);
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
  const [ahaModalOpen, setAhaModalOpen] = useState(false);
  const [ahaText, setAhaText] = useState('');
  const [ahaType, setAhaType] = useState<AhaMomentType>('client_specific');
  const [ahaTextError, setAhaTextError] = useState(false);
  const [ahaSaving, setAhaSaving] = useState(false);
  const [ahaToast, setAhaToast] = useState<string | null>(null);
  const [addSessionStage, setAddSessionStage] = useState<string>('IC');
  const [addSessionDate, setAddSessionDate] = useState(() => localCalendarDateYyyyMmDd());
  const [addSessionDuration, setAddSessionDuration] = useState('');
  const [fathomNotesExpanded, setFathomNotesExpanded] = useState<Record<number, boolean>>(
    {}
  );
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [fathomUploading, setFathomUploading] = useState(false);
  const [fathomProgress, setFathomProgress] = useState(0);
  const [fathomUploadError, setFathomUploadError] = useState<string | null>(null);
  const [fathomUploadSuccess, setFathomUploadSuccess] = useState<string | null>(null);
  const [fathomPasteText, setFathomPasteText] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingSessionNotes, setEditingSessionNotes] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');
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
  const [franchiseRecs, setFranchiseRecs] = useState<StoredFranchiseRec[]>([]);
  const [franchiseFormOpen, setFranchiseFormOpen] = useState(false);
  const [franchiseEditIndex, setFranchiseEditIndex] = useState<number | null>(
    null
  );
  const [franchiseFormName, setFranchiseFormName] = useState('');
  const [franchiseFormRank, setFranchiseFormRank] = useState<1 | 2 | 3>(1);
  const [franchiseFormZorDate, setFranchiseFormZorDate] = useState('');
  const [franchiseFormNotes, setFranchiseFormNotes] = useState('');
  const [visionText, setVisionText] = useState('');
  const [visionGenerating, setVisionGenerating] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [visionSaveSuccess, setVisionSaveSuccess] =
    useState<string | null>(null);
  const [visionRubric, setVisionRubric] = useState<VisionRubricValue | null>(
    null
  );
  const [visionRubricSubmitted, setVisionRubricSubmitted] = useState(false);
  const [territoryNotes, setTerritoryNotes] = useState('');
  const [stageMoveDialog, setStageMoveDialog] = useState<{
    target: PipelineStage;
    direction: 'forward' | 'back';
  } | null>(null);
  const [stageMoveSaving, setStageMoveSaving] = useState(false);
  /** Overrides `client.inferred_stage` after a successful move until parent props refresh. */
  const [optimisticInferredStage, setOptimisticInferredStage] = useState<
    string | null
  >(null);
  const [councilOutput, setCouncilOutput] = useState<CouncilOutput | null>(
    null
  );
  const [councilLoading, setCouncilLoading] = useState(false);
  const [councilError, setCouncilError] = useState<string | null>(null);
  /** Pipeline stage Sandi wants Best Next Questions framed toward (defaults to client's recorded stage). */
  const [councilQuestionTargetStage, setCouncilQuestionTargetStage] =
    useState<PipelineStage>('IC');
  const [activeLens, setActiveLens] = useState<
    'chairman' | 'readiness' | 'alignment' | 'integrity'
  >('chairman');
  const [ratedQuestions, setRatedQuestions] = useState<
    Record<string, 'up' | 'down'>
  >({});
  const [coachProfileRow, setCoachProfileRow] = useState<{
    bio: string | null;
    coaching_philosophy: string | null;
    full_name?: string | null;
    name?: string | null;
  } | null>(null);

  useEffect(() => {
    if (client?.vision_statement) {
      setVisionText(
        String(
          client.vision_statement
        ).trim()
      );
    } else {
      setVisionText('');
    }
    setVisionRubric(null);
    setVisionRubricSubmitted(false);
    setVisionError(null);
  }, [client?.id]);

  useEffect(() => {
    setCouncilOutput(null);
    setCouncilLoading(false);
    setCouncilError(null);
    setActiveLens('chairman');
    setRatedQuestions({});
  }, [client?.id]);

  useEffect(() => {
    if (!client?.id) return;
    const raw = optimisticInferredStage ?? client.inferred_stage;
    const c = resolvePipelineStageCode(raw) ?? 'IC';
    setCouncilQuestionTargetStage(
      STAGE_ORDER.includes(c as PipelineStage) ? (c as PipelineStage) : 'IC'
    );
  }, [client?.id]);

  useEffect(() => {
    if (!client?.id) {
      setCoachProfileRow(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await dbSelect<{
          bio: string | null;
          coaching_philosophy: string | null;
        }>(
          `SELECT bio, coaching_philosophy FROM coach_profile WHERE id = 'coach' LIMIT 1`
        );
        const prefRows = await dbSelect<{
          coach_name: string | null;
        }>(
          `SELECT coach_name FROM user_preferences WHERE id = 'singleton' LIMIT 1`
        );
        const nameFromPrefs =
          prefRows[0]?.coach_name?.trim() || null;
        if (!cancelled) {
          if (rows[0]) {
            setCoachProfileRow({
              ...rows[0],
              name: nameFromPrefs,
            });
          } else if (nameFromPrefs) {
            setCoachProfileRow({
              bio: null,
              coaching_philosophy: null,
              name: nameFromPrefs,
            });
          } else {
            setCoachProfileRow(null);
          }
        }
      } catch {
        if (!cancelled) setCoachProfileRow(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client?.id]);

  useEffect(() => {
    if (!client?.id) {
      setFranchiseRecs([]);
      return;
    }
    setFranchiseRecs(loadFranchiseRecsFromStorage(client.id));
    setFranchiseFormOpen(false);
    setFranchiseEditIndex(null);
    setFranchiseFormName('');
    setFranchiseFormRank(1);
    setFranchiseFormZorDate('');
    setFranchiseFormNotes('');
  }, [client?.id]);

  useEffect(() => {
    if (!ahaToast) return;
    const t = window.setTimeout(() => setAhaToast(null), 3000);
    return () => clearTimeout(t);
  }, [ahaToast]);

  useEffect(() => {
    setAhaModalOpen(false);
    setAhaText('');
    setAhaType('client_specific');
    setAhaTextError(false);
    setAhaSaving(false);
  }, [client?.id]);

  useEffect(() => {
    setDetailTab('overview');
    setShowInactivateConfirm(false);
    setStageMoveDialog(null);
    setStageMoveSaving(false);
  }, [client?.id]);

  useEffect(() => {
    setOptimisticInferredStage(null);
  }, [client?.id, client?.inferred_stage]);

  useEffect(() => {
    setReminderFormOpen(false);
    setReminderDate('');
    setReminderNote('');
    setReminderType('Follow-up');
    setReminderSavedLocallyMsg(false);
    setReminderSetConfirm(false);
    setSavedReminder(null);
    setReminderSaving(false);
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
    setAddSessionDate(localCalendarDateYyyyMmDd());
    setAddSessionDuration('');
    setFathomPasteText('');
    setFathomNotesExpanded({});
    setEditingNotesId(null);
    setEditingNotesText('');
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
      const stageResolved =
        resolvePipelineStageCode(client.inferred_stage) ?? 'IC';
      setAddSessionStage(stageResolved);
      getStageReadiness(client.id).then(setReadiness);
      dbSelect<{
        zor_learning_notes: string | null;
        franchise_recommendations: string | null;
      }>(
        `SELECT zor_learning_notes, franchise_recommendations FROM clients WHERE id = ?`,
        [client.id]
      )
        .then((rows) => {
          setClientReadinessDbFields({
            zor_learning_notes: rows[0]?.zor_learning_notes ?? null,
            franchise_recommendations:
              rows[0]?.franchise_recommendations ?? null,
          });
        })
        .catch(() => {
          setClientReadinessDbFields({
            zor_learning_notes: null,
            franchise_recommendations: null,
          });
        });
      dbSelect<{
        email: string | null;
        phone: string | null;
        company: string | null;
        last_contact_date: string | null;
        relocation_interest: string | null;
        funding_contact: string | null;
      }>(
        `SELECT email, phone, company, last_contact_date,
                relocation_interest, funding_contact
         FROM clients
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
          setRelocationInterestStored(rows[0]?.relocation_interest ?? null);
          setFundingContactStored(rows[0]?.funding_contact ?? null);
          setRelocationInterestDraft(
            (rows[0]?.relocation_interest ?? '').trim()
          );
          setFundingContactDraft((rows[0]?.funding_contact ?? '').trim());
          setEditingRelocationInterest(false);
          setEditingFundingContact(false);
        })
        .catch(() => {
          setContact({ email: null, phone: null, company: null });
          setContactDraft({ email: '', phone: '', company: '' });
          setLastContactDateDb(null);
          setRelocationInterestStored(null);
          setFundingContactStored(null);
          setRelocationInterestDraft('');
          setFundingContactDraft('');
          setEditingRelocationInterest(false);
          setEditingFundingContact(false);
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
          if (!row) {
            setYou2Vision('');
            setYou2Details(null);
            return;
          }
          setYou2Vision(String(row.one_year_vision ?? '').trim());
          setYou2Details({
            spouse_name: String(row.spouse_name ?? ''),
            spouse_role: String(row.spouse_role ?? ''),
            financial_net_worth_range: String(row.financial_net_worth_range ?? ''),
            credit_score:
              typeof row.credit_score === 'number'
                ? row.credit_score
                : Number(row.credit_score ?? 0) || null,
            launch_timeline: String(row.launch_timeline ?? ''),
            dangers: parseListField(row.top_3_dangers ?? row.dangers),
            strengths: parseListField(row.top_3_strengths ?? row.strengths),
            opportunities: parseListField(
              row.top_3_opportunities ?? row.opportunities
            ),
            areas_of_interest: parseListField(row.areas_of_interest),
            skills: parseListField(row.skills),
            time_commitment: String(row.time_commitment ?? ''),
            reasons_for_change: parseListField(row.reasons_for_change),
          });
        })
        .catch(() => {
          setYou2Vision('');
          setYou2Details(null);
        });
      dbSelect<{
        financial_net_worth_range: string | null;
        credit_score: number | string | null;
        time_commitment: string | null;
      }>(
        `SELECT financial_net_worth_range, credit_score, time_commitment
         FROM client_tumay_profiles
         WHERE client_id = ?`,
        [client.id]
      )
        .then((tumayRows) => {
          const r = tumayRows[0];
          if (!r) {
            setTumayReadinessProfile(null);
            return;
          }
          setTumayReadinessProfile({
            financial_net_worth_range: String(r.financial_net_worth_range ?? ''),
            credit_score: r.credit_score,
            time_commitment: String(r.time_commitment ?? ''),
          });
        })
        .catch(() => setTumayReadinessProfile(null));
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
        session_scheduled: number | null;
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
         session_scheduled,
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
      setYou2Vision('');
      setYou2Details(null);
      setTumayData(null);
      setTumayReadinessProfile(null);
      setClientReadinessDbFields({
        zor_learning_notes: null,
        franchise_recommendations: null,
      });
      setContact({ email: null, phone: null, company: null });
      setContactDraft({ email: '', phone: '', company: '' });
      setRelocationInterestStored(null);
      setFundingContactStored(null);
      setRelocationInterestDraft('');
      setFundingContactDraft('');
      setEditingRelocationInterest(false);
      setEditingFundingContact(false);
      setDiscStyleLabel('—');
      setModalDiscStyle('I');
      setDiscScores(null);
      setFathomSessions([]);
      setFathomSessionCount(0);
      setIsEditingContact(false);
      setLastContactDateDb(null);
      setIsEditingLastContact(false);
      setLastContactDraft('');
      setGmailConnected(false);
      setLastEmail(null);
      setEmailLoading(false);
      setShowReplyModal(false);
      setShowThreadModal(false);
      setThreadEmails([]);
    }
  }, [client?.id, client?.inferred_stage]);

  const refreshRecentEmail = useCallback(async () => {
    setEmailLoading(true);
    try {
      const connected = await isGoogleConnected();
      setGmailConnected(connected);
      if (!connected) {
        setLastEmail(null);
        return;
      }
      const result = await gmailTool.execute('get_last_email', {
        clientName: client.name,
        clientEmail: (contact.email ?? client.email ?? '').trim() || undefined,
      });
      if (result.success) {
        if (result.data === null || result.data === undefined) {
          setLastEmail(null);
        } else {
          setLastEmail(result.data as EmailMessage);
        }
      } else {
        setLastEmail(null);
      }
    } catch {
      setLastEmail(null);
    } finally {
      setEmailLoading(false);
    }
  }, [client.name, client.email, contact.email]);

  useEffect(() => {
    void refreshRecentEmail();
  }, [client.id, refreshRecentEmail]);

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

  const effectiveInferredStageRaw =
    optimisticInferredStage ?? client.inferred_stage;
  const resolvedPipelineCode =
    resolvePipelineStageCode(effectiveInferredStageRaw);
  const stageDisplay = getStageDisplay(effectiveInferredStageRaw ?? null);
  const stageHeaderBadgeText = `${stageDisplay.code} · ${stageDisplay.label}`;
  const stageCompartmentSubtitle =
    stageCardCompartmentSubtitle(resolvedPipelineCode);

  const codeForNav: PipelineStage =
    resolvedPipelineCode != null &&
    STAGE_ORDER.includes(resolvedPipelineCode as PipelineStage)
      ? (resolvedPipelineCode as PipelineStage)
      : 'IC';
  const currentIndex = STAGE_ORDER.indexOf(codeForNav);
  const prevStageMove =
    currentIndex > 0 ? STAGE_ORDER[currentIndex - 1]! : null;
  const nextStageMove =
    currentIndex < STAGE_ORDER.length - 1
      ? STAGE_ORDER[currentIndex + 1]!
      : null;

  const visionMotivation = useMemo(() => {
    const kind = visionMotivationKindFromDiscScores(discScores);
    const quote =
      kind === 'cliff'
        ? VISION_MOTIVATION_CLIFF_QUOTE
        : VISION_MOTIVATION_ROAD_QUOTE;
    const imageSrc =
      kind === 'cliff'
        ? '/coach-motivation-cliff-you.jpg'
        : '/coach-motivation-road.jpg';
    return { kind, quote, imageSrc };
  }, [discScores]);

  const clientMergedFinancials = useMemo(() => {
    const parseCreditRaw = (raw: unknown): number => {
      if (raw === null || raw === undefined) return 0;
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      const n = Number(String(raw).trim());
      return Number.isFinite(n) ? n : 0;
    };

    const row = tumayReadinessProfile;
    const jd = tumayData;
    const tumayCsRow = row ? parseCreditRaw(row.credit_score) : 0;
    const tumayCsJson = jd ? parseCreditRaw(jd.credit_score) : 0;
    const tumayProfile = {
      financial_net_worth_range:
        (row?.financial_net_worth_range ?? '').trim() ||
        (jd ? String(jd.financial_net_worth_range ?? '').trim() : '') ||
        '',
      credit_score: tumayCsRow > 0 ? tumayCsRow : tumayCsJson,
      time_commitment:
        (row?.time_commitment ?? '').trim() ||
        (jd ? String(jd.time_commitment ?? '').trim() : '') ||
        '',
    };

    const you2Profile = you2Details;
    const netWorth =
      you2Profile?.financial_net_worth_range &&
      you2Profile.financial_net_worth_range !== '' &&
      you2Profile.financial_net_worth_range !== 'null' &&
      you2Profile.financial_net_worth_range !== '0'
        ? you2Profile.financial_net_worth_range
        : tumayProfile.financial_net_worth_range || '';

    const creditScore =
      you2Profile?.credit_score &&
      Number(you2Profile.credit_score) > 0
        ? Number(you2Profile.credit_score)
        : Number(tumayProfile.credit_score) || 0;

    const timeCommit =
      you2Profile?.time_commitment &&
      you2Profile.time_commitment !== '' &&
      you2Profile.time_commitment !== 'null'
        ? you2Profile.time_commitment
        : tumayProfile.time_commitment || '';

    return { netWorth, creditScore, timeCommit };
  }, [you2Details, tumayReadinessProfile, tumayData]);

  const persistedVisionText = String(
    client?.vision_statement ||
      client?.visionStatement ||
      ''
  ).trim();

  const sandiReadinessDimensions = useMemo(() => {
    const code = resolvedPipelineCode;
    const isC4C5 = code === 'C4' || code === 'C5';

    const hasDisc =
      discScores != null &&
      discScores.d + discScores.i + discScores.s + discScores.c > 0;
    const hasYou2Vision = you2Vision.trim().length > 10;
    const hasFathom = fathomSessionCount >= 1;

    let identity = 0;
    if (hasDisc) identity += 10;
    if (hasYou2Vision) identity += 10;
    if (hasFathom) identity += 5;

    let commitment = 0;
    if (client.vision_approved === 1) commitment += 10;
    if ((you2Details?.launch_timeline ?? '').trim().length > 0) {
      commitment += 8;
    }
    if ((you2Details?.spouse_role ?? '').trim().length > 0) {
      commitment += 7;
    }

    let financialScore = 0;
    const { netWorth, creditScore, timeCommit } = clientMergedFinancials;

    if (
      netWorth &&
      netWorth !== '' &&
      netWorth !== 'null' &&
      netWorth !== '0'
    ) {
      financialScore += 10;
    }

    if (creditScore > 0) {
      financialScore += 8;
    }

    if (
      timeCommit &&
      timeCommit !== '' &&
      timeCommit !== 'null'
    ) {
      financialScore += 7;
    }

    const financial = financialScore;

    let discovery = 0;
    const discoveryLocked = !isC4C5;
    if (isC4C5) {
      if (
        (clientReadinessDbFields.zor_learning_notes ?? '').trim().length > 10
      ) {
        discovery += 10;
      }
      if (
        (clientReadinessDbFields.franchise_recommendations ?? '').trim()
          .length > 0
      ) {
        discovery += 8;
      }
      if (hasDisc && hasYou2Vision && hasFathom) discovery += 7;
    }

    const maxTotal = isC4C5 ? 100 : 75;
    const total =
      identity +
      commitment +
      financial +
      (discoveryLocked ? 0 : discovery);
    const pctRaw = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
    const pct = Math.round(pctRaw * 10) / 10;

    return {
      identity,
      commitment,
      financial,
      discovery,
      discoveryLocked,
      maxTotal,
      total,
      pct,
    };
  }, [
    resolvedPipelineCode,
    discScores,
    you2Vision,
    fathomSessionCount,
    you2Details,
    clientMergedFinancials,
    client.vision_approved,
    clientReadinessDbFields,
  ]);

  const latestSessionNotesPlain = useMemo(() => {
    const first = fathomSessions[0];
    if (!first) return '';
    const n = first.notes ?? '';
    const parsed = safeParseJson(n);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const sum = String((parsed as { summary?: unknown }).summary ?? '').trim();
      if (sum) return sum;
    }
    return sanitizeSessionNotes(n);
  }, [fathomSessions]);

  const allPinkParsed = parseClientPinkFlagsJson(localPinkFlagsJson);
  const { resolvedFlags: resolvedPinkFlags } = splitPinkFlags(allPinkParsed);

  const activePinkFlagsFiltered = useMemo(() => {
    const active = splitPinkFlags(
      parseClientPinkFlagsJson(localPinkFlagsJson)
    ).activeFlags;
    return filterPinkFlagsByKnownNetWorth(
      active,
      clientMergedFinancials.netWorth
    );
  }, [localPinkFlagsJson, clientMergedFinancials.netWorth]);

  const goneQuietReengagementTipText =
    shouldShowGoneQuietBadge(client) && discScores
      ? goneQuietTipFromNaturalScores(discScores)
      : null;

  const showFranchiseRecommendationsSection =
    resolvedPipelineCode === 'C4' || resolvedPipelineCode === 'C5';

  const displayFranchiseRecsSorted = useMemo(
    () =>
      franchiseRecs
        .map((item, originalIndex) => ({ item, originalIndex }))
        .sort(
          (a, b) =>
            a.item.rank - b.item.rank ||
            new Date(a.item.added_at).getTime() -
              new Date(b.item.added_at).getTime()
        ),
    [franchiseRecs]
  );

  const resetFranchiseFormFields = () => {
    setFranchiseFormName('');
    setFranchiseFormRank(1);
    setFranchiseFormZorDate('');
    setFranchiseFormNotes('');
    setFranchiseEditIndex(null);
  };

  const handleFranchiseFormCancel = () => {
    setFranchiseFormOpen(false);
    resetFranchiseFormFields();
  };

  const handleStartAddFranchise = () => {
    resetFranchiseFormFields();
    setFranchiseFormOpen(true);
  };

  const handleEditFranchiseRec = (originalIndex: number) => {
    const r = franchiseRecs[originalIndex];
    if (!r) return;
    setFranchiseEditIndex(originalIndex);
    setFranchiseFormName(r.name);
    setFranchiseFormRank(
      r.rank === 2 ? 2 : r.rank === 3 ? 3 : 1
    );
    const z = r.zor_call_date.trim();
    setFranchiseFormZorDate(
      /^\d{4}-\d{2}-\d{2}/.test(z) ? z.slice(0, 10) : z
    );
    setFranchiseFormNotes(r.notes);
    setFranchiseFormOpen(true);
  };

  const handleSaveFranchiseRec = () => {
    if (!client?.id) return;
    const name = franchiseFormName.trim();
    if (!name) return;
    const wasEdit = franchiseEditIndex != null;
    const rec: StoredFranchiseRec = {
      name,
      rank: franchiseFormRank,
      zor_call_date: franchiseFormZorDate.trim(),
      notes: franchiseFormNotes.trim(),
      added_at:
        wasEdit && franchiseEditIndex != null
          ? franchiseRecs[franchiseEditIndex]?.added_at ??
            new Date().toISOString()
          : new Date().toISOString(),
    };
    const next =
      wasEdit && franchiseEditIndex != null
        ? franchiseRecs.map((x, i) =>
            i === franchiseEditIndex ? rec : x
          )
        : [...franchiseRecs, rec];
    saveFranchiseRecsToStorage(client.id, next);
    setFranchiseRecs(next);
    setFranchiseFormOpen(false);
    resetFranchiseFormFields();
    setAhaToast(wasEdit ? 'Changes saved ✓' : 'Franchise added ✓');
  };

  const handleConfirmStageMove = async () => {
    if (!stageMoveDialog) return;
    const target = stageMoveDialog.target;
    setStageMoveSaving(true);
    try {
      console.log('[ClientIntel] stage move start', {
        clientId: client.id,
        target,
      });
      const db = await getDb();
      const curRowsRaw = await db.select<{ inferred_stage: string | null }>(
        `SELECT inferred_stage FROM clients WHERE id = $1`,
        [client.id]
      );
      const curRows = normalizeSqlRows(curRowsRaw);
      const fromRaw = curRows[0]?.inferred_stage ?? null;
      console.log('[ClientIntel] current stage from DB', fromRaw);

      await db.execute(
        `UPDATE clients
         SET inferred_stage = $1,
             updated_at = datetime('now')
         WHERE id = $2`,
        [target, client.id]
      );
      console.log('[ClientIntel] stage move UPDATE committed', {
        clientId: client.id,
        target,
      });

      const fromStageText =
        fromRaw == null || String(fromRaw).trim() === ''
          ? null
          : String(fromRaw);
      const toStageText = String(target);
      await dbExecute(
        `INSERT INTO client_stage_log (client_id, from_stage, to_stage, moved_at, moved_by, notes)
         VALUES ($1, $2, $3, datetime('now'), $4, $5)`,
        [String(client.id), fromStageText, toStageText, 'coach', null]
      );

      const detail = `${fromRaw ?? ''} → ${target}`;
      await logEntry(
        'stage_moved',
        client.id,
        fromRaw,
        detail,
        null,
        'deterministic'
      );

      localStorage.setItem('pipeline_updated', Date.now().toString());
      localStorage.setItem(
        'last_stage_move',
        JSON.stringify({
          client_id: client.id,
          client_name: client.name,
          from_stage: fromRaw,
          to_stage: target,
          moved_at: new Date().toISOString(),
        })
      );

      setOptimisticInferredStage(target);
      setStageMoveDialog(null);
      await onStageMoved?.(client.id, target);

      onStageMoveUndoOffer?.({
        clientId: String(client.id),
        clientName: client.name,
        fromStage:
          fromStageText == null || String(fromStageText).trim() === ''
            ? ''
            : String(fromStageText),
        toStage: String(target),
      });

      void getStageReadiness(client.id).then(setReadiness);
    } catch (e) {
      console.error('stage move failed:', e);
      onStageMoveToast?.(
        'Could not update stage. Please try again.',
        'error'
      );
    } finally {
      setStageMoveSaving(false);
    }
  };

  const handleInactivate = () => {
    if (!onInactivate) return;
    onInactivate(client.id);
    setShowInactivateConfirm(false);
  };

  function resetAhaForm() {
    setAhaText('');
    setAhaType('client_specific');
    setAhaTextError(false);
  }

  const handleSaveAhaMoment = async () => {
    const trimmed = ahaText.trim();
    if (!trimmed) {
      setAhaTextError(true);
      return;
    }
    setAhaTextError(false);
    setAhaSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const discStyle = client.disc.style;
      const stage = (effectiveInferredStageRaw ?? '').trim() || null;
      await dbExecute(
        `INSERT INTO aha_moments (id, client_id, moment_text, moment_type, disc_style, stage, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, client.id, trimmed, ahaType, discStyle, stage, now]
      );
      await logEntry(
        'aha_moment_captured',
        client.id,
        null,
        trimmed.slice(0, 80),
        null,
        'deterministic'
      );
      setAhaModalOpen(false);
      resetAhaForm();
      setAhaToast('Aha moment saved 💡');
    } catch (e) {
      console.error('aha moment save failed:', e);
    } finally {
      setAhaSaving(false);
    }
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
      session_scheduled: number | null;
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
       session_scheduled,
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

  const handleSaveRelocationInterest = async () => {
    setSavingRelocationInterest(true);
    try {
      const trimmed = relocationInterestDraft.trim();
      const value = trimmed.length > 0 ? trimmed : null;
      const db = await getDb();
      await db.execute(
        `UPDATE clients SET relocation_interest = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [value, client.id]
      );
      setRelocationInterestStored(value);
      setRelocationInterestDraft(trimmed);
      setEditingRelocationInterest(false);
    } finally {
      setSavingRelocationInterest(false);
    }
  };

  const handleSaveFundingContact = async () => {
    setSavingFundingContact(true);
    try {
      const trimmed = fundingContactDraft.trim();
      const value = trimmed.length > 0 ? trimmed : null;
      const db = await getDb();
      await db.execute(
        `UPDATE clients SET funding_contact = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [value, client.id]
      );
      setFundingContactStored(value);
      setFundingContactDraft(trimmed);
      setEditingFundingContact(false);
    } finally {
      setSavingFundingContact(false);
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

  const handleSaveReminder = async () => {
    if (!client?.id || !reminderDate.trim()) return;
    setReminderSaving(true);
    setReminderSavedLocallyMsg(false);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const noteTrim = reminderNote.trim();
    let usedDb = false;
    try {
      try {
        await dbExecute(
          `INSERT INTO reminders (id, client_id, remind_on, note, reminder_type, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, client.id, reminderDate.trim(), noteTrim || null, reminderType, now]
        );
        usedDb = true;
      } catch {
        try {
          const key = `reminder_${client.id}_${reminderDate.trim()}`;
          localStorage.setItem(
            key,
            JSON.stringify({ type: reminderType, note: noteTrim })
          );
          setReminderSavedLocallyMsg(true);
        } catch {
          /* ignore quota */
        }
      }
      setSavedReminder({
        date: reminderDate.trim(),
        type: reminderType,
        note: noteTrim,
        source: usedDb ? 'db' : 'local',
        dbId: usedDb ? id : undefined,
      });
      setReminderSetConfirm(true);
      window.setTimeout(() => setReminderSetConfirm(false), 4000);
    } finally {
      setReminderSaving(false);
    }
  };

  const handleClearSavedReminder = async () => {
    if (!client?.id || !savedReminder) return;
    if (savedReminder.source === 'db' && savedReminder.dbId) {
      try {
        await dbExecute(`DELETE FROM reminders WHERE id = ?`, [savedReminder.dbId]);
      } catch {
        /* ignore */
      }
    } else {
      try {
        const key = `reminder_${client.id}_${savedReminder.date}`;
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    setSavedReminder(null);
    setReminderSavedLocallyMsg(false);
    setReminderSetConfirm(false);
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

  const handleGenerateBestNextQuestions = async () => {
    if (!client?.id) return;
    setCouncilLoading(true);
    setCouncilError(null);
    setActiveLens('chairman');
    setRatedQuestions({});
    try {
      const d = discScores?.d ?? 0;
      const i = discScores?.i ?? 0;
      const s = discScores?.s ?? 0;
      const c = discScores?.c ?? 0;
      const spouseRaw =
        tumayData != null
          ? String(tumayData.spouse_alignment ?? '').trim()
          : '';
      const spouseAlignment =
        spouseRaw === 'Yes' || spouseRaw === 'No' || spouseRaw === 'Unsure'
          ? spouseRaw
          : 'Unknown';

      const stageForCouncilPrompt =
        councilQuestionTargetStage === codeForNav
          ? councilQuestionTargetStage
          : `${councilQuestionTargetStage} (TARGET: coach selected this pipeline stage for question generation. Client CRM recorded stage: ${codeForNav}. Frame every question to advance readiness toward ${councilQuestionTargetStage} while grounding in verified data about where the client is today.)`;

      const input: CouncilInput = {
        clientName: client.name,
        clientId: client.id,
        discStyle: discStyleLabel === '—' ? '' : discStyleLabel,
        discScores: { d, i, s, c },
        currentStage: stageForCouncilPrompt,
        dangers: you2Details?.dangers ?? [],
        strengths: you2Details?.strengths ?? [],
        opportunities: you2Details?.opportunities ?? [],
        oneYearVision:
          you2Vision.trim() || persistedVisionText || '',
        lastSessionNotes: latestSessionNotesPlain || '',
        pinkFlags: activePinkFlagsFiltered,
        netWorth: clientMergedFinancials.netWorth || '',
        spouseAlignment,
        sessionCount: fathomSessionCount,
        coachIdentity: (coachProfileRow?.bio ?? '').trim(),
        coachPhilosophy: (coachProfileRow?.coaching_philosophy ?? '').trim(),
      };

      const output = await withOllamaCheck(
        () => runCoachingCouncil(input),
        () =>
          setCouncilError(
            OLLAMA_NOT_READY_USER_MESSAGE
          )
      );
      if (output != null) {
        setCouncilOutput(output);
      }
    } catch (e) {
      console.error(e);
      setCouncilError(
        'Could not generate questions. Is Ollama running?'
      );
    } finally {
      setCouncilLoading(false);
    }
  };

  const handleRegenerateCouncil = async () => {
    setCouncilOutput(null);
    setRatedQuestions({});
    await handleGenerateBestNextQuestions();
  };

  const saveVisionToDb = async (text: string): Promise<void> => {
    if (!client?.id) return;
    try {
      const db = await getDb();
      await db.execute(
        `UPDATE clients
           SET vision_statement = $1,
               vision_approved = 1,
               vision_approved_date =
                 datetime('now'),
               updated_at = datetime('now')
           WHERE id = $2`,
        [text, client.id]
      );
      await logCorrection({
        clientId: client.id,
        fieldName: 'vision_statement',
        originalValue: client?.vision_statement
          ? String(
              client.vision_statement
            )
          : '',
        correctedValue: text,
        correctionType: 'vision_rubric',
        page: 'client_intelligence',
      });
    } catch (err) {
      console.error(
        'Vision save error:',
        err
      );
    }
  };

  const handleGenerateVision = async (
    feedbackContext?: string
  ): Promise<void> => {
    if (!client?.id) return;
    try {
      setVisionGenerating(true);
      setVisionError(null);
      setVisionRubric(null);
      setVisionRubricSubmitted(false);

      const clientName =
        client?.name || 'this client';
      const discStyle =
        discStyleLabel === '—' ? '' : discStyleLabel;
      const dangers =
        (you2Details?.dangers ?? []).join(', ');
      const vision =
        you2Vision || '';
      const sessionNotes =
        latestSessionNotesPlain || '';

      const feedbackSection =
        feedbackContext
          ? `\n\nIMPROVEMENT FEEDBACK
FROM PREVIOUS VERSION:
${feedbackContext}
Apply this feedback directly.
Fix what was missing.
Adjust tone as directed.
Do not repeat the same mistakes.`
          : '';

      const prompt =
        `You are a franchise career coach.
Write a personal vision statement
for ${clientName}.

Use only this verified information:
DISC Style: ${discStyle}
One Year Vision: ${vision}
Key Concerns: ${dangers}
Recent Session Notes: ${sessionNotes}

STRICT RULES:
Write in first person as ${clientName}.
Write 2-3 paragraphs.
Sound warm personal and specific.
Reference their actual goals and fears.
Do NOT mention DISC assessments.
Do NOT use coaching jargon.
Do NOT use the word journey.
Do NOT say I am committed to.
Do NOT use em dashes (--) or (—)
anywhere in the text.
Use commas or periods instead.
Sound like a real person talking
about their real life.
Be specific use their actual goals
not generic statements.${feedbackSection}`;

      const visionFutureTenseSystem = `Write entirely in future-focused
present tense and forward-looking
language. Use 'you are' not
'you have been'. Use 'you will'
not 'you were'. Use 'your future'
not 'your past'. Never use 'I've',
'I have been', 'I was', or any
past tense construction. This is a
vision statement. It describes
who this person is becoming,
not who they have been.`;

      const generated = await withOllamaCheck(
        async () => {
          const result = await invoke<any>(
            'ollama_generate',
            {
              model: 'qwen2.5:7b',
              prompt: prompt,
              system: visionFutureTenseSystem,
              stream: false,
            }
          );

          const text =
            typeof result === 'string'
              ? result.trim()
              : String(
                  result?.response ||
                    result?.message?.content ||
                    ''
                ).trim();

          if (!text || text.length < 20) {
            throw new Error('vision_empty');
          }
          return text;
        },
        () => {
          setVisionError(
            OLLAMA_NOT_READY_USER_MESSAGE
          );
          setVisionGenerating(false);
        }
      );

      if (generated == null) {
        return;
      }

      const postProcessVisionFutureTense = (
        raw: string
      ): string => {
        let t = raw;
        const pairs: Array<[RegExp, string]> = [
          [/I've been/gi, 'I am'],
          [/I\u2019ve been/gi, 'I am'],
          [/I have been/gi, 'I am'],
          [/I was\b/gi, 'I am'],
          [/you've been/gi, 'you are'],
          [/you\u2019ve been/gi, 'you are'],
          [/you have been/gi, 'you are'],
          [/you were\b/gi, 'you are'],
          [/\bI've\b/gi, 'I'],
          [/\bI\u2019ve\b/gi, 'I'],
        ];
        for (const [re, rep] of pairs) {
          t = t.replace(re, rep);
        }
        return t;
      };

      const tenseAdjusted =
        postProcessVisionFutureTense(
          generated
        );
      const sanitized = sanitizeText(tenseAdjusted);
      setVisionText(sanitized);
      setVisionGenerating(false);
    } catch (err) {
      console.error(
        'Vision generation error:',
        err
      );
      setVisionGenerating(false);
      setVisionError(
        'Could not generate. ' +
          'Make sure Ollama is running.'
      );
    }
  };

  const handleDownloadVisionPpt =
    async (): Promise<void> => {
      if (!client?.id) return;
      try {
        const text = sanitizeText(visionText.trim());
        if (!text) return;

        const PptxGenJS =
          (await import('pptxgenjs'))
            .default;
        const pptx = new PptxGenJS();

        pptx.defineLayout({
          name: 'LAYOUT_WIDE',
          width: 13.33,
          height: 7.5,
        });
        pptx.layout = 'LAYOUT_WIDE';

        const slide = pptx.addSlide();
        slide.background = {
          color: '2D4459',
        };

        slide.addText(
          client?.name || '', {
            x: 0.5,
            y: 0.3,
            w: 12,
            h: 0.6,
            fontSize: 24,
            bold: true,
            color: '3BBFBF',
            fontFace: 'Calibri',
          }
        );

        slide.addText(
          'Vision Statement', {
            x: 0.5,
            y: 0.9,
            w: 12,
            h: 0.4,
            fontSize: 14,
            color: 'C8E8E5',
            fontFace: 'Calibri',
          }
        );

        const hasTerritory = territoryNotes.trim().length > 0;
        const visionBodyH = hasTerritory ? 4.28 : 4.98;
        slide.addText(text, {
          x: 0.5,
          y: 1.5,
          w: 12,
          h: visionBodyH,
          fontSize: 15,
          color: 'FFFFFF',
          fontFace: 'Calibri',
          valign: 'top',
          wrap: true,
        });

        if (hasTerritory) {
          slide.addText(
            `Territory Notes: ${territoryNotes}`,
            {
              x: 0.5,
              y: 5.88,
              w: 12,
              h: 0.48,
              fontSize: 11,
              color: 'C8E8E5',
              fontFace: 'Calibri',
              italic: true,
            }
          );
        }

        const footerLine1Y = hasTerritory ? 6.44 : 6.82;
        const footerLine2Y = hasTerritory ? 6.66 : 7.04;
        slide.addText('Coach Sandi Stahl', {
          x: 0.5,
          y: footerLine1Y,
          w: 12,
          h: 0.22,
          fontSize: 11,
          bold: true,
          color: 'C8E8E5',
          fontFace: 'Calibri',
        });
        slide.addText('Franchise Coach', {
          x: 0.5,
          y: footerLine2Y,
          w: 12,
          h: 0.2,
          fontSize: 10,
          color: '7A8F95',
          fontFace: 'Calibri',
        });

        const motKind = visionMotivationKindFromDiscScores(discScores);
        const motImagePath =
          motKind === 'cliff'
            ? '/coach-motivation-cliff-you.jpg'
            : '/coach-motivation-road.jpg';
        const motQuote =
          motKind === 'cliff'
            ? VISION_MOTIVATION_CLIFF_QUOTE
            : VISION_MOTIVATION_ROAD_QUOTE;
        try {
          const imgResp = await fetch(motImagePath);
          if (imgResp.ok) {
            const motBuf = await imgResp.arrayBuffer();
            const motData = visionMotivationJpegToDataUrl(motBuf);
            const motSlide = pptx.addSlide();
            motSlide.addImage({
              data: motData,
              x: 0,
              y: 0,
              w: 13.33,
              h: 7.5,
            });
            motSlide.addText(motQuote, {
              x: 0.65,
              y: 5.05,
              w: 12.03,
              h: 1.75,
              fontSize: motKind === 'cliff' ? 26 : 22,
              bold: true,
              color: 'FFFFFF',
              fontFace: 'Calibri',
              align: 'center',
              valign: 'middle',
              wrap: true,
            });
            motSlide.addText('Coach Sandi Stahl', {
              x: 0.5,
              y: 7.02,
              w: 12,
              h: 0.2,
              fontSize: 10,
              bold: true,
              color: 'C8E8E5',
              fontFace: 'Calibri',
            });
            motSlide.addText('Franchise Coach', {
              x: 0.5,
              y: 7.22,
              w: 12,
              h: 0.18,
              fontSize: 9,
              color: '7A8F95',
              fontFace: 'Calibri',
            });
          }
        } catch {
          /* motivation slide optional */
        }

        const safeName =
          (client?.name || 'client')
            .replace(/[^a-z0-9]/gi, '_');
        const outName = `${safeName}_Vision.pptx`;

        try {
          const pptxData = (await pptx.write({
            outputType: 'arraybuffer',
          })) as ArrayBuffer;
          const uint8Array = new Uint8Array(pptxData);
          try {
            await visionWriteBytesToDownloads(
              outName,
              uint8Array
            );
          } catch (fsErr) {
            console.warn(
              'Vision PPT: Tauri fs save failed, using writeFile',
              fsErr
            );
            await pptx.writeFile({
              fileName: outName,
            });
          }
        } catch (writeErr) {
          console.warn(
            'Vision PPT: pptx.write failed, using writeFile',
            writeErr
          );
          await pptx.writeFile({
            fileName: outName,
          });
        }

        setVisionError(null);
        setVisionSaveSuccess(
          `Saved to Downloads: ${outName}`
        );
        setTimeout(
          () => setVisionSaveSuccess(null),
          4000
        );

        await saveVisionToDb(text);
      } catch (err) {
        console.error(
          'PPT download error:',
          err
        );
        setVisionError(
          'Could not download PowerPoint.'
        );
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

  const fathomSessionPlainNotes = (sess: (typeof fathomSessions)[number]): string => {
    const parsed = safeParseJson(sess.notes ?? '');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const sum = String((parsed as { summary?: unknown }).summary ?? '').trim();
      if (sum) return sum;
    }
    return sanitizeSessionNotes(sess.notes);
  };

  const fathomClearBadgeStyle = (score: number) => {
    if (score >= 4) return { background: '#DCFCE7', color: '#166534' };
    if (score >= 3) return { background: '#FEF3C7', color: '#B45309' };
    return { background: '#FEE2E2', color: '#B91C1C' };
  };

  const FATHOM_NOT_CAPTURED = (
    <span style={{ color: '#C8E8E5', fontSize: 11, fontStyle: 'italic' }}>Not captured in this session</span>
  );

  const fathomValueEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    const s = String(value).trim();
    if (s === '') return true;
    const sl = s.toLowerCase();
    if (sl === 'unknown' || sl === 'null' || sl === '-' || sl === '—') return true;
    if (/^[-—\s]+$/u.test(s)) return true;
    return false;
  };

  const fathomBlockRawEmpty = (raw: string | null | undefined): boolean => {
    if (raw == null) return true;
    const t = String(raw).trim();
    if (t === '') return true;
    const tl = t.toLowerCase();
    if (tl === 'unknown' || tl === 'null' || tl === '-' || tl === '—') return true;
    if (t === '{}' || t === '[]') return true;
    if (/^[-—\s]+$/u.test(t)) return true;
    return false;
  };

  const fathomField = (value: unknown): ReactNode =>
    fathomValueEmpty(value) ? FATHOM_NOT_CAPTURED : String(value).trim();

  const fathomEmptyBlockShell = (def: (typeof blockDefinitions)[number]) => (
    <details key={def.key} className="rounded border border-[#C8E8E5] bg-white p-2">
      <summary className={`cursor-pointer font-medium ${def.color}`}>
        {def.icon} {def.title}
      </summary>
      <div className="mt-2 text-sm">{FATHOM_NOT_CAPTURED}</div>
    </details>
  );

  const renderFathomStructuredSection = (
    s: (typeof fathomSessions)[number],
    def: (typeof blockDefinitions)[number]
  ) => {
    switch (def.key) {
      case 'block_opening': {
        if (fathomBlockRawEmpty(s.block_opening)) return fathomEmptyBlockShell(def);
        const opening = parseSessionBlock(s.block_opening);
        if (!opening) return fathomEmptyBlockShell(def);
        return (
          <details key={def.key} open className="rounded border border-[#C8E8E5] bg-white p-2">
            <summary className={`cursor-pointer font-medium ${def.color}`}>
              {def.icon} {def.title}
            </summary>
            <div className="mt-2 space-y-1 text-sm">
              <div>
                Energy:{' '}
                <Badge variant="outline">{fathomField(opening?.client_energy as string | undefined)}</Badge>
              </div>
              <div>Contracting: {opening?.contracting_done ? '✓' : '✗'}</div>
              <div>Client set agenda: {opening?.client_set_agenda ? '✓' : '✗'}</div>
              <p>{fathomField(opening?.opening_summary as string | undefined)}</p>
            </div>
          </details>
        );
      }
      case 'block_emotional': {
        if (fathomBlockRawEmpty(s.block_emotional)) return fathomEmptyBlockShell(def);
        const emotional = parseSessionBlock(s.block_emotional);
        if (!emotional) return fathomEmptyBlockShell(def);
        const emotions = parseListField(emotional?.emotions_expressed).filter((v) => !fathomValueEmpty(v));
        const fears = parseListField(emotional?.fears_mentioned).filter((v) => !fathomValueEmpty(v));
        const identityJoined = parseListField(emotional?.identity_statements)
          .filter((v) => !fathomValueEmpty(v))
          .join(' | ');
        return (
          <details key={def.key} className="rounded border border-[#C8E8E5] bg-white p-2">
            <summary className={`cursor-pointer font-medium ${def.color}`}>
              {def.icon} {def.title}
            </summary>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                {emotions.length === 0
                  ? FATHOM_NOT_CAPTURED
                  : emotions.map((v, i) => (
                      <Badge key={`e-${i}`} className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                        {v}
                      </Badge>
                    ))}
              </div>
              {fears.length === 0 ? (
                FATHOM_NOT_CAPTURED
              ) : (
                <ul className="list-inside list-disc">
                  {fears.map((v, i) => (
                    <li key={`f-${i}`}>{v}</li>
                  ))}
                </ul>
              )}
              <blockquote className="border-l-2 pl-2 text-slate-700">
                {identityJoined.length > 0 ? identityJoined : FATHOM_NOT_CAPTURED}
              </blockquote>
            </div>
          </details>
        );
      }
      case 'block_life_context': {
        if (fathomBlockRawEmpty(s.block_life_context)) return fathomEmptyBlockShell(def);
        const life = parseSessionBlock(s.block_life_context);
        if (!life) return fathomEmptyBlockShell(def);
        return (
          <details key={def.key} className="rounded border border-[#C8E8E5] bg-white p-2">
            <summary className={`cursor-pointer font-medium ${def.color}`}>
              {def.icon} {def.title}
            </summary>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{fathomField(life?.spouse_sentiment as string | undefined)}</Badge>
                <Badge variant="outline">{fathomField(life?.current_job_situation as string | undefined)}</Badge>
                <Badge variant="outline">{fathomField(life?.financial_comfort as string | undefined)}</Badge>
              </div>
              <p>{fathomField(life?.personal_circumstances as string | undefined)}</p>
            </div>
          </details>
        );
      }
      case 'block_vision': {
        if (fathomBlockRawEmpty(s.block_vision)) return fathomEmptyBlockShell(def);
        const vision = parseSessionBlock(s.block_vision);
        if (!vision) return fathomEmptyBlockShell(def);
        const lifestyle = parseListField(vision?.lifestyle_details).filter((v) => !fathomValueEmpty(v));
        const bizModels = parseListField(vision?.business_models_discussed).filter((v) => !fathomValueEmpty(v));
        return (
          <details key={def.key} className="rounded border border-[#C8E8E5] bg-white p-2">
            <summary className={`cursor-pointer font-medium ${def.color}`}>
              {def.icon} {def.title}
            </summary>
            <div className="mt-2 space-y-1 text-sm">
              <div>Future described: {vision?.future_life_described ? '✓' : '✗'}</div>
              {lifestyle.length === 0 ? (
                FATHOM_NOT_CAPTURED
              ) : (
                <ul className="list-inside list-disc">
                  {lifestyle.map((v, i) => (
                    <li key={`l-${i}`}>{v}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                {bizModels.length === 0
                  ? FATHOM_NOT_CAPTURED
                  : bizModels.map((v, i) => (
                      <Badge key={`bm-${i}`} variant="secondary">
                        {v}
                      </Badge>
                    ))}
              </div>
              <div>
                Ownership identity:{' '}
                <Badge variant="outline">{fathomField(vision?.ownership_identity as string | undefined)}</Badge>
              </div>
            </div>
          </details>
        );
      }
      case 'block_disc_signals': {
        if (fathomBlockRawEmpty(s.block_disc_signals)) return fathomEmptyBlockShell(def);
        const discB = parseSessionBlock(s.block_disc_signals);
        if (!discB) return fathomEmptyBlockShell(def);
        const styleObs = parseListField(discB?.style_observations).filter((v) => !fathomValueEmpty(v));
        return (
          <details key={def.key} className="rounded border border-[#C8E8E5] bg-white p-2">
            <summary className={`cursor-pointer font-medium ${def.color}`}>
              {def.icon} {def.title}
            </summary>
            <div className="mt-2 space-y-1 text-sm">
              <div>
                Observed style:{' '}
                <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                  {fathomField(discB?.observed_style as string | undefined)}
                </Badge>
              </div>
              {styleObs.length === 0 ? (
                FATHOM_NOT_CAPTURED
              ) : (
                <ul className="list-inside list-disc">
                  {styleObs.map((v, i) => (
                    <li key={`so-${i}`}>{v}</li>
                  ))}
                </ul>
              )}
              <div>Matches profile: {discB?.matches_profile ? '✓' : '✗'}</div>
              <p className="italic">{fathomField(discB?.coaching_note as string | undefined)}</p>
            </div>
          </details>
        );
      }
      case 'block_objections': {
        if (fathomBlockRawEmpty(s.block_objections)) return fathomEmptyBlockShell(def);
        const objections = parseSessionBlock(s.block_objections);
        if (!objections) return fathomEmptyBlockShell(def);
        const objList = parseListField(objections?.objections).filter((v) => !fathomValueEmpty(v));
        const pink = parseListField(objections?.pink_flag_language).filter((v) => !fathomValueEmpty(v));
        const repeatJoined = parseListField(objections?.repeat_objections)
          .filter((v) => !fathomValueEmpty(v))
          .join(', ');
        return (
          <details key={def.key} className="rounded border border-[#C8E8E5] bg-white p-2">
            <summary className={`cursor-pointer font-medium ${def.color}`}>
              {def.icon} {def.title}
            </summary>
            <div className="mt-2 space-y-1 text-sm">
              {objList.length === 0 ? (
                FATHOM_NOT_CAPTURED
              ) : (
                <ul className="list-inside list-disc">
                  {objList.map((v, i) => (
                    <li key={`o-${i}`}>{v}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                {pink.length === 0
                  ? FATHOM_NOT_CAPTURED
                  : pink.map((v, i) => (
                      <Badge key={`pfl-${i}`} className="bg-red-100 text-red-800 hover:bg-red-100">
                        {v}
                      </Badge>
                    ))}
              </div>
              <p className="font-medium">
                Repeat: {repeatJoined.length > 0 ? repeatJoined : FATHOM_NOT_CAPTURED}
              </p>
            </div>
          </details>
        );
      }
      case 'block_commitments': {
        if (fathomBlockRawEmpty(s.block_commitments)) return fathomEmptyBlockShell(def);
        const commitments = parseSessionBlock(s.block_commitments);
        if (!commitments) return fathomEmptyBlockShell(def);
        const cc = parseListField(commitments?.client_commitments).filter((v) => !fathomValueEmpty(v));
        return (
          <details key={def.key} className="rounded border border-[#C8E8E5] bg-white p-2">
            <summary className={`cursor-pointer font-medium ${def.color}`}>
              {def.icon} {def.title}
            </summary>
            <div className="mt-2 space-y-1 text-sm">
              {cc.length === 0 ? (
                FATHOM_NOT_CAPTURED
              ) : (
                <ul className="list-inside list-disc">
                  {cc.map((v, i) => (
                    <li key={`cc-${i}`}>{v}</li>
                  ))}
                </ul>
              )}
              <div>Client chose action: {commitments?.client_chose_action ? '✓' : '✗'}</div>
              <div>Next call: {fathomField(commitments?.next_call_date as string | undefined)}</div>
            </div>
          </details>
        );
      }
      case 'block_reflection_block': {
        if (fathomBlockRawEmpty(s.block_reflection_block)) return fathomEmptyBlockShell(def);
        const reflection = parseSessionBlock(s.block_reflection_block);
        if (!reflection) return fathomEmptyBlockShell(def);
        return (
          <details key={def.key} className="rounded border border-[#C8E8E5] bg-white p-2">
            <summary className={`cursor-pointer font-medium ${def.color}`}>
              {def.icon} {def.title}
            </summary>
            <div className="mt-2 space-y-1 text-sm">
              <blockquote className="border-l-2 pl-2">
                {fathomField(reflection?.insight_surfaced as string | undefined)}
              </blockquote>
              <p>{fathomField(reflection?.mindset_shift as string | undefined)}</p>
              <Badge variant="outline">{fathomField(reflection?.engagement_quality as string | undefined)}</Badge>
            </div>
          </details>
        );
      }
      case 'block_coach_assessment': {
        if (fathomBlockRawEmpty(s.block_coach_assessment)) return fathomEmptyBlockShell(def);
        const assessment = parseSessionBlock(s.block_coach_assessment);
        if (!assessment) return fathomEmptyBlockShell(def);
        return (
          <details key={def.key} className="rounded border border-[#C8E8E5] bg-white p-2">
            <summary className={`cursor-pointer font-medium ${def.color}`}>
              {def.icon} {def.title}
            </summary>
            <div className="mt-2 space-y-2 text-sm">
              <Badge
                className={
                  String(assessment?.recommendation ?? '') === 'VALIDATE'
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : String(assessment?.recommendation ?? '') === 'PAUSE'
                      ? 'bg-slate-200 text-slate-800 hover:bg-slate-200'
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                }
              >
                {fathomField(assessment?.recommendation as string | undefined)}
              </Badge>
              <p>
                {String(assessment?.readiness_direction ?? '') === 'improving'
                  ? '↑ '
                  : String(assessment?.readiness_direction ?? '') === 'declining'
                    ? '↓ '
                    : '→ '}
                {fathomField(assessment?.readiness_direction as string | undefined)}
              </p>
              <p>{fathomField(assessment?.next_call_focus as string | undefined)}</p>
              <div className="rounded bg-blue-50 p-2 text-blue-900">
                {fathomField(assessment?.priority_question as string | undefined)}
              </div>
            </div>
          </details>
        );
      }
      default:
        return null;
    }
  };

  const discUi = CI_DISC_STYLE[client.disc.style];

  const aiWorking =
    visionGenerating || councilLoading || fathomUploading;

  const tumayRelocationFundingFields = (
    <>
      <div className="md:col-span-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span
            className="font-medium shrink-0"
            style={{ color: '#2D4459', fontSize: 13 }}
          >
            Considering Relocating To
          </span>
          {!editingRelocationInterest ? (
            <button
              type="button"
              className="shrink-0 rounded p-1 text-[#3BBFBF] transition-opacity hover:opacity-80"
              title="Edit"
              aria-label="Edit considering relocating to"
              onClick={() => {
                setRelocationInterestDraft(
                  (relocationInterestStored ?? '').trim()
                );
                setEditingRelocationInterest(true);
              }}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
        {editingRelocationInterest ? (
          <div className="mt-1 space-y-2">
            <Input
              value={relocationInterestDraft}
              onChange={(e) =>
                setRelocationInterestDraft(e.target.value)
              }
              placeholder="City, State"
              className="text-[14px]"
              style={{
                borderColor: '#3BBFBF',
                color: '#2D4459',
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="font-semibold text-white"
                style={{ background: '#3BBFBF' }}
                disabled={savingRelocationInterest}
                onClick={() => void handleSaveRelocationInterest()}
              >
                {savingRelocationInterest ? 'Saving…' : 'Save'}
              </Button>
              <button
                type="button"
                className="text-sm font-semibold underline-offset-2 hover:underline"
                style={{ color: '#3BBFBF' }}
                disabled={savingRelocationInterest}
                onClick={() => {
                  setRelocationInterestDraft(
                    (relocationInterestStored ?? '').trim()
                  );
                  setEditingRelocationInterest(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mt-0.5 w-full text-left text-[14px] leading-snug"
            style={{ color: '#2D4459' }}
            onClick={() => {
              setRelocationInterestDraft(
                (relocationInterestStored ?? '').trim()
              );
              setEditingRelocationInterest(true);
            }}
          >
            {toDisplayValue(relocationInterestStored)}
          </button>
        )}
      </div>
      <div className="md:col-span-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span
            className="font-medium shrink-0"
            style={{ color: '#2D4459', fontSize: 13 }}
          >
            Funding Contact
          </span>
          {!editingFundingContact ? (
            <button
              type="button"
              className="shrink-0 rounded p-1 text-[#3BBFBF] transition-opacity hover:opacity-80"
              title="Edit"
              aria-label="Edit funding contact"
              onClick={() => {
                setFundingContactDraft((fundingContactStored ?? '').trim());
                setEditingFundingContact(true);
              }}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
        {editingFundingContact ? (
          <div className="mt-1 space-y-2">
            <Input
              value={fundingContactDraft}
              onChange={(e) => setFundingContactDraft(e.target.value)}
              placeholder="Name — Company"
              className="text-[14px]"
              style={{
                borderColor: '#3BBFBF',
                color: '#2D4459',
              }}
            />
            <p
              className="text-[12px] italic"
              style={{ color: '#7A8F95' }}
            >
              Example: Sarah — Benetrends
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="font-semibold text-white"
                style={{ background: '#3BBFBF' }}
                disabled={savingFundingContact}
                onClick={() => void handleSaveFundingContact()}
              >
                {savingFundingContact ? 'Saving…' : 'Save'}
              </Button>
              <button
                type="button"
                className="text-sm font-semibold underline-offset-2 hover:underline"
                style={{ color: '#3BBFBF' }}
                disabled={savingFundingContact}
                onClick={() => {
                  setFundingContactDraft(
                    (fundingContactStored ?? '').trim()
                  );
                  setEditingFundingContact(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mt-0.5 w-full text-left text-[14px] leading-snug"
            style={{ color: '#2D4459' }}
            onClick={() => {
              setFundingContactDraft((fundingContactStored ?? '').trim());
              setEditingFundingContact(true);
            }}
          >
            {toDisplayValue(fundingContactStored)}
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {aiWorking ? (
        <div
          className="mb-3 shrink-0 rounded-lg px-4 py-3 text-center text-sm font-semibold shadow-sm"
          style={{ background: '#3BBFBF', color: 'white' }}
          role="status"
          aria-live="polite"
        >
          AI is working — please stay on this page until complete
        </div>
      ) : null}
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
                  backgroundColor: getStageBadgeColor(
                    (effectiveInferredStageRaw ?? '').trim()
                  ),
                }}
              >
                {stageHeaderBadgeText}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getBucketDisplayName(client.outcome_bucket)}
              </Badge>
              {activePinkFlagsFiltered.length > 0 ? (
                <Badge
                  className="min-h-6 min-w-6 shrink-0 border-0 bg-red-600 px-2 text-xs font-bold text-white hover:bg-red-600"
                  title={`${activePinkFlagsFiltered.length} active pink flag(s)`}
                >
                  {activePinkFlagsFiltered.length}
                </Badge>
              ) : null}
            </div>
            <div className="mt-1 text-xs" style={{ color: '#7A8F95' }}>
              {[contact.email, contact.phone].filter(Boolean).join(' · ') || '—'}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAhaModalOpen(true)}
              className="text-xs font-bold transition-opacity hover:opacity-90"
              style={{
                background: '#FAEEDA',
                color: '#C8613F',
                border: '1px solid #C8613F',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
              }}
            >
              💡 Aha Moment
            </button>
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
          </div>
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
          <TabsList className="mb-0 grid h-auto w-full grid-cols-8 gap-0 rounded-none border-0 bg-transparent p-1">
            <TabsTrigger
              value="overview"
              className="rounded-md border-0 border-b-[3px] border-transparent bg-transparent px-2 py-2.5 text-sm font-medium shadow-none data-[state=active]:border-[#3BBFBF] data-[state=active]:bg-transparent data-[state=active]:text-[#3BBFBF] data-[state=inactive]:text-[#7A8F95]"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="best-next-questions"
              className="rounded-md border-0 border-b-[3px] border-transparent bg-transparent px-1 py-2 text-[11px] font-medium leading-tight shadow-none data-[state=active]:border-[#3BBFBF] data-[state=active]:bg-transparent data-[state=active]:text-[#3BBFBF] data-[state=inactive]:text-[#7A8F95]"
            >
              <span className="block text-center">Best Next</span>
              <span className="block text-center">Questions</span>
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
            <div className="h-full max-h-[75vh] min-w-0 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 min-w-0 gap-4 md:grid-cols-3">
              <Card className="min-w-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className="font-bold"
                    style={{ color: '#2D4459', fontSize: 24 }}
                  >
                    {stageDisplay.code}
                  </p>
                  <p style={{ color: '#7A8F95', fontSize: 13, marginTop: 4 }}>
                    {stageDisplay.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {stageCompartmentSubtitle}
                  </p>
                  <div
                    className="flex flex-row justify-between"
                    style={{ marginTop: 12 }}
                  >
                    {prevStageMove ? (
                      <button
                        type="button"
                        onClick={() =>
                          setStageMoveDialog({
                            target: prevStageMove,
                            direction: 'back',
                          })
                        }
                        className="text-left transition-opacity hover:opacity-90"
                        style={{
                          background: 'white',
                          border: '1px solid #C8E8E5',
                          color: '#7A8F95',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                        }}
                      >
                        ← Move Back
                      </button>
                    ) : (
                      <span />
                    )}
                    {nextStageMove ? (
                      <button
                        type="button"
                        onClick={() =>
                          setStageMoveDialog({
                            target: nextStageMove,
                            direction: 'forward',
                          })
                        }
                        className="text-right font-bold transition-opacity hover:opacity-90"
                        style={{
                          background: '#3BBFBF',
                          color: 'white',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                        }}
                      >
                        Move Forward →
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="min-w-0">
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
                          {formatGoneQuietLabel(
                            daysSince(lastContactDateDb)
                          )}
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
              <Card className="min-w-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Readiness</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0">
                  <div className="space-y-3">
                    <div>
                      <p
                        className="font-semibold uppercase tracking-wide"
                        style={{ color: '#7A8F95', fontSize: 11 }}
                      >
                        Readiness Score
                      </p>
                      <div className="mt-1 flex flex-nowrap items-baseline gap-x-3">
                        <span
                          className="whitespace-nowrap"
                          style={{
                            color: '#2D4459',
                            fontSize: 24,
                            fontWeight: 700,
                          }}
                        >
                          {sandiReadinessDimensions.total} /{' '}
                          {sandiReadinessDimensions.maxTotal}
                        </span>
                        <span
                          className="whitespace-nowrap"
                          style={{
                            color: '#2D4459',
                            fontSize: 24,
                            fontWeight: 700,
                          }}
                        >
                          {sandiReadinessDimensions.pct}%
                        </span>
                      </div>
                      <p
                        className="mt-1 font-semibold"
                        style={{
                          color: sandiReadinessStatusLabel(
                            sandiReadinessDimensions.pct
                          ).color,
                        }}
                      >
                        {
                          sandiReadinessStatusLabel(sandiReadinessDimensions.pct)
                            .text
                        }
                      </p>
                    </div>
                    <div
                      className="overflow-hidden"
                      style={{
                        height: 8,
                        background: '#F4F7F8',
                        borderRadius: 4,
                      }}
                    >
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min(100, sandiReadinessDimensions.pct)}%`,
                          background: sandiReadinessOverallBarColor(
                            sandiReadinessDimensions.pct
                          ),
                          borderRadius: 4,
                        }}
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <div
                        className="flex min-w-0 items-center gap-2"
                        style={{
                          background: 'white',
                          border: '1px solid #C8E8E5',
                          borderRadius: 10,
                          padding: '12px 16px',
                          marginBottom: 8,
                        }}
                      >
                        <div className="min-w-0 shrink" style={{ flex: '1 1 36%' }}>
                          <div
                            style={{
                              color: '#2D4459',
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            Identity
                          </div>
                          <div style={{ color: '#7A8F95', fontSize: 11 }}>
                            DISC + You 2.0 + Fathom
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 px-1">
                          <div
                            className="overflow-hidden"
                            style={{
                              height: 6,
                              background: '#F4F7F8',
                              borderRadius: 3,
                            }}
                          >
                            <div
                              style={{
                                width: `${(sandiReadinessDimensions.identity / 25) * 100}%`,
                                height: '100%',
                                background: '#3BBFBF',
                                borderRadius: 3,
                              }}
                            />
                          </div>
                        </div>
                        <div
                          className="shrink-0 whitespace-nowrap text-right"
                          style={{
                            color: '#2D4459',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {sandiReadinessDimensions.identity} / 25
                        </div>
                      </div>

                      <div
                        className="flex min-w-0 items-center gap-2"
                        style={{
                          background: 'white',
                          border: '1px solid #C8E8E5',
                          borderRadius: 10,
                          padding: '12px 16px',
                          marginBottom: 8,
                        }}
                      >
                        <div className="min-w-0 shrink" style={{ flex: '1 1 36%' }}>
                          <div
                            style={{
                              color: '#2D4459',
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            Commitment
                          </div>
                          <div style={{ color: '#7A8F95', fontSize: 11 }}>
                            Vision + Timeline + Spouse
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 px-1">
                          <div
                            className="overflow-hidden"
                            style={{
                              height: 6,
                              background: '#F4F7F8',
                              borderRadius: 3,
                            }}
                          >
                            <div
                              style={{
                                width: `${(sandiReadinessDimensions.commitment / 25) * 100}%`,
                                height: '100%',
                                background: '#2D4459',
                                borderRadius: 3,
                              }}
                            />
                          </div>
                        </div>
                        <div
                          className="shrink-0 whitespace-nowrap text-right"
                          style={{
                            color: '#2D4459',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {sandiReadinessDimensions.commitment} / 25
                        </div>
                      </div>

                      <div
                        className="flex min-w-0 items-center gap-2"
                        style={{
                          background: 'white',
                          border: '1px solid #C8E8E5',
                          borderRadius: 10,
                          padding: '12px 16px',
                          marginBottom: 8,
                        }}
                      >
                        <div className="min-w-0 shrink" style={{ flex: '1 1 36%' }}>
                          <div
                            style={{
                              color: '#2D4459',
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            Financial
                          </div>
                          <div style={{ color: '#7A8F95', fontSize: 11 }}>
                            Net worth + Credit + Timeline
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 px-1">
                          <div
                            className="overflow-hidden"
                            style={{
                              height: 6,
                              background: '#F4F7F8',
                              borderRadius: 3,
                            }}
                          >
                            <div
                              style={{
                                width: `${(sandiReadinessDimensions.financial / 25) * 100}%`,
                                height: '100%',
                                background: '#C8613F',
                                borderRadius: 3,
                              }}
                            />
                          </div>
                        </div>
                        <div
                          className="shrink-0 whitespace-nowrap text-right"
                          style={{
                            color: '#2D4459',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {sandiReadinessDimensions.financial} / 25
                        </div>
                      </div>

                      <div
                        className="flex min-w-0 items-center gap-2"
                        style={{
                          background: 'white',
                          border: '1px solid #C8E8E5',
                          borderRadius: 10,
                          padding: '12px 16px',
                          marginBottom: 8,
                        }}
                      >
                        <div className="min-w-0 shrink" style={{ flex: '1 1 36%' }}>
                          <div
                            style={{
                              color: '#2D4459',
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            Discovery
                          </div>
                          <div style={{ color: '#7A8F95', fontSize: 11 }}>
                            ZOR + Franchise + Profile
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-center px-1">
                          {sandiReadinessDimensions.discoveryLocked ? (
                            <span
                              className="italic"
                              style={{ color: '#7A8F95', fontSize: 11 }}
                            >
                              Unlocks at C4
                            </span>
                          ) : (
                            <div
                              className="w-full overflow-hidden"
                              style={{
                                height: 6,
                                background: '#F4F7F8',
                                borderRadius: 3,
                              }}
                            >
                              <div
                                style={{
                                  width: `${(sandiReadinessDimensions.discovery / 25) * 100}%`,
                                  height: '100%',
                                  background: '#F05F57',
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <div
                          className="shrink-0 whitespace-nowrap text-right"
                          style={{
                            color: '#2D4459',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {sandiReadinessDimensions.discoveryLocked
                            ? ''
                            : `${sandiReadinessDimensions.discovery} / 25`}
                        </div>
                      </div>
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
                {activePinkFlagsFiltered.length === 0 ? (
                  <p className="text-sm text-slate-500">No active flags</p>
                ) : (
                  <ul className="space-y-2">
                    {activePinkFlagsFiltered.map((flag, pinkFlagIdx) => (
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

            {showFranchiseRecommendationsSection ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3
                      className="font-bold"
                      style={{ color: '#2D4459', fontSize: 15 }}
                    >
                      Franchise Recommendations
                    </h3>
                    <p style={{ color: '#7A8F95', fontSize: 12, marginTop: 4 }}>
                      Businesses presented during Initial Validation
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 font-bold transition-opacity hover:opacity-90"
                    style={{
                      background: '#3BBFBF',
                      color: 'white',
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 12,
                      border: 'none',
                    }}
                    onClick={handleStartAddFranchise}
                  >
                    + Add Franchise
                  </button>
                </div>

                {franchiseFormOpen ? (
                  <div
                    className="space-y-3 rounded-lg border p-4"
                    style={{ borderColor: '#C8E8E5', background: '#FEFAF5' }}
                  >
                    <div>
                      <Label
                        htmlFor="franchise-name-input"
                        style={{ color: '#2D4459', fontSize: 13 }}
                      >
                        Franchise name
                      </Label>
                      <Input
                        id="franchise-name-input"
                        className="mt-1"
                        value={franchiseFormName}
                        onChange={(e) => setFranchiseFormName(e.target.value)}
                        placeholder="e.g. Tumbles for Kids"
                        required
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="franchise-rank-select"
                        style={{ color: '#2D4459', fontSize: 13 }}
                      >
                        Client ranking
                      </Label>
                      <select
                        id="franchise-rank-select"
                        className="mt-1 flex h-10 w-full max-w-md rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#3BBFBF]/40"
                        style={{ borderColor: '#C8E8E5' }}
                        value={franchiseFormRank}
                        onChange={(e) =>
                          setFranchiseFormRank(
                            Number(e.target.value) === 2
                              ? 2
                              : Number(e.target.value) === 3
                                ? 3
                                : 1
                          )
                        }
                      >
                        <option value={1}>1 - Top Choice</option>
                        <option value={2}>2 - Second Choice</option>
                        <option value={3}>3 - Third Choice</option>
                      </select>
                    </div>
                    <div>
                      <Label
                        htmlFor="franchise-zor-date"
                        style={{ color: '#2D4459', fontSize: 13 }}
                      >
                        ZOR call date
                      </Label>
                      <Input
                        id="franchise-zor-date"
                        type="date"
                        className="mt-1 max-w-md"
                        value={franchiseFormZorDate}
                        onChange={(e) =>
                          setFranchiseFormZorDate(e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="franchise-notes"
                        style={{ color: '#2D4459', fontSize: 13 }}
                      >
                        Notes
                      </Label>
                      <Textarea
                        id="franchise-notes"
                        rows={3}
                        className="mt-1 resize-y"
                        placeholder={FRANCHISE_NOTES_PLACEHOLDER}
                        value={franchiseFormNotes}
                        onChange={(e) =>
                          setFranchiseFormNotes(e.target.value)
                        }
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <Button
                        type="button"
                        className="font-semibold text-white"
                        style={{ background: '#3BBFBF' }}
                        onClick={handleSaveFranchiseRec}
                        disabled={!franchiseFormName.trim()}
                      >
                        Save
                      </Button>
                      <button
                        type="button"
                        className="text-sm font-semibold underline-offset-2 hover:underline"
                        style={{ color: '#3BBFBF' }}
                        onClick={handleFranchiseFormCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {displayFranchiseRecsSorted.length === 0 &&
                !franchiseFormOpen ? (
                  <p
                    className="text-center italic"
                    style={{ color: '#7A8F95', fontSize: 12 }}
                  >
                    No franchises presented yet. Add the businesses you presented
                    to this client.
                  </p>
                ) : null}

                {displayFranchiseRecsSorted.map(
                  ({ item: fr, originalIndex }) => (
                    <div
                      key={`${fr.added_at}-${originalIndex}`}
                      style={{
                        background: 'white',
                        border: '1px solid #C8E8E5',
                        borderRadius: 10,
                        padding: '14px 18px',
                        marginBottom: 8,
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span
                          className="font-bold"
                          style={{ color: '#2D4459', fontSize: 14 }}
                        >
                          {fr.name}
                        </span>
                        <span
                          className="shrink-0 rounded-md px-2.5 py-1 font-medium"
                          style={
                            fr.rank === 1
                              ? {
                                  background: '#3BBFBF',
                                  color: 'white',
                                  fontSize: 11,
                                }
                              : fr.rank === 2
                                ? {
                                    background: '#C8E8E5',
                                    color: '#2D4459',
                                    fontSize: 11,
                                  }
                                : {
                                    background: '#F4F7F8',
                                    color: '#7A8F95',
                                    fontSize: 11,
                                  }
                          }
                        >
                          {fr.rank === 1
                            ? 'Top Choice ★'
                            : fr.rank === 2
                              ? 'Second Choice'
                              : 'Third Choice'}
                        </span>
                      </div>
                      {fr.notes.trim() ? (
                        <p
                          className="mt-2"
                          style={{
                            color: '#7A8F95',
                            fontSize: 13,
                            lineHeight: 1.5,
                          }}
                        >
                          {fr.notes}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span style={{ color: '#7A8F95', fontSize: 11 }}>
                          {fr.zor_call_date.trim()
                            ? `ZOR call: ${formatZorCallDisplay(fr.zor_call_date)}`
                            : ''}
                        </span>
                        <button
                          type="button"
                          className="text-[11px] font-semibold underline-offset-2 hover:underline"
                          style={{ color: '#3BBFBF' }}
                          onClick={() =>
                            handleEditFranchiseRec(originalIndex)
                          }
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : null}

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

            <div
              style={{
                background: '#F4F7F8',
                borderRadius: 10,
                border: '1px solid #C8E8E5',
                padding: '16px 20px',
              }}
            >
              {!gmailConnected ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail
                      className="h-5 w-5 shrink-0"
                      style={{ color: '#C8E8E5' }}
                      aria-hidden
                    />
                    <span className="font-bold" style={{ color: '#7A8F95', fontSize: 14 }}>
                      Recent Email
                    </span>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-[12px] font-medium transition-opacity hover:opacity-90"
                    style={{
                      background: 'transparent',
                      border: '1px solid #C8E8E5',
                      color: '#7A8F95',
                      borderRadius: 6,
                      padding: '4px 12px',
                    }}
                    onClick={() => navigateToTheCapture(client.id)}
                  >
                    Connect Gmail
                  </button>
                </div>
              ) : emailLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin"
                    style={{ color: '#7A8F95' }}
                    aria-hidden
                  />
                  <span className="text-[13px] italic" style={{ color: '#7A8F95' }}>
                    Loading emails...
                  </span>
                </div>
              ) : !lastEmail ? (
                <div className="flex items-start gap-2">
                  <Mail
                    className="h-4 w-4 shrink-0 mt-0.5"
                    style={{ color: '#C8E8E5' }}
                    aria-hidden
                  />
                  <p className="text-[13px]" style={{ color: '#7A8F95' }}>
                    No emails found with {client.name}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    background: 'white',
                    border: '1px solid #C8E8E5',
                    borderLeftWidth: 4,
                    borderLeftColor: '#3BBFBF',
                    borderRadius: 10,
                    padding: '16px 20px',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail
                        className="h-4 w-4 shrink-0"
                        style={{ color: '#3BBFBF' }}
                        aria-hidden
                      />
                      <span className="font-bold" style={{ color: '#2D4459', fontSize: 14 }}>
                        Recent Email
                      </span>
                    </div>
                    <span className="shrink-0 text-[12px]" style={{ color: '#7A8F95' }}>
                      {formatEmailRelative(lastEmail.date)}
                    </span>
                  </div>
                  <p
                    className="mt-2 font-bold line-clamp-2"
                    style={{ color: '#2D4459', fontSize: 13 }}
                    title={lastEmail.subject}
                  >
                    {lastEmail.subject.length > 50
                      ? `${lastEmail.subject.slice(0, 50)}…`
                      : lastEmail.subject}
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: '#7A8F95' }}>
                    {(() => {
                      const ce = (contact.email ?? client.email ?? '')
                        .trim()
                        .toLowerCase();
                      const fromE = (lastEmail.fromEmail ?? '').trim().toLowerCase();
                      if (ce && fromE === ce) {
                        return `From: ${lastEmail.from.replace(/<[^>]+>/, '').trim() || client.name}`;
                      }
                      return `To: ${client.name}`;
                    })()}
                  </p>
                  <p
                    className="mt-1 text-[12px] italic leading-[1.5]"
                    style={{ color: '#7A8F95' }}
                  >
                    {(lastEmail.snippet ?? '').length > 120
                      ? `${(lastEmail.snippet ?? '').slice(0, 120)}…`
                      : lastEmail.snippet ?? ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-[12px] font-medium transition-opacity hover:opacity-90"
                      style={{
                        background: 'white',
                        border: '1px solid #C8E8E5',
                        color: '#7A8F95',
                        borderRadius: 6,
                        padding: '6px 14px',
                      }}
                      onClick={() => {
                        if (!lastEmail.threadId) return;
                        setShowThreadModal(true);
                        setThreadLoading(true);
                        setThreadEmails([]);
                        void (async () => {
                          try {
                            const r = await gmailTool.execute('get_thread', {
                              threadId: lastEmail.threadId,
                            });
                            if (r.success && Array.isArray(r.data)) {
                              setThreadEmails(r.data as EmailMessage[]);
                            } else {
                              setThreadEmails([]);
                            }
                          } catch {
                            setThreadEmails([]);
                          } finally {
                            setThreadLoading(false);
                          }
                        })();
                      }}
                    >
                      View Thread
                    </button>
                    <button
                      type="button"
                      className="text-[12px] font-bold text-white transition-opacity hover:opacity-90"
                      style={{
                        background: '#3BBFBF',
                        borderRadius: 6,
                        padding: '6px 14px',
                        border: 'none',
                      }}
                      onClick={() => {
                        const style = (client.disc?.style ?? 'I') as 'D' | 'I' | 'S' | 'C';
                        setReplyDiscStyle(style);
                        const t = getDiscEmailTemplate(style, client.name);
                        setReplySubject(t.subject);
                        setReplyBody(t.body);
                        setShowReplyModal(true);
                      }}
                    >
                      Reply with DISC template
                    </button>
                  </div>
                </div>
              )}
            </div>

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



          <TabsContent
            value="best-next-questions"
            className="h-full min-h-0 mt-0 focus-visible:outline-none"
          >
            <div className="h-full max-h-[75vh] overflow-y-auto p-6">
              {(() => {
                const councilHasDisc =
                  discScores != null &&
                  discScores.d +
                    discScores.i +
                    discScores.s +
                    discScores.c >
                    0;
                const councilHasYou2 =
                  (you2Details?.dangers?.length ?? 0) > 0 ||
                  (you2Details?.strengths?.length ?? 0) > 0 ||
                  (you2Details?.opportunities?.length ?? 0) > 0;
                const councilHasSessions =
                  fathomSessionCount > 0 ||
                  latestSessionNotesPlain.trim().length > 20;
                const councilHasIdentity =
                  !!(coachProfileRow?.bio?.trim() ||
                    coachProfileRow?.coaching_philosophy?.trim());
                const councilDataFoundation = (
                  <div className="mb-4 text-center">
                    <p
                      className="m-0"
                      style={{ color: '#7A8F95', fontSize: 11 }}
                    >
                      Council powered by:
                    </p>
                    <div
                      className="mt-2 flex flex-wrap items-center justify-center gap-4"
                      style={{ fontSize: 12, color: '#2D4459' }}
                    >
                      <span>
                        DISC{' '}
                        <span style={{ color: councilHasDisc ? '#3BBFBF' : '#C8C8C8' }}>
                          {councilHasDisc ? '●' : '○'}
                        </span>
                      </span>
                      <span>
                        You 2.0{' '}
                        <span style={{ color: councilHasYou2 ? '#3BBFBF' : '#C8C8C8' }}>
                          {councilHasYou2 ? '●' : '○'}
                        </span>
                      </span>
                      <span>
                        Sessions{' '}
                        <span
                          style={{
                            color: councilHasSessions ? '#3BBFBF' : '#C8C8C8',
                          }}
                        >
                          {councilHasSessions ? '●' : '○'}
                        </span>
                      </span>
                      <span>
                        Identity{' '}
                        <span
                          style={{
                            color: councilHasIdentity ? '#3BBFBF' : '#C8C8C8',
                          }}
                        >
                          {councilHasIdentity ? '●' : '○'}
                        </span>
                      </span>
                    </div>
                    <p
                      className="m-0 mt-1 italic"
                      style={{ color: '#7A8F95', fontSize: 10 }}
                    >
                      More data = better questions
                    </p>
                  </div>
                );

                const renderQuestionCard = (
                  q: string,
                  qi: number,
                  showLensBadge: boolean,
                  out: CouncilOutput | null
                ) => {
                  const rate = ratedQuestions[q];
                  return (
                    <div
                      key={`${qi}-${q.slice(0, 40)}`}
                      className="mb-2"
                      style={{
                        background: 'white',
                        border: '1px solid #C8E8E5',
                        borderRadius: 10,
                        padding: '14px 16px',
                      }}
                    >
                      <p
                        className="m-0"
                        style={{
                          color: '#2D4459',
                          fontSize: 13,
                          lineHeight: 1.6,
                        }}
                      >
                        {q}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {showLensBadge && out ? (
                          <span
                            style={{
                              background: '#F4F7F8',
                              color: '#7A8F95',
                              borderRadius: 12,
                              padding: '2px 8px',
                              fontSize: 10,
                            }}
                          >
                            {chairmanQuestionLensBadge(q, out)}
                          </span>
                        ) : (
                          <span />
                        )}
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            aria-label="Thumbs up"
                            className="flex h-6 w-6 items-center justify-center rounded border-0 text-base leading-none"
                            style={{
                              width: 24,
                              height: 24,
                              background: rate === 'up' ? '#3BBFBF' : '#F4F7F8',
                              color: rate === 'up' ? 'white' : '#7A8F95',
                            }}
                            onClick={() => {
                              setRatedQuestions((prev) => ({
                                ...prev,
                                [q]: 'up',
                              }));
                              void logCorrection({
                                clientId: client.id,
                                fieldName: 'coaching_question',
                                originalValue: q,
                                correctedValue: 'approved',
                                correctionType: 'question_thumbs_up',
                                page: 'client_intelligence',
                              });
                            }}
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            aria-label="Thumbs down"
                            className="flex h-6 w-6 items-center justify-center rounded border-0 text-base leading-none"
                            style={{
                              width: 24,
                              height: 24,
                              background: rate === 'down' ? '#3BBFBF' : '#F4F7F8',
                              color: rate === 'down' ? 'white' : '#7A8F95',
                            }}
                            onClick={() => {
                              setRatedQuestions((prev) => ({
                                ...prev,
                                [q]: 'down',
                              }));
                              void logCorrection({
                                clientId: client.id,
                                fieldName: 'coaching_question',
                                originalValue: q,
                                correctedValue: 'rejected',
                                correctionType: 'question_thumbs_down',
                                page: 'client_intelligence',
                              });
                            }}
                          >
                            👎
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                };

                const renderUncertainty = (out: CouncilOutput) => {
                  const a = out.uncertaintyAudit;
                  return (
                    <div className="mt-4">
                      <p
                        className="m-0 font-bold"
                        style={{ color: '#2D4459', fontSize: 14, marginTop: 16 }}
                      >
                        What Coach Bot Verified
                      </p>
                      {a.verified.length > 0 ? (
                        <ul className="m-0 mt-2 list-none space-y-1 p-0">
                          {a.verified.map((v, i) => (
                            <li
                              key={`v-${i}`}
                              style={{ color: '#3BBFBF', fontSize: 12 }}
                            >
                              ✅ {v}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {a.unverified.length > 0 ? (
                        <ul className="m-0 mt-2 list-none space-y-1 p-0">
                          {a.unverified.map((v, i) => (
                            <li
                              key={`u-${i}`}
                              style={{ color: '#F59E0B', fontSize: 12 }}
                            >
                              ⚠️ {v}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {a.missing.length > 0 ? (
                        <ul className="m-0 mt-2 list-none space-y-1 p-0">
                          {a.missing.map((v, i) => (
                            <li
                              key={`m-${i}`}
                              style={{ color: '#F05F57', fontSize: 12 }}
                            >
                              ❌ {v}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {a.recommendations.length > 0 ? (
                        <div
                          className="mt-2"
                          style={{
                            background: '#FFF8F0',
                            borderLeft: '4px solid #F05F57',
                            borderRadius: 8,
                            padding: '12px 16px',
                          }}
                        >
                          <p
                            className="m-0 font-bold"
                            style={{ color: '#C8613F', fontSize: 12 }}
                          >
                            Before This Call
                          </p>
                          <ul className="m-0 mt-2 list-disc space-y-1 pl-5">
                            {a.recommendations.map((r, i) => (
                              <li
                                key={`r-${i}`}
                                style={{ color: '#2D4459', fontSize: 12 }}
                              >
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  );
                };

                const renderCouncilStageSelector = () => (
                  <div className="mx-auto mb-5 w-full max-w-2xl">
                    <p
                      className="m-0 mb-2 font-bold"
                      style={{ color: '#2D4459', fontSize: 13 }}
                    >
                      Generate questions for
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {STAGE_ORDER.map((stage) => {
                        const on = councilQuestionTargetStage === stage;
                        return (
                          <button
                            key={stage}
                            type="button"
                            disabled={councilLoading}
                            aria-pressed={on}
                            aria-label={`Generate questions for stage ${stage}`}
                            onClick={() => setCouncilQuestionTargetStage(stage)}
                            className="font-bold"
                            style={{
                              fontSize: 13,
                              borderRadius: 9999,
                              padding: '8px 14px',
                              border: on ? 'none' : '1px solid #C8E8E5',
                              background: on ? '#3BBFBF' : '#E8ECEF',
                              color: on ? 'white' : '#2D4459',
                              cursor: councilLoading ? 'not-allowed' : 'pointer',
                              opacity: councilLoading ? 0.65 : 1,
                            }}
                          >
                            {stage}
                          </button>
                        );
                      })}
                    </div>
                    {councilQuestionTargetStage !== codeForNav ? (
                      <p
                        className="m-0 mt-2"
                        style={{ color: '#7A8F95', fontSize: 12 }}
                      >
                        Preparing questions for [{councilQuestionTargetStage}]
                        {' — client is currently in ['}
                        {codeForNav}
                        {']'}
                      </p>
                    ) : null}
                  </div>
                );

                if (councilLoading) {
                  return (
                    <>
                      {renderCouncilStageSelector()}
                    <div
                      className="mx-auto w-full max-w-lg"
                      style={{
                        background: '#2D4459',
                        borderRadius: 12,
                        padding: 24,
                        color: 'white',
                      }}
                    >
                      <p
                        className="m-0 font-bold"
                        style={{ fontSize: 15, color: 'white' }}
                      >
                        Coaching Council deliberating...
                      </p>
                      <div className="mt-6 space-y-3">
                        <div className="flex items-center gap-2 text-white">
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          <span style={{ fontSize: 13 }}>Readiness Lens analyzing...</span>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          <span style={{ fontSize: 13 }}>Alignment Lens analyzing...</span>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          <span style={{ fontSize: 13 }}>Integrity Lens analyzing...</span>
                        </div>
                      </div>
                      <p
                        className="m-0 mt-4 italic"
                        style={{ color: '#C8E8E5', fontSize: 12 }}
                      >
                        Three coaching frameworks deliberating independently
                      </p>
                    </div>
                    </>
                  );
                }

                if (councilOutput) {
                  const out = councilOutput;
                  const activeLensOutput =
                    activeLens === 'readiness'
                      ? out.readinessLens
                      : activeLens === 'alignment'
                        ? out.alignmentLens
                        : activeLens === 'integrity'
                          ? out.integrityLens
                          : null;
                  const lensHeaderBg =
                    activeLens === 'readiness'
                      ? '#3BBFBF'
                      : activeLens === 'alignment'
                        ? '#F05F57'
                        : activeLens === 'integrity'
                          ? '#2D4459'
                          : '#2D4459';

                  return (
                    <>
                      {renderCouncilStageSelector()}
                    <div className="mx-auto w-full max-w-2xl space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ['chairman', 'Chairman'],
                            ['readiness', 'Readiness'],
                            ['alignment', 'Alignment'],
                            ['integrity', 'Integrity'],
                          ] as const
                        ).map(([id, label]) => {
                          const on = activeLens === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setActiveLens(id)}
                              className="font-bold"
                              style={{
                                background: on ? '#3BBFBF' : '#F4F7F8',
                                color: on ? 'white' : '#7A8F95',
                                borderRadius: 8,
                                padding: '6px 14px',
                                fontSize: 12,
                                border: 'none',
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {activeLens === 'chairman' ? (
                        <>
                          <div
                            style={{
                              background: '#2D4459',
                              borderRadius: 12,
                              padding: '20px 24px',
                            }}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p
                                className="m-0 font-bold text-white"
                                style={{ fontSize: 16 }}
                              >
                                Chairman Synthesis
                              </p>
                              <p
                                className="m-0"
                                style={{ color: '#C8E8E5', fontSize: 13 }}
                              >
                                Council confidence: {out.overallConfidence}%
                              </p>
                            </div>
                            <p
                              className="m-0 mt-2 italic"
                              style={{ color: '#C8E8E5', fontSize: 13 }}
                            >
                              {out.chairmanSynthesis.primaryInsight}
                            </p>
                            <p
                              className="m-0 mt-1"
                              style={{ color: '#3BBFBF', fontSize: 12 }}
                            >
                              Coaching posture:{' '}
                              {out.chairmanSynthesis.coachingPosture}
                            </p>
                          </div>
                          <p
                            className="m-0 font-bold"
                            style={{
                              color: '#2D4459',
                              fontSize: 15,
                              margin: '16px 0 8px',
                            }}
                          >
                            Best Questions for This Call
                          </p>
                          {out.chairmanSynthesis.recommendedQuestions.map(
                            (q, qi) =>
                              renderQuestionCard(q, qi, true, out)
                          )}
                          <div
                            className="mt-3"
                            style={{
                              background: '#FFF8F0',
                              borderLeft: '4px solid #F05F57',
                              borderRadius: 8,
                              padding: '12px 16px',
                            }}
                          >
                            <p
                              className="m-0 font-bold uppercase"
                              style={{ color: '#C8613F', fontSize: 12 }}
                            >
                              Minority Perspective
                            </p>
                            <p
                              className="m-0 mt-2"
                              style={{ color: '#2D4459', fontSize: 13 }}
                            >
                              {out.chairmanSynthesis.minorityPerspective}
                            </p>
                          </div>
                        </>
                      ) : activeLensOutput ? (
                        <>
                          <div
                            style={{
                              background: lensHeaderBg,
                              borderRadius: 10,
                              padding: '16px 20px',
                            }}
                          >
                            <p
                              className="m-0 font-bold text-white"
                              style={{ fontSize: 15 }}
                            >
                              {activeLensOutput.lensName}
                            </p>
                            <p className="m-0 text-white" style={{ fontSize: 12 }}>
                              {activeLensOutput.lensFramework}
                            </p>
                            <p
                              className="m-0 text-white/80"
                              style={{ fontSize: 11 }}
                            >
                              {activeLensOutput.confidence}% confidence
                            </p>
                            <p
                              className="m-0 mt-2 italic text-white"
                              style={{ fontSize: 13 }}
                            >
                              {activeLensOutput.insight}
                            </p>
                          </div>
                          {activeLensOutput.questions.map((q, qi) =>
                            renderQuestionCard(q, qi, false, out)
                          )}
                        </>
                      ) : null}

                      {renderUncertainty(out)}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          className="font-medium"
                          style={{
                            background: 'white',
                            border: '1px solid #C8E8E5',
                            color: '#7A8F95',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 12,
                          }}
                          onClick={() => void handleRegenerateCouncil()}
                        >
                          Regenerate Council
                        </button>
                        <button
                          type="button"
                          className="font-bold text-white"
                          style={{
                            background: '#C8613F',
                            borderRadius: 8,
                            padding: '8px 16px',
                            fontSize: 12,
                            border: 'none',
                          }}
                          onClick={() => setAhaModalOpen(true)}
                        >
                          Log Aha Moment
                        </button>
                      </div>
                      <p
                        className="m-0 text-center"
                        style={{ color: '#7A8F95', fontSize: 10 }}
                      >
                        Generated {new Date(out.generatedAt).toLocaleString()}
                      </p>
                      {councilError ? (
                        <p
                          className="m-0 text-center text-sm"
                          style={{ color: '#F05F57' }}
                        >
                          {councilError}
                        </p>
                      ) : null}
                    </div>
                    </>
                  );
                }

                return (
                  <>
                    {renderCouncilStageSelector()}
                  <div
                    className="mx-auto w-full max-w-md"
                    style={{
                      background: 'white',
                      border: '1px solid #C8E8E5',
                      borderLeft: '4px solid #F05F57',
                      borderRadius: 12,
                      padding: '24px 28px',
                    }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <MessageSquare
                        className="h-8 w-8 shrink-0"
                        style={{ color: '#F05F57' }}
                        aria-hidden
                      />
                      <h2
                        className="mt-4 font-bold"
                        style={{ color: '#2D4459', fontSize: 16 }}
                      >
                        Best Next Questions
                      </h2>
                      <p
                        className="mt-3 whitespace-pre-line leading-relaxed"
                        style={{ color: '#7A8F95', fontSize: 13 }}
                      >
                        The Coaching Council runs three independent lenses
                        (readiness, alignment, integrity) using ICF standards,
                        Motivational Interviewing, CLEAR, and franchise stage
                        methodology, then synthesizes the best questions for
                        this call.
                      </p>
                    </div>
                    {councilDataFoundation}
                    {councilError ? (
                      <p
                        className="mt-4 text-center text-sm"
                        style={{ color: '#F05F57' }}
                      >
                        {councilError}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="mt-2 w-full font-bold text-white disabled:opacity-60"
                      style={{
                        background: '#F05F57',
                        borderRadius: 8,
                        padding: '10px 24px',
                        fontSize: 14,
                        border: 'none',
                      }}
                      disabled={councilLoading}
                      onClick={() => void handleGenerateBestNextQuestions()}
                    >
                      Generate Questions
                    </button>
                  </div>
                  </>
                );
              })()}
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
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <You2VisionDisplay text={you2Vision} />
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
                  {you2Details.credit_score != null &&
                    Number.isFinite(Number(you2Details.credit_score)) &&
                    Number(you2Details.credit_score) !== 0 && (
                      <p>
                        <span className="font-semibold">Credit score:</span>{' '}
                        {you2Details.credit_score}
                      </p>
                    )}
                  {you2Details.launch_timeline && <p><span className="font-semibold">Launch timeline:</span> {you2Details.launch_timeline}</p>}
                  {you2Details.time_commitment && (
                    <p>
                      <span className="font-semibold">Time commitment:</span>{' '}
                      {displayTimeCommitmentText(you2Details.time_commitment)}
                    </p>
                  )}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Dangers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <You2ParsedListDisplay
                    items={you2Details?.dangers ?? []}
                  />
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
                  <You2ParsedListDisplay
                    items={you2Details?.opportunities ?? []}
                  />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <You2ParsedListDisplay
                  items={you2Details?.strengths ?? []}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <You2ParsedListDisplay
                  items={you2Details?.skills ?? []}
                />
              </CardContent>
            </Card>
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
                        <div><span className="font-medium">City:</span> {toDisplayValue(tumayData.city)}</div>
                        <div><span className="font-medium">State:</span> {toDisplayValue(tumayData.state)}</div>
                        {tumayRelocationFundingFields}
                        <div><span className="font-medium">Timeline:</span> {toDisplayValue(tumayData.launch_timeline)}</div>
                        <div>
                          <span className="font-medium">Time Commitment:</span>{' '}
                          {toDisplayValue(
                            displayTimeCommitmentText(
                              String(tumayData.time_commitment ?? '')
                            )
                          )}
                        </div>
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
                {!tumayData ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 md:grid-cols-3">
                    {tumayRelocationFundingFields}
                  </div>
                ) : null}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="vision" className="h-full min-h-0 mt-0">
            <div className="overflow-y-auto h-full max-h-[75vh] px-6 py-4">
              <div style={{ padding: '16px 0' }}>
                {/* DATA FOUNDATION INDICATOR */}
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 16,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: '#7A8F95',
                    }}
                  >
                    Powered by:
                  </span>
                  {[
                    {
                      label: 'DISC',
                      has:
                        discScores != null &&
                        discScores.d +
                          discScores.i +
                          discScores.s +
                          discScores.c >
                          0,
                    },
                    {
                      label: 'You 2.0',
                      has: Boolean(you2Vision?.trim()),
                    },
                    {
                      label: 'Sessions',
                      has:
                        latestSessionNotesPlain.trim().length > 10,
                    },
                    {
                      label: 'Identity',
                      has: Boolean(
                        (coachProfileRow?.bio ?? '').trim()
                      ),
                    },
                  ].map((item) => (
                    <span
                      key={item.label}
                      style={{
                        fontSize: 11,
                        color: item.has
                          ? '#3BBFBF'
                          : '#C8E8E5',
                        fontWeight: 'bold',
                      }}
                    >
                      {item.has ? '●' : '○'}{' '}
                      {item.label}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    marginBottom: 20,
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid #C8E8E5',
                    background: '#F4F7F8',
                  }}
                >
                  <img
                    src={visionMotivation.imageSrc}
                    alt={visionMotivation.quote}
                    style={{
                      display: 'block',
                      width: '100%',
                      maxHeight: 220,
                      objectFit: 'cover',
                    }}
                  />
                  <p
                    className="m-0 px-4 py-3 text-center font-bold"
                    style={{
                      color: '#2D4459',
                      fontSize: 16,
                      lineHeight: 1.45,
                      background: 'white',
                    }}
                  >
                    {visionMotivation.quote}
                  </p>
                  <div
                    className="px-4 py-2 text-center"
                    style={{
                      background: '#2D4459',
                      color: '#C8E8E5',
                      fontSize: 12,
                    }}
                  >
                    <p className="m-0 font-semibold" style={{ color: 'white' }}>
                      Coach Sandi Stahl
                    </p>
                    <p className="m-0 mt-0.5" style={{ color: '#C8E8E5' }}>
                      Franchise Coach
                    </p>
                  </div>
                </div>

                {/* ERROR STATE */}
                {visionError ? (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: '#FFF0F0',
                      borderRadius: 8,
                      border: '1px solid #F05F57',
                      color: '#F05F57',
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    {visionError}
                    <button
                      type="button"
                      onClick={() =>
                        setVisionError(null)
                      }
                      style={{
                        display: 'block',
                        marginTop: 6,
                        color: '#7A8F95',
                        fontSize: 11,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}

                {/* GENERATE BUTTON — shown when
                    no text and not generating */}
                {!visionText && !visionGenerating ? (
                  <button
                    type="button"
                    onClick={() =>
                      void handleGenerateVision()
                    }
                    style={{
                      background: '#3BBFBF',
                      color: 'white',
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Generate Vision Statement
                  </button>
                ) : null}

                {/* LOADING STATE */}
                {visionGenerating ? (
                  <div
                    style={{
                      padding: '16px 0',
                      color: '#7A8F95',
                      fontSize: 13,
                      fontStyle: 'italic',
                    }}
                  >
                    Writing vision statement for{' '}
                    {client?.name}...
                  </div>
                ) : null}

                {/* GENERATED TEXT + RUBRIC
                    + DOWNLOADS */}
                {visionText && !visionGenerating ? (
                  <div>
                    {/* EDITABLE TEXTAREA */}
                    <textarea
                      value={visionText}
                      onChange={(e) =>
                        setVisionText(e.target.value)
                      }
                      style={{
                        width: '100%',
                        minHeight: 160,
                        border: '2px solid #3BBFBF',
                        borderRadius: 10,
                        padding: '14px 16px',
                        fontSize: 14,
                        color: '#2D4459',
                        lineHeight: 1.8,
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />

                    <p
                      style={{
                        color: '#7A8F95',
                        fontSize: 11,
                        fontStyle: 'italic',
                        margin: '4px 0 12px',
                      }}
                    >
                      Edit directly in the box above
                      before downloading
                    </p>

                    {/* RUBRIC — shown before
                        rating is submitted */}
                    {!visionRubricSubmitted ? (
                      <VisionRubric
                        key={client?.id ?? 'no-client'}
                        clientName={client?.name}
                        setVisionRubric={setVisionRubric}
                        setVisionRubricSubmitted={
                          setVisionRubricSubmitted
                        }
                        handleGenerateVision={
                          handleGenerateVision
                        }
                      />
                    ) : null}

                    {/* DOWNLOAD BUTTONS — shown
                        after rubric submitted
                        or always after generate */}
                    {visionRubricSubmitted &&
                    visionRubric != null ? (
                      <>
                        {visionSaveSuccess ? (
                          <div
                            style={{
                              padding: '10px 14px',
                              background: '#F0FAFA',
                              borderLeft: '4px solid #3BBFBF',
                              borderRadius: 8,
                              color: '#2D4459',
                              fontSize: 12,
                              marginBottom: 10,
                            }}
                          >
                            ✓ {visionSaveSuccess}
                          </div>
                        ) : null}
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            marginTop: 12,
                            flexWrap: 'wrap',
                            alignItems: 'center',
                          }}
                        >
                        <button
                          type="button"
                          onClick={() =>
                            void handleDownloadVisionPpt()
                          }
                          style={{
                            background: '#2D4459',
                            color: 'white',
                            borderRadius: 8,
                            padding: '10px 20px',
                            fontSize: 13,
                            fontWeight: 'bold',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Download PowerPoint
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setVisionText('');
                            setVisionRubric(null);
                            setVisionRubricSubmitted(
                              false
                            );
                            setVisionError(null);
                            setVisionSaveSuccess(null);
                          }}
                          style={{
                            background: 'white',
                            color: '#7A8F95',
                            borderRadius: 8,
                            padding: '10px 16px',
                            fontSize: 12,
                            border:
                              '1px solid #C8E8E5',
                            cursor: 'pointer',
                          }}
                        >
                          Start Over
                        </button>
                      </div>
                      </>
                    ) : null}

                    {/* TERRITORY CHECK */}
                    <div style={{ marginTop: 20 }}>
                      <p
                        style={{
                          color: '#7A8F95',
                          fontSize: 11,
                          fontStyle: 'italic',
                          margin: '0 0 6px',
                        }}
                      >
                        Optional — paste territory
                        check results to include
                        in the PowerPoint
                      </p>
                      <textarea
                        value={territoryNotes}
                        onChange={(e) =>
                          setTerritoryNotes(
                            e.target.value
                          )
                        }
                        placeholder="Paste territory check results here..."
                        style={{
                          width: '100%',
                          height: 80,
                          border: '1px solid #C8E8E5',
                          borderRadius: 8,
                          padding: '8px 10px',
                          fontSize: 12,
                          color: '#2D4459',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fathom" className="h-full min-h-0 mt-0">
            <div className="h-full max-h-[75vh] overflow-y-auto p-6">
              <div style={{ marginBottom: 16 }}>
                <p
                  style={{
                    color: '#2D4459',
                    fontSize: 15,
                    fontWeight: 'bold',
                    margin: '0 0 4px',
                  }}
                >
                  Coaching Sessions
                </p>
                <p
                  style={{
                    color: '#7A8F95',
                    fontSize: 12,
                    margin: '0 0 12px',
                    fontStyle: 'italic',
                  }}
                >
                  Upload Fathom transcripts to automatically extract 9-block coaching analysis. Each transcript becomes
                  one session record.
                </p>
              </div>
              <div
                style={{
                  background: '#F4F7F8',
                  borderRadius: 10,
                  border: '1px solid #C8E8E5',
                  padding: '16px 20px',
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    color: '#2D4459',
                    fontSize: 13,
                    fontWeight: 'bold',
                    margin: '0 0 12px',
                  }}
                >
                  Add Session
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <label
                      style={{
                        color: '#7A8F95',
                        fontSize: 11,
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Stage
                    </label>
                    <select
                      value={addSessionStage}
                      onChange={(e) => setAddSessionStage(e.target.value)}
                      style={{
                        width: '100%',
                        border: '1px solid #C8E8E5',
                        borderRadius: 6,
                        padding: '6px 8px',
                        fontSize: 12,
                        color: '#2D4459',
                      }}
                    >
                      <option value="IC">IC — Initial Contact</option>
                      <option value="C1">C1 — Seeker Connection</option>
                      <option value="C2">C2 — Seeker Clarification</option>
                      <option value="C3">C3 — Possibilities</option>
                      <option value="C4">C4 — Initial Validation</option>
                      <option value="C5">C5 — Continued Validation</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        color: '#7A8F95',
                        fontSize: 11,
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Session Date
                    </label>
                    <input
                      type="date"
                      value={addSessionDate}
                      onChange={(e) => setAddSessionDate(e.target.value)}
                      style={{
                        width: '100%',
                        border: '1px solid #C8E8E5',
                        borderRadius: 6,
                        padding: '6px 8px',
                        fontSize: 12,
                        color: '#2D4459',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        color: '#7A8F95',
                        fontSize: 11,
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Duration (optional)
                    </label>
                    <input
                      type="text"
                      value={addSessionDuration}
                      onChange={(e) => setAddSessionDuration(e.target.value)}
                      placeholder="e.g. 45 min"
                      style={{
                        width: '100%',
                        border: '1px solid #C8E8E5',
                        borderRadius: 6,
                        padding: '6px 8px',
                        fontSize: 12,
                        color: '#2D4459',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <p
                    style={{
                      color: '#7A8F95',
                      fontSize: 11,
                      margin: '0 0 6px',
                      fontStyle: 'italic',
                    }}
                  >
                    Copy your Fathom transcript and paste below. Coach Bot extracts the 9-block analysis. For your own
                    observations on a session, use Sandi&apos;s Notes under Show 9-block analysis.
                  </p>
                  <textarea
                    value={fathomPasteText}
                    onChange={(e) => setFathomPasteText(e.target.value)}
                    placeholder="Paste Fathom transcript here..."
                    style={{
                      width: '100%',
                      minHeight: 120,
                      border: '2px solid #3BBFBF',
                      borderRadius: 8,
                      padding: '10px 12px',
                      fontSize: 12,
                      color: '#2D4459',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {fathomUploading ? (
                  <div style={{ marginTop: 10 }}>
                    <div
                      style={{
                        background: '#E8F4F4',
                        borderRadius: 4,
                        height: 8,
                        overflow: 'hidden',
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${fathomProgress}%`,
                          background: '#3BBFBF',
                          borderRadius: 4,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <p
                      style={{
                        color: '#7A8F95',
                        fontSize: 11,
                        margin: 0,
                        fontStyle: 'italic',
                      }}
                    >
                      {fathomProgress < 30
                        ? 'Reading transcript...'
                        : fathomProgress < 60
                          ? 'Extracting coaching blocks...'
                          : fathomProgress < 90
                            ? 'Analyzing patterns...'
                            : 'Saving session...'}
                    </p>
                  </div>
                ) : null}

                {fathomUploadError ? (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: '#FFF0F0',
                      borderRadius: 6,
                      color: '#F05F57',
                      fontSize: 12,
                    }}
                  >
                    {fathomUploadError}
                    <button
                      type="button"
                      onClick={() => setFathomUploadError(null)}
                      style={{
                        marginLeft: 8,
                        color: '#7A8F95',
                        fontSize: 11,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}

                {fathomUploadSuccess ? (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: '#F0FAFA',
                      borderRadius: 6,
                      color: '#3BBFBF',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                  >
                    ✓ {fathomUploadSuccess}
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    disabled={fathomUploading || !fathomPasteText.trim()}
                    onClick={async () => {
                      if (!fathomPasteText.trim() || !client) return;
                      try {
                        setFathomUploading(true);
                        setFathomProgress(10);
                        setFathomUploadError(null);
                        setFathomUploadSuccess(null);
                        setFathomProgress(40);
                        const result =
                          await withOllamaCheck(
                            () =>
                              extractFathomSession(
                                client.id,
                                fathomPasteText.trim(),
                                'fathom_transcript.txt',
                                ''
                              ),
                            () => {
                              setFathomUploadError(
                                OLLAMA_NOT_READY_USER_MESSAGE
                              );
                              setFathomUploading(false);
                              setFathomProgress(0);
                            }
                          );
                        if (result == null) {
                          return;
                        }
                        setFathomProgress(80);
                        if (!result.success) {
                          const er = (
                            result.error ?? ''
                          ).toLowerCase();
                          const ollamaLike =
                            er.includes('ollama') ||
                            er.includes(
                              'connection'
                            ) ||
                            er.includes('timeout') ||
                            er.includes('11434');
                          setFathomUploading(false);
                          setFathomProgress(0);
                          setFathomUploadError(
                            ollamaLike
                              ? OLLAMA_NOT_READY_USER_MESSAGE
                              : result.error ??
                                  'Could not extract. Make sure Ollama is running.'
                          );
                          return;
                        }
                        const now = new Date().toISOString();
                        const contactDay = addSessionDate.trim();
                        if (contactDay) {
                          await dbExecute(
                            `UPDATE clients SET last_contact_date = ?, updated_at = ? WHERE id = ?`,
                            [contactDay, now, client.id]
                          );
                          setLastContactDateDb(contactDay);
                        }
                        await loadFathomSessions();
                        setFathomProgress(100);
                        setFathomUploading(false);
                        setFathomPasteText('');
                        setFathomUploadSuccess(
                          'Session extracted. Last contacted date updated.'
                        );
                        setTimeout(() => {
                          setFathomUploadSuccess(null);
                          setFathomProgress(0);
                        }, 3000);
                      } catch (err) {
                        console.error('Fathom extract error:', err);
                        setFathomUploading(false);
                        setFathomProgress(0);
                        setFathomUploadError(
                          err instanceof Error &&
                            err.message ===
                              OLLAMA_NOT_READY_USER_MESSAGE
                            ? err.message
                            : 'Could not extract. Make sure Ollama is running.'
                        );
                      }
                    }}
                    style={{
                      background:
                        fathomUploading || !fathomPasteText.trim() ? '#C8E8E5' : '#3BBFBF',
                      color: 'white',
                      borderRadius: 8,
                      padding: '8px 18px',
                      fontSize: 12,
                      fontWeight: 'bold',
                      border: 'none',
                      cursor:
                        fathomUploading || !fathomPasteText.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {fathomUploading ? 'Extracting...' : 'Extract Session'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFathomPasteText('');
                      setFathomUploadError(null);
                      setFathomUploadSuccess(null);
                    }}
                    style={{
                      background: 'white',
                      color: '#7A8F95',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      border: '1px solid #C8E8E5',
                      cursor: 'pointer',
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {fathomSessionCount === 0 ? (
                <div
                  className="flex flex-col items-center justify-center rounded-xl border py-10 text-center"
                  style={{ borderColor: '#C8E8E5', background: 'white' }}
                >
                  <Calendar className="h-8 w-8" style={{ color: '#C8E8E5' }} aria-hidden />
                  <p className="mt-3 font-medium" style={{ color: '#2D4459' }}>
                    No sessions yet.
                  </p>
                  <p className="mt-2 max-w-sm px-4 text-center whitespace-pre-line" style={{ color: '#7A8F95', fontSize: 13 }}>
                    {`Use Add Session above to paste a Fathom transcript,\nor use The Capture → My Clients for other uploads.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fathomSessions.map((s, idx) => {
                    const plainNotes = fathomSessionPlainNotes(s);
                    const nextActionsFormatted = formatNextActions(s.next_actions);
                    const hasNextMeaningful = nextActionsFormatted !== NOT_CAPTURED_NEXT;
                    const hasAnyBlockRaw = blockDefinitions.some((d) =>
                      !fathomBlockRawEmpty(s[d.key as keyof typeof s] as string | null)
                    );
                    const hasStructured = hasAnyBlockRaw;
                    const isEmptyShell = !hasStructured && !plainNotes && !hasNextMeaningful;
                    const clearScore =
                      s.overall_clear_score != null ? Number(s.overall_clear_score) : null;
                    const clearStyle =
                      clearScore != null && !Number.isNaN(clearScore)
                        ? fathomClearBadgeStyle(clearScore)
                        : null;
                    const sessionNum = s.session_number != null ? s.session_number : idx + 1;
                    const dur = (s.call_duration ?? '').trim();
                    const sessionKey = String(s.id);
                    const notesExpanded = Boolean(fathomNotesExpanded[s.id]);
                    const blocksExpanded = expandedSessions.has(sessionKey);
                    const showMoreToggle = plainNotes.length > 140;

                    return (
                      <div
                        key={`${s.id}-${idx}`}
                        className="mb-2"
                        style={{
                          background: 'white',
                          border: '1px solid #C8E8E5',
                          borderRadius: 10,
                          padding: '14px 18px',
                          marginBottom: 8,
                        }}
                      >
                        <div
                          className="flex flex-wrap items-start justify-between gap-2"
                          style={{ alignItems: 'flex-start' }}
                        >
                          <p
                            className="min-w-0 flex-1 font-bold leading-snug"
                            style={{ color: '#2D4459', fontSize: 13 }}
                          >
                            {`Session ${sessionNum} — ${formatFathomSessionCardDate(s.session_date)} — ${getStageDisplayName(String(s.stage ?? '').trim())}`}
                            {dur ? (
                              <span className="font-normal" style={{ color: '#7A8F95', fontSize: 11 }}>
                                {' '}
                                · {dur}
                              </span>
                            ) : null}
                          </p>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {clearScore != null && clearStyle ? (
                              <span
                                className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
                                style={clearStyle}
                              >
                                {clearScore.toFixed(1)} / 5.0
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSessionId(s.id);
                                setEditingSessionNotes(s.notes ?? '');
                                setDeletingSessionId(null);
                              }}
                              style={{
                                background: 'none',
                                border: '1px solid #C8E8E5',
                                borderRadius: 6,
                                padding: '3px 10px',
                                fontSize: 11,
                                color: '#7A8F95',
                                cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingSessionId(s.id);
                                setEditingSessionId(null);
                              }}
                              style={{
                                background: 'none',
                                border: '1px solid #F05F57',
                                borderRadius: 6,
                                padding: '3px 10px',
                                fontSize: 11,
                                color: '#F05F57',
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {editingSessionId === s.id ? (
                          <div style={{ marginTop: 8 }}>
                            <textarea
                              value={editingSessionNotes}
                              onChange={(ev) => setEditingSessionNotes(ev.target.value)}
                              style={{
                                width: '100%',
                                minHeight: 100,
                                border: '2px solid #3BBFBF',
                                borderRadius: 8,
                                padding: '8px 10px',
                                fontSize: 13,
                                color: '#2D4459',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box',
                              }}
                            />
                            <div
                              style={{
                                display: 'flex',
                                gap: 8,
                                marginTop: 8,
                              }}
                            >
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await dbExecute(
                                      `UPDATE coaching_sessions
                                       SET notes = ?,
                                           updated_at = CURRENT_TIMESTAMP
                                       WHERE id = ?`,
                                      [editingSessionNotes, s.id]
                                    );
                                    setEditingSessionId(null);
                                    await loadFathomSessions();
                                  } catch (err) {
                                    console.error('Session edit error:', err);
                                  }
                                }}
                                style={{
                                  background: '#3BBFBF',
                                  color: 'white',
                                  borderRadius: 6,
                                  padding: '6px 14px',
                                  fontSize: 12,
                                  fontWeight: 'bold',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSessionId(null)}
                                style={{
                                  background: 'white',
                                  color: '#7A8F95',
                                  borderRadius: 6,
                                  padding: '6px 14px',
                                  fontSize: 12,
                                  border: '1px solid #C8E8E5',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {deletingSessionId === s.id ? (
                          <div
                            style={{
                              background: '#FFF0F0',
                              borderRadius: 8,
                              border: '1px solid #F05F57',
                              padding: '12px 14px',
                              marginTop: 8,
                            }}
                          >
                            <p
                              style={{
                                color: '#2D4459',
                                fontSize: 13,
                                margin: '0 0 8px',
                              }}
                            >
                              Delete this session? This cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await dbExecute(
                                      `DELETE FROM coaching_sessions WHERE id = ?`,
                                      [s.id]
                                    );
                                    setDeletingSessionId(null);
                                    await loadFathomSessions();
                                  } catch (err) {
                                    console.error('Session delete error:', err);
                                  }
                                }}
                                style={{
                                  background: '#F05F57',
                                  color: 'white',
                                  borderRadius: 6,
                                  padding: '6px 14px',
                                  fontSize: 12,
                                  fontWeight: 'bold',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSessionId(null)}
                                style={{
                                  background: 'white',
                                  color: '#7A8F95',
                                  borderRadius: 6,
                                  padding: '6px 14px',
                                  fontSize: 12,
                                  border: '1px solid #C8E8E5',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {isEmptyShell ? (
                          <p className="mt-2 text-[13px]" style={{ color: '#7A8F95' }}>
                            No notes recorded
                          </p>
                        ) : (
                          <>
                            {plainNotes ? (
                              <div className="mt-2">
                                <p
                                  className={cn(
                                    'text-[13px] leading-[1.5]',
                                    !notesExpanded && showMoreToggle && 'line-clamp-3'
                                  )}
                                  style={{ color: '#2D4459' }}
                                >
                                  {plainNotes}
                                </p>
                                {showMoreToggle ? (
                                  <button
                                    type="button"
                                    className="mt-1 text-xs font-semibold underline"
                                    style={{ color: '#3BBFBF' }}
                                    onClick={() =>
                                      setFathomNotesExpanded((prev) => ({
                                        ...prev,
                                        [s.id]: !prev[s.id],
                                      }))
                                    }
                                  >
                                    {notesExpanded ? 'Show less' : 'Show more'}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                            {hasAnyBlockRaw ? (
                              <>
                                <button
                                  type="button"
                                  className="mt-2"
                                  onClick={() => {
                                    setExpandedSessions((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(sessionKey)) {
                                        next.delete(sessionKey);
                                      } else {
                                        next.add(sessionKey);
                                      }
                                      return next;
                                    });
                                  }}
                                  style={{
                                    background: 'none',
                                    border: '1px solid #C8E8E5',
                                    borderRadius: 6,
                                    padding: '3px 10px',
                                    fontSize: 11,
                                    color: '#3BBFBF',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {blocksExpanded ? 'Hide blocks' : 'Show 9-block analysis'}
                                </button>
                                {blocksExpanded ? (
                                  <div className="mt-2 space-y-2">
                                    {blockDefinitions.map((def) => renderFathomStructuredSection(s, def))}
                                    <div
                                      style={{
                                        marginTop: 12,
                                        borderTop: '1px solid #F4F7F8',
                                        paddingTop: 12,
                                      }}
                                    >
                                      <p
                                        style={{
                                          color: '#2D4459',
                                          fontSize: 12,
                                          fontWeight: 'bold',
                                          margin: '0 0 6px',
                                        }}
                                      >
                                        📝 Sandi&apos;s Notes
                                      </p>
                                      {editingNotesId === s.id ? (
                                        <div>
                                          <textarea
                                            value={editingNotesText}
                                            onChange={(e) => setEditingNotesText(e.target.value)}
                                            placeholder="Add your notes on this session..."
                                            style={{
                                              width: '100%',
                                              minHeight: 80,
                                              border: '1px solid #3BBFBF',
                                              borderRadius: 6,
                                              padding: '8px 10px',
                                              fontSize: 12,
                                              color: '#2D4459',
                                              resize: 'vertical',
                                              fontFamily: 'inherit',
                                              boxSizing: 'border-box',
                                            }}
                                          />
                                          <div
                                            style={{
                                              display: 'flex',
                                              gap: 6,
                                              marginTop: 6,
                                            }}
                                          >
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                try {
                                                  await dbExecute(
                                                    `UPDATE coaching_sessions
                                                     SET notes = ?,
                                                         updated_at = CURRENT_TIMESTAMP
                                                     WHERE id = ?`,
                                                    [editingNotesText, s.id]
                                                  );
                                                  setEditingNotesId(null);
                                                  await loadFathomSessions();
                                                } catch (err) {
                                                  console.error('Notes save error:', err);
                                                }
                                              }}
                                              style={{
                                                background: '#3BBFBF',
                                                color: 'white',
                                                borderRadius: 6,
                                                padding: '5px 12px',
                                                fontSize: 11,
                                                fontWeight: 'bold',
                                                border: 'none',
                                                cursor: 'pointer',
                                              }}
                                            >
                                              Save Notes
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingNotesId(null)}
                                              style={{
                                                background: 'white',
                                                color: '#7A8F95',
                                                borderRadius: 6,
                                                padding: '5px 10px',
                                                fontSize: 11,
                                                border: '1px solid #C8E8E5',
                                                cursor: 'pointer',
                                              }}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          {s.notes &&
                                          s.notes.length > 0 &&
                                          !s.notes.trim().startsWith('{') ? (
                                            <p
                                              style={{
                                                color: '#2D4459',
                                                fontSize: 12,
                                                margin: '0 0 6px',
                                                lineHeight: 1.6,
                                                whiteSpace: 'pre-wrap',
                                              }}
                                            >
                                              {s.notes}
                                            </p>
                                          ) : (
                                            <p
                                              style={{
                                                color: '#C8E8E5',
                                                fontSize: 11,
                                                fontStyle: 'italic',
                                                margin: '0 0 6px',
                                              }}
                                            >
                                              No notes added yet
                                            </p>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingNotesId(s.id);
                                              setEditingNotesText(
                                                s.notes && !s.notes.trim().startsWith('{') ? s.notes : ''
                                              );
                                            }}
                                            style={{
                                              background: 'none',
                                              border: '1px solid #C8E8E5',
                                              borderRadius: 6,
                                              padding: '3px 10px',
                                              fontSize: 11,
                                              color: '#7A8F95',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            {s.notes &&
                                            s.notes.length > 0 &&
                                            !s.notes.trim().startsWith('{')
                                              ? 'Edit Notes'
                                              : 'Add Notes'}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </>
                            ) : null}
                            <div className="mt-3">
                              <p className="text-[11px] font-medium" style={{ color: '#7A8F95' }}>
                                Next call
                              </p>
                              <p
                                className="text-[13px] leading-relaxed"
                                style={{
                                  color:
                                    nextActionsFormatted === NOT_CAPTURED_NEXT
                                      ? '#C8E8E5'
                                      : '#2D4459',
                                  fontStyle:
                                    nextActionsFormatted === NOT_CAPTURED_NEXT
                                      ? 'italic'
                                      : undefined,
                                }}
                              >
                                {nextActionsFormatted}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reminders" className="h-full min-h-0 mt-0 focus-visible:outline-none">
            <div className="flex h-full max-h-[75vh] justify-center overflow-y-auto p-6">
              <div
                className="mx-auto w-full max-w-md"
                style={{
                  background: 'white',
                  border: '1px solid #C8E8E5',
                  borderLeft: '4px solid #3BBFBF',
                  borderRadius: 12,
                  padding: '24px 28px',
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <Bell className="h-8 w-8 shrink-0" style={{ color: '#3BBFBF' }} aria-hidden />
                  <h2 className="mt-4 font-bold" style={{ color: '#2D4459', fontSize: 16 }}>
                    Follow-up Reminders
                  </h2>
                  <p
                    className="mt-3 whitespace-pre-line leading-relaxed"
                    style={{ color: '#7A8F95', fontSize: 13 }}
                  >
                    {`Set a reminder to follow up with this client at exactly the right time.

Use reminders for:
· Re-engagement after gone quiet
· Post-POC trigger follow-up
· 90-day referral ask after placement
· C4 revival after 6 months`}
                  </p>
                </div>
                {!reminderFormOpen ? (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      className="font-bold text-white"
                      style={{
                        background: '#3BBFBF',
                        color: 'white',
                        borderRadius: 8,
                        padding: '10px 20px',
                        fontSize: 13,
                      }}
                      onClick={() => setReminderFormOpen(true)}
                    >
                      + Add Reminder
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4 text-left">
                    <div className="space-y-1.5">
                      <Label htmlFor="reminder-date" className="text-sm" style={{ color: '#2D4459' }}>
                        Remind me on
                      </Label>
                      <Input
                        id="reminder-date"
                        type="date"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reminder-note" className="text-sm" style={{ color: '#2D4459' }}>
                        Note
                      </Label>
                      <Textarea
                        id="reminder-note"
                        rows={3}
                        value={reminderNote}
                        onChange={(e) => setReminderNote(e.target.value)}
                        placeholder={
                          'What do you want to remember\nto do with this client?'
                        }
                        className="w-full resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reminder-type" className="text-sm" style={{ color: '#2D4459' }}>
                        Reminder type
                      </Label>
                      <select
                        id="reminder-type"
                        value={reminderType}
                        onChange={(e) =>
                          setReminderType(e.target.value as ReminderTypeOption)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {REMINDER_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      className="w-full font-semibold text-white"
                      style={{ background: '#3BBFBF' }}
                      disabled={reminderSaving || !reminderDate.trim()}
                      onClick={() => {
                        void handleSaveReminder();
                      }}
                    >
                      {reminderSaving ? 'Saving…' : 'Save Reminder'}
                    </Button>
                  </div>
                )}
                {reminderSavedLocallyMsg ? (
                  <p className="mt-4 text-center text-sm" style={{ color: '#7A8F95' }}>
                    Reminder saved locally
                  </p>
                ) : null}
                {reminderSetConfirm ? (
                  <p className="mt-2 text-center text-sm font-medium" style={{ color: '#3BBFBF' }}>
                    Reminder set ✓
                  </p>
                ) : null}
                {savedReminder ? (
                  <div
                    className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm"
                    style={{ borderColor: '#C8E8E5', color: '#2D4459' }}
                  >
                    <span className="min-w-0 flex-1 break-words">
                      <span className="font-medium tabular-nums">{savedReminder.date}</span>
                      <span className="mx-2 text-[#7A8F95]">|</span>
                      <span>{savedReminder.type}</span>
                      <span className="mx-2 text-[#7A8F95]">|</span>
                      <span>{savedReminder.note || '—'}</span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 font-medium underline"
                      style={{ color: '#3BBFBF' }}
                      onClick={() => {
                        void handleClearSavedReminder();
                      }}
                    >
                      Clear
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </TabsContent>
        </div>
        </Tabs>

      <Dialog
        open={!!stageMoveDialog}
        onOpenChange={(open) => {
          if (!open && !stageMoveSaving) setStageMoveDialog(null);
        }}
      >
        <DialogContent
          className="max-w-[440px] gap-0 border-0 p-0 shadow-xl"
          style={{
            borderRadius: 12,
            padding: '24px 28px',
            background: 'white',
          }}
        >
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle style={{ color: '#2D4459', fontSize: 16, fontWeight: 700 }}>
              Move {client.name}?
            </DialogTitle>
          </DialogHeader>
          {stageMoveDialog ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm" style={{ color: '#2D4459' }}>
                Move from{' '}
                <span className="font-semibold">{stageHeaderBadgeText}</span> to{' '}
                <span className="font-semibold">
                  {(() => {
                    const t = getStageDisplay(stageMoveDialog.target);
                    return `${t.code} · ${t.label}`;
                  })()}
                </span>
                ?
              </p>
              {stageMoveDialog.direction === 'forward'
                ? (() => {
                    const w = forwardMoveDocumentWarning(
                      stageMoveDialog.target,
                      {
                        sessionCount: fathomSessionCount,
                        hasDisc: discScores != null,
                        hasYou2: you2Details != null,
                        hasVision: persistedVisionText.length > 0,
                      }
                    );
                    return w ? (
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {w}
                      </p>
                    ) : null;
                  })()
                : null}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="text-sm font-medium text-[#7A8F95] underline-offset-2 hover:underline"
                  disabled={stageMoveSaving}
                  onClick={() => setStageMoveDialog(null)}
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  disabled={stageMoveSaving}
                  className="w-full border-0 text-white hover:opacity-90 sm:w-auto"
                  style={{ background: '#3BBFBF' }}
                  onClick={() => void handleConfirmStageMove()}
                >
                  {stageMoveSaving ? 'Saving…' : 'Confirm Move'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={ahaModalOpen}
        onOpenChange={(open) => {
          setAhaModalOpen(open);
          if (!open) resetAhaForm();
        }}
      >
        <DialogContent
          className="max-w-[440px] gap-0 border-0 p-0 shadow-xl"
          style={{
            borderRadius: 12,
            padding: '24px 28px',
            background: 'white',
          }}
        >
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle style={{ color: '#2D4459', fontSize: 16, fontWeight: 700 }}>
              Capture Aha Moment
            </DialogTitle>
            <p className="text-[12px] leading-snug" style={{ color: '#7A8F95' }}>
              What did you just realize about this client or your coaching?
            </p>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="aha-moment-text" className="text-sm text-[#2D4459]">
                What did you realize?
              </Label>
              <Textarea
                id="aha-moment-text"
                rows={3}
                value={ahaText}
                onChange={(e) => {
                  setAhaText(e.target.value);
                  setAhaTextError(false);
                }}
                placeholder={
                  'e.g. Alex is not afraid of the investment — he is afraid of disappointing his father.'
                }
                className="w-full resize-none"
              />
              {ahaTextError ? (
                <p className="text-sm text-red-600">This field is required.</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aha-moment-type" className="text-sm text-[#2D4459]">
                What kind of insight is this?
              </Label>
              <select
                id="aha-moment-type"
                value={ahaType}
                onChange={(e) => setAhaType(e.target.value as AhaMomentType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {AHA_MOMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="text-sm font-medium text-[#7A8F95] underline-offset-2 hover:underline"
              onClick={() => {
                setAhaModalOpen(false);
                resetAhaForm();
              }}
            >
              Cancel
            </button>
            <Button
              type="button"
              disabled={ahaSaving}
              className="w-full border-0 text-white hover:opacity-90 sm:w-auto"
              style={{ background: '#3BBFBF' }}
              onClick={() => void handleSaveAhaMoment()}
            >
              {ahaSaving ? 'Saving…' : 'Save Aha Moment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showReplyModal}
        onOpenChange={(open) => {
          setShowReplyModal(open);
          if (!open) setReplySending(false);
        }}
      >
        <DialogContent
          className="max-h-[92vh] max-w-[min(96vw,560px)] gap-0 overflow-y-auto border-0 p-0 shadow-xl"
          style={{ borderRadius: 12, background: 'white' }}
        >
          <DialogHeader
            className="flex flex-row items-start justify-between space-y-0 border-b px-6 py-4 text-left"
            style={{ borderColor: '#C8E8E5' }}
          >
            <DialogTitle style={{ color: '#2D4459', fontSize: 18, fontWeight: 700 }}>
              Reply to {client.name}
            </DialogTitle>
            <button
              type="button"
              className="rounded-md p-1 text-[#7A8F95] hover:bg-slate-100"
              aria-label="Close"
              onClick={() => setShowReplyModal(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            <div
              className="rounded-lg px-3.5 py-2.5 text-[12px]"
              style={{ background: '#F0FAFA', color: '#3BBFBF' }}
            >
              ✨ Template based on their DISC style: {DISC_STYLE_LABEL[replyDiscStyle]}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['D', 'I', 'S', 'C'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors"
                  style={
                    replyDiscStyle === s
                      ? { background: '#3BBFBF', color: 'white' }
                      : {
                          background: 'white',
                          border: '1px solid #C8E8E5',
                          color: '#7A8F95',
                        }
                  }
                  onClick={() => {
                    setReplyDiscStyle(s);
                    const t = getDiscEmailTemplate(s, client.name);
                    setReplySubject(t.subject);
                    setReplyBody(t.body);
                  }}
                >
                  {s === 'D'
                    ? 'High D'
                    : s === 'I'
                      ? 'High I'
                      : s === 'S'
                        ? 'High S'
                        : 'High C'}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gmail-reply-subject" className="text-sm" style={{ color: '#2D4459' }}>
                Subject
              </Label>
              <Input
                id="gmail-reply-subject"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                className="rounded-lg"
                style={{ borderColor: '#C8E8E5', padding: '10px 12px' }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gmail-reply-body" className="text-sm" style={{ color: '#2D4459' }}>
                Message
              </Label>
              <Textarea
                id="gmail-reply-body"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={8}
                className="min-h-[200px] resize-y rounded-lg"
                style={{ borderColor: '#C8E8E5', padding: 12 }}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-[13px] font-medium"
                style={{
                  background: 'white',
                  border: '1px solid #C8E8E5',
                  color: '#7A8F95',
                }}
                onClick={() => setShowReplyModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={replySending}
                className="rounded-md px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                style={{ background: '#3BBFBF' }}
                onClick={() => {
                  void (async () => {
                    const toAddr = (contact.email ?? client.email ?? '').trim();
                    if (!toAddr) {
                      toast.error('❌ Client has no email address.', {
                        style: { background: '#F05F57', color: 'white' },
                        duration: 4000,
                      });
                      return;
                    }
                    setReplySending(true);
                    try {
                      const result = await gmailTool.execute('send_email', {
                        to: toAddr,
                        subject: replySubject,
                        body: replyBody,
                      });
                      if (result.success) {
                        setShowReplyModal(false);
                        toast.success(`✅ Email sent to ${client.name}`, {
                          style: { background: '#3BBFBF', color: 'white' },
                          duration: 4000,
                        });
                        await refreshRecentEmail();
                      } else {
                        toast.error(`❌ Could not send email. ${result.error ?? 'Unknown error'}`, {
                          style: { background: '#F05F57', color: 'white' },
                          duration: 4000,
                        });
                      }
                    } catch (e) {
                      toast.error(
                        `❌ Could not send email. ${e instanceof Error ? e.message : String(e)}`,
                        {
                          style: { background: '#F05F57', color: 'white' },
                          duration: 4000,
                        }
                      );
                    } finally {
                      setReplySending(false);
                    }
                  })();
                }}
              >
                {replySending ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showThreadModal}
        onOpenChange={(open) => {
          setShowThreadModal(open);
          if (!open) {
            setThreadEmails([]);
            setThreadLoading(false);
          }
        }}
      >
        <DialogContent
          className="max-h-[92vh] max-w-[min(96vw,560px)] gap-0 overflow-hidden border-0 p-0 shadow-xl"
          style={{ borderRadius: 12, background: 'white' }}
        >
          <DialogHeader
            className="flex flex-row items-start justify-between space-y-0 border-b px-6 py-4 text-left"
            style={{ borderColor: '#C8E8E5' }}
          >
            <DialogTitle style={{ color: '#2D4459', fontSize: 16, fontWeight: 700 }}>
              Email thread with {client.name}
            </DialogTitle>
            <button
              type="button"
              className="rounded-md p-1 text-[#7A8F95] hover:bg-slate-100"
              aria-label="Close"
              onClick={() => setShowThreadModal(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>
          <div className="max-h-[min(70vh,520px)] overflow-y-auto px-6 py-4">
            {threadLoading ? (
              <div className="flex items-center gap-2 py-8">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#3BBFBF' }} aria-hidden />
                <span className="text-sm italic" style={{ color: '#7A8F95' }}>
                  Loading thread…
                </span>
              </div>
            ) : threadEmails.length === 0 ? (
              <p className="text-sm" style={{ color: '#7A8F95' }}>
                No messages in this thread.
              </p>
            ) : (
              <div className="space-y-4">
                {threadEmails.map((em, idx) => (
                  <div
                    key={`${em.id}-${idx}`}
                    className={idx > 0 ? 'border-t border-[#C8E8E5] pt-4' : ''}
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-[12px]" style={{ color: '#7A8F95' }}>
                      <span className="font-medium">{em.from || '—'}</span>
                      <span>{formatEmailRelative(em.date)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: '#2D4459' }}>
                      {em.body || em.snippet || '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {ahaToast ? (
        <div
          role="status"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[300] max-w-[90vw] -translate-x-1/2 rounded-lg px-4 py-3 text-center text-sm font-semibold text-white shadow-lg"
          style={{ backgroundColor: '#C8613F' }}
        >
          {ahaToast}
        </div>
      ) : null}
    </div>
  );
}

const CLIENT_INTEL_STAGE_FILTER_KEY = 'client_intelligence_stage_filter';

export default function ClientIntelligence() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarRecFilter, setSidebarRecFilter] = useState<SidebarRecFilter>('all');
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);
  const [addClientSaving, setAddClientSaving] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientNameError, setNewClientNameError] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientProfession, setNewClientProfession] = useState('');
  const [newClientStage, setNewClientStage] = useState<NewClientStageCode>('IC');
  const [newClientHowFound, setNewClientHowFound] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [addClientSuccessToast, setAddClientSuccessToast] = useState<{
    name: string;
    clientId: string;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    bg: string;
    durationMs: number;
  } | null>(null);

  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [undoDoneToast, setUndoDoneToast] = useState<string | null>(null);
  const [undoBarPct, setUndoBarPct] = useState(100);

  const [discProfiles, setDiscProfiles] = useState<Awaited<ReturnType<typeof getDiscProfilesMap>>>(new Map());
  const [readinessMap, setReadinessMap] = useState<Map<string, number>>(new Map());
  const [recommendationById, setRecommendationById] = useState<
    Map<string, Recommendation>
  >(new Map());
  const [goneQuietById, setGoneQuietById] = useState<
    Map<string, { gone_quiet: boolean; gone_quiet_days: number }>
  >(new Map());
  const [discDerivedMap, setDiscDerivedMap] = useState<Map<string, { style: 'D' | 'I' | 'S' | 'C'; label: string }>>(new Map());

  const clientIntelligenceShellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLIENT_INTEL_STAGE_FILTER_KEY);
      if (
        raw === 'IC' ||
        raw === 'C1' ||
        raw === 'C2' ||
        raw === 'C3' ||
        raw === 'C4' ||
        raw === 'C5'
      ) {
        setSelectedStage(raw);
      }
      if (raw != null) {
        localStorage.removeItem(CLIENT_INTEL_STAGE_FILTER_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /** App.tsx ModuleHeader still passes the legacy description; hide it so only our subtitle shows. */
  useLayoutEffect(() => {
    if (loading || error) return;
    const root = clientIntelligenceShellRef.current;
    if (!root?.parentElement) return;
    const legacyDesc = root.parentElement.querySelector(
      ':scope > div.mb-6 > p.mt-1'
    ) as HTMLElement | null;
    if (!legacyDesc?.textContent?.includes('DISC profiles')) return;
    const prev = legacyDesc.style.display;
    legacyDesc.style.display = 'none';
    return () => {
      if (document.body.contains(legacyDesc)) {
        legacyDesc.style.display = prev;
      }
    };
  }, [loading, error]);

  const loadClients = (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
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
        if (!silent) {
          setError(String(err?.message ?? err ?? 'Failed to load clients'));
        }
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.durationMs);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!addClientSuccessToast) return;
    const t = window.setTimeout(() => setAddClientSuccessToast(null), 8000);
    return () => clearTimeout(t);
  }, [addClientSuccessToast]);

  const undoRef = useRef<UndoState | null>(null);
  useEffect(() => {
    undoRef.current = undoState;
  }, [undoState]);

  useEffect(() => {
    if (!undoState) {
      setUndoBarPct(100);
      return;
    }
    setUndoBarPct(100);
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / 10000) * 100);
      setUndoBarPct(pct);
      if (elapsed >= 10000) window.clearInterval(id);
    }, 50);
    return () => window.clearInterval(id);
  }, [undoState?.clientId, undoState?.toStage, undoState?.timeoutId]);

  useEffect(() => {
    if (!undoDoneToast) return;
    const t = window.setTimeout(() => setUndoDoneToast(null), 3000);
    return () => clearTimeout(t);
  }, [undoDoneToast]);

  const handleStageMoveUndoOffer = useCallback((payload: StageUndoPayload) => {
    setUndoState((prev) => {
      if (prev?.timeoutId) clearTimeout(prev.timeoutId);
      const tid = window.setTimeout(() => setUndoState(null), 10000);
      return { ...payload, timeoutId: tid };
    });
  }, []);

  const handleStageUndoClick = useCallback(async () => {
    const u = undoRef.current;
    if (!u) return;
    clearTimeout(u.timeoutId);
    setUndoState(null);
    const revertStage =
      !u.fromStage || u.fromStage.trim() === '' ? 'IC' : u.fromStage;
    try {
      await dbExecute(
        `UPDATE clients SET inferred_stage = $1, updated_at = datetime('now') WHERE id = $2`,
        [revertStage, String(u.clientId)]
      );
      await dbExecute(
        `INSERT INTO client_stage_log (client_id, from_stage, to_stage, moved_at, moved_by, notes)
         VALUES ($1, $2, $3, datetime('now'), $4, $5)`,
        [
          String(u.clientId),
          String(u.toStage),
          String(revertStage),
          'coach',
          'undo',
        ]
      );
      await logEntry(
        'stage_move_rollback',
        String(u.clientId),
        u.toStage,
        revertStage,
        null,
        'deterministic'
      );
      setSelectedClient((prev) =>
        prev && prev.id === u.clientId
          ? { ...prev, inferred_stage: revertStage }
          : prev
      );
      try {
        const fresh = await getClient(u.clientId);
        setSelectedClient(fresh);
      } catch (e) {
        console.error(e);
      }
      loadClients({ silent: true });
      const prevDisp = getStageDisplay(revertStage);
      setUndoDoneToast(
        `↩ Undone — ${u.clientName} back at ${prevDisp.code} · ${prevDisp.label}`
      );
    } catch (e) {
      console.error('undo stage failed:', e);
    }
  }, [loadClients]);

  function resetAddClientForm() {
    setNewClientName('');
    setNewClientNameError(false);
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientProfession('');
    setNewClientStage('IC');
    setNewClientHowFound('');
    setNewClientNotes('');
  }

  const handleAddClientSubmit = async () => {
    const name = newClientName.trim();
    if (!name) {
      setNewClientNameError(true);
      return;
    }
    setNewClientNameError(false);
    setAddClientSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const stageCode = newClientStage;
      const displayStage = getStageDisplay(stageCode).label;
      const email = newClientEmail.trim() || null;
      const phone = newClientPhone.trim() || null;
      const profession = newClientProfession.trim();
      const howFound = newClientHowFound.trim();
      const notesBody = newClientNotes.trim();
      const parts: string[] = [];
      if (profession) parts.push(`Current profession: ${profession}`);
      if (howFound) parts.push(`Lead source: ${howFound}`);
      if (notesBody) parts.push(notesBody);
      const combinedNotes = parts.length > 0 ? parts.join('\n\n') : null;
      const bucket = 'active';

      await dbExecute(
        `INSERT INTO clients (
          id, name, email, phone, company, stage,
          inferred_stage, outcome_bucket,
          readiness_score, pink_flags, notes,
          created_at, updated_at,
          readiness_identity, readiness_commitment, readiness_financial, readiness_execution,
          confidence, recommendation, stage_confirmed
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8,
          0, '[]', $9,
          $10, $10,
          3, 3, 3, 3,
          50, 'NURTURE', 0
        )`,
        [id, name, email, phone, null, displayStage, stageCode, bucket, combinedNotes, now]
      );

      await logEntry(
        'client_created_manual',
        id,
        null,
        `${name} | ${stageCode}`,
        null,
        'deterministic'
      );

      setAddClientModalOpen(false);
      resetAddClientForm();
      loadClients();
      const created = await getClient(id);
      setSelectedClient(created);
      setAddClientSuccessToast({ name, clientId: id });
    } catch (err) {
      console.error(err);
    } finally {
      setAddClientSaving(false);
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
    const filtered = clients.filter((client) => {
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

    const cmpName = (a: Client, b: Client) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

    const cmpCreated = (a: Client, b: Client) => {
      const ta = new Date(a.created_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? 0).getTime();
      if (tb !== ta) return tb - ta;
      return cmpName(a, b);
    };

    function urgencyTier(client: Client): 1 | 2 | 3 | 4 {
      const bucket = (client.outcome_bucket ?? '').toLowerCase();
      if (bucket === 'paused') return 4;
      const pink = countActivePinkFlagsOnClient(client);
      if (pink > 0) return 1;
      const gq = Boolean(goneQuietById.get(client.id)?.gone_quiet);
      if (gq) return 2;
      return 3;
    }

    return [...filtered].sort((a, b) => {
      const tA = urgencyTier(a);
      const tB = urgencyTier(b);
      if (tA !== tB) return tA - tB;
      if (tA === 1) {
        const pA = countActivePinkFlagsOnClient(a);
        const pB = countActivePinkFlagsOnClient(b);
        if (pB !== pA) return pB - pA;
      }
      return cmpCreated(a, b);
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
    <div ref={clientIntelligenceShellRef} className="space-y-6">
      <FeedbackButton pageName="Client Intelligence" />
      <p className="-mt-2 text-sm leading-snug" style={{ color: '#7A8F95' }}>
        Your client profiles and
        <br />
        coaching intelligence
      </p>
      <div className="flex min-h-0 min-h-[calc(100dvh-200px)] w-full flex-1 overflow-hidden rounded-lg border border-[#C8E8E5] bg-white">
            <aside
              className="flex w-[260px] shrink-0 flex-col overflow-y-auto border-r border-[#C8E8E5] bg-white"
              style={{ maxHeight: 'calc(100dvh - 200px)' }}
            >
              <div className="shrink-0 space-y-3 p-3">
                <button
                  type="button"
                  onClick={() => setAddClientModalOpen(true)}
                  className="w-full border-0 font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#3BBFBF]/50"
                  style={{
                    background: '#3BBFBF',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  + Add New Client
                </button>
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
                    const sidebarConverted = isSidebarConvertedClient(raw);
                    const showOutcomeBucketBadge =
                      !sidebarConverted ||
                      (raw.outcome_bucket ?? '').toLowerCase() !== 'converted';
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
                            {sidebarConverted ? (
                              <span
                                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                style={{
                                  backgroundColor: 'rgba(59, 191, 191, 0.15)',
                                  color: '#3BBFBF',
                                }}
                              >
                                Converted
                              </span>
                            ) : (
                              <span
                                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-800"
                                style={{
                                  backgroundColor: getStageBadgeColor(dc.inferred_stage?.trim() ?? ''),
                                }}
                              >
                                {resolvePipelineStageCode(dc.inferred_stage) ?? '—'}
                              </span>
                            )}
                            {showOutcomeBucketBadge ? (
                              <span className="inline-block rounded border border-[#C8E8E5] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#7A8F95]">
                                {getBucketDisplayName(raw.outcome_bucket)}
                              </span>
                            ) : null}
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex" aria-label="Gone quiet — needs follow up">
                                  <Clock className="h-4 w-4 text-amber-500" aria-hidden />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={4}
                                className="rounded-[4px] border-0 bg-[#2D4459] px-2 py-1 text-[11px] font-normal leading-tight text-white shadow-md [&>svg]:hidden"
                              >
                                Gone quiet — needs follow up
                              </TooltipContent>
                            </Tooltip>
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
                  onStageMoved={async (id, newInferredStage) => {
                    if (newInferredStage) {
                      setSelectedClient((prev) =>
                        prev && prev.id === id
                          ? { ...prev, inferred_stage: newInferredStage }
                          : prev
                      );
                    }
                    try {
                      const fresh = await getClient(id);
                      setSelectedClient(fresh);
                    } catch (e) {
                      console.error(e);
                    }
                    loadClients({ silent: true });
                  }}
                  onStageMoveToast={(msg, variant) => {
                    setToast({
                      message: msg,
                      bg: variant === 'error' ? '#F05F57' : '#3BBFBF',
                      durationMs: 2000,
                    });
                  }}
                  onStageMoveUndoOffer={handleStageMoveUndoOffer}
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

      {addClientModalOpen ? (
        <div
          className="fixed inset-0 z-[800] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => {
            setAddClientModalOpen(false);
            resetAddClientForm();
          }}
          role="presentation"
        >
          <div
            className="relative max-h-[92vh] overflow-y-auto shadow-xl"
            style={{ width: 480, borderRadius: 16, padding: 32, background: 'white' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-client-modal-title"
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded p-1 text-[#7A8F95] transition-colors hover:bg-[#F4F7F8]"
              aria-label="Close"
              onClick={() => {
                setAddClientModalOpen(false);
                resetAddClientForm();
              }}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <div className="flex items-start gap-3 pr-8">
              <UserPlus className="shrink-0" style={{ color: '#3BBFBF', width: 24, height: 24 }} aria-hidden />
              <div className="min-w-0">
                <h2
                  id="add-client-modal-title"
                  className="font-bold leading-tight"
                  style={{ color: '#2D4459', fontSize: 20 }}
                >
                  Add New Client
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#7A8F95' }}>
                  Enter their basic info.
                  <br />
                  You will upload their documents in The Capture.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="add-client-name" className="mb-1 block font-bold text-[13px]" style={{ color: '#2D4459' }}>
                  Full Name <span className="text-red-600">*</span>
                </label>
                <Input
                  id="add-client-name"
                  value={newClientName}
                  onChange={(e) => {
                    setNewClientName(e.target.value);
                    setNewClientNameError(false);
                  }}
                  placeholder="First Last"
                  className="w-full rounded-[8px] border border-[#C8E8E5] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#3BBFBF] focus:outline-none focus-visible:ring-0"
                />
                {newClientNameError ? (
                  <p className="mt-1 text-sm text-red-600">Name is required</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="add-client-email" className="mb-1 block font-bold text-[13px]" style={{ color: '#2D4459' }}>
                  Email Address
                </label>
                <Input
                  id="add-client-email"
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-[8px] border border-[#C8E8E5] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#3BBFBF] focus:outline-none focus-visible:ring-0"
                />
              </div>

              <div>
                <label htmlFor="add-client-phone" className="mb-1 block font-bold text-[13px]" style={{ color: '#2D4459' }}>
                  Phone Number
                </label>
                <Input
                  id="add-client-phone"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="000-000-0000"
                  className="w-full rounded-[8px] border border-[#C8E8E5] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#3BBFBF] focus:outline-none focus-visible:ring-0"
                />
              </div>

              <div>
                <label htmlFor="add-client-profession" className="mb-1 block font-bold text-[13px]" style={{ color: '#2D4459' }}>
                  Current Profession
                </label>
                <Input
                  id="add-client-profession"
                  value={newClientProfession}
                  onChange={(e) => setNewClientProfession(e.target.value)}
                  placeholder="What do they do now?"
                  className="w-full rounded-[8px] border border-[#C8E8E5] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#3BBFBF] focus:outline-none focus-visible:ring-0"
                />
                <p className="mt-1 text-[11px]" style={{ color: '#7A8F95' }}>
                  e.g. &quot;Corporate HR Manager&quot;, &quot;Small business owner&quot;, &quot;Sales Director&quot;
                </p>
              </div>

              <div>
                <label htmlFor="add-client-stage" className="mb-1 block font-bold text-[13px]" style={{ color: '#2D4459' }}>
                  Current Stage <span className="text-red-600">*</span>
                </label>
                <select
                  id="add-client-stage"
                  value={newClientStage}
                  onChange={(e) => setNewClientStage(e.target.value as NewClientStageCode)}
                  className="w-full rounded-[8px] border border-[#C8E8E5] bg-white px-[14px] py-[10px] text-[13px] outline-none focus:border-[#3BBFBF] focus:outline-none"
                >
                  {ADD_CLIENT_STAGE_OPTIONS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="add-client-how-found" className="mb-1 block font-bold text-[13px]" style={{ color: '#2D4459' }}>
                  How did you find them?
                </label>
                <select
                  id="add-client-how-found"
                  value={newClientHowFound}
                  onChange={(e) => setNewClientHowFound(e.target.value)}
                  className="w-full rounded-[8px] border border-[#C8E8E5] bg-white px-[14px] py-[10px] text-[13px] outline-none focus:border-[#3BBFBF] focus:outline-none"
                >
                  <option value="">Select…</option>
                  {HOW_FOUND_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="add-client-notes" className="mb-1 block font-bold text-[13px]" style={{ color: '#2D4459' }}>
                  Initial Notes
                </label>
                <Textarea
                  id="add-client-notes"
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  placeholder={'Anything important to remember about this person...'}
                  className="w-full resize-y rounded-[8px] border border-[#C8E8E5] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#3BBFBF] focus:outline-none focus-visible:ring-0"
                  style={{ minHeight: 80 }}
                />
              </div>
            </div>

            <div className="mt-8 flex flex-row flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setAddClientModalOpen(false);
                  resetAddClientForm();
                }}
                style={{
                  background: 'white',
                  border: '1px solid #C8E8E5',
                  color: '#7A8F95',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addClientSaving}
                className="font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{
                  background: '#3BBFBF',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 14,
                }}
                onClick={() => void handleAddClientSubmit()}
              >
                {addClientSaving ? 'Creating…' : 'Create Client →'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addClientSuccessToast ? (
        <div
          className="pointer-events-auto fixed bottom-6 left-1/2 z-[850] flex max-w-[calc(100vw-32px)] items-center justify-between gap-3 rounded-[10px] px-5 py-[14px] shadow-lg"
          style={{
            width: 380,
            transform: 'translateX(-50%)',
            background: '#2D4459',
            color: 'white',
          }}
          role="status"
        >
          <p className="min-w-0 flex-1 text-[14px] leading-snug text-white">
            ✓ {addClientSuccessToast.name} added to your pipeline
          </p>
          <button
            type="button"
            className="shrink-0 font-bold text-white transition-opacity hover:opacity-90"
            style={{
              background: '#3BBFBF',
              borderRadius: 6,
              padding: '4px 14px',
              fontSize: 12,
            }}
            onClick={() => {
              const id = addClientSuccessToast.clientId;
              setAddClientSuccessToast(null);
              navigateToTheCapture(id);
            }}
          >
            Upload Documents →
          </button>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[300] max-w-[90vw] -translate-x-1/2 rounded-lg px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
          style={{ backgroundColor: toast.bg }}
        >
          {toast.message}
        </div>
      ) : null}
      {undoState ? (
        <div
          className="pointer-events-auto fixed bottom-6 left-1/2 flex flex-col"
          style={{
            zIndex: 9999,
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            transform: 'translateX(-50%)',
            background: '#2D4459',
            borderRadius: 10,
            padding: '14px 20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-white" style={{ fontSize: 14 }}>
              ✓ {undoState.clientName} moved to{' '}
              {getStageDisplay(undoState.toStage).code} ·{' '}
              {getStageDisplay(undoState.toStage).label}
            </p>
            <button
              type="button"
              className="shrink-0 font-bold text-white"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.4)',
                borderRadius: 6,
                padding: '4px 12px',
                fontSize: 12,
                cursor: 'pointer',
              }}
              onClick={() => void handleStageUndoClick()}
            >
              Undo
            </button>
          </div>
          <div
            className="mt-3 h-[3px] w-full overflow-hidden rounded-sm bg-white/10"
            aria-hidden
          >
            <div
              className="h-full rounded-sm"
              style={{
                width: `${undoBarPct}%`,
                background: '#3BBFBF',
                height: 3,
              }}
            />
          </div>
        </div>
      ) : null}
      {undoDoneToast ? (
        <div
          role="status"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] max-w-[90vw] -translate-x-1/2 rounded-lg px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
          style={{ background: '#3BBFBF' }}
        >
          {undoDoneToast}
        </div>
      ) : null}
      <UATFeedback currentPage="Client Intelligence" />
    </div>
  );
}
