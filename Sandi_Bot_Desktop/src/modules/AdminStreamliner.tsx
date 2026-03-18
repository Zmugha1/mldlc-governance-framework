import { useState, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Activity, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  MessageSquare,
  TrendingUp,
  Download,
  Filter,
  Search,
  Settings,
  Database,
  Bell,
  Shield,
  User,
  Clock,
  CheckCircle2,
  BookOpen,
  Heart,
  Target,
  FolderInput
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { SkeletonCard } from '@/components/SkeletonCard';
import { Progress } from '@/components/ui/progress';
import { knowledgeGraph } from '@/data/sampleClients';
import { bulkImportFolder, bulkImportRetryFailed, type BulkImportResult, type ImportProgress } from '@/services/bulkImportService';
import { getAllClients, getRankedClients, getPushClients, getAverageConfidence, getSupportiveSpouseClients } from '@/services/clientService';
import { getAuditLog, auditEntriesToActivityLogs } from '@/services/auditService';
import { clientToDisplay } from '@/services/clientAdapter';
import type { ActivityLog } from '@/types';
import { cn } from '@/lib/utils';

type DisplayClient = ReturnType<typeof clientToDisplay>;

// Activity Type Config
const activityConfig = {
  call: { icon: Phone, color: 'bg-blue-100 text-blue-600', label: 'Call' },
  email: { icon: Mail, color: 'bg-green-100 text-green-600', label: 'Email' },
  meeting: { icon: Calendar, color: 'bg-purple-100 text-purple-600', label: 'Meeting' },
  note: { icon: FileText, color: 'bg-yellow-100 text-yellow-600', label: 'Note' },
  stage_change: { icon: TrendingUp, color: 'bg-pink-100 text-pink-600', label: 'Stage Change' },
  recommendation: { icon: MessageSquare, color: 'bg-orange-100 text-orange-600', label: 'Recommendation' },
};

// Activity Log Item
function ActivityItem({ log }: { log: ActivityLog }) {
  const config = activityConfig[log.type];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", config.color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900">{log.action}</span>
          <Badge variant="outline" className="text-xs">{config.label}</Badge>
        </div>
        <p className="text-sm text-slate-600 mt-1">{log.details}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {log.clientName}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(log.timestamp).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [clients, setClients] = useState<DisplayClient[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([getAllClients(), getAuditLog(100)])
      .then(([rawClients, auditEntries]) => {
        setClients(rawClients.map(clientToDisplay));
        const clientNameMap = Object.fromEntries(rawClients.map((c) => [c.id, c.name]));
        setActivityLogs(auditEntriesToActivityLogs(auditEntries, clientNameMap));
      })
      .catch((err) => {
        console.error(err);
        setError(String(err?.message ?? err ?? 'Failed to load data'));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleBulkImport = async () => {
    setImportRunning(true);
    setImportProgress(null);
    setImportResult(null);
    try {
      const appDir = await invoke<string>('get_app_dir');
      const basePath = `${appDir.replace(/[/\\]+$/, '')}/clients`;
      const result = await bulkImportFolder(basePath, (p) => setImportProgress(p));
      setImportResult(result);
      const [rawClients, auditEntries] = await Promise.all([
        getAllClients(),
        getAuditLog(100)
      ]);
      setClients(rawClients.map(clientToDisplay));
      const clientNameMap = Object.fromEntries(rawClients.map((c) => [c.id, c.name]));
      setActivityLogs(auditEntriesToActivityLogs(auditEntries, clientNameMap));
    } catch (err) {
      setImportResult({
        processed: 0,
        failed: 0,
        clients_created: 0,
        errors: [err instanceof Error ? err.message : String(err)],
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
      const [rawClients, auditEntries] = await Promise.all([
        getAllClients(),
        getAuditLog(100)
      ]);
      setClients(rawClients.map(clientToDisplay));
      const clientNameMap = Object.fromEntries(rawClients.map((c) => [c.id, c.name]));
      setActivityLogs(auditEntriesToActivityLogs(auditEntries, clientNameMap));
    } catch (err) {
      setImportResult({
        processed: 0,
        failed: 0,
        clients_created: 0,
        errors: [err instanceof Error ? err.message : String(err)],
        clientSummaries: []
      });
    } finally {
      setImportRunning(false);
      setImportProgress(null);
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || log.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [searchTerm, filterType, activityLogs]);

  // Activity stats
  const activityStats = useMemo(() => {
    const stats = {
      total: activityLogs.length,
      calls: activityLogs.filter(l => l.type === 'call').length,
      emails: activityLogs.filter(l => l.type === 'email').length,
      meetings: activityLogs.filter(l => l.type === 'meeting').length,
      stageChanges: activityLogs.filter(l => l.type === 'stage_change').length,
    };
    return stats;
  }, [activityLogs]);

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
      <Tabs defaultValue="activity">
        <TabsList className="mb-4">
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="import">
            <FolderInput className="h-4 w-4 mr-2" />
            Import
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
        </TabsList>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard 
              title="Total Activities" 
              value={activityStats.total} 
              icon={Activity} 
              color="#3B82F6"
            />
            <StatCard 
              title="Calls" 
              value={activityStats.calls} 
              icon={Phone} 
              color="#22C55E"
            />
            <StatCard 
              title="Emails" 
              value={activityStats.emails} 
              icon={Mail} 
              color="#F59E0B"
            />
            <StatCard 
              title="Meetings" 
              value={activityStats.meetings} 
              icon={Calendar} 
              color="#8B5CF6"
            />
            <StatCard 
              title="Stage Changes" 
              value={activityStats.stageChanges} 
              icon={TrendingUp} 
              color="#EC4899"
            />
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="call">Calls</option>
                    <option value="email">Emails</option>
                    <option value="meeting">Meetings</option>
                    <option value="note">Notes</option>
                    <option value="stage_change">Stage Changes</option>
                    <option value="recommendation">Recommendations</option>
                  </select>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest coaching interactions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <ActivityItem key={log.id} log={log} />
                ))}
                {filteredLogs.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No activities found matching your filters.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderInput className="h-5 w-5" />
                Bulk Import Client Files
              </CardTitle>
              <CardDescription>
                Import from ~/SandiBot/clients (Active, Paused, WIN, Various folders)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={handleBulkImport}
                  disabled={importRunning}
                >
                  <FolderInput className="h-4 w-4 mr-2" />
                  Import All Client Files
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRetryFailed}
                  disabled={importRunning}
                >
                  Retry Failed Only
                </Button>
              </div>
              {importRunning && importProgress && (
                <div className="space-y-2">
                  <Progress
                    value={importProgress.total > 0
                      ? (importProgress.current / importProgress.total) * 100
                      : 0}
                    className="h-2"
                  />
                  <p className="text-sm text-slate-600">
                    Processing {importProgress.current_client} ({importProgress.current} of {importProgress.total} files)
                  </p>
                </div>
              )}
              {importResult && !importRunning && (
                <div className="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="font-medium text-green-700">
                    ✓ {importResult.clients_created} clients loaded, {importResult.processed} documents processed
                  </p>
                  {importResult.failed > 0 && (
                    <p className="text-sm text-amber-700">
                      {importResult.failed} file(s) failed
                    </p>
                  )}
                  {importResult.clientSummaries.length > 0 && (
                    <div className="space-y-3">
                      <p className="font-medium text-slate-700">Per-client results (by bucket):</p>
                      {['Active', 'WIN', 'Paused', 'Various'].map((bucket) => {
                        const byBucket = importResult!.clientSummaries.filter((s) => s.bucket === bucket);
                        if (byBucket.length === 0) return null;
                        return (
                          <div key={bucket} className="space-y-2">
                            <p className="text-sm font-semibold text-slate-600">{bucket}</p>
                            <div className="space-y-1">
                              {byBucket.map((s) => (
                                <div
                                  key={s.clientId}
                                  className="flex flex-wrap items-center gap-2 text-sm p-2 rounded bg-white border border-slate-100"
                                >
                                  <span className="font-medium">{s.clientName}</span>
                                  <span className="text-slate-500">
                                    {s.processed} processed, {s.failed} failed
                                  </span>
                                  {s.succeededTypes.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {s.succeededTypes.join(', ')}
                                    </Badge>
                                  )}
                                  {(s.missingDisc || s.missingYou2 || s.missingFathom) && (
                                    <span className="text-amber-600 text-xs">
                                      Missing: {[
                                        s.missingDisc && 'DISC',
                                        s.missingYou2 && 'You2',
                                        s.missingFathom && 'Fathom'
                                      ].filter(Boolean).join(', ')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {importResult.errors.length > 0 && (
                    <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                      {importResult.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li>...and {importResult.errors.length - 10} more</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
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
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-green-600" />
                      <span className="text-green-900">Knowledge Graph</span>
                    </div>
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-green-600" />
                      <span className="text-green-900">AI Recommendations</span>
                    </div>
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
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
                      {getPushClients(clients).length}
                    </p>
                    <p className="text-sm text-green-700">PUSH Ready</p>
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
                <CardDescription>TES Client Experience Framework</CardDescription>
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
                  <p className="text-sm text-slate-500 mb-3">Last backup: Today at 3:00 AM</p>
                  <Button variant="outline" size="sm">
                    Create Backup Now
                  </Button>
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
                    <p className="text-sm text-slate-500">The Entrepreneur's Source</p>
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
                <CardTitle className="text-lg">About Sandi Bot</CardTitle>
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
      </Tabs>
    </div>
  );
}
