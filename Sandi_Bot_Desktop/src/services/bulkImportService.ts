import { invoke } from '@tauri-apps/api/core';
import { dbSelect, dbExecute } from './db';
import { processDocument, getExtractionStatus } from './documentExtractionService';
import { rebuildClientProfile } from './profileBuilderService';
import {
  FOLDER_TO_BUCKET,
  type OutcomeBucket
} from './stageInferenceService';
const EXTRACTION_TIMEOUT = 240000; // 4 minutes per file

async function extractWithTimeout<T>(
  extractFn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    extractFn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Extraction timeout after ${timeoutMs / 60000} minutes`)),
        timeoutMs
      )
    )
  ]);
}

export interface FailedFile {
  clientName: string;
  fileName: string;
  error: string;
}

export interface ClientImportSummary {
  clientName: string;
  clientId: string;
  bucket: string;
  processed: number;
  failed: number;
  succeededTypes: string[];
  missingDisc: boolean;
  missingYou2: boolean;
  missingFathom: boolean;
}

export interface BulkImportResult {
  processed: number;
  failed: number;
  skipped: number;
  clients_created: number;
  errors: string[];
  failedFiles: FailedFile[];
  clientSummaries: ClientImportSummary[];
}

export interface ImportProgress {
  total: number;
  current: number;
  current_file: string;
  current_client: string;
}

// Sandi's actual folder names
const BUCKET_FOLDERS = ['Active', 'Paused', 'WIN', 'Various'];

const SUPPORTED_EXTENSIONS = [
  '.pdf', '.docx', '.pptx', '.txt', '.xlsx', '.csv'
];

function normalizeClientName(
  nameOrFolder: string
): string {
  // Remove file extension if present
  const withoutExt = nameOrFolder
    .replace(/\.[^/.]+$/, '');

  // Extract part before " - " or " – " or "_-_"
  const beforeDash = withoutExt
    .split(/ - | – |_-_/)[0];

  // Replace underscores with spaces
  const withSpaces = beforeDash
    .replace(/_/g, ' ')
    .trim();

  // Title case each word
  return withSpaces
    .split(' ')
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase() +
               w.slice(1).toLowerCase())
    .join(' ');
}

function detectDocType(
  fileName: string,
  extractedText?: string
): 'disc' | 'you2' | 'fathom' | 'vision' | null {
  const lower = fileName.toLowerCase();

  // Filename-based detection first — all case-insensitive
  // DISC: ttsi, tti-success-insights (Nathan Stiers), talent insight
  if (lower.includes('ttsi') ||
      lower.includes('tti-success-insights') ||
      lower.includes('disc') ||
      lower.includes('talent insight')) return 'disc';

  // You2: tumay, you2, you2.0 (Andrew Tait), you 2, you_2
  if (lower.includes('tumay')) return 'you2';
  if (lower.includes('you2') ||
      lower.includes('you2.0') ||
      lower.includes('you 2') ||
      lower.includes('you_2')) return 'you2';

  // Vision: vision statement, vision stmt (Nathan Stiers)
  if (lower.includes('vision')) return 'vision';

  // Fathom/Convo: Convo.pdf, convo.pdf, ConvC5.pdf (Stan Stabner), conversation
  if (lower.includes('fathom') ||
      lower.includes('transcript') ||
      lower.includes('convo') ||
      lower.includes('convc5') ||
      lower.includes('conversation') ||
      lower.includes('conv') ||
      lower.includes('session') ||
      lower.includes('call') ||
      lower.includes('recording')) return 'fathom';

  // Content-based detection fallback
  // Used when filename gives no clues
  if (extractedText) {
    const text = extractedText.substring(0, 1000).toLowerCase();

    if (text.includes('tti talent insights') ||
        text.includes('tti success insights') ||
        text.includes('behavioral style') ||
        text.includes('driving forces') ||
        text.includes('adapted style')) return 'disc';

    if (text.includes('tell us more about you') ||
        text.includes('tumay') ||
        text.includes('question 1 - your contact') ||
        text.includes('best phone')) return 'you2';

    if (text.includes('if we looked at your life') ||
        text.includes('you 2.0') ||
        text.includes('top 3 dangers') ||
        text.includes('top 3 strengths')) return 'you2';

    if (text.includes('transcript') ||
        text.includes('recording') ||
        text.includes('speaker') ||
        text.includes('fathom') ||
        text.includes('[00:') ||
        text.includes('minutes')) return 'fathom';

    if (text.includes('vision statement') ||
        text.includes('my vision') ||
        text.includes('in 5 years')) return 'vision';
  }

  return null;
}

const isYou2File = (name: string): boolean => {
  const n = name.toLowerCase();
  return (n.includes('you') && (n.includes('2') || n.includes('two'))) ||
    n.includes('you2') ||
    n.includes('you 2') ||
    n.includes('you2.0') ||
    n.includes('tumay') ||
    n.includes('you_2');
};

async function findOrCreateClient(
  clientName: string,
  bucket: OutcomeBucket
): Promise<{ id: string; created: boolean }> {
  const existing = await dbSelect<Array<{ id: string }>>(
    `SELECT id FROM clients
     WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))`,
    [clientName]
  );

  if (existing.length > 0) {
    return { id: existing[0].id, created: false };
  }

  const newId = crypto.randomUUID();
  await dbExecute(
    `INSERT INTO clients
     (id, name, stage, outcome_bucket, inferred_stage,
      stage_confirmed, readiness_score, recommendation,
      pink_flags, created_at, updated_at)
     VALUES ($1, $2, 'Initial Contact', $3, 'IC',
     0, 0, 'NURTURE: Awaiting documents',
     '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [newId, clientName, bucket]
  );

  return { id: newId, created: true };
}

/** Skip only when profile data actually exists — not just extraction records. */
async function hasYou2Profile(clientId: string): Promise<boolean> {
  const rows = await dbSelect<Array<{ count: number }>>(
    `SELECT COUNT(*) as count FROM client_you2_profiles WHERE client_id = $1`,
    [clientId]
  );
  return (rows[0]?.count ?? 0) > 0;
}

async function hasDiscProfile(clientId: string): Promise<boolean> {
  const rows = await dbSelect<Array<{ count: number }>>(
    `SELECT COUNT(*) as count FROM client_disc_profiles WHERE client_id = $1`,
    [clientId]
  );
  return (rows[0]?.count ?? 0) > 0;
}

async function hasFathomSession(clientId: string): Promise<boolean> {
  const rows = await dbSelect<Array<{ count: number }>>(
    `SELECT COUNT(*) as count FROM coaching_sessions WHERE client_id = $1`,
    [clientId]
  );
  return (rows[0]?.count ?? 0) > 0;
}

/** Vision has no profile table — check extraction record. */
async function hasVisionComplete(clientId: string): Promise<boolean> {
  const rows = await dbSelect<Array<{ extraction_status: string }>>(
    `SELECT extraction_status FROM document_extractions
     WHERE client_id = $1 AND document_type = 'vision' AND extraction_status = 'complete'`,
    [clientId]
  );
  return rows.length > 0;
}

export async function bulkImportFolder(
  basePath: string,
  onProgress?: (p: ImportProgress) => void
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    clients_created: 0,
    errors: [],
    failedFiles: [],
    clientSummaries: []
  };

  type FileEntry = {
    filePath: string;
    fileName: string;
    clientName: string;
    bucket: OutcomeBucket;
  };

  const allFiles: FileEntry[] = [];
  const base = basePath.replace(/[/\\]+$/, '');
  const sep = basePath.includes('\\') ? '\\' : '/';

  for (const bucketFolder of BUCKET_FOLDERS) {
    const bucket = FOLDER_TO_BUCKET[bucketFolder];
    if (!bucket) continue;
    const bucketPath = `${base}${sep}${bucketFolder}`;

    let clientFolders: string[] = [];
    try {
      clientFolders = await invoke<string[]>('list_directory_files', {
        path: bucketPath
      });
    } catch {
      continue; // Folder may not exist
    }

    for (const clientFolder of clientFolders) {
      const clientPath = `${bucketPath}${sep}${clientFolder}`;
      const clientName = normalizeClientName(clientFolder);

      let files: string[] = [];
      try {
        console.log('[YOU2 PATH CHECK]', 'clientName:', clientName, 'path:', clientPath);
        files = await invoke<string[]>('list_directory_files', {
          path: clientPath
        });
        console.log('[YOU2 FILES RETURNED]', 'clientName:', clientName, 'files:', JSON.stringify(files));
      } catch {
        continue;
      }

      console.log('[RAW FILES] Client:', clientName, 'Raw files before filter:', files.join(', '));

      const filteredFiles: string[] = [];
      for (const file of files) {
        const ext = '.' + (file.split('.').pop()?.toLowerCase() ?? '');
        if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;
        filteredFiles.push(file);

        allFiles.push({
          filePath: `${clientPath}${sep}${file}`,
          fileName: file,
          clientName,
          bucket
        });
      }
      console.log('[FILTERED FILES] Client:', clientName, 'Files after filter:', filteredFiles.join(', '));
    }
  }

  // Group by client
  const byClient = new Map<string, FileEntry[]>();
  for (const f of allFiles) {
    if (!byClient.has(f.clientName)) byClient.set(f.clientName, []);
    byClient.get(f.clientName)!.push(f);
  }

  const total = allFiles.length;
  let current = 0;

  for (const [clientName, files] of byClient) {
    const { id: clientId, created } = await findOrCreateClient(
      clientName, files[0].bucket
    );
    if (created) result.clients_created++;

    const clientProcessed = { count: 0 };
    const clientFailed = { count: 0 };
    const clientSucceededTypes = new Set<string>();

    // Separate You2/TUMAY files for concatenation
    const you2Files = files.filter(f => isYou2File(f.fileName));
    const otherFiles = files.filter(f => !isYou2File(f.fileName));

    // Process You2 + TUMAY as combined extraction
    if (you2Files.length > 0) {
      let combinedText = '';
      for (const file of you2Files) {
        onProgress?.({
          total,
          current: ++current,
          current_file: file.fileName,
          current_client: clientName
        });
        try {
          const extracted = await invoke<{
            text: string;
            success: boolean;
            error?: string;
          }>('extract_text_from_any_file', {
            filePath: file.filePath
          });
          if (extracted.success && extracted.text) {
            combinedText += '\n\n' + extracted.text;
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : 'text extraction failed';
          result.failedFiles.push({ clientName, fileName: file.fileName, error: errMsg });
          result.failed++;
          clientFailed.count++;
          result.errors.push(`${clientName} — ${file.fileName}: ${errMsg}`);
        }
      }

      if (combinedText.trim().length > 50) {
        if (you2Files.some((f) => f.fileName.toLowerCase().includes('tumay'))) {
          result.skipped++;
        } else {
        const hasProfile = await hasYou2Profile(clientId);
        console.log('[YOU2 SKIP]', 'clientName:', clientName, 'hasYou2Profile:', hasProfile, 'skipping:', hasProfile);
        if (hasProfile) {
          result.skipped++;
        } else {
        try {
          const r = await extractWithTimeout(
            () => processDocument(
              clientId,
              'you2',
              combinedText.trim(),
              you2Files[0].fileName,
              you2Files[0].filePath
            ),
            EXTRACTION_TIMEOUT
          );
          if (r.success) {
            result.processed++;
            clientProcessed.count++;
            clientSucceededTypes.add('you2');
          } else {
            result.failed++;
            clientFailed.count++;
            const errMsg = r.error ?? 'extraction failed';
            result.failedFiles.push({ clientName, fileName: you2Files[0].fileName, error: errMsg });
            result.errors.push(`${clientName} — ${you2Files[0].fileName}: ${errMsg}`);
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : 'Unknown error';
          result.failed++;
          clientFailed.count++;
          result.failedFiles.push({ clientName, fileName: you2Files[0].fileName, error: errMsg });
          result.errors.push(`${clientName} — ${you2Files[0].fileName}: ${errMsg}`);
          console.error(`Failed to process ${you2Files[0].fileName}:`, e);
        }
        }
        }
      }
    }

    // Process all other files
    for (const file of otherFiles) {
      onProgress?.({
        total,
        current: ++current,
        current_file: file.fileName,
        current_client: clientName
      });

      try {
        if (file.fileName.toLowerCase().includes('tumay')) {
          result.skipped++;
          continue;
        }

        let extracted: { text: string; success: boolean; error?: string };
        try {
          extracted = await invoke<{
            text: string;
            success: boolean;
            error?: string;
          }>('extract_text_from_any_file', {
            filePath: file.filePath
          });
        } catch (e) {
          extracted = {
            text: '',
            success: false,
            error: e instanceof Error ? e.message : String(e)
          };
        }

        const docType = detectDocType(
          file.fileName,
          extracted.text
        );
        console.log('[YOU2 DETECT]', 'file:', file.fileName, 'type:', docType ?? 'NO MATCH');
        if (!docType) {
          if (!extracted.success || !extracted.text) {
            const errMsg = extracted.error ?? 'extraction failed';
            result.failed++;
            clientFailed.count++;
            result.failedFiles.push({ clientName, fileName: file.fileName, error: errMsg });
            result.errors.push(`${clientName} — ${file.fileName}: ${errMsg}`);
          }
          continue;
        }

        // Skip only when profile/session data actually exists
        const hasProfile = docType === 'you2' ? await hasYou2Profile(clientId)
          : docType === 'disc' ? await hasDiscProfile(clientId)
          : docType === 'fathom' ? await hasFathomSession(clientId)
          : await hasVisionComplete(clientId);
        if (hasProfile) {
          result.skipped++;
          continue;
        }

        // For DISC PDFs: try processDocument even when extract_text failed (image-based PDFs use OCR)
        const isDiscPdf = docType === 'disc' && file.filePath.toLowerCase().endsWith('.pdf');
        const textToUse = (extracted.success && extracted.text)
          ? extracted.text
          : (isDiscPdf ? '' : extracted.text);
        if (!extracted.success && !isDiscPdf) {
          const errMsg = extracted.error ?? 'extraction failed';
          result.failed++;
          clientFailed.count++;
          result.failedFiles.push({ clientName, fileName: file.fileName, error: errMsg });
          result.errors.push(`${clientName} — ${file.fileName}: ${errMsg}`);
          continue;
        }

        const r = await extractWithTimeout(
          () => processDocument(
            clientId,
            docType,
            textToUse,
            file.fileName,
            file.filePath
          ),
          EXTRACTION_TIMEOUT
        );

        if (r.success) {
          result.processed++;
          clientProcessed.count++;
          clientSucceededTypes.add(docType);
        } else {
          const errMsg = r.error ?? 'extraction failed';
          result.failed++;
          clientFailed.count++;
          result.failedFiles.push({ clientName, fileName: file.fileName, error: errMsg });
          result.errors.push(`${clientName} — ${file.fileName}: ${errMsg}`);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        result.failed++;
        clientFailed.count++;
        result.failedFiles.push({ clientName, fileName: file.fileName, error: errMsg });
        result.errors.push(`${clientName} — ${file.fileName}: ${errMsg}`);
        console.error(`Failed to process ${file.fileName}:`, e);
      }
    }

    // Rebuild profile after all files for this client
    await rebuildClientProfile(clientId);

    // Get extraction status for completeness flags
    const status = await getExtractionStatus(clientId);
    const bucketLabel = files[0].bucket === 'active' ? 'Active' :
      files[0].bucket === 'converted' ? 'WIN' :
      files[0].bucket === 'paused' ? 'Paused' : 'Various';

    result.clientSummaries.push({
      clientName,
      clientId,
      bucket: bucketLabel,
      processed: clientProcessed.count,
      failed: clientFailed.count,
      succeededTypes: Array.from(clientSucceededTypes),
      missingDisc: status.disc !== 'complete',
      missingYou2: status.you2 !== 'complete',
      missingFathom: status.fathom !== 'complete',
    });
  }

  return result;
}

export async function bulkImportRetryFailed(
  onProgress?: (p: ImportProgress) => void
): Promise<BulkImportResult> {
  const failedRows = await dbSelect<Array<{
    client_id: string;
    client_name: string;
    document_type: string;
    file_path: string;
    file_name: string;
  }>>(
    `SELECT e.client_id, c.name as client_name, e.document_type, e.file_path, e.file_name
     FROM document_extractions e
     LEFT JOIN clients c ON c.id = e.client_id
     WHERE e.extraction_status = 'failed'`
  );

  const result: BulkImportResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    clients_created: 0,
    errors: [],
    failedFiles: [],
    clientSummaries: []
  };

  const total = failedRows.length;
  for (let i = 0; i < failedRows.length; i++) {
    const row = failedRows[i];
    const clientName = row.client_name ?? row.client_id;
    onProgress?.({
      total,
      current: i + 1,
      current_file: row.file_name,
      current_client: clientName
    });

    if (row.file_name.toLowerCase().includes('tumay')) {
      result.skipped++;
      continue;
    }

    try {
      let extracted: { text: string; success: boolean; error?: string };
      try {
        extracted = await invoke<{
          text: string;
          success: boolean;
          error?: string;
        }>('extract_text_from_any_file', {
          filePath: row.file_path
        });
      } catch (e) {
        extracted = {
          text: '',
          success: false,
          error: e instanceof Error ? e.message : String(e)
        };
      }

      const isDiscPdf = row.document_type === 'disc' && row.file_path.toLowerCase().endsWith('.pdf');
      const textToUse = (extracted.success && extracted.text) ? extracted.text : (isDiscPdf ? '' : extracted.text);
      if (!extracted.success && !isDiscPdf) {
        const errMsg = extracted.error ?? 'extraction failed';
        result.failed++;
        result.failedFiles.push({ clientName, fileName: row.file_name, error: errMsg });
        result.errors.push(`${clientName} — ${row.file_name}: ${errMsg}`);
        continue;
      }

      const r = await extractWithTimeout(
        () => processDocument(
          row.client_id,
          row.document_type as 'disc' | 'you2' | 'fathom' | 'vision',
          textToUse,
          row.file_name,
          row.file_path
        ),
        EXTRACTION_TIMEOUT
      );

      if (r.success) {
        result.processed++;
        await rebuildClientProfile(row.client_id);
      } else {
        const errMsg = r.error ?? 'extraction failed';
        result.failed++;
        result.failedFiles.push({ clientName, fileName: row.file_name, error: errMsg });
        result.errors.push(`${clientName} — ${row.file_name}: ${errMsg}`);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      result.failed++;
      result.failedFiles.push({ clientName, fileName: row.file_name, error: errMsg });
      result.errors.push(`${clientName} — ${row.file_name}: ${errMsg}`);
      console.error(`Failed to process ${row.file_name}:`, e);
    }
  }

  return result;
}
