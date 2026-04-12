// DigiOne Logo components — light and dark variants.
// DigiOneLogo      → black icon (use on light backgrounds)
// DigiOneLogoDark  → white icon (use on dark backgrounds)

import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

/** Light-background version — icon strokes in #0a0a0a */
export function DigiOneLogo({ width = 42, height = 42, className }: LogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
      aria-label="DigiOne logo"
    >
      <rect x="4"  y="5"  width="36" height="9" rx="4.5" fill="#0a0a0a" />
      <rect x="4"  y="18" width="24" height="9" rx="4.5" fill="#0a0a0a" />
      <rect x="4"  y="31" width="17" height="9" rx="4.5" fill="#0a0a0a" />
      <rect x="32" y="18" width="8"  height="22" rx="4"   fill="#0a0a0a" />
      <circle cx="36" cy="35" r="2.5" fill="#E83A2E" />
    </svg>
  );
}

/** Dark-background version — icon strokes in #ffffff */
export function DigiOneLogoDark({ width = 42, height = 42, className }: LogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 44 44"
      fill="none"
      className={className}
      aria-label="DigiOne logo"
    >
      <rect x="4"  y="5"  width="36" height="9" rx="4.5" fill="#ffffff" />
      <rect x="4"  y="18" width="24" height="9" rx="4.5" fill="#ffffff" />
      <rect x="4"  y="31" width="17" height="9" rx="4.5" fill="#ffffff" />
      <rect x="32" y="18" width="8"  height="22" rx="4"   fill="#ffffff" />
      <circle cx="36" cy="35" r="2.5" fill="#E83A2E" />
    </svg>
  );
}
