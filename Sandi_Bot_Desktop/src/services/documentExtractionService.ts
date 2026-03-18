import { invoke } from '@tauri-apps/api/core';
import { getDb, dbExecute, dbSelect } from './db';
import type {
  DiscProfile,
  You2Profile,
  FathomSession,
  DocumentType,
  ExtractionResult,
  ExtractionStatus,
} from '../types/extractions';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'qwen2.5:14b';

async function loadPrompt(promptName: string): Promise<string> {
  return await invoke<string>('read_prompt_file', { name: promptName });
}

async function callOllama(
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const controller = new AbortController();
  // qwen2.5:14b needs more time than phi3
  const timeout = setTimeout(
    () => controller.abort(),
    300000 // 5 minute timeout
  );

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${systemPrompt}\n\nDocument text:\n${userContent}\n\nIMPORTANT: Your response must be ONLY a valid JSON object. No explanation. No preamble. No markdown. Start with { and end with }.`,
        stream: false,
        format: 'json',
        options: {
          temperature: 0,
          num_predict: 4000,
          num_ctx: 8192
        }
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Ollama request failed: ${response.status} ` +
        `${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.response) {
      throw new Error(
        'Ollama returned empty response.'
      );
    }

    return data.response;

  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error &&
        error.name === 'AbortError') {
      throw new Error(
        'Ollama timeout after 5 minutes. ' +
        'Document may be too large for local model.'
      );
    }
    throw error;
  }
}

function parseExtractionResponse<T>(
  rawResponse: string
): T | null {
  try {
    // Remove markdown code fences
    let cleaned = rawResponse
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    // Find JSON object boundaries
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 &&
        lastBrace > firstBrace) {
      cleaned = cleaned.substring(
        firstBrace, lastBrace + 1
      );
    }

    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('JSON parse failed.');
    console.error('Raw response length:',
      rawResponse.length);
    console.error('First 500 chars:',
      rawResponse.substring(0, 500));
    return null;
  }
}

async function recordExtraction(
  clientId: string,
  documentType: string,
  filePath: string,
  fileName: string,
  status: ExtractionStatus,
  extractedData: object | null,
  errorMessage?: string
): Promise<void> {
  await dbExecute(
    `INSERT INTO document_extractions
     (client_id, document_type, file_path, file_name,
      extraction_status, extracted_data, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      clientId,
      documentType,
      filePath,
      fileName,
      status,
      extractedData ? JSON.stringify(extractedData) : null,
      errorMessage ?? null,
    ]
  );
}

// ─────────────────────────────────────
// DISC EXTRACTION
// Calibrated for TTI Talent Insights format
// ─────────────────────────────────────

export async function extractDiscProfile(
  clientId: string,
  rawText: string,
  fileName: string,
  filePath: string
): Promise<ExtractionResult<DiscProfile>> {
  try {
    const prompt = await loadPrompt('disc_extraction');

    const systemPrompt = `${prompt}

You are extracting data from a TTI Talent Insights report.
Return ONLY valid JSON. No explanation. No markdown. JSON only.

CRITICAL SCORE EXTRACTION RULES:
Scores appear in TWO formats in the raw text:
FORMAT 1 — Behavioral Hierarchy page bottom line:
  SIA: 38-18-78-75 (20)  SIN: 42-15-84-71 (20)
  SIA = Adapted Style scores D-I-S-C
  SIN = Natural Style scores D-I-S-C
FORMAT 2 — Mini-graph thumbnails on content pages:
  Four numbers in sequence below bar charts
  e.g.: 38  18  78  75
Use FORMAT 1 if found. It is the most reliable.

CRITICAL WHEEL LABEL RULE:
The style label appears on the TTI Wheel page as:
  Natural: ● (20) SUPPORTING COORDINATOR
Extract the Natural style label as primary_style_label.
Extract the two highest Natural scores as combination
e.g. if S=84 and C=71 are highest → "SC"

CRITICAL DRIVING FORCES RULES:
Extract from pages titled:
  "Primary Driving Forces Cluster" (forces 1-4)
  "Situational Driving Forces Cluster" (forces 5-8)
  "Indifferent Driving Forces Cluster" (forces 9-12)
Each force has a name, score in a circle, and rank number.
Do NOT use the Driving Forces Graph page — it
does not extract cleanly from PDF text.

CRITICAL COMMUNICATION RULES:
DOs come from "Checklist for Communicating" page
  under the heading "Ways to Communicate:"
DONTs come from the "Continued" page
  under the heading "Ways NOT to Communicate:"
IGNORE the page titled "Communication Tips" —
  it is a generic 4-quadrant page, not client-specific.

STRESS SIGNALS come from the "Perceptions" page:
  Moderate = "Under moderate pressure...others may see"
  Extreme = "Under extreme pressure...others may see"

Schema:
{
  "client_name": "string",
  "assessment_date": "string",
  "adapted_scores": { "D": number, "I": number, "S": number, "C": number },
  "natural_scores": { "D": number, "I": number, "S": number, "C": number },
  "primary_style_label": "string",
  "primary_style_combination": "string",
  "driving_forces_primary": [{ "name": "string", "score": number, "rank": number }],
  "driving_forces_situational": [{ "name": "string", "score": number }],
  "driving_forces_indifferent": [{ "name": "string", "score": number }],
  "motivation_summary": "string",
  "communication_dos": ["string"],
  "communication_donts": ["string"],
  "stress_signals_moderate": ["string"],
  "stress_signals_extreme": ["string"],
  "ideal_environment": ["string"],
  "value_to_organization": ["string"],
  "areas_for_improvement": ["string"]
}`;

    const rawResponse = await callOllama(systemPrompt, rawText);
    const profile = parseExtractionResponse<DiscProfile>(rawResponse);

    if (!profile) {
      await recordExtraction(
        clientId,
        'disc',
        filePath,
        fileName,
        'failed',
        null,
        'JSON parse failed'
      );
      return {
        success: false,
        data: null,
        error: 'JSON parse failed',
        extraction_status: 'failed',
      };
    }

    await dbExecute(
      `INSERT OR REPLACE INTO client_disc_profiles
       (client_id, adapted_d, adapted_i, adapted_s, adapted_c,
        natural_d, natural_i, natural_s, natural_c,
        primary_style_label, primary_style_combination,
        driving_forces_primary, driving_forces_situational,
        driving_forces_indifferent, communication_dos,
        communication_donts, stress_signals, ideal_environment,
        value_to_organization, areas_for_improvement,
        assessment_date, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,CURRENT_TIMESTAMP)`,
      [
        clientId,
        profile.adapted_scores.D,
        profile.adapted_scores.I,
        profile.adapted_scores.S,
        profile.adapted_scores.C,
        profile.natural_scores.D,
        profile.natural_scores.I,
        profile.natural_scores.S,
        profile.natural_scores.C,
        profile.primary_style_label,
        profile.primary_style_combination,
        JSON.stringify(profile.driving_forces_primary),
        JSON.stringify(profile.driving_forces_situational),
        JSON.stringify(profile.driving_forces_indifferent),
        JSON.stringify(profile.communication_dos),
        JSON.stringify(profile.communication_donts),
        JSON.stringify({
          moderate: profile.stress_signals_moderate,
          extreme: profile.stress_signals_extreme,
        }),
        JSON.stringify(profile.ideal_environment),
        JSON.stringify(profile.value_to_organization),
        JSON.stringify(profile.areas_for_improvement),
        profile.assessment_date,
      ]
    );

    await recordExtraction(
      clientId,
      'disc',
      filePath,
      fileName,
      'complete',
      profile
    );

    return {
      success: true,
      data: profile,
      extraction_status: 'complete',
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error) ?? 'Unknown error';
    console.error('Extraction error full details:', error);

    // Image-based PDF — record as skipped with actionable message
    if (
      message.includes('image-based') ||
      message.includes('no extractable text') ||
      message.includes('image-only')
    ) {
      await recordExtraction(
        clientId,
        'disc',
        filePath,
        fileName,
        'skipped',
        null,
        'TTI report is image-based PDF. ' +
          'Please export from TTI portal as ' +
          'text-selectable PDF and re-import.'
      );
      return {
        success: false,
        data: null,
        error:
          'Image-based PDF — please export as ' +
          'text-selectable PDF from TTI portal',
        extraction_status: 'skipped',
      };
    }

    await recordExtraction(
      clientId,
      'disc',
      filePath,
      fileName,
      'failed',
      null,
      message
    );
    return {
      success: false,
      data: null,
      error: message,
      extraction_status: 'failed',
    };
  }
}

// ─────────────────────────────────────
// YOU 2.0 EXTRACTION
// Calibrated for TES You 2.0 + TUMAY format
// Expects concatenated text from BOTH files
// ─────────────────────────────────────

export async function extractYou2Profile(
  clientId: string,
  rawText: string,
  fileName: string,
  filePath: string
): Promise<ExtractionResult<You2Profile>> {
  try {
    const prompt = await loadPrompt('you2_extraction');

    const systemPrompt = `${prompt}

You are extracting data from TES You 2.0 and TUMAY intake forms.
The text may be from one or both documents concatenated.
Return ONLY valid JSON. No explanation. No markdown. JSON only.

CRITICAL EXTRACTION RULES:

ONE-YEAR VISION:
The answer to "If we looked at your life a year from today..."
may be one paragraph or two separate lines (professional + personal).
Concatenate all lines into a single one_year_vision string.

DANGERS, STRENGTHS, OPPORTUNITIES — CRITICAL RULE:
ALWAYS extract from the "Top 3 Dangers & Goals",
"Top 3 Strengths & Goals", and "Top 3 Opportunities & Goals"
sections. These are always present and contain the real data.
Do NOT rely on the Yes/No checkbox list above these sections.
Clients frequently check No on all standard items and write
freeform entries in the Top 3 sections only.
Format: each item has a "Danger/Strength/Opportunity:" line
followed by a "Goal:" line. Extract both as paired objects.

SPOUSE DATA:
spouse_role: map "Unsure" → "unsure", "Yes" → "owner", "No" → "none"
spouse_on_calls: from "Will they be involved in future calls"
spouse_mindset_verbatim: exact text from "Their mindset" field

REASONS FOR CHANGE (from TUMAY Question 3):
Extract only the items marked Yes.
Labels: "I'm tired of the corporate world", "I want more
independence", "Improving my lifestyle is important", etc.

SKILLS (from TUMAY Question 6):
Extract only items marked Yes as a string array.

LOCATION PREFERENCE:
Extract the item with the LOWEST rank number (1 = most favorite).
If two items share the lowest rank, concatenate both
e.g. "Home-based / Mobile".
If no item is ranked 1, use the item with the lowest
rank number present.

TIME COMMITMENT:
May be multiple selections. Concatenate all with semicolons.
e.g. "Full-Time Owner Operated; Semi-Absentee at Launch"

NET WORTH:
Extract exactly as written. Do not reformat.
e.g. "50k - 250k" or "1M+" — keep as-is.

PRIOR BUSINESS EXPERIENCE (TUMAY Question 8, first field):
Extract the freeform explanation. Empty string if blank.

SELF SUFFICIENCY EXCITEMENT (TUMAY Question 8, second field):
"As you explore Your Career 2.0, what excites you..."
Extract the freeform explanation. Empty string if blank.

ADDITIONAL STAKEHOLDERS (TUMAY Question 2):
"Is there anyone else that would potentially have a role..."
Extract name and relationship for each person listed.
Empty array if none.

Schema:
{
  "client_name": "string",
  "one_year_vision": "string",
  "spouse_name": "string",
  "spouse_role": "owner|employee|unsure|none",
  "spouse_on_calls": "yes|no",
  "spouse_mindset_verbatim": "string",
  "financial_net_worth_range": "string",
  "credit_score": number,
  "launch_timeline": "string",
  "time_commitment": "string",
  "dangers": [{ "danger": "string", "goal": "string" }],
  "strengths": [{ "strength": "string", "goal": "string" }],
  "opportunities": [{ "opportunity": "string", "goal": "string" }],
  "areas_of_interest": ["string"],
  "reasons_for_change": ["string"],
  "location_preference": "string",
  "skills": ["string"],
  "prior_business_experience": "string",
  "self_sufficiency_excitement": "string",
  "additional_stakeholders": [{ "name": "string", "relationship": "string" }]
}`;

    const rawResponse = await callOllama(systemPrompt, rawText);
    const profile = parseExtractionResponse<You2Profile>(rawResponse);

    if (!profile) {
      await recordExtraction(
        clientId,
        'you2',
        filePath,
        fileName,
        'failed',
        null,
        'JSON parse failed'
      );
      return {
        success: false,
        data: null,
        error: 'JSON parse failed',
        extraction_status: 'failed',
      };
    }

    await dbExecute(
      `INSERT OR REPLACE INTO client_you2_profiles
       (client_id, one_year_vision, spouse_name, spouse_role,
        spouse_on_calls, spouse_mindset, financial_net_worth_range,
        credit_score, launch_timeline, time_commitment, dangers,
        strengths, opportunities, areas_of_interest,
        reasons_for_change, location_preference, skills,
        prior_business_experience, self_sufficiency_excitement,
        additional_stakeholders, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,CURRENT_TIMESTAMP)`,
      [
        clientId,
        profile.one_year_vision,
        profile.spouse_name,
        profile.spouse_role,
        profile.spouse_on_calls,
        profile.spouse_mindset_verbatim,
        profile.financial_net_worth_range,
        profile.credit_score,
        profile.launch_timeline,
        profile.time_commitment,
        JSON.stringify(profile.dangers),
        JSON.stringify(profile.strengths),
        JSON.stringify(profile.opportunities),
        JSON.stringify(profile.areas_of_interest),
        JSON.stringify(profile.reasons_for_change),
        profile.location_preference,
        JSON.stringify(profile.skills),
        profile.prior_business_experience,
        profile.self_sufficiency_excitement,
        JSON.stringify(profile.additional_stakeholders),
      ]
    );

    // Spouse pink flag detection
    if (profile.spouse_role === 'unsure') {
      console.warn(
        `PINK FLAG: Spouse alignment unsure — client ${clientId}, spouse: ${profile.spouse_name}`
      );
    }

    // Cross-reference spouse mindset against dangers
    const mindsetLower = profile.spouse_mindset_verbatim.toLowerCase();
    const dangerTexts = profile.dangers.map((d) => d.danger.toLowerCase());
    const spouseEchosDanger = dangerTexts.some(
      (d) =>
        (mindsetLower.includes('retirement') && d.includes('retirement')) ||
        (mindsetLower.includes('risk') && d.includes('risk')) ||
        (mindsetLower.includes('debt') && d.includes('debt')) ||
        (mindsetLower.includes('income') && d.includes('income'))
    );
    if (spouseEchosDanger) {
      console.warn(
        `PINK FLAG: Spouse mindset echoes client danger — client ${clientId}. Compound risk signal.`
      );
    }

    await recordExtraction(
      clientId,
      'you2',
      filePath,
      fileName,
      'complete',
      profile
    );

    return {
      success: true,
      data: profile,
      extraction_status: 'complete',
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error) ?? 'Unknown error';
    console.error('Extraction error full details:', error);
    await recordExtraction(
      clientId,
      'you2',
      filePath,
      fileName,
      'failed',
      null,
      message
    );
    return {
      success: false,
      data: null,
      error: message,
      extraction_status: 'failed',
    };
  }
}

// ─────────────────────────────────────
// FATHOM EXTRACTION
// ─────────────────────────────────────

export async function extractFathomSession(
  clientId: string,
  rawText: string,
  fileName: string,
  filePath: string
): Promise<ExtractionResult<FathomSession>> {
  try {
    const prompt = await loadPrompt('fathom_extraction');

    const systemPrompt = `${prompt}

Return ONLY valid JSON. No explanation. No markdown. JSON only.

Schema:
{
  "client_name": "string",
  "session_date": "string",
  "session_number": number,
  "duration_minutes": number,
  "stage_at_time": "string",
  "key_topics": ["string"],
  "objections": ["string"],
  "commitments": ["string"],
  "next_steps": ["string"],
  "spouse_mentions": ["string"],
  "engagement_quality": "high|medium|low",
  "pink_flag_signals": ["string"],
  "positive_signals": ["string"],
  "coach_questions_used": ["string"],
  "session_summary": "string"
}

Stage inference:
IC = initial contact, C1 = DISC reviewed,
C2 = vehicles and funding discussed,
C3 = franchise possibilities presented,
C4 = validation calls scheduled or completed

Pink flag signals to detect:
- Avoidance or deflection of direct questions
- Spouse concern raised but not resolved
- Financial hesitation without specific numbers
- "I need to think about it" without clear next step
- Inconsistency between session and prior commitments

Positive signals to detect:
- Specific questions about franchise operations
- Naming a franchise they want to learn more about
- Natural close language ("when I start" vs "if I start")
- Spouse mentioned positively or brought into conversation
- Committed to validation calls without prompting`;

    const rawResponse = await callOllama(systemPrompt, rawText);
    const session = parseExtractionResponse<FathomSession>(rawResponse);

    if (!session) {
      await recordExtraction(
        clientId,
        'fathom',
        filePath,
        fileName,
        'failed',
        null,
        'JSON parse failed'
      );
      return {
        success: false,
        data: null,
        error: 'JSON parse failed',
        extraction_status: 'failed',
      };
    }

    await dbExecute(
      `INSERT INTO coaching_sessions
       (client_id, session_date, session_number, stage,
        notes, next_actions, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)`,
      [
        clientId,
        session.session_date,
        session.session_number,
        session.stage_at_time,
        JSON.stringify({
          summary: session.session_summary,
          objections: session.objections,
          commitments: session.commitments,
          pink_flag_signals: session.pink_flag_signals,
          positive_signals: session.positive_signals,
          spouse_mentions: session.spouse_mentions,
          engagement_quality: session.engagement_quality,
        }),
        JSON.stringify(session.next_steps),
      ]
    );

    await recordExtraction(
      clientId,
      'fathom',
      filePath,
      fileName,
      'complete',
      session
    );

    return {
      success: true,
      data: session,
      extraction_status: 'complete',
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error) ?? 'Unknown error';
    console.error('Extraction error full details:', error);
    await recordExtraction(
      clientId,
      'fathom',
      filePath,
      fileName,
      'failed',
      null,
      message
    );
    return {
      success: false,
      data: null,
      error: message,
      extraction_status: 'failed',
    };
  }
}

// ─────────────────────────────────────
// VISION STATEMENT
// PPTX now supported via text_extractor.rs
// ─────────────────────────────────────

export async function handleVisionStatement(
  clientId: string,
  fileName: string,
  filePath: string,
  rawText: string
): Promise<ExtractionResult<null>> {
  const isPptx =
    fileName.toLowerCase().endsWith('.pptx') ||
    fileName.toLowerCase().endsWith('.ppt');

  // PPTX now extracts via Rust zip extractor
  // Store raw text to notes — full extraction Phase 4
  if (isPptx && rawText && rawText.trim().length > 20) {
    await recordExtraction(
      clientId,
      'vision',
      filePath,
      fileName,
      'complete',
      { raw_text: rawText }
    );
    return {
      success: true,
      data: null,
      extraction_status: 'complete',
    };
  }

  if (isPptx && (!rawText || rawText.trim().length <= 20)) {
    await recordExtraction(
      clientId,
      'vision',
      filePath,
      fileName,
      'skipped',
      null,
      'PPTX vision statement — no text extracted'
    );
    return {
      success: false,
      data: null,
      error: 'PPTX — no extractable text found',
      extraction_status: 'skipped',
    };
  }

  // PDF vision — store for Phase 4 processing
  await recordExtraction(
    clientId,
    'vision',
    filePath,
    fileName,
    'pending',
    { raw_text: rawText }
  );
  return {
    success: true,
    data: null,
    extraction_status: 'pending',
  };
}

// ─────────────────────────────────────
// ROUTER
// ─────────────────────────────────────

export async function processDocument(
  clientId: string,
  documentType: DocumentType,
  rawText: string,
  fileName: string,
  filePath: string
): Promise<
  ExtractionResult<
    DiscProfile | You2Profile | FathomSession | null
  >
> {
  // Truncate to fit qwen2.5:14b 8k context window
  const MAX_CHARS = 6000;
  const truncatedText = rawText.length > MAX_CHARS
    ? rawText.substring(0, MAX_CHARS) +
      '\n\n[Document truncated — extract from above only]'
    : rawText;

  switch (documentType) {
    case 'disc':
      return extractDiscProfile(clientId, truncatedText, fileName, filePath);
    case 'you2':
      return extractYou2Profile(clientId, truncatedText, fileName, filePath);
    case 'fathom':
      return extractFathomSession(clientId, truncatedText, fileName, filePath);
    case 'vision':
      return handleVisionStatement(clientId, fileName, filePath, truncatedText);
    default:
      return {
        success: false,
        data: null,
        error: `Unknown document type: ${documentType}`,
        extraction_status: 'failed',
      };
  }
}

// ─────────────────────────────────────
// EXTRACTION STATUS
// ─────────────────────────────────────

export async function getExtractionStatus(
  clientId: string
): Promise<Record<DocumentType, ExtractionStatus>> {
  const rows = await dbSelect<Array<{ document_type: string; extraction_status: string }>>(
    `SELECT document_type, extraction_status
     FROM document_extractions
     WHERE client_id = $1
     ORDER BY extraction_date DESC`,
    [clientId]
  );

  const status: Record<DocumentType, ExtractionStatus> = {
    disc: 'pending',
    you2: 'pending',
    fathom: 'pending',
    vision: 'pending',
  };

  const seen = new Set<string>();
  for (const row of rows) {
    if (!seen.has(row.document_type)) {
      seen.add(row.document_type);
      status[row.document_type as DocumentType] =
        row.extraction_status as ExtractionStatus;
    }
  }

  return status;
}
