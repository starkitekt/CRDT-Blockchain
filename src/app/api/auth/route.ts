import { NextRequest, NextResponse } from 'next/server';
import { LoginSchema } from '@/lib/validation/auth.schema';
import { loginUser } from '@/lib/services/auth.service';
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit';
import { handleAuthError, AuthError } from '@/lib/rbac';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';


const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours


export async function GET(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('honeytrace_token')?.value;
    const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const token = cookieToken ?? bearerToken;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    // Always do a DB lookup so onboardingCompleted / kycCompleted are fresh
    await connectDB();
    const dbUser = await User.findById(payload.userId).select('onboardingCompleted kycCompleted name').lean();

    return NextResponse.json({
      user: {
        ...payload,
        name: (dbUser as any)?.name ?? payload.email,
        onboardingCompleted: (dbUser as any)?.onboardingCompleted ?? false,
        kycCompleted: (dbUser as any)?.kycCompleted ?? payload.kycCompleted,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return handleAuthError(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


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

    const response = NextResponse.json({ success: true, role: confirmedRole, token });
    response.cookies.set('honeytrace_role', confirmedRole, cookieOpts);
    response.cookies.set('honeytrace_token', token, cookieOpts);
    return response;

  } catch (err: unknown) {
    if (err instanceof Error && ['INVALID_CREDENTIALS', 'ROLE_MISMATCH', 'INVALID_ROLE'].includes(err.message)) {
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
