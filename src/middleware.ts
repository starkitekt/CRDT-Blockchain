import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * Role-based route guard.
 *
 * Reads a `honeytrace_role` cookie set on login.
 * In production replace with NextAuth session check.
 *
 * Allowed paths per role:
 *   farmer      → /dashboard/farmer
 *   warehouse   → /dashboard/warehouse
 *   lab         → /dashboard/lab
 *   officer     → /dashboard/officer
 *   enterprise  → /dashboard/enterprise
 *   consumer    → /dashboard/consumer
 *   secretary   → /dashboard/secretary
 *   admin       → /dashboard/* (all)
 */
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

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix for role check  (/en/dashboard/farmer → /dashboard/farmer)
  const pathWithoutLocale = pathname.replace(/^\/(en|hi)/, '');

  if (pathWithoutLocale.startsWith('/dashboard')) {
    const role = request.cookies.get('honeytrace_role')?.value;

    if (!role) {
      // Not authenticated → redirect to login
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const allowed = ROLE_PATHS[role] ?? [];
    const hasAccess = role === 'admin' || allowed.some(p => pathWithoutLocale.startsWith(p));

    if (!hasAccess) {
      // Authenticated but wrong role → redirect to own dashboard
      const ownPath = ROLE_PATHS[role]?.[0] ?? '/';
      const locale = pathname.startsWith('/hi') ? '/hi' : '/en';
      const redirectUrl = new URL(`${locale}${ownPath}`, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(hi|en)/:path*'],
};
