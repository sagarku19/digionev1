import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { DashboardThemeProvider } from '@/contexts/DashboardThemeContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardThemeProvider>
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-[248px] min-w-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
        <TopBar />
        <main className="flex-1 px-4 md:px-6 pb-20 overflow-x-hidden bg-[var(--bg-primary)]">
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </DashboardThemeProvider>
  );
}
