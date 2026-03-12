import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Briefcase, 
  Mail, 
  Phone, 
  TrendingUp,
  ChevronRight,
  Star,
  AlertCircle,
  Upload,
  FolderOpen,
  FileText,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileUploadZone, type UploadedFile } from '@/components/FileUploadZone';
import { LocalFileWatcher } from '@/components/LocalFileWatcher';
import { parseDocument, generateClientFromDocuments } from '@/utils/documentParser';
import { sampleClients, stageConfig, recommendationConfig, discColors } from '@/data/sampleClients';
import type { Client } from '@/types';
import { cn } from '@/lib/utils';

// DISC Badge Component
function DISCBadge({ style }: { style: 'D' | 'I' | 'S' | 'C' }) {
  const color = discColors[style];
  const labels = { D: 'Dominance', I: 'Influence', S: 'Steadiness', C: 'Conscientiousness' };
  
  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white font-bold text-sm"
      style={{ backgroundColor: color }}
    >
      <span className="text-lg">{style}</span>
      <span className="text-xs font-normal opacity-90">{labels[style]}</span>
    </div>
  );
}

// Recommendation Badge
function RecommendationBadge({ action, confidence }: { action: 'PUSH' | 'NURTURE' | 'PAUSE'; confidence: number }) {
  const config = recommendationConfig[action];
  
  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm"
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      <span>{action}</span>
      <span className="text-xs opacity-75">{confidence}%</span>
    </div>
  );
}

// Readiness Radar Component
function ReadinessRadar({ scores }: { scores: { identity: number; commitment: number; financial: number; execution: number } }) {
  const dimensions = [
    { key: 'identity', label: 'Identity', score: scores.identity },
    { key: 'commitment', label: 'Commitment', score: scores.commitment },
    { key: 'financial', label: 'Financial', score: scores.financial },
    { key: 'execution', label: 'Execution', score: scores.execution },
  ];

  return (
    <div className="space-y-3">
      {dimensions.map((dim) => (
        <div key={dim.key}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-slate-700">{dim.label}</span>
            <span className="text-sm font-bold text-slate-900">{dim.score}/5</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                dim.score >= 4 ? "bg-green-500" : dim.score >= 3 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${(dim.score / 5) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Client Detail Modal
function ClientDetailModal({ client, isOpen, onClose }: { 
  client: Client | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  if (!client) return null;

  const stage = stageConfig[client.stage];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
            <div 
              className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: discColors[client.disc.style] }}
            >
              {client.avatar}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{client.name}</h2>
              <p className="text-sm text-slate-500 font-normal">{client.company} • {client.industry}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid grid-cols-6 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="disc">DISC</TabsTrigger>
            <TabsTrigger value="you2">You 2.0</TabsTrigger>
            <TabsTrigger value="tumay">TUMAY</TabsTrigger>
            <TabsTrigger value="vision">Vision</TabsTrigger>
            <TabsTrigger value="fathom">Fathom</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge 
                    className="text-white"
                    style={{ backgroundColor: stage.color }}
                  >
                    {stage.label}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-2">{stage.compartment}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Persona</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{client.persona}</p>
                  <RecommendationBadge action={client.recommendation} confidence={client.confidence} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500">Readiness</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReadinessRadar scores={client.readiness} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{client.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{client.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{client.industry}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Coaching Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {client.notes.map((note, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2 p-2 rounded bg-slate-50">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DISC Tab */}
          <TabsContent value="disc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DISCBadge style={client.disc.style} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-600">{client.disc.description}</p>
                
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Key Traits:</p>
                  <div className="flex flex-wrap gap-2">
                    {client.disc.traits.map((trait, i) => (
                      <Badge key={i} variant="secondary">{trait}</Badge>
                    ))}
                  </div>
                </div>

                {client.disc.scores && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">Scores:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(client.disc.scores).map(([key, score]) => (
                        <div key={key} className="text-center p-2 rounded-lg bg-slate-50">
                          <p className="text-lg font-bold" style={{ color: discColors[key as keyof typeof discColors] }}>{score}</p>
                          <p className="text-xs text-slate-500">{key}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Coaching Tips:</p>
                  <ul className="space-y-1">
                    {client.disc.coachingTips.map((tip, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* You 2.0 Tab */}
          <TabsContent value="you2" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">You 2.0 Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-slate-700 italic">"{client.you2.statement}"</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Dangers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {client.you2.dangers.map((danger, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        {danger}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {client.you2.opportunities.map((opp, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">•</span>
                        {opp}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-green-700 mb-2">Favorite Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {client.you2.skills.favorites.map((skill, i) => (
                      <Badge key={i} className="bg-green-100 text-green-800">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-orange-700 mb-2">Skills to Delegate:</p>
                  <div className="flex flex-wrap gap-2">
                    {client.you2.skills.delegate.map((skill, i) => (
                      <Badge key={i} className="bg-orange-100 text-orange-800">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-700 mb-2">Interested In:</p>
                  <div className="flex flex-wrap gap-2">
                    {client.you2.skills.interested.map((skill, i) => (
                      <Badge key={i} className="bg-blue-100 text-blue-800">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ILWE Priorities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {client.you2.priorities.map((priority, i) => (
                    <Badge key={i} variant="outline" className="text-sm">
                      {i + 1}. {priority}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TUMAY Tab */}
          <TabsContent value="tumay" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Age</span>
                    <span className="font-medium">{client.tumay.age}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Location</span>
                    <span className="font-medium">{client.tumay.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Work Preference</span>
                    <span className="font-medium">{client.tumay.workPreference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Timeline</span>
                    <span className="font-medium">{client.tumay.timeline}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Credit Score</span>
                    <span className="font-medium">{client.tumay.creditScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Net Worth</span>
                    <span className="font-medium">{client.tumay.netWorth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Liquid Capital</span>
                    <span className="font-medium">{client.tumay.liquidCapital}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spouse/Partner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Name</span>
                  <span className="font-medium">{client.tumay.spouse.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Occupation</span>
                  <span className="font-medium">{client.tumay.spouse.occupation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Supportive</span>
                  <Badge className={client.tumay.spouse.supportive ? "bg-green-500" : "bg-red-500"}>
                    {client.tumay.spouse.supportive ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Involvement</span>
                  <p className="text-sm mt-1">{client.tumay.spouse.involvement}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Industries of Interest</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {client.tumay.industriesOfInterest.map((industry, i) => (
                    <Badge key={i} variant="secondary">{industry}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Why Now?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{client.tumay.whyNow}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vision Statement Tab */}
          <TabsContent value="vision" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vision Paragraph</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                  <p className="text-slate-700 italic">"{client.visionStatement.paragraph}"</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Journey Mindset</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{client.visionStatement.journeyMindset}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Success Definition</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{client.visionStatement.successDefinition}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Motivators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-semibold text-green-800">Income Goal</p>
                  <p className="text-green-700">{client.visionStatement.motivators.income}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800">Financial Freedom</p>
                  <p className="text-blue-700">{client.visionStatement.motivators.financialFreedom}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm font-semibold text-orange-800">Work/Life Balance</p>
                  <p className="text-orange-700">{client.visionStatement.motivators.workLife}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fathom Tab */}
          <TabsContent value="fathom" className="space-y-4">
            {client.fathomNotes.map((note, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Call Notes - {note.date}</CardTitle>
                    <Badge variant="outline">{note.stage}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Notes:</p>
                    <p className="text-slate-600">{note.notes}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Next Steps:</p>
                    <p className="text-slate-600">{note.nextSteps}</p>
                  </div>

                  {note.blockers.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-red-600 mb-2">Blockers:</p>
                      <ul className="space-y-1">
                        {note.blockers.map((blocker, j) => (
                          <li key={j} className="text-sm text-slate-600 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                            {blocker}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {note.wins.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-green-600 mb-2">Wins:</p>
                      <ul className="space-y-1">
                        {note.wins.map((win, j) => (
                          <li key={j} className="text-sm text-slate-600 flex items-start gap-2">
                            <Star className="h-4 w-4 text-green-500 mt-0.5" />
                            {win}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientIntelligence() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [clients, setClients] = useState<Client[]>(sampleClients);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const handleFilesUploaded = (files: UploadedFile[]) => {
    const parsedDocs = files
      .filter(f => f.status === 'complete' && f.content)
      .map(f => parseDocument(f.content!, f.name));
    
    if (parsedDocs.length > 0) {
      const newClientData = generateClientFromDocuments(parsedDocs);
      
      // Create a new client from the parsed documents
      const newClient: Client = {
        id: newClientData.id || Math.random().toString(36).substring(7),
        name: newClientData.name || 'New Client',
        company: 'Unknown Company',
        email: '',
        phone: '',
        industry: 'Unknown',
        stage: 'Initial Contact',
        avatar: (newClientData.name?.charAt(0) || 'N').toUpperCase(),
        persona: 'Strategic',
        confidence: 50,
        recommendation: 'NURTURE',
        disc: newClientData.disc || {
          style: 'I',
          description: 'DISC profile pending',
          traits: ['Profile uploaded'],
          coachingTips: ['Review DISC assessment']
        },
        you2: newClientData.you2 || {
          statement: 'You 2.0 statement pending',
          dangers: [],
          opportunities: [],
          skills: { favorites: [], delegate: [], interested: [] },
          priorities: ['Income', 'Lifestyle', 'Wealth', 'Equity']
        },
        tumay: newClientData.tumay || {
          age: 0,
          location: '',
          workPreference: '',
          timeline: '',
          creditScore: 0,
          netWorth: '',
          liquidCapital: '',
          spouse: { name: '', occupation: '', supportive: false, involvement: '' },
          industriesOfInterest: [],
          skills: [],
          notInterestedIn: [],
          whyNow: ''
        },
        visionStatement: newClientData.visionStatement || {
          paragraph: 'Vision statement pending',
          journeyMindset: '',
          successDefinition: '',
          motivators: { income: '', financialFreedom: '', workLife: '' }
        },
        fathomNotes: newClientData.fathomNotes || [],
        readiness: { identity: 3, commitment: 3, financial: 3, execution: 3 },
        notes: ['Client created from uploaded documents'],
        lastContact: new Date().toISOString(),
        nextAction: 'Review uploaded documents',
        createdAt: new Date().toISOString(),
        ilwe: {
          income: { current: '', target: '', timeline: '' },
          lifestyle: { desired: '', current: '', gap: '' },
          wealth: { strategy: '', target: '' },
          equity: { goal: '', timeline: '' }
        }
      };

      setClients(prev => [...prev, newClient]);
      setUploadMessage(`Successfully imported ${parsedDocs.length} document(s) for ${newClient.name}`);
      setTimeout(() => setUploadMessage(null), 5000);
    }
    
    setShowUploadDialog(false);
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.industry.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStage = selectedStage === 'all' || client.stage === selectedStage;
      
      return matchesSearch && matchesStage;
    });
  }, [searchTerm, selectedStage]);

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Upload Message */}
      {uploadMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <p className="text-green-800 font-medium">{uploadMessage}</p>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search clients by name, company, or industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Stages</option>
            {Object.keys(stageConfig).map((key) => (
              <option key={key} value={key}>{stageConfig[key as keyof typeof stageConfig].label}</option>
            ))}
          </select>
          <Button 
            onClick={() => setShowUploadDialog(true)}
            className="ml-2 bg-[#C4B7D9] hover:bg-[#C4B7D9]/90 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Client
          </Button>
        </div>
      </div>

      {/* Local File Watcher (Airgapped Mode) */}
      <LocalFileWatcher 
        watchPath="./client-files"
        onFilesImported={(files) => {
          // Convert watched files to uploaded files format
          const mockUploadedFiles: UploadedFile[] = files.map(f => ({
            id: f.id,
            name: f.name,
            type: 'text/plain',
            size: 0,
            content: `[${f.type} Document]`,
            status: 'complete',
            progress: 100
          }));
          handleFilesUploaded(mockUploadedFiles);
        }}
      />

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <Card 
            key={client.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow group"
            onClick={() => handleClientClick(client)}
          >
            <CardContent className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: discColors[client.disc.style] }}
                  >
                    {client.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-sm text-slate-500">{client.company}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge 
                  style={{ backgroundColor: stageConfig[client.stage].color }}
                  className="text-slate-700 text-xs"
                >
                  {stageConfig[client.stage].label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {client.persona}
                </Badge>
                <DISCBadge style={client.disc.style} />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Readiness</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(Object.values(client.readiness).reduce((a, b) => a + b, 0) / 20) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {Math.round((Object.values(client.readiness).reduce((a, b) => a + b, 0) / 20) * 100)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Confidence</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          client.confidence >= 80 ? "bg-green-500" : client.confidence >= 60 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${client.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{client.confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <RecommendationBadge action={client.recommendation} confidence={client.confidence} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Client Detail Modal */}
      <ClientDetailModal 
        client={selectedClient}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#C4B7D9]" />
              Import Client Documents
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">Supported Document Types</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  DISC Assessments (.pdf, .txt)
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  You 2.0 Profiles (.txt, .json)
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  TUMAY Questionnaires (.json, .txt)
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Vision Statements (.txt)
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Fathom Notes (.txt)
                </div>
              </div>
            </div>

            <FileUploadZone 
              onFilesUploaded={handleFilesUploaded}
              acceptedTypes={['.pdf', '.txt', '.json']}
              maxFileSize={10}
            />

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-start gap-3">
                <FolderOpen className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">Airgapped Mode</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    For offline deployment, drop files in the <code className="bg-amber-100 px-1 rounded">./client-files</code> folder 
                    next to the app. The Local File Watcher above will detect and import them automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
