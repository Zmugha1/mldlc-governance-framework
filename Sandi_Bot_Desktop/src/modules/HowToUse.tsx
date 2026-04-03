const CREAM = '#FEFAF6';
const HEADER = '#2D4459';
const MUTED = '#7A8F95';
const BORDER = '#C8E8E5';
const CORAL = '#C8613F';
const CORAL_SOFT = '#F05F57';
const UAT_BG = '#FFF8F0';

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: '24px 28px',
  marginBottom: 16,
  border: `1px solid ${BORDER}`,
};

const uatBoxStyle: React.CSSProperties = {
  background: UAT_BG,
  borderLeft: `4px solid ${CORAL_SOFT}`,
  borderRadius: 8,
  padding: '16px 20px',
  marginTop: 20,
};

function PageSection({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={cardStyle}>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {icon}
        </span>
        <h2 className="text-[18px] font-bold" style={{ color: HEADER }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function UatBlock({ questions }: { questions: string[] }) {
  return (
    <div style={uatBoxStyle}>
      <h3
        className="mb-3 text-[13px] font-bold uppercase tracking-wide"
        style={{ color: CORAL }}
      >
        📋 UAT Feedback Questions
      </h3>
      <ol
        className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed"
        style={{ color: HEADER }}
      >
        {questions.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ol>
    </div>
  );
}

export default function HowToUse() {
  return (
    <div className="min-h-full w-full py-8" style={{ background: CREAM }}>
      <div className="mx-auto px-4" style={{ maxWidth: 800 }}>
        <header className="mb-6 text-center">
          <h1 className="font-bold" style={{ color: HEADER, fontSize: 24 }}>
            How to Use Coach Bot
          </h1>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed" style={{ color: MUTED, fontSize: 14 }}>
            Your daily coaching command center. Here is what each page does and how to get the most out of
            it.
          </p>
          <p className="mt-2 text-[11px]" style={{ color: MUTED }}>
            v2.0 — April 2026
          </p>
        </header>

        {/* PAGE 1 — MORNING BRIEF */}
        <PageSection icon="☀️" title="Morning Brief">
          <p className="text-[13px] leading-relaxed" style={{ color: HEADER }}>
            Your daily coaching command center. Open this every morning to see what needs your attention
            today.
          </p>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            Key elements
          </h3>
          <ul
            className="list-disc space-y-3 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>
              Greeting card — shows today&apos;s date and your placement pulse. 3 of 11 means 3 placements
              made out of your 11 placement goal.
            </li>
            <li>
              Today&apos;s Focus pills — at a glance view of gone quiet clients, pink flags, weekly input
              needed, and clients at risk.
            </li>
            <li>
              Needs Attention — clients who need your response today. Click Open Client to go directly to
              their card.
            </li>
            <li>
              This Week&apos;s Inputs — log your Seekers Scheduled and Seekers Spoken To numbers each week.
              Target: 15 scheduled, 10 spoken.
            </li>
            <li>
              KPI grid — total clients, VALIDATE count, GATHER count, PAUSE count, placement tracker, and time
              saved.
            </li>
            <li>
              Clients at a Glance — your full pipeline in one table. Filter by stage or status. Click any
              client to open their card.
            </li>
          </ul>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            How to use it daily
          </h3>
          <ol
            className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>Check Today&apos;s Focus pills — these are your priorities</li>
            <li>Open each Needs Attention client and take action</li>
            <li>Log your weekly seeker numbers</li>
            <li>Review Clients at a Glance for anyone you may have missed</li>
          </ol>
          <UatBlock
            questions={[
              'Does the greeting feel welcoming when you open the app?',
              'Can you tell at a glance what needs your attention today?',
              'Is the gone quiet list showing the right clients?',
              'Did you log your weekly seeker numbers?',
              'Would you open this page every morning?',
            ]}
          />
        </PageSection>

        {/* PAGE 2 — BUSINESS GOALS */}
        <PageSection icon="🎯" title="Business Goals">
          <p className="text-[13px] leading-relaxed" style={{ color: HEADER }}>
            Your $300,000 business plan tracked in real time. Everything on this page connects directly to
            your annual targets.
          </p>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            Key elements
          </h3>
          <ul
            className="list-disc space-y-3 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>
              C3 North Star — your most important weekly metric. 2.5 C3 presentations per week puts you on
              track for 11 placements and $300,000. This number resets every Monday.
            </li>
            <li>
              Revenue Story — $84,000 made, $300,000 target, projected year end based on your current pace.
            </li>
            <li>
              Where to Focus — your business plan gaps and what to do about them. Each row shows your current
              rate, the target, and a one-click action to improve it.
            </li>
            <li>
              Intelligence cards — decisions logged, pink flags resolved, and clients ready to place.
            </li>
          </ul>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            How to use it weekly
          </h3>
          <ol
            className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>Check C3 North Star every Monday — have you presented to 2-3 clients this week?</li>
            <li>Review Where to Focus — which conversion rate needs your attention most?</li>
            <li>Click action pills to go directly to the right clients</li>
          </ol>
          <UatBlock
            questions={[
              'Does the C3 North Star make sense as your most important weekly metric?',
              'Is the $300,000 projection motivating or stressful?',
              'Do the Where to Focus rows help you know what to do?',
              'Did you click any action pills? Did they take you to the right place?',
              'Is anything missing from your business plan view?',
            ]}
          />
        </PageSection>

        {/* PAGE 3 — CLIENT INTELLIGENCE */}
        <PageSection icon="👤" title="Client Intelligence">
          <p className="text-[13px] leading-relaxed" style={{ color: HEADER }}>
            Everything about every client. Use this before every call to prepare and after every call to
            capture what you learned.
          </p>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            Key elements — tabs explained
          </h3>
          <ul
            className="list-disc space-y-3 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>
              Overview — stage, persona, readiness score, pink flags, and contact info. Move clients forward
              or back using the stage movement buttons.
            </li>
            <li>
              DISC — behavioral style scores, key traits, and coaching tips specific to this client&apos;s
              communication style.
            </li>
            <li>
              You 2.0 — their one year vision, declared dangers, strengths, and opportunities. This is what
              drives their decisions.
            </li>
            <li>
              TUMAY — Tell Us More About You. Financial profile, industries of interest, spouse information,
              and reasons for change.
            </li>
            <li>
              Vision — generate a draft vision statement for this client. Review and edit it, then approve
              it. Download as PowerPoint for your presentation or PDF for the client to keep.
            </li>
            <li>
              Fathom — session history and 9-block coaching analysis. Upload Fathom transcripts in Admin
              Streamliner to populate this tab with real session data.
            </li>
            <li>
              Reminders — set follow up reminders for this client. Use for re-engagement after going quiet or
              after a POC.
            </li>
            <li>
              Best Next Questions — generate coaching questions grounded in this client&apos;s DISC profile,
              You 2.0 pain points, current stage, and last session. Questions follow the CLEAR framework.
              Click Generate Questions before every call.
            </li>
          </ul>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            Filters explained
          </h3>
          <p className="text-[13px] leading-relaxed" style={{ color: HEADER }}>
            Use the filter pills at the top of the client list to quickly find:
          </p>
          <ul
            className="mt-2 list-disc space-y-2 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>VALIDATE — C4 and C5 clients exploring specific businesses</li>
            <li>GATHER — IC through C3 clients still discovering</li>
            <li>PAUSE — clients on hold</li>
            <li>Gone Quiet — clients who have not been contacted recently</li>
          </ul>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            How to use it before a call
          </h3>
          <ol
            className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>Open the client card</li>
            <li>Check Overview — stage and readiness score</li>
            <li>Read You 2.0 — refresh your memory on their vision and pain points</li>
            <li>Go to Best Next Questions — click Generate Questions</li>
            <li>Use the questions on your call</li>
          </ol>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            How to use it after a call
          </h3>
          <ol
            className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>Go to Fathom — add a session note with what happened</li>
            <li>Log an Aha Moment if you captured an insight</li>
            <li>Update Last Contacted date</li>
            <li>Mark any pink flags resolved if addressed</li>
          </ol>
          <UatBlock
            questions={[
              'Can you find a client quickly using search or filters?',
              'Does the client card feel complete before a call?',
              'Did you try Best Next Questions? Were the questions useful or too generic?',
              'Did you generate a vision statement? Did it feel accurate for this client?',
              'Did you add a session note after a call?',
              'Is anything missing from the client card?',
            ]}
          />
        </PageSection>

        {/* PAGE 4 — COACHING ACTIONS */}
        <PageSection icon="⚡" title="Coaching Actions">
          <p className="text-[13px] leading-relaxed" style={{ color: HEADER }}>
            Every signal that needs your response in one place. Coach Bot monitors your pipeline and flags
            clients who need attention.
          </p>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            Key elements
          </h3>
          <ul
            className="list-disc space-y-3 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>
              Signals Needing Response — clients with active gone quiet or pink flag signals. For each client
              select your response from the dropdown — this logs your decision and clears the signal.
            </li>
            <li>
              Signal types:
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  Gone quiet — client has not been contacted within their stage threshold
                  <br />
                  IC: 14 days
                  <br />
                  C1: 21 days
                  <br />
                  C2/C3: 14 days
                  <br />
                  C4/C5: 60 days
                </li>
                <li>
                  Pink flags — specific concerns flagged by Coach Bot such as spouse alignment unsure or net
                  worth below threshold
                </li>
                <li>At risk — C3/C4 client with no recent session activity</li>
              </ul>
            </li>
            <li>
              Golden Rules — what made each converted client say yes. These appear as you capture coaching
              notes over time.
            </li>
            <li>
              Decision History — every response you log to a signal. Your track record of keeping clients
              engaged.
            </li>
          </ul>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            How to use it
          </h3>
          <ol
            className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>Open Coaching Actions daily</li>
            <li>For each signal select your response from the dropdown</li>
            <li>If you called — select Called left voicemail</li>
            <li>If you scheduled — select Scheduled session</li>
            <li>Your response is logged and the signal clears</li>
          </ol>
          <UatBlock
            questions={[
              'Are the signals showing the right clients?',
              'Is any client showing as at risk when they should not be?',
              'Did you log a response to any signal?',
              'Are the DISC re-engagement tips helpful?',
              'Is anything confusing about how signals work?',
            ]}
          />
        </PageSection>

        {/* PAGE 5 — MY PRACTICE */}
        <PageSection icon="📊" title="My Practice">
          <p className="text-[13px] leading-relaxed" style={{ color: HEADER }}>
            Your coaching performance tracked and scored. This is the crown jewel — it tells you how you are
            performing as a coach and where to improve.
          </p>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            Key elements
          </h3>
          <ul
            className="list-disc space-y-3 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>
              Performance Score — 0 to 100. Starts low and grows every day you use Coach Bot. Your score
              reflects six dimensions of coaching quality.
            </li>
            <li>
              Score breakdown:
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Placement pace — placements made vs annual target</li>
                <li>C3 North Star — weekly C3 presentation rate</li>
                <li>Response rate — how quickly you respond to signals</li>
                <li>Data complete — how complete your client profiles are</li>
                <li>CLEAR quality — coaching session quality score</li>
                <li>Aha moments — insights captured from sessions</li>
              </ul>
            </li>
            <li>Revenue tab — $84K made, $300K target, projected year end at current pace.</li>
            <li>Pipeline tab — stage movement rates and conversion funnel.</li>
            <li>Coaching tab — aha moments, golden rules, DISC distribution across your client base.</li>
            <li>Adoption tab — how actively you are using Coach Bot.</li>
            <li>Intelligence tab — profile completeness for each client.</li>
          </ul>
          <h3 className="mb-2 mt-5 text-sm font-semibold" style={{ color: HEADER }}>
            How to use it
          </h3>
          <ol
            className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>Check your score weekly — watch it grow as you coach</li>
            <li>Look at which dimension is lowest — that is where to focus</li>
            <li>
              Capture aha moments from client sessions — they improve your score and build your coaching
              library
            </li>
            <li>Review DISC distribution — are you coaching the right mix of clients?</li>
          </ol>
          <UatBlock
            questions={[
              'Does the performance score feel motivating or confusing?',
              'Do you understand what each dimension means?',
              'Did you capture an aha moment from any client session?',
              'Does the Year 2 preview excite you about what Coach Bot will become?',
              'Does this page make you want to use Coach Bot more?',
            ]}
          />
        </PageSection>

        {/* GENERAL UAT */}
        <section style={{ ...cardStyle, marginBottom: 24 }}>
          <h2 className="mb-4 font-bold" style={{ color: HEADER, fontSize: 16 }}>
            Overall Feedback
          </h2>
          <ol
            className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed"
            style={{ color: HEADER }}
          >
            <li>What is the one thing you love most about Coach Bot?</li>
            <li>What is the one thing that confuses you most?</li>
            <li>What is missing that you expected to see?</li>
            <li>Would you open Coach Bot every morning?</li>
            <li>On a scale of 1-10 how valuable is Coach Bot to your practice right now?</li>
          </ol>
          <p className="mt-4 italic leading-relaxed" style={{ color: MUTED, fontSize: 12 }}>
            Your feedback directly shapes the next version of Coach Bot. Use the feedback button on each page
            to share what you notice as you use it.
          </p>
        </section>

        <footer className="pb-8 text-center text-[11px]" style={{ color: MUTED }}>
          Coach Bot v2.0 · Built for Sandi Stahl · April 2026
        </footer>
      </div>
    </div>
  );
}
