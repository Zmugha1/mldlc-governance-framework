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
  User,
  MessageSquare,
  BookOpen,
  TrendingUp,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { auditLog, type AuditLogEntry, type SourceCitation } from '@/data/auditLog';
import { cn } from '@/lib/utils';

// Source Badge Component
function SourceBadge({ source }: { source: SourceCitation }) {
  const colors: Record<string, string> = {
    clear_framework: 'bg-blue-100 text-blue-800 border-blue-200',
    client_profile: 'bg-green-100 text-green-800 border-green-200',
    disc_profile: 'bg-purple-100 text-purple-800 border-purple-200',
    knowledge_graph: 'bg-orange-100 text-orange-800 border-orange-200',
    coaching_script: 'bg-pink-100 text-pink-800 border-pink-200',
    pipeline_data: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    session_outline: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-2 py-1 rounded text-xs border",
      colors[source.sourceType] || 'bg-slate-100 text-slate-800 border-slate-200'
    )}>
      <BookOpen className="h-3 w-3" />
      <span className="font-medium">{source.sourceName}</span>
      {source.sourceSection && <span className="opacity-75">• {source.sourceSection}</span>}
      <span className="ml-1 px-1.5 py-0.5 bg-white/50 rounded-full">
        {source.relevanceScore}%
      </span>
    </div>
  );
}

// Log Entry Card
function LogEntryCard({ entry, onClick }: { entry: AuditLogEntry; onClick: () => void }) {
  const typeColors: Record<string, string> = {
    chat_query: 'bg-blue-50 border-blue-200',
    chat_response: 'bg-green-50 border-green-200',
    source_citation: 'bg-purple-50 border-purple-200',
    recommendation_generated: 'bg-orange-50 border-orange-200',
    client_data_accessed: 'bg-cyan-50 border-cyan-200',
    script_copied: 'bg-pink-50 border-pink-200',
    score_submitted: 'bg-yellow-50 border-yellow-200',
    setting_changed: 'bg-slate-50 border-slate-200',
    export_initiated: 'bg-red-50 border-red-200',
  };
  
  const typeIcons: Record<string, React.ElementType> = {
    chat_query: MessageSquare,
    chat_response: MessageSquare,
    source_citation: BookOpen,
    recommendation_generated: TrendingUp,
    client_data_accessed: User,
    script_copied: FileText,
    score_submitted: CheckCircle2,
    setting_changed: Shield,
    export_initiated: Download,
  };
  
  const Icon = typeIcons[entry.type] || FileText;
  
  return (
    <div 
      className={cn(
        "p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all",
        typeColors[entry.type] || 'bg-slate-50 border-slate-200'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-white/50 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs capitalize">
              {entry.type.replace(/_/g, ' ')}
            </Badge>
            <span className="text-xs text-slate-500">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </div>
          
          {entry.query && (
            <p className="text-sm font-medium text-slate-900 mt-2 truncate">
              Q: {entry.query}
            </p>
          )}
          
          {entry.response && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              A: {entry.response.substring(0, 100)}...
            </p>
          )}
          
          {entry.clientName && (
            <p className="text-xs text-slate-500 mt-2">
              Client: {entry.clientName}
            </p>
          )}
          
          {entry.sourcesCited && entry.sourcesCited.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.sourcesCited.slice(0, 3).map((source, i) => (
                <SourceBadge key={i} source={source} />
              ))}
              {entry.sourcesCited.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{entry.sourcesCited.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <Eye className="h-4 w-4 text-slate-400 shrink-0" />
      </div>
    </div>
  );
}

// Log Detail Modal
function LogDetailModal({ entry, isOpen, onClose }: { 
  entry: AuditLogEntry | null; 
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
            Entry ID: {entry.id} • Session: {entry.sessionId}
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
                  <p className="text-xs text-slate-500">Type</p>
                  <p className="font-medium capitalize">{entry.type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Timestamp</p>
                  <p className="font-medium">{new Date(entry.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">User</p>
                  <p className="font-medium">{entry.userName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Module</p>
                  <p className="font-medium">{entry.module}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Query & Response */}
          {entry.query && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">Query</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{entry.query}</p>
              </CardContent>
            </Card>
          )}
          
          {entry.response && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">Response</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-wrap">{entry.response}</p>
              </CardContent>
            </Card>
          )}
          
          {/* Sources Cited */}
          {entry.sourcesCited && entry.sourcesCited.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Sources Cited ({entry.sourcesCited.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {entry.sourcesCited.map((source, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <SourceBadge source={source} />
                    </div>
                    {source.excerpt && (
                      <p className="text-sm text-slate-600 italic">"{source.excerpt}"</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          {/* Recommendation Details */}
          {entry.recommendation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">AI Recommendation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    entry.recommendation === 'PUSH' ? 'bg-green-500' :
                    entry.recommendation === 'NURTURE' ? 'bg-yellow-500' :
                    'bg-slate-500'
                  )}>
                    {entry.recommendation}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    Confidence: {entry.confidenceScore}%
                  </span>
                </div>
                {entry.reasoningFactors && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Reasoning Factors:</p>
                    <ul className="space-y-1">
                      {entry.reasoningFactors.map((factor, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-slate-500">Entry ID:</span> {entry.id}</p>
              <p><span className="text-slate-500">Session ID:</span> {entry.sessionId}</p>
              {entry.ipAddress && <p><span className="text-slate-500">IP Address:</span> {entry.ipAddress}</p>}
              {entry.userAgent && <p><span className="text-slate-500">User Agent:</span> {entry.userAgent}</p>}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Transparency Metrics Component
function TransparencyMetrics() {
  const [report, setReport] = useState(auditLog.getTransparencyReport());
  
  useEffect(() => {
    setReport(auditLog.getTransparencyReport());
  }, []);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{report.totalQueries}</p>
              <p className="text-xs text-slate-500">Total Queries</p>
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
              <p className="text-2xl font-bold">{report.totalResponses}</p>
              <p className="text-xs text-slate-500">Responses Generated</p>
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
              <p className="text-2xl font-bold">{report.averageSourcesPerResponse.toFixed(1)}</p>
              <p className="text-xs text-slate-500">Avg Sources/Response</p>
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
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [report, setReport] = useState(auditLog.getTransparencyReport());
  
  useEffect(() => {
    refreshLogs();
  }, [filterType, searchTerm]);
  
  const refreshLogs = () => {
    const filtered = auditLog.getLogs({
      type: filterType === 'all' ? undefined : filterType as any,
    }).filter(log => 
      searchTerm === '' || 
      log.query?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.response?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setLogs(filtered);
    setReport(auditLog.getTransparencyReport());
  };
  
  const handleExport = () => {
    const csv = auditLog.exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandi_bot_audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    auditLog.log({
      userId: 'sandy',
      userName: 'Sandy Stahl',
      type: 'export_initiated',
      module: 'Audit Transparency',
      query: 'Export audit log to CSV',
      response: 'Audit log exported successfully',
    });
  };
  
  const handleClear = () => {
    if (confirm('Are you sure you want to clear all audit logs? This cannot be undone.')) {
      auditLog.clear();
      refreshLogs();
    }
  };
  
  const handleLogClick = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };
  
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
                    <option value="chat_query">Chat Queries</option>
                    <option value="chat_response">Chat Responses</option>
                    <option value="source_citation">Source Citations</option>
                    <option value="recommendation_generated">Recommendations</option>
                    <option value="client_data_accessed">Client Data</option>
                    <option value="script_copied">Script Copies</option>
                    <option value="score_submitted">Scores</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={refreshLogs}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" className="text-red-600" onClick={handleClear}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Log Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {logs.length} log entries
            </p>
            <Badge variant="outline">
              <Shield className="h-3 w-3 mr-1" />
              Audit Mode Active
            </Badge>
          </div>
          
          {/* Log List */}
          <div className="space-y-3">
            {logs.map((log) => (
              <LogEntryCard 
                key={log.id} 
                entry={log} 
                onClick={() => handleLogClick(log)} 
              />
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No audit logs found.</p>
                <p className="text-sm">Logs will appear as you use the coaching assistant.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <TransparencyMetrics />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Query Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Query Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.queryCategories.map((cat, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-sm w-32">{cat.category}</span>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(cat.count / Math.max(...report.queryCategories.map(c => c.count))) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Confidence Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommendation Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.confidenceDistribution.map((dist, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-sm w-24">{dist.range}%</span>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              dist.range === '90-100' ? 'bg-green-500' :
                              dist.range === '70-89' ? 'bg-blue-500' :
                              dist.range === '50-69' ? 'bg-yellow-500' :
                              'bg-red-500'
                            )}
                            style={{ width: `${(dist.count / Math.max(...report.confidenceDistribution.map(d => d.count), 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium">{dist.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Most Cited Sources</CardTitle>
              <CardDescription>Sources referenced in AI responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.mostCitedSources.map((source, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                    <span className="text-lg font-bold text-slate-400 w-8">#{i + 1}</span>
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium">{source.sourceName}</p>
                    </div>
                    <Badge>{source.count} citations</Badge>
                  </div>
                ))}
                {report.mostCitedSources.length === 0 && (
                  <p className="text-center text-slate-500 py-8">
                    No sources have been cited yet. Start using the coaching assistant to generate citations.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
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
      
      {/* Log Detail Modal */}
      <LogDetailModal 
        entry={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
  