'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { GuideKey } from './content';

interface GuideContextValue {
  activeGuideKey: GuideKey | null;
  openGuide: (key: GuideKey) => void;
  closeGuide: () => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider({ children }: { children: ReactNode }) {
  const [activeGuideKey, setActiveGuideKey] = useState<GuideKey | null>(null);
  const pathname = usePathname();
  const [renderedPath, setRenderedPath] = useState(pathname);

  // Close the guide when the route changes (e.g. sidebar navigation to another page).
  if (pathname !== renderedPath) {
    setRenderedPath(pathname);
    if (activeGuideKey) setActiveGuideKey(null);
  }

  const openGuide = useCallback((key: GuideKey) => {
    setActiveGuideKey(key);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, []);

  const closeGuide = useCallback(() => setActiveGuideKey(null), []);

  useEffect(() => {
    if (!activeGuideKey) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveGuideKey(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeGuideKey]);

  return (
    <GuideContext.Provider value={{ activeGuideKey, openGuide, closeGuide }}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide(): GuideContextValue {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error('useGuide must be used within GuideProvider');
  return ctx;
}
