'use client';
// SocialProof section — animated stat counters that run on scroll entry.
// No DB tables (data from settings)

import React, { useEffect, useRef, useState } from 'react';

function useCountUp(target: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function StatItem({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, 1800, visible);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-center px-6">
      <p className="text-4xl md:text-5xl font-extrabold text-[--creator-primary]">
        {count.toLocaleString('en-IN')}{suffix}
      </p>
      <p className="text-sm font-medium text-[--creator-text-muted] mt-2">{label}</p>
    </div>
  );
}

const DEFAULT_STATS = [
  { value: 5000, label: 'Students enrolled',  suffix: '+' },
  { value: 120,  label: 'Products sold',       suffix: '+' },
  { value: 4.9,  label: 'Average rating',      suffix: '★' },
  { value: 98,   label: 'Satisfaction rate',   suffix: '%' },
];

export default function SocialProof({ settings }: { settings: any }) {
  const title = settings?.title ?? '';
  const stats  = settings?.stats ?? DEFAULT_STATS;
  return (
    <section className="py-16 bg-[--creator-surface]">
      {title && <h2 className="text-2xl font-bold text-center text-[--creator-text] mb-10">{title}</h2>}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-y md:divide-y-0 divide-gray-200">
        {stats.map((s: any, i: number) => (
          <StatItem key={i} value={s.value} label={s.label} suffix={s.suffix} />
        ))}
      </div>
    </section>
  );
}
