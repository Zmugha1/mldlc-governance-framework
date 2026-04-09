import { invoke } from '@tauri-apps/api/core';
import type {
  CoachBotTool,
  ToolCapability,
  ToolResult,
  ToolSetting,
} from './toolManager';
import { ToolManager } from './toolManager';
import { getDb } from './db';
import {
  connectGoogle,
  disconnectGoogle,
  getValidToken,
} from './googleAuthService';

/** Must match `tool_connections.tool_id` from Google OAuth (AdminStreamliner / connectGoogle). */
const CALENDAR_TOOL_ID = 'google-calendar';

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  startDate: string;
  isAllDay: boolean;
  location: string;
  attendees: string[];
  matchedClientId: string | null;
  matchedClientName: string | null;
}

export interface TodaysCall {
  event: CalendarEvent;
  clientId: string | null;
  /** Display name: matched client or event title. */
  clientName: string;
  clientStage: string | null;
  startTime: string;
  formattedTime: string;
}

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  inferred_stage: string | null;
};

function isGoogleCalendarApiError(
  v: Record<string, unknown>
): v is { error: { message?: string } } {
  const e = v.error;
  return e !== null && typeof e === 'object';
}

export function parseCalendarEvent(raw: unknown): CalendarEvent {
  const empty: CalendarEvent = {
    id: '',
    summary: '',
    description: '',
    startTime: '',
    endTime: '',
    startDate: '',
    isAllDay: false,
    location: '',
    attendees: [],
    matchedClientId: null,
    matchedClientName: null,
  };

  if (!raw || typeof raw !== 'object') {
    return empty;
  }

  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  const summary = typeof r.summary === 'string' ? r.summary : '';
  const description = typeof r.description === 'string' ? r.description : '';
  const location = typeof r.location === 'string' ? r.location : '';

  const startObj =
    r.start && typeof r.start === 'object'
      ? (r.start as Record<string, unknown>)
      : {};
  const endObj =
    r.end && typeof r.end === 'object' ? (r.end as Record<string, unknown>) : {};

  const isAllDay =
    'date' in startObj && !('dateTime' in startObj);

  const startTime =
    typeof startObj.dateTime === 'string'
      ? startObj.dateTime
      : typeof startObj.date === 'string'
        ? startObj.date
        : '';

  const endTime =
    typeof endObj.dateTime === 'string'
      ? endObj.dateTime
      : typeof endObj.date === 'string'
        ? endObj.date
        : '';

  const startDate = (startTime || '').split('T')[0] ?? '';

  const attendees: string[] = [];
  const rawAtt = r.attendees;
  if (Array.isArray(rawAtt)) {
    for (const a of rawAtt) {
      if (!a || typeof a !== 'object') continue;
      const o = a as Record<string, unknown>;
      const dn = typeof o.displayName === 'string' ? o.displayName : '';
      const em = typeof o.email === 'string' ? o.email : '';
      const s = dn || em;
      if (s) attendees.push(s);
    }
  }

  return {
    id,
    summary,
    description,
    startTime,
    endTime,
    startDate,
    isAllDay,
    location,
    attendees,
    matchedClientId: null,
    matchedClientName: null,
  };
}

export async function matchEventToClient(
  event: CalendarEvent,
  clients: ClientRow[]
): Promise<{
  clientId: string | null;
  clientName: string | null;
  clientStage: string | null;
}> {
  const eventText = `${event.summary} ${event.description} ${event.attendees.join(' ')}`.toLowerCase();

  for (const client of clients) {
    const nameTrim = (client.name ?? '').trim();
    const parts = nameTrim.split(/\s+/).filter(Boolean);
    const firstName = (parts[0] ?? '').toLowerCase();
    const lastName =
      parts.length > 0 ? (parts[parts.length - 1] ?? '').toLowerCase() : '';
    const email = (client.email ?? '').trim().toLowerCase();

    const hitFirst = firstName.length > 0 && eventText.includes(firstName);
    const hitLast =
      lastName.length > 0 &&
      lastName !== firstName &&
      eventText.includes(lastName);
    const hitEmail = email.length > 0 && eventText.includes(email);

    if (hitFirst || hitLast || hitEmail) {
      return {
        clientId: client.id,
        clientName: client.name,
        clientStage: client.inferred_stage ?? null,
      };
    }
  }

  return { clientId: null, clientName: null, clientStage: null };
}

export class GoogleCalendarTool implements CoachBotTool {
  id = CALENDAR_TOOL_ID;
  name = 'Google Calendar';
  description =
    "See today's coaching calls on Morning Brief and get pre-call question prep";
  icon = '📅';
  version = '1.0.0';
  authType = 'oauth2' as const;

  capabilities: ToolCapability[] = [
    {
      id: 'get_todays_calls',
      name: "Today's Calls",
      description: 'Get all coaching calls scheduled for today',
      requiredParams: [],
      returnsType: 'event',
    },
    {
      id: 'get_this_week',
      name: 'This Week',
      description: 'Get all events this week',
      requiredParams: [],
      returnsType: 'event',
    },
    {
      id: 'get_events_range',
      name: 'Get Events in Range',
      description: 'Get events between two dates',
      requiredParams: ['timeMin', 'timeMax'],
      returnsType: 'event',
    },
    {
      id: 'create_followup',
      name: 'Create Follow-up',
      description: 'Create a follow-up reminder on calendar',
      requiredParams: ['clientName', 'startDatetime', 'endDatetime'],
      returnsType: 'event',
    },
  ];

  settings: ToolSetting[] = [
    {
      key: 'show_all_events',
      label: 'Show all events or only matched clients',
      type: 'select',
      defaultValue: 'matched',
      options: ['matched', 'all'],
    },
  ];

  async isConnected(): Promise<boolean> {
    const token = await getValidToken(CALENDAR_TOOL_ID);
    return token !== null;
  }

  async connect(): Promise<void> {
    const result = await connectGoogle(() => {});
    if (!result.success) {
      throw new Error(result.error ?? 'Calendar connection failed');
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
          return { show_all_events: 'matched', ...parsed };
        } catch {
          /* fall through */
        }
      }
    } catch {
      /* defaults */
    }
    return { show_all_events: 'matched' };
  }

  async updateSettings(settings: Record<string, unknown>): Promise<void> {
    const db = await getDb();
    await db.execute(
      `UPDATE tool_connections SET settings_json = ? WHERE tool_id = ?`,
      [JSON.stringify(settings), this.id]
    );
  }

  async execute(
    capabilityId: string,
    params: Record<string, unknown>
  ): Promise<ToolResult> {
    const token = await getValidToken(CALENDAR_TOOL_ID);
    if (!token) {
      return { success: false, error: 'Calendar not connected' };
    }

    switch (capabilityId) {
      case 'get_todays_calls':
        return this.getTodaysCalls(token);
      case 'get_this_week':
        return this.getThisWeek(token);
      case 'get_events_range':
        return this.getEventsRange(
          token,
          String(params.timeMin ?? ''),
          String(params.timeMax ?? '')
        );
      case 'create_followup':
        return this.createFollowup(
          token,
          String(params.clientName ?? ''),
          String(params.startDatetime ?? ''),
          String(params.endDatetime ?? '')
        );
      default:
        return { success: false, error: 'Unknown capability' };
    }
  }

  private async getTodaysCalls(token: string): Promise<ToolResult> {
    const response = (await invoke<Record<string, unknown>>(
      'gcal_get_todays_events',
      { accessToken: token }
    )) as Record<string, unknown>;

    if (isGoogleCalendarApiError(response)) {
      const msg = response.error?.message ?? 'Calendar API error';
      return { success: false, error: msg };
    }

    const items = response.items;
    const rawEvents = Array.isArray(items) ? items : [];
    const events: CalendarEvent[] = rawEvents
      .map(parseCalendarEvent)
      .filter((e) => !e.isAllDay);

    const db = await getDb();
    const clientRows = (await db.select(
      `SELECT id, name, email, inferred_stage
       FROM clients
       WHERE outcome_bucket = 'active'`,
      []
    )) as ClientRow[];

    const todaysCalls: TodaysCall[] = [];

    for (const event of events) {
      const match = await matchEventToClient(event, clientRows);
      let formattedTime = '—';
      if (event.startTime) {
        const t = new Date(event.startTime);
        if (!Number.isNaN(t.getTime())) {
          formattedTime = t.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
        }
      }

      todaysCalls.push({
        event,
        clientId: match.clientId,
        clientName: match.clientName ?? event.summary,
        clientStage: match.clientStage,
        startTime: event.startTime,
        formattedTime,
      });
    }

    todaysCalls.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return {
      success: true,
      data: todaysCalls,
      metadata: {
        total: todaysCalls.length,
        matched: todaysCalls.filter((c) => c.clientId !== null).length,
      },
    };
  }

  private async getThisWeek(token: string): Promise<ToolResult> {
    const response = (await invoke<Record<string, unknown>>(
      'gcal_get_this_week',
      { accessToken: token }
    )) as Record<string, unknown>;

    if (isGoogleCalendarApiError(response)) {
      const msg = response.error?.message ?? 'Calendar API error';
      return { success: false, error: msg };
    }

    const items = response.items;
    const rawEvents = Array.isArray(items) ? items : [];
    const events = rawEvents.map(parseCalendarEvent);

    return { success: true, data: events };
  }

  private async getEventsRange(
    token: string,
    timeMin: string,
    timeMax: string
  ): Promise<ToolResult> {
    const response = (await invoke<Record<string, unknown>>(
      'gcal_get_events',
      {
        accessToken: token,
        timeMin,
        timeMax,
      }
    )) as Record<string, unknown>;

    if (isGoogleCalendarApiError(response)) {
      const msg = response.error?.message ?? 'Calendar API error';
      return { success: false, error: msg };
    }

    const items = response.items;
    const rawEvents = Array.isArray(items) ? items : [];
    const events = rawEvents.map(parseCalendarEvent);

    return { success: true, data: events };
  }

  private async createFollowup(
    token: string,
    clientName: string,
    startDatetime: string,
    endDatetime: string
  ): Promise<ToolResult> {
    const response = (await invoke<Record<string, unknown>>(
      'gcal_create_event',
      {
        accessToken: token,
        summary: `Follow-up: ${clientName}`,
        description: `Coaching follow-up call with ${clientName}`,
        startDatetime,
        endDatetime,
      }
    )) as Record<string, unknown>;

    if (isGoogleCalendarApiError(response)) {
      const msg = response.error?.message ?? 'Calendar API error';
      return { success: false, error: msg };
    }

    return { success: true, data: response };
  }
}

export const calendarTool = new GoogleCalendarTool();

export function registerCalendarTool(): void {
  ToolManager.registerTool(calendarTool);
}
