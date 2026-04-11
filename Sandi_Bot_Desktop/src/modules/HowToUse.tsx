import type { CSSProperties } from 'react';

const PAGE_BG = '#FEFAF6';
const HEADER = '#2D4459';
const MUTED = '#7A8F95';
const BORDER = '#C8E8E5';
const TEAL = '#3BBFBF';

type LabSpec = {
  n: number;
  title: string;
  minutes: string;
  whatYouWillDo: string;
  steps: string[];
  success: string;
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
      'Add one coaching session from a Fathom transcript using paste and extraction (no file upload on the client card).',
    steps: [
      'Open Client Intelligence and pick any active client.',
      'Open the Fathom tab on that client’s card.',
      'In Fathom, copy the full transcript text from Fathom (copyable text, not a screenshot).',
      'Paste into the “Add Fathom Session” box and click Extract Session.',
      'Wait for the progress steps to finish. If something fails, confirm Ollama is running locally.',
      'Expand the new session with “Show 9-block analysis” and skim the blocks for sanity.',
    ],
    success:
      'A new row appears in session history and the nine blocks populate from your pasted transcript.',
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
    success:
      'You have a short list of council-backed questions ready for one real client conversation.',
  },
  {
    n: 5,
    title: 'Generate Vision Statement',
    minutes: '~15 min',
    whatYouWillDo:
      'Produce a client-ready vision narrative, rate it with the rubric, and export when quality is good enough.',
    steps: [
      'Open the client’s Vision tab in Client Intelligence.',
      'Generate a draft vision statement from the client’s stored context.',
      'Use the rubric (Accuracy, Completeness, Tone, Usefulness) and note any weak dimension.',
      'If average is below your bar, use regenerate-with-feedback; if it is strong, download the PPT export.',
      'Remember: PPT color fields use six-digit hex without the # symbol for PptxGenJS.',
    ],
    success:
      'A draft you would not be embarrassed to share, or a clear list of edits you still want before sharing.',
  },
  {
    n: 6,
    title: 'Review My Practice Score',
    minutes: '~8 min',
    whatYouWillDo:
      'Understand what the score is measuring so thin data does not feel like a personal “F.”',
    steps: [
      'Open My Practice from the sidebar.',
      'Identify the three sources: session quality (CLEAR from Fathom), pipeline movement, council prep.',
      'If a slice is zero, treat it as “no signal yet,” not failure, until you have logged data there.',
      'Pick one dimension you can improve this week (for example, one more Fathom session logged).',
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
