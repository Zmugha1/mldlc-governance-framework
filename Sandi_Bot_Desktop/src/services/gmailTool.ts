import { invoke } from '@tauri-apps/api/core';
import {
  CoachBotTool,
  ToolCapability,
  ToolResult,
  ToolSetting,
  ToolManager,
} from './toolManager';
import { getDb } from './db';
import {
  connectGoogle,
  disconnectGoogle,
  getValidToken,
} from './googleAuthService';

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  isUnread: boolean;
}

function decodeBase64Url(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (b64.length % 4)) % 4;
  const padded = b64 + '='.repeat(pad);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

function headerValue(
  headers: unknown,
  name: string
): string {
  if (!Array.isArray(headers)) return '';
  for (const h of headers) {
    if (!h || typeof h !== 'object') continue;
    const o = h as Record<string, unknown>;
    const n = typeof o.name === 'string' ? o.name : '';
    if (n.toLowerCase() === name.toLowerCase()) {
      return typeof o.value === 'string' ? o.value : '';
    }
  }
  return '';
}

function parseFromDisplay(fromHeader: string): { name: string; email: string } {
  const t = (fromHeader ?? '').trim();
  if (!t) return { name: '', email: '' };
  const m = t.match(/^(?:"?([^"<]*)"?\s*)?<([^>]+)>$/);
  if (m) {
    const email = (m[2] ?? '').trim();
    const name = (m[1] ?? '').replace(/^"|"$/g, '').trim();
    return { name: name || email, email };
  }
  if (t.includes('@')) {
    return { name: t, email: t };
  }
  return { name: t, email: '' };
}

function findPlainBody(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const p = payload as Record<string, unknown>;

  const mime = typeof p.mimeType === 'string' ? p.mimeType : '';
  const body = p.body;
  if (mime === 'text/plain' && body && typeof body === 'object') {
    const data = (body as Record<string, unknown>).data;
    if (typeof data === 'string' && data) {
      return decodeBase64Url(data);
    }
  }

  const directBody = p.body;
  if (directBody && typeof directBody === 'object') {
    const data = (directBody as Record<string, unknown>).data;
    if (typeof data === 'string' && data && mime.startsWith('text/')) {
      return decodeBase64Url(data);
    }
  }

  const parts = p.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      const found = findPlainBody(part);
      if (found) return found;
    }
  }
  return '';
}

export function parseEmailMessage(raw: unknown): EmailMessage {
  const empty: EmailMessage = {
    id: '',
    threadId: '',
    subject: '',
    from: '',
    fromEmail: '',
    to: '',
    date: '',
    snippet: '',
    body: '',
    isUnread: false,
  };

  if (!raw || typeof raw !== 'object') {
    return empty;
  }

  const m = raw as Record<string, unknown>;
  const id = typeof m.id === 'string' ? m.id : '';
  const threadId = typeof m.threadId === 'string' ? m.threadId : '';
  const snippet = typeof m.snippet === 'string' ? m.snippet : '';

  const labelIds = m.labelIds;
  const isUnread =
    Array.isArray(labelIds) &&
    labelIds.some((x) => x === 'UNREAD');

  const payload = m.payload;
  let headers: unknown = undefined;
  if (payload && typeof payload === 'object') {
    headers = (payload as Record<string, unknown>).headers;
  }

  const subject = headerValue(headers, 'Subject');
  const fromRaw = headerValue(headers, 'From');
  const toRaw = headerValue(headers, 'To');
  const date = headerValue(headers, 'Date');

  const { name: fromName, email: fromEmail } = parseFromDisplay(fromRaw);
  const fromDisplay =
    fromName && fromEmail && fromName !== fromEmail
      ? `${fromName} <${fromEmail}>`
      : fromRaw || fromEmail || '';

  let body = '';
  if (payload && typeof payload === 'object') {
    const pl = payload as Record<string, unknown>;
    const b = pl.body;
    if (b && typeof b === 'object') {
      const data = (b as Record<string, unknown>).data;
      if (typeof data === 'string' && data) {
        body = decodeBase64Url(data);
      }
    }
    if (!body) {
      body = findPlainBody(payload);
    }
  }

  return {
    id,
    threadId,
    subject,
    from: fromDisplay,
    fromEmail,
    to: toRaw,
    date,
    snippet,
    body,
    isUnread,
  };
}

function isGmailApiError(
  v: Record<string, unknown>
): v is { error: { message?: string } } {
  const e = v.error;
  return e !== null && typeof e === 'object';
}

export class GmailTool implements CoachBotTool {
  id = 'gmail';
  name = 'Gmail';
  description =
    'Read client emails and reply using DISC-appropriate templates';
  icon = '📧';
  version = '1.0.0';
  authType = 'oauth2' as const;

  capabilities: ToolCapability[] = [
    {
      id: 'get_last_email',
      name: 'Get Last Email',
      description: 'Get most recent email for a client',
      requiredParams: ['clientName'],
      optionalParams: ['clientEmail'],
      returnsType: 'email',
    },
    {
      id: 'get_thread',
      name: 'Get Email Thread',
      description: 'Get full email conversation with a client',
      requiredParams: ['threadId'],
      returnsType: 'email',
    },
    {
      id: 'search_emails',
      name: 'Search Emails',
      description: 'Search emails by query string',
      requiredParams: ['query'],
      returnsType: 'email',
    },
    {
      id: 'send_email',
      name: 'Send Email',
      description: 'Send email to a client',
      requiredParams: ['to', 'subject', 'body'],
      returnsType: 'custom',
    },
  ];

  settings: ToolSetting[] = [
    {
      key: 'max_results',
      label: 'Emails to fetch per client',
      type: 'select',
      defaultValue: '5',
      options: ['1', '5', '10', '20'],
    },
  ];

  async isConnected(): Promise<boolean> {
    const token = await getValidToken('gmail');
    return token !== null;
  }

  async connect(): Promise<void> {
    const result = await connectGoogle(() => {});
    if (!result.success) {
      throw new Error(result.error ?? 'Gmail connection failed');
    }
  }

  async disconnect(): Promise<void> {
    await disconnectGoogle();
  }

  async getSettings(): Promise<Record<string, unknown>> {
    try {
      const db = await getDb();
      const rows = (await db.select(
        `SELECT settings_json FROM tool_connections WHERE tool_id = ? AND is_connected = 1`,
        [this.id]
      )) as Array<{ settings_json: string | null }>;
      const raw = rows[0]?.settings_json;
      if (raw && String(raw).trim()) {
        try {
          const parsed = JSON.parse(String(raw)) as Record<string, unknown>;
          return { max_results: '5', ...parsed };
        } catch {
          /* fall through */
        }
      }
    } catch {
      /* use defaults */
    }
    return { max_results: '5' };
  }

  async updateSettings(settings: Record<string, unknown>): Promise<void> {
    const db = await getDb();
    const json = JSON.stringify(settings);
    await db.execute(
      `UPDATE tool_connections SET settings_json = ? WHERE tool_id = ?`,
      [json, this.id]
    );
  }

  async execute(
    capabilityId: string,
    params: Record<string, unknown>
  ): Promise<ToolResult> {
    const token = await getValidToken('gmail');
    if (!token) {
      return { success: false, error: 'Gmail not connected' };
    }

    switch (capabilityId) {
      case 'get_last_email':
        return this.getLastEmail(
          token,
          String(params.clientName ?? ''),
          params.clientEmail != null ? String(params.clientEmail) : undefined
        );
      case 'get_thread':
        return this.getThread(token, String(params.threadId ?? ''));
      case 'search_emails':
        return this.searchEmails(token, String(params.query ?? ''));
      case 'send_email':
        return this.sendEmail(
          token,
          String(params.to ?? ''),
          String(params.subject ?? ''),
          String(params.body ?? '')
        );
      default:
        return { success: false, error: 'Unknown capability' };
    }
  }

  private async getLastEmail(
    token: string,
    clientName: string,
    clientEmail?: string
  ): Promise<ToolResult> {
    const query = clientEmail
      ? `from:${clientEmail} OR to:${clientEmail}`
      : `from:${clientName} OR to:${clientName}`;

    const messagesResponse = (await invoke<Record<string, unknown>>(
      'gmail_get_messages',
      {
        accessToken: token,
        query,
        maxResults: 1,
      }
    )) as Record<string, unknown>;

    if (isGmailApiError(messagesResponse)) {
      const msg = messagesResponse.error?.message ?? 'Gmail API error';
      return { success: false, error: msg };
    }

    const messages = messagesResponse.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        success: true,
        data: null,
        metadata: {
          found: false,
          message: 'No emails found with this client',
        },
      };
    }

    const first = messages[0] as Record<string, unknown>;
    const messageId =
      typeof first.id === 'string' ? first.id : '';
    if (!messageId) {
      return {
        success: true,
        data: null,
        metadata: {
          found: false,
          message: 'No emails found with this client',
        },
      };
    }

    const messageResponse = (await invoke<Record<string, unknown>>(
      'gmail_get_message',
      {
        accessToken: token,
        messageId,
      }
    )) as Record<string, unknown>;

    if (isGmailApiError(messageResponse)) {
      const msg = messageResponse.error?.message ?? 'Gmail API error';
      return { success: false, error: msg };
    }

    const email = parseEmailMessage(messageResponse);
    return { success: true, data: email };
  }

  private async getThread(
    token: string,
    threadId: string
  ): Promise<ToolResult> {
    const threadResponse = (await invoke<Record<string, unknown>>(
      'gmail_get_thread',
      {
        accessToken: token,
        threadId,
      }
    )) as Record<string, unknown>;

    if (isGmailApiError(threadResponse)) {
      const msg = threadResponse.error?.message ?? 'Gmail API error';
      return { success: false, error: msg };
    }

    const rawMessages = threadResponse.messages;
    const list = Array.isArray(rawMessages) ? rawMessages : [];
    const messages = list.map((m) => parseEmailMessage(m));
    return { success: true, data: messages };
  }

  private async searchEmails(
    token: string,
    query: string
  ): Promise<ToolResult> {
    const response = (await invoke<Record<string, unknown>>(
      'gmail_get_messages',
      {
        accessToken: token,
        query,
        maxResults: 10,
      }
    )) as Record<string, unknown>;

    if (isGmailApiError(response)) {
      const msg = response.error?.message ?? 'Gmail API error';
      return { success: false, error: msg };
    }

    const messages = response.messages;
    return {
      success: true,
      data: Array.isArray(messages) ? messages : [],
    };
  }

  private async sendEmail(
    token: string,
    to: string,
    subject: string,
    body: string
  ): Promise<ToolResult> {
    const response = (await invoke<Record<string, unknown>>(
      'gmail_send_message',
      {
        accessToken: token,
        to,
        subject,
        body,
      }
    )) as Record<string, unknown>;

    if (isGmailApiError(response)) {
      const err = response.error;
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message ?? 'Send failed')
          : 'Send failed';
      return { success: false, error: message };
    }

    return {
      success: true,
      data: { sent: true },
    };
  }
}

export const gmailTool = new GmailTool();

export function getDiscEmailTemplate(
  discStyle: string,
  clientName: string,
  coachName: string = 'Sandi'
): { subject: string; body: string } {
  const firstName = (clientName.split(' ')[0] ?? clientName).trim() || 'there';

  switch (discStyle) {
    case 'D':
      return {
        subject: `Quick check-in — ${firstName}`,
        body: `Hi ${firstName},\n\nJust checking in. Where are you in your thinking?\n\nReady to connect when you are.\n\n${coachName}`,
      };
    case 'I':
      return {
        subject: `Thinking of you, ${firstName}!`,
        body: `Hi ${firstName}!\n\nI have been thinking about our last conversation and I am excited about where things are heading for you.\n\nWould love to reconnect and hear how things are going!\n\n${coachName}`,
      };
    case 'S':
      return {
        subject: `Checking in — no rush`,
        body: `Hi ${firstName},\n\nJust wanted to reach out and let you know I am here whenever you are ready.\n\nNo pressure at all — just thinking of you and hoping things are going well.\n\n${coachName}`,
      };
    case 'C':
      return {
        subject: `Following up — ${firstName}`,
        body: `Hi ${firstName},\n\nI wanted to follow up on our last conversation. I have some additional information that might be helpful as you continue your research.\n\nLet me know if you would like to connect.\n\n${coachName}`,
      };
    default:
      return {
        subject: `Checking in`,
        body: `Hi ${firstName},\n\nJust wanted to check in and see how things are going.\n\n${coachName}`,
      };
  }
}

export function registerGmailTool(): void {
  ToolManager.registerTool(gmailTool);
}
