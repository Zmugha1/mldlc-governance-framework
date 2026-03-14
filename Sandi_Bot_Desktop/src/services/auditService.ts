import { dbExecute, dbSelect } from './db';
import type { AuditEntry } from '../types';
import type { ActivityLog } from '../types';

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

/** Map action_type to ActivityLog type */
function actionTypeToActivityType(actionType: string): ActivityLog['type'] {
  const t = actionType?.toUpperCase() ?? '';
  if (t.includes('RECOMMENDATION')) return 'recommendation';
  if (t.includes('CHAT') || t.includes('SCRIPT')) return 'note';
  if (t.includes('CLIENT_ACCESSED')) return 'meeting';
  return 'note';
}

/** Convert audit entries to ActivityLog format for AdminStreamliner */
export function auditEntriesToActivityLogs(
  entries: AuditEntry[],
  clientNameMap: Record<string, string>
): ActivityLog[] {
  return entries.map((e) => ({
    id: `audit-${e.id}`,
    clientId: e.client_id ?? '',
    clientName: (e.client_id && clientNameMap[e.client_id]) || '—',
    action: e.action_type?.replace(/_/g, ' ') ?? 'Activity',
    details: e.output_data || e.reasoning || e.input_data || '',
    timestamp: e.timestamp,
    type: actionTypeToActivityType(e.action_type ?? ''),
  }));
}
