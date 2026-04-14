type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  requiresAuth?: boolean;
};

type AccessTokenProvider = () => Promise<string | null> | string | null;

export type PressurePeriod = 'week' | 'month' | 'year';

export type UserProfile = {
  age?: number;
  weight_kg?: number;
  height_cm?: number;
};

export type UserSettings = {
  alert_interval_ms: number;
};

export type PressureSnapshot = {
  id: string;
  sensors: number[];
  recorded_at: string;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiBaseUrl) {
  console.warn(
    'EXPO_PUBLIC_API_URL is not set. Add it to frontend/.env so the app can reach the backend.'
  );
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

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

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

  async getSettings() {
    return this.request<UserSettings>('/settings', { requiresAuth: true });
  }

  async updateSettings(alert_interval_ms: number) {
    return this.request<UserSettings>('/settings', {
      method: 'PUT',
      body: { alert_interval_ms },
      requiresAuth: true,
    });
  }

  async getProfile() {
    return this.request<UserProfile>('/users/me', { requiresAuth: true });
  }

  async upsertProfile(profile: UserProfile) {
    return this.request<{ success: true }>('/users', {
      method: 'POST',
      body: profile,
      requiresAuth: true,
    });
  }

  async listPressure(period: PressurePeriod = 'week') {
    return this.request<PressureSnapshot[]>(`/pressure?period=${period}`, {
      requiresAuth: true,
    });
  }

  async createPressureSnapshot(sensors: number[], timestamp?: string) {
    return this.request<{ success: true }>('/pressure', {
      method: 'POST',
      body: { sensors, timestamp },
      requiresAuth: true,
    });
  }
}

export const backendClient = new BackendClient();