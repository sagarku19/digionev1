"use client";

import { useEffect, useRef, ReactNode } from 'react';

type StyleWithVars = React.CSSProperties & { [key: `--${string}`]: string };

export default function InView({ children, className = '', style }: { children: ReactNode; className?: string; style?: StyleWithVars }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.dataset.inview = '1'; obs.disconnect(); } },
      { rootMargin: '-60px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={style} data-inview-root>
      {children}
    </div>
  );
}
