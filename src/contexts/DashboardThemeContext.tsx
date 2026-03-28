'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
});

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    let stored = localStorage.getItem('dashboard-theme') as Theme | null;
    if (!stored) {
      stored = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      localStorage.setItem('dashboard-theme', stored);
    }
    setTheme(stored);
  }, []);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('dashboard-theme', newTheme);
    
    // Immediately update DOM without needing a refresh
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.getElementById('dashboard-root')?.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.getElementById('dashboard-root')?.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              let stored = localStorage.getItem('dashboard-theme');
              if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark'); // Global
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {}
          `,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              let stored = localStorage.getItem('dashboard-theme');
              if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.getElementById('dashboard-root')?.classList.add('dark');
              } else {
                document.getElementById('dashboard-root')?.classList.remove('dark');
              }
            } catch (e) {}
          `,
        }}
      />
      <div 
        id="dashboard-root"
        suppressHydrationWarning
        className={`min-h-screen flex flex-col md:flex-row${theme === 'dark' ? ' dark' : ''}`}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
