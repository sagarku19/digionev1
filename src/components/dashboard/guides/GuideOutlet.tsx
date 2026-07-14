'use client';

import type { ReactNode } from 'react';
import { useGuide } from './GuideProvider';
import { GuideScreen } from './GuideScreen';

export function GuideOutlet({ children }: { children: ReactNode }) {
  const { activeGuideKey } = useGuide();
  return activeGuideKey ? <GuideScreen guideKey={activeGuideKey} /> : <>{children}</>;
}
