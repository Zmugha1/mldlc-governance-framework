import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  MessageSquare, 
  ClipboardCheck, 
  Shield,
  Upload,
  FolderOpen,
  FileText,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Target,
  Eye,
  Lock
} from 'lucide-react';
import { SkeletonCard } from '@/components/SkeletonCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#D1D5DB] rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#FAFAFA] hover:bg-[#F5F5F5] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#C4B7D9]/20 flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-[#333333]">{title}</h3>
        </div>
        {isOpen ? <ChevronDown className="h-5 w-5 text-[#6B6B6B]" /> : <ChevronRight className="h-5 w-5 text-[#6B6B6B]" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function StepNumber({ number }: { number: number }) {
  return (
    <div className="h-8 w-8 rounded-full bg-[#C4B7D9] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
      {number}
    </div>
  );
}

export default function HowToUse() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

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
      {/* Header */}
      <div className="bg-gradient-to-r from-[#C4B7D9] to-[#D4C7E9] rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="h-8 w-8" />
          <h1 className="text-2xl font-bold">How to Use Sandi Bot Dashboard</h1>
        </div>
        <p className="text-white/90 max-w-3xl">
          Your complete guide to leveraging AI-powered coaching intelligence. 
          Learn how to manage clients, track pipeline progress, conduct coaching sessions, 
          and maintain full audit transparency.
        </p>
      </div>

      {/* Quick Navigation */}
      <Card className="border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-[#C4B7D9]" />
            Quick Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Getting Started', icon: <BookOpen className="h-4 w-4" />, section: 'getting-started' },
              { label: 'Client Intelligence', icon: <Users className="h-4 w-4" />, section: 'clients' },
              { label: 'Pipeline', icon: <BarChart3 className="h-4 w-4" />, section: 'pipeline' },
              { label: 'Live Coaching', icon: <MessageSquare className="h-4 w-4" />, section: 'coaching' },
              { label: 'Post-Call Analysis', icon: <ClipboardCheck className="h-4 w-4" />, section: 'analysis' },
              { label: 'File Upload', icon: <Upload className="h-4 w-4" />, section: 'upload' },
              { label: 'Audit & Transparency', icon: <Shield className="h-4 w-4" />, section: 'audit' },
              { label: 'Best Practices', icon: <Target className="h-4 w-4" />, section: 'best-practices' },
            ].map((item) => (
              <Button
                key={item.section}
                variant="outline"
                className="justify-start border-[#D1D5DB] hover:bg-[#C4B7D9]/10 hover:border-[#C4B7D9]"
                onClick={() => document.getElementById(item.section)?.scrollIntoView({ behavior: 'smooth' })}
              >
                {item.icon}
                <span className="ml-2 text-sm">{item.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4 pr-4">
          {/* Getting Started */}
          <div id="getting-started">
            <CollapsibleSection 
              title="Getting Started" 
              icon={<BookOpen className="h-5 w-5 text-[#C4B7D9]" />}
              defaultOpen={true}
            >
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Welcome to Your Coaching Intelligence Dashboard
                  </h4>
                  <p className="text-blue-800 text-sm">
                    This dashboard is designed around the CLEAR Coaching Method and your 5-Compartment 
                    Client Experience Journey. Every feature is built to help you coach more effectively 
                    while maintaining complete transparency and auditability.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">Dashboard Overview</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex gap-3">
                      <StepNumber number={1} />
                      <div>
                        <p className="font-medium text-[#333333]">Executive Dashboard</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Your command center. View KPIs, active conversations, pipeline health, 
                          and recent activity at a glance.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={2} />
                      <div>
                        <p className="font-medium text-[#333333]">Client Intelligence</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Complete client profiles with DISC, You 2.0, TUMAY, Vision Statements, 
                          and Fathom call notes. Search and filter to find exactly who you need.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={3} />
                      <div>
                        <p className="font-medium text-[#333333]">Pipeline Visualizer</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Track clients through your 6-stage journey: Initial Contact → Seeker Connection 
                          → Seeker Clarification → Possibilities → Client Career 2.0 → Business Purchase.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={4} />
                      <div>
                        <p className="font-medium text-[#333333]">Live Coaching Assistant</p>
                        <p className="text-sm text-[#6B6B6B]">
                          AI-powered chat with full context from your knowledge graph. 
                          Every response cites sources for transparency.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={5} />
                      <div>
                        <p className="font-medium text-[#333333]">Post-Call Analysis</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Score calls using the CLEAR framework (Curiosity, Locating, Engagement, 
                          Accountability, Reflection) and get AI-generated insights.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={6} />
                      <div>
                        <p className="font-medium text-[#333333]">Audit Transparency</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Complete logging of all queries, recommendations, and data access. 
                          Export logs for compliance review.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Client Intelligence */}
          <div id="clients">
            <CollapsibleSection 
              title="Client Intelligence Module" 
              icon={<Users className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333] flex items-center gap-2">
                    <Search className="h-4 w-4 text-[#C4B7D9]" />
                    Searching & Filtering Clients
                  </h4>
                  
                  <div className="bg-[#FAFAFA] rounded-lg p-4 space-y-3">
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-[#333333]">Search by Name, Company, or Industry</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Type in the search box to find clients instantly. The search looks across 
                          client names, company names, and industry fields.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-[#333333]">Filter by Pipeline Stage</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Use the stage dropdown to show only clients in a specific compartment 
                          of their journey.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-[#333333]">Readiness & Confidence Scores</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Each client card shows their readiness (Identity, Commitment, Financial, Execution) 
                          and your confidence score for recommendations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333] flex items-center gap-2">
                    <Eye className="h-4 w-4 text-[#C4B7D9]" />
                    Viewing Client Details
                  </h4>
                  
                  <p className="text-sm text-[#6B6B6B]">
                    Click any client card to open their complete profile. The profile has 6 tabs:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-[#D1D5DB] rounded-lg">
                      <p className="font-medium text-[#333333]">Overview</p>
                      <p className="text-sm text-[#6B6B6B]">Stage, persona, readiness radar, contact info, and coaching notes</p>
                    </div>
                    <div className="p-3 bg-white border border-[#D1D5DB] rounded-lg">
                      <p className="font-medium text-[#333333]">DISC</p>
                      <p className="text-sm text-[#6B6B6B]">Behavioral style, scores, traits, and coaching tips</p>
                    </div>
                    <div className="p-3 bg-white border border-[#D1D5DB] rounded-lg">
                      <p className="font-medium text-[#333333]">You 2.0</p>
                      <p className="text-sm text-[#6B6B6B]">Statement, dangers, opportunities, skills, and ILWE priorities</p>
                    </div>
                    <div className="p-3 bg-white border border-[#D1D5DB] rounded-lg">
                      <p className="font-medium text-[#333333]">TUMAY</p>
                      <p className="text-sm text-[#6B6B6B]">Personal info, financial profile, spouse details, and timeline</p>
                    </div>
                    <div className="p-3 bg-white border border-[#D1D5DB] rounded-lg">
                      <p className="font-medium text-[#333333]">Vision</p>
                      <p className="text-sm text-[#6B6B6B]">Vision paragraph, journey mindset, success definition, motivators</p>
                    </div>
                    <div className="p-3 bg-white border border-[#D1D5DB] rounded-lg">
                      <p className="font-medium text-[#333333]">Fathom</p>
                      <p className="text-sm text-[#6B6B6B]">All call notes with blockers, wins, and next steps</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#C4B7D9]" />
                    Understanding Recommendations
                  </h4>
                  
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-lg">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium text-green-800">PUSH - Move forward</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 rounded-lg">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <span className="text-sm font-medium text-yellow-800">NURTURE - Keep engaged</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-100 rounded-lg">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm font-medium text-red-800">PAUSE - Address blockers</span>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Pipeline Visualizer */}
          <div id="pipeline">
            <CollapsibleSection 
              title="Pipeline Visualizer" 
              icon={<BarChart3 className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6">
                <div className="bg-[#FAFAFA] rounded-lg p-4">
                  <h4 className="font-semibold text-[#333333] mb-3">Your 6-Stage Client Journey</h4>
                  
                  <div className="space-y-3">
                    {[
                      { stage: 'Initial Contact', color: '#E5E7EB', desc: 'First touchpoint - curiosity and interest' },
                      { stage: 'Seeker Connection', color: '#BFDBFE', desc: 'Building rapport - understanding their story' },
                      { stage: 'Seeker Clarification', color: '#BBF7D0', desc: 'Defining goals - ILWE priorities' },
                      { stage: 'Possibilities', color: '#FEF08A', desc: 'Exploring options - education phase' },
                      { stage: 'Client Career 2.0', color: '#FED7AA', desc: 'Vision alignment - defining their You 2.0' },
                      { stage: 'Business Purchase', color: '#C4B7D9', desc: 'Funding and closing - becoming a business owner' },
                    ].map((item, i) => (
                      <div key={item.stage} className="flex items-center gap-3">
                        <div 
                          className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: item.color }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[#333333]">{item.stage}</p>
                          <p className="text-sm text-[#6B6B6B]">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333] flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-[#C4B7D9]" />
                    Pink Flags by Stage
                  </h4>
                  
                  <p className="text-sm text-[#6B6B6B]">
                    Pink Flags are warning indicators that a client may need additional support 
                    or isn't ready to move forward. Each stage has specific flags to watch for:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <p className="font-medium text-red-800 mb-1">Initial Contact</p>
                      <p className="text-sm text-red-700">No clear pain point, just "looking around"</p>
                    </div>
                    <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <p className="font-medium text-red-800 mb-1">Seeker Connection</p>
                      <p className="text-sm text-red-700">Reluctant to share personal information</p>
                    </div>
                    <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <p className="font-medium text-red-800 mb-1">Seeker Clarification</p>
                      <p className="text-sm text-red-700">ILWE priorities all rated low (no clear goals)</p>
                    </div>
                    <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <p className="font-medium text-red-800 mb-1">Possibilities</p>
                      <p className="text-sm text-red-700">Overwhelmed by options, can't make decisions</p>
                    </div>
                    <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <p className="font-medium text-red-800 mb-1">Client Career 2.0</p>
                      <p className="text-sm text-red-700">Vision statement doesn't align with actions</p>
                    </div>
                    <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <p className="font-medium text-red-800 mb-1">Business Purchase</p>
                      <p className="text-sm text-red-700">Spouse not supportive, funding unclear</p>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Live Coaching */}
          <div id="coaching">
            <CollapsibleSection 
              title="Live Coaching Assistant" 
              icon={<MessageSquare className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">AI-Powered Coaching Context</h4>
                  <p className="text-sm text-blue-800">
                    The Live Coaching Assistant has access to your complete knowledge graph: 
                    CLEAR framework, session outlines, DISC coaching tips, Pink Flags, and 
                    all client documents. Every response cites its sources for full transparency.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">How to Use During Coaching</h4>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <StepNumber number={1} />
                      <div>
                        <p className="font-medium text-[#333333]">Select a Client (Optional)</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Choose a client from the dropdown to give the AI full context of their 
                          DISC profile, You 2.0, TUMAY answers, and history.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={2} />
                      <div>
                        <p className="font-medium text-[#333333]">Ask Questions Naturally</p>
                        <p className="text-sm text-[#6B6B6B]">
                          "What questions should I ask a High D in the Possibilities stage?" <br/>
                          "What are the Pink Flags for Seeker Clarification?" <br/>
                          "How do I handle a spouse who isn't supportive?"
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={3} />
                      <div>
                        <p className="font-medium text-[#333333]">Review Source Citations</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Every response shows which sources were used. Click "X sources" to see 
                          exactly which documents informed the answer.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={4} />
                      <div>
                        <p className="font-medium text-[#333333]">Understand the Reasoning</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Click "Why this response?" to see the AI's reasoning path and how it 
                          connected your question to the knowledge base.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">Sample Questions to Try</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#D1D5DB]">
                      <p className="text-sm font-medium text-[#333333]">"What are the CLEAR questions for C1?"</p>
                    </div>
                    <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#D1D5DB]">
                      <p className="text-sm font-medium text-[#333333]">"How do I coach a High S who's stuck?"</p>
                    </div>
                    <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#D1D5DB]">
                      <p className="text-sm font-medium text-[#333333]">"What should I cover in a Possibilities call?"</p>
                    </div>
                    <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#D1D5DB]">
                      <p className="text-sm font-medium text-[#333333]">"List Pink Flags for the Funding stage"</p>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Post-Call Analysis */}
          <div id="analysis">
            <CollapsibleSection 
              title="Post-Call Analysis (CLEAR Scoring)" 
              icon={<ClipboardCheck className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">The CLEAR Framework</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {[
                      { letter: 'C', name: 'Curiosity', desc: 'Asked powerful questions' },
                      { letter: 'L', name: 'Locating', desc: 'Identified client position' },
                      { letter: 'E', name: 'Engagement', desc: 'Built strong connection' },
                      { letter: 'A', name: 'Accountability', desc: 'Set clear commitments' },
                      { letter: 'R', name: 'Reflection', desc: 'Summarized and confirmed' },
                    ].map((item) => (
                      <div key={item.letter} className="p-3 bg-[#C4B7D9]/10 rounded-lg text-center">
                        <p className="text-2xl font-bold text-[#C4B7D9]">{item.letter}</p>
                        <p className="font-medium text-[#333333]">{item.name}</p>
                        <p className="text-xs text-[#6B6B6B]">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">Scoring a Call</h4>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <StepNumber number={1} />
                      <div>
                        <p className="font-medium text-[#333333]">Select Client and Call Date</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Choose which client and which call you're scoring. The system will 
                          pull in any existing Fathom notes for that date.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={2} />
                      <div>
                        <p className="font-medium text-[#333333]">Rate Each CLEAR Dimension (1-5)</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Be honest with yourself. A score of 3 means "met expectations," 
                          5 means "exceptional," and 1 means "needs significant improvement."
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={3} />
                      <div>
                        <p className="font-medium text-[#333333]">Add Coaching Notes</p>
                        <p className="text-sm text-[#6B6B6B]">
                          What went well? What would you do differently? These notes are 
                          for your growth as a coach.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={4} />
                      <div>
                        <p className="font-medium text-[#333333]">Review AI Insights</p>
                        <p className="text-sm text-[#6B6B6B]">
                          The system generates insights based on your scores, comparing to 
                          previous calls and suggesting focus areas.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Scoring Tips
                  </h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Score immediately after the call while it's fresh</li>
                    <li>• Look for patterns across multiple calls</li>
                    <li>• If Engagement is consistently low, work on rapport-building</li>
                    <li>• If Accountability is low, focus on setting clearer next steps</li>
                  </ul>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* File Upload */}
          <div id="upload">
            <CollapsibleSection 
              title="Importing Client Files (Airgapped Mode)" 
              icon={<Upload className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Airgapped Deployment
                  </h4>
                  <p className="text-sm text-green-800">
                    This dashboard is designed to work completely offline. No client data ever 
                    leaves Sandy's machine. Files are processed locally and stored in the browser.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">Supported Document Types</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 border border-[#D1D5DB] rounded-lg flex items-start gap-3">
                      <FileText className="h-5 w-5 text-[#C4B7D9] flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">DISC Assessments</p>
                        <p className="text-sm text-[#6B6B6B]">.pdf or .txt files with behavioral style results</p>
                      </div>
                    </div>
                    <div className="p-3 border border-[#D1D5DB] rounded-lg flex items-start gap-3">
                      <FileText className="h-5 w-5 text-[#C4B7D9] flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">You 2.0 Profiles</p>
                        <p className="text-sm text-[#6B6B6B]">.txt or .json with Dangers, Opportunities, Skills</p>
                      </div>
                    </div>
                    <div className="p-3 border border-[#D1D5DB] rounded-lg flex items-start gap-3">
                      <FileText className="h-5 w-5 text-[#C4B7D9] flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">TUMAY Questionnaires</p>
                        <p className="text-sm text-[#6B6B6B]">.json or .txt with Two May answers</p>
                      </div>
                    </div>
                    <div className="p-3 border border-[#D1D5DB] rounded-lg flex items-start gap-3">
                      <FileText className="h-5 w-5 text-[#C4B7D9] flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">Vision Statements</p>
                        <p className="text-sm text-[#6B6B6B]">.txt files with client's vision paragraph</p>
                      </div>
                    </div>
                    <div className="p-3 border border-[#D1D5DB] rounded-lg flex items-start gap-3">
                      <FileText className="h-5 w-5 text-[#C4B7D9] flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">Fathom Notes</p>
                        <p className="text-sm text-[#6B6B6B]">.txt files with call summaries</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">Two Ways to Import</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#FAFAFA] rounded-lg border border-[#D1D5DB]">
                      <div className="flex items-center gap-2 mb-3">
                        <Upload className="h-5 w-5 text-[#C4B7D9]" />
                        <p className="font-semibold text-[#333333]">Method 1: Drag & Drop</p>
                      </div>
                      <ol className="text-sm text-[#6B6B6B] space-y-2 list-decimal list-inside">
                        <li>Go to Client Intelligence module</li>
                        <li>Click "Import Client" button</li>
                        <li>Drag files into the upload zone</li>
                        <li>Or click to browse and select files</li>
                        <li>System auto-detects document type</li>
                        <li>New client profile is created</li>
                      </ol>
                    </div>

                    <div className="p-4 bg-[#FAFAFA] rounded-lg border border-[#D1D5DB]">
                      <div className="flex items-center gap-2 mb-3">
                        <FolderOpen className="h-5 w-5 text-[#C4B7D9]" />
                        <p className="font-semibold text-[#333333]">Method 2: Folder Watch</p>
                      </div>
                      <ol className="text-sm text-[#6B6B6B] space-y-2 list-decimal list-inside">
                        <li>Create a folder next to the app: <code>./client-files/</code></li>
                        <li>Copy client documents into this folder</li>
                        <li>The Local File Watcher detects them</li>
                        <li>Click "Import" on each file</li>
                        <li>Or click "Import All" for batch import</li>
                        <li>Files are processed and profiles created</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Naming Convention Tips</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    For best results, name files like this:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li><code>FirstName_LastName_DISC.pdf</code> - Auto-extracts client name</li>
                    <li><code>FirstName_LastName_You2.0.txt</code> - Links to same client</li>
                    <li><code>FirstName_LastName_TUMAY.json</code> - Completes the profile</li>
                  </ul>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Audit & Transparency */}
          <div id="audit">
            <CollapsibleSection 
              title="Audit Transparency & Logging" 
              icon={<Shield className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">Complete Transparency</h4>
                  <p className="text-sm text-purple-800">
                    Every interaction with the AI is logged: what was asked, what sources were used, 
                    what recommendation was given, and why. This ensures you can always explain 
                    your coaching decisions and maintain professional accountability.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">What's Logged</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-3 bg-[#FAFAFA] rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">All Chat Queries</p>
                        <p className="text-sm text-[#6B6B6B]">Every question asked to the Live Coaching Assistant</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-[#FAFAFA] rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">Source Citations</p>
                        <p className="text-sm text-[#6B6B6B]">Which documents informed each AI response</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-[#FAFAFA] rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">Recommendations</p>
                        <p className="text-sm text-[#6B6B6B]">PUSH/NURTURE/PAUSE decisions with confidence scores</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-[#FAFAFA] rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">CLEAR Scores</p>
                        <p className="text-sm text-[#6B6B6B]">All post-call analysis scores and notes</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-[#FAFAFA] rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">File Imports</p>
                        <p className="text-sm text-[#6B6B6B]">When client documents were uploaded</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-[#FAFAFA] rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#333333]">Data Access</p>
                        <p className="text-sm text-[#6B6B6B]">Which client profiles were viewed</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">Using the Audit Dashboard</h4>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <StepNumber number={1} />
                      <div>
                        <p className="font-medium text-[#333333]">View Query History</p>
                        <p className="text-sm text-[#6B6B6B]">
                          See all questions asked, organized by date. Filter by query type 
                          (coaching, client lookup, methodology).
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={2} />
                      <div>
                        <p className="font-medium text-[#333333]">Check Source Usage</p>
                        <p className="text-sm text-[#6B6B6B]">
                          See which documents are most frequently cited. This helps you 
                          understand what's most valuable in your knowledge base.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <StepNumber number={3} />
                      <div>
                        <p className="font-medium text-[#333333]">Export Logs</p>
                        <p className="text-sm text-[#6B6B6B]">
                          Click "Export to CSV" to download a complete audit trail. 
                          Useful for compliance reviews or supervision sessions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Privacy Note
                  </h4>
                  <p className="text-sm text-amber-800">
                    All logs are stored locally in your browser. No data is sent to any server. 
                    If you clear your browser data, logs will be reset. For permanent records, 
                    export logs regularly.
                  </p>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Best Practices */}
          <div id="best-practices">
            <CollapsibleSection 
              title="Best Practices & Tips" 
              icon={<Target className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">Daily Workflow</h4>
                  
                  <div className="bg-[#FAFAFA] rounded-lg p-4">
                    <ol className="space-y-3">
                      <li className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-[#C4B7D9] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                        <div>
                          <p className="font-medium text-[#333333]">Morning: Check Executive Dashboard</p>
                          <p className="text-sm text-[#6B6B6B]">Review today's calls, pipeline health, and any urgent recommendations (PAUSE status clients).</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-[#C4B7D9] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                        <div>
                          <p className="font-medium text-[#333333]">Before Each Call: Review Client Profile</p>
                          <p className="text-sm text-[#6B6B6B]">Open Client Intelligence, find your client, review their DISC, recent Fathom notes, and current stage.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-[#C4B7D9] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                        <div>
                          <p className="font-medium text-[#333333]">During Call: Use Live Coaching Assistant</p>
                          <p className="text-sm text-[#6B6B6B]">If you need quick guidance on questions, Pink Flags, or coaching tips, ask the AI.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-[#C4B7D9] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                        <div>
                          <p className="font-medium text-[#333333]">After Call: Score with CLEAR</p>
                          <p className="text-sm text-[#6B6B6B]">Immediately score your call while it's fresh. Add notes on what to improve.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <div className="h-6 w-6 rounded-full bg-[#C4B7D9] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">5</div>
                        <div>
                          <p className="font-medium text-[#333333]">Weekly: Review Audit Logs</p>
                          <p className="text-sm text-[#6B6B6B]">Export your week's activity. Look for patterns in your coaching and identify growth areas.</p>
                        </div>
                      </li>
                    </ol>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">Keyboard Shortcuts</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#D1D5DB] text-center">
                      <kbd className="px-2 py-1 bg-white rounded border text-sm font-mono">Ctrl + K</kbd>
                      <p className="text-sm text-[#6B6B6B] mt-1">Search clients</p>
                    </div>
                    <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#D1D5DB] text-center">
                      <kbd className="px-2 py-1 bg-white rounded border text-sm font-mono">Ctrl + /</kbd>
                      <p className="text-sm text-[#6B6B6B] mt-1">Open coaching chat</p>
                    </div>
                    <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#D1D5DB] text-center">
                      <kbd className="px-2 py-1 bg-white rounded border text-sm font-mono">Esc</kbd>
                      <p className="text-sm text-[#6B6B6B] mt-1">Close modals</p>
                    </div>
                    <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#D1D5DB] text-center">
                      <kbd className="px-2 py-1 bg-white rounded border text-sm font-mono">?</kbd>
                      <p className="text-sm text-[#6B6B6B] mt-1">Show this help</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#333333]">Pro Tips</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="font-medium text-blue-900 mb-1">💡 Keep Client Files Organized</p>
                      <p className="text-sm text-blue-800">
                        Use the naming convention: FirstName_LastName_DocumentType.ext 
                        for automatic client linking.
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                      <p className="font-medium text-green-900 mb-1">💡 Review Pink Flags Before Calls</p>
                      <p className="text-sm text-green-800">
                        Check the Pipeline Visualizer to see Pink Flags for each stage 
                        before your coaching sessions.
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="font-medium text-purple-900 mb-1">💡 Use the AI for Prep</p>
                      <p className="text-sm text-purple-800">
                        Ask: "What should I cover in a [Stage] call with a High [DISC]?" 
                        before each session.
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="font-medium text-amber-900 mb-1">💡 Export Logs Monthly</p>
                      <p className="text-sm text-amber-800">
                        Keep a record of your coaching activity for supervision 
                        and professional development.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-[#C4B7D9] to-[#D4C7E9] rounded-lg p-6 text-white">
                  <h4 className="font-bold text-lg mb-2">Need More Help?</h4>
                  <p className="text-white/90 mb-4">
                    This dashboard is built around YOUR coaching methodology. Every feature 
                    connects to the CLEAR framework and 5-Compartment Client Experience. 
                    If something isn't clear, ask the Live Coaching Assistant - it's trained 
                    on all your coaching resources.
                  </p>
                  <div className="flex gap-3">
                    <Badge className="bg-white/20 text-white border-0">CLEAR Method</Badge>
                    <Badge className="bg-white/20 text-white border-0">5 Compartments</Badge>
                    <Badge className="bg-white/20 text-white border-0">DISC Coaching</Badge>
                    <Badge className="bg-white/20 text-white border-0">Source Cited</Badge>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
