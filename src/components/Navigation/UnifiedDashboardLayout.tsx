'use client';

import React from 'react';
import { Content } from '@carbon/react';

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
  return (
    <div className="min-h-screen bg-[var(--background)]">
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
