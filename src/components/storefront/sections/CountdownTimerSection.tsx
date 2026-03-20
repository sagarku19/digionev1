'use client';
// CountdownTimerSection — real-time countdown with expire actions.
// No DB tables (data from settings)

import React, { useEffect, useState } from 'react';

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function CountdownTimerSection({ settings }: { settings: any }) {
  const targetDate = settings?.target_date ? new Date(settings.target_date) : new Date(Date.now() + 7 * 86400000);
  const title = settings?.title ?? 'Offer ends in';
  const expireAction = settings?.expire_action ?? 'hide'; // 'hide' | 'message' | 'redirect'
  const expireMessage = settings?.expire_message ?? 'This offer has expired.';
  const expireRedirect = settings?.expire_redirect ?? '/';

  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        if (expireAction === 'redirect') window.location.href = expireRedirect;
        return;
      }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (expired && expireAction === 'hide') return null;
  if (expired) return (
    <section className="py-12 bg-[--creator-surface] text-center">
      <p className="text-[--creator-text] font-semibold text-lg">{expireMessage}</p>
    </section>
  );

  const blocks = [
    { label: 'Days',  value: timeLeft.d },
    { label: 'Hours', value: timeLeft.h },
    { label: 'Min',   value: timeLeft.m },
    { label: 'Sec',   value: timeLeft.s },
  ];

  return (
    <section className="py-12 bg-[--creator-primary]/5 border-y border-[--creator-primary]/20">
      <div className="max-w-3xl mx-auto px-4 text-center">
        {title && <p className="text-sm font-semibold uppercase tracking-widest text-[--creator-primary] mb-6">{title}</p>}
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {blocks.map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[--creator-primary] rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">{pad(value)}</span>
              </div>
              <span className="text-xs font-medium text-[--creator-text-muted] mt-2">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
