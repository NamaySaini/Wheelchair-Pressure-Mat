import Constants from 'expo-constants';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  body?: unknown;
  requiresAuth?: boolean;
};

type AccessTokenProvider = () => Promise<string | null> | string | null;

export type PressurePeriod = 'week' | 'month' | 'year';

export type ZoneLabel = 'low' | 'moderate' | 'high';

export type UserProfile = {
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  condition?: string;
  wheelchair_type?: string;
  cushion_type?: string;
  risk_level?: 'low' | 'medium' | 'high';
  target_reposition_interval_sec?: number;
  timezone?: string;
};

export type UserSettings = {
  alert_interval_ms: number;
};

export type PressureSnapshot = {
  id: string;
  sensors: number[];
  recorded_at: string;
};

export type SessionStartResponse = {
  id: string;
  started_at: string;
};

export type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  auto_ended: boolean;
  ended_reason: 'user' | 'no_pressure' | 'ble_disconnect' | null;
  alerts_triggered: number;
  shifts_completed: number;
  repositions_detected: number;
  longest_no_shift_sec: number | null;
  worst_zone: string | null;
  compliance_rate: number | null;
  avg_distribution: Record<string, number> | null;
};

export type SessionSummary = {
  session_id: string;
  summary_text: string;
  key_insight: string | null;
  generated_at: string;
};

export type SessionEndResponse = {
  session: SessionRow;
  summary: SessionSummary | null;
};

export type ReadingPayload = {
  session_id: string;
  cop_x: number;
  cop_y: number;
  symmetry: number;
  max_pressure: number;
  max_pressure_zone: string;
  left_ischial: ZoneLabel;
  right_ischial: ZoneLabel;
  left_thigh: ZoneLabel;
  right_thigh: ZoneLabel;
  center_zone: ZoneLabel;
};

export type AlertEventResponse = {
  id: string;
  triggered_at: string;
};

export type ChatMessage = {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at?: string;
};

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 8000;

// DEMO_MODE — short-circuits all backend calls with hardcoded fixtures so the UI
// works without needing the Express server reachable from the phone.
// Flip to false to go back to real backend.
const DEMO_MODE = false;

const DEMO_PROFILE: UserProfile = {
  age: 42,
  weight_kg: 72,
  height_cm: 175,
  condition: 'Spinal cord injury (T6)',
  wheelchair_type: 'Manual',
  cushion_type: 'ROHO Quadtro',
  risk_level: 'medium',
  target_reposition_interval_sec: 1800,
  timezone: 'America/Chicago',
};

const DEMO_SESSION_SUMMARY_TEXT =
  'Nice session — 22 minutes with one alert you answered on time. Pressure stayed mostly in your right ischial, consistent with the last week. Key insight: try a small pre-emptive shift every 25 minutes instead of waiting for the alert — your right side is taking the hit.';

function demoDelay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function demoChatReply(message: string): string {
  const m = message.toLowerCase();
  if (/(know|about).*(me|i)/.test(m) || /who am i|tell me about myself/.test(m)) {
    return "Based on your profile: 42 y/o with a T6 spinal cord injury, using a manual chair and a ROHO Quadtro cushion. You're in the medium-risk bucket with a 30-minute reposition target. All times below are in your Chicago timezone.";
  }
  if (/symmetr|which side|more pressure|right.*left|left.*right|imbalance/.test(m)) {
    return 'Your right ischial averages 1.42 on the 0–2 severity scale this month, vs. 0.81 on the left — that is a consistent asymmetry across 24 of your last 28 sessions. Worth mentioning to your OT; a small cushion adjustment could even it out.';
  }
  if (/compliance|improv|better|trend|progress/.test(m)) {
    return 'Your compliance has climbed from 58% three weeks ago to 81% this week — you are responding to alerts much faster than you were. The biggest jump happened after you started using the shift-forward cue instead of just dismissing.';
  }
  if (/when|what time|time of day|hour|miss|evening|morning/.test(m)) {
    return 'Evenings are your weak window — between 7 and 9 PM you complete only about 55% of shifts, vs. ~88% during the day. Likely fatigue or TV time. Setting an extra visual cue in that window could help.';
  }
  if (/worst|bad session|longest/.test(m)) {
    return 'Tuesday evening: 1h 54m session, 4 alerts triggered, only 1 shift completed (25% compliance). Longest stretch without repositioning was 48 minutes. Right ischial was high throughout. Consider ending sessions earlier when you notice yourself missing the first alert.';
  }
  if (/focus|what should|work on|goal|priority|improve/.test(m)) {
    return "Two things for this week: (1) evening sessions — your compliance drops from 88% to 55% after 7 PM, so an extra cue there will lift your average fast. (2) Right-ischial offload — the asymmetry is persistent, try leaning slightly left for your next few pre-emptive shifts and see if it balances out. You are already trending in the right direction.";
  }
  if (/now|right now|current|posture/.test(m)) {
    return 'Right now your center of pressure is slightly right of midline and symmetry is around 78% — a touch asymmetric but within your usual range. No high zones flagged at the moment.';
  }
  return 'That is a great question. Based on your recent sessions, compliance is trending up and your main pattern is a right-side pressure bias — keep up the pre-emptive shifts.';
}

function getExpoHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    null;

  if (!hostUri) return null;
  return hostUri.split(':')[0] ?? null;
}

function resolveApiBaseUrl() {
  if (!rawApiBaseUrl) return '';

  try {
    const url = new URL(rawApiBaseUrl);
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return rawApiBaseUrl;
    }

    const expoHost = getExpoHost();
    if (!expoHost) return rawApiBaseUrl;

    url.hostname = expoHost;
    return url.toString().replace(/\/$/, '');
  } catch {
    return rawApiBaseUrl;
  }
}

const apiBaseUrl = resolveApiBaseUrl();

if (!rawApiBaseUrl) {
  console.warn(
    'EXPO_PUBLIC_API_URL is not set. Add it to frontend/.env so the app can reach the backend.'
  );
} else if (apiBaseUrl !== rawApiBaseUrl) {
  console.warn(`Rewrote API base URL from ${rawApiBaseUrl} to ${apiBaseUrl} for device access.`);
}

export class BackendClient {
  constructor(private readonly getAccessToken?: AccessTokenProvider) {}

  getBaseUrl() {
    return apiBaseUrl ?? '';
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, requiresAuth = false } = options;

    if (!apiBaseUrl) {
      throw new Error('Missing EXPO_PUBLIC_API_URL in frontend/.env');
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (requiresAuth) {
      const token = await this.getAccessToken?.();
      if (!token) {
        throw new Error('Missing Supabase access token for authenticated request');
      }
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${apiBaseUrl}${path}`;
    let response: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error: any) {
      const detail =
        error?.name === 'AbortError'
          ? `Request timed out after ${REQUEST_TIMEOUT_MS}ms`
          : error?.message ?? 'Network request failed';
      throw new Error(
        `${detail} (url: ${url}). ` +
          `If you are on a physical device, EXPO_PUBLIC_API_URL must use your Mac's LAN IP and the backend must be running.`
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let detail = 'Request failed';
      try {
        const parsed = (await response.json()) as { error?: string };
        detail = parsed.error ?? detail;
      } catch {
        // No JSON response body.
      }
      throw new Error(`${response.status} ${response.statusText}: ${detail}`);
    }

    return (await response.json()) as T;
  }

  async health() {
    return this.request<{ status: string }>('/health');
  }

  // ── Profile ──
  async getProfile() {
    if (DEMO_MODE) return demoDelay(DEMO_PROFILE);
    return this.request<UserProfile>('/users/me');
  }

  async upsertProfile(profile: UserProfile) {
    if (DEMO_MODE) {
      void profile;
      return demoDelay({ success: true as const });
    }
    return this.request<{ success: true }>('/users', {
      method: 'POST',
      body: profile,
    });
  }

  // ── Sessions ──
  async startSession() {
    if (DEMO_MODE) {
      return demoDelay<SessionStartResponse>({
        id: `demo-${Date.now()}`,
        started_at: new Date().toISOString(),
      });
    }
    return this.request<SessionStartResponse>('/sessions', { method: 'POST' });
  }

  async endSession(
    sessionId: string,
    opts: {
      auto_ended?: boolean;
      ended_reason?: 'user' | 'no_pressure' | 'ble_disconnect';
      repositions_detected?: number;
    } = {}
  ) {
    if (DEMO_MODE) {
      const now = new Date();
      const fakeSession: SessionRow = {
        id: sessionId,
        user_id: 'demo',
        started_at: new Date(now.getTime() - 22 * 60_000).toISOString(),
        ended_at: now.toISOString(),
        duration_sec: 22 * 60,
        auto_ended: !!opts.auto_ended,
        ended_reason: opts.ended_reason ?? 'user',
        alerts_triggered: 1,
        shifts_completed: 1,
        repositions_detected: opts.repositions_detected ?? 3,
        longest_no_shift_sec: 660,
        worst_zone: 'right_ischial',
        compliance_rate: 1,
        avg_distribution: {
          left_ischial: 0.8,
          right_ischial: 1.4,
          left_thigh: 0.4,
          right_thigh: 0.5,
          center_zone: 0.6,
        },
      };
      const fakeSummary: SessionSummary = {
        session_id: sessionId,
        summary_text: DEMO_SESSION_SUMMARY_TEXT,
        key_insight: 'Right ischial bias — try pre-emptive shifts every 25 min.',
        generated_at: now.toISOString(),
      };
      return demoDelay<SessionEndResponse>({ session: fakeSession, summary: fakeSummary }, 600);
    }
    return this.request<SessionEndResponse>(`/sessions/${sessionId}/end`, {
      method: 'POST',
      body: opts,
    });
  }

  async listSessions(period: PressurePeriod = 'week') {
    if (DEMO_MODE) return demoDelay<SessionRow[]>([]);
    return this.request<SessionRow[]>(`/sessions?period=${period}`);
  }

  async getSession(sessionId: string) {
    if (DEMO_MODE) {
      return demoDelay({ session: null as unknown as SessionRow, summary: null });
    }
    return this.request<{ session: SessionRow; summary: SessionSummary | null }>(
      `/sessions/${sessionId}`
    );
  }

  // ── Readings (fire-and-forget in demo) ──
  async postReading(reading: ReadingPayload) {
    if (DEMO_MODE) {
      void reading;
      return demoDelay({ success: true as const }, 50);
    }
    return this.request<{ success: true }>('/readings', { method: 'POST', body: reading });
  }

  async postSnapshot(session_id: string, grid: number[]) {
    if (DEMO_MODE) {
      void session_id;
      void grid;
      return demoDelay({ success: true as const }, 50);
    }
    return this.request<{ success: true }>('/snapshots', {
      method: 'POST',
      body: { session_id, grid },
    });
  }

  // ── Alert events ──
  async createAlertEvent(session_id: string) {
    if (DEMO_MODE) {
      void session_id;
      return demoDelay<AlertEventResponse>({
        id: `demo-alert-${Date.now()}`,
        triggered_at: new Date().toISOString(),
      }, 50);
    }
    return this.request<AlertEventResponse>('/alert-events', {
      method: 'POST',
      body: { session_id },
    });
  }

  async patchAlertEvent(
    id: string,
    opts: { acknowledged?: boolean; shift_completed?: boolean }
  ) {
    if (DEMO_MODE) {
      void id;
      void opts;
      return demoDelay({ success: true as const }, 50);
    }
    return this.request<{ success: true }>(`/alert-events/${id}`, {
      method: 'PATCH',
      body: opts,
    });
  }

  // ── Chat ──
  async sendChat(message: string) {
    if (DEMO_MODE) {
      return demoDelay({ reply: demoChatReply(message) }, 900);
    }
    return this.request<{ reply: string }>('/chat', {
      method: 'POST',
      body: { message },
    });
  }

  async getChatHistory() {
    if (DEMO_MODE) return demoDelay<ChatMessage[]>([]);
    return this.request<ChatMessage[]>('/chat/history');
  }
}

export const backendClient = new BackendClient();
