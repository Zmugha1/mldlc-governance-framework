import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Video,
  Copy,
  Bot,
  FileText,
  Plus,
  ClipboardPaste,
  Clock,
  Brain,
  ArrowRight,
} from 'lucide-react';

const PAGE_BG = '#FEFAF6';
const HEADER = '#2D4459';
const MUTED = '#7A8F95';
const BORDER = '#C8E8E5';
const TEAL = '#3BBFBF';

type LabSubSection = {
  heading: string;
  items: string[];
};

type LabSpec = {
  n: number;
  title: string;
  minutes: string;
  whatYouWillDo: string;
  steps: string[];
  success: string;
  subSections?: LabSubSection[];
  afterStepsNote?: string;
};

const LABS: LabSpec[] = [
  {
    n: 1,
    title: 'Connect Gmail and Calendar',
    minutes: '~10 min',
    whatYouWillDo:
      'Authorize Coach Bot to read your inbox and calendar so Morning Brief and client cards can surface real signals.',
    steps: [
      'Open The Capture (admin) or the tool connection area from the sidebar.',
      'Click Connect for Gmail, complete the Google sign-in window, and approve the requested scopes.',
      'Click Connect for Google Calendar the same way.',
      'Return to Morning Brief and confirm you see today’s calls (or a clear “not connected” state is gone).',
      'Optional: send yourself a test email and confirm Coach Bot can read recent mail after refresh.',
    ],
    success:
      'Gmail and Calendar show as connected. Morning Brief can load today’s schedule without errors.',
  },
  {
    n: 2,
    title: 'Upload a Fathom Session',
    minutes: '~8 min',
    whatYouWillDo:
      'Use the unified Add Session area on the client Fathom tab: paste a Fathom transcript for extraction, or save notes on the My Notes tab. Optionally add Sandi’s Notes after extraction.',
    steps: [
      'Open Client Intelligence.',
      'Find the client whose transcript you have.',
      'Open their card.',
      'Click the Fathom tab.',
      'Set the Stage and Session Date.',
      'Click the Fathom Transcript tab.',
      'Open the Fathom app or website.',
      'Find the call transcript.',
      'Select all text (Ctrl+A).',
      'Copy (Ctrl+C).',
      'Paste into the text box (Ctrl+V).',
      'Click Extract Session.',
      'Watch the progress bar (often about 60-90 seconds).',
      'When done, the session appears below.',
      'Click Show 9-block analysis to review the blocks.',
    ],
    subSections: [
      {
        heading: 'OR use My Notes tab',
        items: [
          'Click the My Notes tab.',
          'Type your own session notes.',
          'Click Save Session.',
          'Notes are saved immediately.',
        ],
      },
      {
        heading: 'Add Sandi’s Notes to a session',
        items: [
          'Open any session row.',
          'Click Show 9-block analysis.',
          'Scroll to the bottom.',
          'Click Add Notes under Coach Assessment.',
          'Type your notes.',
          'Click Save Notes.',
        ],
      },
    ],
    success:
      'Success looks like: nine blocks populated with content from your session (or your My Notes text saved as-is). Last contacted date updates automatically to the session date you set.',
  },
  {
    n: 3,
    title: 'Move a Client Stage',
    minutes: '~5 min',
    whatYouWillDo:
      'Practice the real workflow: move one client’s pipeline stage and see badges and lists update.',
    steps: [
      'Open Client Intelligence and choose a client whose stage you are comfortable changing for practice.',
      'Find the stage control (pipeline / inferred stage) and move them one step forward or backward as appropriate.',
      'Save or confirm so the database records the movement.',
      'Return to Morning Brief or Clients at a Glance and confirm the stage label matches what you set.',
    ],
    success:
      'Stage saved in the database and reflected consistently on the client card and list views.',
  },
  {
    n: 4,
    title: 'Generate Best Next Questions',
    minutes: '~12 min',
    whatYouWillDo:
      'Run the Coaching Council for one upcoming call and capture Best Next Questions for that client.',
    steps: [
      'From the client card, open the Best Next Questions / council area for a client with a call soon.',
      'Run the council (Readiness, Alignment, Integrity lenses) and wait for each lens to finish.',
      'Read the chairman synthesis and the suggested questions.',
      'Star or note the two or three questions you will actually ask on the call.',
    ],
    afterStepsNote:
      'The Coaching Council takes 3-4 minutes to deliberate. Run this before your call starts, not during it. Click Generate, then review your client file while the Council works.',
    success:
      'You have a short list of council-backed questions ready for one real client conversation.',
  },
  {
    n: 5,
    title: 'Generate Vision Statement',
    minutes: '~15 min',
    whatYouWillDo:
      'Produce a client-ready vision narrative, rate it with the rubric, regenerate or finalize, and export PowerPoint when quality is good enough.',
    steps: [
      'Open the client’s Vision tab in Client Intelligence.',
      'Check the data foundation dots so Coach Bot has enough context.',
      'Click Generate Vision Statement.',
      'Wait 60-90 seconds for the draft.',
      'Read the generated text and edit directly in the box.',
      'Rate using the rubric: Accuracy 1-5, Completeness 1-5, Tone 1-5, Usefulness 1-5.',
      'If the score is below 3: click Regenerate with Feedback so Coach Bot improves the next version.',
      'If the score is 3 or above: click Looks Good — Download.',
      'Click Download PowerPoint; the file saves to your Downloads folder.',
      'Note: no em dashes will appear in the generated text. There is no PDF download — PowerPoint only.',
      'Remember: PPT brand color fields use six-digit hex without the # symbol for PptxGenJS.',
    ],
    success:
      'A draft you would not be embarrassed to share, or a clear path (regenerate with feedback) until it is client-ready.',
  },
  {
    n: 6,
    title: 'Review My Practice Score',
    minutes: '~8 min',
    whatYouWillDo:
      'Understand what the Coaching Quality Score is measuring so thin data does not feel like a personal “F.”',
    steps: [
      'Open My Practice from the sidebar.',
      'Your Coaching Quality Score is based on three sources:',
      'Session Quality (60%): based on your Fathom sessions analyzed against the CLEAR framework. Currently about 54% until more sessions are logged.',
      'Pipeline Effectiveness (25%): based on how clients advance through stages. Builds as you move clients in Coach Bot.',
      'Coaching Preparation (15%): based on how you rate questions in Best Next Questions. Builds as you rate questions.',
      'Your strongest dimension: Activate. Your focus area: Reflect. Locking insights at the end of sessions builds deeper commitment.',
      'If a slice is zero, treat it as “no signal yet,” not failure, until you have logged data there.',
    ],
    success:
      'You can explain in one sentence what the score is telling you and what you will do next week.',
  },
  {
    n: 7,
    title: 'Check System Health',
    minutes: '~5 min',
    whatYouWillDo:
      'Use the dedicated System Health page as the home for aggregate health instead of hunting badges on every screen.',
    steps: [
      'Open System Health from the sidebar.',
      'Scan overall status, data completeness, and any warnings.',
      'If you export training or UAT artifacts, confirm the paths suggested on that page still make sense.',
    ],
    success:
      'You know whether the app considers itself healthy and where to look if something drifts.',
  },
  {
    n: 8,
    title: 'Submit Feedback',
    minutes: '~5 min',
    whatYouWillDo:
      'Send at least one structured note from inside the app so the lab has a feedback trail.',
    steps: [
      'From Morning Brief (or any page you just used), click the feedback control for that page.',
      'Describe one friction point and one thing that worked.',
      'Submit. If you are blocked, capture the same text in email to Zubia as backup.',
    ],
    success:
      'At least one feedback item logged this week with enough detail that engineering can reproduce it.',
  },
];

const cardShell: CSSProperties = {
  background: 'white',
  borderRadius: 12,
  border: `1px solid ${BORDER}`,
  borderLeft: `4px solid ${TEAL}`,
  padding: '20px 24px',
  marginBottom: 12,
};

const fathomAfterCallStepCard: CSSProperties = {
  background: 'white',
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  borderLeft: `3px solid ${TEAL}`,
  padding: 16,
  marginBottom: 12,
};

type FathomAfterCallStep = {
  n: number;
  Icon: LucideIcon;
  title: string;
  body: string;
};

const FATHOM_AFTER_CALL_STEPS: FathomAfterCallStep[] = [
  {
    n: 1,
    Icon: Video,
    title: 'Open Fathom after your call',
    body:
      'Go to app.fathom.video and find your recording. Every call you record in Fathom is stored there automatically.',
  },
  {
    n: 2,
    Icon: Copy,
    title: 'Copy the transcript',
    body:
      'Open the recording and click Copy Transcript. This copies the full conversation text to your clipboard.',
  },
  {
    n: 3,
    Icon: Bot,
    title: 'Open the client card',
    body:
      'In Coach Bot go to Client Intelligence and select the client you just coached.',
  },
  {
    n: 4,
    Icon: FileText,
    title: 'Click the Fathom tab',
    body:
      'Inside the client card click the Fathom tab. This is where all session notes and transcripts live.',
  },
  {
    n: 5,
    Icon: Plus,
    title: 'Add a new session',
    body:
      "Click Add Session and set today's date. This keeps your session history in order.",
  },
  {
    n: 6,
    Icon: ClipboardPaste,
    title: 'Paste and extract',
    body:
      'Paste the transcript into the Fathom Transcript field and click Extract Session. Coach Bot will analyze the full conversation.',
  },
  {
    n: 7,
    Icon: Clock,
    title: 'Wait for the analysis',
    body:
      'Coach Bot reads the session using the CLEAR framework and extracts all nine coaching dimensions. This takes about 30 to 60 seconds.',
  },
  {
    n: 8,
    Icon: Brain,
    title: 'Review Session Intelligence',
    body:
      'After extraction Coach Bot automatically grades your session and tells you if your client is ready to move to the next stage. Check the readiness verdict carefully.',
  },
  {
    n: 9,
    Icon: ArrowRight,
    title: 'Act on the verdict',
    body:
      'If your client is ready click Move to next stage. If not ready log a follow-up reminder with the gap summary so you remember what to address next session.',
  },
];

function LabCard({ lab }: { lab: LabSpec }) {
  return (
    <article style={cardShell}>
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <span
          style={{
            background: TEAL,
            color: 'white',
            borderRadius: 20,
            padding: '2px 10px',
            fontSize: 11,
            fontWeight: 'bold',
          }}
        >
          Lab {lab.n}
        </span>
        <h2 className="font-bold" style={{ color: HEADER, fontSize: 16 }}>
          {lab.title}
        </h2>
        <span style={{ color: MUTED, fontSize: 11 }}>{lab.minutes}</span>
      </div>
      <p style={{ color: MUTED, fontSize: 13, fontStyle: 'italic', marginBottom: 12 }}>
        <span style={{ fontStyle: 'normal', fontWeight: 'bold', color: MUTED }}>What you will do: </span>
        {lab.whatYouWillDo}
      </p>
      <ol
        className="list-decimal space-y-1 pl-5"
        style={{
          color: HEADER,
          fontSize: 13,
          lineHeight: 1.8,
        }}
      >
        {lab.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {lab.afterStepsNote ? (
        <p
          className="mt-3 rounded-md border px-3 py-2"
          style={{
            borderColor: BORDER,
            background: '#F4F7F8',
            color: HEADER,
            fontSize: 12,
            lineHeight: 1.65,
            fontStyle: 'italic',
          }}
        >
          {lab.afterStepsNote}
        </p>
      ) : null}
      {lab.subSections?.map((sub, si) => (
        <div key={si} style={{ marginTop: 16 }}>
          <p className="mb-2 font-bold" style={{ color: HEADER, fontSize: 12 }}>
            {sub.heading}
          </p>
          <ol
            className="list-decimal space-y-1 pl-5"
            style={{
              color: HEADER,
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            {sub.items.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      ))}
      <div
        style={{
          marginTop: 14,
          background: '#F0FAFA',
          borderLeft: `3px solid ${TEAL}`,
          borderRadius: 6,
          padding: '10px 14px',
        }}
      >
        <p className="mb-1 font-bold" style={{ color: TEAL, fontSize: 11 }}>
          Success
        </p>
        <p style={{ color: HEADER, fontSize: 12 }}>{lab.success}</p>
      </div>
    </article>
  );
}

export default function HowToUse() {
  return (
    <div className="min-h-full" style={{ background: PAGE_BG, fontFamily: 'inherit' }}>
      <div className="mx-auto px-6 py-8" style={{ maxWidth: 800 }}>
        <header className="mb-8 text-center">
          <h1 className="font-bold" style={{ color: HEADER, fontSize: 24 }}>
            Coach Bot — Getting Started
          </h1>
          <p className="mt-2" style={{ color: MUTED, fontSize: 13 }}>
            Eight labs. Learning by doing. Each step teaches Coach Bot your voice.
          </p>
          <p className="mt-2" style={{ color: MUTED, fontSize: 11 }}>
            v2.0 · April 2026
          </p>
        </header>

        {LABS.map((lab) => (
          <LabCard key={lab.n} lab={lab} />
        ))}

        <section style={{ ...cardShell, marginTop: 8 }}>
          <h2 className="mb-3 font-bold" style={{ color: HEADER, fontSize: 16 }}>
            Morning Brief: Gmail and Calendar
          </h2>
          <div className="space-y-4" style={{ color: HEADER, fontSize: 13, lineHeight: 1.75 }}>
            <div>
              <p className="mb-2 font-bold" style={{ fontSize: 12, color: TEAL }}>
                Gmail
              </p>
              <p style={{ marginBottom: 8 }}>
                Shows only emails from your active coaching clients. Non-client emails are filtered out. If no
                client emails appear, your clients have not emailed you recently from their registered email address.
              </p>
            </div>
            <div>
              <p className="mb-2 font-bold" style={{ fontSize: 12, color: TEAL }}>
                Calendar
              </p>
              <p>
                Shows only calendar events that match your client names. Non-coaching events are hidden from this
                list. Elsewhere in the app, an event can show &quot;Not in pipeline&quot; when the person is not yet a
                client.
              </p>
            </div>
          </div>
        </section>

        <section style={cardShell}>
          <h2 className="mb-3 font-bold" style={{ color: HEADER, fontSize: 16 }}>
            The Capture — Your Knowledge Hub
          </h2>
          <p className="mb-3" style={{ color: MUTED, fontSize: 13 }}>
            Three sections:
          </p>
          <ul
            className="mb-4 list-disc space-y-2 pl-5"
            style={{ color: HEADER, fontSize: 13, lineHeight: 1.75 }}
          >
            <li>
              <strong>My Clients:</strong> Upload documents for each client: DISC assessment PDF, You 2.0 PDF, TUMAY
              PDF, and Fathom sessions via paste.
            </li>
            <li>
              <strong>My Identity:</strong> Upload your resume and coaching philosophy. Coach Bot uses this to shape
              its voice to match yours.
            </li>
            <li>
              <strong>My Knowledge:</strong> Upload your coaching frameworks, guides, and methodology documents. Coach
              Bot searches these before every recommendation.
            </li>
          </ul>
          <p className="mb-2 font-bold" style={{ color: HEADER, fontSize: 12 }}>
            How to upload a Fathom session from The Capture
          </p>
          <ol
            className="list-decimal space-y-1 pl-5"
            style={{ color: HEADER, fontSize: 13, lineHeight: 1.8 }}
          >
            <li>Go to The Capture.</li>
            <li>Find your client in My Clients.</li>
            <li>Click Add Fathom Session.</li>
            <li>Paste the transcript text.</li>
            <li>Click Extract.</li>
            <li>The session appears on the client card.</li>
          </ol>
        </section>

        <section style={{ ...cardShell, marginTop: 8 }}>
          <h2 className="mb-2 font-bold" style={{ color: HEADER, fontSize: 16 }}>
            How to Use Fathom After Every Call
          </h2>
          <p className="mb-6" style={{ color: MUTED, fontSize: 13, lineHeight: 1.65 }}>
            Do this after every coaching call to make Coach Bot smarter
          </p>

          {FATHOM_AFTER_CALL_STEPS.map((step) => {
            const StepIcon = step.Icon;
            return (
              <article key={step.n} style={fathomAfterCallStepCard}>
                <div className="flex items-start gap-3">
                  <span
                    className="shrink-0 tabular-nums"
                    style={{
                      color: TEAL,
                      fontSize: 28,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                    aria-hidden
                  >
                    {step.n}
                  </span>
                  <StepIcon
                    className="mt-1 h-6 w-6 shrink-0"
                    style={{ color: TEAL }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold" style={{ color: HEADER, fontSize: 16 }}>
                      {step.title}
                    </h3>
                    <p className="m-0 mt-2" style={{ color: MUTED, fontSize: 13, lineHeight: 1.65 }}>
                      {step.body}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}

          <div
            style={{
              marginTop: 4,
              background: BORDER,
              borderLeft: `3px solid ${TEAL}`,
              borderRadius: 8,
              padding: '14px 16px',
            }}
          >
            <p className="m-0" style={{ color: HEADER, fontSize: 13, lineHeight: 1.65 }}>
              Wait 30 seconds after running Best Next Questions or Vision Statement before extracting a Fathom session.
              Coach Bot needs a moment to reset between big tasks.
            </p>
          </div>
        </section>

        <section style={{ ...cardShell, marginTop: 8 }}>
          <h2 className="mb-3 font-bold" style={{ color: HEADER, fontSize: 16 }}>
            What Happens Next
          </h2>
          <ul
            className="list-disc space-y-2 pl-5"
            style={{ color: HEADER, fontSize: 13, lineHeight: 1.75 }}
          >
            <li>
              Keep Morning Brief as your daily entry point: calls, Gmail highlights tied to client names, and
              anything that needs attention.
            </li>
            <li>
              After each real client touch, log Fathom or notes so CLEAR and My Practice have signal, not empty
              slices.
            </li>
            <li>
              Corrections and feedback you submit become training fuel; brief, specific notes beat long essays.
            </li>
            <li>
              When something breaks, capture the page name and one screenshot before you restart, so support can
              reproduce it.
            </li>
            <li>
              Revisit this guide after major releases; version and date in the header will bump when labs change.
            </li>
          </ul>
        </section>

        <section style={cardShell}>
          <h2 className="mb-3 font-bold" style={{ color: HEADER, fontSize: 16 }}>
            What to Email Zubia This Week
          </h2>
          <p className="mb-3" style={{ color: MUTED, fontSize: 13 }}>
            Send one bundle per week while you are in lab mode. Use a single email thread if possible.
          </p>
          <ul
            className="list-disc space-y-2 pl-5"
            style={{ color: HEADER, fontSize: 13, lineHeight: 1.75 }}
          >
            <li>UAT export or written answers to the feedback prompts from Lab 8.</li>
            <li>One screen recording or annotated screenshot of anything confusing (optional but high value).</li>
            <li>Your machine summary: Windows version, RAM, Ollama running yes/no, and Coach Bot build or git hash.</li>
            <li>List of clients you used for Labs 2–5 (first name only is fine) so we can correlate logs.</li>
            <li>Any blockers that stopped you from finishing a lab, in priority order.</li>
          </ul>
        </section>

        <section style={cardShell}>
          <h2 className="mb-3 font-bold" style={{ color: HEADER, fontSize: 16 }}>
            Troubleshooting
          </h2>
          <ul
            className="list-disc space-y-2 pl-5"
            style={{ color: HEADER, fontSize: 13, lineHeight: 1.75 }}
          >
            <li>
              <strong>Fathom extract fails:</strong> confirm Ollama is running on this machine and try a shorter
              transcript paste first.
            </li>
            <li>
              <strong>No Gmail in Morning Brief:</strong> reconnect Google, then use Refresh on Morning Brief; inbox
              preview only appears when Google is connected.
            </li>
            <li>
              <strong>Vision or client card white screen:</strong> note the last action, restart the app, and if it
              persists capture the console error text for Zubia.
            </li>
            <li>
              <strong>Calendar empty but Google connected:</strong> check that events exist for today and that this
              Google account owns the calendar you expect.
            </li>
            <li>
              <strong>PPT export issues:</strong> remember brand colors must be six-digit hex without # for PptxGenJS;
              if download fails, try again after a full quit and relaunch.
            </li>
          </ul>
        </section>

        <footer className="pt-4 text-center" style={{ color: MUTED, fontSize: 11 }}>
          Coach Bot v2.0 · Built for Sandi Stahl · April 2026
        </footer>
      </div>
    </div>
  );
}
