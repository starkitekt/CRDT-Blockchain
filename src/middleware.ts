// src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; // ← edge-compatible, no jsonwebtoken
import { routing } from './i18n/routing';


// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS =
  process.env.NODE_ENV === 'production'
    ? [
        process.env.NEXT_PUBLIC_APP_URL ?? '',
        'https://www.honeytrace.in',
      ].filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

function withCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin') ?? '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  }
  res.headers.set('Vary', 'Origin');
  return res;
}


// ── RBAC ──────────────────────────────────────────────────────────────────────
const ROLE_PATHS: Record<string, string[]> = {
  farmer:     ['/dashboard/farmer'],
  warehouse:  ['/dashboard/warehouse'],
  lab:        ['/dashboard/lab'],
  officer:    ['/dashboard/officer'],
  enterprise: ['/dashboard/enterprise'],
  consumer:   ['/dashboard/consumer'],
  secretary:  ['/dashboard/secretary'],
  admin:      ['/dashboard'],
};

// ── JWT verification (jose — Edge Runtime safe) ───────────────────────────────
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '');

async function verifyJwt(token: string): Promise<{ role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { role: string };
  } catch {
    return null;
  }
}


const intlMiddleware = createMiddleware(routing);


export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. CORS preflight (OPTIONS /api/*)
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') ?? '';
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin',
        ...CORS_HEADERS,
      },
    });
  }

  // 2. CORS on actual API responses
  if (pathname.startsWith('/api/')) {
    return withCors(request, NextResponse.next());
  }

  // 3. RBAC guard on dashboard routes
  const pathWithoutLocale = pathname.replace(/^\/(en|hi)/, '');

  if (pathWithoutLocale.startsWith('/dashboard')) {
    const token = request.cookies.get('honeytrace_token')?.value;
    const roleCookie = request.cookies.get('honeytrace_role')?.value;

    // ── Both cookies must exist ───────────────────────────────────────────────
    if (!token || !roleCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // ── JWT must be valid and role must match the cookie ──────────────────────
    const payload = await verifyJwt(token);
    if (!payload || payload.role !== roleCookie) {
      // Token invalid or role cookie tampered — clear both and redirect
      const redirectRes = NextResponse.redirect(new URL('/', request.url));
      redirectRes.cookies.delete('honeytrace_token');
      redirectRes.cookies.delete('honeytrace_role');
      return redirectRes;
    }

    const role = payload.role;
    const allowed = ROLE_PATHS[role] ?? [];
    const hasAccess = role === 'admin' || allowed.some(p => pathWithoutLocale.startsWith(p));

    if (!hasAccess) {
      const ownPath = ROLE_PATHS[role]?.[0] ?? '/';
      const locale = pathname.startsWith('/hi') ? '/hi' : '/en';
      return NextResponse.redirect(new URL(`${locale}${ownPath}`, request.url));
    }
  }

  // 4. next-intl locale routing (page routes)
  return withCors(request, intlMiddleware(request) as NextResponse);
}


export const config = {
  matcher: [
    '/api/:path*',
    '/',
    '/(hi|en)/:path*',
    '/dashboard/:path*',   // ← was missing: bare /dashboard paths now guarded
  ],
};