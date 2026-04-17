'use client';

import React from 'react';
import { Content } from '@carbon/react';
import { usePathname, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

interface UnifiedDashboardLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
}

/**
 * UnifiedDashboardLayout
 * Enforces a containerized max-width and consistent spacing grid.
 */
export default function UnifiedDashboardLayout({ children, header, sidebar }: UnifiedDashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isApprovalPending, setIsApprovalPending] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const verifyAccess = async () => {
      try {
        const res = await fetch('/api/auth', { method: 'GET', credentials: 'include' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const err = String((body as { error?: string }).error ?? '');
          if (res.status === 403 && err.toLowerCase().includes('kyc')) {
            if (!cancelled) setIsApprovalPending(true);
            window.setTimeout(async () => {
              try {
                await authApi.logout();
              } catch {
                // continue redirect even if logout API fails
              }
              if (!cancelled) router.push('/');
            }, 2200);
          }
        }
      } catch {
        // ignore network errors here
      }
    };

    // Skip this guard on secretary dashboards.
    if (!pathname.includes('/dashboard/secretary')) {
      void verifyAccess();
    }

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {isApprovalPending && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Waiting for approval</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your account is pending KYC approval from the government secretary.
              You will be logged out now. Please try again after approval.
            </p>
          </div>
        </div>
      )}
      <div className="flex">
        {sidebar && (
          <aside className="hidden lg:block w-64 border-r border-border-subtle bg-surface sticky top-12 h-[calc(100vh-3rem)]">
            {sidebar}
          </aside>
        )}
        <Content className="flex-1 !p-0 !bg-transparent">
          <div className="dashboard-container">
            {header && (
              <header className="mb-spacing-xl">
                {header}
              </header>
            )}
            <main className="flex flex-col gap-spacing-xl">
              {children}
            </main>
          </div>
        </Content>
      </div>
    </div>
  );
}
