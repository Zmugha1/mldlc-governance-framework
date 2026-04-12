import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { getDb } from './db';
import { ToolManager } from './toolManager';

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
}

export interface GoogleAuthResult {
  success: boolean;
  email?: string;
  error?: string;
}

/** Matches `CAPTURE_INTEGRATION_TOOLS` ids for Calendar (not `gcal`). */
const GOOGLE_CALENDAR_TOOL_ID = 'google-calendar';

function isOAuthErrorResponse(
  v: Record<string, unknown>
): v is { error: string; error_description?: string } {
  return typeof v.error === 'string' && v.error.length > 0;
}

export async function connectGoogle(
  onProgress: (message: string) => void
): Promise<GoogleAuthResult> {
  try {
    onProgress('Opening Google login...');
    const authUrl = await invoke<string>('google_auth_url');

    const serverPromise = invoke<string>('google_start_local_server');

    await open(authUrl);
    onProgress('Waiting for Google login...');

    const code = await serverPromise;
    onProgress('Connecting...');

    const tokenResponse = await invoke<Record<string, unknown>>(
      'google_exchange_code',
      { code }
    );

    if (isOAuthErrorResponse(tokenResponse)) {
      const desc =
        typeof tokenResponse.error_description === 'string'
          ? tokenResponse.error_description
          : undefined;
      return {
        success: false,
        error: desc || 'Authentication failed',
      };
    }

    const access = tokenResponse.access_token;
    if (typeof access !== 'string' || !access) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const refreshRaw = tokenResponse.refresh_token;
    const expiresRaw = tokenResponse.expires_in;
    const typeRaw = tokenResponse.token_type;
    const scopeRaw = tokenResponse.scope;

    const tokens: GoogleTokens = {
      access_token: access,
      refresh_token: typeof refreshRaw === 'string' ? refreshRaw : '',
      expires_in: typeof expiresRaw === 'number' ? expiresRaw : Number(expiresRaw ?? 3600),
      token_type: typeof typeRaw === 'string' ? typeRaw : 'Bearer',
      scope: typeof scopeRaw === 'string' ? scopeRaw : '',
    };

    onProgress('Getting account info...');
    const userInfo = await invoke<Record<string, unknown>>('google_get_user_info', {
      accessToken: tokens.access_token,
    });

    const email =
      typeof userInfo.email === 'string' ? userInfo.email : '';

    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    await ToolManager.saveConnection(
      'gmail',
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      email
    );
    await ToolManager.saveConnection(
      GOOGLE_CALENDAR_TOOL_ID,
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      email
    );

    onProgress('Connected!');
    return {
      success: true,
      email,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function refreshGoogleToken(
  refreshToken: string
): Promise<string | null> {
  const response = await invoke<Record<string, unknown>>(
    'google_refresh_token',
    { refreshToken }
  );

  if (isOAuthErrorResponse(response)) {
    return null;
  }

  const at = response.access_token;
  return typeof at === 'string' && at ? at : null;
}

export async function getValidToken(toolId: string): Promise<string | null> {
  const db = await getDb();
  const rows = (await db.select(
    `SELECT auth_token, refresh_token, token_expires_at
     FROM tool_connections
     WHERE tool_id = ?
     AND is_connected = 1`,
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

  const expiresAt = new Date(String(row.token_expires_at ?? ''));
  const fiveMinutes = 5 * 60 * 1000;
  const isExpiringSoon =
    !Number.isNaN(expiresAt.getTime()) &&
    expiresAt.getTime() - Date.now() < fiveMinutes;

  if (isExpiringSoon && row.refresh_token) {
    const full = await invoke<Record<string, unknown>>('google_refresh_token', {
      refreshToken: row.refresh_token,
    });

    if (isOAuthErrorResponse(full)) {
      return null;
    }

    const newToken = full.access_token;
    if (typeof newToken !== 'string' || !newToken) {
      return null;
    }

    const expiresInSec = Number(full.expires_in ?? 3600);
    const newExpiry = new Date(
      Date.now() + expiresInSec * 1000
    ).toISOString();

    await db.execute(
      `UPDATE tool_connections
       SET auth_token = ?,
           token_expires_at = ?
       WHERE (tool_id = 'gmail' OR tool_id = ?)
       AND is_connected = 1`,
      [newToken, newExpiry, GOOGLE_CALENDAR_TOOL_ID]
    );

    return newToken;
  }

  return row.auth_token ?? null;
}

export async function disconnectGoogle(): Promise<void> {
  await ToolManager.disconnectTool('gmail');
  await ToolManager.disconnectTool(GOOGLE_CALENDAR_TOOL_ID);
}

export async function isGoogleConnected(): Promise<boolean> {
  const db = await getDb();
  const rows = (await db.select(
    `SELECT COUNT(*) as cnt
     FROM tool_connections
     WHERE tool_id = 'gmail'
     AND is_connected = 1`,
    []
  )) as Array<{ cnt: number | null }>;
  const n = rows[0]?.cnt ?? 0;
  return Number(n) > 0;
}

export async function validateGoogleToken(
  toolId: string
): Promise<boolean> {
  const token = await getValidToken(toolId);
  if (!token) return false;
  try {
    const profile = await invoke<Record<string, unknown>>(
      'gmail_get_profile',
      { accessToken: token }
    );
    const email =
      typeof profile.emailAddress === 'string'
        ? profile.emailAddress
        : typeof profile.email === 'string'
          ? profile.email
          : '';
    return email.length > 0;
  } catch {
    return false;
  }
}

export async function checkAndReconnect(
  toolId: string
): Promise<boolean> {
  const isValid = await validateGoogleToken(toolId);
  if (isValid) return true;

  const db = await getDb();
  const connections = (await db.select(
    `SELECT refresh_token
     FROM tool_connections
     WHERE tool_id = ? AND is_connected = 1`,
    [toolId]
  )) as Array<{ refresh_token: string | null }>;

  if (!connections.length) return false;
  const refreshToken = connections[0].refresh_token;
  if (!refreshToken) return false;

  try {
    const full = await invoke<Record<string, unknown>>(
      'google_refresh_token',
      { refreshToken }
    );
    if (isOAuthErrorResponse(full)) return false;
    const newToken = full.access_token;
    if (typeof newToken !== 'string' || !newToken) return false;
    const expiresInSec = Number(full.expires_in ?? 3600);
    const newExpiry = new Date(
      Date.now() + expiresInSec * 1000
    ).toISOString();

    await db.execute(
      `UPDATE tool_connections
       SET auth_token = ?,
           token_expires_at = ?
       WHERE (tool_id = 'gmail' OR tool_id = ?)
       AND is_connected = 1`,
      [newToken, newExpiry, GOOGLE_CALENDAR_TOOL_ID]
    );

    return true;
  } catch {
    return false;
  }
}

export async function logPrivacyAudit(
  action: string,
  _toolId: string,
  dataType: string
): Promise<void> {
  try {
    const db = await getDb();
    const details = JSON.stringify({
      action,
      dataType,
      readOnly: true,
      dataStaysLocal: true,
      timestamp: new Date().toISOString(),
    });
    await db.execute(
      `INSERT INTO audit_log
        (action_type, client_id, input_data, output_data, reasoning, model_used)
       VALUES (?, NULL, ?, NULL, NULL, ?)`,
      ['privacy_audit', details, 'privacy']
    );
  } catch (e) {
    console.warn('logPrivacyAudit failed', e);
  }
}
