import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row">
      {/* 
        Fixed Sidebar 
        (Implementation details inside the component mapping 240px and mobile toggles) 
      */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col md:pl-[240px] min-w-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
        <TopBar />

        <main className="flex-1 px-4 md:px-6 pb-20 overflow-x-hidden">
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
