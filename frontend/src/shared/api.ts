import type {
  AiChildProfile,
  ChildInput,
  ChildProfile,
  HealthResponse,
  IdentifyResponse,
  ModerationVerdict,
  SessionBootstrap,
  SessionStats,
} from '@zuzu/shared/types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// Backend origin. Empty = same origin (local dev via the Vite proxy, or when the backend serves this app).
const API_BASE = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

const PIN_KEY = 'zuzu-console-pin';

export function setPin(pin: string): void {
  try {
    sessionStorage.setItem(PIN_KEY, pin);
  } catch {
    /* storage unavailable */
  }
}

function pin(): string | null {
  try {
    return sessionStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

async function request<T>(method: string, path: string, body?: unknown, contentType = 'application/json'): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = contentType;
  const p = pin();
  if (p) headers['x-console-pin'] = p;
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : contentType === 'application/json' ? JSON.stringify(body) : (body as string),
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json?.error?.code ?? 'error', json?.error?.message ?? `HTTP ${res.status}`);
  return json as T;
}

export const api = {
  health: () => request<HealthResponse>('GET', '/health'),
  listChildren: () => request<ChildProfile[]>('GET', '/children'),
  createChild: (c: ChildInput) => request<ChildProfile>('POST', '/children', c),
  updateChild: (id: string, c: ChildInput) => request<ChildProfile>('PUT', `/children/${id}`, c),
  patchChild: (id: string, p: { status?: 'waiting' | 'done'; upNext?: boolean }) =>
    request<ChildProfile>('PATCH', `/children/${id}`, p),
  deleteChild: (id: string) => request<void>('DELETE', `/children/${id}`),
  deleteAll: () => request<{ deleted: number }>('DELETE', '/children', { confirm: 'DELETE' }),
  importCsv: (csv: string) =>
    request<{ created: number; duplicates: number; errors: { row: number; message: string }[] }>('POST', '/children/import', csv, 'text/csv'),
  identify: (spokenName: string, expectedChildId?: string) =>
    request<IdentifyResponse>('POST', '/children/identify', { spokenName, expectedChildId }),
  aiProfile: (id: string) => request<AiChildProfile>('GET', `/children/${id}/ai-profile`),
  session: (expectedChildId?: string) => request<SessionBootstrap>('POST', '/session', { expectedChildId }),
  moderate: (text: string, source: 'buddy' | 'child') => request<ModerationVerdict>('POST', '/moderate', { text, source }),
  logSession: (stats: SessionStats) => request<void>('POST', '/ops/session', stats),
};
