import { useState, useEffect } from 'react';
import {
  BookOpen,
  Users,
  BarChart3,
  ClipboardCheck,
  Shield,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Sun,
  HelpCircle,
  ListChecks,
  Sparkles,
  Info,
  Brain,
  Layers,
} from 'lucide-react';
import { SkeletonCard } from '@/components/SkeletonCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <div className="mb-4 overflow-hidden rounded-lg border border-[#D1D5DB]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-[#FAFAFA] p-4 transition-colors hover:bg-[#F5F5F5]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C4B7D9]/20">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-[#333333]">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-[#6B6B6B]" />
        ) : (
          <ChevronRight className="h-5 w-5 text-[#6B6B6B]" />
        )}
      </button>
      {isOpen && <div className="bg-white p-4">{children}</div>}
    </div>
  );
}

function StepNumber({ number }: { number: number }) {
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#C4B7D9] text-sm font-bold text-white">
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
      <div className="space-y-4 p-6">
        <SkeletonCard lines={4} lineHeight={20} />
        <SkeletonCard lines={3} lineHeight={16} />
        <SkeletonCard lines={5} lineHeight={14} />
      </div>
    );
  }

  const navItems = [
    { label: 'What is Coach Bot?', icon: <BookOpen className="h-4 w-4" />, section: 'what-is-coach-bot' },
    { label: 'What is coming next', icon: <Sparkles className="h-4 w-4" />, section: 'coming-next' },
    {
      label: 'Important data notes',
      icon: <Info className="h-4 w-4" />,
      section: 'important-data-notes',
    },
    { label: 'UAT Checklist', icon: <ListChecks className="h-4 w-4" />, section: 'uat-checklist' },
    { label: 'Morning routine', icon: <Sun className="h-4 w-4" />, section: 'morning-routine' },
    {
      label: 'Pipeline Visualizer',
      icon: <Layers className="h-4 w-4" />,
      section: 'pipeline-visualizer',
    },
    {
      label: 'How Coach Bot makes decisions',
      icon: <Brain className="h-4 w-4" />,
      section: 'coach-bot-decisions',
    },
    { label: 'Client card tabs', icon: <Users className="h-4 w-4" />, section: 'client-tabs' },
    { label: 'After a call', icon: <ClipboardCheck className="h-4 w-4" />, section: 'after-call' },
    { label: 'Moving stages', icon: <BarChart3 className="h-4 w-4" />, section: 'pipeline-stages' },
    { label: 'Pink & green flags', icon: <AlertCircle className="h-4 w-4" />, section: 'pink-green-flags' },
    { label: 'Backup', icon: <Shield className="h-4 w-4" />, section: 'backup' },
    { label: 'Common questions', icon: <HelpCircle className="h-4 w-4" />, section: 'common-questions' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-[#C4B7D9] to-[#D4C7E9] p-6 text-white">
        <div className="mb-3 flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          <h1 className="text-2xl font-bold">How to Use Coach Bot</h1>
        </div>
        <p className="max-w-3xl text-white/90">
          A quick guide for Sandi — open this when you have five minutes before a call. Plain
          language, no fluff.
        </p>
      </div>

      <Card className="border-[#D1D5DB]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-[#C4B7D9]" />
            Jump to a section
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {navItems.map((item) => (
              <Button
                key={item.section}
                variant="outline"
                className="justify-start border-[#D1D5DB] hover:border-[#C4B7D9] hover:bg-[#C4B7D9]/10"
                onClick={() =>
                  document.getElementById(item.section)?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                {item.icon}
                <span className="ml-2 text-left text-sm">{item.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4 pr-4">
          <div id="what-is-coach-bot">
            <CollapsibleSection
              title="What is Coach Bot?"
              icon={<BookOpen className="h-5 w-5 text-[#C4B7D9]" />}
              defaultOpen
            >
              <div className="space-y-4 text-sm leading-relaxed text-[#333333]">
                <p>
                  Coach Bot is your private coaching intelligence system. It lives entirely on your
                  laptop. Nothing goes to the internet. Your client data never leaves your machine.
                </p>
                <p className="font-medium text-[#333333]">It does three things:</p>
                <ul className="list-inside list-disc space-y-2 text-[#6B6B6B]">
                  <li>Organizes everything you know about each client</li>
                  <li>Analyzes your Fathom calls automatically</li>
                  <li>Tells you what to focus on before every call</li>
                </ul>
              </div>
            </CollapsibleSection>
          </div>

          <div id="coming-next">
            <CollapsibleSection
              title="What is Coming Next"
              icon={<Sparkles className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6 text-sm leading-relaxed text-[#333333]">
                <h2 className="text-lg font-bold text-[#333333]">
                  Features Coming in the Next 90 Days
                </h2>
                <p className="text-[#6B6B6B]">
                  These features are built and on the roadmap. They are not available yet but are
                  coming soon:
                </p>

                <div className="space-y-5 text-[#6B6B6B]">
                  <div>
                    <p className="font-semibold text-[#333333]">
                      🗓️ Google Calendar Integration (April 2026)
                    </p>
                    <p>
                      Your coaching calls will appear automatically on your dashboard. Reminders you
                      set in Coach Bot will push to your Google Calendar.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#333333]">
                      📄 Vision Statement Generator (Month 2)
                    </p>
                    <p>
                      Coach Bot will draft the vision statement for each client using their DISC
                      profile, You 2.0, and Fathom sessions. You review and approve. It downloads as
                      a PowerPoint in your template automatically.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#333333]">🎯 Coaching Plan Tab (Month 2)</p>
                    <p>
                      Before every call, Coach Bot will tell you exactly what to focus on — which
                      emotional questions to ask, what blockers to address, and what wins to reinforce
                      based on this client&apos;s full profile.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#333333]">📊 Daily Coaching Brief (Month 2)</p>
                    <p>
                      Your dashboard will show who you are talking to today, who needs attention,
                      and any reminders due — all in one morning view.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#333333]">🧠 Pattern Intelligence (Month 3+)</p>
                    <p>
                      Once you have 50+ clients coached, Coach Bot will identify patterns — which
                      approaches work for which DISC types, how long clients typically spend in each
                      compartment, and what coaching moves lead to conversions.
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div id="important-data-notes">
            <CollapsibleSection
              title="Important Notes About Your Data"
              icon={<Info className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6 text-sm leading-relaxed text-[#333333]">
                <h2 className="text-lg font-bold text-[#333333]">Important Notes About Your Data</h2>

                <div>
                  <h3 className="mb-2 text-base font-semibold text-[#333333]">Session Dates</h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>
                      The Last Contact date shown on client cards and the Gone Quiet badge are based
                      on the most recent Fathom session you have uploaded to Coach Bot.
                    </p>
                    <p>
                      If you coached a client recently but have not yet uploaded that Fathom
                      transcript, Coach Bot does not know about that call yet.
                    </p>
                    <p className="font-medium text-[#333333]">To keep dates current:</p>
                    <p>
                      Upload each new Fathom transcript after every coaching call. Admin Streamliner
                      → Import → drop the PDF.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-base font-semibold text-[#333333]">Vision Statements</h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>
                      All clients currently show &quot;Vision statement not yet generated.&quot; This
                      is expected — the Vision Statement Generator is coming in Month 2. Your clients
                      are not missing anything.
                    </p>
                    <p>
                      Coach Bot will generate these automatically once that feature is released.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-base font-semibold text-[#333333]">Profile Completeness</h3>
                  <p className="text-[#6B6B6B]">
                    The Profile Completeness percentage on your dashboard counts clients who have:
                    DISC report + You 2.0 + TUMAY + at least one Fathom session. Vision statements
                    are NOT counted yet because they are generated in Month 2.
                  </p>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div id="uat-checklist">
            <CollapsibleSection
              title="UAT Checklist"
              icon={<ListChecks className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6 text-sm leading-relaxed text-[#333333]">
                <h2 className="text-lg font-bold text-[#333333]">
                  UAT Checklist — Executive Dashboard
                </h2>
                <p className="text-[#6B6B6B]">
                  When you first open Coach Bot, check these 5 things on your dashboard:
                </p>

                <div className="space-y-5">
                  <div className="flex gap-3">
                    <StepNumber number={1} />
                    <div className="min-w-0 space-y-1 text-[#6B6B6B]">
                      <p className="font-semibold text-[#333333]">Total Clients shows 16</p>
                      <p>
                        If you see a different number, note it in your feedback form.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <StepNumber number={2} />
                    <div className="min-w-0 space-y-1 text-[#6B6B6B]">
                      <p className="font-semibold text-[#333333]">
                        AI Recommendations shows: VALIDATE 2, GATHER 7, PAUSE 4
                      </p>
                      <p>
                        If the numbers look wrong for your clients, note it in your feedback form.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <StepNumber number={3} />
                    <div className="min-w-0 space-y-1 text-[#6B6B6B]">
                      <p className="font-semibold text-[#333333]">
                        Validate Clients section shows Alex Raiyn and Jeff Dayton
                      </p>
                      <p>These are your two clients in compartment 4 or 5 right now.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <StepNumber number={4} />
                    <div className="min-w-0 space-y-1 text-[#6B6B6B]">
                      <p className="font-semibold text-[#333333]">
                        5-Compartment Journey — check that your clients appear in the right
                        compartments.
                      </p>
                      <p>
                        If a client is in the wrong compartment, note their name and where they
                        should be.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <StepNumber number={5} />
                    <div className="min-w-0 space-y-1 text-[#6B6B6B]">
                      <p className="font-semibold text-[#333333]">
                        Time Saved — does 18.5 hours feel accurate based on the work Coach Bot has
                        done processing your files?
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[#6B6B6B]">
                  Rate the Executive Dashboard 1-5: 1 = confusing, 5 = exactly what I need every
                  morning.
                </p>

                <div className="space-y-6 border-t border-[#E5E7EB] pt-6">
                  <h2 className="text-lg font-bold text-[#333333]">
                    UAT Checklist — Client Intelligence
                  </h2>
                  <p className="text-[#6B6B6B]">
                    Check these things when reviewing your client cards:
                  </p>

                  <div className="space-y-5">
                    <div className="flex gap-3">
                      <StepNumber number={1} />
                      <div className="min-w-0 space-y-1 text-[#6B6B6B]">
                        <p className="font-semibold text-[#333333]">Overview tab — stage accuracy</p>
                        <p>
                          Open 3 client cards and check the Overview tab. Does the stage
                          (compartment) match where you know this client is in their journey? Note
                          any that are wrong.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <StepNumber number={2} />
                      <div className="min-w-0 space-y-1 text-[#6B6B6B]">
                        <p className="font-semibold text-[#333333]">DISC tab — coaching tips</p>
                        <p>
                          Check the DISC tab for 2 clients. Do the coaching tips match how you
                          actually coach this person? Note any that feel off.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <StepNumber number={3} />
                      <div className="min-w-0 space-y-1 text-[#6B6B6B]">
                        <p className="font-semibold text-[#333333]">Pink flags — Dena Sauer</p>
                        <p>
                          Check the pink flags on Dena Sauer. She has 2 active flags. Do they look
                          accurate based on what you know about her situation?
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <StepNumber number={4} />
                      <div className="min-w-0 space-y-1 text-[#6B6B6B]">
                        <p className="font-semibold text-[#333333]">Gone Quiet badges</p>
                        <p>
                          These are based on uploaded Fathom dates. If you coached someone recently
                          but have not uploaded that call yet, the badge may show incorrectly. This
                          will resolve once you upload your latest Fathom transcripts.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <StepNumber number={5} />
                      <div className="min-w-0 space-y-1 text-[#6B6B6B]">
                        <p className="font-semibold text-[#333333]">TUMAY tab — Andrew Tait</p>
                        <p>
                          All financial and personal data should be showing correctly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[#6B6B6B]">
                    Rate Client Intelligence 1-5: 1 = confusing, 5 = gives me everything I need before
                    a call.
                  </p>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div id="morning-routine">
            <CollapsibleSection
              title="Your morning routine"
              icon={<Sun className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-3">
                <div className="flex gap-3">
                  <StepNumber number={1} />
                  <p className="text-sm text-[#333333]">Open Coach Bot</p>
                </div>
                <div className="flex gap-3">
                  <StepNumber number={2} />
                  <p className="text-sm text-[#333333]">
                    Check the Dashboard — see who needs attention today
                  </p>
                </div>
                <div className="flex gap-3">
                  <StepNumber number={3} />
                  <p className="text-sm text-[#333333]">
                    Look for Gone Quiet badges — clients you have not spoken to in a while
                  </p>
                </div>
                <div className="flex gap-3">
                  <StepNumber number={4} />
                  <p className="text-sm text-[#333333]">
                    Check your pink flags — anything that needs addressing before a call
                  </p>
                </div>
                <div className="flex gap-3">
                  <StepNumber number={5} />
                  <p className="text-sm text-[#333333]">
                    Open a client card before your first call and review their DISC tab and last
                    Fathom
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-6 border-t border-[#E5E7EB] pt-6 text-sm leading-relaxed text-[#333333]">
                <h2 className="text-lg font-bold text-[#333333]">Your Executive Dashboard</h2>
                <p>
                  This is your home screen. Open it every morning. It shows you everything you need to
                  know in 60 seconds.
                </p>

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">The 6 KPI Cards</h3>
                  <div className="space-y-4 text-[#6B6B6B]">
                    <div>
                      <p className="font-semibold text-[#333333]">Total Clients (16)</p>
                      <p>Everyone in your pipeline right now. Inactive clients are not counted.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#333333]">Clients with Sessions (7)</p>
                      <p>
                        Clients where you have uploaded at least one Fathom call. As you upload more
                        calls this number grows.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#333333]">Profile Completeness</p>
                      <p>
                        Share of active clients who have all four files (DISC, You 2.0, TUMAY, at
                        least one Fathom). See{' '}
                        <span className="font-medium text-[#333333]">
                          Profile Completeness on the Dashboard
                        </span>{' '}
                        below for the full definition.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#333333]">Conversion Rate (0%)</p>
                      <p>
                        How many clients have moved all the way from Initial Contact to Business
                        Purchase. This grows as clients complete their journey.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#333333]">Calls This Week (0)</p>
                      <p>
                        Fathom sessions you have uploaded this week. Upload a call transcript and
                        this updates.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#333333]">Time Saved (18.5 hrs)</p>
                      <p>
                        Hours saved by Coach Bot processing your sessions, profiles, and DISC reports
                        automatically instead of manually.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t border-[#E5E7EB] pt-6">
                  <h2 className="text-lg font-bold text-[#333333]">
                    What Does Readiness Score Mean?
                  </h2>
                  <p className="text-[#6B6B6B]">
                    The Readiness Score on each client card shows how complete their file is in
                    Coach Bot across 4 dimensions:
                  </p>
                  <ul className="list-none space-y-4 text-[#6B6B6B]">
                    <li>
                      <p className="font-semibold text-[#333333]">Identity (25 points)</p>
                      <p>
                        Does this client have a clear You 2.0 vision statement? The longer and more
                        detailed their vision, the higher this score.
                      </p>
                    </li>
                    <li>
                      <p className="font-semibold text-[#333333]">Commitment (25 points)</p>
                      <p>
                        Have they set a launch timeline? Is their spouse or partner on calls? Both
                        signal serious commitment.
                      </p>
                    </li>
                    <li>
                      <p className="font-semibold text-[#333333]">Financial (25 points)</p>
                      <p>
                        Do we have their credit score and net worth range from their TUMAY form? This
                        tells you if they are financially ready to invest.
                      </p>
                    </li>
                    <li>
                      <p className="font-semibold text-[#333333]">Execution (25 points)</p>
                      <p>
                        Do they have a DISC report, You 2.0, and at least one Fathom session? This
                        measures how much coaching work has been done.
                      </p>
                    </li>
                  </ul>
                  <p className="font-semibold text-[#333333]">
                    IMPORTANT: Readiness Score does NOT mean the client is ready to buy a franchise.
                    YOU decide when a client moves between compartments. Coach Bot just shows you how
                    complete their file is so you know what information you have going into each call.
                  </p>
                  <p className="text-[#6B6B6B]">
                    A client can have a low readiness score and still be close to a decision. A
                    client can have a high readiness score and still need more coaching time. Trust
                    your coaching judgment first.
                  </p>
                </div>

                <div className="space-y-4 border-t border-[#E5E7EB] pt-6">
                  <h2 className="text-lg font-bold text-[#333333]">
                    Profile Completeness on the Dashboard
                  </h2>
                  <p className="text-[#6B6B6B]">
                    The Profile Completeness percentage (94%) on your Executive Dashboard shows what
                    percentage of your active clients have ALL FOUR of these:
                  </p>
                  <ul className="list-inside list-disc space-y-2 text-[#6B6B6B]">
                    <li>DISC report uploaded</li>
                    <li>You 2.0 profile uploaded</li>
                    <li>TUMAY form uploaded</li>
                    <li>At least one Fathom session</li>
                  </ul>
                  <p className="text-[#6B6B6B]">
                    If this is below 100%, it means some clients are missing files. Open their card
                    and check which tab is empty.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-base font-semibold text-[#333333]">
                    AI Recommendations Donut
                  </h3>
                  <p className="mb-2 text-[#6B6B6B]">Shows how your pipeline is balanced:</p>
                  <ul className="list-inside list-disc space-y-2 text-[#6B6B6B]">
                    <li>
                      Green = VALIDATE (2) — clients in compartments 4 and 5, exploring businesses
                    </li>
                    <li>
                      Orange = GATHER (7) — clients in compartments 1 through 3, still learning
                    </li>
                    <li>Gray = PAUSE (4) — clients on hold</li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-base font-semibold text-[#333333]">
                    Pipeline Distribution
                  </h3>
                  <p className="text-[#6B6B6B]">
                    Bar chart showing how many clients are in each compartment. Tall bar at Seeker
                    Clarification means most of your clients are in early discovery phase.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-base font-semibold text-[#333333]">Validate Clients</h3>
                  <p className="text-[#6B6B6B]">
                    Your two most important clients right now. These are in compartment 4 or 5 and
                    need your attention to move toward a decision.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-base font-semibold text-[#333333]">
                    5-Compartment Coaching Journey
                  </h3>
                  <p className="text-[#6B6B6B]">
                    A snapshot of your entire pipeline. The number on each compartment card is how
                    many clients are currently there.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-base font-semibold text-[#333333]">Weekly Activity</h3>
                  <p className="text-[#6B6B6B]">
                    Will show your call and email activity once Google Calendar is connected. Coming
                    soon.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-base font-semibold text-[#333333]">DISC Distribution</h3>
                  <p className="text-[#6B6B6B]">
                    Shows the personality breakdown of all your clients. High I (7) means most of
                    your clients are Influencing style — enthusiastic, story-driven, people-oriented.
                  </p>
                </div>
              </div>

              <div
                id="pipeline-visualizer"
                className="mt-8 space-y-6 border-t border-[#E5E7EB] pt-6 text-sm leading-relaxed text-[#333333]"
              >
                <h2 className="text-lg font-bold text-[#333333]">Pipeline Visualizer</h2>
                <p className="text-[#6B6B6B]">
                  This page shows your entire client pipeline organized by compartment. Use it to move
                  clients between stages and see who is where in their journey.
                </p>

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">The Pipeline Board</h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>
                      Each column is a compartment. Clients appear as cards in their current compartment.
                    </p>
                    <p className="font-semibold text-[#333333]">Each client card shows:</p>
                    <ul className="list-inside list-disc space-y-2">
                      <li>Client name</li>
                      <li>GATHER, VALIDATE, or PAUSE badge</li>
                      <li>Readiness percentage</li>
                      <li>Two action buttons</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB] pt-6" aria-hidden />

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">Moving a Client Forward</h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>When a client is ready to move to the next compartment:</p>
                    <ol className="list-inside list-decimal space-y-2 pl-1">
                      <li>Find their card in the Pipeline Board</li>
                      <li>Click &quot;Move to next stage&quot;</li>
                      <li>The client moves to the next compartment</li>
                      <li>Coach Bot records the move in the audit log automatically</li>
                    </ol>
                    <p>Clients never move backwards.</p>
                    <p>If you move a client by mistake, contact Zubia to correct it.</p>
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB] pt-6" aria-hidden />

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">Moving a Client to PAUSE</h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>When life happens and a client needs to go on hold:</p>
                    <ol className="list-inside list-decimal space-y-2 pl-1">
                      <li>Find their card in the Pipeline Board</li>
                      <li>Click &quot;Move to PAUSE&quot;</li>
                      <li>Enter a pause reason (required)</li>
                      <li>Set a follow-up date (required)</li>
                      <li>The client moves to Paused status</li>
                    </ol>
                    <p>
                      Paused clients stay in their compartment but show a PAUSE badge. They are excluded
                      from your active pipeline counts.
                    </p>
                    <p className="font-semibold text-[#333333]">To reactivate a paused client:</p>
                    <p>
                      Go to their card in Client Intelligence and update their outcome status.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB] pt-6" aria-hidden />

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">The Conversion Funnel</h3>
                  <p className="text-[#6B6B6B]">
                    Shows how many clients are in each compartment right now. A healthy pipeline has
                    clients spread across multiple compartments — not all bunched in one.
                  </p>
                </div>

                <div className="border-t border-[#E5E7EB] pt-6" aria-hidden />

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">Pink Flags by Stage</h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>
                      Shows common warning signs at each compartment based on Sandi&apos;s coaching
                      experience. These are reference reminders for what to watch for — not your
                      individual client flags.
                    </p>
                    <p>
                      Your individual client pink flags are managed on each client&apos;s Overview tab in
                      Client Intelligence.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB] pt-6" aria-hidden />

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">
                    UAT Checklist — Pipeline Visualizer
                  </h3>
                  <div className="space-y-5 text-[#6B6B6B]">
                    <div className="flex gap-3">
                      <StepNumber number={1} />
                      <div className="min-w-0 space-y-1">
                        <p>
                          Does the Pipeline Board show your clients in the right compartments? Note any
                          client that appears in the wrong compartment.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <StepNumber number={2} />
                      <div className="min-w-0 space-y-1">
                        <p>
                          Does Compartment 2 show 9 clients? That is correct — most of your current
                          clients are in Seeker Clarification.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <StepNumber number={3} />
                      <div className="min-w-0 space-y-1">
                        <p>
                          Try clicking &quot;Move to next stage&quot; on a test client. Does it move
                          correctly? (You can move them back by contacting Zubia.)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <StepNumber number={4} />
                      <div className="min-w-0 space-y-1">
                        <p>Does the Conversion Funnel match what you expect from your pipeline?</p>
                      </div>
                    </div>
                    <p>
                      Rate the Pipeline Visualizer 1-5: 1 = confusing, 5 = I can manage my whole pipeline
                      from this page.
                    </p>
                  </div>
                </div>
              </div>

              <div
                id="coach-bot-decisions"
                className="mt-8 space-y-6 border-t border-[#E5E7EB] pt-6 text-sm leading-relaxed text-[#333333]"
              >
                <h2 className="text-lg font-bold text-[#333333]">
                  How Coach Bot Makes Decisions
                </h2>
                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">
                    VALIDATE, GATHER, and PAUSE
                  </h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>
                      Coach Bot looks at two things for every client: their compartment and their
                      status.
                    </p>
                    <p>
                      <span className="font-semibold text-[#333333]">PAUSE</span> — checked first.
                      If a client is paused, they always show PAUSE regardless of compartment. A
                      pause reason and follow-up date are required. Paused clients are not counted in
                      your active pipeline.
                    </p>
                    <p>
                      <span className="font-semibold text-[#333333]">VALIDATE</span> — compartments 4
                      and 5 only. If a client is in Client Career 2.0 or Business Purchase and they
                      are active, they show VALIDATE. These are your priority clients exploring real
                      opportunities.
                    </p>
                    <p>
                      <span className="font-semibold text-[#333333]">GATHER</span> — everyone else.
                      Initial Contact through Possibilities (compartments 1 through 3) all show
                      GATHER. You are still learning about them and building the relationship.
                    </p>
                    <p>
                      Inactive clients are hidden from your pipeline entirely. Their data is preserved
                      but they do not appear in any count.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB] pt-6" aria-hidden />

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">
                    Compartment Movement
                  </h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>
                      Clients move through 5 compartments in one direction only:
                    </p>
                    <p className="text-[#333333]">
                      Initial Contact → Seeker Connection → Seeker Clarification → Possibilities →
                      Client Career 2.0 → Business Purchase
                    </p>
                    <p className="font-semibold text-[#333333]">Rules:</p>
                    <ul className="list-inside list-disc space-y-2">
                      <li>Clients never move backwards</li>
                      <li>YOU move clients manually in the Pipeline Visualizer</li>
                      <li>C4 clients can explore multiple businesses — that is normal</li>
                      <li>Moving to Pause always requires a reason and a follow-up date</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB] pt-6" aria-hidden />

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">Pink Flags</h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>
                      Coach Bot detects pink flags automatically from your Fathom session notes.
                    </p>
                    <p>A pink flag means: address this before your next call with this client.</p>
                    <p className="font-semibold text-[#333333]">
                      Common flags Coach Bot detects:
                    </p>
                    <ul className="list-inside list-disc space-y-2">
                      <li>Spouse alignment unsure</li>
                      <li>Net worth below $250k — validate funding path early</li>
                      <li>Timeline slipping</li>
                      <li>Engagement risk</li>
                    </ul>
                    <p className="font-semibold text-[#333333]">When you address a flag:</p>
                    <p>
                      Open the client card → Overview tab → Click Mark Resolved. The flag turns
                      green and stays as a permanent record. It is no longer a call to action.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB] pt-6" aria-hidden />

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">Gone Quiet</h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>
                      Coach Bot tracks how long it has been since your last uploaded Fathom session.
                    </p>
                    <p>
                      If that gap exceeds the threshold for a client&apos;s compartment, a Gone
                      Quiet badge appears on their card.
                    </p>
                    <p className="font-semibold text-[#333333]">Thresholds:</p>
                    <ul className="list-inside list-disc space-y-2">
                      <li>Initial Contact: 14 days</li>
                      <li>Seeker Connection: 21 days</li>
                      <li>Seeker Clarification: 14 days</li>
                      <li>Possibilities: 14 days</li>
                      <li>Client Career 2.0: 60 days</li>
                      <li>Business Purchase: 60 days</li>
                    </ul>
                    <p>
                      When gone quiet fires, Coach Bot shows a re-engagement tip based on the
                      client&apos;s DISC style:
                    </p>
                    <ul className="list-inside list-disc space-y-2">
                      <li>D style: direct email, one question</li>
                      <li>I style: reconnect with the vision</li>
                      <li>S style: warm check-in, family first</li>
                      <li>C style: send data or an article</li>
                    </ul>
                    <p>
                      <span className="font-semibold text-[#333333]">Important:</span> Gone Quiet is
                      based on uploaded Fathom sessions. If you coached someone recently but have not
                      uploaded that transcript yet, the badge may show incorrectly. Update their Last
                      Contacted date on the Overview tab to fix this.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB] pt-6" aria-hidden />

                <div>
                  <h3 className="mb-3 text-base font-semibold text-[#333333]">Readiness Score</h3>
                  <div className="space-y-3 text-[#6B6B6B]">
                    <p>
                      The readiness score (0-100%) shows how complete a client&apos;s file is across
                      4 dimensions:
                    </p>
                    <ul className="list-none space-y-4">
                      <li>
                        <p className="font-semibold text-[#333333]">Identity (25 points)</p>
                        <p>
                          You 2.0 vision statement — length and detail signal how clearly they know
                          what they want.
                        </p>
                      </li>
                      <li>
                        <p className="font-semibold text-[#333333]">Commitment (25 points)</p>
                        <p>
                          Have they set a launch timeline? Is their spouse or partner on calls?
                        </p>
                      </li>
                      <li>
                        <p className="font-semibold text-[#333333]">Financial (25 points)</p>
                        <p>Credit score and net worth range from their TUMAY form.</p>
                      </li>
                      <li>
                        <p className="font-semibold text-[#333333]">Execution (25 points)</p>
                        <p>
                          DISC report extracted, You 2.0 uploaded, at least one Fathom session.
                        </p>
                      </li>
                    </ul>
                    <p>
                      This score tells you how much information you have — not whether the client is
                      ready to buy a franchise. Trust your coaching judgment. Coach Bot informs it.
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div id="client-tabs">
            <CollapsibleSection
              title="Client cards — your 7 tabs"
              icon={<Users className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-4 text-sm leading-relaxed text-[#6B6B6B]">
                <p>
                  <span className="font-semibold text-[#333333]">Overview</span> — Stage, readiness,
                  contact info, pink flags, and coaching notes at a glance. Gone Quiet badge appears
                  here if you have not connected in a while.
                </p>
                <p>
                  <span className="font-semibold text-[#333333]">DISC</span> — Their behavioral
                  style, key traits, scores, and coaching tips specific to their personality. Read
                  this before every call.
                </p>
                <p>
                  <span className="font-semibold text-[#333333]">You 2.0</span> — Their vision
                  statement, dangers, opportunities, and skills profile.
                </p>
                <p>
                  <span className="font-semibold text-[#333333]">TUMAY</span> — Financial profile,
                  timeline, spouse alignment, and industries of interest.
                </p>
                <p>
                  <span className="font-semibold text-[#333333]">Vision</span> — Their
                  entrepreneurial vision paragraph. Will be auto-generated in a future update.
                </p>
                <p>
                  <span className="font-semibold text-[#333333]">Fathom</span> — Every coaching call
                  organized into 9 blocks automatically. Opening, emotional discovery, life context,
                  vision, DISC signals, objections, commitments, reflection, and your coach
                  assessment.
                </p>
                <div className="mt-4 space-y-4 border-t border-[#E5E7EB] pt-4 text-[#6B6B6B]">
                  <h3 className="text-base font-semibold text-[#333333]">
                    Two Types of Fathom Sessions
                  </h3>
                  <p>Your Fathom tab may show one of two formats:</p>
                  <div className="space-y-2">
                    <p className="font-semibold text-[#333333]">Full CLEAR Session (9 blocks)</p>
                    <p>
                      When Coach Bot can identify all 9 parts of a structured coaching call, it
                      extracts them into separate blocks:
                    </p>
                    <p className="pl-1 text-[#333333]">
                      Opening, Emotional Discovery, Life Context, Vision, DISC Signals, Objections,
                      Commitments, Reflection, Coach Assessment
                    </p>
                    <p>A CLEAR score appears at the top.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-[#333333]">Pre-Structure Session</p>
                    <p>
                      Early or informal calls that do not follow the CLEAR framework are stored as a
                      plain summary note. These are labeled &quot;Pre-structure session&quot; and show
                      0/9 blocks. No CLEAR score is shown.
                    </p>
                  </div>
                  <p>
                    Both formats are normal and expected. Early calls with new clients are often
                    exploratory and do not yet follow a structured framework.
                  </p>
                  <p>
                    As you upload new Fathom transcripts from structured coaching calls, those will
                    show the full 9-block format with CLEAR scoring.
                  </p>
                </div>
                <p>
                  <span className="font-semibold text-[#333333]">Reminders</span> — Follow-up dates
                  and notes. Pause reason and follow-up date live here when a client is paused.
                </p>
              </div>
            </CollapsibleSection>
          </div>

          <div id="after-call">
            <CollapsibleSection
              title="After a coaching call"
              icon={<ClipboardCheck className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-3">
                <div className="flex gap-3">
                  <StepNumber number={1} />
                  <p className="text-sm text-[#333333]">Save your Fathom transcript as a PDF</p>
                </div>
                <div className="flex gap-3">
                  <StepNumber number={2} />
                  <p className="text-sm text-[#333333]">Go to Admin Streamliner → Import</p>
                </div>
                <div className="flex gap-3">
                  <StepNumber number={3} />
                  <p className="text-sm text-[#333333]">Drop the PDF into the import area</p>
                </div>
                <div className="flex gap-3">
                  <StepNumber number={4} />
                  <p className="text-sm text-[#333333]">
                    Coach Bot extracts all 9 blocks automatically
                  </p>
                </div>
                <div className="flex gap-3">
                  <StepNumber number={5} />
                  <p className="text-sm text-[#333333]">Open the client&apos;s Fathom tab to review</p>
                </div>
                <div className="flex gap-3">
                  <StepNumber number={6} />
                  <p className="text-sm text-[#333333]">
                    Check the coach assessment — it scores your call on the CLEAR framework
                    automatically
                  </p>
                </div>
                <div className="flex gap-3">
                  <StepNumber number={7} />
                  <p className="text-sm text-[#333333]">Review Next Call Planning checklist</p>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div id="pipeline-stages">
            <CollapsibleSection
              title="Moving clients between stages"
              icon={<BarChart3 className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-4 text-sm leading-relaxed text-[#6B6B6B]">
                <p className="text-[#333333]">
                  Your pipeline has 6 compartments: Initial Contact → Seeker Connection → Seeker
                  Clarification → Possibilities → Client Career 2.0 → Business Purchase
                </p>
                <p className="font-medium text-[#333333]">To move a client:</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <StepNumber number={1} />
                    <p className="text-sm text-[#333333]">Go to Pipeline Visualizer</p>
                  </div>
                  <div className="flex gap-3">
                    <StepNumber number={2} />
                    <p className="text-sm text-[#333333]">Click a compartment to see who is in it</p>
                  </div>
                  <div className="flex gap-3">
                    <StepNumber number={3} />
                    <p className="text-sm text-[#333333]">
                      Click Move to Next Stage or Move to Pause
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <StepNumber number={4} />
                    <p className="text-sm text-[#333333]">
                      Pausing always asks for a reason and follow-up date — both are required
                    </p>
                  </div>
                </div>
                <p>Clients never move backwards.</p>
                <p>
                  C4 clients can explore multiple businesses — that is normal, not a problem.
                </p>
              </div>
            </CollapsibleSection>
          </div>

          <div id="pink-green-flags">
            <CollapsibleSection
              title="Pink flags and green flags"
              icon={<CheckCircle className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-4 text-sm leading-relaxed text-[#6B6B6B]">
                <p>
                  <span className="font-semibold text-[#333333]">Pink flag</span> = something needs
                  your attention before the next call.
                </p>
                <p>Coach Bot detects pink flags automatically from your Fathom notes.</p>
                <p className="font-medium text-[#333333]">When you have addressed a pink flag:</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <StepNumber number={1} />
                    <p className="text-sm text-[#333333]">Open the client card → Overview tab</p>
                  </div>
                  <div className="flex gap-3">
                    <StepNumber number={2} />
                    <p className="text-sm text-[#333333]">Find the pink flag</p>
                  </div>
                  <div className="flex gap-3">
                    <StepNumber number={3} />
                    <p className="text-sm text-[#333333]">Click Mark Resolved</p>
                  </div>
                  <div className="flex gap-3">
                    <StepNumber number={4} />
                    <p className="text-sm text-[#333333]">
                      It turns green — stays as a record but is no longer a call to action
                    </p>
                  </div>
                </div>
                <p>
                  <span className="font-semibold text-[#333333]">Green flag</span> = addressed.
                  Historical record only.
                </p>
              </div>
            </CollapsibleSection>
          </div>

          <div id="backup">
            <CollapsibleSection
              title="Backup"
              icon={<Shield className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-4 text-sm leading-relaxed text-[#6B6B6B]">
                <p>Coach Bot backs up automatically.</p>
                <p>
                  The green dot in the bottom status bar shows your last backup date.
                </p>
                <p className="font-medium text-[#333333]">To back up manually:</p>
                <ul className="list-inside list-disc space-y-2">
                  <li>Click the green dot in the status bar</li>
                  <li>Or go to Admin Streamliner → Settings → Backup Now</li>
                </ul>
                <p>Keep backups current. Your client data lives only on this machine.</p>
              </div>
            </CollapsibleSection>
          </div>

          <div id="common-questions">
            <CollapsibleSection
              title="Common questions"
              icon={<HelpCircle className="h-5 w-5 text-[#C4B7D9]" />}
            >
              <div className="space-y-6 text-sm leading-relaxed">
                <div>
                  <p className="mb-2 font-semibold text-[#333333]">
                    Why is Ollama running in the background?
                  </p>
                  <p className="text-[#6B6B6B]">
                    Ollama is your private AI engine. It runs locally on your laptop and never
                    connects to the internet. It powers the automatic analysis of your Fathom calls.
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-[#333333]">
                    Can I use Coach Bot without internet?
                  </p>
                  <p className="text-[#6B6B6B]">
                    Yes. Always. Coach Bot is fully offline. The only time you need internet is the
                    first-time setup.
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-[#333333]">
                    What if I close the app mid-session?
                  </p>
                  <p className="text-[#6B6B6B]">
                    Everything is saved automatically to your local database. Nothing is lost.
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-[#333333]">
                    What do VALIDATE, GATHER, and PAUSE mean?
                  </p>
                  <ul className="list-inside list-disc space-y-2 text-[#6B6B6B]">
                    <li>
                      GATHER = client is in Initial Contact through Possibilities (compartments 1–3).
                      You are still learning about them.
                    </li>
                    <li>
                      VALIDATE = client is in Client Career 2.0 or Business Purchase (compartments
                      4–5). They are exploring specific businesses.
                    </li>
                    <li>
                      PAUSE = life happened. They are on hold with a reason and follow-up date set.
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-[#333333]">
                    What is the Gone Quiet badge?
                  </p>
                  <p className="text-[#6B6B6B]">
                    It means you have not connected with this client in longer than expected for
                    their stage. Coach Bot suggests a re-engagement approach based on their DISC
                    style.
                  </p>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-[#333333]">How do I add a new client?</p>
                  <p className="text-[#6B6B6B]">
                    Go to Client Intelligence → Add Client. Then drop their DISC, You 2.0, TUMAY,
                    and Fathom files into Admin Streamliner → Import. Coach Bot extracts everything
                    automatically.
                  </p>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
