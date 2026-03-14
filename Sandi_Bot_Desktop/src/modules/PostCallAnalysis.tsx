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
import { sampleClients, knowledgeGraph } from '@/data/sampleClients';
import type { CLEARScores } from '@/types';
import {
  getScoreColor,
  calculateOverallScore,
  getHistoricalAverages,
  getCoachingTip,
  calculateCallAverage,
  getStrengthsAndOpportunities,
} from '@/services/postCallService';
import { cn } from '@/lib/utils';

// CLEAR Dimensions from Knowledge Graph
const clearDimensions = [
  { 
    key: 'curiosity', 
    label: 'Curiosity', 
    description: knowledgeGraph.clearFramework.curiosity.description,
    color: '#3B82F6'
  },
  { 
    key: 'locating', 
    label: 'Locating', 
    description: knowledgeGraph.clearFramework.locating.description,
    color: '#22C55E'
  },
  { 
    key: 'engagement', 
    label: 'Engagement', 
    description: knowledgeGraph.clearFramework.engagement.description,
    color: '#F59E0B'
  },
  { 
    key: 'accountability', 
    label: 'Accountability', 
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
  onChange 
}: { 
  dimension: typeof clearDimensions[0]; 
  value: number; 
  onChange: (value: number) => void;
}) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
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
        className="w-full"
      />
      <div className="flex justify-between mt-2 text-xs text-slate-400">
        <span>Needs Work</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}

// Mock historical scores for demonstration
const mockHistoricalScores: CLEARScores[] = [
  { curiosity: 4, locating: 3, engagement: 5, accountability: 4, reflection: 4, notes: 'Great call with Andrea - she opened up about health insurance concerns', date: '2026-03-10' },
  { curiosity: 5, locating: 4, engagement: 4, accountability: 3, reflection: 5, notes: 'Alex is highly engaged, ready to move forward', date: '2026-03-08' },
  { curiosity: 3, locating: 4, engagement: 3, accountability: 3, reflection: 3, notes: 'Marcus needs more data - provided detailed projections', date: '2026-03-05' },
  { curiosity: 4, locating: 3, engagement: 4, accountability: 2, reflection: 4, notes: 'Sarah building confidence, age concerns addressed', date: '2026-03-01' },
  { curiosity: 5, locating: 5, engagement: 5, accountability: 4, reflection: 5, notes: 'David highly motivated, spouse call scheduled', date: '2026-03-09' },
];

export default function PostCallAnalysis() {
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [scores, setScores] = useState({
    curiosity: 3,
    locating: 3,
    engagement: 3,
    accountability: 3,
    reflection: 3,
  });
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  // Calculate overall score
  const overallScore = useMemo(() => calculateOverallScore(scores), [scores]);

  // Radar chart data
  const radarData = clearDimensions.map(dim => ({
    dimension: dim.label,
    score: scores[dim.key as keyof typeof scores],
    fullMark: 5,
  }));

  // Historical averages
  const historicalAverages = useMemo(
    () => getHistoricalAverages(mockHistoricalScores, scores),
    [scores]
  );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    setLoading(false);
  }, []);

  const coachingTip = getCoachingTip(scores);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonCard lines={4} lineHeight={20} />
        <SkeletonCard lines={3} lineHeight={16} />
        <SkeletonCard lines={5} lineHeight={14} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                      {sampleClients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} - {client.stage}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Date</label>
                      <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Duration</label>
                      <Input placeholder="e.g., 45 min" />
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                    />
                  ))}
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={!selectedClient}
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Saved Successfully!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Analysis
                  </>
                )}
              </Button>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-4">
              {/* Overall Score */}
              <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 mb-1">Overall CLEAR Score</p>
                      <h2 className="text-5xl font-bold">{overallScore.toFixed(1)}</h2>
                      <p className="text-blue-100 mt-2">out of 5.0</p>
                    </div>
                    <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center">
                      <BarChart3 className="h-10 w-10" />
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Performance</span>
                      <span>{overallScore >= 4 ? 'Excellent' : overallScore >= 3 ? 'Good' : 'Needs Improvement'}</span>
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all"
                        style={{ width: `${(overallScore / 5) * 100}%` }}
                      />
                    </div>
                  </div>
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
                    Your lowest dimension is <strong>{coachingTip.dimension}</strong>.
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
                    <p><strong>C</strong>uriosity - Ask open-ended questions</p>
                    <p><strong>L</strong>ocating - Find their mental coordinates</p>
                    <p><strong>E</strong>ngagement - Use their words, dig deeper</p>
                    <p><strong>A</strong>ccountability - Get specific commitments</p>
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
                {mockHistoricalScores.map((score, index) => {
                  const avg = calculateCallAverage(score);
                  return (
                    <div key={index} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{score.date}</p>
                            <p className="text-sm text-slate-500">{score.notes}</p>
                          </div>
                        </div>
                        <Badge className={cn('text-white', getScoreColor(avg))}>
                          {avg.toFixed(1)}/5
                        </Badge>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {clearDimensions.map((dim) => (
                          <div key={dim.key} className="text-center">
                            <p className="text-xs text-slate-500">{dim.label.slice(0, 3)}</p>
                            <p className="text-sm font-medium">{score[dim.key as keyof CLEARScores] as number}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={historicalAverages}>
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
                        <p className="font-medium text-green-900">{item.label}</p>
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
                        <p className="font-medium text-orange-900">{item.label}</p>
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
