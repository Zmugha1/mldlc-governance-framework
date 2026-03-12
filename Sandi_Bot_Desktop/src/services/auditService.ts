import { dbExecute, dbSelect } from './db';
import type { AuditEntry } from '../types';

export async function logEntry(
  actionType: string,
  clientId: string | null,
  inputData: string | null,
  outputData: string | null,
  reasoning: string | null,
  modelUsed: string = 'deterministic'
): Promise<void> {
  await dbExecute(
    `INSERT INTO audit_log 
     (action_type, client_id, input_data, output_data, 
      reasoning, model_used)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actionType, clientId, inputData, outputData, reasoning, modelUsed]
  );
}

export async function getAuditLog(
  limit: number = 100
): Promise<AuditEntry[]> {
  return dbSelect<AuditEntry>(
    `SELECT * FROM audit_log 
     ORDER BY timestamp DESC 
     LIMIT $1`,
    [limit]
  );
}

export async function getClientAuditLog(
  clientId: string
): Promise<AuditEntry[]> {
  return dbSelect<AuditEntry>(
    `SELECT * FROM audit_log 
     WHERE client_id = $1 
     ORDER BY timestamp DESC`,
    [clientId]
  );
}
