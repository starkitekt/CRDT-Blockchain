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

  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const headers = isFormData
    ? { ...(init?.headers ?? {}) }
    : {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      };

  const res = await fetch(normalizedPath, {
    ...init,
    headers,
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
  const payload = (typeof FormData !== 'undefined' && body instanceof FormData)
    ? body
    : JSON.stringify(body);
  return request<T>(path, { method: 'POST', body: payload });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const payload = (typeof FormData !== 'undefined' && body instanceof FormData)
    ? body
    : JSON.stringify(body);
  return request<T>(path, { method: 'PATCH', body: payload });
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
  warehouseId?: string;
  images?: Array<{ url: string; latitude: number | null; longitude: number | null }>;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  batchId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface WarehouseOption {
  id: string;
  name: string;
  location: string | null;
  totalCapacity: number | null;
  remainingCapacity: number | null;
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
  create: (payload: CreateBatchPayload | FormData) =>
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
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    profile?: {
      kisanCard?: string;
      aadhaarNumber?: string;
      panNumber?: string;
      farmLocation?: {
        village: string;
        district: string;
        state: string;
        geo?: [number, number];
      };
      honeyProductionCapacity?: number;
      organicCertified?: boolean;
      warehouseName?: string;
      registrationNumber?: string;
      location?: {
        address: string;
        city: string;
        state: string;
        pincode: string;
        geo?: [number, number];
      };
      storageCapacity?: number;
      currentUtilization?: number;
      temperatureControlled?: boolean;
      humidityControl?: boolean;
      labName?: string;
      fssaiLabNumber?: string;
      certifications?: string[];
      testingCapabilities?: {
        purityTest: boolean;
        adulterationTest: boolean;
        moistureTest: boolean;
      };
      authorityLevel?: 'regional' | 'state' | 'national';
      labAffiliation?: string;
      companyName?: string;
      companyPan?: string;
      businessType?: 'buyer' | 'processor' | 'exporter';
      contactPerson?: {
        name: string;
        designation: string;
      };
      facilityLocation?: {
        address: string;
        city: string;
        state: string;
      };
      processingCapacity?: number;
      jurisdiction?: {
        level: 'district' | 'state' | 'national';
        region: string;
      };
      permissions?: {
        approveStakeholders: boolean;
        auditAccess: boolean;
        complianceControl: boolean;
      };
      preferences?: {
        organicOnly: boolean;
        preferredRegions: string[];
      };
    };
  }) =>
    apiPost<{ token: string; user: { id: string; name: string; email: string; role: string; kycCompleted: boolean } }>('/api/auth/register', payload),
  logout: () => apiDelete<{ success: boolean }>('/api/auth'),
};

export const notificationsApi = {
  list: () => apiGet<NotificationsResponse>('/api/notifications'),
  markRead: (notificationId: string) =>
    apiPatch<{ id: string; isRead: boolean }>('/api/notifications/read', { notificationId }),
  markAllRead: () =>
    apiPatch<{ all: true; modifiedCount: number }>('/api/notifications/read', { all: true }),
};

export const warehousesApi = {
  list: () => apiGet<WarehouseOption[]>('/api/warehouses'),
};
