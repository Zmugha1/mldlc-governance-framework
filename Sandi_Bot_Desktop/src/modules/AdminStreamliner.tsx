import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { 
  Activity, 
  MessageSquare,
  TrendingUp,
  Download,
  Settings,
  Database,
  Bell,
  Shield,
  User,
  Users,
  Clock,
  CheckCircle2,
  BookOpen,
  Heart,
  Target,
  FolderInput,
  ListChecks,
  Layers,
  Brain,
  Building2,
  Library,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { SkeletonCard } from '@/components/SkeletonCard';
import { Progress } from '@/components/ui/progress';
import { knowledgeGraph } from '@/data/sampleClients';
import { bulkImportFolder, bulkImportRetryFailed, type BulkImportResult, type ImportProgress } from '@/services/bulkImportService';
import {
  extractYou2Profile,
  processDocument,
  bulkReExtractFathomSessions
} from '@/services/documentExtractionService';
import type { DocumentType } from '@/types/extractions';
import { getAllClients, getRankedClients, getAverageConfidence, getSupportiveSpouseClients } from '@/services/clientService';
import { logEntry } from '@/services/auditService';
import { dbSelect, dbExecute } from '@/services/db';
import { createBackup, getLastBackup } from '@/services/backupService';
import { clientToDisplay } from '@/services/clientAdapter';
import { cn } from '@/lib/utils';
import FeedbackButton from '../components/FeedbackButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DisplayClient = ReturnType<typeof clientToDisplay>;

type UserFeedbackRow = {
  id: string;
  page_name: string;
  feedback_type: string;
  rating: string | null;
  feedback_text: string | null;
  feature_name: string | null;
  thumbs_up: number | null;
  session_date: string | null;
  created_at: string;
};

function localCalendarDateYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatFeedbackTableDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncateFeedbackText(s: string | null | undefined, maxLen: number): string {
  const t = (s ?? '').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

function baseFileNameFromPathOrName(fileNameOrPath: string): string {
  const parts = fileNameOrPath.split(/[/\\]/);
  return parts[parts.length - 1] ?? fileNameOrPath;
}

function isVisionStatementOutputFileName(fileName: string): boolean {
  const base = baseFileNameFromPathOrName(fileName);
  const lower = base.toLowerCase();
  if (lower.includes('vision statement')) return true;
  if (lower.includes('vision_statement')) return true;
  const compact = lower.replace(/[^a-z0-9]/g, '');
  return compact.includes('visionstatement');
}

function isOfficeDocExcludedExtension(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.endsWith('.pptx') ||
    lower.endsWith('.ppt') ||
    lower.endsWith('.docx')
  );
}

function looksLikeYou2PdfPath(lower: string): boolean {
  if (!lower.endsWith('.pdf') || lower.includes('tumay')) return false;
  return (
    lower.includes('you2') ||
    lower.includes('you2.0') ||
    lower.includes('you 2') ||
    lower.includes('you_2')
  );
}

function feedbackTypeBadgeClass(feedbackType: string): string {
  const normalized = feedbackType.trim().toLowerCase();
  if (normalized === 'daily_reflection') {
    return 'bg-purple-100 text-purple-900 border-purple-200';
  }
  if (normalized === 'broken') {
    return 'bg-red-100 text-red-900 border-red-200';
  }
  if (normalized === 'confusing') {
    return 'bg-amber-100 text-amber-900 border-amber-200';
  }
  if (normalized === 'missing something' || normalized === 'missing') {
    return 'bg-blue-100 text-blue-900 border-blue-200';
  }
  if (normalized === 'working well' || normalized === 'working_well') {
    return 'bg-green-100 text-green-900 border-green-200';
  }
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

function csvEscapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Map user_feedback row to UAT CSV columns (schema uses page_name, created_at, feedback_text, thumbs_up). */
function parseUatFeedbackExportRow(row: UserFeedbackRow): {
  date: string;
  page: string;
  rating: string;
  working: string;
  confusing: string;
  missing: string;
  comments: string;
} {
  const text = (row.feedback_text ?? '').trim();
  let working = row.thumbs_up === 1 ? 'yes' : 'no';
  let confusing = 'no';
  let missing = 'no';
  let comments = text;

  if (text.includes('Working well:')) {
    const wl = /Working well:\s*(yes|no)/i.exec(text);
    if (wl) working = wl[1].toLowerCase();
    const conf = /Confusing:\s*(yes|no)/i.exec(text);
    if (conf) confusing = conf[1].toLowerCase();
    const miss = /Missing something:\s*(yes|no)/i.exec(text);
    if (miss) missing = miss[1].toLowerCase();
    const idx = text.indexOf('\n\n');
    comments = idx >= 0 ? text.slice(idx + 2).trim() : '';
  }

  return {
    date: row.created_at ?? row.session_date ?? '',
    page: row.page_name ?? '',
    rating: (row.rating ?? '').trim(),
    working,
    confusing,
    missing,
    comments,
  };
}

type AuditLogExportRow = {
  timestamp: string;
  action_type: string;
  client_id: string | null;
  input_data: string | null;
  output_data: string | null;
  reasoning: string | null;
  model_used: string | null;
};

function auditDetailsCell(row: AuditLogExportRow): string {
  const parts = [
    row.output_data ? `out: ${row.output_data}` : '',
    row.reasoning ? `reason: ${row.reasoning}` : '',
    row.input_data ? `in: ${row.input_data}` : '',
  ].filter(Boolean);
  return parts.join(' | ') || '';
}

type UatFeedbackSummaryRow = {
  total: number;
  avg_rating: number | null;
  working_count: number;
  confusing_count: number;
  missing_count: number;
};

type CompletenessCellStatus = 'OK' | 'PARTIAL' | 'MISSING' | 'WARN';

type CompletenessAuditRow = {
  name: string;
  inferred_stage: string | null;
  outcome_bucket: string | null;
  vision: CompletenessCellStatus;
  dangers: CompletenessCellStatus;
  opportunities: CompletenessCellStatus;
  strengths: CompletenessCellStatus;
  skills: CompletenessCellStatus;
  disc: CompletenessCellStatus;
  sessions: CompletenessCellStatus;
  contact: CompletenessCellStatus;
  lastContact: CompletenessCellStatus;
  ragReady: boolean;
};

function isMeaningful(value: unknown): boolean {
  if (value === null) return false;
  if (value === undefined) return false;
  const str = String(value).trim();
  if (str === '') return false;
  if (str === '[]') return false;
  if (str === '{}') return false;
  if (str === 'null') return false;
  if (str === 'undefined') return false;
  if (str === 'Not provided') return false;
  if (str === 'Not available') return false;
  if (str === 'N/A') return false;
  if (str.length < 10) return false;
  try {
    const parsed = JSON.parse(str) as unknown;
    if (Array.isArray(parsed) && parsed.length === 0) return false;
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => String(item).trim() === '')
    ) {
      return false;
    }
  } catch {
    // not JSON — use string check above
  }
  return true;
}

/** You2-style text fields: OK (>30 chars), PARTIAL (10–30), MISSING otherwise. */
function you2FieldStatus(value: unknown): CompletenessCellStatus {
  if (!isMeaningful(value)) return 'MISSING';
  const str = String(value).trim();
  return str.length > 30 ? 'OK' : 'PARTIAL';
}

function discColumnStatus(row: {
  natural_d: number | null;
  natural_i: number | null;
  natural_s: number | null;
  natural_c: number | null;
}): CompletenessCellStatus {
  const nums = [
    Number(row.natural_d ?? 0),
    Number(row.natural_i ?? 0),
    Number(row.natural_s ?? 0),
    Number(row.natural_c ?? 0),
  ];
  return nums.some((n) => n > 0) ? 'OK' : 'MISSING';
}

function sessionsColumnStatus(realSessionCount: number): CompletenessCellStatus {
  return realSessionCount >= 1 ? 'OK' : 'WARN';
}

function contactColumnStatus(email: unknown): CompletenessCellStatus {
  if (email === null || email === undefined) return 'MISSING';
  const str = String(email).trim();
  if (str === '') return 'MISSING';
  if (str === '[]' || str === 'null' || str === 'undefined') return 'MISSING';
  if (
    str === 'Not provided' ||
    str === 'Not available' ||
    str === 'N/A'
  ) {
    return 'MISSING';
  }
  if (!str.includes('@')) return 'MISSING';
  const local = str.split('@')[0] ?? '';
  if (local.length < 2) return 'MISSING';
  if (str.length < 10) return 'PARTIAL';
  return 'OK';
}

function lastContactColumnStatus(dateVal: unknown): CompletenessCellStatus {
  if (dateVal === null || dateVal === undefined) return 'MISSING';
  const str = String(dateVal).trim();
  if (str === '') return 'MISSING';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return 'MISSING';
  const cutoff = new Date('2024-01-01T00:00:00.000Z');
  if (d < cutoff) return 'MISSING';
  return 'OK';
}

function completenessStatusLabel(s: CompletenessCellStatus): string {
  if (s === 'OK') return '✅ OK';
  if (s === 'PARTIAL') return '⚠️ PARTIAL';
  if (s === 'WARN') return '⚠️ WARN';
  return '❌ MISSING';
}

function completenessStatusTextClass(s: CompletenessCellStatus): string {
  if (s === 'OK') return 'text-green-700';
  if (s === 'PARTIAL' || s === 'WARN') return 'text-amber-700';
  return 'text-red-700';
}

function auditRowBackground(row: CompletenessAuditRow): string {
  const cells: CompletenessCellStatus[] = [
    row.vision,
    row.dangers,
    row.opportunities,
    row.strengths,
    row.skills,
    row.disc,
    row.sessions,
    row.contact,
    row.lastContact,
  ];
  if (cells.some((c) => c === 'MISSING')) return '#FFF0F0';
  if (cells.some((c) => c === 'PARTIAL' || c === 'WARN')) return '#FFF8F0';
  return '#ffffff';
}

const SKILLS_ONLY_REEXTRACT_NAMES = [
  'Bigith Pattar Veetil',
  'Jeff Dayton',
  'Matthew Pierce',
  'Miles Martin',
  'David Van Abbema',
  'Kevin Lynch',
  'Mike Cain',
  'Elizabeth Jikiemi',
  'Mark Neff',
  'Mike Brooks',
  'Nathan Stiers',
] as const;

const SKILLS_ONLY_OLLAMA_MODEL = 'qwen2.5:7b-instruct-q4_k_m';

function parseSkillsOnlyResponse(raw: string): string[] | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(trimmed.slice(start, end + 1)) as {
      skills?: unknown;
    };
    if (!Array.isArray(obj.skills)) return null;
    return obj.skills.map((s) => String(s));
  } catch {
    return null;
  }
}

type ActivityAuditRow = {
  id: number;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
  client_name: string | null;
  input_data: string | null;
  output_data: string | null;
};

async function fetchActivityAuditRows(): Promise<ActivityAuditRow[]> {
  return dbSelect<ActivityAuditRow>(
    `SELECT
      al.id,
      al.action_type,
      CASE WHEN al.client_id IS NOT NULL THEN 'client' ELSE NULL END AS entity_type,
      al.client_id AS entity_id,
      COALESCE(
        NULLIF(TRIM(al.reasoning), ''),
        TRIM(
          COALESCE(al.input_data, '') || ' ' || COALESCE(al.output_data, '')
        )
      ) AS details,
      al.timestamp AS created_at,
      c.name AS client_name,
      al.input_data,
      al.output_data
     FROM audit_log al
     LEFT JOIN clients c ON al.client_id = c.id
     ORDER BY al.timestamp DESC
     LIMIT 50`,
    []
  );
}

/** Prefer JSON in details; else input_data / arrow line in output_data (Coach Bot stage logs). */
function parseStageMoveFromStageRow(row: ActivityAuditRow): string | null {
  const raw = (row.details ?? '').trim();
  if (raw.startsWith('{')) {
    try {
      const j = JSON.parse(raw) as { from_stage?: string };
      const fs = j.from_stage;
      if (fs != null && String(fs).trim() !== '') return String(fs).trim();
    } catch {
      /* fall through */
    }
  }
  const fromInput = row.input_data?.trim();
  if (fromInput) return fromInput;
  const out = (row.output_data ?? '').trim();
  const m = /^(.+?)\s*→\s*.+$/.exec(out);
  if (m) return m[1].trim();
  return null;
}

function activityAuditIcon(actionType: string): string {
  const t = (actionType ?? '').toLowerCase();
  if (
    t === 'stage_move' ||
    t === 'stage_moved' ||
    t === 'stage_transition'
  ) {
    return '🔄';
  }
  if (t === 'inactivate' || t === 'client_inactivated') return '🚫';
  if (t === 'flag_resolved' || t === 'pink_flag_resolved') return '✅';
  if (
    t === 'session_added' ||
    t === 'manual_session_added' ||
    (t.includes('session') && t.includes('added'))
  ) {
    return '📝';
  }
  return '📋';
}

function activityAuditTitle(row: ActivityAuditRow): string {
  const t = (row.action_type ?? '').toLowerCase();
  if (
    t === 'stage_move' ||
    t === 'stage_moved' ||
    t === 'stage_transition'
  ) {
    const out = (row.output_data ?? '').trim();
    if (out) return `Stage change: ${out}`;
    return `Stage change: ${(row.input_data ?? '').trim() || '—'}`;
  }
  if (t === 'client_inactivated' || t === 'inactivate') {
    return 'Client inactivated';
  }
  if (t === 'pink_flag_resolved' || t === 'flag_resolved') {
    return `Pink flag resolved: ${row.input_data ?? '—'}`;
  }
  if (t === 'session_added' || t === 'manual_session_added') {
    return 'Session added';
  }
  if (t.includes('session')) {
    return row.action_type.replace(/_/g, ' ');
  }
  return row.action_type.replace(/_/g, ' ');
}

function activityAuditWithinRollbackWindow(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
}

function activityAuditRollbackable(row: ActivityAuditRow): boolean {
  if (!activityAuditWithinRollbackWindow(row.created_at)) return false;
  const t = (row.action_type ?? '').toLowerCase();
  return (
    t === 'stage_move' ||
    t === 'stage_moved' ||
    t === 'stage_transition' ||
    t === 'inactivate' ||
    t === 'client_inactivated' ||
    t === 'flag_resolved' ||
    t === 'pink_flag_resolved'
  );
}

const KNOWLEDGE_UPLOAD_PLACEHOLDER = 'Uploaded — extraction coming in next update';

const KNOWLEDGE_DOMAINS: ReadonlyArray<{
  domain: string;
  description: string;
  color: string;
  Icon: React.ElementType;
}> = [
  {
    domain: 'Coaching Methodology',
    description: 'CLEAR framework,\nTES coaching guides,\nsession structure',
    color: '#3BBFBF',
    Icon: Target,
  },
  {
    domain: 'DISC Playbooks',
    description: 'Coaching approaches per DISC style,\ncommunication guides,\nre-engagement scripts',
    color: '#F05F57',
    Icon: Brain,
  },
  {
    domain: 'Franchise Knowledge',
    description: 'Industry categories,\nfranchise evaluation criteria,\nZOR preparation guides',
    color: '#2D4459',
    Icon: Building2,
  },
  {
    domain: 'Business Development',
    description: 'Pipeline management,\nconversion strategies,\nseeker sourcing guides',
    color: '#3BBFBF',
    Icon: TrendingUp,
  },
  {
    domain: 'Client Psychology',
    description: 'Seeker motivation,\ndecision making patterns,\nobjection handling',
    color: '#F05F57',
    Icon: Heart,
  },
  {
    domain: 'Reference Library',
    description: 'Books, articles,\nresearch, and reference\nmaterial you rely on',
    color: '#2D4459',
    Icon: Library,
  },
  {
    domain: 'Scripts and Templates',
    description: 'Email templates,\ncall scripts, opening\nquestions, reconnect messages',
    color: '#3BBFBF',
    Icon: FileText,
  },
  {
    domain: 'Training Materials',
    description: 'TES training content,\ncertification materials,\nonboarding guides',
    color: '#F05F57',
    Icon: GraduationCap,
  },
];

function knowledgeHealthMotivation(score: number): string {
  if (score < 25) {
    return 'Start by uploading your CLEAR framework documents';
  }
  if (score < 50) {
    return 'Good start — add more coaching resources to improve question quality';
  }
  if (score <= 75) {
    return 'Strong foundation — fill remaining domains for full coaching intelligence';
  }
  return 'Excellent knowledge base — Coach Bot has rich context for every coaching session';
}

// Stats Card
function StatCard({ title, value, change, icon: Icon, color }: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-slate-500">{title}</p>
            {change && <p className="text-xs text-green-600">{change}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminStreamliner() {
  const [adminTab, setAdminTab] = useState('activity');
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackTopPage, setFeedbackTopPage] = useState<string>('—');
  const [feedbackDailyCount, setFeedbackDailyCount] = useState(0);
  const [feedbackRows, setFeedbackRows] = useState<UserFeedbackRow[]>([]);
  const [feedbackTabLoading, setFeedbackTabLoading] = useState(false);
  const [feedbackTabLoaded, setFeedbackTabLoaded] = useState(false);
  const [clients, setClients] = useState<DisplayClient[]>([]);
  const [activityAuditRows, setActivityAuditRows] = useState<ActivityAuditRow[]>(
    []
  );
  const [rollbackLoadingId, setRollbackLoadingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: false,
    weeklyReports: true,
    clientUpdates: true,
  });
  const [importRunning, setImportRunning] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [reExtractRunning, setReExtractRunning] = useState(false);
  const [reExtractResult, setReExtractResult] = useState<{
    you2_success: number;
    tumay_success: number;
    errors: string[];
  } | null>(null);
  const [fathomReExtractRunning, setFathomReExtractRunning] = useState(false);
  const [fathomReExtractResult, setFathomReExtractResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [testDiscOutput, setTestDiscOutput] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<{
    backup_count: number;
    last_backup: string | null;
    ever_succeeded: boolean;
  }>({
    backup_count: 0,
    last_backup: null,
    ever_succeeded: false,
  });
  const [backupRows, setBackupRows] = useState<Array<{
    backup_path: string | null;
    timestamp: string | null;
    success: number;
    error_message: string | null;
  }>>([]);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [validateReadyCount, setValidateReadyCount] = useState(0);
  const [completenessAuditRows, setCompletenessAuditRows] = useState<CompletenessAuditRow[] | null>(null);
  const [completenessAuditLoading, setCompletenessAuditLoading] = useState(false);
  const [completenessAuditError, setCompletenessAuditError] = useState<string | null>(null);
  const [skillsReExtractRunning, setSkillsReExtractRunning] = useState(false);
  const [skillsReExtractLines, setSkillsReExtractLines] = useState<string[]>([]);
  const [skillsReExtractSummary, setSkillsReExtractSummary] = useState<string | null>(null);
  const [uatSummary, setUatSummary] = useState<UatFeedbackSummaryRow | null>(null);
  const [uatReportExporting, setUatReportExporting] = useState(false);
  const [uatReportToast, setUatReportToast] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const [knowledgeDomainCounts, setKnowledgeDomainCounts] = useState<Record<string, number>>({});
  const [knowledgeRecent, setKnowledgeRecent] = useState<
    Array<{ title: string; domain: string; created_at: string; file_name: string | null }>
  >([]);
  const [knowledgeModalDomain, setKnowledgeModalDomain] = useState<string | null>(null);
  const [knowledgeModalDocs, setKnowledgeModalDocs] = useState<
    Array<{ title: string; file_name: string | null; created_at: string }>
  >([]);
  const [knowledgeCardHover, setKnowledgeCardHover] = useState<string | null>(null);
  const knowledgeFileInputRef = useRef<HTMLInputElement>(null);

  const refreshKnowledgeDocuments = useCallback(async () => {
    const counts = await dbSelect<{ domain: string; c: number }>(
      `SELECT domain, COUNT(*) as c FROM knowledge_documents GROUP BY domain`,
      []
    );
    const map: Record<string, number> = {};
    for (const d of KNOWLEDGE_DOMAINS) {
      map[d.domain] = 0;
    }
    for (const row of counts) {
      map[row.domain] = Number(row.c);
    }
    setKnowledgeDomainCounts(map);
    const recent = await dbSelect<{
      title: string;
      domain: string;
      created_at: string;
      file_name: string | null;
    }>(
      `SELECT title, domain, created_at, file_name FROM knowledge_documents ORDER BY datetime(created_at) DESC LIMIT 5`,
      []
    );
    setKnowledgeRecent(recent);
  }, []);

  const loadKnowledgeModalDocs = useCallback(async (domain: string) => {
    const rows = await dbSelect<{ title: string; file_name: string | null; created_at: string }>(
      `SELECT title, file_name, created_at FROM knowledge_documents WHERE domain = ? ORDER BY datetime(created_at) DESC`,
      [domain]
    );
    setKnowledgeModalDocs(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await dbExecute(
          `CREATE TABLE IF NOT EXISTS knowledge_documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            domain TEXT NOT NULL,
            doc_type TEXT,
            file_name TEXT,
            file_size INTEGER,
            embedded INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        );
      } catch (e) {
        console.error('knowledge_documents table:', e);
      }
      if (!cancelled) {
        await refreshKnowledgeDocuments();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKnowledgeDocuments]);

  useEffect(() => {
    if (!knowledgeModalDomain) {
      setKnowledgeModalDocs([]);
      return;
    }
    void loadKnowledgeModalDocs(knowledgeModalDomain);
  }, [knowledgeModalDomain, loadKnowledgeModalDocs]);

  const uploadKnowledgePdfFiles = useCallback(
    async (files: File[]) => {
      const domain = knowledgeModalDomain;
      if (!domain) return;
      for (const file of files) {
        const lower = file.name.toLowerCase();
        if (!lower.endsWith('.pdf')) continue;
        const id = crypto.randomUUID();
        await dbExecute(
          `INSERT INTO knowledge_documents (id, title, content, domain, doc_type, file_name, file_size, embedded)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
          [id, file.name, KNOWLEDGE_UPLOAD_PLACEHOLDER, domain, 'pdf', file.name, file.size]
        );
      }
      await refreshKnowledgeDocuments();
      await loadKnowledgeModalDocs(domain);
    },
    [knowledgeModalDomain, refreshKnowledgeDocuments, loadKnowledgeModalDocs]
  );

  const fetchValidateReadyCount = async (): Promise<number> => {
    const rows = await dbSelect<{ c: number }>(
      `SELECT COUNT(*) as c FROM clients
       WHERE outcome_bucket = 'active'
         AND inferred_stage IN ('C4', 'C5')`,
      []
    );
    return Number(rows[0]?.c ?? 0);
  };

  const refreshActivityAudit = useCallback(async () => {
    const rows = await fetchActivityAuditRows();
    setActivityAuditRows(rows);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([getAllClients(), fetchActivityAuditRows(), fetchValidateReadyCount()])
      .then(([rawClients, auditRows, validateCount]) => {
        setValidateReadyCount(validateCount);
        setClients(rawClients.map((client) => clientToDisplay(client)));
        setActivityAuditRows(auditRows);
      })
      .catch((err) => {
        console.error(err);
        setError(String(err?.message ?? err ?? 'Failed to load data'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await dbSelect<{
          total: number;
          avg_rating: number | null;
          working_count: number;
          confusing_count: number;
          missing_count: number;
        }>(
          `SELECT
             COUNT(*) as total,
             AVG(
               CASE
                 WHEN rating IS NOT NULL AND TRIM(rating) != ''
                   AND CAST(rating AS REAL) BETWEEN 1 AND 5
                 THEN CAST(rating AS REAL)
                 ELSE NULL
               END
             ) as avg_rating,
             SUM(
               CASE
                 WHEN thumbs_up = 1
                   OR feedback_text LIKE '%Working well: yes%'
                 THEN 1 ELSE 0 END
             ) as working_count,
             SUM(
               CASE WHEN feedback_text LIKE '%Confusing: yes%' THEN 1 ELSE 0 END
             ) as confusing_count,
             SUM(
               CASE WHEN feedback_text LIKE '%Missing something: yes%' THEN 1 ELSE 0 END
             ) as missing_count
           FROM user_feedback`,
          []
        );
        if (cancelled) return;
        const r = rows[0];
        setUatSummary({
          total: Number(r?.total ?? 0),
          avg_rating: r?.avg_rating != null && Number.isFinite(Number(r.avg_rating)) ? Number(r.avg_rating) : null,
          working_count: Number(r?.working_count ?? 0),
          confusing_count: Number(r?.confusing_count ?? 0),
          missing_count: Number(r?.missing_count ?? 0),
        });
      } catch (e) {
        console.error('UAT summary load failed:', e);
        if (!cancelled) {
          setUatSummary({
            total: 0,
            avg_rating: null,
            working_count: 0,
            confusing_count: 0,
            missing_count: 0,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading]);

  useEffect(() => {
    if (!uatReportToast) return;
    const ms = uatReportToast.kind === 'success' ? 5000 : 6000;
    const t = window.setTimeout(() => setUatReportToast(null), ms);
    return () => window.clearTimeout(t);
  }, [uatReportToast]);

  const handleExportUatReport = async () => {
    setUatReportExporting(true);
    try {
      const [feedbackAll, auditRows] = await Promise.all([
        dbSelect<UserFeedbackRow>(
          `SELECT id, page_name, feedback_type, rating, feedback_text, feature_name, thumbs_up, session_date, created_at
           FROM user_feedback
           ORDER BY created_at ASC`,
          []
        ),
        dbSelect<AuditLogExportRow>(
          `SELECT timestamp, action_type, client_id, input_data, output_data, reasoning, model_used
           FROM audit_log
           WHERE datetime(timestamp) >= datetime('now', '-30 days')
           ORDER BY timestamp ASC`,
          []
        ),
      ]);

      const lines: string[] = [];
      lines.push(csvEscapeCell('=== FEEDBACK ==='));
      lines.push(
        [
          'Date',
          'Page',
          'Rating',
          'Working Well',
          'Confusing',
          'Missing',
          'Comments',
        ].join(',')
      );
      for (const row of feedbackAll) {
        const p = parseUatFeedbackExportRow(row);
        lines.push(
          [
            p.date,
            p.page,
            p.rating,
            p.working,
            p.confusing,
            p.missing,
            p.comments,
          ]
            .map((v) => csvEscapeCell(String(v)))
            .join(',')
        );
      }
      lines.push('');
      lines.push(csvEscapeCell('=== AUDIT LOG ==='));
      lines.push(['Date', 'Action', 'Entity Type', 'Entity ID', 'Details'].join(','));
      for (const row of auditRows) {
        const entityType = row.client_id ? 'client' : row.model_used ?? '';
        const details = auditDetailsCell(row);
        lines.push(
          [
            row.timestamp ?? '',
            row.action_type ?? '',
            entityType,
            row.client_id ?? '',
            details,
          ]
            .map((v) => csvEscapeCell(String(v)))
            .join(',')
        );
      }

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CoachBot_UAT_Report_${localCalendarDateYyyyMmDd()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setUatReportToast({
        kind: 'success',
        text:
          'UAT Report saved to your Downloads folder. Email it to Zubia at zubiamL4L@gmail.com',
      });
    } catch (e) {
      console.error('UAT report export failed:', e);
      setUatReportToast({
        kind: 'error',
        text: 'Could not export report. Please try again.',
      });
    } finally {
      setUatReportExporting(false);
    }
  };

  useEffect(() => {
    if (adminTab !== 'feedback' || loading) return;
    let cancelled = false;
    setFeedbackTabLoading(true);
    void (async () => {
      try {
        const [totalRow, topPageRows, dailyRow, rows] = await Promise.all([
          dbSelect<{ c: number }>('SELECT COUNT(*) as c FROM user_feedback', []),
          dbSelect<{ page_name: string; c: number }>(
            `SELECT page_name, COUNT(*) as c FROM user_feedback
             GROUP BY page_name ORDER BY c DESC, page_name ASC LIMIT 1`,
            []
          ),
          dbSelect<{ c: number }>(
            `SELECT COUNT(*) as c FROM user_feedback WHERE feedback_type = 'daily_reflection'`,
            []
          ),
          dbSelect<UserFeedbackRow>(
            'SELECT * FROM user_feedback ORDER BY created_at DESC LIMIT 100',
            []
          ),
        ]);
        if (cancelled) return;
        setFeedbackTotal(Number(totalRow[0]?.c ?? 0));
        setFeedbackTopPage(
          topPageRows[0]?.page_name != null && topPageRows[0].page_name !== ''
            ? topPageRows[0].page_name
            : '—'
        );
        setFeedbackDailyCount(Number(dailyRow[0]?.c ?? 0));
        setFeedbackRows(rows);
        setFeedbackTabLoaded(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setFeedbackTotal(0);
          setFeedbackTopPage('—');
          setFeedbackDailyCount(0);
          setFeedbackRows([]);
          setFeedbackTabLoaded(true);
        }
      } finally {
        if (!cancelled) setFeedbackTabLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminTab, loading]);

  useEffect(() => {
    if (adminTab !== 'activity' || loading) return;
    void refreshActivityAudit();
  }, [adminTab, loading, refreshActivityAudit]);

  const handleExportFeedbackCsv = async () => {
    const all = await dbSelect<UserFeedbackRow>(
      'SELECT * FROM user_feedback ORDER BY created_at DESC',
      []
    );
    const header = ['date', 'page', 'type', 'feedback', 'session_date'];
    const lines = [
      header.join(','),
      ...all.map((row) =>
        [
          row.created_at ?? '',
          row.page_name ?? '',
          row.feedback_type ?? '',
          row.feedback_text ?? '',
          row.session_date ?? '',
        ]
          .map((v) => csvEscapeCell(String(v)))
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coach_bot_feedback_${localCalendarDateYyyyMmDd()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadBackupData = async () => {
    const [summary, rows] = await Promise.all([
      getLastBackup(),
      dbSelect<{
        backup_path: string | null;
        timestamp: string | null;
        success: number;
        error_message: string | null;
      }>(
        `SELECT backup_path, timestamp, success, error_message
         FROM backup_log
         ORDER BY timestamp DESC
         LIMIT 10`,
        []
      ),
    ]);
    setBackupStatus(summary);
    setBackupRows(rows);
  };

  useEffect(() => {
    loadBackupData().catch((err) => {
      console.error('Failed to load backup data:', err);
      setBackupMessage('Failed to load backup status');
    });
  }, []);

  const handleBackupNow = async () => {
    setBackupRunning(true);
    setBackupMessage('Creating backup...');
    const result = await createBackup();
    await loadBackupData();
    setBackupMessage(result.success ? 'Backup created successfully.' : 'Backup failed.');
    setBackupRunning(false);
  };

  const handleRunCompletenessAudit = async () => {
    setCompletenessAuditLoading(true);
    setCompletenessAuditError(null);
    try {
      type RawCompletenessRow = {
        name: string;
        inferred_stage: string | null;
        outcome_bucket: string | null;
        one_year_vision: string | null;
        dangers: string | null;
        opportunities: string | null;
        strengths: string | null;
        skills: string | null;
        natural_d: number | null;
        natural_i: number | null;
        natural_s: number | null;
        natural_c: number | null;
        email: string | null;
        last_contact_date: string | null;
        real_session_count: number | null;
      };

      const rawRows = await dbSelect<RawCompletenessRow>(
        `SELECT
          c.name,
          c.inferred_stage,
          c.outcome_bucket,
          y.one_year_vision,
          y.dangers,
          y.opportunities,
          y.strengths,
          y.skills,
          dp.natural_d,
          dp.natural_i,
          dp.natural_s,
          dp.natural_c,
          c.email,
          c.last_contact_date,
          (
            SELECT COUNT(*)
            FROM coaching_sessions cs
            WHERE cs.client_id = c.id
              AND cs.notes IS NOT NULL
              AND TRIM(cs.notes) != ''
              AND cs.notes NOT LIKE '%John Doe%'
              AND LENGTH(cs.notes) > 20
          ) AS real_session_count
        FROM clients c
        LEFT JOIN client_you2_profiles y ON c.id = y.client_id
        LEFT JOIN client_disc_profiles dp ON c.id = dp.client_id
        WHERE c.outcome_bucket != 'inactive'
        ORDER BY c.outcome_bucket, c.name`,
        []
      );

      const rows: CompletenessAuditRow[] = rawRows.map((r) => {
        const vision = you2FieldStatus(r.one_year_vision);
        const dangers = you2FieldStatus(r.dangers);
        const opportunities = you2FieldStatus(r.opportunities);
        const strengths = you2FieldStatus(r.strengths);
        const skills = you2FieldStatus(r.skills);
        const disc = discColumnStatus({
          natural_d: r.natural_d,
          natural_i: r.natural_i,
          natural_s: r.natural_s,
          natural_c: r.natural_c,
        });
        const realCount = Number(r.real_session_count ?? 0);
        const sessions = sessionsColumnStatus(realCount);
        const contact = contactColumnStatus(r.email);
        const lastContact = lastContactColumnStatus(r.last_contact_date);
        const ragReady =
          vision === 'OK' &&
          dangers === 'OK' &&
          opportunities === 'OK' &&
          strengths === 'OK' &&
          disc === 'OK' &&
          realCount >= 1;

        return {
          name: r.name,
          inferred_stage: r.inferred_stage,
          outcome_bucket: r.outcome_bucket,
          vision,
          dangers,
          opportunities,
          strengths,
          skills,
          disc,
          sessions,
          contact,
          lastContact,
          ragReady,
        };
      });

      setCompletenessAuditRows(rows);
    } catch (err) {
      console.error(err);
      setCompletenessAuditError(String((err as Error)?.message ?? err ?? 'Audit failed'));
      setCompletenessAuditRows(null);
    } finally {
      setCompletenessAuditLoading(false);
    }
  };

  const handleReExtractSkillsOnly = async () => {
    setSkillsReExtractRunning(true);
    setSkillsReExtractLines([]);
    setSkillsReExtractSummary(null);
    const lines: string[] = [];
    let updatedCount = 0;
    const total = SKILLS_ONLY_REEXTRACT_NAMES.length;

    const flushLines = () => setSkillsReExtractLines([...lines]);

    try {
      let you2BasePrompt = '';
      try {
        you2BasePrompt = await invoke<string>('read_prompt_file', {
          name: 'you2_extraction',
        });
      } catch {
        you2BasePrompt = '';
      }

      for (const name of SKILLS_ONLY_REEXTRACT_NAMES) {
        const clientRows = await dbSelect<{ id: string }>(
          `SELECT id FROM clients WHERE name = $1 LIMIT 1`,
          [name]
        );
        const clientId = clientRows[0]?.id;
        if (!clientId) {
          lines.push(`Processing ${name}... done`);
          flushLines();
          await logEntry(
            'you2_skills_reextract',
            null,
            name,
            null,
            'Skipped: client not found by name',
            'n/a'
          );
          continue;
        }

        const docRows = await dbSelect<{ file_path: string; file_name: string }>(
          `SELECT file_path, file_name FROM document_extractions
           WHERE client_id = $1 AND document_type = 'you2'
           ORDER BY
             CASE WHEN LOWER(file_path) LIKE '%.pdf' THEN 0 ELSE 1 END,
             extraction_date DESC
           LIMIT 1`,
          [clientId]
        );
        const filePath = docRows[0]?.file_path;
        const fileName = docRows[0]?.file_name ?? '';
        if (!filePath || !filePath.toLowerCase().endsWith('.pdf')) {
          lines.push(`Processing ${name}... done`);
          flushLines();
          await logEntry(
            'you2_skills_reextract',
            clientId,
            filePath ?? '',
            fileName || null,
            `Skipped: no You 2.0 PDF in document_extractions (file_name=${fileName || 'none'})`,
            'n/a'
          );
          continue;
        }

        let workingText = '';
        try {
          const pageResult = await invoke<{
            text: string;
            success: boolean;
            error?: string;
          }>('extract_pdf_pages', {
            filePath,
            pageNumbers: [1, 2, 3, 4, 5],
          });
          if (!pageResult.success) {
            throw new Error(pageResult.error ?? 'PDF extraction failed');
          }
          workingText = pageResult.text;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          lines.push(`Processing ${name}... done`);
          flushLines();
          await logEntry(
            'you2_skills_reextract',
            clientId,
            filePath,
            null,
            `Failed: could not read PDF — ${msg}`,
            'n/a'
          );
          continue;
        }

        const skillsInstruction = `${you2BasePrompt}

---

SKILLS-ONLY RE-EXTRACTION: From the document text below, extract only transferable / key skills (TUMAY Question 6 and related skill headings). Return ONLY valid JSON with this exact shape. No markdown, no explanation, no other keys:
{"skills":["string"]}

Document text:
${workingText}`;

        let skills: string[] | null = null;
        try {
          const rawResponse = await invoke<string>('ollama_generate', {
            prompt: skillsInstruction,
            system:
              'You are a document data extractor. Return only valid JSON. No markdown. No explanation.',
            model: SKILLS_ONLY_OLLAMA_MODEL,
          });
          skills = parseSkillsOnlyResponse(rawResponse);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          lines.push(`Processing ${name}... done`);
          flushLines();
          await logEntry(
            'you2_skills_reextract',
            clientId,
            filePath,
            null,
            `Failed: Ollama — ${msg}`,
            SKILLS_ONLY_OLLAMA_MODEL
          );
          continue;
        }

        if (!skills) {
          lines.push(`Processing ${name}... done`);
          flushLines();
          await logEntry(
            'you2_skills_reextract',
            clientId,
            filePath,
            null,
            'Failed: could not parse skills JSON from model response',
            SKILLS_ONLY_OLLAMA_MODEL
          );
          continue;
        }

        const { rowsAffected } = await dbExecute(
          `UPDATE client_you2_profiles
           SET skills = $1, updated_at = CURRENT_TIMESTAMP
           WHERE client_id = $2`,
          [JSON.stringify(skills), clientId]
        );

        if (rowsAffected > 0) {
          updatedCount += 1;
        }

        lines.push(`Processing ${name}... done`);
        flushLines();
        await logEntry(
          'you2_skills_reextract',
          clientId,
          filePath,
          JSON.stringify(skills),
          rowsAffected > 0
            ? `Updated skills only (${skills.length} items) for ${name}`
            : `No client_you2_profiles row updated for ${name}`,
          SKILLS_ONLY_OLLAMA_MODEL
        );
      }

      setSkillsReExtractSummary(
        `Re-extraction complete: ${updatedCount} of ${total} updated`
      );
    } catch (err) {
      setSkillsReExtractSummary(
        `Re-extraction failed: ${String((err as Error)?.message ?? err)}`
      );
    } finally {
      setSkillsReExtractRunning(false);
    }
  };

  const handleBulkImport = async () => {
    setImportRunning(true);
    setImportProgress(null);
    setImportResult(null);
    try {
      const appDir = await invoke<string>('get_app_dir');
      const watcherPath = `${appDir.replace(/[/\\]+$/, '')}/client-files`;
      const basePath = `${appDir.replace(/[/\\]+$/, '')}/clients`;
      console.log('[admin] file watcher absolute path:', watcherPath);
      console.log('[admin] extraction base path:', basePath);
      const result = await bulkImportFolder(basePath, (p) => setImportProgress(p));
      setImportResult(result);
      const rawClients = await getAllClients();
      setClients(rawClients.map((client) => clientToDisplay(client)));
      await refreshActivityAudit();
      setValidateReadyCount(await fetchValidateReadyCount());
    } catch (err) {
      setImportResult({
        processed: 0,
        failed: 0,
        skipped: 0,
        clients_created: 0,
        errors: [err instanceof Error ? err.message : String(err)],
        failedFiles: [],
        clientSummaries: []
      });
    } finally {
      setImportRunning(false);
      setImportProgress(null);
    }
  };

  const handleRetryFailed = async () => {
    setImportRunning(true);
    setImportProgress(null);
    setImportResult(null);
    try {
      const result = await bulkImportRetryFailed((p) => setImportProgress(p));
      setImportResult(result);
      const rawClients = await getAllClients();
      setClients(rawClients.map((client) => clientToDisplay(client)));
      await refreshActivityAudit();
      setValidateReadyCount(await fetchValidateReadyCount());
    } catch (err) {
      setImportResult({
        processed: 0,
        failed: 0,
        skipped: 0,
        clients_created: 0,
        errors: [err instanceof Error ? err.message : String(err)],
        failedFiles: [],
        clientSummaries: []
      });
    } finally {
      setImportRunning(false);
      setImportProgress(null);
    }
  };

  const handleReExtractYou2AndTumay = async () => {
    setReExtractRunning(true);
    setReExtractResult(null);
    const BASE =
      'C:\\Users\\zumah\\SandiBot\\clients';
    const BUCKETS: Record<string, string> = {
      active: 'Active',
      converted: 'WIN',
      paused: 'Paused',
    };
    let you2_success = 0;
    let tumay_success = 0;
    const errors: string[] = [];

    try {
      const allClients = await dbSelect<{
        id: string;
        name: string;
        outcome_bucket: string;
      }>(
        `SELECT id, name, outcome_bucket
         FROM clients ORDER BY name`,
        []
      );

      for (const client of allClients) {
        const bucket = BUCKETS[client.outcome_bucket] ?? 'Active';
        const folderName =
          client.name.replace(/\s+/g, '_');
        const searchPaths = [
          `${BASE}\\${bucket}\\${folderName}`,
          `${BASE}\\${bucket}`,
        ];

        let you2Done = false;
        let tumayDone = false;

        for (const searchPath of searchPaths) {
          let files: string[] = [];
          try {
            files = await invoke<string[]>(
              'list_directory',
              { path: searchPath }
            );
          } catch (e) {
            errors.push(
              `[You2/TUMAY] list_directory failed for ${searchPath}: ${String(e)}`
            );
            continue;
          }

          const clientFiles = files.filter((f) => {
            const fname =
              f.split('\\').pop() ??
              f.split('/').pop() ??
              '';
            const normalizedName =
              client.name.toLowerCase().trim();
            const normalizedFileName =
              fname.toLowerCase().trim();
            const normalizedPath = f.toLowerCase();
            return (
              normalizedFileName.startsWith(
                normalizedName
              ) || normalizedPath.includes(normalizedName)
            );
          });

          for (const filePath of clientFiles) {
            const bulkBase =
              filePath.split(/[/\\]/).pop() ??
              filePath;
            if (isVisionStatementOutputFileName(bulkBase)) {
              console.log(
                'Skipping Vision Statement file — not a source document:',
                bulkBase
              );
              continue;
            }
            if (isOfficeDocExcludedExtension(filePath)) {
              continue;
            }

            const lower = filePath.toLowerCase();

            if (
              !you2Done &&
              looksLikeYou2PdfPath(lower)
            ) {
              const res = await extractYou2Profile(
                client.id,
                '',
                bulkBase,
                filePath
              );
              if (res.success) {
                you2_success++;
                you2Done = true;
              } else {
                errors.push(
                  `You2 failed: ${client.name} — ${res.error ?? 'unknown'}`
                );
              }
            }

            if (
              !tumayDone &&
              lower.includes('tumay') &&
              lower.endsWith('.pdf')
            ) {
              const r = await processDocument(
                client.id,
                'tumay' as DocumentType,
                '',
                bulkBase,
                filePath
              );
              if (r.success) {
                tumay_success++;
                tumayDone = true;
              } else {
                errors.push(
                  `TUMAY failed: ${client.name}`
                );
              }
            }
          }
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        );
      }

      setReExtractResult({
        you2_success,
        tumay_success,
        errors,
      });
    } catch (err) {
      setReExtractResult({
        you2_success: 0,
        tumay_success: 0,
        errors: [String(err)],
      });
    } finally {
      setReExtractRunning(false);
    }
  };

  const handleReExtractFathom = async () => {
    setFathomReExtractRunning(true);
    setFathomReExtractResult(null);
    try {
      const result = await bulkReExtractFathomSessions();
      setFathomReExtractResult(result);
    } catch (err) {
      setFathomReExtractResult({
        success: 0,
        failed: 0,
        errors: [String(err)],
      });
    } finally {
      setFathomReExtractRunning(false);
    }
  };

  const handleActivityRollback = async (row: ActivityAuditRow) => {
    const clientId = row.entity_id;
    if (!clientId) return;
    const t = (row.action_type ?? '').toLowerCase();
    setRollbackLoadingId(row.id);
    try {
      if (
        t === 'stage_move' ||
        t === 'stage_moved' ||
        t === 'stage_transition'
      ) {
        const fromStage = parseStageMoveFromStageRow(row);
        if (fromStage == null || fromStage === '') {
          throw new Error('Missing prior stage');
        }
        await dbExecute(
          `UPDATE clients SET inferred_stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [String(fromStage), String(clientId)]
        );
        await logEntry(
          'stage_move_rollback',
          String(clientId),
          row.output_data,
          String(fromStage),
          null,
          'deterministic'
        );
      } else if (t === 'client_inactivated' || t === 'inactivate') {
        await dbExecute(
          `UPDATE clients SET outcome_bucket = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [String(clientId)]
        );
        await logEntry(
          'reactivate',
          String(clientId),
          null,
          'active',
          null,
          'deterministic'
        );
      } else if (t === 'pink_flag_resolved' || t === 'flag_resolved') {
        const flagName = String(row.input_data ?? '').trim();
        if (!flagName) throw new Error('Missing flag');
        const pfRows = await dbSelect<{ pink_flags: string | null }>(
          `SELECT pink_flags FROM clients WHERE id = $1`,
          [String(clientId)]
        );
        const raw = pfRows[0]?.pink_flags ?? '[]';
        let arr: string[];
        try {
          arr = JSON.parse(raw) as string[];
        } catch {
          arr = [];
        }
        const resolvedPrefix = `resolved:${flagName}`;
        const next = arr.map((f) =>
          f === resolvedPrefix ? flagName : f
        );
        await dbExecute(
          `UPDATE clients SET pink_flags = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [JSON.stringify(next), String(clientId)]
        );
        await logEntry(
          'flag_reopened',
          String(clientId),
          flagName,
          null,
          null,
          'deterministic'
        );
      } else {
        return;
      }
      toast.success('✓ Action rolled back', {
        style: { background: '#3BBFBF', color: 'white' },
      });
      await refreshActivityAudit();
    } catch (e) {
      console.error('rollback failed:', e);
    } finally {
      setRollbackLoadingId(null);
    }
  };

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

  const comingSoonBadge = (
    <span
      className="inline-block mt-3"
      style={{
        background: '#F4F7F8',
        border: '1px solid #C8E8E5',
        color: '#7A8F95',
        borderRadius: 20,
        padding: '4px 12px',
        fontSize: 11,
      }}
    >
      Coming in next update
    </span>
  );

  const knowledgeDomainsCovered = KNOWLEDGE_DOMAINS.filter(
    (d) => (knowledgeDomainCounts[d.domain] ?? 0) >= 1
  ).length;
  const knowledgeHealthPct = Math.round((knowledgeDomainsCovered / 8) * 100);
  const knowledgeModalMeta = knowledgeModalDomain
    ? KNOWLEDGE_DOMAINS.find((x) => x.domain === knowledgeModalDomain)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Layers
          className="shrink-0"
          aria-hidden
          style={{ color: '#3BBFBF', width: 24, height: 24 }}
        />
        <div>
          <h1 className="font-bold" style={{ color: '#2D4459', fontSize: 24 }}>
            The Capture
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed" style={{ color: '#7A8F95' }}>
            Your coaching intelligence grows here. Everything you add makes Coach Bot smarter.
          </p>
        </div>
      </div>

      {/* SECTION 1 — My Identity */}
      <div
        className="bg-white"
        style={{
          borderRadius: 12,
          border: '1px solid #C8E8E5',
          borderLeftWidth: 4,
          borderLeftColor: '#3BBFBF',
          padding: '24px 28px',
          marginBottom: 16,
        }}
      >
        <div className="flex items-start gap-3">
          <User className="shrink-0" style={{ color: '#3BBFBF', width: 20, height: 20 }} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-bold" style={{ color: '#2D4459', fontSize: 16 }}>
              My Identity
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: '#7A8F95' }}>
              Who you are as a coach. Used to personalize every response Coach Bot generates.
            </p>
            <p className="mt-3 text-[13px] italic leading-relaxed" style={{ color: '#7A8F95' }}>
              Upload your resume and coaching philosophy to help Coach Bot speak in your voice.
            </p>
            {comingSoonBadge}
          </div>
        </div>
      </div>

      {/* SECTION 2 — My Knowledge */}
      <div
        className="bg-white"
        style={{
          borderRadius: 12,
          border: '1px solid #C8E8E5',
          borderLeftWidth: 4,
          borderLeftColor: '#F05F57',
          padding: '24px 28px',
          marginBottom: 16,
        }}
      >
        <div className="flex items-start gap-3">
          <BookOpen className="shrink-0" style={{ color: '#F05F57', width: 20, height: 20 }} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-bold" style={{ color: '#2D4459', fontSize: 16 }}>
              My Knowledge
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: '#7A8F95' }}>
              Coaching frameworks, TES methodology, franchise guides, and resources you use. Coach Bot learns
              from these.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p
              className="font-semibold uppercase tracking-wide"
              style={{ color: '#7A8F95', fontSize: 11 }}
            >
              Knowledge Base Health
            </p>
            <p className="mt-1 font-bold leading-tight" style={{ color: '#2D4459', fontSize: 32 }}>
              {knowledgeHealthPct}%
            </p>
            <p className="mt-1 text-[13px]" style={{ color: '#7A8F95' }}>
              {knowledgeDomainsCovered} of 8 domains covered
            </p>
            <p className="mt-3 max-w-md text-[12px] italic leading-relaxed" style={{ color: '#7A8F95' }}>
              {knowledgeHealthMotivation(knowledgeHealthPct)}
            </p>
          </div>
          <div className="shrink-0 pt-1">
            <div
              className="overflow-hidden"
              style={{
                width: 200,
                height: 8,
                borderRadius: 4,
                background: '#F4F7F8',
              }}
            >
              <div
                style={{
                  width: `${knowledgeHealthPct}%`,
                  height: '100%',
                  borderRadius: 4,
                  background: '#3BBFBF',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="mt-4 grid grid-cols-1 md:grid-cols-2"
          style={{ gap: 12, marginTop: 16 }}
        >
          {KNOWLEDGE_DOMAINS.map((d) => {
            const count = knowledgeDomainCounts[d.domain] ?? 0;
            const Icon = d.Icon;
            const showUploadBtn = count === 0 || knowledgeCardHover === d.domain;
            let coverageSymbol = '○';
            let coverageLabel = 'Not started';
            let coverageColor = '#C8E8E5';
            if (count >= 3) {
              coverageSymbol = '●';
              coverageLabel = `${count} documents — well covered`;
              coverageColor = '#3BBFBF';
            } else if (count >= 1) {
              coverageSymbol = '◑';
              coverageLabel = `${count} document${count === 1 ? '' : 's'} — building`;
              coverageColor = '#F05F57';
            }
            return (
              <div
                key={d.domain}
                role="button"
                tabIndex={0}
                className="cursor-pointer bg-white shadow-none transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                style={{
                  borderRadius: 10,
                  border: '1px solid #C8E8E5',
                  borderLeftWidth: 4,
                  borderLeftColor: d.color,
                  padding: 16,
                }}
                onMouseEnter={() => setKnowledgeCardHover(d.domain)}
                onMouseLeave={() => setKnowledgeCardHover(null)}
                onClick={() => setKnowledgeModalDomain(d.domain)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setKnowledgeModalDomain(d.domain);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="shrink-0" style={{ color: d.color, width: 18, height: 18 }} aria-hidden />
                  <span className="font-bold" style={{ color: '#2D4459', fontSize: 14 }}>
                    {d.domain}
                  </span>
                </div>
                <p
                  className="mt-1 whitespace-pre-line leading-snug"
                  style={{ color: '#7A8F95', fontSize: 11 }}
                >
                  {d.description}
                </p>
                <p className="mt-2 text-[11px]" style={{ color: coverageColor }}>
                  <span aria-hidden>{coverageSymbol}</span> {coverageLabel}
                </p>
                <div style={{ marginTop: 8, minHeight: 28 }}>
                  <button
                    type="button"
                    className="text-[11px] font-medium transition-opacity"
                    style={{
                      visibility: showUploadBtn ? 'visible' : 'hidden',
                      background: 'transparent',
                      border: `1px solid ${d.color}`,
                      color: d.color,
                      borderRadius: 6,
                      padding: '4px 12px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setKnowledgeModalDomain(d.domain);
                    }}
                  >
                    + Upload Documents
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <p className="font-bold" style={{ color: '#2D4459', fontSize: 14 }}>
            Recently Added
          </p>
          {knowledgeRecent.length === 0 ? (
            <p className="mt-2 text-[13px] italic" style={{ color: '#7A8F95' }}>
              No documents uploaded yet. Click any domain to get started.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {knowledgeRecent.map((row) => {
                const displayName = row.file_name ?? row.title;
                let rel = row.created_at;
                try {
                  rel = formatDistanceToNow(new Date(row.created_at), { addSuffix: true });
                } catch {
                  /* keep raw */
                }
                return (
                  <li
                    key={`${row.domain}-${row.created_at}-${displayName}`}
                    className="flex flex-wrap items-center justify-between gap-2 text-[13px]"
                  >
                    <span className="min-w-0 flex-1 font-medium" style={{ color: '#2D4459' }}>
                      <span aria-hidden>📄 </span>
                      {displayName}
                    </span>
                    <span
                      className="shrink-0 rounded-[12px] px-2 py-0.5 text-[11px]"
                      style={{ background: '#F4F7F8', color: '#7A8F95' }}
                    >
                      {row.domain}
                    </span>
                    <span className="shrink-0 text-[11px]" style={{ color: '#7A8F95' }}>
                      {rel}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Dialog
          open={knowledgeModalDomain !== null}
          onOpenChange={(open) => {
            if (!open) setKnowledgeModalDomain(null);
          }}
        >
          <DialogContent
            className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
            style={{ borderColor: '#C8E8E5' }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: '#2D4459' }}>
                {knowledgeModalMeta ? `Upload to ${knowledgeModalMeta.domain}` : 'Upload'}
              </DialogTitle>
              <DialogDescription
                className="whitespace-pre-line text-[13px] leading-relaxed"
                style={{ color: '#7A8F95' }}
              >
                {knowledgeModalMeta?.description ?? ''}
              </DialogDescription>
            </DialogHeader>
            <input
              ref={knowledgeFileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (!files?.length) return;
                void uploadKnowledgePdfFiles(Array.from(files));
                e.target.value = '';
              }}
            />
            <div
              role="button"
              tabIndex={0}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:bg-[#F4F7F8]"
              style={{ borderColor: '#C8E8E5', color: '#7A8F95' }}
              onClick={() => knowledgeFileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  knowledgeFileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const list = e.dataTransfer.files;
                if (list?.length) {
                  void uploadKnowledgePdfFiles(Array.from(list));
                }
              }}
            >
              <p className="text-sm font-medium" style={{ color: '#2D4459' }}>
                Drop PDFs here or click to browse
              </p>
              <p className="mt-1 text-xs" style={{ color: '#7A8F95' }}>
                Supports multiple files
              </p>
            </div>
            {knowledgeModalDocs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7A8F95' }}>
                  Uploaded in this domain
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm" style={{ color: '#2D4459' }}>
                  {knowledgeModalDocs.map((doc) => (
                    <li key={`${doc.created_at}-${doc.title}`} className="truncate">
                      {doc.file_name ?? doc.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setKnowledgeModalDomain(null)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* SECTION 3 — My Clients */}
      <div
        className="bg-white"
        style={{
          borderRadius: 12,
          border: '1px solid #C8E8E5',
          borderLeftWidth: 4,
          borderLeftColor: '#2D4459',
          padding: '24px 28px',
          marginBottom: 16,
        }}
      >
        <div className="flex items-start gap-3">
          <Users className="shrink-0" style={{ color: '#2D4459', width: 20, height: 20 }} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-bold" style={{ color: '#2D4459', fontSize: 16 }}>
              My Clients
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: '#7A8F95' }}>
              Upload client documents here. DISC, You 2.0, TUMAY, and Fathom transcripts populate each client
              card automatically.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleBulkImport} disabled={importRunning}>
              <FolderInput className="h-4 w-4 mr-2" />
              Import All Client Files
            </Button>
            <Button variant="outline" onClick={handleRetryFailed} disabled={importRunning}>
              Retry Failed Only
            </Button>
            <Button
              variant="outline"
              onClick={handleReExtractYou2AndTumay}
              disabled={reExtractRunning || importRunning}
            >
              Re-Extract You 2.0 & TUMAY
            </Button>
            <Button
              variant="outline"
              onClick={handleReExtractFathom}
              disabled={fathomReExtractRunning || importRunning || reExtractRunning}
            >
              Re-Extract Fathom (9-Block)
            </Button>
          </div>
          <div>
            <Button
              variant="secondary"
              onClick={() => void handleRunCompletenessAudit()}
              disabled={completenessAuditLoading || importRunning}
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Run Completeness Audit
            </Button>
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => void handleReExtractSkillsOnly()}
                disabled={skillsReExtractRunning || importRunning || completenessAuditLoading}
              >
                Re-Extract Skills Only
              </Button>
            </div>
            {skillsReExtractRunning && (
              <p className="text-sm text-slate-600 mt-2">Re-extracting skills…</p>
            )}
            {skillsReExtractLines.length > 0 && (
              <div className="mt-2 space-y-1 text-sm text-slate-700 font-mono">
                {skillsReExtractLines.map((line, i) => (
                  <p key={`${line}-${i}`}>{line}</p>
                ))}
              </div>
            )}
            {skillsReExtractSummary && !skillsReExtractRunning && (
              <p className="text-sm text-slate-800 mt-2 font-medium">{skillsReExtractSummary}</p>
            )}
            {completenessAuditLoading && <p className="text-sm text-slate-600 mt-2">Running audit…</p>}
            {completenessAuditError && (
              <p className="text-sm text-red-600 mt-2">{completenessAuditError}</p>
            )}
            {completenessAuditRows !== null && !completenessAuditLoading && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="p-2 font-semibold text-slate-700">Name</th>
                      <th className="p-2 font-semibold text-slate-700">Stage</th>
                      <th className="p-2 font-semibold text-slate-700">Vision</th>
                      <th className="p-2 font-semibold text-slate-700">Dangers</th>
                      <th className="p-2 font-semibold text-slate-700">Opportunities</th>
                      <th className="p-2 font-semibold text-slate-700">Strengths</th>
                      <th className="p-2 font-semibold text-slate-700">Skills</th>
                      <th className="p-2 font-semibold text-slate-700">DISC</th>
                      <th className="p-2 font-semibold text-slate-700">Sessions</th>
                      <th className="p-2 font-semibold text-slate-700">Contact</th>
                      <th className="p-2 font-semibold text-slate-700">Last Contact</th>
                      <th className="p-2 font-semibold text-slate-700">RAG Ready</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completenessAuditRows.map((row, i) => (
                      <tr
                        key={`${row.name}-${i}`}
                        className="border-b border-slate-100"
                        style={{ backgroundColor: auditRowBackground(row) }}
                      >
                        <td className="p-2 text-slate-900">{row.name}</td>
                        <td className="p-2 text-slate-700">{row.inferred_stage ?? '—'}</td>
                        <td className="p-2">
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              completenessStatusTextClass(row.vision)
                            )}
                          >
                            {completenessStatusLabel(row.vision)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              completenessStatusTextClass(row.dangers)
                            )}
                          >
                            {completenessStatusLabel(row.dangers)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              completenessStatusTextClass(row.opportunities)
                            )}
                          >
                            {completenessStatusLabel(row.opportunities)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              completenessStatusTextClass(row.strengths)
                            )}
                          >
                            {completenessStatusLabel(row.strengths)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              completenessStatusTextClass(row.skills)
                            )}
                          >
                            {completenessStatusLabel(row.skills)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              completenessStatusTextClass(row.disc)
                            )}
                          >
                            {completenessStatusLabel(row.disc)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              completenessStatusTextClass(row.sessions)
                            )}
                          >
                            {completenessStatusLabel(row.sessions)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              completenessStatusTextClass(row.contact)
                            )}
                          >
                            {completenessStatusLabel(row.contact)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              completenessStatusTextClass(row.lastContact)
                            )}
                          >
                            {completenessStatusLabel(row.lastContact)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              row.ragReady ? 'text-green-700' : 'text-red-700'
                            )}
                          >
                            {row.ragReady ? '✅ Ready' : '❌ Not Ready'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-100">
                      <td colSpan={12} className="p-3 text-sm font-medium text-slate-800">
                        {completenessAuditRows.filter((r) => r.ragReady).length} of{' '}
                        {completenessAuditRows.length} clients fully complete
                        <br />
                        {completenessAuditRows.length -
                          completenessAuditRows.filter((r) => r.ragReady).length}{' '}
                        clients have gaps
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          {reExtractRunning && <p className="text-sm text-slate-600">Extracting files...</p>}
          {fathomReExtractRunning && <p className="text-sm text-slate-600">Extracting Fathom...</p>}
          {reExtractResult && !reExtractRunning && (
            <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-medium text-slate-800">
                You 2.0: {reExtractResult.you2_success}/17 extracted
              </p>
              <p className="font-medium text-slate-800">
                TUMAY: {reExtractResult.tumay_success}/17 extracted
              </p>
              {reExtractResult.errors.length > 0 && (
                <div>
                  <p className="font-medium text-amber-700">Errors:</p>
                  <ul className="text-sm text-slate-600 list-disc list-inside">
                    {reExtractResult.errors.map((e, i) => (
                      <li key={`${e}-${i}`}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {fathomReExtractResult && !fathomReExtractRunning && (
            <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-medium text-slate-800">
                Fathom: {fathomReExtractResult.success}/
                {fathomReExtractResult.success + fathomReExtractResult.failed} extracted
              </p>
              {fathomReExtractResult.errors.length > 0 && (
                <div>
                  <p className="font-medium text-amber-700">Errors:</p>
                  <ul className="text-sm text-slate-600 list-disc list-inside">
                    {fathomReExtractResult.errors.map((e, i) => (
                      <li key={`${e}-${i}`}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {importRunning && importProgress && (
            <div className="space-y-2">
              <Progress
                value={
                  importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0
                }
                className="h-2"
              />
              <p className="text-sm text-slate-600">
                Processing {importProgress.current_client} — {importProgress.current_file} (
                {importProgress.current} of {importProgress.total} files)
              </p>
            </div>
          )}
          {importResult && !importRunning && (
            <div className="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-medium text-green-700">
                ✓ {importResult.processed} documents processed successfully
                {importResult.skipped > 0 && `, ${importResult.skipped} skipped (already complete)`}
                {importResult.clients_created > 0 && `, ${importResult.clients_created} new clients`}
              </p>
              {importResult.clientSummaries.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-slate-700">Per client:</p>
                  <ul className="text-sm space-y-1">
                    {importResult.clientSummaries.map((s) => {
                      const parts: string[] = [];
                      parts.push(s.succeededTypes.includes('you2') ? 'You2 ✓' : s.missingYou2 ? 'You2 pending' : '');
                      parts.push(s.succeededTypes.includes('disc') ? 'DISC ✓' : s.missingDisc ? 'DISC pending' : '');
                      parts.push(
                        s.succeededTypes.includes('fathom') ? 'Fathom ✓' : s.missingFathom ? 'Fathom pending' : ''
                      );
                      const line = parts.filter(Boolean).join(', ');
                      return (
                        <li key={s.clientId} className="flex items-center gap-2">
                          <span className="font-medium">{s.clientName}:</span>
                          <span className="text-slate-600">{line || '—'}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {importResult.failed > 0 && importResult.failedFiles && importResult.failedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-amber-700">✗ {importResult.failed} documents failed:</p>
                  <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                    {importResult.failedFiles.map((f, i) => (
                      <li key={i}>
                        {f.clientName} — {f.fileName}: {f.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <FeedbackButton pageName="The Capture" />
      <Tabs value={adminTab} onValueChange={setAdminTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="activity">
            <Clock className="h-4 w-4 mr-2" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="resources">
            <BookOpen className="h-4 w-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedback
          </TabsTrigger>
        </TabsList>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <Card className="border-[#C8E8E5]">
            <CardHeader className="pb-2">
              <CardTitle
                className="font-bold"
                style={{ color: '#2D4459', fontSize: 18 }}
              >
                Recent Activity
              </CardTitle>
              <CardDescription
                className="text-[13px] leading-relaxed"
                style={{ color: '#7A8F95' }}
              >
                Last 50 actions. Rollback available for 7 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityAuditRows.map((row) => {
                  const rel = (() => {
                    try {
                      return formatDistanceToNow(new Date(row.created_at), {
                        addSuffix: true,
                      });
                    } catch {
                      return row.created_at;
                    }
                  })();
                  const showRollback =
                    activityAuditRollbackable(row) && row.entity_id;
                  return (
                    <div
                      key={row.id}
                      className="flex items-start gap-3 rounded-lg border border-[#C8E8E5] bg-white p-3"
                    >
                      <span
                        className="shrink-0 text-xl leading-none pt-0.5"
                        aria-hidden
                      >
                        {activityAuditIcon(row.action_type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-bold"
                          style={{ color: '#2D4459', fontSize: 14 }}
                        >
                          {activityAuditTitle(row)}
                        </p>
                        {row.client_name ? (
                          <p className="text-sm" style={{ color: '#7A8F95' }}>
                            {row.client_name}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs" style={{ color: '#7A8F95' }}>
                          {rel}
                        </p>
                      </div>
                      {showRollback ? (
                        <button
                          type="button"
                          disabled={rollbackLoadingId === row.id}
                          className="shrink-0 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{
                            background: 'white',
                            border: '1px solid #F05F57',
                            color: '#F05F57',
                            borderRadius: 6,
                            padding: '4px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                          onClick={() => void handleActivityRollback(row)}
                        >
                          {rollbackLoadingId === row.id
                            ? 'Rolling back…'
                            : 'Rollback'}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                {activityAuditRows.length === 0 && (
                  <div
                    className="flex flex-col items-center justify-center py-12 text-center"
                    style={{ color: '#7A8F95', fontSize: 13 }}
                  >
                    <Clock className="mb-3 h-10 w-10 opacity-40" aria-hidden />
                    <p>
                      No activity yet.
                      <br />
                      Actions you take in Coach Bot will appear here.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Activity Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Monday', calls: 2, emails: 4 },
                    { label: 'Tuesday', calls: 3, emails: 3 },
                    { label: 'Wednesday', calls: 1, emails: 5 },
                    { label: 'Thursday', calls: 4, emails: 3 },
                    { label: 'Friday', calls: 2, emails: 4 },
                  ].map((day) => (
                    <div key={day.label} className="flex items-center gap-4">
                      <span className="text-sm w-20">{day.label}</span>
                      <div className="flex-1 flex gap-1">
                        <div 
                          className="h-6 bg-blue-500 rounded-l-md flex items-center justify-center text-xs text-white"
                          style={{ width: `${day.calls * 10}%` }}
                        >
                          {day.calls > 2 && `${day.calls} calls`}
                        </div>
                        <div 
                          className="h-6 bg-green-500 rounded-r-md flex items-center justify-center text-xs text-white"
                          style={{ width: `${day.emails * 5}%` }}
                        >
                          {day.emails > 4 && `${day.emails} emails`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 mt-6">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-slate-600">Calls</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm text-slate-600">Emails</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Engagement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Engaged Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getRankedClients(clients)
                    .slice(0, 5)
                    .map((client, index) => (
                      <div key={client.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                        <span className="text-lg font-bold text-slate-400 w-6">#{index + 1}</span>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {client.avatar}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{client.name}</p>
                          <p className="text-xs text-slate-500">{client.stage}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{client.confidence}%</p>
                          <p className="text-xs text-slate-500">confidence</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <Database className="h-5 w-5 shrink-0 text-slate-500" />
                      <div className="min-w-0">
                        <span className="text-slate-800 font-medium">Knowledge Graph</span>
                        <p className="text-xs text-slate-500 mt-0.5">Neo4j graph — available Month 3</p>
                      </div>
                    </div>
                    <Badge className="shrink-0 bg-slate-300 text-slate-800 hover:bg-slate-300 border-0">
                      Coming Soon
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <Activity className="h-5 w-5 shrink-0 text-slate-500" />
                      <div className="min-w-0">
                        <span className="text-slate-800 font-medium">AI Recommendations</span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Full recommendation engine — Month 2
                        </p>
                      </div>
                    </div>
                    <Badge className="shrink-0 bg-slate-300 text-slate-800 hover:bg-slate-300 border-0">
                      Coming Soon
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span className="text-green-900">Security</span>
                    </div>
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Secure
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                    <p className="text-3xl font-bold text-blue-600">{clients.length}</p>
                    <p className="text-sm text-blue-700">Total Clients</p>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {validateReadyCount}
                    </p>
                    <p className="text-sm text-green-700">VALIDATE Ready</p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 text-center">
                    <p className="text-3xl font-bold text-purple-600">
                      {getAverageConfidence(clients)}%
                    </p>
                    <p className="text-sm text-purple-700">Avg. Confidence</p>
                  </div>
                  <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-center">
                    <p className="text-3xl font-bold text-orange-600">
                      {getSupportiveSpouseClients(clients).length}
                    </p>
                    <p className="text-sm text-orange-700">Spouse Aligned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CLEAR Framework */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  CLEAR Coaching Framework
                </CardTitle>
                <CardDescription>The 5-step coaching methodology</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="font-semibold text-blue-900">C - Curiosity</p>
                  <p className="text-sm text-blue-700">{knowledgeGraph.clearFramework.curiosity.description}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="font-semibold text-green-900">L - Locating</p>
                  <p className="text-sm text-green-700">{knowledgeGraph.clearFramework.locating.description}</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                  <p className="font-semibold text-yellow-900">E - Engagement</p>
                  <p className="text-sm text-yellow-700">{knowledgeGraph.clearFramework.engagement.description}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <p className="font-semibold text-purple-900">A - Accountability</p>
                  <p className="text-sm text-purple-700">{knowledgeGraph.clearFramework.accountability.description}</p>
                </div>
                <div className="p-3 rounded-lg bg-pink-50 border border-pink-100">
                  <p className="font-semibold text-pink-900">R - Reflection</p>
                  <p className="text-sm text-pink-700">{knowledgeGraph.clearFramework.reflection.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Client Experience Stages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  5-Compartment Journey
                </CardTitle>
                <CardDescription>Client Experience coaching framework</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {knowledgeGraph.clientExperience.stages.map((stage) => (
                  <div key={stage.name} className="p-3 rounded-lg border" style={{ borderColor: stage.color, backgroundColor: `${stage.color}30` }}>
                    <p className="font-semibold text-slate-900">{stage.name}</p>
                    <p className="text-sm text-slate-600">{stage.objective}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Coaching Strategies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Coaching Strategies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-green-700 mb-2">DO:</p>
                    <ul className="space-y-1">
                      {knowledgeGraph.coachingStrategies.do.slice(0, 5).map((item, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4">
                    <p className="font-semibold text-red-700 mb-2">DON'T:</p>
                    <ul className="space-y-1">
                      {knowledgeGraph.coachingStrategies.dont.map((item, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Outlines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Outlines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(knowledgeGraph.sessionOutlines).map(([key, session]) => (
                  <div key={key} className="p-3 rounded-lg bg-slate-50">
                    <p className="font-semibold text-slate-900">{session.name}</p>
                    <p className="text-xs text-slate-500">
                      {session.during.length} key activities
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Diagnostic Tools — Developer Only */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Diagnostic Tools — Developer Only
                </CardTitle>
                <CardDescription>Test extraction on specific files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const path = 'C:\\Users\\zumah\\SandiBot\\clients\\Active\\Dena_Sauer\\Dena Sauer - ttsi.pdf';
                      setTestDiscOutput('Running...');
                      try {
                        const text = await invoke<string>('debug_disc_pages', { filePath: path });
                        console.log('=== DEBUG DISC PAGES 23-25 ===', text);
                        setTestDiscOutput(text);
                      } catch (e) {
                        const errMsg = e instanceof Error ? e.message : String(e);
                        setTestDiscOutput(`Error: ${errMsg}`);
                      }
                    }}
                  >
                    Debug DISC Pages
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const path = 'C:\\Users\\zumah\\SandiBot\\clients\\Active\\Jeff_Dayton\\Jeff Dayton - ttsi.pdf';
                      setTestDiscOutput('Running...');
                      try {
                        const result = await invoke<{
                          success: boolean;
                          format: string;
                          error: string | null;
                          text_length: number;
                          text_preview: string;
                          scores: Record<string, unknown> | null;
                          file_path: string;
                          page_numbers: number[];
                        }>('test_disc_extraction', { filePath: path });
                        setTestDiscOutput(JSON.stringify(result, null, 2));
                      } catch (e) {
                        const errMsg = e instanceof Error ? e.message : String(e);
                        setTestDiscOutput(`Error: ${errMsg}`);
                      }
                    }}
                  >
                    Test DISC (Jeff Dayton)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const path = 'C:\\Users\\zumah\\SandiBot\\clients\\Active\\Andrew_Tait\\Andrew Tait - ttsi.pdf';
                      setTestDiscOutput('Running...');
                      try {
                        const result = await invoke<{
                          success: boolean;
                          format: string;
                          error: string | null;
                          text_length: number;
                          text_preview: string;
                          scores: Record<string, unknown> | null;
                          file_path: string;
                          page_numbers: number[];
                        }>('test_disc_extraction', { filePath: path });
                        setTestDiscOutput(JSON.stringify(result, null, 2));
                      } catch (e) {
                        const errMsg = e instanceof Error ? e.message : String(e);
                        setTestDiscOutput(`Error: ${errMsg}`);
                      }
                    }}
                  >
                    Test DISC (Andrew Tait)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const path = 'C:\\Users\\zumah\\SandiBot\\clients\\Active\\Vito_Sciscioli\\Vito Sciscioli - You2.pdf';
                      setTestDiscOutput('Running...');
                      try {
                        const result = await invoke<{
                          vision: string;
                          top_3_dangers: Array<{ danger: string; goal: string }>;
                          top_3_strengths: Array<{ strength: string; goal: string }>;
                          top_3_opportunities: Array<{ opportunity: string; goal: string }>;
                          success: boolean;
                          error: string | null;
                        }>('test_you2_extraction', { filePath: path });
                        setTestDiscOutput(JSON.stringify(result, null, 2));
                      } catch (e) {
                        const errMsg = e instanceof Error ? e.message : String(e);
                        setTestDiscOutput(`Error: ${errMsg}`);
                      }
                    }}
                  >
                    Test You2 (Vito Sciscioli)
                  </Button>
                </div>
                {testDiscOutput && (
                  <div className="space-y-2 p-4 rounded-lg bg-slate-100 border border-slate-300">
                    <p className="font-medium text-slate-700">Diagnostic output:</p>
                    <pre className="text-xs overflow-auto max-h-48 p-2 bg-white rounded border border-slate-200">
                      {testDiscOutput}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTestDiscOutput(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>Configure how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-medium">Email Alerts</p>
                    <p className="text-sm text-slate-500">Get notified about important client updates</p>
                  </div>
                  <Switch 
                    checked={notifications.emailAlerts}
                    onCheckedChange={(v) => setNotifications(prev => ({ ...prev, emailAlerts: v }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-slate-500">Browser notifications for real-time updates</p>
                  </div>
                  <Switch 
                    checked={notifications.pushNotifications}
                    onCheckedChange={(v) => setNotifications(prev => ({ ...prev, pushNotifications: v }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-medium">Weekly Reports</p>
                    <p className="text-sm text-slate-500">Receive weekly performance summary</p>
                  </div>
                  <Switch 
                    checked={notifications.weeklyReports}
                    onCheckedChange={(v) => setNotifications(prev => ({ ...prev, weeklyReports: v }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-medium">Client Updates</p>
                    <p className="text-sm text-slate-500">Notifications when clients change stages</p>
                  </div>
                  <Switch 
                    checked={notifications.clientUpdates}
                    onCheckedChange={(v) => setNotifications(prev => ({ ...prev, clientUpdates: v }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>Manage your data and exports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-50">
                  <p className="font-medium mb-2">Export Data</p>
                  <p className="text-sm text-slate-500 mb-3">Download all client data and activity logs</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export JSON
                    </Button>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50">
                  <p className="font-medium mb-2">Backup</p>
                  <p className="text-sm text-slate-500 mb-3">
                    Last backup: {backupStatus.last_backup ? new Date(backupStatus.last_backup).toLocaleString() : 'No backups yet'}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Button variant="outline" size="sm" onClick={handleBackupNow} disabled={backupRunning}>
                      {backupRunning ? 'Backing up...' : 'Backup Now'}
                    </Button>
                    {backupMessage && (
                      <span className={cn('text-xs', backupMessage.includes('failed') ? 'text-red-600' : 'text-green-600')}>
                        {backupMessage}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Recent backups</p>
                    {backupRows.length === 0 ? (
                      <p className="text-xs text-slate-500">No backups recorded yet.</p>
                    ) : (
                      backupRows.map((row, index) => (
                        <div key={`${row.timestamp ?? 'backup'}-${index}`} className="text-xs p-2 rounded border border-slate-200 bg-white">
                          <p className="text-slate-700">
                            {row.timestamp ? new Date(row.timestamp).toLocaleString() : 'Unknown time'}
                          </p>
                          <p className={row.success === 1 ? 'text-green-600' : 'text-red-600'}>
                            {row.success === 1 ? 'Success' : `Failed${row.error_message ? `: ${row.error_message}` : ''}`}
                          </p>
                          <p className="text-slate-500 truncate">{row.backup_path || 'No path recorded'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-xl font-bold">
                    SS
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Sandy Stahl</p>
                    <p className="text-sm text-slate-500">Franchise Coach</p>
                    <p className="text-sm text-slate-500">your coaching methodology</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About Coach Bot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-slate-600">
                  <p><strong>Version:</strong> 2.0.0</p>
                  <p><strong>Last Updated:</strong> March 2026</p>
                  <p><strong>Features:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>6-Module Coaching Dashboard</li>
                    <li>CLEAR Framework Integration</li>
                    <li>5-Compartment Client Journey</li>
                    <li>AI-Powered Recommendations</li>
                    <li>DISC Profile Analysis</li>
                    <li>You 2.0 & TUMAY Integration</li>
                    <li>Vision Statement Generator</li>
                    <li>Pink Flag Detection</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          {feedbackTabLoading && !feedbackTabLoaded ? (
            <div className="space-y-4 py-8">
              <SkeletonCard lines={2} lineHeight={16} />
              <SkeletonCard lines={4} lineHeight={14} />
            </div>
          ) : feedbackTabLoaded && feedbackTotal === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <MessageSquare className="h-14 w-14 mb-4 opacity-30" />
              <p className="text-base max-w-md">
                No feedback collected yet.
                <br />
                Feedback from every page will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total feedback items"
                  value={feedbackTotal}
                  icon={MessageSquare}
                  color="#6366F1"
                />
                <StatCard
                  title="Most active page"
                  value={feedbackTopPage}
                  icon={Target}
                  color="#8B5CF6"
                />
                <StatCard
                  title="Daily reflections"
                  value={feedbackDailyCount}
                  icon={Heart}
                  color="#A855F7"
                />
              </div>

              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-lg">All Feedback</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleExportFeedbackCsv()}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export to CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead className="w-[140px]">Type</TableHead>
                        <TableHead>Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbackRows.map((row) => {
                        const full = (row.feedback_text ?? '').trim();
                        const truncated = truncateFeedbackText(row.feedback_text, 80);
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap text-slate-600">
                              {formatFeedbackTableDate(row.created_at)}
                            </TableCell>
                            <TableCell className="text-slate-800">{row.page_name}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn('text-xs font-normal', feedbackTypeBadgeClass(row.feedback_type))}
                              >
                                {row.feedback_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <span
                                className="block truncate text-slate-700"
                                title={full.length > 80 ? full : undefined}
                              >
                                {truncated || '—'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card
        className="border-[#C8E8E5]"
        style={{ borderColor: '#C8E8E5', borderWidth: 1 }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-bold" style={{ color: '#2D4459', fontSize: 16 }}>
            UAT Report
          </CardTitle>
          <CardDescription className="text-[13px] leading-relaxed" style={{ color: '#7A8F95' }}>
            Export all feedback and audit logs from Sandi&apos;s UAT session. Share this file with Zubia after
            using Coach Bot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            disabled={uatReportExporting}
            onClick={() => void handleExportUatReport()}
            className="border-0 font-bold text-white hover:opacity-90"
            style={{
              background: '#3BBFBF',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            {uatReportExporting ? 'Exporting…' : 'Export UAT Report'}
          </Button>
          <div className="space-y-1 text-[13px] leading-relaxed" style={{ color: '#7A8F95' }}>
            {uatSummary != null && uatSummary.total === 0 ? (
              <p className="italic">
                No feedback collected yet. Use the Feedback button on each page to share what you notice.
              </p>
            ) : uatSummary != null ? (
              <>
                <p>Total feedback entries: {uatSummary.total}</p>
                <p>
                  Average rating:{' '}
                  {uatSummary.avg_rating != null
                    ? `${uatSummary.avg_rating.toFixed(1)} / 5`
                    : '— / 5'}
                </p>
                <p>Working well: {uatSummary.working_count} responses</p>
                <p>Confusing: {uatSummary.confusing_count} responses</p>
                <p>Missing something: {uatSummary.missing_count} responses</p>
              </>
            ) : (
              <p className="italic">Loading summary…</p>
            )}
          </div>
        </CardContent>
      </Card>

      {uatReportToast ? (
        <div
          role="status"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[1000] max-w-[min(520px,92vw)] -translate-x-1/2 rounded-lg px-4 py-3 text-center text-[13px] font-medium text-white shadow-lg"
          style={{
            backgroundColor: uatReportToast.kind === 'success' ? '#3BBFBF' : '#F05F57',
          }}
        >
          {uatReportToast.text}
        </div>
      ) : null}
    </div>
  );
}
