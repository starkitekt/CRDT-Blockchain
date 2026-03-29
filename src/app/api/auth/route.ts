import { NextRequest, NextResponse } from 'next/server';
import { LoginSchema } from '@/lib/validation/auth.schema';
import { loginUser } from '@/lib/services/auth.service';

const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { email, password, role } = parsed.data;
    const { role: confirmedRole, token } = await loginUser(email, password, role);

    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === 'production',
    };

    const response = NextResponse.json({ success: true, role: confirmedRole });
    // Preserve original honeytrace_role cookie — required by src/middleware.ts
    response.cookies.set('honeytrace_role', confirmedRole, cookieOpts);
    // New JWT cookie — used by API-level RBAC
    response.cookies.set('honeytrace_token', token, cookieOpts);
    return response;

  } catch (err: any) {
    if (['INVALID_CREDENTIALS', 'ROLE_MISMATCH', 'INVALID_ROLE'].includes(err.message)) {
      return NextResponse.json({ error: 'Invalid credentials or role' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  // Preserve original delete pattern
  response.cookies.delete('honeytrace_role');
  response.cookies.delete('honeytrace_token');
  return response;
}
