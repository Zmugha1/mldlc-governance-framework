import { invoke } from '@tauri-apps/api/core';
import { getDb, dbSelect, dbExecute } from './db';
import { processDocument } from './documentExtractionService';
import { rebuildClientProfile } from './profileBuilderService';
import {
  FOLDER_TO_BUCKET,
  type OutcomeBucket
} from './stageInferenceService';

export interface BulkImportResult {
  processed: number;
  failed: number;
  clients_created: number;
  errors: string[];
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

function normalizeClientName(folderName: string): string {
  return folderName
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function detectDocType(
  fileName: string
): 'disc' | 'you2' | 'fathom' | 'vision' | null {
  const lower = fileName.toLowerCase();
  if (lower.includes('ttsi') || lower.includes('disc')) return 'disc';
  if (lower.includes('tumay') || lower.includes('you2') ||
      lower.includes('you_2')) return 'you2';
  if (lower.includes('fathom') || lower.includes('transcript')) return 'fathom';
  if (lower.includes('vision')) return 'vision';
  return null;
}

function isYou2File(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.includes('tumay') || lower.includes('you2') ||
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
    errors: []
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
        if (r.success) result.processed++;
        else {
          result.failed++;
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

      const docType = detectDocType(file.fileName);
      if (!docType) continue;

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
          result.errors.push(`${file.fileName}: ${extracted.error ?? 'extraction failed'}`);
          continue;
        }

        const r = await processDocument(
          clientId,
          docType,
          extracted.text,
          file.fileName,
          file.filePath
        );

        if (r.success) result.processed++;
        else {
          result.failed++;
          result.errors.push(`${file.fileName}: ${r.error ?? 'extraction failed'}`);
        }
      } catch (e) {
        result.failed++;
        result.errors.push(
          `${file.fileName}: ${e instanceof Error ? e.message : 'error'}`
        );
      }
    }

    // Rebuild profile after all files for this client
    await rebuildClientProfile(clientId);
  }

  return result;
}
