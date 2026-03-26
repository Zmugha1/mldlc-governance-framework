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
    { label: 'Morning routine', icon: <Sun className="h-4 w-4" />, section: 'morning-routine' },
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
                      <p className="font-semibold text-[#333333]">Profile Completeness (100%)</p>
                      <p>
                        How many clients have all four files: DISC report, You 2.0, TUMAY, and at
                        least one Fathom call. 100% means all your active clients have complete files.
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
