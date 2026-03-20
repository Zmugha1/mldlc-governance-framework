import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Briefcase,
  Mail,
  Phone,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  Upload,
  FolderOpen,
  FileText,
  Plus,
  Check,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileUploadZone, type UploadedFile } from '@/components/FileUploadZone';
import { LocalFileWatcher } from '@/components/LocalFileWatcher';
import { parseDocument, generateClientFromDocuments } from '@/utils/documentParser';
import { SkeletonCard } from '@/components/SkeletonCard';
import { stageConfig, recommendationConfig, discColors } from '@/data/sampleClients';
import type { Client } from '@/types';
import { getAllClients, createClient, updateClient, deleteClient } from '@/services/clientService';
import { clientToDisplay } from '@/services/clientAdapter';
import { calculateReadinessScore } from '@/services/coachingService';
import { dbSelect } from '@/services/db';
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
  type StageReadiness,
} from '@/services/stageReadinessService';
import { getDiscProfilesMap } from '@/services/dashboardService';
import { cn } from '@/lib/utils';

const CONFIRMED_BY = 'Zubia';

type DisplayClient = ReturnType<typeof clientToDisplay>;

function tryParseJson(val: unknown): unknown {
  if (!val) return null;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); }
  catch { return val; }
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
  action: 'PUSH' | 'NURTURE' | 'PAUSE';
  confidence: number;
}) {
  const config = recommendationConfig[action];
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm"
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      <span>{action}</span>
      <span className="text-xs opacity-75">{confidence}%</span>
    </div>
  );
}

function ClientDetailModal({
  client,
  isOpen,
  onClose,
  onDelete,
}: {
  client: DisplayClient | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
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
  const [fathomSessions, setFathomSessions] = useState<Array<{
    session_date: string | null;
    session_number: number | null;
    stage: string | null;
    notes: string | null;
    next_actions: string | null;
    overall_clear_score: number | null;
  }>>([]);

  useEffect(() => {
    if (client && isOpen) {
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
      }>(
        `SELECT email, phone, company FROM clients
         WHERE id = ?`,
        [client.id]
      )
        .then((rows) => {
          setContact({
            email: rows[0]?.email ?? null,
            phone: rows[0]?.phone ?? null,
            company: rows[0]?.company ?? null,
          });
        })
        .catch(() => {
          setContact({ email: null, phone: null, company: null });
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
            return;
          }
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
        });
      dbSelect<{
        one_year_vision: string;
        spouse_name: string;
        financial_net_worth_range: string;
        credit_score: number;
        launch_timeline: string;
        dangers: string;
        strengths: string;
        opportunities: string;
        areas_of_interest: string;
        skills: string;
        time_commitment: string;
      }>(
        `SELECT one_year_vision, spouse_name,
         financial_net_worth_range, credit_score,
         launch_timeline, dangers, strengths,
         opportunities, areas_of_interest,
         skills, time_commitment
         FROM client_you2_profiles
         WHERE client_id = ?`,
        [client.id]
      )
        .then((you2Result) => {
          const row = you2Result[0];
          const vision = row?.one_year_vision
            ?? 'No statement yet';
          setYou2Vision(vision);
          const parseList = (raw: string | null | undefined): string[] => {
            const parsed = tryParseJson(raw);
            if (Array.isArray(parsed)) {
              return parsed.map(String).filter(Boolean);
            }
            if (typeof parsed === 'string') {
              return parsed
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
            }
            return [];
          };
          setYou2Details(
            row
              ? {
                  spouse_name: row.spouse_name ?? '',
                  financial_net_worth_range: row.financial_net_worth_range ?? '',
                  credit_score: row.credit_score ?? null,
                  launch_timeline: row.launch_timeline ?? '',
                  dangers: parseList(row.dangers),
                  strengths: parseList(row.strengths),
                  opportunities: parseList(row.opportunities),
                  areas_of_interest: parseList(row.areas_of_interest),
                  skills: parseList(row.skills),
                  time_commitment: row.time_commitment ?? '',
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
        session_date: string | null;
        session_number: number | null;
        stage: string | null;
        notes: string | null;
        next_actions: string | null;
        overall_clear_score: number | null;
      }>(
        `SELECT session_date, session_number,
         stage, notes, next_actions,
         overall_clear_score
         FROM coaching_sessions
         WHERE client_id = ?
         ORDER BY session_date DESC`,
        [client.id]
      )
        .then(setFathomSessions)
        .catch(() => setFathomSessions([]));
    } else {
      setReadiness(null);
      setYou2Vision('No statement yet');
      setYou2Details(null);
      setTumayData(null);
      setReadinessScorePct(0);
      setContact({ email: null, phone: null, company: null });
      setDiscStyleLabel('—');
      setModalDiscStyle('I');
      setFathomSessions([]);
    }
  }, [client?.id, isOpen]);

  if (!client) return null;

  const stage = stageConfig[client.stage as keyof typeof stageConfig];
  if (!stage) return null;

  const handleDelete = () => {
    if (onDelete && confirm(`Delete ${client.name}?`)) {
      onDelete(client.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: discColors[client.disc.style] }}
              >
                {client.avatar}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{client.name}</h2>
                <p className="text-sm text-slate-500 font-normal">
                  {discStyleLabel} • {contact.company || '—'}
                </p>
              </div>
            </div>
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Delete
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid grid-cols-6 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="disc">DISC</TabsTrigger>
            <TabsTrigger value="you2">You 2.0</TabsTrigger>
            <TabsTrigger value="tumay">TUMAY</TabsTrigger>
            <TabsTrigger value="vision">Vision</TabsTrigger>
            <TabsTrigger value="fathom">Fathom</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="text-white" style={{ backgroundColor: stage.color }}>
                    {stage.label}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-2">{stage.compartment}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Persona</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{client.persona}</p>
                  <RecommendationBadge action={client.recommendation} confidence={client.confidence} />
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
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
                        readiness.recommendation === 'PUSH'
                          ? '#22c55e'
                          : readiness.recommendation === 'NURTURE'
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
                      Why at {readiness.current_stage_full}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                      {readiness.why_here.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="what-needed">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                      To advance to {readiness.next_stage_full ?? '—'}
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
                        const reason = prompt(
                          `Reason for moving to ${readiness.next_stage_full}?`
                        );
                        if (reason) {
                          moveClientStage(
                            readiness.client_id,
                            readiness.next_stage,
                            reason,
                            'Sandi Stahl'
                          ).then(() => {
                            getStageReadiness(readiness.client_id).then(setReadiness);
                          });
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Move to {readiness.next_stage_full} →
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
          </TabsContent>

          <TabsContent value="disc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DISCBadge style={modalDiscStyle} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-semibold text-slate-700">{discStyleLabel}</p>
                <p className="text-slate-600">{client.disc.description}</p>
                {client.disc.traits.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">Key Traits:</p>
                    <div className="flex flex-wrap gap-2">
                      {client.disc.traits.map((trait, i) => (
                        <Badge key={i} variant="secondary">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="you2" className="space-y-4">
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
                    <p><span className="font-semibold">Areas of interest:</span> {you2Details.areas_of_interest.join(', ')}</p>
                  )}
                  {you2Details.skills.length > 0 && (
                    <p><span className="font-semibold">Skills:</span> {you2Details.skills.join(', ')}</p>
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
          </TabsContent>

          <TabsContent value="tumay" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">TUMAY Data</CardTitle>
              </CardHeader>
              <CardContent>
                {tumayData ? (
                  <div className="space-y-2 text-sm text-slate-700">
                    {Object.entries(tumayData).map(([key, value]) => (
                      <p key={key}>
                        <span className="font-semibold">{key}:</span>{' '}
                        {typeof value === 'string'
                          ? value
                          : JSON.stringify(value)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">No TUMAY data yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vision" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vision Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  {client.visionStatement.paragraph || 'No vision yet.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fathom" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fathom Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {fathomSessions.length === 0 ? (
                  <p className="text-slate-600">No sessions recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {fathomSessions.map((s, idx) => (
                      <div key={`${s.session_date ?? 'session'}-${idx}`} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">
                            {s.session_date || 'Unknown date'}{s.session_number ? ` - Session ${s.session_number}` : ''}
                          </p>
                          {s.overall_clear_score !== null && (
                            <Badge variant="outline" className="text-xs">
                              CLEAR {Number(s.overall_clear_score).toFixed(1)}
                            </Badge>
                          )}
                        </div>
                        {s.stage && <p className="text-xs text-slate-500 mt-1">Stage: {s.stage}</p>}
                        {s.notes && <p className="text-sm text-slate-700 mt-2">{s.notes}</p>}
                        {s.next_actions && <p className="text-xs text-slate-500 mt-1">Next: {s.next_actions}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({
  status,
  label,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
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
        readiness.forEach((r) => rMap.set(r.client_id, r.readiness_score));
        setReadinessMap(rMap);
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

  const handleFilesUploaded = async (files: UploadedFile[]) => {
    const parsedDocs = files
      .filter((f) => f.status === 'complete' && f.content)
      .map((f) => parseDocument(f.content!, f.name));

    if (parsedDocs.length > 0) {
      const newClientData = generateClientFromDocuments(parsedDocs);
      try {
        await createClient({
          name: newClientData.name || 'Imported Client',
          stage: 'Initial Contact',
          ...newClientData,
        });
        setUploadMessage(
          `Successfully imported ${parsedDocs.length} document(s) for ${newClientData.name || 'Imported Client'}`
        );
        loadClients();
      } catch (err) {
        setUploadMessage(`Import failed: ${String(err)}`);
      }
      setTimeout(() => setUploadMessage(null), 5000);
    }
    setShowUploadDialog(false);
  };

  const handleCreateClient = async () => {
    if (!createName.trim()) return;
    try {
      await createClient({ name: createName.trim(), stage: 'Initial Contact' });
      setCreateName('');
      setShowCreateDialog(false);
      loadClients();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await deleteClient(id);
      setSelectedClient(null);
      setIsModalOpen(false);
      loadClients();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesStage = selectedStage === 'all' || client.stage === selectedStage;
      return matchesSearch && matchesStage;
    });
  }, [clients, searchTerm, selectedStage]);

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const displayClients = useMemo(
    () =>
      filteredClients.map((client) =>
        clientToDisplay(client, {
          disc: discDerivedMap.get(client.id) ?? discProfiles.get(client.id),
          readinessScore: readinessMap.get(client.id),
        })
      ),
    [filteredClients, discDerivedMap, discProfiles, readinessMap]
  );
  const selectedDisplay = selectedClient
    ? clientToDisplay(selectedClient, {
        disc: discDerivedMap.get(selectedClient.id) ?? discProfiles.get(selectedClient.id),
        readinessScore: readinessMap.get(selectedClient.id),
      })
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
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'clients' | 'review')}>
        <TabsList className="mb-4">
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Data Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-6 mt-0">
      {uploadMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <p className="text-green-800 font-medium">{uploadMessage}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search clients by name or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Stages</option>
            {Object.keys(stageConfig).map((key) => (
              <option key={key} value={key}>
                {stageConfig[key as keyof typeof stageConfig].label}
              </option>
            ))}
          </select>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="ml-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Client
          </Button>
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="ml-2 bg-[#C4B7D9] hover:bg-[#C4B7D9]/90 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Client
          </Button>
        </div>
      </div>

      <LocalFileWatcher
        watchPath="./client-files"
        onFilesImported={(files) => {
          const mockUploadedFiles: UploadedFile[] = files.map((f) => ({
            id: f.id,
            name: f.name,
            type: 'text/plain',
            size: 0,
            content: `[${f.type} Document]`,
            status: 'complete',
            progress: 100,
          }));
          handleFilesUploaded(mockUploadedFiles);
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayClients.length === 0 ? (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-500 mb-4">No clients yet.</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create your first client
            </Button>
          </div>
        ) : (
          displayClients.map((client) => (
            <Card
              key={client.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleClientClick(filteredClients.find((c) => c.id === client.id)!)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: discColors[client.disc.style] }}
                    >
                      {client.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {client.name}
                      </h3>
                      <p className="text-sm text-slate-500">{client.company || '—'}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge
                    style={{ backgroundColor: stageConfig[client.stage as keyof typeof stageConfig]?.color }}
                    className="text-slate-700 text-xs"
                  >
                    {stageConfig[client.stage as keyof typeof stageConfig]?.label ?? client.stage}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {client.persona}
                  </Badge>
                  <DISCBadge style={client.disc.style} />
                  <Badge variant="secondary" className="text-xs">
                    {discDerivedMap.get(client.id)?.label ?? client.disc.description}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Readiness</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(client as DisplayClient & { readinessScorePct?: number }).readinessScorePct ?? calculateReadinessScore(client.readiness)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium">
                        {(client as DisplayClient & { readinessScorePct?: number }).readinessScorePct ?? calculateReadinessScore(client.readiness)}
                        %
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Confidence</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            client.confidence >= 80
                              ? 'bg-green-500'
                              : client.confidence >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          )}
                          style={{ width: `${client.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{client.confidence}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <RecommendationBadge action={client.recommendation} confidence={client.confidence} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ClientDetailModal
        client={selectedDisplay}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDeleteClient}
      />

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Name</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Client name"
              />
            </div>
            <Button onClick={handleCreateClient} disabled={!createName.trim()}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#C4B7D9]" />
              Import Client Documents
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">Supported Document Types</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  DISC Assessments (.pdf, .txt)
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  You 2.0 Profiles (.txt, .json)
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  TUMAY Questionnaires (.json, .txt)
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Vision Statements (.txt)
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Fathom Notes (.txt)
                </div>
              </div>
            </div>
            <FileUploadZone
              onFilesUploaded={handleFilesUploaded}
              acceptedTypes={['.pdf', '.txt', '.json']}
              maxFileSize={10}
            />
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-start gap-3">
                <FolderOpen className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">Airgapped Mode</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    For offline deployment, drop files in the{' '}
                    <code className="bg-amber-100 px-1 rounded">./client-files</code> folder next to
                    the app. The Local File Watcher above will detect and import them automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                        <td className="p-3 text-slate-600">{c.outcome_bucket}</td>
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
