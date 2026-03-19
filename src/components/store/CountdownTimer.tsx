"use client";

import { useState, useEffect } from 'react';

export interface CountdownTimerProps {
  targetDate: string; // ISO string ideally
  onExpire?: () => void;
  className?: string;
}

export function CountdownTimer({ targetDate, onExpire, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false
  });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    if (isNaN(target)) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft(prev => ({ ...prev, isExpired: true }));
        if (onExpire) onExpire();
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
          isExpired: false
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (timeLeft.isExpired) {
    return <div className={`text-sm font-medium text-[var(--color-danger)] ${className}`}>Offer expired</div>;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TimeUnit value={timeLeft.days} label="d" />
      <span className="text-[var(--color-text-tertiary)] font-bold">:</span>
      <TimeUnit value={timeLeft.hours} label="h" />
      <span className="text-[var(--color-text-tertiary)] font-bold">:</span>
      <TimeUnit value={timeLeft.minutes} label="m" />
      <span className="text-[var(--color-text-tertiary)] font-bold">:</span>
      <TimeUnit value={timeLeft.seconds} label="s" />
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-gray-100 dark:bg-zinc-800 text-[var(--color-text-primary)] rounded-md w-10 h-10 flex items-center justify-center font-display font-medium shadow-sm border border-[var(--color-border)]">
        {value.toString().padStart(2, '0')}
      </div>
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mt-1 font-semibold">{label}</span>
    </div>
  );
}
