import { invoke } from '@tauri-apps/api/core';
import { dbExecute, dbSelect } from './db';
import { logEntry } from './auditService';
import type {
  DiscProfile,
  You2Profile,
  FathomSession,
  DocumentType,
  ExtractionResult,
  ExtractionStatus,
} from '../types/extractions';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
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

async function callOllama(
  systemPrompt: string,
  userContent: string,
  formatSchema?: object
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minutes

  try {
    const requestBody: Record<string, unknown> = {
      model: OLLAMA_MODEL,
      prompt: `${systemPrompt}\n\nDocument text:\n${userContent}\n\nIMPORTANT: Your response must be ONLY a valid JSON object. No explanation. No preamble. No markdown. Start with { and end with }.`,
      stream: false,
      format: formatSchema ?? 'json',
      options: {
        temperature: 0,
        seed: 42,
        num_predict: 4000,
      },
    };

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.response) {
      throw new Error('Ollama returned empty response.');
    }
    return data.response;
  } catch (error) {
    clearTimeout(timeoutId);
    const isAbort = error instanceof Error && error.name === 'AbortError';
    const isAbortByName = error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'AbortError';
    if (isAbort || isAbortByName) {
      throw new Error('Ollama timeout after 4 minutes');
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
      (profile as Record<string, unknown>).adaptedScores ||
      { D: 0, I: 0, S: 0, C: 0 };

    const naturalScores = profile.natural_scores ||
      (profile as Record<string, unknown>).naturalScores ||
      { D: 0, I: 0, S: 0, C: 0 };

    const primaryLabel = profile.primary_style_label ||
      (profile as Record<string, unknown>).primaryStyleLabel ||
      (profile as Record<string, unknown>).style_label || '';

    const primaryCombo = profile.primary_style_combination ||
      (profile as Record<string, unknown>).primaryStyleCombination ||
      (profile as Record<string, unknown>).style_combination || '';

    const drivingForcesPrimary =
      profile.driving_forces_primary ||
      (profile as Record<string, unknown>).drivingForcesPrimary || [];

    const communicationDos =
      profile.communication_dos ||
      (profile as Record<string, unknown>).communicationDos || [];

    const communicationDonts =
      profile.communication_donts ||
      (profile as Record<string, unknown>).communicationDonts || [];

    const stressModerate =
      profile.stress_signals_moderate ||
      (profile as Record<string, unknown>).stressSignalsModerate || [];

    const stressExtreme =
      profile.stress_signals_extreme ||
      (profile as Record<string, unknown>).stressSignalsExtreme || [];

    const idealEnvironment =
      profile.ideal_environment ||
      (profile as Record<string, unknown>).idealEnvironment || [];

    const valueToOrg =
      profile.value_to_organization ||
      (profile as Record<string, unknown>).valueToOrganization || [];

    const areasForImprovement =
      profile.areas_for_improvement ||
      (profile as Record<string, unknown>).areasForImprovement || [];

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
          (profile as Record<string, unknown>).drivingForcesSituational || []
        ),
        JSON.stringify(
          profile.driving_forces_indifferent ||
          (profile as Record<string, unknown>).drivingForcesIndifferent || []
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), YOU2_LLM_TIMEOUT_MS);

  try {
    const requestBody: Record<string, unknown> = {
      model: OLLAMA_MODEL,
      prompt: `${systemPrompt}\n\nDocument text:\n${userContent}\n\nIMPORTANT: Your response must be ONLY a valid JSON object. No explanation. No preamble. No markdown. Start with { and end with }.`,
      stream: false,
      format: formatSchema ?? 'json',
      options: {
        temperature: 0,
        seed: 42,
        num_predict: 4000,
      },
    };

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.response) {
      throw new Error('Ollama returned empty response.');
    }
    return data.response;
  } catch (error) {
    clearTimeout(timeoutId);
    const isAbort = error instanceof Error && error.name === 'AbortError';
    const isAbortByName = error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'AbortError';
    if (isAbort || isAbortByName) {
      throw new Error('You2 extraction timeout after 2 minutes');
    }
    throw error;
  }
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
      deterministic.one_year_vision.length > 20
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
    {
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

      const rawResponse = await callOllamaYou2(systemPrompt, workingText, YOU2_FORMAT_SCHEMA);
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
