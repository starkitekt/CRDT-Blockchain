import { NextRequest, NextResponse } from 'next/server';
import { LoginSchema } from '@/lib/validation/auth.schema';
import { loginUser } from '@/lib/services/auth.service';
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit';


const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours


export async function POST(req: NextRequest) {
  // ── Rate limit gate ─────────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1';

  const { allowed, retryAfterSeconds } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    );
  }

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

    // ── Success — reset rate limit counter for this IP ────────────────────
    resetRateLimit(ip);

    const response = NextResponse.json({ success: true, role: confirmedRole });
    response.cookies.set('honeytrace_role', confirmedRole, cookieOpts);
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
  response.cookies.delete('honeytrace_role');
  response.cookies.delete('honeytrace_token');
  return response;
}