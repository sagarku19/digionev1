'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type HoverPrefetchLinkProps = Omit<React.ComponentProps<typeof Link>, 'prefetch'>;

// next/link that skips the on-load viewport prefetch and only prefetches once
// the user shows intent (hover or keyboard focus). Used for rarely visited
// dashboard links so a single dashboard load doesn't fan out a prefetch request
// per sidebar item. On touch devices there is no hover, so these links simply
// don't prefetch — tap navigates normally.
export default function HoverPrefetchLink({
  onMouseEnter,
  onFocus,
  ...props
}: HoverPrefetchLinkProps) {
  const [intent, setIntent] = useState(false);

  return (
    <Link
      {...props}
      prefetch={intent ? undefined : false}
      onMouseEnter={(e) => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        setIntent(true);
        onFocus?.(e);
      }}
    />
  );
}
