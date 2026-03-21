import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Sparkles,
  ArrowUp,
  Heart,
  Pause,
  Copy,
  Check,
  Target,
  Zap,
  BookOpen,
  HelpCircle,
  Shield,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SkeletonCard } from '@/components/SkeletonCard';
import { coachingScripts, recommendationConfig, knowledgeGraph } from '@/data/sampleClients';
import { generateSourceCitations, generateResponseExplanation, type SourceCitation } from '@/data/auditLog';
import { dbSelect } from '@/services/db';
import { logEntry } from '@/services/auditService';
import { getDiscCoachingTips, getHomeworkByStage, getPinkFlagsByStage, calculateReadinessScore } from '@/services/coachingService';
import { getRecommendationMessage } from '@/services/recommendationService';
import { cn } from '@/lib/utils';

type ActiveClient = {
  id: string;
  name: string;
};

type CoachingContext = {
  id: string;
  name: string;
  inferred_stage: string;
  natural_d: number;
  natural_i: number;
  natural_s: number;
  natural_c: number;
  one_year_vision: string;
  dangers: string[];
  opportunities: string[];
  areas_of_interest: string[];
  financial_net_worth_range: string;
};

// Chat Message Component with Source Citations
interface ChatMessageProps {
  type: 'user' | 'bot';
  content: string;
  sources?: SourceCitation[];
  onShowSources?: () => void;
  onShowExplanation?: () => void;
}

function ChatMessage({ type, content, sources, onShowSources, onShowExplanation }: ChatMessageProps) {
  const isBot = type === 'bot';
  
  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isBot ? "" : "flex-row-reverse"
    )}>
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
        isBot ? "bg-gradient-to-br from-blue-500 to-purple-600" : "bg-slate-200"
      )}>
        {isBot ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-slate-600" />}
      </div>
      <div className="flex-1 max-w-[80%]">
        <div className={cn(
          "rounded-2xl px-4 py-3",
          isBot 
            ? "bg-white border border-slate-200 rounded-tl-none" 
            : "bg-blue-600 text-white rounded-tr-none"
        )}>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
        
        {/* Source Citations for Bot Messages */}
        {isBot && sources && sources.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs text-slate-500 hover:text-blue-600"
                    onClick={onShowSources}
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    {sources.length} sources
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View sources cited in this response</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs text-slate-500 hover:text-blue-600"
                    onClick={onShowExplanation}
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Why this response?
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>See how this response was generated</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Shield className="h-3 w-3" />
                    <span>Audited</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This interaction has been logged for audit</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}

// Source Citation Dialog
function SourceDialog({ sources, isOpen, onClose }: { 
  sources: SourceCitation[]; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const sourceColors: Record<string, string> = {
    clear_framework: 'bg-blue-50 border-blue-200',
    client_profile: 'bg-green-50 border-green-200',
    disc_profile: 'bg-purple-50 border-purple-200',
    knowledge_graph: 'bg-orange-50 border-orange-200',
    coaching_script: 'bg-pink-50 border-pink-200',
    pipeline_data: 'bg-cyan-50 border-cyan-200',
    session_outline: 'bg-yellow-50 border-yellow-200',
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Sources Cited
          </DialogTitle>
          <DialogDescription>
            These sources were consulted to generate the response
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {sources.map((source, i) => (
            <div 
              key={i} 
              className={cn(
                "p-4 rounded-lg border",
                sourceColors[source.sourceType] || 'bg-slate-50 border-slate-200'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {source.sourceType.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-sm font-medium">{source.sourceName}</span>
                </div>
                <Badge className="bg-blue-500 text-white">
                  {source.relevanceScore}% relevance
                </Badge>
              </div>
              
              {source.sourceSection && (
                <p className="text-xs text-slate-500 mb-2">
                  Section: {source.sourceSection}
                </p>
              )}
              
              {source.excerpt && (
                <div className="mt-2 p-2 bg-white/50 rounded">
                  <p className="text-xs text-slate-600 italic">
                    "{source.excerpt}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Explanation Dialog
function ExplanationDialog({ 
  query, 
  response, 
  sources, 
  isOpen, 
  onClose 
}: { 
  query: string;
  response: string;
  sources: SourceCitation[];
  isOpen: boolean; 
  onClose: () => void;
}) {
  const explanation = generateResponseExplanation(query, response, sources, undefined);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            How This Response Was Generated
          </DialogTitle>
          <DialogDescription>
            Transparency report for this AI-generated response
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="p-4 bg-slate-50 rounded-lg whitespace-pre-wrap text-sm">
            {explanation}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function deriveStyleLabel(d: number, i: number, s: number, c: number): string {
  const scores: Record<string, number> = {
    D: Number(d ?? 0),
    I: Number(i ?? 0),
    S: Number(s ?? 0),
    C: Number(c ?? 0),
  };
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = sorted[0]?.[0] ?? 'D';
  const second = sorted[1]?.[0] ?? 'I';
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
    D: 'Driver',
    I: 'Influencer',
    S: 'Supporter',
    C: 'Analyzer',
  };
  return labels[`${top}${second}`] ?? labels[top] ?? `High ${top}`;
}

function parseJsonList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return raw.split('\n').map((s) => s.trim()).filter(Boolean);
  }
}

// Script Card with Copy
function ScriptCard({ script }: { script: typeof coachingScripts[0] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(script.content);
    setCopied(true);
    
    void logEntry(
      'SCRIPT_COPIED',
      null,
      `Copy script: ${script.title}`,
      'Script copied to clipboard',
      null,
      'deterministic'
    );
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{script.title}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{script.persona}</Badge>
              <Badge variant="secondary">{script.stage}</Badge>
              <Badge variant="outline" className="capitalize">{script.category}</Badge>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-sm text-slate-700 italic">"{script.content}"</p>
        </div>
      </CardContent>
    </Card>
  );
}

// CLEAR Framework Display
function CLEARFramework() {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h4 className="font-semibold text-blue-900 mb-2">{knowledgeGraph.clearFramework.name}</h4>
        <p className="text-sm text-blue-700">{knowledgeGraph.clearFramework.description}</p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="curiosity">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">C</span>
              Curiosity
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-slate-600 mb-2">{knowledgeGraph.clearFramework.curiosity.description}</p>
            <ul className="space-y-1">
              {knowledgeGraph.clearFramework.curiosity.keyPoints.map((point, i) => (
                <li key={i} className="text-xs text-slate-500 flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="locating">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">L</span>
              Locating
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-slate-600 mb-2">{knowledgeGraph.clearFramework.locating.description}</p>
            <ul className="space-y-1">
              {knowledgeGraph.clearFramework.locating.keyPoints.map((point, i) => (
                <li key={i} className="text-xs text-slate-500 flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="engagement">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center">E</span>
              Engagement
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-slate-600 mb-2">{knowledgeGraph.clearFramework.engagement.description}</p>
            <ul className="space-y-1">
              {knowledgeGraph.clearFramework.engagement.keyPoints.map((point, i) => (
                <li key={i} className="text-xs text-slate-500 flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="accountability">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center">A</span>
              Accountability
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-slate-600 mb-2">{knowledgeGraph.clearFramework.accountability.description}</p>
            <ul className="space-y-1">
              {knowledgeGraph.clearFramework.accountability.keyPoints.map((point, i) => (
                <li key={i} className="text-xs text-slate-500 flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="reflection">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">R</span>
              Reflection
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-slate-600 mb-2">{knowledgeGraph.clearFramework.reflection.description}</p>
            <div className="space-y-1">
              {knowledgeGraph.clearFramework.reflection.prompts.slice(0, 4).map((prompt, i) => (
                <p key={i} className="text-xs text-slate-500 italic">"{prompt}"</p>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// Quick Actions
const quickActions = [
  { label: 'Should I push or pause?', icon: Zap },
  { label: 'What homework should I give?', icon: BookOpen },
  { label: 'What should I say on the call?', icon: MessageSquare },
  { label: 'Financial angle?', icon: Target },
  { label: 'Handle spouse concerns', icon: Heart },
  { label: 'Address pink flags', icon: HelpCircle },
];

export default function LiveCoachingAssistant() {
  const [clients, setClients] = useState<ActiveClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<CoachingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    type: 'user' | 'bot';
    content: string;
    sources?: SourceCitation[];
  }>>([
    { 
      type: 'bot', 
      content: `Hello! I'm Coach Bot, your AI coaching assistant powered by the CLEAR framework. All my responses cite their sources for full transparency and auditability.\n\nSelect a client to get personalized recommendations with full source citations.` 
    }
  ]);
  const [input, setInput] = useState('');
  const [showSources, setShowSources] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentSources, setCurrentSources] = useState<SourceCitation[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentResponse, setCurrentResponse] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    dbSelect<ActiveClient>(
      `SELECT id, name FROM clients
       WHERE outcome_bucket = 'active'
       ORDER BY name`,
      []
    )
      .then((rows) => setClients(rows))
      .catch((err) => {
        console.error(err);
        setError(String(err?.message ?? err ?? 'Failed to load clients'));
      })
      .finally(() => setLoading(false));
  }, []);

  const loadClientContext = async (clientId: string) => {
    const rows = await dbSelect<{
      name: string;
      inferred_stage: string | null;
      natural_d: number | null;
      natural_i: number | null;
      natural_s: number | null;
      natural_c: number | null;
      one_year_vision: string | null;
      dangers: string | null;
      opportunities: string | null;
      areas_of_interest: string | null;
      financial_net_worth_range: string | null;
    }>(
      `SELECT
        c.name, c.inferred_stage,
        dp.natural_d, dp.natural_i,
        dp.natural_s, dp.natural_c,
        y.one_year_vision,
        y.dangers, y.opportunities,
        y.areas_of_interest,
        y.financial_net_worth_range
      FROM clients c
      LEFT JOIN client_disc_profiles dp
        ON dp.client_id = c.id
      LEFT JOIN client_you2_profiles y
        ON y.client_id = c.id
      WHERE c.id = ?`,
      [clientId]
    );
    const row = rows[0];
    if (!row) {
      setSelectedContext(null);
      return;
    }
    setSelectedContext({
      id: clientId,
      name: row.name ?? 'Unknown Client',
      inferred_stage: row.inferred_stage ?? 'IC',
      natural_d: Number(row.natural_d ?? 0),
      natural_i: Number(row.natural_i ?? 0),
      natural_s: Number(row.natural_s ?? 0),
      natural_c: Number(row.natural_c ?? 0),
      one_year_vision: row.one_year_vision ?? '',
      dangers: parseJsonList(row.dangers),
      opportunities: parseJsonList(row.opportunities),
      areas_of_interest: parseJsonList(row.areas_of_interest),
      financial_net_worth_range: row.financial_net_worth_range ?? '',
    });
  };

  const sendMessage = (messageText: string) => {
    if (!messageText.trim()) return;

    const query = messageText;

    void logEntry(
      'CHAT_QUERY',
      selectedContext?.id ?? null,
      query,
      null,
      null,
      'deterministic'
    );

    // Add user message
    setMessages(prev => [...prev, { type: 'user', content: query }]);
    setCurrentQuery(query);

    // Generate sources
    const sources = generateSourceCitations(query, undefined);
    setCurrentSources(sources);

    // Generate bot response
    setTimeout(() => {
      let response = '';
      const lowerInput = query.toLowerCase();

      if (lowerInput.includes('push') || lowerInput.includes('pause')) {
        if (selectedContext) {
          const discStyle = deriveStyleLabel(
            selectedContext.natural_d,
            selectedContext.natural_i,
            selectedContext.natural_s,
            selectedContext.natural_c
          );
          response = `Based on ${selectedContext.name}'s profile:\n\n• Current stage: ${selectedContext.inferred_stage}\n• DISC style: ${discStyle}\n• Vision: ${selectedContext.one_year_vision || 'No statement yet'}\n• Key dangers: ${selectedContext.dangers.length}\n• Key opportunities: ${selectedContext.opportunities.length}\n\nUse CLEAR to guide next actions and commitment.`;

          void logEntry(
            'RECOMMENDATION_GENERATED',
            selectedContext.id,
            query,
            response,
            JSON.stringify([
              `Stage: ${selectedContext.inferred_stage}`,
              `Dangers: ${selectedContext.dangers.length}`,
              `Opportunities: ${selectedContext.opportunities.length}`,
            ]),
            'deterministic'
          );
        } else {
          response = 'Please select a client first so I can analyze their specific situation.';
        }
      } else if (lowerInput.includes('say') || lowerInput.includes('script')) {
        if (selectedContext) {
          const discStyle = deriveStyleLabel(
            selectedContext.natural_d,
            selectedContext.natural_i,
            selectedContext.natural_s,
            selectedContext.natural_c
          );
          const dominant = [selectedContext.natural_d, selectedContext.natural_i, selectedContext.natural_s, selectedContext.natural_c]
            .indexOf(Math.max(selectedContext.natural_d, selectedContext.natural_i, selectedContext.natural_s, selectedContext.natural_c));
          const discLetter = (['D', 'I', 'S', 'C'][dominant] ?? 'D') as 'D' | 'I' | 'S' | 'C';
          const tips = getDiscCoachingTips(discLetter);
          const opening = tips[0] ?? 'Be direct and get to the point quickly';
          const avoid = tips[tips.length - 1] ?? "Don't waste time with small talk";
          response = `For ${selectedContext.name} (${discStyle}):\n\n**Opening approach:**\n${opening}\n\n**Key phrases to use:**\n• "Let's align your next step in ${selectedContext.inferred_stage} with your one-year vision."\n• "We'll address the top danger and lock in a concrete action before ending this call."\n\n**Avoid:**\n${avoid}`;
        } else {
          response = 'Select a client to get persona-specific scripts and language recommendations.';
        }
      } else if (lowerInput.includes('homework')) {
        const stage = selectedContext?.inferred_stage ?? '';
        const homework = getHomeworkByStage(stage);
        response = 'Suggested homework based on their stage:\n\n' + homework.join('\n');
      } else if (lowerInput.includes('spouse')) {
        response = 'To address spouse concerns:\n\n1. **Include spouse in next call** - make them feel part of the process\n2. **Provide data and facts** - spouses often need concrete information\n3. **Address financial concerns** - show funding options and ROI projections\n4. **Share success stories** - other couples who made the transition\n5. **Give them time** - don\'t rush the decision';
      } else if (lowerInput.includes('pink flag')) {
        const stage = selectedContext?.inferred_stage ?? '';
        const flags = getPinkFlagsByStage(stage);
        const flagText = flags.length > 0
          ? flags.map((f) => `• ${f}`).join('\n')
          : '• **C1:** Not completing assessments, not involving spouse\n• **C2:** Only talking about job market, not open to funding\n• **C3:** Dismissing possibilities before learning, not showing up for Zor calls\n• **C4:** Making assumptive comments, spouse opposed';
        response = `Pink Flags to watch for:\n\n${flagText}\n\nIf you see a pattern of Pink Flags, it may indicate a coaching opportunity.`;
      } else {
        response = 'I can help you with:\n\n• Push/pause recommendations\n• Call scripts and talking points\n• Homework assignments\n• Financial positioning\n• Objection handling\n• Spouse concerns\n• Pink flag identification\n• CLEAR framework questions\n\nWhat would you like to know?';
      }

      setCurrentResponse(response);

      void logEntry(
        'CHAT_RESPONSE',
        selectedContext?.id ?? null,
        query,
        response,
        JSON.stringify(sources),
        'deterministic'
      );

      setMessages(prev => [...prev, { type: 'bot', content: response, sources }]);
    }, 500);

    setInput('');
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const handleShowSources = () => {
    setShowSources(true);
  };

  const handleShowExplanation = () => {
    setShowExplanation(true);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Left Panel - Client Selection */}
      <div className="lg:col-span-1 space-y-4 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Client</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1 max-h-[300px] overflow-auto">
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => {
                    setSelectedClientId(client.id);
                    void loadClientContext(client.id);
                    void logEntry(
                      'CLIENT_ACCESSED',
                      client.id,
                      `Access client profile: ${client.name}`,
                      'Client profile loaded',
                      null,
                      'deterministic'
                    );
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0",
                    selectedClientId === client.id && "bg-blue-50 hover:bg-blue-50"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {client.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium truncate",
                      selectedClientId === client.id && "text-blue-700"
                    )}>
                      {client.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">Active client</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Client Context */}
        {selectedContext ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Coaching Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500">DISC style</p>
                <p className="font-medium">
                  {deriveStyleLabel(
                    selectedContext.natural_d,
                    selectedContext.natural_i,
                    selectedContext.natural_s,
                    selectedContext.natural_c
                  )}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500">Current stage</p>
                <p className="font-medium">{selectedContext.inferred_stage}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500">Vision statement</p>
                <p className="text-sm">{selectedContext.one_year_vision || 'No statement yet.'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Key dangers</p>
                {selectedContext.dangers.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedContext.dangers.slice(0, 5).map((d, i) => (
                      <li key={i} className="text-sm flex items-start gap-2"><span>•</span><span>{d}</span></li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No data yet.</p>
                )}
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Key opportunities</p>
                {selectedContext.opportunities.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedContext.opportunities.slice(0, 5).map((o, i) => (
                      <li key={i} className="text-sm flex items-start gap-2"><span>•</span><span>{o}</span></li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No data yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">Select a client to begin coaching session</p>
            </CardContent>
          </Card>
        )}

        {/* CLEAR Framework */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CLEAR Framework</CardTitle>
          </CardHeader>
          <CardContent>
            <CLEARFramework />
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Chat Interface */}
      <div className="lg:col-span-2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Coach Bot</CardTitle>
                  <p className="text-xs text-slate-500">
                    {selectedContext
                      ? `Coaching assistant for ${selectedContext.name}` 
                      : 'Select a client to get personalized recommendations'}
                  </p>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Shield className="h-4 w-4" />
                      <span>All interactions audited</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>All queries and responses are logged for transparency</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.map((msg, i) => (
              <ChatMessage 
                key={i} 
                type={msg.type} 
                content={msg.content} 
                sources={msg.sources}
                onShowSources={msg.sources ? handleShowSources : undefined}
                onShowExplanation={msg.sources ? handleShowExplanation : undefined}
              />
            ))}
          </ScrollArea>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.label)}
                  className="text-xs"
                >
                  <action.icon className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <Input
                placeholder="Ask Coach Bot anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              All responses cite sources and are logged for audit transparency.
            </p>
          </div>
        </Card>

        {/* Scripts Section */}
        {selectedContext && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Recommended Scripts</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="opening">
                <TabsList className="mb-4">
                  <TabsTrigger value="opening">Opening</TabsTrigger>
                  <TabsTrigger value="discovery">Discovery</TabsTrigger>
                  <TabsTrigger value="objection">Objection</TabsTrigger>
                  <TabsTrigger value="close">Close</TabsTrigger>
                </TabsList>
                {['opening', 'discovery', 'objection', 'close'].map((category) => (
                  <TabsContent key={category} value={category}>
                    <div className="space-y-3">
                      {coachingScripts
                        .filter(s => s.category === category)
                        .slice(0, 2)
                        .map((script) => (
                          <ScriptCard key={script.id} script={script} />
                        ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Source Dialog */}
      <SourceDialog 
        sources={currentSources}
        isOpen={showSources}
        onClose={() => setShowSources(false)}
      />

      {/* Explanation Dialog */}
      <ExplanationDialog 
        query={currentQuery}
        response={currentResponse}
        sources={currentSources}
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
      />
    </div>
  );
}
