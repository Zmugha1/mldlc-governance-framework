import { invoke } from '@tauri-apps/api/core';
import { dbExecute, dbSelect, getDb } from './db';
import { logEntry } from './auditService';
import { callOllama as callOllamaProxy } from './ollamaService';
import type {
  DiscProfile,
  You2Profile,
  FathomSession,
  DocumentType,
  ExtractionResult,
  ExtractionStatus,
} from '../types/extractions';

const OLLAMA_MODEL = 'qwen2.5:7b-instruct-q4_k_m';

const DISC_FORMAT_SCHEMA = {
  type: 'object',
  properties: {
    client_name: { type: 'string' },
    assessment_date: { type: 'string' },
    adapted_scores: {
      type: 'object',
      properties: {
        D: { type: 'number', minimum: 0, maximum: 100 },
        I: { type: 'number', minimum: 0, maximum: 100 },
        S: { type: 'number', minimum: 0, maximum: 100 },
        C: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
    natural_scores: {
      type: 'object',
      properties: {
        D: { type: 'number', minimum: 0, maximum: 100 },
        I: { type: 'number', minimum: 0, maximum: 100 },
        S: { type: 'number', minimum: 0, maximum: 100 },
        C: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
    primary_style_label: { type: 'string' },
    primary_style_combination: { type: 'string' },
    driving_forces_primary: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          score: { type: 'number' },
          rank: { type: 'number' },
        },
      },
    },
    driving_forces_situational: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          score: { type: 'number' },
        },
      },
    },
    driving_forces_indifferent: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          score: { type: 'number' },
        },
      },
    },
    communication_dos: {
      type: 'array',
      items: { type: 'string' },
    },
    communication_donts: {
      type: 'array',
      items: { type: 'string' },
    },
    stress_signals_moderate: {
      type: 'array',
      items: { type: 'string' },
    },
    stress_signals_extreme: {
      type: 'array',
      items: { type: 'string' },
    },
    ideal_environment: {
      type: 'array',
      items: { type: 'string' },
    },
    value_to_organization: {
      type: 'array',
      items: { type: 'string' },
    },
    areas_for_improvement: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['client_name', 'natural_scores', 'adapted_scores'],
};

const YOU2_FORMAT_SCHEMA = {
  type: 'object',
  properties: {
    client_name: { type: 'string' },
    one_year_vision: { type: 'string' },
    spouse_name: { type: 'string' },
    spouse_role: {
      type: 'string',
      enum: ['owner', 'employee', 'unsure', 'none'],
    },
    spouse_on_calls: {
      type: 'string',
      enum: ['yes', 'no'],
    },
    spouse_mindset_verbatim: { type: 'string' },
    financial_net_worth_range: { type: 'string' },
    credit_score: { type: 'number' },
    launch_timeline: { type: 'string' },
    time_commitment: { type: 'string' },
    dangers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          danger: { type: 'string' },
          goal: { type: 'string' },
        },
      },
    },
    strengths: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          strength: { type: 'string' },
          goal: { type: 'string' },
        },
      },
    },
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          opportunity: { type: 'string' },
          goal: { type: 'string' },
        },
      },
    },
    areas_of_interest: {
      type: 'array',
      items: { type: 'string' },
    },
    reasons_for_change: {
      type: 'array',
      items: { type: 'string' },
    },
    location_preference: { type: 'string' },
    skills: {
      type: 'array',
      items: { type: 'string' },
    },
    prior_business_experience: { type: 'string' },
    self_sufficiency_excitement: { type: 'string' },
  },
  required: ['client_name', 'one_year_vision'],
};

async function loadPrompt(promptName: string): Promise<string> {
  return await invoke<string>('read_prompt_file', { name: promptName });
}

async function readPromptFile(name: string): Promise<string> {
  const normalized = name.endsWith('.txt')
    ? name.replace(/\.txt$/i, '')
    : name;
  return await invoke<string>('read_prompt_file', { name: normalized });
}

async function callOllama(
  systemPrompt: string,
  userContent: string,
  formatSchema?: object
): Promise<string> {
  const _schema = formatSchema; // preserve signature for existing call sites
  void _schema;
  const prompt = `${systemPrompt}\n\nDocument text:\n${userContent}\n\nIMPORTANT: Your response must be ONLY a valid JSON object. No explanation. No preamble. No markdown. Start with { and end with }.`;
  return callOllamaProxy(prompt, OLLAMA_MODEL);
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

function countNonNullBlocks(
  parsed: Record<string, unknown>
): number {
  const blocks = [
    'block_opening', 'block_emotional',
    'block_life_context', 'block_vision',
    'block_disc_signals', 'block_objections',
    'block_commitments', 'block_reflection',
    'block_coach_assessment'
  ];
  return blocks.filter((b) =>
    parsed[b] !== null &&
    parsed[b] !== undefined
  ).length;
}

function inferSessionDate(rawText: string): string {
  const dateMatch =
    rawText.match(/\b(20\d{2}-\d{2}-\d{2})\b/) ??
    rawText.match(/\b(\d{1,2}\/\d{1,2}\/20\d{2})\b/);

  if (!dateMatch?.[1]) {
    return new Date().toISOString().slice(0, 10);
  }

  const raw = dateMatch[1];
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const [m, d, y] = raw.split('/');
  const mm = m.padStart(2, '0');
  const dd = d.padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function baseFileNameFromPathOrName(
  fileNameOrPath: string
): string {
  const parts = fileNameOrPath.split(/[/\\]/);
  return parts[parts.length - 1] ?? fileNameOrPath;
}

/** Coach/Sandi output decks — not source intake PDFs. Case-insensitive. */
function isVisionStatementOutputFileName(
  fileName: string
): boolean {
  const base = baseFileNameFromPathOrName(fileName);
  const lower = base.toLowerCase();
  if (lower.includes('vision statement')) return true;
  if (lower.includes('vision_statement')) return true;
  const compact = lower.replace(/[^a-z0-9]/g, '');
  return compact.includes('visionstatement');
}

function isOfficeDocExcludedExtension(
  filePathOrName: string
): boolean {
  const lower = filePathOrName.toLowerCase();
  return (
    lower.endsWith('.pptx') ||
    lower.endsWith('.ppt') ||
    lower.endsWith('.docx')
  );
}

/** PDF for DISC / You2 / TUMAY / Fathom / vision; .txt only for Fathom. */
function isAllowedExtractorExtension(
  documentType: DocumentType | string,
  filePath: string
): boolean {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.pdf')) return true;
  if (documentType === 'fathom' && lower.endsWith('.txt')) {
    return true;
  }
  return false;
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
    // PASS 1: Page-targeted extraction — pages 23-25, 28, 34, 35, 36 (covers TTI standard + Executive)
    let targetedText = rawText;
    const isPdf = filePath.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        const pageResult = await invoke<{
          text: string;
          success: boolean;
          error?: string;
        }>('extract_pdf_pages', {
          filePath,
          pageNumbers: [23, 24, 25, 28, 34, 35, 36],
        });
        if (pageResult.success && pageResult.text.trim().length > 50) {
          targetedText = pageResult.text;
        } else if (pageResult.error) {
          throw new Error(pageResult.error);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('Page extraction failed:', msg);
        throw new Error(msg);
      }
    }

    // Deterministic score parsing
    let deterministicScores: {
      adapted_d: number | null;
      adapted_i: number | null;
      adapted_s: number | null;
      adapted_c: number | null;
      natural_d: number | null;
      natural_i: number | null;
      natural_s: number | null;
      natural_c: number | null;
      found: boolean;
    } = {
      adapted_d: null,
      adapted_i: null,
      adapted_s: null,
      adapted_c: null,
      natural_d: null,
      natural_i: null,
      natural_s: null,
      natural_c: null,
      found: false,
    };

    try {
      deterministicScores = await invoke('parse_disc_scores_from_text', {
        text: targetedText,
      });
    } catch {
      // Parser failed, continue with LLM only
    }

    // PASS 2: LLM for narrative fields
    const prompt = await loadPrompt('disc_extraction');
    const systemPrompt = `${prompt}

You are extracting data from a TTI Talent Insights report.
Return ONLY valid JSON. No explanation. No markdown. JSON only.

CRITICAL SCORE EXTRACTION RULES:
Scores appear in TWO formats in the raw text:
FORMAT 1 — Behavioral Hierarchy page bottom line:
  SIA: D-I-S-C (N)  SIN: D-I-S-C (N)
  SIA = Adapted Style scores D-I-S-C
  SIN = Natural Style scores D-I-S-C
FORMAT 2 — Mini-graph thumbnails on content pages:
  Four numbers in sequence below bar charts
Use FORMAT 1 if found. It is the most reliable.

CRITICAL WHEEL LABEL RULE:
The style label appears on the TTI Wheel page as:
  Natural: (N) [STYLE LABEL]
Extract the Natural style label as primary_style_label.
Extract the two highest Natural scores as combination.

CRITICAL DRIVING FORCES RULES:
Extract from pages titled:
  "Primary Driving Forces Cluster" (forces 1-4)
  "Situational Driving Forces Cluster" (forces 5-8)
  "Indifferent Driving Forces Cluster" (forces 9-12)
Do NOT use the Driving Forces Graph page.

CRITICAL COMMUNICATION RULES:
DOs come from "Checklist for Communicating" page
  under the heading "Ways to Communicate:"
DONTs come from the "Continued" page
  under the heading "Ways NOT to Communicate:"
IGNORE the page titled "Communication Tips" page.

STRESS SIGNALS come from the "Perceptions" page:
  Moderate = "Under moderate pressure...others may see"
  Extreme = "Under extreme pressure...others may see"`;

    const rawResponse = await callOllama(systemPrompt, targetedText, DISC_FORMAT_SCHEMA);
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

    // Override LLM scores with deterministic parser results when found
    if (deterministicScores.found) {
      if (deterministicScores.natural_d !== null) {
        profile.natural_scores = {
          D: deterministicScores.natural_d ?? 0,
          I: deterministicScores.natural_i ?? 0,
          S: deterministicScores.natural_s ?? 0,
          C: deterministicScores.natural_c ?? 0,
        };
      }
      if (deterministicScores.adapted_d !== null) {
        profile.adapted_scores = {
          D: deterministicScores.adapted_d ?? 0,
          I: deterministicScores.adapted_i ?? 0,
          S: deterministicScores.adapted_s ?? 0,
          C: deterministicScores.adapted_c ?? 0,
        };
      }
    }

    // VALIDATE required fields before storing
    const adaptedScores = profile.adapted_scores ||
      (profile as unknown as Record<string, unknown>).adaptedScores ||
      { D: 0, I: 0, S: 0, C: 0 };

    const naturalScores = profile.natural_scores ||
      (profile as unknown as Record<string, unknown>).naturalScores ||
      { D: 0, I: 0, S: 0, C: 0 };

    const primaryLabel = profile.primary_style_label ||
      (profile as unknown as Record<string, unknown>).primaryStyleLabel ||
      (profile as unknown as Record<string, unknown>).style_label || '';

    const primaryCombo = profile.primary_style_combination ||
      (profile as unknown as Record<string, unknown>).primaryStyleCombination ||
      (profile as unknown as Record<string, unknown>).style_combination || '';

    const drivingForcesPrimary =
      profile.driving_forces_primary ||
      (profile as unknown as Record<string, unknown>).drivingForcesPrimary || [];

    const communicationDos =
      profile.communication_dos ||
      (profile as unknown as Record<string, unknown>).communicationDos || [];

    const communicationDonts =
      profile.communication_donts ||
      (profile as unknown as Record<string, unknown>).communicationDonts || [];

    const stressModerate =
      profile.stress_signals_moderate ||
      (profile as unknown as Record<string, unknown>).stressSignalsModerate || [];

    const stressExtreme =
      profile.stress_signals_extreme ||
      (profile as unknown as Record<string, unknown>).stressSignalsExtreme || [];

    const idealEnvironment =
      profile.ideal_environment ||
      (profile as unknown as Record<string, unknown>).idealEnvironment || [];

    const valueToOrg =
      profile.value_to_organization ||
      (profile as unknown as Record<string, unknown>).valueToOrganization || [];

    const areasForImprovement =
      profile.areas_for_improvement ||
      (profile as unknown as Record<string, unknown>).areasForImprovement || [];

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
        (adaptedScores as { D?: number }).D ?? 0,
        (adaptedScores as { I?: number }).I ?? 0,
        (adaptedScores as { S?: number }).S ?? 0,
        (adaptedScores as { C?: number }).C ?? 0,
        (naturalScores as { D?: number }).D ?? 0,
        (naturalScores as { I?: number }).I ?? 0,
        (naturalScores as { S?: number }).S ?? 0,
        (naturalScores as { C?: number }).C ?? 0,
        primaryLabel,
        primaryCombo,
        JSON.stringify(drivingForcesPrimary),
        JSON.stringify(
          profile.driving_forces_situational ||
          (profile as unknown as Record<string, unknown>).drivingForcesSituational || []
        ),
        JSON.stringify(
          profile.driving_forces_indifferent ||
          (profile as unknown as Record<string, unknown>).drivingForcesIndifferent || []
        ),
        JSON.stringify(communicationDos),
        JSON.stringify(communicationDonts),
        JSON.stringify({
          moderate: stressModerate,
          extreme: stressExtreme,
        }),
        JSON.stringify(idealEnvironment),
        JSON.stringify(valueToOrg),
        JSON.stringify(areasForImprovement),
        profile.assessment_date || '',
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
        : (error && typeof error === 'object' && 'message' in error)
          ? String((error as { message: unknown }).message)
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
// YOU 2.0 DETERMINISTIC EXTRACTION (PASS 1)
// Vision + Top 3 sections — no LLM needed
// ─────────────────────────────────────

export interface You2DeterministicResult {
  one_year_vision: string;
  dangers: Array<{ danger: string; goal: string }>;
  strengths: Array<{ strength: string; goal: string }>;
  opportunities: Array<{ opportunity: string; goal: string }>;
  found: boolean;
}

export function extractYou2VisionDeterministic(text: string): You2DeterministicResult {
  const result: You2DeterministicResult = {
    one_year_vision: '',
    dangers: [],
    strengths: [],
    opportunities: [],
    found: false,
  };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return result;

  // Vision: text between first line (client name) and "Dangers" section
  const dangersIdx = lines.findIndex(
    (l) => /^dangers\b/i.test(l) || /^top\s*3\s*dangers/i.test(l)
  );
  if (dangersIdx > 1) {
    result.one_year_vision = lines
      .slice(1, dangersIdx)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract paired Danger:/Goal: blocks
  const extractDangerGoal = (arr: string[]): Array<{ danger: string; goal: string }> => {
    const pairs: Array<{ danger: string; goal: string }> = [];
    let current: { danger: string; goal: string } | null = null;
    for (const line of arr) {
      const dangerMatch = line.match(/^danger:\s*(.+)$/i);
      const goalMatch = line.match(/^goal:\s*(.+)$/i);
      if (dangerMatch) {
        if (current) pairs.push(current);
        current = { danger: dangerMatch[1].trim(), goal: '' };
      } else if (goalMatch && current) {
        current.goal = goalMatch[1].trim();
        pairs.push(current);
        current = null;
      }
    }
    if (current) pairs.push(current);
    return pairs.slice(0, 3);
  };

  // Extract paired Strength:/Goal: blocks
  const extractStrengthGoal = (arr: string[]): Array<{ strength: string; goal: string }> => {
    const pairs: Array<{ strength: string; goal: string }> = [];
    let current: { strength: string; goal: string } | null = null;
    for (const line of arr) {
      const strengthMatch = line.match(/^strength:\s*(.+)$/i);
      const goalMatch = line.match(/^goal:\s*(.+)$/i);
      if (strengthMatch) {
        if (current) pairs.push(current);
        current = { strength: strengthMatch[1].trim(), goal: '' };
      } else if (goalMatch && current) {
        current.goal = goalMatch[1].trim();
        pairs.push(current);
        current = null;
      }
    }
    if (current) pairs.push(current);
    return pairs.slice(0, 3);
  };

  // Extract paired Opportunity:/Goal: blocks
  const extractOpportunityGoal = (arr: string[]): Array<{ opportunity: string; goal: string }> => {
    const pairs: Array<{ opportunity: string; goal: string }> = [];
    let current: { opportunity: string; goal: string } | null = null;
    for (const line of arr) {
      const oppMatch = line.match(/^opportunity:\s*(.+)$/i);
      const goalMatch = line.match(/^goal:\s*(.+)$/i);
      if (oppMatch) {
        if (current) pairs.push(current);
        current = { opportunity: oppMatch[1].trim(), goal: '' };
      } else if (goalMatch && current) {
        current.goal = goalMatch[1].trim();
        pairs.push(current);
        current = null;
      }
    }
    if (current) pairs.push(current);
    return pairs.slice(0, 3);
  };

  result.dangers = extractDangerGoal(lines);
  result.strengths = extractStrengthGoal(lines);
  result.opportunities = extractOpportunityGoal(lines);

  result.found =
    result.one_year_vision.length > 20 ||
    result.dangers.length > 0 ||
    result.strengths.length > 0 ||
    result.opportunities.length > 0;

  return result;
}

// ─────────────────────────────────────
// YOU 2.0 EXTRACTION
// Calibrated for TES You 2.0 + TUMAY format
// Expects concatenated text from BOTH files
// Two-pass: deterministic first, LLM only if vision empty
// ─────────────────────────────────────

const YOU2_LLM_TIMEOUT_MS = 120000; // 2 minutes — short doc, skip if corrupted

async function callOllamaYou2(
  systemPrompt: string,
  userContent: string,
  formatSchema?: object
): Promise<string> {
  const _schema = formatSchema;
  void _schema;
  const _timeout = YOU2_LLM_TIMEOUT_MS;
  void _timeout;
  const prompt = `${systemPrompt}\n\nDocument text:\n${userContent}\n\nIMPORTANT: Your response must be ONLY a valid JSON object. No explanation. No preamble. No markdown. Start with { and end with }.`;
  return callOllamaProxy(prompt, OLLAMA_MODEL);
}

export async function extractYou2Profile(
  clientId: string,
  rawText: string,
  fileName: string,
  filePath: string
): Promise<ExtractionResult<You2Profile>> {
  try {
    // Get text: use pdfium for PDFs (lopdf cannot decode these), else use rawText
    let workingText = rawText;
    const isPdf = filePath.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      const pageResult = await invoke<{
        text: string;
        success: boolean;
        error?: string;
      }>('extract_pdf_pages', {
        filePath,
        pageNumbers: [1, 2, 3, 4, 5],
      });
      if (!pageResult.success) {
        throw new Error(
          `You2 page extraction failed: ${pageResult.error ?? 'unknown'}`
        );
      }
      workingText = pageResult.text;
    }

    // PASS 1 — Deterministic extraction (vision + top 3) — fast, no LLM
    const deterministic = extractYou2VisionDeterministic(workingText);

    if (
      deterministic.one_year_vision &&
      deterministic.one_year_vision.length > 20 &&
      deterministic.dangers.length > 0 &&
      deterministic.strengths.length > 0 &&
      deterministic.opportunities.length > 0
    ) {
      // Skip LLM entirely — deterministic succeeded
      const firstLine = workingText.split(/\r?\n/)[0]?.trim() || '';
      const profile: You2Profile = {
        client_name: firstLine || 'Unknown',
        one_year_vision: deterministic.one_year_vision,
        spouse_name: '',
        spouse_role: 'none',
        spouse_on_calls: 'no',
        spouse_mindset_verbatim: '',
        financial_net_worth_range: '',
        credit_score: 0,
        launch_timeline: '',
        time_commitment: '',
        dangers: deterministic.dangers.length > 0 ? deterministic.dangers : [],
        strengths: deterministic.strengths.length > 0 ? deterministic.strengths : [],
        opportunities: deterministic.opportunities.length > 0 ? deterministic.opportunities : [],
        areas_of_interest: [],
        reasons_for_change: [],
        location_preference: '',
        skills: [],
        prior_business_experience: '',
        self_sufficiency_excitement: '',
        additional_stakeholders: [],
      };
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
      await recordExtraction(
        clientId,
        'you2',
        filePath,
        fileName,
        'complete',
        profile
      );
      await logEntry(
        'you2_extraction',
        clientId,
        null,
        null,
        `You2 extracted via deterministic method. Vision length: ${deterministic.one_year_vision.length} chars.`,
        'deterministic'
      );
      return {
        success: true,
        data: profile,
        extraction_status: 'complete',
      };
    }

    // PASS 2 — LLM fallback only if deterministic returned empty vision
    let profile: You2Profile | null = null;
    try {
      const prompt = `You are extracting data
from TES You 2.0 and TUMAY intake forms.
Return ONLY valid JSON. No explanation.
No markdown. JSON only.

ONE-YEAR VISION:
The answer to "If we looked at your life
a year from today..." may be one paragraph
or two separate lines. Concatenate all
lines into a single one_year_vision string.

DANGERS, STRENGTHS, OPPORTUNITIES:
ALWAYS extract from "Top 3 Dangers & Goals"
"Top 3 Strengths & Goals" and
"Top 3 Opportunities & Goals" sections.
Do NOT use the Yes/No checkbox list.
Each item has a "Danger/Strength/
Opportunity:" line followed by "Goal:".
Extract both as paired objects.
If no labeled sections found extract
the three most prominent pain points
strengths and opportunities from
the vision text itself.

REASONS FOR CHANGE (TUMAY Question 3):
Extract ONLY items marked Yes.
Never include No items.

SKILLS (from TUMAY Question 6 —
"Which of the following skills do
you possess?"):
Extract ALL items marked Yes as a
plain string array.
Common skills in this document:
  Strategic thinking
  Project management
  Structured execution
  Sound decision-making
  Analytical thinking
  Data interpretation
  Cross-functional collaboration
  Process improvement
  Relationship building
  Leadership development
  Needs-based solutions
  Mentoring and training
  Adaptability
  Embracing change
  Sales and business development
  Financial management
  Operations management
  Marketing and brand building
  Customer service excellence
  Team building and motivation
Extract only items explicitly marked
Yes or checked. Return as array of
plain strings.
If no skills section found extract
any skills mentioned in the vision
text or reasons for change.
Never return empty array if the
person clearly has professional
experience — infer at least 3 skills
from their career background described
in the vision text.

SPOUSE DATA:
spouse_role: "owner" if Yes owner
  "employee" if Yes employee
  "unsure" if Unsure
  "none" if No or blank
spouse_on_calls: from "Will they be
  involved in future calls"
  "yes" or "no"

NET WORTH: Extract exactly as written.
  Example: "250k - 500k" or "1M+"

CREDIT SCORE: Extract the number only.
  Use 0 if not provided.

LAUNCH TIMELINE: Extract as written.
  Example: "6 - 12 months"

TIME COMMITMENT:
Extract ALL selected options and
concatenate with semicolons.
The document may have multiple
selections checked.
Common options:
  Full-Time Owner Operated
  Semi-Absentee at Launch
  Semi-Absentee after 2 years
  Absentee Owner
  Part-Time
Extract every option that is checked
or marked Yes.
Concatenate all with " ; " separator.
Example output:
  "Full-Time Owner Operated ;
  Semi-Absentee at Launch ;
  Semi-Absentee after 2 years"
Never return only one option if
multiple are checked.

Return this exact JSON structure:
{
  "client_name": "string",
  "one_year_vision": "string",
  "spouse_name": "string",
  "spouse_role": "owner|employee|unsure|none",
  "spouse_on_calls": "yes|no",
  "spouse_mindset_verbatim": "string",
  "financial_net_worth_range": "string",
  "credit_score": 0,
  "launch_timeline": "string",
  "time_commitment": "string",
  "dangers": [
    {"danger": "string", "goal": "string"}
  ],
  "strengths": [
    {"strength": "string", "goal": "string"}
  ],
  "opportunities": [
    {"opportunity": "string", "goal": "string"}
  ],
  "areas_of_interest": ["string"],
  "reasons_for_change": ["string"],
  "location_preference": "string",
  "skills": ["string"],
  "prior_business_experience": "string",
  "self_sufficiency_excitement": "string",
  "additional_stakeholders": [
    {"name": "string", "relationship": "string"}
  ]
}`;

      const rawResponse = await callOllamaYou2(
        prompt,
        workingText,
        YOU2_FORMAT_SCHEMA
      );
      profile = parseExtractionResponse<You2Profile>(rawResponse);

      // Override with deterministic top 3 if LLM missed them
      if (profile && deterministic.found) {
        if (deterministic.dangers.length > 0) profile.dangers = deterministic.dangers;
        if (deterministic.strengths.length > 0) profile.strengths = deterministic.strengths;
        if (deterministic.opportunities.length > 0) profile.opportunities = deterministic.opportunities;
        if (deterministic.one_year_vision && !profile.one_year_vision) {
          profile.one_year_vision = deterministic.one_year_vision;
        }
      }
    } catch (llmError) {
      console.warn(
        'You2 LLM failed, using deterministic:',
        llmError
      );
      if (deterministic.one_year_vision) {
        const fallbackProfile: You2Profile = {
          client_name:
            workingText.split(/\r?\n/)[0]?.trim() || '',
          one_year_vision: deterministic.one_year_vision,
          spouse_name: '',
          spouse_role: 'none',
          spouse_on_calls: 'no',
          spouse_mindset_verbatim: '',
          financial_net_worth_range: '',
          credit_score: 0,
          launch_timeline: '',
          time_commitment: '',
          dangers: deterministic.dangers,
          strengths: deterministic.strengths,
          opportunities: deterministic.opportunities,
          areas_of_interest: [],
          reasons_for_change: [],
          location_preference: '',
          skills: [],
          prior_business_experience: '',
          self_sufficiency_excitement: '',
          additional_stakeholders: [],
        };
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
            fallbackProfile.one_year_vision,
            fallbackProfile.spouse_name,
            fallbackProfile.spouse_role,
            fallbackProfile.spouse_on_calls,
            fallbackProfile.spouse_mindset_verbatim,
            fallbackProfile.financial_net_worth_range,
            fallbackProfile.credit_score,
            fallbackProfile.launch_timeline,
            fallbackProfile.time_commitment,
            JSON.stringify(fallbackProfile.dangers),
            JSON.stringify(fallbackProfile.strengths),
            JSON.stringify(fallbackProfile.opportunities),
            JSON.stringify(fallbackProfile.areas_of_interest),
            JSON.stringify(fallbackProfile.reasons_for_change),
            fallbackProfile.location_preference,
            JSON.stringify(fallbackProfile.skills),
            fallbackProfile.prior_business_experience,
            fallbackProfile.self_sufficiency_excitement,
            JSON.stringify(fallbackProfile.additional_stakeholders),
          ]
        );
        return {
          success: true,
          data: fallbackProfile,
          extraction_status: 'complete',
        };
      }
    }

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
    await logEntry(
      'you2_extraction',
      clientId,
      null,
      null,
      `You2 extracted via llm method. Vision length: ${profile.one_year_vision?.length ?? 0} chars.`,
      'qwen2.5:7b-instruct-q4_k_m'
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

async function countCoachingSessionNearDuplicates(
  clientId: string,
  sessionDate: string,
  incomingNotes: string | null
): Promise<number> {
  const rows = await dbSelect<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM coaching_sessions
     WHERE client_id = ?
       AND session_date = ?
       AND ABS(
         LENGTH(COALESCE(notes, '')) -
         LENGTH(?)
       ) < 50`,
    [clientId, sessionDate, incomingNotes ?? '']
  );
  return Number(rows[0]?.count ?? 0);
}

/** Removes rows with a session_date but no usable notes (ghost / placeholder sessions). */
async function cleanupGhostCoachingSessions(): Promise<void> {
  try {
    await dbExecute(
      `DELETE FROM coaching_sessions
       WHERE (notes IS NULL
         OR notes = ''
         OR LENGTH(TRIM(notes)) = 0)
         AND session_date IS NOT NULL`,
      []
    );
  } catch (e) {
    console.error('[documentExtractionService] ghost coaching_sessions cleanup failed:', e);
  }
}

async function runFathomSessionDuplicateCleanups(): Promise<void> {
  try {
    await dbExecute(
      `DELETE FROM coaching_sessions
       WHERE id NOT IN (
         SELECT MIN(id)
         FROM coaching_sessions
         GROUP BY
           client_id,
           session_date,
           SUBSTR(COALESCE(notes,''), 1, 100)
       )
       AND client_id IN (
         SELECT id FROM clients
         WHERE outcome_bucket != 'inactive'
       )`,
      []
    );
    await dbExecute(
      `DELETE FROM coaching_sessions
       WHERE session_date = '2026-02-19'
         AND stage = 'Possibilities'
         AND (
           notes IS NULL
           OR notes = ''
           OR LENGTH(notes) < 20
         )`,
      []
    );
    console.log('Duplicate session cleanup complete');
  } catch (e) {
    console.error('[FATHOM-BULK] duplicate cleanup failed:', e);
  }
}

export async function extractFathomSession(
  clientId: string,
  rawText: string,
  fileName: string,
  filePath: string
): Promise<ExtractionResult<FathomSession>> {
  try {
    const transcriptText = rawText.trim();
    const fathomPrompt = await readPromptFile(
      'fathom_extraction.txt'
    );

    const rawResponse = await invoke<string>(
      'ollama_generate',
      {
        prompt: fathomPrompt + '\n' + transcriptText,
        system: 'You extract structured coaching intelligence from franchise coaching call transcripts. Return only valid JSON.',
        model: 'qwen2.5:7b-instruct-q4_k_m'
      }
    );

    const parsed = parseExtractionResponse<Record<string, unknown>>(rawResponse);

    if (!parsed) {
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

    const stage =
      (
        parsed.block_coach_assessment as
          | { stage_recommendation?: string }
          | null
      )?.stage_recommendation
      ?? 'IC';

    const commitments =
      (
        parsed.block_commitments as
          | { client_commitments?: unknown }
          | null
      )?.client_commitments
      ?? [];

    const summary =
      (
        parsed.block_reflection as
          | { mindset_shift?: string; insight_surfaced?: string }
          | null
      )?.mindset_shift
      ?? (
        parsed.block_reflection as
          | { mindset_shift?: string; insight_surfaced?: string }
          | null
      )?.insight_surfaced
      ?? null;

    const sessionDate = inferSessionDate(transcriptText);
    const dupCount = await countCoachingSessionNearDuplicates(
      clientId,
      sessionDate,
      summary
    );
    if (dupCount > 0) {
      const nm = await dbSelect<{ name: string }>(
        'SELECT name FROM clients WHERE id = ? LIMIT 1',
        [clientId]
      );
      console.log(
        'Skipping duplicate session for',
        nm[0]?.name ?? clientId,
        'on',
        sessionDate
      );
      return {
        success: true,
        data: parsed as unknown as FathomSession,
        extraction_status: 'complete',
      };
    }

    const insertResult = await dbExecute(
      `INSERT INTO coaching_sessions
       (client_id, session_date, session_number, stage,
        notes, next_actions, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)`,
      [
        clientId,
        sessionDate,
        null,
        stage,
        summary,
        JSON.stringify(commitments),
      ]
    );

    const sessionId = insertResult.lastInsertId;

    await dbExecute(
      `UPDATE coaching_sessions
       SET block_opening = ?,
           block_emotional = ?,
           block_life_context = ?,
           block_vision = ?,
           block_disc_signals = ?,
           block_objections = ?,
           block_commitments = ?,
           block_reflection = ?,
           block_coach_assessment = ?,
           blocks_complete = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        JSON.stringify(parsed.block_opening ?? null),
        JSON.stringify(parsed.block_emotional ?? null),
        JSON.stringify(parsed.block_life_context ?? null),
        JSON.stringify(parsed.block_vision ?? null),
        JSON.stringify(parsed.block_disc_signals ?? null),
        JSON.stringify(parsed.block_objections ?? null),
        JSON.stringify(parsed.block_commitments ?? null),
        JSON.stringify(parsed.block_reflection ?? null),
        JSON.stringify(parsed.block_coach_assessment ?? null),
        countNonNullBlocks(parsed),
        sessionId
      ]
    );

    await recordExtraction(
      clientId,
      'fathom',
      filePath,
      fileName,
      'complete',
      parsed
    );

    return {
      success: true,
      data: parsed as unknown as FathomSession,
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
  const baseName = baseFileNameFromPathOrName(fileName);
  if (isVisionStatementOutputFileName(baseName)) {
    console.log(
      'Skipping Vision Statement file — not a source document:',
      baseName
    );
    return {
      success: false,
      data: null,
      error:
        'Skipped: Vision Statement file is not a source document',
      extraction_status: 'skipped',
    };
  }
  if (isOfficeDocExcludedExtension(filePath)) {
    return {
      success: false,
      data: null,
      error: 'Skipped: PPTX/PPT/DOCX are not extracted',
      extraction_status: 'skipped',
    };
  }

  const extractedText = await extractVisionText(filePath, rawText);
  const normalizedText = extractedText.trim();
  const textLength = normalizedText.length;
  const isPptx =
    fileName.toLowerCase().endsWith('.pptx') ||
    fileName.toLowerCase().endsWith('.ppt');

  if (isPptx && textLength > 20) {
    await dbExecute(
      `UPDATE clients
       SET vision_statement = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [normalizedText, clientId]
    );

    await logEntry(
      'vision_extraction',
      clientId,
      null,
      null,
      `Vision extracted from PPTX: ${fileName}, length: ${textLength} chars`,
      'pptx_direct'
    );

    await recordExtraction(
      clientId,
      'vision',
      filePath,
      fileName,
      'complete',
      { raw_text: normalizedText }
    );
    return {
      success: true,
      data: null,
      extraction_status: 'complete',
    };
  }

  if (isPptx && textLength <= 20) {
    await recordExtraction(
      clientId,
      'vision',
      filePath,
      fileName,
      'failed',
      null,
      'PPTX vision statement — no text extracted'
    );
    await logEntry(
      'vision_extraction',
      clientId,
      null,
      null,
      `Vision extraction failed from PPTX: ${fileName}, length: ${textLength} chars`,
      'pptx_direct'
    );
    return {
      success: false,
      data: null,
      error: 'PPTX — no extractable text found',
      extraction_status: 'failed',
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

async function extractVisionText(filePath: string, fallbackRawText: string): Promise<string> {
  try {
    const direct = await invoke<string>('extract_text', { filePath });
    if (typeof direct === 'string' && direct.trim().length > 0) {
      return direct;
    }
  } catch {
    // Fallback command below.
  }

  try {
    const response = await invoke<{
      text: string;
      success: boolean;
      error?: string;
    }>('extract_text_from_any_file', { filePath });
    if (response.success && typeof response.text === 'string') {
      return response.text;
    }
  } catch {
    // Use fallbackRawText below.
  }

  return fallbackRawText ?? '';
}

export async function reExtractVision(
  clientId: string,
  filePath: string
): Promise<boolean> {
  const fileName = filePath.split(/[\\/]/).pop() || 'vision.pptx';
  const result = await handleVisionStatement(clientId, fileName, filePath, '');
  return result.success;
}

async function extractVisionFromFile(
  clientId: string,
  filePath: string
): Promise<boolean> {
  const vBase = baseFileNameFromPathOrName(filePath);
  if (isVisionStatementOutputFileName(vBase)) {
    console.log(
      'Skipping Vision Statement file — not a source document:',
      vBase
    );
    return false;
  }
  if (isOfficeDocExcludedExtension(filePath)) {
    return false;
  }
  try {
    const text = await invoke<string>(
      'extract_text', { filePath }
    );
    if (!text || text.trim().length < 20) {
      return false;
    }
    const db = await getDb();
    await db.execute(
      `UPDATE clients
       SET vision_statement = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [text.trim(), clientId]
    );
    return true;
  } catch {
    return false;
  }
}

async function extractTumayFromFile(
  clientId: string,
  filePath: string
): Promise<boolean> {
  const tumayBase = baseFileNameFromPathOrName(filePath);
  if (isVisionStatementOutputFileName(tumayBase)) {
    console.log(
      'Skipping Vision Statement file — not a source document:',
      tumayBase
    );
    return false;
  }
  if (
    isOfficeDocExcludedExtension(filePath) ||
    !filePath.toLowerCase().endsWith('.pdf')
  ) {
    return false;
  }
  try {
    const TUMAY_PROMPT = `Extract these fields
from the TUMAY franchise coaching intake
form. Return ONLY valid JSON, no markdown.

Required JSON fields:
{
  "contact_name": "full name",
  "email": "email address",
  "phone": "phone number",
  "city": "city",
  "state": "state",
  "spouse_name": "spouse name or empty",
  "spouse_role": "Yes/No/Unsure",
  "spouse_on_calls": "Yes/No",
  "spouse_mindset": "their mindset text",
  "reasons_for_change": ["array of Yes answers from Q3"],
  "location_preference": "highest ranked location type",
  "time_commitment": "from Selected field in Q7",
  "launch_timeline": "from Selected field in Q9",
  "financial_net_worth_range": "range from Q13",
  "credit_score": "score from Q13",
  "areas_of_interest": ["array of Yes answers from Q11"],
  "self_sufficiency_explored": "Yes/No",
  "self_sufficiency_excitement": "their answer text",
  "future_growth_interest": "Yes/No",
  "funding_education_interest": "Yes/No"
}

Examples of correct values:
  financial_net_worth_range: "250k - 500k" or "1M+"
  launch_timeline: "6 - 12 months" or "0 - 6 months"
  time_commitment: "Semi-Absentee at Launch"
  spouse_role: "Yes" or "No" or "Unsure"
  reasons_for_change: ["Tired of corporate world",
    "Want independence", "Increase income"]
  areas_of_interest: ["Health and Wellness",
    "Senior Care", "Coaching / Training"]
`;
    console.log('[TUMAY] starting:', filePath);

    // Use same pattern as DISC and You2
    // extract_pdf_pages -> Rust pdfium
    const pageResult = await invoke<{
      text: string;
      success: boolean;
    }>('extract_pdf_pages', {
      filePath: filePath,
      pageNumbers: [1, 2, 3, 4, 5]
    });

    console.log('[TUMAY] page extract success:',
      pageResult.success);
    console.log('[TUMAY] text length:',
      pageResult.text?.length);

    if (!pageResult.success ||
        !pageResult.text ||
        pageResult.text.length < 50) {
      console.log('[TUMAY] text extraction failed');
      return false;
    }

    const systemPrompt = `You are extracting structured data from a franchise coaching intake form called Tell Us More About You. Extract all fields and return ONLY valid JSON with no explanation no markdown no code blocks.`;

    console.log('[TUMAY] calling ollama_generate...');

    const rawResponse = await invoke<string>(
      'ollama_generate',
      {
        prompt: TUMAY_PROMPT + '\n\nDocument text:\n' + pageResult.text,
        system: systemPrompt,
        model: 'qwen2.5:7b-instruct-q4_k_m'
      }
    );

    console.log('[TUMAY] ollama response length:',
      rawResponse?.length);
    console.log('[TUMAY] response preview:',
      rawResponse?.substring(0, 200));

    const cleaned = rawResponse
      ?.replace(/```json/g, '')
      ?.replace(/```/g, '')
      ?.trim();

    if (!cleaned || cleaned.length < 5) {
      console.log('[TUMAY] empty response from ollama');
      return false;
    }

    const tumayData = JSON.parse(cleaned);
    console.log('[TUMAY] parsed successfully');

    const db = await getDb();

    // Write to clients.tumay_data
    await db.execute(
      `UPDATE clients
       SET tumay_data = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [JSON.stringify(tumayData), clientId]
    );

    // Write contact info if empty
    if (tumayData.email || tumayData.phone) {
      await db.execute(
        `UPDATE clients
         SET email = COALESCE(NULLIF(email,''), ?),
             phone = COALESCE(NULLIF(phone,''), ?),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          tumayData.email ?? null,
          tumayData.phone ?? null,
          clientId
        ]
      );
    }

    // Write to client_you2_profiles
    await db.execute(
      `UPDATE client_you2_profiles
       SET spouse_name =
         COALESCE(NULLIF(spouse_name,''), ?),
       spouse_role =
         COALESCE(NULLIF(spouse_role,''), ?),
       spouse_on_calls =
         COALESCE(NULLIF(spouse_on_calls,''), ?),
       spouse_mindset =
         COALESCE(NULLIF(spouse_mindset,''), ?),
       financial_net_worth_range =
         COALESCE(
           NULLIF(financial_net_worth_range,''), ?),
       credit_score =
         COALESCE(NULLIF(CAST(credit_score AS TEXT),
           '0'), NULLIF(?, '')),
       launch_timeline =
         COALESCE(NULLIF(launch_timeline,''), ?),
       areas_of_interest =
         COALESCE(NULLIF(areas_of_interest,''), ?),
       reasons_for_change =
         COALESCE(NULLIF(reasons_for_change,''), ?),
       time_commitment =
         COALESCE(NULLIF(time_commitment,''), ?),
       updated_at = CURRENT_TIMESTAMP
       WHERE client_id = ?`,
      [
        tumayData.spouse_name ?? null,
        tumayData.spouse_role ?? null,
        tumayData.spouse_on_calls ?? null,
        tumayData.spouse_mindset ?? null,
        tumayData.financial_net_worth_range ?? null,
        tumayData.credit_score ?? null,
        tumayData.launch_timeline ?? null,
        JSON.stringify(
          tumayData.areas_of_interest ?? []
        ),
        JSON.stringify(
          tumayData.reasons_for_change ?? []
        ),
        tumayData.time_commitment ?? null,
        clientId
      ]
    );

    console.log('[TUMAY] SUCCESS for', clientId);
    return true;

  } catch (e) {
    console.error('[TUMAY] ERROR:', String(e));
    return false;
  }
}

export async function bulkReExtractVisionAndTumay(
  clients: Array<{
    id: string;
    name: string;
    outcome_bucket: string;
  }>
): Promise<{
  vision_success: number;
  tumay_success: number;
  errors: string[];
}> {
  const BASE =
    'C:\\Users\\zumah\\SandiBot\\clients';
  const BUCKETS: Record<string, string> = {
    active: 'Active',
    converted: 'WIN',
    paused: 'Paused'
  };

  let vision_success = 0;
  let tumay_success = 0;
  const errors: string[] = [];

  for (const client of clients) {
    console.log('[TUMAY-v2] bulk client:', client.id, client.name, client.outcome_bucket);
    const bucket = BUCKETS[client.outcome_bucket]
      ?? 'Active';
    const folderName =
      client.name.replace(/\s+/g, '_');

    const searchPaths = [
      `${BASE}\\${bucket}\\${folderName}`,
      `${BASE}\\${bucket}`
    ];

    let visionDone = false;
    let tumayDone = false;

    for (const searchPath of searchPaths) {
      console.log('[TUMAY-v2] bulk searchPath:', searchPath);
      let files: string[] = [];
      try {
        files = await invoke<string[]>(
          'list_directory', { path: searchPath }
        );
        console.log('[TUMAY-v2] bulk files found:', files.length);
      } catch (e) {
        const msg = `[TUMAY-v2] list_directory failed for ${searchPath}: ${String(e)}`;
        console.log(msg);
        errors.push(msg);
        continue;
      }

      console.log('[TUMAY debug] searchPath:', searchPath);
      console.log('[TUMAY debug] files found:', files);
      console.log('[TUMAY debug] client.name:', client.name);
      const clientFiles = files.filter(f => {
        const fname = f.split('\\').pop()
          ?? f.split('/').pop() ?? '';
        const normalizedName = client.name.toLowerCase().trim();
        const normalizedFileName = fname.toLowerCase().trim();
        const normalizedPath = f.toLowerCase();
        return normalizedFileName.startsWith(normalizedName)
          || normalizedPath.includes(normalizedName);
      });
      console.log('[TUMAY debug] clientFiles after filter:', clientFiles);
      if (clientFiles.length === 0) {
        const msg = `[TUMAY-v2] no matched files for ${client.name} in ${searchPath}`;
        console.log(msg);
      }

      for (const filePath of clientFiles) {
        const bulkBase =
          filePath.split(/[/\\]/).pop() ?? filePath;
        if (isVisionStatementOutputFileName(bulkBase)) {
          console.log(
            'Skipping Vision Statement file — not a source document:',
            bulkBase
          );
          continue;
        }
        if (isOfficeDocExcludedExtension(filePath)) {
          continue;
        }

        const lower = filePath.toLowerCase();

        if (!visionDone &&
            lower.includes('vision') &&
            lower.endsWith('.pptx')) {
          const ok =
            await extractVisionFromFile(
              client.id, filePath
            );
          if (ok) {
            vision_success++;
            visionDone = true;
          } else {
            errors.push(
              `Vision failed: ${client.name}`
            );
          }
        }

        if (!tumayDone &&
            lower.includes('tumay') &&
            lower.endsWith('.pdf')) {
          const ok =
            await extractTumayFromFile(
              client.id, filePath
            );
          if (ok) {
            tumay_success++;
            tumayDone = true;
          } else {
            errors.push(
              `TUMAY failed: ${client.name}`
            );
          }
        }
      }
    }

    // add delay between clients
    await new Promise(resolve =>
      setTimeout(resolve, 500)
    );
  }

  return { vision_success, tumay_success, errors };
}

export async function bulkReExtractFathomSessions(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  console.log('[FATHOM-BULK] starting');
  await runFathomSessionDuplicateCleanups();
  const FATHOM_SYSTEM_PROMPT =
    'You extract structured coaching ' +
    'intelligence from franchise coaching ' +
    'call transcripts. Return only valid JSON ' +
    'matching the exact schema provided. ' +
    'No markdown. No explanation.';

  const FATHOM_PROMPT = `You are analyzing a franchise coaching call
transcript between coach Sandi and a client.

Extract EXACTLY these 9 blocks from the
transcript. Return ONLY valid JSON.
No markdown. No explanation.

For each block: if the information exists
in the transcript, extract it.
If it does not exist, return null for
that block - never invent content.

Return this exact JSON structure:
{
  "block_opening": {
    "client_energy": "excited/flat/anxious/distracted/unknown",
    "contracting_done": true/false,
    "client_set_agenda": true/false,
    "opening_summary": "one sentence"
  },
  "block_emotional": {
    "emotions_expressed": ["array of emotions mentioned"],
    "identity_statements": ["things client said about who they are"],
    "fears_mentioned": ["fears expressed"],
    "what_was_not_said": "coach observation if any"
  },
  "block_life_context": {
    "spouse_sentiment": "supportive/neutral/resistant/not_mentioned",
    "family_obligations": "text or null",
    "current_job_situation": "stable/unstable/toxic/boring/not_mentioned",
    "financial_comfort": "high/medium/low/not_mentioned",
    "personal_circumstances": "text or null"
  },
  "block_vision": {
    "future_life_described": true/false,
    "lifestyle_details": ["specific details client mentioned"],
    "business_models_discussed": ["franchise types or models"],
    "ownership_identity": "did client see themselves as owner yes/no/partial"
  },
  "block_disc_signals": {
    "observed_style": "D/I/S/C/mixed",
    "style_observations": ["specific behaviors observed"],
    "matches_profile": true/false,
    "coaching_note": "one sentence on how to adjust next call"
  },
  "block_objections": {
    "objections": ["list of objections raised"],
    "objection_types": ["financial/spouse/timing/fear/other"],
    "repeat_objections": ["objections that appeared before"],
    "pink_flag_language": ["exact phrases that signal disengagement"]
  },
  "block_commitments": {
    "client_commitments": ["what client agreed to do"],
    "client_chose_action": true/false,
    "next_call_scheduled": true/false,
    "next_call_date": "date or null"
  },
  "block_reflection": {
    "insight_surfaced": "insight coach named that client had not",
    "mindset_shift": "what changed in the client during this call",
    "surprise": "what surprised the coach",
    "engagement_quality": "high/medium/low"
  },
  "block_coach_assessment": {
    "stage_recommendation": "IC/C1/C2/C3/C4/C5",
    "readiness_direction": "improving/stable/declining",
    "recommendation": "VALIDATE/GATHER/PAUSE",
    "next_call_focus": "what the next call should accomplish",
    "priority_question": "the single most important question to ask next call"
  }
}

Transcript:
---
`;

  const BASE = 'C:\\Users\\zumah\\SandiBot\\clients';
  const BUCKETS: Record<string, string> = {
    active: 'Active',
    converted: 'WIN',
    paused: 'Paused'
  };

  const clients = await dbSelect<{
    id: string;
    name: string;
    outcome_bucket: string;
  }>(
    `SELECT id, name, outcome_bucket
     FROM clients ORDER BY name`,
    []
  );
  console.log('[FATHOM-BULK] clients found:', clients.length);

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const client of clients) {
    console.log('[FATHOM-BULK] processing:', client.name, client.outcome_bucket);
    try {
      const bucket = BUCKETS[client.outcome_bucket] ?? 'Active';
      const folderName = client.name.replace(/\s+/g, '_');
      const searchPaths = [
        `${BASE}\\${bucket}\\${folderName}`,
        `${BASE}\\${bucket}`
      ];

      const candidateFiles: string[] = [];
      for (const searchPath of searchPaths) {
        try {
          const files = await invoke<string[]>(
            'list_directory',
            { path: searchPath }
          );
          console.log('[FATHOM-BULK] files in folder:', files);
          const matched = files.filter((filePath) => {
            const lower = filePath.toLowerCase();
            const fileName = lower.split('\\').pop()
              ?? lower.split('/').pop()
              ?? '';
            const origBase =
              filePath.split(/[/\\]/).pop() ?? filePath;
            if (isVisionStatementOutputFileName(origBase)) {
              console.log(
                'Skipping Vision Statement file — not a source document:',
                origBase
              );
              return false;
            }
            if (isOfficeDocExcludedExtension(filePath)) {
              return false;
            }
            const isFathomLike = (
              fileName.includes('convo') ||
              fileName.includes('fathom')
            ) && fileName.endsWith('.pdf');
            return isFathomLike;
          });
          console.log('[FATHOM-BULK] fathom files:', matched);
          candidateFiles.push(...matched);
        } catch {
          // ignore missing folders and continue fallback search path
        }
      }

      if (candidateFiles.length === 0) {
        console.log('[FATHOM-BULK] no fathom files for:', client.name);
        failed += 1;
        errors.push(`No Fathom/Convo PDF found for ${client.name}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      // Use the most recent match from path sort order.
      const filePath = candidateFiles[0];
      const pageResult = await invoke<{
        text: string;
        success: boolean;
        error?: string;
      }>('extract_pdf_pages', {
        filePath,
        pageNumbers: [1, 2, 3, 4],
      });
      console.log('[FATHOM-BULK] text length:', pageResult.text?.length);

      if (!pageResult.success || !pageResult.text?.trim()) {
        failed += 1;
        errors.push(`PDF extraction failed for ${client.name}: ${pageResult.error ?? 'no text'}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      const transcriptText = pageResult.text.trim();
      const truncatedText = transcriptText.substring(0, 3000);

      let rawResponse: string;
      try {
        rawResponse = await invoke<string>(
          'ollama_generate',
          {
            prompt: FATHOM_PROMPT + '\n' + truncatedText,
            system: FATHOM_SYSTEM_PROMPT,
            model: OLLAMA_MODEL
          }
        );
      } catch (e) {
        const errorText = String(e);
        if (!errorText.includes('500')) {
          throw e;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const shortText = transcriptText.substring(0, 2000);
        rawResponse = await invoke<string>(
          'ollama_generate',
          {
            prompt: FATHOM_PROMPT + '\n' + shortText,
            system: FATHOM_SYSTEM_PROMPT,
            model: OLLAMA_MODEL
          }
        );
      }
      console.log('[FATHOM-BULK] ollama response:', rawResponse?.substring(0, 200));
      const parsed = parseExtractionResponse<Record<string, unknown>>(rawResponse);
      if (!parsed) {
        failed += 1;
        errors.push(`JSON parse failed for ${client.name}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      const inferredDate = inferSessionDate(transcriptText);
      const existing = await dbSelect<{
        id: number;
        session_date: string | null;
      }>(
        `SELECT id, session_date
         FROM coaching_sessions
         WHERE client_id = ?
         ORDER BY session_date DESC, id DESC`,
        [client.id]
      );

      let targetSessionId: number | null = null;
      if (existing.length > 0) {
        const exact = existing.find((s) => (s.session_date ?? '') === inferredDate);
        targetSessionId = (exact ?? existing[0]).id;
      }

      const stage =
        (
          parsed.block_coach_assessment as
            | { stage_recommendation?: string }
            | null
        )?.stage_recommendation
        ?? 'IC';

      if (targetSessionId === null) {
        const summary =
          (
            parsed.block_reflection as
              | { mindset_shift?: string; insight_surfaced?: string }
              | null
          )?.mindset_shift
          ?? (
            parsed.block_reflection as
              | { mindset_shift?: string; insight_surfaced?: string }
              | null
          )?.insight_surfaced
          ?? null;

        const dupCount = await countCoachingSessionNearDuplicates(
          client.id,
          inferredDate,
          summary
        );
        if (dupCount > 0) {
          console.log(
            'Skipping duplicate session for',
            client.name,
            'on',
            inferredDate
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        await dbExecute(
          `INSERT INTO coaching_sessions
           (client_id, session_date, stage,
            block_opening, block_emotional,
            block_life_context, block_vision,
            block_disc_signals, block_objections,
            block_commitments, block_reflection_block,
            block_coach_assessment, blocks_complete, updated_at)
           VALUES (?, ?, ?,
                   ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            client.id,
            inferredDate,
            stage,
            JSON.stringify(parsed.block_opening ?? null),
            JSON.stringify(parsed.block_emotional ?? null),
            JSON.stringify(parsed.block_life_context ?? null),
            JSON.stringify(parsed.block_vision ?? null),
            JSON.stringify(parsed.block_disc_signals ?? null),
            JSON.stringify(parsed.block_objections ?? null),
            JSON.stringify(parsed.block_commitments ?? null),
            JSON.stringify(parsed.block_reflection ?? null),
            JSON.stringify(parsed.block_coach_assessment ?? null),
            countNonNullBlocks(parsed),
          ]
        );
      } else {
        await dbExecute(
          `UPDATE coaching_sessions
           SET stage = ?,
               block_opening = ?,
               block_emotional = ?,
               block_life_context = ?,
               block_vision = ?,
               block_disc_signals = ?,
               block_objections = ?,
               block_commitments = ?,
               block_reflection_block = ?,
               block_coach_assessment = ?,
               blocks_complete = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            stage,
            JSON.stringify(parsed.block_opening ?? null),
            JSON.stringify(parsed.block_emotional ?? null),
            JSON.stringify(parsed.block_life_context ?? null),
            JSON.stringify(parsed.block_vision ?? null),
            JSON.stringify(parsed.block_disc_signals ?? null),
            JSON.stringify(parsed.block_objections ?? null),
            JSON.stringify(parsed.block_commitments ?? null),
            JSON.stringify(parsed.block_reflection ?? null),
            JSON.stringify(parsed.block_coach_assessment ?? null),
            countNonNullBlocks(parsed),
            targetSessionId
          ]
        );
      }

      success += 1;
    } catch (e) {
      console.error('[FATHOM-BULK] ERROR:', client.name, String(e));
      failed += 1;
      errors.push(`${client.name}: ${e instanceof Error ? e.message : String(e)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { success, failed, errors };
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
  const routedType = documentType as string;

  const baseName = baseFileNameFromPathOrName(fileName);
  if (isVisionStatementOutputFileName(baseName)) {
    console.log(
      'Skipping Vision Statement file — not a source document:',
      baseName
    );
    return {
      success: false,
      data: null,
      error:
        'Skipped: Vision Statement file is not a source document',
      extraction_status: 'skipped',
    };
  }

  if (isOfficeDocExcludedExtension(filePath)) {
    return {
      success: false,
      data: null,
      error: 'Skipped: PPTX/PPT/DOCX are not extracted',
      extraction_status: 'skipped',
    };
  }

  if (routedType === 'tumay') {
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      return {
        success: false,
        data: null,
        error: 'TUMAY extraction requires a PDF file',
        extraction_status: 'skipped',
      };
    }
  } else if (!isAllowedExtractorExtension(documentType, filePath)) {
    return {
      success: false,
      data: null,
      error:
        'Only PDF is supported for this extractor (TXT allowed for Fathom only)',
      extraction_status: 'skipped',
    };
  }

  // Truncate to fit model context — shorter = faster, fewer timeouts
  const MAX_CHARS = 4000;
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
    case ('tumay' as DocumentType): {
      const ok = await extractTumayFromFile(clientId, filePath);
      if (!ok) {
        return {
          success: false,
          data: null,
          error: 'TUMAY extraction failed (Ollama unavailable or invalid JSON)',
          extraction_status: 'failed',
        };
      }
      return {
        success: true,
        data: null,
        extraction_status: 'complete',
      };
    }
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
  const rows = await dbSelect<{ document_type: string; extraction_status: string }>(
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

void cleanupGhostCoachingSessions();
