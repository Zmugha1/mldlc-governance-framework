import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  TrendingUp,
  Target,
  Phone,
  Clock,
  ArrowUpRight,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { SkeletonCard } from '@/components/SkeletonCard';
import { stageConfig, discColors } from '@/data/sampleClients';
import { getDashboardStats, getAllClients } from '@/services/clientService';
import { getDiscStyleBreakdown, getDiscProfilesMap } from '@/services/dashboardService';
import { getAllStageReadiness } from '@/services/stageReadinessService';
import { getConversionRate, getPipelineStageDefaults } from '@/services/pipelineService';
import type { DashboardStats } from '@/types';
import { clientToDisplay, normalizeDisplayStage } from '@/services/clientAdapter';
import { cn } from '@/lib/utils';

const STAGES = [
  'Initial Contact',
  'Seeker Connection',
  'Seeker Clarification',
  'Possibilities',
  'Client Career 2.0',
  'Business Purchase',
];

const recommendationStyleMap: Record<
  'VALIDATE' | 'GATHER' | 'PAUSE',
  { color: string; bgColor: string }
> = {
  VALIDATE: { color: '#22C55E', bgColor: '#DCFCE7' },
  GATHER: { color: '#F59E0B', bgColor: '#FEF3C7' },
  PAUSE: { color: '#6B7280', bgColor: '#F3F4F6' },
};

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  description: string;
  color: string;
}

function KPICard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description,
  color,
}: KPICardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{value}</h3>
            {change && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-sm',
                  changeType === 'positive' && 'text-green-600',
                  changeType === 'negative' && 'text-red-600',
                  changeType === 'neutral' && 'text-slate-500'
                )}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>{change}</span>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">{description}</p>
          </div>
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineStageCard({
  stage,
  count,
  avgDays,
  conversion,
}: {
  stage: string;
  count: number;
  avgDays: number;
  conversion: number;
}) {
  const config = stageConfig[stage as keyof typeof stageConfig];
  if (!config) return null;
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:shadow-md transition-shadow">
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center text-slate-700 font-bold text-sm shrink-0"
        style={{ backgroundColor: config.color }}
      >
        {count}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900">{config.label}</h4>
        <p className="text-sm text-slate-500">{config.compartment}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-slate-900">{avgDays} days</p>
        <p className="text-xs text-slate-500">avg. time</p>
      </div>
      <div className="text-right shrink-0 w-16">
        <p className="text-sm font-medium text-slate-900">{conversion}%</p>
        <p className="text-xs text-slate-500">convert</p>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<Awaited<ReturnType<typeof getAllClients>>>([]);
  const [discDistribution, setDiscDistribution] = useState<Awaited<ReturnType<typeof getDiscStyleBreakdown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [s, c, d, readiness, profiles] = await Promise.all([
        getDashboardStats(),
        getAllClients(),
        getDiscStyleBreakdown(),
        getAllStageReadiness(),
        getDiscProfilesMap(),
      ]);
      setStats(s);
      setClients(c);
      setDiscDistribution(d);

      const validateIds = readiness
        .filter((r) => r.recommendation === 'VALIDATE')
        .sort((a, b) => b.readiness_score - a.readiness_score)
        .slice(0, 3)
        .map((r) => r.client_id);
      const readinessById = new Map(readiness.map((r) => [r.client_id, r.readiness_score]));
      const validateClients = c
        .filter((client) => validateIds.includes(client.id))
        .sort((a, b) => validateIds.indexOf(a.id) - validateIds.indexOf(b.id))
        .map((client) =>
          clientToDisplay(client, {
            disc: profiles.get(client.id),
            readinessScore: readinessById.get(client.id),
          })
        );
      setPriorityClients(validateClients);
      setDiscProfiles(profiles);
    } catch (err) {
      console.error('Dashboard load:', err);
      setError(String((err as { message?: string })?.message ?? err ?? 'Failed to load dashboard'));
    } finally {
      if (isManualRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const recommendationData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'VALIDATE', value: stats.pushCount, color: recommendationStyleMap.VALIDATE.color },
      { name: 'GATHER', value: stats.nurtureCount, color: recommendationStyleMap.GATHER.color },
      { name: 'PAUSE', value: stats.pauseCount, color: recommendationStyleMap.PAUSE.color },
    ];
  }, [stats]);

  const pipelineChartData = useMemo(() => {
    return STAGES.map((stage) => {
      const count = clients.filter((c) => normalizeDisplayStage(c.inferred_stage ?? c.stage) === stage).length;
      const config = stageConfig[stage as keyof typeof stageConfig];
      return {
        stage: config?.label ?? stage,
        count,
        conversion: getConversionRate(count),
      };
    });
  }, [clients]);

  const weeklyData = [
    { day: 'Mon', calls: 2, emails: 4 },
    { day: 'Tue', calls: 3, emails: 3 },
    { day: 'Wed', calls: 1, emails: 5 },
    { day: 'Thu', calls: 4, emails: 3 },
    { day: 'Fri', calls: 2, emails: 4 },
  ];

  const [priorityClients, setPriorityClients] = useState<ReturnType<typeof clientToDisplay>[]>([]);
  const [discProfiles, setDiscProfiles] = useState<Awaited<ReturnType<typeof getDiscProfilesMap>>>(new Map());

  // Priority clients are loaded in loadDashboardData().

  const pipelineStageCards = useMemo(() => {
    const defaults = getPipelineStageDefaults();
    return STAGES.map((stage) => {
      const count = clients.filter((c) => normalizeDisplayStage(c.inferred_stage ?? c.stage) === stage).length;
      return { stage, count, avgDays: defaults.avgDays, conversion: defaults.conversion };
    });
  }, [clients]);

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

  if (!stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => { void loadDashboardData(true); }}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Total Clients"
          value={stats.totalClients}
          change="Active pipeline"
          changeType="positive"
          icon={Users}
          description="Prospects in coaching journey"
          color="#3B82F6"
        />
        <KPICard
          title="Active Conversations"
          value={stats.activeConversations}
          change="100% engagement"
          changeType="positive"
          icon={Phone}
          description="Clients in active dialogue"
          color="#22C55E"
        />
        <KPICard
          title="Avg. Readiness Score"
          value={stats.avgReadinessScore}
          change="Across 4 dimensions"
          changeType="positive"
          icon={Target}
          description="Identity, Commitment, Financial, Execution"
          color="#F59E0B"
        />
        <KPICard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          change="IC to Closed"
          changeType="positive"
          icon={TrendingUp}
          description="Pipeline conversion efficiency"
          color="#8B5CF6"
        />
        <KPICard
          title="Calls This Week"
          value={stats.callsThisWeek}
          change="On track"
          changeType="positive"
          icon={Phone}
          description="Scheduled + completed"
          color="#EC4899"
        />
        <KPICard
          title="Time Saved"
          value={`${stats.timeSavedHours} hrs`}
          change="AI-assisted coaching"
          changeType="positive"
          icon={Clock}
          description="Weekly efficiency gain"
          color="#14B8A6"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pipelineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={recommendationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {recommendationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 shrink-0">
                {recommendationData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm text-slate-500">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity & DISC Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="emails"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={{ fill: '#22C55E', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">DISC Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={discDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {discDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 shrink-0">
                {discDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-slate-500">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Clients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Validate Clients</CardTitle>
          <Zap className="h-5 w-5 text-yellow-500" />
        </CardHeader>
        <CardContent>
          {priorityClients.length === 0 ? (
            <p className="text-slate-500 text-sm">No VALIDATE clients yet. Create clients and recommendations will appear here.</p>
          ) : (
            <div className="space-y-3">
              {priorityClients.map((client) => {
                const normalizedRecommendation =
                  client.recommendation === 'PUSH'
                    ? 'VALIDATE'
                    : client.recommendation === 'NURTURE'
                      ? 'GATHER'
                      : client.recommendation;
                const style =
                  recommendationStyleMap[
                    normalizedRecommendation as keyof typeof recommendationStyleMap
                  ] ?? recommendationStyleMap.GATHER;

                return (
                  <div
                    key={client.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100"
                  >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: discColors[client.disc.style] }}
                  >
                    {client.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{client.name}</p>
                    <p className="text-sm text-slate-500">
                      {client.tumay.industriesOfInterest[0]} • {client.stage}
                    </p>
                  </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        style={{
                          backgroundColor: style.bgColor,
                          color: style.color,
                        }}
                      >
                        {normalizedRecommendation}
                      </Badge>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{client.confidence}%</p>
                      <p className="text-xs text-slate-500">confidence</p>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5-Compartment Coaching Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pipelineStageCards.map(({ stage, count, avgDays, conversion }) => (
              <PipelineStageCard
                key={stage}
                stage={stage}
                count={count}
                avgDays={avgDays}
                conversion={conversion}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
