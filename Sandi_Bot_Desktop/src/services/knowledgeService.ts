import { invoke } from '@tauri-apps/api/core';
import { dbExecute, dbSelect } from '@/services/db';

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  domain: string;
  doc_type: string;
  file_name: string;
  file_size: number;
  word_count: number;
  extracted: number;
  embedded: number;
  created_at: string;
}

export interface KnowledgeUploadResult {
  success: boolean;
  document?: KnowledgeDocument;
  error?: string;
  /** Shown after extraction + embedding when applicable */
  embedCompleteMessage?: string;
}

function mapRow(row: Record<string, unknown>): KnowledgeDocument {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    excerpt: String(row.excerpt ?? ''),
    domain: String(row.domain ?? ''),
    doc_type: String(row.doc_type ?? ''),
    file_name: String(row.file_name ?? ''),
    file_size: Number(row.file_size ?? 0),
    word_count: Number(row.word_count ?? 0),
    extracted: Number(row.extracted ?? 0),
    embedded: Number(row.embedded ?? 0),
    created_at: String(row.created_at ?? ''),
  };
}

async function readFileContentForUpload(filePath: string): Promise<string> {
  const isPdf = filePath.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    const extracted = await invoke<{
      text: string;
      success: boolean;
      error?: string;
    }>('extract_text_from_any_file', { filePath });
    if (!extracted.success || !extracted.text?.trim()) {
      throw new Error(extracted.error ?? 'Could not read PDF');
    }
    return extracted.text;
  }
  try {
    const text = await invoke<string>('read_file', { path: filePath });
    if (text && text.trim().length > 0) {
      return text;
    }
  } catch {
    /* fall through */
  }
  const extracted = await invoke<{
    text: string;
    success: boolean;
    error?: string;
  }>('extract_text_from_any_file', { filePath });
  if (!extracted.success || !extracted.text?.trim()) {
    throw new Error(extracted.error ?? 'Could not read file');
  }
  return extracted.text;
}

/** Last sentence-boundary end index (exclusive) within words[from..exclusiveEnd), or exclusiveEnd if none. */
function findSentenceEndExclusive(
  words: string[],
  from: number,
  exclusiveEnd: number
): number {
  for (let j = exclusiveEnd - 1; j > from; j--) {
    if (/[.!?]["']?$/.test(words[j])) {
      return j + 1;
    }
  }
  return exclusiveEnd;
}

/**
 * Split text into overlapping word chunks, respecting sentence boundaries where possible.
 * Each chunk has at most `chunkSize` words; consecutive chunks overlap by `overlap` words.
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    let end = Math.min(start + chunkSize, words.length);
    if (end < words.length) {
      const sentEnd = findSentenceEndExclusive(words, start, end);
      if (sentEnd > start) {
        end = sentEnd;
      }
    }
    const piece = words.slice(start, end).join(' ').trim();
    if (piece) chunks.push(piece);

    if (end >= words.length) break;
    const nextStart = Math.max(start + 1, end - overlap);
    start = nextStart;
  }

  return chunks;
}

/**
 * Extract coach profile fields from resume text via Ollama, compute years from
 * earliest work date range, and upsert `coach_profile` id `coach`.
 */
export async function upsertCoachProfileFromResumeText(
  resumeText: string,
  resumeFileName: string
): Promise<void> {
  const prompt = `
Extract the following from this resume
and return as JSON only. No other text.

{
  "bio": "2-3 sentence professional bio
    in third person based on their
    experience and expertise",
  "earliest_work_year": the earliest
    year found in any work experience
    date range as a 4 digit number,
  "certifications": "comma separated
    list of certifications credentials
    and training programs mentioned",
  "key_expertise": "comma separated
    list of top 5 expertise areas
    based on their experience"
}

Look for date patterns like:
  2001 - Present
  January 2001 to Present
  2001-2024
  Jan 2001 - Dec 2005
Find the EARLIEST year across all
work experience entries.
Return it as earliest_work_year
as a plain number like 2001.

If no dates found return 2000
as a safe default.

Return ONLY valid JSON.
No explanation. No markdown.
Just the JSON object.

Resume content:
${resumeText}
`;

  const raw = await invoke<string>('ollama_generate', {
    prompt,
    system:
      'You extract structured information from resumes. Return only valid JSON.',
    model: 'qwen2.5:7b',
  });

  const clean = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(clean) as Record<string, unknown>;
  } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) {
      throw new Error('Could not parse resume extraction JSON');
    }
    parsed = JSON.parse(m[0]) as Record<string, unknown>;
  }

  const currentYear = new Date().getFullYear();
  const eyRaw = parsed.earliest_work_year;
  const earliest =
    typeof eyRaw === 'number' && !Number.isNaN(eyRaw)
      ? Math.floor(eyRaw)
      : parseInt(String(eyRaw ?? ''), 10) || 2000;
  const yearsExperience = Math.max(0, currentYear - earliest);

  const bio = String(parsed.bio ?? '').trim();
  let certifications = String(parsed.certifications ?? '').trim();
  const keyExpertise = String(parsed.key_expertise ?? '').trim();
  if (!certifications && keyExpertise) certifications = keyExpertise;

  await dbExecute(
    `INSERT INTO coach_profile
      (id, bio, resume_text, resume_file_name, years_experience, certifications, updated_at)
     VALUES ('coach', ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       bio = excluded.bio,
       resume_text = excluded.resume_text,
       resume_file_name = excluded.resume_file_name,
       years_experience = excluded.years_experience,
       certifications = excluded.certifications,
       updated_at = excluded.updated_at`,
    [bio, resumeText.trim(), resumeFileName, yearsExperience, certifications]
  );
}

function parseEmbeddingFromDb(raw: string | null | undefined): number[] {
  if (raw == null || raw === '') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((x) => Number(x));
    }
  } catch {
    /* fall through */
  }
  return [];
}

async function invokeOllamaEmbed(text: string): Promise<number[]> {
  return invoke<number[]>('ollama_embed', {
    text,
    model: 'nomic-embed-text',
  });
}

export async function embedKnowledgeDocument(documentId: string): Promise<boolean> {
  const rows = await dbSelect<{ content: string | null }>(
    `SELECT content FROM knowledge_documents WHERE id = ?`,
    [documentId]
  );
  const content = (rows[0]?.content ?? '').trim();
  if (!content) {
    return false;
  }

  const chunks = chunkText(content);
  if (chunks.length === 0) {
    return false;
  }

  await dbExecute(`DELETE FROM knowledge_embeddings WHERE document_id = ?`, [
    documentId,
  ]);

  let chunkIndex = 0;
  for (const chunk of chunks) {
    const embedding = await invokeOllamaEmbed(chunk);
    const id = crypto.randomUUID();
    await dbExecute(
      `INSERT INTO knowledge_embeddings
        (id, document_id, chunk_text, chunk_index, embedding, model_used, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        documentId,
        chunk,
        chunkIndex,
        JSON.stringify(embedding),
        'nomic-embed-text',
      ]
    );
    chunkIndex += 1;
  }

  await dbExecute(
    `UPDATE knowledge_documents
     SET embedded = 1,
         updated_at = datetime('now')
     WHERE id = ?`,
    [documentId]
  );

  return true;
}

export async function embedAllPending(): Promise<number> {
  const pending = await dbSelect<{ id: string }>(
    `SELECT id FROM knowledge_documents
     WHERE embedded = 0 AND extracted = 1`,
    []
  );
  let okCount = 0;
  for (const row of pending) {
    const ok = await embedKnowledgeDocument(row.id);
    if (ok) okCount += 1;
  }
  return okCount;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function searchKnowledge(
  query: string,
  limit: number = 5
): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];

  const queryEmbedding = await invokeOllamaEmbed(q);

  const rows = await dbSelect<{
    chunk_text: string;
    embedding: string | null;
  }>(
    `SELECT ke.chunk_text, ke.embedding
     FROM knowledge_embeddings ke
     JOIN knowledge_documents kd ON ke.document_id = kd.id`,
    []
  );

  const scored: { text: string; score: number }[] = [];
  for (const row of rows) {
    const emb = parseEmbeddingFromDb(row.embedding);
    if (emb.length === 0) continue;
    const score = cosineSimilarity(queryEmbedding, emb);
    scored.push({ text: row.chunk_text, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.text);
}

export async function uploadKnowledgeDocument(
  filePath: string,
  domain: string,
  fileName: string,
  fileSizeOverride?: number,
  onProgress?: (message: string) => void
): Promise<KnowledgeUploadResult> {
  const lower = filePath.toLowerCase();
  if (!lower.endsWith('.pdf')) {
    return { success: false, error: 'Only PDF files are supported.' };
  }

  onProgress?.('⟳ Extracting text...');

  let fileContent: string;
  try {
    fileContent = await readFileContentForUpload(filePath);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const prompt = `
Extract all text content from
this document. Return the complete
text as plain text. No formatting.
No JSON. Just the raw text content.
Document: ${fileContent}
`;

  let extractedText: string;
  try {
    extractedText = await invoke<string>('ollama_generate', {
      prompt,
      system:
        'You are a document text extractor. Extract and return only the plain text content of documents.',
      model: 'qwen2.5:7b',
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const trimmed = extractedText.trim();
  if (!trimmed) {
    return { success: false, error: 'Extraction returned no text.' };
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const excerpt = trimmed.substring(0, 200).trim();
  const id = crypto.randomUUID();
  const baseTitle = fileName.replace(/\.[^/.]+$/, '') || fileName;
  const fileSize =
    fileSizeOverride ?? new TextEncoder().encode(trimmed).length;

  const createdAt = new Date().toISOString();

  await dbExecute(
    `INSERT INTO knowledge_documents
      (id, title, content, excerpt, domain, doc_type, file_name, file_size, word_count, extracted, embedded, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      baseTitle,
      trimmed,
      excerpt,
      domain,
      'pdf',
      fileName,
      fileSize,
      wordCount,
      1,
      0,
      createdAt,
    ]
  );

  const rows = await dbSelect<Record<string, unknown>>(
    `SELECT * FROM knowledge_documents WHERE id = ?`,
    [id]
  );
  const row = rows[0];
  if (!row) {
    return { success: false, error: 'Document was not saved.' };
  }

  onProgress?.('⟳ Building knowledge base embeddings...');

  let embedOk = false;
  let chunkCount = 0;
  try {
    embedOk = await embedKnowledgeDocument(id);
    const cntRows = await dbSelect<{ c: number }>(
      `SELECT COUNT(*) as c FROM knowledge_embeddings WHERE document_id = ?`,
      [id]
    );
    chunkCount = Number(cntRows[0]?.c ?? 0);
  } catch (e) {
    const docRows = await dbSelect<Record<string, unknown>>(
      `SELECT * FROM knowledge_documents WHERE id = ?`,
      [id]
    );
    const docRow = docRows[0] ?? row;
    return {
      success: true,
      document: mapRow(docRow),
      embedCompleteMessage: `✅ Text saved — embedding failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const docRows = await dbSelect<Record<string, unknown>>(
    `SELECT * FROM knowledge_documents WHERE id = ?`,
    [id]
  );
  const docRow = docRows[0] ?? row;

  const embedCompleteMessage = embedOk
    ? `✅ Ready — ${chunkCount} chunks embedded`
    : '✅ Text saved — no chunks embedded.';

  return {
    success: true,
    document: mapRow(docRow),
    embedCompleteMessage,
  };
}

export async function getDocumentsByDomain(
  domain: string
): Promise<KnowledgeDocument[]> {
  const rows = await dbSelect<Record<string, unknown>>(
    `SELECT * FROM knowledge_documents
     WHERE domain = ?
     ORDER BY datetime(created_at) DESC`,
    [domain]
  );
  return rows.map(mapRow);
}

export async function getAllDocuments(): Promise<KnowledgeDocument[]> {
  const rows = await dbSelect<Record<string, unknown>>(
    `SELECT * FROM knowledge_documents
     ORDER BY datetime(created_at) DESC
     LIMIT 50`,
    []
  );
  return rows.map(mapRow);
}

export async function deleteDocument(id: string): Promise<void> {
  await dbExecute(`DELETE FROM knowledge_documents WHERE id = ?`, [id]);
}

export async function getDomainCounts(): Promise<Record<string, number>> {
  const rows = await dbSelect<{ domain: string; count: number }>(
    `SELECT domain, COUNT(*) as count
     FROM knowledge_documents
     GROUP BY domain`,
    []
  );
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.domain] = Number(r.count);
  }
  return out;
}

export async function getDomainWordTotals(): Promise<Record<string, number>> {
  const rows = await dbSelect<{ domain: string; w: number }>(
    `SELECT domain, COALESCE(SUM(word_count), 0) as w
     FROM knowledge_documents
     GROUP BY domain`,
    []
  );
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.domain] = Number(r.w);
  }
  return out;
}
