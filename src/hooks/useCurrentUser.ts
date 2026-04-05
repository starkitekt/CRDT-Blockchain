'use client';

import { useMemo } from 'react';

export interface CurrentUser {
  userId:       string;
  email:        string;
  role:         string;
  name:         string;
  kycCompleted: boolean;
}

const EMPTY: CurrentUser = {
  userId:       '',
  email:        '',
  role:         '',
  name:         '',
  kycCompleted: false,
};

function parseCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : '';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function useCurrentUser(): CurrentUser {
  return useMemo(() => {
    const token = parseCookie('honeytrace_token');
    if (!token) return EMPTY;

    const payload = decodeJwtPayload(token);
    if (!payload) return EMPTY;

    return {
      userId:       (payload.userId  as string)  ?? (payload.sub as string) ?? '',
      email:        (payload.email   as string)  ?? '',
      role:         (payload.role    as string)  ?? '',
      name:         (payload.name    as string)  ?? (payload.email as string) ?? '',
      kycCompleted: (payload.kycCompleted as boolean) ?? false,
    };
  }, []);
}
