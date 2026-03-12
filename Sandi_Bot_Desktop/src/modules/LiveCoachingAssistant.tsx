import { useState } from 'react';
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
import { sampleClients, coachingScripts, recommendationConfig, knowledgeGraph } from '@/data/sampleClients';
import { auditLog, generateSourceCitations, generateResponseExplanation, type SourceCitation } from '@/data/auditLog';
import type { ClientProfile } from '@/types';
import { cn } from '@/lib/utils';

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
  client,
  isOpen, 
  onClose 
}: { 
  query: string;
  response: string;
  sources: SourceCitation[];
  client?: ClientProfile;
  isOpen: boolean; 
  onClose: () => void;
}) {
  const explanation = generateResponseExplanation(query, response, sources, client);
  
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

// Recommendation Card
function RecommendationCard({ client }: { client: ClientProfile }) {
  const config = recommendationConfig[client.recommendation];
  const Icon = config.icon === 'ArrowUp' ? ArrowUp : config.icon === 'Heart' ? Heart : Pause;
  
  return (
    <div 
      className="rounded-xl p-4 border-2"
      style={{ 
        backgroundColor: config.bgColor, 
        borderColor: config.color 
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: config.color }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-lg" style={{ color: config.color }}>
            {client.recommendation}
          </h4>
          <p className="text-sm opacity-75">{config.description}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold" style={{ color: config.color }}>
            {client.confidence}%
          </p>
          <p className="text-xs opacity-75">confidence</p>
        </div>
      </div>
      
      {/* Reasoning */}
      <div className="bg-white/50 rounded-lg p-3">
        <p className="text-sm font-medium mb-2">Why this recommendation?</p>
        <ul className="space-y-1">
          <li className="text-sm flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0" style={{ color: config.color }} />
            <span>Readiness: {Math.round((Object.values(client.readiness).reduce((a, b) => a + b, 0) / 20) * 100)}%</span>
          </li>
          <li className="text-sm flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0" style={{ color: config.color }} />
            <span>Persona: {client.persona} • DISC: {client.disc.style}</span>
          </li>
          <li className="text-sm flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0" style={{ color: config.color }} />
            <span>Stage: {client.stage} • {client.nextAction}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// Script Card with Copy
function ScriptCard({ script }: { script: typeof coachingScripts[0] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(script.content);
    setCopied(true);
    
    // Log the copy action
    auditLog.log({
      userId: 'sandy',
      userName: 'Sandy Stahl',
      type: 'script_copied',
      module: 'Live Coaching Assistant',
      query: `Copy script: ${script.title}`,
      response: 'Script copied to clipboard',
    });
    
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
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [messages, setMessages] = useState<Array<{
    type: 'user' | 'bot';
    content: string;
    sources?: SourceCitation[];
  }>>([
    { 
      type: 'bot', 
      content: `Hello! I'm Sandi Bot, your AI coaching assistant powered by the CLEAR framework. All my responses cite their sources for full transparency and auditability.\n\nSelect a client to get personalized recommendations with full source citations.` 
    }
  ]);
  const [input, setInput] = useState('');
  const [showSources, setShowSources] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentSources, setCurrentSources] = useState<SourceCitation[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentResponse, setCurrentResponse] = useState('');

  const sendMessage = (messageText: string) => {
    if (!messageText.trim()) return;

    const query = messageText;

    // Log the query
    auditLog.log({
      userId: 'sandy',
      userName: 'Sandy Stahl',
      type: 'chat_query',
      module: 'Live Coaching Assistant',
      query: query,
      clientId: selectedClient?.id,
      clientName: selectedClient?.name,
    });

    // Add user message
    setMessages(prev => [...prev, { type: 'user', content: query }]);
    setCurrentQuery(query);

    // Generate sources
    const sources = generateSourceCitations(query, selectedClient || undefined);
    setCurrentSources(sources);

    // Generate bot response
    setTimeout(() => {
      let response = '';
      const lowerInput = query.toLowerCase();

      if (lowerInput.includes('push') || lowerInput.includes('pause')) {
        if (selectedClient) {
          response = `Based on ${selectedClient.name}'s profile:\n\n• Readiness: ${Math.round((Object.values(selectedClient.readiness).reduce((a, b) => a + b, 0) / 20) * 100)}%\n• Persona: ${selectedClient.persona}\n• Stage: ${selectedClient.stage}\n\nRecommendation: **${selectedClient.recommendation}** (${selectedClient.confidence}% confidence)\n\n${selectedClient.recommendation === 'PUSH' ? 'They show high readiness - advance aggressively toward next steps.' : selectedClient.recommendation === 'NURTURE' ? 'Build the relationship with valuable content and check-ins.' : 'Give them space - they need more time to evaluate.'}`;

          auditLog.log({
            userId: 'sandy',
            userName: 'Sandy Stahl',
            type: 'recommendation_generated',
            module: 'Live Coaching Assistant',
            query: query,
            response: response,
            clientId: selectedClient.id,
            clientName: selectedClient.name,
            recommendation: selectedClient.recommendation,
            confidenceScore: selectedClient.confidence,
            reasoningFactors: [
              `Readiness: ${Math.round((Object.values(selectedClient.readiness).reduce((a, b) => a + b, 0) / 20) * 100)}%`,
              `Persona: ${selectedClient.persona}`,
              `Stage: ${selectedClient.stage}`,
            ],
            sourcesCited: sources,
          });
        } else {
          response = 'Please select a client first so I can analyze their specific situation.';
        }
      } else if (lowerInput.includes('say') || lowerInput.includes('script')) {
        if (selectedClient) {
          const disc = knowledgeGraph.discCoaching[selectedClient.disc.style];
          response = `For ${selectedClient.name} (${selectedClient.disc.style} style):\n\n**Opening approach:**\n${disc.coachingTips[0]}\n\n**Key phrases to use:**\n• "${selectedClient.ilwe.income.target} in ${selectedClient.ilwe.income.timeline} is achievable with the right system"\n• "Let's talk about how this fits your goal to ${selectedClient.visionStatement.motivators.workLife.toLowerCase()}"\n\n**Avoid:**\n${disc.coachingTips.slice(-1)[0]}`;
        } else {
          response = 'Select a client to get persona-specific scripts and language recommendations.';
        }
      } else if (lowerInput.includes('homework')) {
        response = 'Suggested homework based on their stage:\n\n• **IC:** Send DISC and You 2.0 assessments\n• **C1:** Review DISC results, discuss You 2.0 statement\n• **C2:** Complete TUMAY, discuss funding options\n• **C3:** Prepare for Discovery Center, research possibilities\n• **C4:** Contact franchise owners, complete validation';
      } else if (lowerInput.includes('spouse')) {
        response = 'To address spouse concerns:\n\n1. **Include spouse in next call** - make them feel part of the process\n2. **Provide data and facts** - spouses often need concrete information\n3. **Address financial concerns** - show funding options and ROI projections\n4. **Share success stories** - other couples who made the transition\n5. **Give them time** - don\'t rush the decision';
      } else if (lowerInput.includes('pink flag')) {
        response = 'Pink Flags to watch for:\n\n• **C1:** Not completing assessments, not involving spouse\n• **C2:** Only talking about job market, not open to funding\n• **C3:** Dismissing possibilities before learning, not showing up for Zor calls\n• **C4:** Making assumptive comments, spouse opposed\n\nIf you see a pattern of Pink Flags, it may indicate a coaching opportunity.';
      } else {
        response = 'I can help you with:\n\n• Push/pause recommendations\n• Call scripts and talking points\n• Homework assignments\n• Financial positioning\n• Objection handling\n• Spouse concerns\n• Pink flag identification\n• CLEAR framework questions\n\nWhat would you like to know?';
      }

      setCurrentResponse(response);

      auditLog.log({
        userId: 'sandy',
        userName: 'Sandy Stahl',
        type: 'chat_response',
        module: 'Live Coaching Assistant',
        query: query,
        response: response,
        clientId: selectedClient?.id,
        clientName: selectedClient?.name,
        sourcesCited: sources,
      });

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
              {sampleClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => {
                    setSelectedClient(client);
                    // Log client access
                    auditLog.log({
                      userId: 'sandy',
                      userName: 'Sandy Stahl',
                      type: 'client_data_accessed',
                      module: 'Live Coaching Assistant',
                      clientId: client.id,
                      clientName: client.name,
                      query: `Access client profile: ${client.name}`,
                      response: 'Client profile loaded',
                    });
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0",
                    selectedClient?.id === client.id && "bg-blue-50 hover:bg-blue-50"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {client.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium truncate",
                      selectedClient?.id === client.id && "text-blue-700"
                    )}>
                      {client.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{client.stage}</p>
                  </div>
                  <Badge 
                    className="shrink-0"
                    style={{ 
                      backgroundColor: recommendationConfig[client.recommendation].bgColor,
                      color: recommendationConfig[client.recommendation].color
                    }}
                  >
                    {client.recommendation}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Client Info */}
        {selectedClient && (
          <RecommendationCard client={selectedClient} />
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
                  <CardTitle className="text-lg">Sandi Bot</CardTitle>
                  <p className="text-xs text-slate-500">
                    {selectedClient 
                      ? `Coaching assistant for ${selectedClient.name}` 
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
                placeholder="Ask Sandi Bot anything..."
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
        {selectedClient && (
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
        client={selectedClient || undefined}
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
      />
    </div>
  );
}
