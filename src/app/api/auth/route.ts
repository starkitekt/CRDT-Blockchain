import { NextRequest, NextResponse } from 'next/server';

const VALID_ROLES = ['farmer', 'warehouse', 'lab', 'officer', 'enterprise', 'consumer', 'secretary', 'admin'];

/**
 * POST /api/auth — minimal credential check and role cookie issuance.
 *
 * Body: { email: string; password: string; role: string }
 *
 * In production: validate against a real user store + hash comparison.
 * For now, accepts any non-empty credentials and sets the role cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, role } = await req.json() as { email: string; password: string; role: string };

    if (!email || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid credentials or role' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, role });
    response.cookies.set('honeytrace_role', role, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

/** DELETE /api/auth — logout (clear cookie) */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('honeytrace_role');
  return response;
}
