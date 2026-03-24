import { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Search, 
  Download, 
  Filter,
  Eye,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SkeletonCard } from '@/components/SkeletonCard';
import { getAuditLog } from '@/services/auditService';
import type { AuditEntry } from '@/types';
import { cn } from '@/lib/utils';

// Audit entry card for DB audit_log
function AuditEntryCard({
  entry,
  onClick,
}: {
  entry: AuditEntry;
  onClick: () => void;
}) {
  return (
    <div
      className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all bg-slate-50 border-slate-200"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs capitalize">
              {entry.action_type.replace(/_/g, ' ')}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {entry.model_used || 'deterministic'}
            </Badge>
            <span className="text-xs text-slate-500">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </div>
          {entry.client_id && (
            <p className="text-xs text-slate-500 mt-2">Client ID: {entry.client_id}</p>
          )}
          {entry.output_data && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              Output: {String(entry.output_data).substring(0, 100)}
              {String(entry.output_data).length > 100 ? '...' : ''}
            </p>
          )}
          {entry.reasoning && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              {entry.reasoning.substring(0, 150)}
              {entry.reasoning.length > 150 ? '...' : ''}
            </p>
          )}
        </div>
        <Eye className="h-4 w-4 text-slate-400 shrink-0" />
      </div>
    </div>
  );
}

// Audit Entry Detail Modal
function AuditEntryDetailModal({ entry, isOpen, onClose }: { 
  entry: AuditEntry | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  if (!entry) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Audit Log Entry
          </DialogTitle>
          <DialogDescription>
            Entry ID: {entry.id} • Action: {entry.action_type}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">Entry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Action Type</p>
                  <p className="font-medium capitalize">{entry.action_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Timestamp</p>
                  <p className="font-medium">{new Date(entry.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Model Used</p>
                  <p className="font-medium">{entry.model_used || 'deterministic'}</p>
                </div>
                {entry.client_id && (
                  <div>
                    <p className="text-xs text-slate-500">Client ID</p>
                    <p className="font-medium font-mono text-sm">{entry.client_id}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Input Data */}
          {entry.input_data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">Input Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-wrap font-mono text-sm">{entry.input_data}</p>
              </CardContent>
            </Card>
          )}
          
          {/* Output Data */}
          {entry.output_data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">Output</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-wrap">{entry.output_data}</p>
              </CardContent>
            </Card>
          )}
          
          {/* Reasoning */}
          {entry.reasoning && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">Reasoning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-wrap">{entry.reasoning}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Transparency Metrics Component (computed from audit entries)
function TransparencyMetrics({ entries }: { entries: AuditEntry[] }) {
  const totalEntries = entries.length;
  const byActionType = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.action_type] = (acc[e.action_type] || 0) + 1;
    return acc;
  }, {});
  const byModel = entries.reduce<Record<string, number>>((acc, e) => {
    const m = e.model_used || 'deterministic';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalEntries}</p>
              <p className="text-xs text-slate-500">Total Entries</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{byActionType['RECOMMENDATION'] ?? 0}</p>
              <p className="text-xs text-slate-500">Recommendations</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Object.keys(byModel).length}</p>
              <p className="text-xs text-slate-500">Models Used</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">100%</p>
              <p className="text-xs text-slate-500">Traceable</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditTransparency() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const refreshLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await getAuditLog(200);
      setLogs(entries);
    } catch (err) {
      console.error('Failed to load audit log:', err);
      const errMessage = (err as Record<string, unknown>)?.message;
      setError(String(errMessage ?? err ?? 'Failed to load audit log'));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    refreshLogs();
  }, []);
  
  const handleExport = () => {
    const headers = ['ID', 'Timestamp', 'Action Type', 'Client ID', 'Input Data', 'Output Data', 'Reasoning', 'Model Used'];
    const rows = logs.map(e => [
      e.id,
      e.timestamp,
      e.action_type,
      e.client_id ?? '',
      (e.input_data ?? '').replace(/"/g, '""'),
      (e.output_data ?? '').replace(/"/g, '""'),
      (e.reasoning ?? '').replace(/"/g, '""'),
      e.model_used ?? 'deterministic',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandi_bot_audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleLogClick = (log: AuditEntry) => {
    setSelectedLog(log);
    setIsModalOpen(true);
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

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.action_type !== filterType) return false;
    if (searchTerm === '') return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action_type?.toLowerCase().includes(term) ||
      log.client_id?.toLowerCase().includes(term) ||
      String(log.input_data ?? '').toLowerCase().includes(term) ||
      String(log.output_data ?? '').toLowerCase().includes(term) ||
      String(log.reasoning ?? '').toLowerCase().includes(term) ||
      String(log.model_used ?? '').toLowerCase().includes(term)
    );
  });
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="logs">
        <TabsList className="mb-4">
          <TabsTrigger value="logs">
            <FileText className="h-4 w-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Transparency Metrics
          </TabsTrigger>
          <TabsTrigger value="sources">
            <BookOpen className="h-4 w-4 mr-2" />
            Source Usage
          </TabsTrigger>
        </TabsList>
        
        {/* Audit Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search logs..."
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
                    <option value="RECOMMENDATION">Recommendations</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={refreshLogs} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={handleExport} disabled={logs.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Log Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {filteredLogs.length} log entries
            </p>
            <Badge variant="outline">
              <Shield className="h-3 w-3 mr-1" />
              Audit Mode Active
            </Badge>
          </div>
          
          {/* Log List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-500">
                <RefreshCw className="h-12 w-12 mx-auto mb-3 animate-spin opacity-50" />
                <p>Loading audit log...</p>
              </div>
            ) : (
              <>
                {filteredLogs.map((log) => (
                  <AuditEntryCard 
                    key={log.id} 
                    entry={log} 
                    onClick={() => handleLogClick(log)} 
                  />
                ))}
                {filteredLogs.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No audit entries yet.</p>
                    <p className="text-sm">Actions will appear here as you use the system.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
        
        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <TransparencyMetrics entries={logs} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Action Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Action Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    logs.reduce<Record<string, number>>((acc, e) => {
                      acc[e.action_type] = (acc[e.action_type] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([action, count]) => (
                    <div key={action} className="flex items-center gap-4">
                      <span className="text-sm w-32 capitalize">{action.replace(/_/g, ' ')}</span>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${logs.length > 0 ? (count / logs.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-sm text-slate-500">No entries yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Model Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    logs.reduce<Record<string, number>>((acc, e) => {
                      const m = e.model_used || 'deterministic';
                      acc[m] = (acc[m] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([model, count]) => (
                    <div key={model} className="flex items-center gap-4">
                      <span className="text-sm w-32">{model}</span>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${logs.length > 0 ? (count / logs.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-sm text-slate-500">No entries yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Knowledge Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: 'CLEAR Coaching Playbook', type: 'Framework', sections: ['Curiosity', 'Locating', 'Engagement', 'Accountability', 'Reflection'] },
                  { name: 'Client Experience Chart', type: 'Process', sections: ['5 Compartments', 'Pink Flags', 'Milestones'] },
                  { name: 'Session Outlines', type: 'Process', sections: ['IC', 'C1', 'C2', 'C3', 'C4'] },
                  { name: 'DISC Profiles', type: 'Assessment', sections: ['D', 'I', 'S', 'C'] },
                  { name: 'Client Profiles', type: 'Data', sections: ['DISC', 'You 2.0', 'TUMAY', 'Vision', 'Fathom'] },
                  { name: 'Coaching Scripts', type: 'Content', sections: ['Opening', 'Discovery', 'Objection', 'Close'] },
                ].map((source, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{source.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs mb-2">{source.type}</Badge>
                    <p className="text-xs text-slate-500">
                      Sections: {source.sections.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Audit Entry Detail Modal */}
      <AuditEntryDetailModal 
        entry={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
  