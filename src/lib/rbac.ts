import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from './auth';

export type UserRole =
  | 'farmer' | 'warehouse' | 'lab' | 'officer'
  | 'enterprise' | 'consumer' | 'secretary' | 'admin';

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Reads JWT from cookie and returns decoded payload or null */
export function getAuthUser(req: NextRequest): JWTPayload | null {
  const token = req.cookies.get('honeytrace_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Throws AuthError if:
 * - No valid JWT found → 401
 * - Role not in allowedRoles → 403
 */
export function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[]
): JWTPayload {
  const user = getAuthUser(req);
  if (!user) throw new AuthError(401, 'Unauthorized');
  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    throw new AuthError(403, 'Forbidden: insufficient role');
  }
  return user;
}

/** Converts AuthError → NextResponse. Use in every catch block. */
export function handleAuthError(err: AuthError): NextResponse {
  return NextResponse.json({ error: err.message }, { status: err.status });
}
