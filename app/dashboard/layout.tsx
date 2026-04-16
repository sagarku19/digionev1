'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { DashboardThemeProvider } from '@/contexts/DashboardThemeContext';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEditorPage = pathname?.startsWith('/dashboard/sites/edit');

  if (isEditorPage) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[var(--bg-primary)]">
        {children}
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-[248px] min-w-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
        <TopBar />
        <main className="flex-1 px-4 md:px-6 pb-20 overflow-x-hidden bg-[var(--bg-primary)]">
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardThemeProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardThemeProvider>
  );
}
