import React from 'react';

// Passthrough layout — the dashboard layout.tsx already handles
// hiding the sidebar/topbar for /dashboard/sites/edit/* routes.
export default function SiteEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
