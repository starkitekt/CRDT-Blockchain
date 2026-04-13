/**
 * HoneyTRACE — typed API client
 *
 * Thin wrapper around fetch that:
 *  - Prefixes all paths with the Next.js App Router `/api` base
 *  - Parses JSON responses
 *  - Throws `ApiError` on non-2xx so callers can distinguish
 *    network failures from server-side validation rejections
 *  - Carries Codex Stan 12-1981 violation arrays on 422 responses
 */

import type { Batch, LabResult, RecallEvent } from '@/types';

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly violations?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Core fetch helpers ────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith('http')
    ? path
    : path.startsWith('/')
      ? path
      : `/${path}`;

  const res = await fetch(normalizedPath, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    // Non-JSON body (e.g. 204 No Content)
  }

  if (!res.ok) {
    const message =
      (body.error as string) ?? (body.message as string) ?? `HTTP ${res.status} (${normalizedPath})`;
    const violations = body.violations as string[] | undefined;
    throw new ApiError(res.status, message, violations);
  }

  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

// ── Typed endpoint helpers ────────────────────────────────────────────────────

export interface BatchListParams {
  farmerId?: string;
  status?: string;
}

export interface CreateBatchPayload {
  farmerId: string;
  farmerName: string;
  floraType: string;
  weightKg: number;
  moisturePct: number;
  latitude: string;
  longitude: string;
  grade: 'A' | 'B';
  harvestDate: string;
}

export const batchesApi = {
  list:   (params?: BatchListParams) => {
    const qs = new URLSearchParams();
    if (params?.farmerId) qs.set('farmerId', params.farmerId);
    if (params?.status)   qs.set('status',   params.status);
    const query = qs.toString();
    return apiGet<Batch[]>(`/api/batches${query ? `?${query}` : ''}`);
  },
  get:    (id: string)   => apiGet<Batch>(`/api/batches/${id}`),
  create: (payload: CreateBatchPayload) =>
    apiPost<{ data: Batch }>('/api/batches', payload),
  patch:  (id: string, payload: Partial<Batch>) =>
    apiPatch<Batch>(`/api/batches/${id}`, payload),
};

export const labApi = {
  list:      ()          => apiGet<LabResult[]>('/api/lab'),
  getByBatch:(batchId: string) => apiGet<LabResult>(`/api/lab/${batchId}`),
  publish:   (payload: Omit<LabResult, 'publishedAt'>) =>
    apiPost<{ data: LabResult; violations: string[] }>('/api/lab', payload),
};

export const recallsApi = {
  list:   ()        => apiGet<RecallEvent[]>('/api/recalls'),
  create: (payload: Omit<RecallEvent, 'id' | 'initiatedAt' | 'initiatedBy'>) =>
    apiPost<{ data: RecallEvent }>('/api/recalls', payload),
};

export const authApi = {
  login:  (email: string, password: string, role: string) =>
    apiPost<{ success: boolean; role: string }>('/api/auth', { email, password, role }),
  register: (payload: { name: string; email: string; password: string; role: string }) =>
    apiPost<{ token: string; user: { id: string; name: string; email: string; role: string; kycCompleted: boolean } }>('/api/auth/register', payload),
  logout: () => apiDelete<{ success: boolean }>('/api/auth'),
};
