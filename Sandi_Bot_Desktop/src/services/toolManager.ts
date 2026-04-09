import { getDb } from '@/services/db';

export interface ToolCapability {
  id: string;
  name: string;
  description: string;
  requiredParams: string[];
  optionalParams?: string[];
  returnsType:
    | 'email'
    | 'event'
    | 'document'
    | 'session'
    | 'contact'
    | 'custom';
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolSetting {
  key: string;
  label: string;
  type: 'text' | 'boolean' | 'select';
  defaultValue: unknown;
  options?: string[];
}

export interface CoachBotTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  authType: 'oauth2' | 'apikey' | 'webhook' | 'none';
  capabilities: ToolCapability[];
  settings: ToolSetting[];

  isConnected(): Promise<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(
    capabilityId: string,
    params: Record<string, unknown>
  ): Promise<ToolResult>;
  getSettings(): Promise<Record<string, unknown>>;
  updateSettings(settings: Record<string, unknown>): Promise<void>;
}

export interface ToolConnection {
  tool_id: string;
  display_name: string;
  connected_email: string;
  is_connected: boolean;
  connected_at: string;
  last_sync_at: string;
}

function tokenExpiresAtIsPast(expiresAt: string | null | undefined): boolean {
  if (expiresAt == null || String(expiresAt).trim() === '') {
    return false;
  }
  const t = Date.parse(String(expiresAt));
  if (Number.isNaN(t)) {
    return false;
  }
  return t < Date.now();
}

class ToolManagerClass {
  private tools: Map<string, CoachBotTool> = new Map();

  registerTool(tool: CoachBotTool): void {
    this.tools.set(tool.id, tool);
  }

  getTool(toolId: string): CoachBotTool | undefined {
    return this.tools.get(toolId);
  }

  getAllTools(): CoachBotTool[] {
    return Array.from(this.tools.values());
  }

  async getConnectedTools(): Promise<CoachBotTool[]> {
    const all = this.getAllTools();
    const out: CoachBotTool[] = [];
    for (const t of all) {
      if (await t.isConnected()) {
        out.push(t);
      }
    }
    return out;
  }

  async execute(
    toolId: string,
    capabilityId: string,
    params: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolId}`,
      };
    }
    const connected = await tool.isConnected();
    if (!connected) {
      return {
        success: false,
        error:
          'Tool not connected. Connect in The Capture.',
      };
    }
    if (
      toolId === 'gmail' ||
      toolId === 'gcal' ||
      toolId === 'google-calendar'
    ) {
      const { logPrivacyAudit } = await import('./googleAuthService');
      await logPrivacyAudit('read', toolId, capabilityId);
    }

    let result: ToolResult;
    try {
      result = await tool.execute(capabilityId, params);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result = { success: false, error: msg };
    }

    await logToolCall(
      toolId,
      capabilityId,
      result.success,
      result.error
    );

    if (result.success) {
      await this.updateLastSync(toolId);
    }

    return result;
  }

  async getToolConnections(): Promise<ToolConnection[]> {
    const db = await getDb();
    const rows = (await db.select(
      `SELECT tool_id, display_name, connected_email, is_connected,
              connected_at, last_sync_at
       FROM tool_connections
       ORDER BY connected_at DESC`
    )) as Array<{
      tool_id: string;
      display_name: string | null;
      connected_email: string | null;
      is_connected: number | null;
      connected_at: string | null;
      last_sync_at: string | null;
    }>;
    return rows.map((r) => ({
      tool_id: r.tool_id,
      display_name: r.display_name ?? '',
      connected_email: r.connected_email ?? '',
      is_connected: Number(r.is_connected ?? 0) === 1,
      connected_at: r.connected_at ?? '',
      last_sync_at: r.last_sync_at ?? '',
    }));
  }

  async saveConnection(
    toolId: string,
    authToken: string,
    refreshToken: string,
    tokenExpiresAt: string,
    connectedEmail: string
  ): Promise<void> {
    const tool = this.tools.get(toolId);
    const displayName = tool?.name ?? toolId;
    const id = crypto.randomUUID();
    const db = await getDb();
    await db.execute(
      `INSERT INTO tool_connections
        (id, tool_id, display_name, connected_email, auth_token,
         refresh_token, token_expires_at, is_connected, connected_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
       ON CONFLICT(tool_id) DO UPDATE SET
         auth_token = excluded.auth_token,
         refresh_token = excluded.refresh_token,
         token_expires_at = excluded.token_expires_at,
         connected_email = excluded.connected_email,
         is_connected = 1,
         connected_at = datetime('now')`,
      [
        id,
        toolId,
        displayName,
        connectedEmail,
        authToken,
        refreshToken,
        tokenExpiresAt,
      ]
    );
  }

  async getAuthToken(
    toolId: string,
    allowRefresh = true
  ): Promise<string | null> {
    const db = await getDb();
    const rows = (await db.select(
      `SELECT auth_token, refresh_token, token_expires_at
       FROM tool_connections
       WHERE tool_id = ? AND is_connected = 1`,
      [toolId]
    )) as Array<{
      auth_token: string | null;
      refresh_token: string | null;
      token_expires_at: string | null;
    }>;
    const row = rows[0];
    if (!row) {
      return null;
    }
    if (
      allowRefresh &&
      tokenExpiresAtIsPast(row.token_expires_at)
    ) {
      await this.refreshToken(toolId);
      return this.getAuthToken(toolId, false);
    }
    return row.auth_token ?? null;
  }

  async refreshToken(toolId: string): Promise<string | null> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return null;
    }
    await tool.connect();
    const db = await getDb();
    const rows = (await db.select(
      `SELECT auth_token FROM tool_connections WHERE tool_id = ?`,
      [toolId]
    )) as Array<{ auth_token: string | null }>;
    return rows[0]?.auth_token ?? null;
  }

  async disconnectTool(toolId: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      `UPDATE tool_connections
       SET is_connected = 0,
           auth_token = NULL,
           refresh_token = NULL
       WHERE tool_id = ?`,
      [toolId]
    );
    const tool = this.tools.get(toolId);
    if (tool) {
      await tool.disconnect();
    }
  }

  async updateLastSync(toolId: string): Promise<void> {
    const db = await getDb();
    await db.execute(
      `UPDATE tool_connections
       SET last_sync_at = datetime('now')
       WHERE tool_id = ?`,
      [toolId]
    );
  }
}

export const ToolManager = new ToolManagerClass();

/** Attempt network-backed tools; individual calls fail gracefully when offline. */
export async function isOnline(): Promise<boolean> {
  return true;
}

export async function withOfflineFallback<T>(
  toolId: string,
  capabilityId: string,
  params: Record<string, unknown>,
  fallback: T
): Promise<T> {
  try {
    const online = await isOnline();
    if (!online) {
      console.log('Offline — skipping tool call:', toolId);
      return fallback;
    }
    const result = await ToolManager.execute(toolId, capabilityId, params);
    if (result.success) {
      return result.data as T;
    }
    return fallback;
  } catch (error) {
    console.log('Tool error — returning fallback:', error);
    return fallback;
  }
}

export async function logToolCall(
  toolId: string,
  capabilityId: string,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    const db = await getDb();
    const details = JSON.stringify({
      success,
      error: error ?? null,
      timestamp: new Date().toISOString(),
      toolId,
      capabilityId,
    });
    await db.execute(
      `INSERT INTO audit_log
        (action_type, client_id, input_data, output_data, reasoning, model_used)
       VALUES (?, NULL, ?, NULL, NULL, ?)`,
      ['tool_call', details, 'tool_manager']
    );
  } catch (e) {
    console.warn('logToolCall failed', e);
  }
}

export function getOfflineMessage(toolId: string): string {
  switch (toolId) {
    case 'gmail':
      return 'Email unavailable — connect to internet to see client emails';
    case 'gcal':
    case 'google-calendar':
      return "Calendar unavailable — connect to internet to see today's calls";
    default:
      return 'Tool unavailable offline';
  }
}
