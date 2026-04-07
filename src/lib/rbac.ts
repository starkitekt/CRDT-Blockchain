// src/lib/rbac.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from '@/lib/auth';

export type AuthPayload = JWTPayload;

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Roles that are never blocked by KYC — they manage KYC themselves
const KYC_EXEMPT_ROLES = new Set(['admin', 'secretary', 'consumer']);

export function requireAuth(
  req: NextRequest,
  allowedRoles?: string[]
): AuthPayload {
  // ── Accept cookie OR Authorization: Bearer header ──────────────────────
  const cookieToken = req.cookies.get('honeytrace_token')?.value;
  const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const token = cookieToken ?? bearerToken;

  if (!token) throw new AuthError(401, 'Authentication required');

  const payload = verifyToken(token);
  if (!payload) throw new AuthError(401, 'Invalid or expired token');

  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    throw new AuthError(403, `Access denied. Required role: ${allowedRoles.join(' or ')}`);
  }

  // ── KYC gate ────────────────────────────────────────────────────────────
  // Non-exempt operational roles must have KYC approved.
  if (!KYC_EXEMPT_ROLES.has(payload.role) && !payload.kycCompleted) {
    throw new AuthError(403, 'KYC verification required. Please complete your profile.');
  }
  // ────────────────────────────────────────────────────────────────────────

  return payload;
}

export function handleAuthError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error('[AuthError]', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
