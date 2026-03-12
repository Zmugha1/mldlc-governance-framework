// Sandy Stahl Coaching Intelligence - Audit & Logging System
// Tracks all chat interactions with source citations for transparency

import type { Client } from '@/types';

// ============================================
// AUDIT LOG ENTRY TYPES
// ============================================

export type LogEntryType = 
  | 'chat_query'           // User asked a question
  | 'chat_response'        // Bot provided a response
  | 'source_citation'      // Source was cited in response
  | 'recommendation_generated' // AI recommendation was generated
  | 'client_data_accessed' // Client data was viewed
  | 'script_copied'        // Coaching script was copied
  | 'score_submitted'      // CLEAR score was submitted
  | 'setting_changed'      // Settings were modified
  | 'export_initiated';    // Data export was initiated

// ============================================
// SOURCE CITATION
// ============================================

export interface SourceCitation {
  id: string;
  sourceType: 'clear_framework' | 'client_profile' | 'disc_profile' | 'knowledge_graph' | 'coaching_script' | 'pipeline_data' | 'session_outline';
  sourceName: string;
  sourceSection?: string;
  relevanceScore: number; // 0-100 how relevant this source was
  excerpt?: string; // Relevant excerpt from source
}

// ============================================
// AUDIT LOG ENTRY
// ============================================

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string; // Sandy's ID or system
  userName: string;
  type: LogEntryType;
  
  // For chat interactions
  query?: string;
  response?: string;
  
  // For client-related actions
  clientId?: string;
  clientName?: string;
  
  // Source citations for transparency
  sourcesCited?: SourceCitation[];
  
  // For recommendations
  recommendation?: 'PUSH' | 'NURTURE' | 'PAUSE';
  confidenceScore?: number;
  reasoningFactors?: string[];
  
  // Metadata
  module: string; // Which module the action occurred in
  sessionId: string; // Browser session ID
  ipAddress?: string; // For security audit
  userAgent?: string; // Browser info
}

// ============================================
// TRANSPARENCY REPORT
// ============================================

export interface TransparencyReport {
  totalQueries: number;
  totalResponses: number;
  averageSourcesPerResponse: number;
  mostCitedSources: { sourceName: string; count: number }[];
  queryCategories: { category: string; count: number }[];
  confidenceDistribution: { range: string; count: number }[];
}

// ============================================
// AUDIT LOG STORE (In-memory for demo, would be DB in production)
// ============================================

class AuditLogStore {
  private logs: AuditLogEntry[] = [];
  private sessionId: string;
  
  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Load any existing logs from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sandi_bot_audit_log');
      if (saved) {
        try {
          this.logs = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to load audit log:', e);
        }
      }
    }
  }
  
  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sandi_bot_audit_log', JSON.stringify(this.logs.slice(-500))); // Keep last 500
    }
  }
  
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'sessionId'> & { details?: string }): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };
    
    this.logs.push(fullEntry);
    this.save();
    
    // Also log to console for development
    console.log('[AUDIT]', fullEntry.type, fullEntry.query || fullEntry.response);
    
    return fullEntry;
  }
  
  getLogs(filters?: {
    type?: LogEntryType;
    clientId?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
  }): AuditLogEntry[] {
    let filtered = [...this.logs];
    
    if (filters?.type) {
      filtered = filtered.filter(l => l.type === filters.type);
    }
    if (filters?.clientId) {
      filtered = filtered.filter(l => l.clientId === filters.clientId);
    }
    if (filters?.module) {
      filtered = filtered.filter(l => l.module === filters.module);
    }
    if (filters?.startDate) {
      filtered = filtered.filter(l => l.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter(l => l.timestamp <= filters.endDate!);
    }
    
    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  getTransparencyReport(): TransparencyReport {
    const chatResponses = this.logs.filter(l => l.type === 'chat_response');
    
    // Count sources
    const sourceCounts: Record<string, number> = {};
    chatResponses.forEach(r => {
      r.sourcesCited?.forEach(s => {
        sourceCounts[s.sourceName] = (sourceCounts[s.sourceName] || 0) + 1;
      });
    });
    
    // Count query categories
    const queryCategories: Record<string, number> = {};
    this.logs.filter(l => l.type === 'chat_query').forEach(q => {
      const category = this.categorizeQuery(q.query || '');
      queryCategories[category] = (queryCategories[category] || 0) + 1;
    });
    
    // Confidence distribution
    const confidenceRanges = { '90-100': 0, '70-89': 0, '50-69': 0, 'Below 50': 0 };
    this.logs.filter(l => l.type === 'recommendation_generated').forEach(r => {
      const score = r.confidenceScore || 0;
      if (score >= 90) confidenceRanges['90-100']++;
      else if (score >= 70) confidenceRanges['70-89']++;
      else if (score >= 50) confidenceRanges['50-69']++;
      else confidenceRanges['Below 50']++;
    });
    
    const totalSources = chatResponses.reduce(
      (sum, r) => sum + (r.sourcesCited?.length || 0), 0
    );
    
    return {
      totalQueries: this.logs.filter(l => l.type === 'chat_query').length,
      totalResponses: chatResponses.length,
      averageSourcesPerResponse: chatResponses.length > 0 
        ? totalSources / chatResponses.length 
        : 0,
      mostCitedSources: Object.entries(sourceCounts)
        .map(([name, count]) => ({ sourceName: name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      queryCategories: Object.entries(queryCategories)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      confidenceDistribution: Object.entries(confidenceRanges)
        .map(([range, count]) => ({ range, count })),
    };
  }
  
  categorizeQuery(query: string): string {
    const lower = query.toLowerCase();
    if (lower.includes('push') || lower.includes('pause') || lower.includes('nurture')) {
      return 'Recommendation';
    }
    if (lower.includes('say') || lower.includes('script') || lower.includes('talk')) {
      return 'Scripts';
    }
    if (lower.includes('homework') || lower.includes('assignment')) {
      return 'Homework';
    }
    if (lower.includes('spouse') || lower.includes('partner') || lower.includes('family')) {
      return 'Spouse Concerns';
    }
    if (lower.includes('pink flag') || lower.includes('red flag') || lower.includes('warning')) {
      return 'Pink Flags';
    }
    if (lower.includes('disc') || lower.includes('style') || lower.includes('profile')) {
      return 'DISC Profile';
    }
    if (lower.includes('clear') || lower.includes('framework')) {
      return 'CLEAR Framework';
    }
    return 'General';
  }
  
  exportToCSV(): string {
    const headers = ['Timestamp', 'User', 'Type', 'Module', 'Client', 'Query', 'Response', 'Sources Cited', 'Confidence'];
    const rows = this.logs.map(log => [
      log.timestamp,
      log.userName,
      log.type,
      log.module,
      log.clientName || '',
      log.query || '',
      log.response || '',
      log.sourcesCited?.map(s => s.sourceName).join('; ') || '',
      log.confidenceScore?.toString() || '',
    ]);
    
    return [headers.join(','), ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
  }
  
  clear() {
    this.logs = [];
    this.save();
  }
}

// Singleton instance
export const auditLog = new AuditLogStore();

// ============================================
// SOURCE CITATION HELPERS
// ============================================

export function generateSourceCitations(
  query: string,
  client?: Client
): SourceCitation[] {
  const citations: SourceCitation[] = [];
  const lowerQuery = query.toLowerCase();
  
  // CLEAR Framework citations
  if (lowerQuery.includes('curiosity') || lowerQuery.includes('question')) {
    citations.push({
      id: `src_${Date.now()}_1`,
      sourceType: 'clear_framework',
      sourceName: 'CLEAR Coaching Playbook',
      sourceSection: 'Curiosity',
      relevanceScore: 95,
      excerpt: 'Curiosity is the antidote to assumptions. Opens conversation and true connections.',
    });
  }
  
  if (lowerQuery.includes('locating') || lowerQuery.includes('where')) {
    citations.push({
      id: `src_${Date.now()}_2`,
      sourceType: 'clear_framework',
      sourceName: 'CLEAR Coaching Playbook',
      sourceSection: 'Locating',
      relevanceScore: 90,
      excerpt: 'Ask high-level, open-ended questions to find out where the other person\'s head is at.',
    });
  }
  
  if (lowerQuery.includes('engagement') || lowerQuery.includes('follow up')) {
    citations.push({
      id: `src_${Date.now()}_3`,
      sourceType: 'clear_framework',
      sourceName: 'CLEAR Coaching Playbook',
      sourceSection: 'Engagement',
      relevanceScore: 92,
      excerpt: 'Use 1-3 exact words they spoke in your question. The Key is Three.',
    });
  }
  
  if (lowerQuery.includes('accountability') || lowerQuery.includes('next step')) {
    citations.push({
      id: `src_${Date.now()}_4`,
      sourceType: 'clear_framework',
      sourceName: 'CLEAR Coaching Playbook',
      sourceSection: 'Accountability',
      relevanceScore: 88,
      excerpt: 'Ask WHAT and BY WHEN—follow up at the next meeting.',
    });
  }
  
  if (lowerQuery.includes('reflection') || lowerQuery.includes('a-ha') || lowerQuery.includes('insight')) {
    citations.push({
      id: `src_${Date.now()}_5`,
      sourceType: 'clear_framework',
      sourceName: 'CLEAR Coaching Playbook',
      sourceSection: 'Reflection',
      relevanceScore: 91,
      excerpt: 'Ask at the END: "What insight or a-ha did you gain today?"',
    });
  }
  
  // Client profile citations
  if (client) {
    if (lowerQuery.includes('push') || lowerQuery.includes('pause') || lowerQuery.includes('recommendation')) {
      citations.push({
        id: `src_${Date.now()}_client`,
        sourceType: 'client_profile',
        sourceName: `${client.name}'s Profile`,
        sourceSection: 'Readiness Assessment',
        relevanceScore: 98,
        excerpt: `Readiness: ${Math.round(Object.values(client.readiness).reduce((a, b) => a + b, 0) / 20 * 100)}%, Persona: ${client.persona}, Stage: ${client.stage}`,
      });
    }
    
    if (lowerQuery.includes('disc') || lowerQuery.includes('style')) {
      citations.push({
        id: `src_${Date.now()}_disc`,
        sourceType: 'disc_profile',
        sourceName: `${client.name}'s DISC Assessment`,
        sourceSection: `${client.disc.style} Style`,
        relevanceScore: 96,
        excerpt: `${client.disc.description}. Key traits: ${client.disc.traits.slice(0, 3).join(', ')}`,
      });
    }
    
    if (lowerQuery.includes('spouse') || lowerQuery.includes('partner')) {
      citations.push({
        id: `src_${Date.now()}_spouse`,
        sourceType: 'client_profile',
        sourceName: `${client.name}'s TUMAY Profile`,
        sourceSection: 'Spouse Information',
        relevanceScore: 94,
        excerpt: `Spouse: ${client.tumay.spouse.name}, Supportive: ${client.tumay.spouse.supportive ? 'Yes' : 'No'}`,
      });
    }
    
    if (lowerQuery.includes('blocker') || lowerQuery.includes('concern') || lowerQuery.includes('issue')) {
      const blockers = client.fathomNotes.flatMap(n => n.blockers);
      if (blockers.length > 0) {
        citations.push({
          id: `src_${Date.now()}_blockers`,
          sourceType: 'client_profile',
          sourceName: `${client.name}'s Fathom Notes`,
          sourceSection: 'Blockers',
          relevanceScore: 93,
          excerpt: `Key blockers: ${blockers.join(', ')}`,
        });
      }
    }
  }
  
  // Pink flags
  if (lowerQuery.includes('pink flag') || lowerQuery.includes('warning')) {
    citations.push({
      id: `src_${Date.now()}_pink`,
      sourceType: 'knowledge_graph',
      sourceName: 'Client Experience Chart',
      sourceSection: 'Pink Flags',
      relevanceScore: 89,
      excerpt: 'Pink Flags are indicators of potential coaching opportunities.',
    });
  }
  
  // Sort by relevance
  return citations.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ============================================
// RESPONSE EXPLANATION GENERATOR
// ============================================

export function generateResponseExplanation(
  query: string,
  _response: string,
  sources: SourceCitation[],
  client?: Client
): string {
  const parts: string[] = [];
  
  parts.push('## How this response was generated:\n');
  
  // Query analysis
  parts.push(`**Query Type:** ${auditLog.categorizeQuery(query)}`);
  
  // Sources used
  parts.push(`\n**Sources Consulted (${sources.length}):**`);
  sources.forEach((source, i) => {
    parts.push(`${i + 1}. ${source.sourceName}${source.sourceSection ? ` - ${source.sourceSection}` : ''} (Relevance: ${source.relevanceScore}%)`);
  });
  
  // Client data if applicable
  if (client) {
    parts.push(`\n**Client Data Used:**`);
    parts.push(`- DISC Style: ${client.disc.style}`);
    parts.push(`- Current Stage: ${client.stage}`);
    parts.push(`- Persona: ${client.persona}`);
    parts.push(`- Overall Readiness: ${Math.round(Object.values(client.readiness).reduce((a, b) => a + b, 0) / 20 * 100)}%`);
  }
  
  // Methodology
  parts.push(`\n**Methodology:**`);
  parts.push('This response was generated using the CLEAR Coaching Framework and TES Client Experience methodology.');
  
  return parts.join('\n');
}

export default auditLog;
