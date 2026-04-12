import { invoke } from '@tauri-apps/api/core';
import { logCorrection } from './correctionService';

export interface CouncilInput {
  clientName: string;
  clientId: string;
  discStyle: string;
  discScores: {
    d: number;
    i: number;
    s: number;
    c: number;
  };
  currentStage: string;
  dangers: string[];
  strengths: string[];
  opportunities: string[];
  oneYearVision: string;
  lastSessionNotes: string;
  pinkFlags: string[];
  netWorth: string;
  spouseAlignment: string;
  sessionCount: number;
  coachIdentity: string;
  coachPhilosophy: string;
}

export interface LensOutput {
  lensName: string;
  lensFramework: string;
  questions: string[];
  insight: string;
  confidence: number;
}

export interface UncertaintyAudit {
  verified: string[];
  unverified: string[];
  missing: string[];
  recommendations: string[];
}

export interface CouncilOutput {
  readinessLens: LensOutput;
  alignmentLens: LensOutput;
  integrityLens: LensOutput;
  chairmanSynthesis: {
    recommendedQuestions: string[];
    primaryInsight: string;
    minorityPerspective: string;
    coachingPosture: string;
  };
  uncertaintyAudit: UncertaintyAudit;
  overallConfidence: number;
  generatedAt: string;
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function parseLensPayload(raw: string): {
  questions: string[];
  insight: string;
  confidence: number;
} {
  const clean = stripJsonFences(raw);
  try {
    const parsed = JSON.parse(clean) as Record<string, unknown>;
    const questions = Array.isArray(parsed.questions)
      ? (parsed.questions as unknown[]).map((q) => String(q))
      : [];
    const insight = String(parsed.insight ?? '');
    const c =
      typeof parsed.confidence === 'number' && !Number.isNaN(parsed.confidence)
        ? parsed.confidence
        : 50;
    return { questions, insight, confidence: Math.min(100, Math.max(0, c)) };
  } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]) as Record<string, unknown>;
        const questions = Array.isArray(parsed.questions)
          ? (parsed.questions as unknown[]).map((q) => String(q))
          : [];
        const insight = String(parsed.insight ?? '');
        const c =
          typeof parsed.confidence === 'number' &&
          !Number.isNaN(parsed.confidence)
            ? parsed.confidence
            : 50;
        return {
          questions,
          insight,
          confidence: Math.min(100, Math.max(0, c)),
        };
      } catch {
        /* fall through */
      }
    }
    return { questions: [], insight: '', confidence: 50 };
  }
}

function parseChairmanPayload(raw: string): CouncilOutput['chairmanSynthesis'] {
  const clean = stripJsonFences(raw);
  try {
    const p = JSON.parse(clean) as Record<string, unknown>;
    const rq = Array.isArray(p.recommendedQuestions)
      ? (p.recommendedQuestions as unknown[]).map((q) => String(q))
      : [];
    return {
      recommendedQuestions: rq,
      primaryInsight: String(p.primaryInsight ?? ''),
      minorityPerspective: String(p.minorityPerspective ?? ''),
      coachingPosture: String(p.coachingPosture ?? ''),
    };
  } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const p = JSON.parse(m[0]) as Record<string, unknown>;
        const rq = Array.isArray(p.recommendedQuestions)
          ? (p.recommendedQuestions as unknown[]).map((q) => String(q))
          : [];
        return {
          recommendedQuestions: rq,
          primaryInsight: String(p.primaryInsight ?? ''),
          minorityPerspective: String(p.minorityPerspective ?? ''),
          coachingPosture: String(p.coachingPosture ?? ''),
        };
      } catch {
        /* fall through */
      }
    }
    return {
      recommendedQuestions: [],
      primaryInsight: '',
      minorityPerspective: '',
      coachingPosture: '',
    };
  }
}

async function runReadinessLens(input: CouncilInput): Promise<LensOutput> {
  const systemPrompt = `You are the Readiness Lens of the STZ Coaching Council.

Your framework: ICF competency standards combined with franchise coaching stage methodology.

Your role: Assess whether this seeker is genuinely ready for the next step based only on verified data.

ICF principles you apply:
  Client welfare comes first
  Questions serve the client's agenda not the coach's timeline
  Competence requires honest assessment of readiness not optimism

You only ask questions grounded in verified client data.
You flag when data is missing.
You never speculate beyond the data.
You protect the client from premature advancement through the pipeline.

Return ONLY valid JSON. No other text.`;

  const prompt = `Analyze this seeker's readiness and generate coaching questions.

Client: ${input.clientName}
Stage: ${input.currentStage}
DISC: ${input.discStyle}
  D=${input.discScores.d}
  I=${input.discScores.i}
  S=${input.discScores.s}
  C=${input.discScores.c}
Dangers: ${input.dangers.join(', ')}
Strengths: ${input.strengths.join(', ')}
Vision: ${input.oneYearVision}
Last session: ${input.lastSessionNotes}
Sessions completed: ${input.sessionCount}
Pink flags: ${input.pinkFlags.join(', ')}

Generate 3-4 questions that assess genuine readiness. Each question must be grounded in the verified data above.

Return JSON:
{
  "questions": ["q1", "q2", "q3"],
  "insight": "one sentence on readiness level based on data",
  "confidence": 0-100,
  "data_gaps": ["what is missing"]
}`;

  const raw = await invoke<string>('ollama_generate', {
    model: 'qwen2.5:7b',
    prompt,
    system: systemPrompt,
  });

  const parsed = parseLensPayload(raw);

  return {
    lensName: 'Readiness Lens',
    lensFramework: 'ICF + Stage Methodology',
    questions: parsed.questions,
    insight: parsed.insight,
    confidence: parsed.confidence,
  };
}

async function runAlignmentLens(input: CouncilInput): Promise<LensOutput> {
  const systemPrompt = `You are the Alignment Lens of the STZ Coaching Council.

Your framework: Motivational Interviewing (MI) principles combined with franchise coaching stakeholder methodology.

Your role: Assess whether all key stakeholders are aligned and whether the seeker's motivation is genuine or ambivalent.

MI principles you apply:
  Ambivalence is normal and must be resolved before commitment
  Change talk signals readiness
  Sustain talk signals resistance
  Rolling with resistance not confronting it
  Developing discrepancy between current state and desired future
  Supporting self-efficacy

Stakeholder principles:
  Financial decisions affect households not just individuals
  Spouse or partner alignment is a control point for success
  Timeline must be realistic given financial capacity

Return ONLY valid JSON. No other text.`;

  const prompt = `Assess alignment and motivation for this seeker.

Client: ${input.clientName}
Stage: ${input.currentStage}
DISC: ${input.discStyle}
Vision: ${input.oneYearVision}
Spouse alignment: ${input.spouseAlignment}
Net worth range: ${input.netWorth}
Dangers: ${input.dangers.join(', ')}
Last session: ${input.lastSessionNotes}
Pink flags: ${input.pinkFlags.join(', ')}

Generate 3-4 questions that:
  Surface change talk or sustain talk
  Resolve ambivalence if present
  Assess household alignment
  Check timeline realism

Return JSON:
{
  "questions": ["q1", "q2", "q3"],
  "insight": "one sentence on alignment and motivation level",
  "confidence": 0-100,
  "ambivalence_signals": ["any signals of resistance or ambivalence found"]
}`;

  const raw = await invoke<string>('ollama_generate', {
    model: 'qwen2.5:7b',
    prompt,
    system: systemPrompt,
  });

  const parsed = parseLensPayload(raw);

  return {
    lensName: 'Alignment Lens',
    lensFramework: 'Motivational Interviewing',
    questions: parsed.questions,
    insight: parsed.insight,
    confidence: parsed.confidence,
  };
}

async function runIntegrityLens(input: CouncilInput): Promise<LensOutput> {
  const systemPrompt = `You are the Coaching Integrity Lens of the STZ Coaching Council.

Your framework: ICF ethical standards combined with the CLEAR coaching framework.

Your role: Ensure the coaching approach serves the client's genuine interests and follows professional standards.

ICF ethics you apply:
  Client owns the decision — never push
  Informed consent — client understands what they are deciding
  Competence — questions must be appropriate for the client's stage
  Avoid conflicts of interest — questions serve the client not the coach's placement rate

CLEAR framework you apply:
  Connect — emotional resonance first
  Listen — pattern awareness before action
  Explore — clarity before direction
  Activate — commitment only when ready
  Reflect — insight must be locked

You identify when questions might be pushing rather than coaching.
You flag when the coach may be leading the client rather than following them.

Return ONLY valid JSON. No other text.`;

  const prompt = `Assess coaching integrity for this client interaction.

Client: ${input.clientName}
Stage: ${input.currentStage}
DISC: ${input.discStyle}
Coach philosophy: ${input.coachPhilosophy}
Vision: ${input.oneYearVision}
Last session: ${input.lastSessionNotes}
Session count: ${input.sessionCount}
Dangers: ${input.dangers.join(', ')}

Generate 3-4 questions that:
  Follow CLEAR framework sequence
  Serve client's agenda not coach's
  Are appropriate for current stage
  Invite reflection not compliance

Return JSON:
{
  "questions": ["q1", "q2", "q3"],
  "insight": "one sentence on coaching quality and client ownership",
  "confidence": 0-100,
  "clear_stage": "which CLEAR stage is most appropriate now",
  "integrity_flags": ["any concerns about coaching approach"]
}`;

  const raw = await invoke<string>('ollama_generate', {
    model: 'qwen2.5:7b',
    prompt,
    system: systemPrompt,
  });

  const parsed = parseLensPayload(raw);

  return {
    lensName: 'Coaching Integrity Lens',
    lensFramework: 'ICF Ethics + CLEAR',
    questions: parsed.questions,
    insight: parsed.insight,
    confidence: parsed.confidence,
  };
}

async function runChairmanSynthesis(
  input: CouncilInput,
  readiness: LensOutput,
  alignment: LensOutput,
  integrity: LensOutput
): Promise<CouncilOutput['chairmanSynthesis']> {
  const systemPrompt = `You are the Chairman of the STZ Coaching Council.

You have received three independent perspectives from the Readiness Lens, Alignment Lens, and Coaching Integrity Lens.

Your role:
  Synthesize the best questions from all three lenses
  Identify where lenses agree
  Preserve minority perspectives where lenses disagree
  Recommend the coaching posture most appropriate for this client
  Never suppress a dissenting view
  The coach is always the final judge

Return ONLY valid JSON. No other text.`;

  const prompt = `Synthesize these three coaching perspectives for ${input.clientName}.

READINESS LENS (${readiness.confidence}% confidence):
Questions: ${readiness.questions.join(' | ')}
Insight: ${readiness.insight}

ALIGNMENT LENS (${alignment.confidence}% confidence):
Questions: ${alignment.questions.join(' | ')}
Insight: ${alignment.insight}

INTEGRITY LENS (${integrity.confidence}% confidence):
Questions: ${integrity.questions.join(' | ')}
Insight: ${integrity.insight}

Select the 5 best questions across all three lenses.
Identify the primary coaching insight.
Note any minority perspective where lenses disagreed.
Recommend the coaching posture.

Return JSON:
{
  "recommendedQuestions": [
    "best q1",
    "best q2",
    "best q3",
    "best q4",
    "best q5"
  ],
  "primaryInsight": "the most important thing to know about this client right now",
  "minorityPerspective": "where the lenses disagreed and why it matters",
  "coachingPosture": "how Sandi should approach this call specifically"
}`;

  const raw = await invoke<string>('ollama_generate', {
    model: 'qwen2.5:7b',
    prompt,
    system: systemPrompt,
  });

  return parseChairmanPayload(raw);
}

function buildUncertaintyAudit(input: CouncilInput): UncertaintyAudit {
  const verified: string[] = [];
  const unverified: string[] = [];
  const missing: string[] = [];
  const recommendations: string[] = [];

  if (input.discScores.d > 0 || input.discScores.i > 0) {
    verified.push('DISC behavioral profile');
  } else {
    missing.push('DISC assessment not uploaded');
    recommendations.push('Upload DISC PDF before this call');
  }

  if (input.dangers.length > 0) {
    verified.push('Declared dangers and goals');
  } else {
    missing.push('You 2.0 not uploaded or extracted');
    recommendations.push(
      'Upload You 2.0 before generating questions'
    );
  }

  if (input.lastSessionNotes && input.lastSessionNotes.length > 20) {
    verified.push('Session history available');
  } else {
    unverified.push(
      'No session notes — questions based on profile only not coaching history'
    );
  }

  if (input.oneYearVision && input.oneYearVision.length > 20) {
    verified.push('One year vision captured');
  } else {
    missing.push('Vision statement not defined');
    recommendations.push(
      'Generate and approve vision statement before advancing to next stage'
    );
  }

  if (input.spouseAlignment === 'Yes') {
    verified.push('Spouse alignment confirmed');
  } else if (
    input.spouseAlignment === 'No' ||
    input.spouseAlignment === 'Unsure'
  ) {
    unverified.push(
      'Spouse alignment unresolved — household decision not yet made'
    );
    recommendations.push(
      'Do not advance past C3 until spouse alignment is resolved'
    );
  }

  if (input.pinkFlags.length > 0) {
    unverified.push(`Active concerns: ${input.pinkFlags.join(', ')}`);
    recommendations.push(
      'Address active concerns before recommending franchise options'
    );
  }

  return {
    verified,
    unverified,
    missing,
    recommendations,
  };
}

export async function runCoachingCouncil(
  input: CouncilInput
): Promise<CouncilOutput> {
  const [readiness, alignment, integrity] = await Promise.all([
    runReadinessLens(input),
    runAlignmentLens(input),
    runIntegrityLens(input),
  ]);

  const synthesis = await runChairmanSynthesis(
    input,
    readiness,
    alignment,
    integrity
  );

  const audit = buildUncertaintyAudit(input);

  const overallConfidence = Math.round(
    (readiness.confidence + alignment.confidence + integrity.confidence) / 3
  );

  const generatedAt = new Date().toISOString();

  await logCorrection({
    clientId: input.clientId,
    fieldName: 'coaching_council',
    originalValue: undefined,
    correctedValue: JSON.stringify({
      overallConfidence,
      recommendedQuestionCount: synthesis.recommendedQuestions.length,
    }),
    correctionType: 'council_feedback',
    page: 'coaching_council',
  });

  return {
    readinessLens: readiness,
    alignmentLens: alignment,
    integrityLens: integrity,
    chairmanSynthesis: synthesis,
    uncertaintyAudit: audit,
    overallConfidence,
    generatedAt,
  };
}
