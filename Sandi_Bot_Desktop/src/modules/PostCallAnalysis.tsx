import { useState, useMemo, useEffect } from 'react';
import { 
  Mic, 
  BarChart3, 
  Star, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Save,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { SkeletonCard } from '@/components/SkeletonCard';
import FeedbackButton from '../components/FeedbackButton';
import { knowledgeGraph } from '@/data/sampleClients';
import {
  getScoreColor,
  calculateOverallScore,
  getCoachingTip,
  getStrengthsAndOpportunities,
} from '@/services/postCallService';
import {
  calculateCLEARFromBlocks,
  getCLEARLabel,
  getCLEARColor,
} from '@/services/stageReadinessService';
import {
  deriveDominantStyle,
  getDISCTips
} from '@/config/discCoachingTips';
import { dbExecute, dbSelect } from '@/services/db';
import { cn } from '@/lib/utils';

/** Maps legacy service labels to CLEAR UI labels (postCallService still returns old names). */
const CLEAR_LABEL_DISPLAY: Record<string, string> = {
  Curiosity: 'Contracting',
  Locating: 'Listening',
  Engagement: 'Exploring',
  Accountability: 'Action',
  Reflection: 'Reflection',
};

function displayClearLabel(label: string): string {
  return CLEAR_LABEL_DISPLAY[label] ?? label;
}

// CLEAR Dimensions from Knowledge Graph
const clearDimensions = [
  { 
    key: 'curiosity', 
    label: 'Contracting', 
    description: knowledgeGraph.clearFramework.curiosity.description,
    color: '#3B82F6'
  },
  { 
    key: 'locating', 
    label: 'Listening', 
    description: knowledgeGraph.clearFramework.locating.description,
    color: '#22C55E'
  },
  { 
    key: 'engagement', 
    label: 'Exploring', 
    description: knowledgeGraph.clearFramework.engagement.description,
    color: '#F59E0B'
  },
  { 
    key: 'accountability', 
    label: 'Action', 
    description: knowledgeGraph.clearFramework.accountability.description,
    color: '#8B5CF6'
  },
  { 
    key: 'reflection', 
    label: 'Reflection', 
    description: knowledgeGraph.clearFramework.reflection.description,
    color: '#EC4899'
  },
];

// Score Badge
function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge className={cn('text-white', getScoreColor(score))}>
      {score}/5
    </Badge>
  );
}

// CLEAR Score Input
function CLEARScoreInput({ 
  dimension, 
  value, 
  onChange,
  disabled = false,
}: { 
  dimension: typeof clearDimensions[0]; 
  value: number; 
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn('p-4 rounded-xl bg-slate-50 border border-slate-100', disabled && 'opacity-60')}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${dimension.color}20` }}
          >
            <Star className="h-5 w-5" style={{ color: dimension.color }} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">{dimension.label}</h4>
            <p className="text-xs text-slate-500">{dimension.description}</p>
          </div>
        </div>
        <ScoreBadge score={value} />
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={1}
        max={5}
        step={1}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex justify-between mt-2 text-xs text-slate-400">
        <span>Needs Work</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}

interface ActiveClient {
  id: string;
  name: string;
}

interface HistorySession {
  id: number;
  client_id: string;
  client_name: string;
  session_date: string;
  call_duration: string;
  clear_curiosity: number;
  clear_locating: number;
  clear_engagement: number;
  clear_accountability: number;
  clear_reflection: number;
  clear_notes: string;
  overall_clear_score: number;
}

interface ClearInsights {
  avg_curiosity: number;
  avg_locating: number;
  avg_engagement: number;
  avg_accountability: number;
  avg_reflection: number;
  total_sessions: number;
}

interface SelectedSessionBlocks {
  id: number;
  client_id: string;
  block_opening: string | null;
  block_emotional: string | null;
  block_vision: string | null;
  block_commitments: string | null;
  block_reflection_block: string | null;
}

export default function PostCallAnalysis() {
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [clients, setClients] = useState<ActiveClient[]>([]);
  const [scores, setScores] = useState({
    curiosity: 3,
    locating: 3,
    engagement: 3,
    accountability: 3,
    reflection: 3,
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [callDuration, setCallDuration] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
  const [insights, setInsights] = useState<ClearInsights | null>(null);
  const [selectedSession, setSelectedSession] = useState<SelectedSessionBlocks | null>(null);
  const [selectedDiscStyle, setSelectedDiscStyle] = useState('C');
  const [savedSessionCountForClient, setSavedSessionCountForClient] = useState(0);

  // Calculate overall score
  const overallScore = useMemo(() => calculateOverallScore(scores), [scores]);
  const showOverallClearNumeric =
    Boolean(selectedClient) && savedSessionCountForClient > 0;

  // Radar chart data
  const radarData = clearDimensions.map(dim => ({
    dimension: dim.label,
    score: scores[dim.key as keyof typeof scores],
    fullMark: 5,
  }));

  const chartData = useMemo(() => {
    const averageByKey: Record<keyof typeof scores, number> = {
      curiosity: insights?.avg_curiosity ?? 0,
      locating: insights?.avg_locating ?? 0,
      engagement: insights?.avg_engagement ?? 0,
      accountability: insights?.avg_accountability ?? 0,
      reflection: insights?.avg_reflection ?? 0,
    };
    return clearDimensions.map((dim) => ({
      dimension: dim.label,
      average: averageByKey[dim.key as keyof typeof scores],
      current: scores[dim.key as keyof typeof scores],
    }));
  }, [insights, scores]);

  const loadClients = async () => {
    const activeClients = await dbSelect<ActiveClient>(
      `SELECT id, name FROM clients
       WHERE outcome_bucket = 'active'
       ORDER BY name`,
      []
    );
    setClients(activeClients);
  };

  const loadHistory = async () => {
    const sessions = await dbSelect<HistorySession>(
      `SELECT cs.id, cs.client_id,
       c.name as client_name,
       cs.session_date, cs.call_duration,
       cs.clear_curiosity, cs.clear_locating,
       cs.clear_engagement,
       cs.clear_accountability,
       cs.clear_reflection, cs.clear_notes,
       cs.overall_clear_score
       FROM coaching_sessions cs
       JOIN clients c ON c.id = cs.client_id
       WHERE cs.overall_clear_score IS NOT NULL
       ORDER BY cs.session_date DESC
       LIMIT 20`,
      []
    );
    setHistorySessions(sessions);
  };

  const loadInsights = async () => {
    const insightRows = await dbSelect<ClearInsights>(
      `SELECT
       ROUND(AVG(clear_curiosity), 1) as avg_curiosity,
       ROUND(AVG(clear_locating), 1) as avg_locating,
       ROUND(AVG(clear_engagement), 1) as avg_engagement,
       ROUND(AVG(clear_accountability), 1)
         as avg_accountability,
       ROUND(AVG(clear_reflection), 1) as avg_reflection,
       COUNT(*) as total_sessions
       FROM coaching_sessions
       WHERE overall_clear_score IS NOT NULL`,
      []
    );
    setInsights(insightRows[0] ?? null);
  };

  const handleSave = async () => {
    if (!selectedClient) return;
    setSaveError(null);
    setSavedMessage(null);
    try {
      await dbExecute(
        `INSERT INTO coaching_sessions
         (client_id, session_date, call_duration,
          clear_curiosity, clear_locating,
          clear_engagement, clear_accountability,
          clear_reflection, clear_notes,
          overall_clear_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
          ROUND((? + ? + ? + ? + ?) / 5.0, 1))`,
        [
          selectedClient,
          selectedDate,
          callDuration,
          scores.curiosity,
          scores.locating,
          scores.engagement,
          scores.accountability,
          scores.reflection,
          callNotes,
          scores.curiosity,
          scores.locating,
          scores.engagement,
          scores.accountability,
          scores.reflection
        ]
      );
      setSavedMessage('Saved successfully!');
      setSelectedClient('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setCallDuration('');
      setCallNotes('');
      setScores({
        curiosity: 3,
        locating: 3,
        engagement: 3,
        accountability: 3,
        reflection: 3,
      });
      await Promise.all([loadHistory(), loadInsights()]);
      setTimeout(() => setSavedMessage(null), 2000);
    } catch (err) {
      setSaveError(String(err ?? 'Failed to save analysis'));
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([loadClients(), loadHistory(), loadInsights()]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const coachingTip = getCoachingTip(scores);
  const clearResult = selectedSession
    ? calculateCLEARFromBlocks(selectedSession as unknown as Record<string, unknown>)
    : null;
  const hasBlockData = Boolean(
    selectedSession &&
    [
      selectedSession.block_opening,
      selectedSession.block_emotional,
      selectedSession.block_vision,
      selectedSession.block_commitments,
      selectedSession.block_reflection_block,
    ].some((v) => {
      const text = String(v ?? '').trim().toLowerCase();
      return text !== '' && text !== 'null';
    })
  );

  useEffect(() => {
    if (!selectedClient) {
      setSelectedSession(null);
      setSelectedDiscStyle('C');
      return;
    }
    const loadSessionAndDisc = async () => {
      const sessions = await dbSelect<SelectedSessionBlocks>(
        `SELECT id, client_id,
         block_opening, block_emotional,
         block_vision, block_commitments,
         block_reflection_block
         FROM coaching_sessions
         WHERE client_id = ?
         ORDER BY session_date DESC, id DESC
         LIMIT 1`,
        [selectedClient]
      );
      setSelectedSession(sessions[0] ?? null);

      const discRows = await dbSelect<{
        natural_d: number | null;
        natural_i: number | null;
        natural_s: number | null;
        natural_c: number | null;
      }>(
        `SELECT natural_d, natural_i, natural_s, natural_c
         FROM client_disc_profiles
         WHERE client_id = ?
         LIMIT 1`,
        [selectedClient]
      );
      const disc = discRows[0];
      if (!disc) {
        setSelectedDiscStyle('C');
        return;
      }
      setSelectedDiscStyle(
        deriveDominantStyle(
          Number(disc.natural_d ?? 0),
          Number(disc.natural_i ?? 0),
          Number(disc.natural_s ?? 0),
          Number(disc.natural_c ?? 0)
        )
      );
    };
    loadSessionAndDisc().catch(() => {
      setSelectedSession(null);
      setSelectedDiscStyle('C');
    });
  }, [selectedClient]);

  useEffect(() => {
    if (!selectedClient) {
      setSavedSessionCountForClient(0);
      return;
    }
    let cancelled = false;
    void dbSelect<{ c: number }>(
      `SELECT COUNT(*) as c FROM coaching_sessions
       WHERE client_id = ? AND overall_clear_score IS NOT NULL`,
      [selectedClient]
    )
      .then((rows) => {
        if (!cancelled) setSavedSessionCountForClient(Number(rows[0]?.c ?? 0));
      })
      .catch(() => {
        if (!cancelled) setSavedSessionCountForClient(0);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClient]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonCard lines={4} lineHeight={20} />
        <SkeletonCard lines={3} lineHeight={16} />
        <SkeletonCard lines={5} lineHeight={14} />
      </div>
    );
  }

  const analysisFormEnabled = Boolean(selectedClient);

  return (
    <div className="space-y-6">
      <FeedbackButton pageName="Post-Call Analysis" />
      <Tabs defaultValue="new">
        <TabsList className="mb-4">
          <TabsTrigger value="new">
            <Mic className="h-4 w-4 mr-2" />
            New Analysis
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* New Analysis Tab */}
        <TabsContent value="new">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Scoring */}
            <div className="space-y-4">
              {/* Client Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Call Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Select Client</label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a client...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Date</label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        disabled={!analysisFormEnabled}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Duration</label>
                      <Input
                        placeholder="e.g., 45 min"
                        value={callDuration}
                        onChange={(e) => setCallDuration(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!analysisFormEnabled && (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Select a client from the list to begin a post-call analysis.
                </p>
              )}

              {/* CLEAR Scores */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">CLEAR Scoring</CardTitle>
                  <CardDescription>Rate your coaching effectiveness using the CLEAR framework</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {clearDimensions.map((dimension) => (
                    <CLEARScoreInput
                      key={dimension.key}
                      dimension={dimension}
                      value={scores[dimension.key as keyof typeof scores]}
                      onChange={(value) => setScores(prev => ({ ...prev, [dimension.key]: value }))}
                      disabled={!analysisFormEnabled}
                    />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">CLEAR Coaching Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasBlockData && clearResult ? (
                    <>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-slate-500">Overall Score</p>
                        <p className="text-2xl font-bold">{clearResult.overall.toFixed(1)} / 10</p>
                        <p className={cn('text-sm font-semibold', getCLEARColor(clearResult.overall))}>
                          {getCLEARLabel(clearResult.overall)}
                        </p>
                      </div>

                      <div className="grid grid-cols-5 gap-2 text-center">
                        {[
                          { label: 'C', value: clearResult.c_score },
                          { label: 'L', value: clearResult.l_score },
                          { label: 'E', value: clearResult.e_score },
                          { label: 'A', value: clearResult.a_score },
                          { label: 'R', value: clearResult.r_score },
                        ].map((dim) => (
                          <div key={dim.label} className="rounded border p-2">
                            <p className="text-xs text-slate-500">{dim.label}</p>
                            <p className={cn(
                              'text-base font-semibold',
                              dim.value >= 5
                                ? 'text-teal-600'
                                : dim.value >= 3
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                            )}
                            >
                              {dim.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {clearResult.feedback.length > 0 && (
                        <div className="rounded-lg bg-amber-50 border-l-4 border-teal-500 p-3">
                          <ul className="list-disc list-inside space-y-1 text-sm text-amber-900">
                            {clearResult.feedback.map((tip, idx) => (
                              <li key={`${tip}-${idx}`}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="rounded-lg border p-3 bg-slate-50">
                        <p className="text-sm font-semibold text-slate-700">DISC-specific coaching note</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {getDISCTips(selectedDiscStyle).clear_emphasis}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Score this session using the sliders above to generate coaching feedback.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Call Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="What went well? What could be improved? Key takeaways..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={!analysisFormEnabled}
              >
                {savedMessage ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {savedMessage}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Analysis
                  </>
                )}
              </Button>
              {saveError && (
                <p className="text-sm text-red-600 mt-2">{saveError}</p>
              )}
            </div>

            {/* Right Column - Results */}
            <div className="space-y-4">
              {/* Overall Score */}
              <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 mb-1">Overall CLEAR Score</p>
                      <h2 className="text-5xl font-bold">
                        {showOverallClearNumeric ? overallScore.toFixed(1) : '—'}
                      </h2>
                      <p className="text-blue-100 mt-2">
                        {showOverallClearNumeric
                          ? 'out of 5.0'
                          : !selectedClient
                            ? 'Select a client to see score'
                            : 'No sessions recorded yet'}
                      </p>
                    </div>
                    <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center">
                      <BarChart3 className="h-10 w-10" />
                    </div>
                  </div>
                  {showOverallClearNumeric && (
                    <div className="mt-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Performance</span>
                        <span>
                          {overallScore >= 4
                            ? 'Excellent'
                            : overallScore >= 3
                              ? 'Good'
                              : 'Needs Improvement'}
                        </span>
                      </div>
                      <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${(overallScore / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Score Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                      <Radar
                        name="Current Call"
                        dataKey="score"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Coaching Tip */}
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-yellow-800">
                    <Lightbulb className="h-5 w-5" />
                    Coaching Tip
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-yellow-800 mb-2">
                    Your lowest dimension is <strong>{displayClearLabel(coachingTip.dimension)}</strong>.
                  </p>
                  <p className="text-sm text-yellow-700">
                    {coachingTip.tip}
                  </p>
                </CardContent>
              </Card>

              {/* CLEAR Framework Reminder */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">CLEAR Framework Reminder</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>C</strong>ontracting - Ask open-ended questions</p>
                    <p><strong>L</strong>istening - Find their mental coordinates</p>
                    <p><strong>E</strong>xploring - Use their words, dig deeper</p>
                    <p><strong>A</strong>ction - Get specific commitments</p>
                    <p><strong>R</strong>eflection - Ask about a-ha moments</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Call Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historySessions.length === 0 ? (
                  <p className="text-slate-500">No analyses saved yet.</p>
                ) : (
                  historySessions.map((session) => {
                  return (
                    <div key={session.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {session.session_date} - {session.client_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {session.call_duration || 'Duration not set'}{session.clear_notes ? ` - ${session.clear_notes}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge className={cn('text-white', getScoreColor(session.overall_clear_score || 0))}>
                          {(session.overall_clear_score || 0).toFixed(1)}/5
                        </Badge>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Con</p>
                          <p className="text-sm font-medium">{session.clear_curiosity}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Lis</p>
                          <p className="text-sm font-medium">{session.clear_locating}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Exp</p>
                          <p className="text-sm font-medium">{session.clear_engagement}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Act</p>
                          <p className="text-sm font-medium">{session.clear_accountability}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Ref</p>
                          <p className="text-sm font-medium">{session.clear_reflection}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {insights && insights.total_sessions > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="average" fill="#94A3B8" name="Your Average" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="current" fill="#3B82F6" name="Current Call" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-slate-400" />
                        <span className="text-sm text-slate-600">Your Average</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <span className="text-sm text-slate-600">Current Call</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 text-center">
                      Based on {insights.total_sessions} saved session{insights.total_sessions === 1 ? '' : 's'}
                    </p>
                  </>
                ) : (
                  <div className="py-10 text-center text-slate-500">
                    No analyses saved yet. Complete your first post-call analysis to see insights.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Strengths & Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strengths & Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Top Strengths
                  </h4>
                  <div className="space-y-2">
                    {getStrengthsAndOpportunities(scores).strengths.map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-green-50 border border-green-100">
                        <p className="font-medium text-green-900">{displayClearLabel(item.label)}</p>
                        <p className="text-sm text-green-700">Score: {item.score}/5</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-700 flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Growth Opportunities
                  </h4>
                  <div className="space-y-2">
                    {getStrengthsAndOpportunities(scores).opportunities.map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                        <p className="font-medium text-orange-900">{displayClearLabel(item.label)}</p>
                        <p className="text-sm text-orange-700">Score: {item.score}/5</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
