import { invoke } from '@tauri-apps/api/core';
import { getDb, dbSelect, dbExecute } from './db';
import { processDocument, getExtractionStatus } from './documentExtractionService';
import { rebuildClientProfile } from './profileBuilderService';
import {
  FOLDER_TO_BUCKET,
  type OutcomeBucket
} from './stageInferenceService';

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
  clients_created: number;
  errors: string[];
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

  // Filename-based detection first
  if (lower.includes('ttsi') ||
      lower.includes('disc') ||
      lower.includes('talent insight')) return 'disc';

  if (lower.includes('tumay')) return 'you2';

  if (lower.includes('you2') ||
      lower.includes('you 2') ||
      lower.includes('you_2')) return 'you2';

  if (lower.includes('vision')) return 'vision';

  if (lower.includes('fathom') ||
      lower.includes('transcript') ||
      lower.includes('convo') ||
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

function isYou2File(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.includes('tumay') ||
         lower.includes('you2') ||
         lower.includes('you 2') ||
         lower.includes('you_2');
}

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

export async function bulkImportFolder(
  basePath: string,
  onProgress?: (p: ImportProgress) => void
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    processed: 0,
    failed: 0,
    clients_created: 0,
    errors: [],
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
        files = await invoke<string[]>('list_directory_files', {
          path: clientPath
        });
      } catch {
        continue;
      }

      for (const file of files) {
        const ext = '.' + (file.split('.').pop()?.toLowerCase() ?? '');
        if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

        allFiles.push({
          filePath: `${clientPath}${sep}${file}`,
          fileName: file,
          clientName,
          bucket
        });
      }
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
          result.errors.push(`${file.fileName}: text extraction failed`);
        }
      }

      if (combinedText.trim().length > 50) {
        const r = await processDocument(
          clientId,
          'you2',
          combinedText.trim(),
          you2Files[0].fileName,
          you2Files[0].filePath
        );
        if (r.success) {
          result.processed++;
          clientProcessed.count++;
          clientSucceededTypes.add('you2');
        } else {
          result.failed++;
          clientFailed.count++;
          result.errors.push(`${clientName} You2: ${r.error ?? 'extraction failed'}`);
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
        const extracted = await invoke<{
          text: string;
          success: boolean;
          error?: string;
        }>('extract_text_from_any_file', {
          filePath: file.filePath
        });

        if (!extracted.success || !extracted.text) {
          result.failed++;
          clientFailed.count++;
          result.errors.push(`${file.fileName}: ${extracted.error ?? 'extraction failed'}`);
          continue;
        }

        const docType = detectDocType(
          file.fileName,
          extracted.text
        );
        if (!docType) continue;

        const r = await processDocument(
          clientId,
          docType,
          extracted.text,
          file.fileName,
          file.filePath
        );

        if (r.success) {
          result.processed++;
          clientProcessed.count++;
          clientSucceededTypes.add(docType);
        } else {
          result.failed++;
          clientFailed.count++;
          result.errors.push(`${file.fileName}: ${r.error ?? 'extraction failed'}`);
        }
      } catch (e) {
        result.failed++;
        clientFailed.count++;
        result.errors.push(
          `${file.fileName}: ${e instanceof Error ? e.message : 'error'}`
        );
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
    document_type: string;
    file_path: string;
    file_name: string;
  }>>(
    `SELECT client_id, document_type, file_path, file_name
     FROM document_extractions
     WHERE extraction_status = 'failed'`
  );

  const result: BulkImportResult = {
    processed: 0,
    failed: 0,
    clients_created: 0,
    errors: [],
    clientSummaries: []
  };

  const total = failedRows.length;
  for (let i = 0; i < failedRows.length; i++) {
    const row = failedRows[i];
    onProgress?.({
      total,
      current: i + 1,
      current_file: row.file_name,
      current_client: row.client_id
    });

    try {
      const extracted = await invoke<{
        text: string;
        success: boolean;
        error?: string;
      }>('extract_text_from_any_file', {
        filePath: row.file_path
      });

      if (!extracted.success || !extracted.text) {
        result.failed++;
        result.errors.push(`${row.file_name}: ${extracted.error ?? 'extraction failed'}`);
        continue;
      }

      const r = await processDocument(
        row.client_id,
        row.document_type as 'disc' | 'you2' | 'fathom' | 'vision',
        extracted.text,
        row.file_name,
        row.file_path
      );

      if (r.success) {
        result.processed++;
        await rebuildClientProfile(row.client_id);
      } else {
        result.failed++;
        result.errors.push(`${row.file_name}: ${r.error ?? 'extraction failed'}`);
      }
    } catch (e) {
      result.failed++;
      result.errors.push(
        `${row.file_name}: ${e instanceof Error ? e.message : 'error'}`
      );
    }
  }

  return result;
}
