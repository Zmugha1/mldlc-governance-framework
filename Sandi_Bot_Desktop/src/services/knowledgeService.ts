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

export async function uploadKnowledgeDocument(
  filePath: string,
  domain: string,
  fileName: string,
  fileSizeOverride?: number
): Promise<KnowledgeUploadResult> {
  const lower = filePath.toLowerCase();
  if (!lower.endsWith('.pdf')) {
    return { success: false, error: 'Only PDF files are supported.' };
  }

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
    fileSizeOverride ??
    new TextEncoder().encode(trimmed).length;

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

  return { success: true, document: mapRow(row) };
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
