'use client';
// PreviewBridge — listens for postMessage from the visual editor
// and applies live updates (theme colors, etc.) without a page reload.

import { useEffect } from 'react';

type PreviewMessage =
  | { type: 'theme-update'; palette: Record<string, string> }
  | { type: 'ping' };

export default function PreviewBridge() {
  useEffect(() => {
    const handler = (e: MessageEvent<PreviewMessage>) => {
      // Only accept messages from same origin
      if (e.origin !== window.location.origin) return;

      const msg = e.data;
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

      if (msg.type === 'theme-update' && msg.palette) {
        const root = document.documentElement;
        const map: Record<string, string> = {
          primary: '--creator-primary',
          secondary: '--creator-secondary',
          accent: '--creator-accent',
          surface: '--creator-surface',
          text: '--creator-text',
          muted: '--creator-text-muted',
          background: '--creator-bg',
        };
        Object.entries(msg.palette).forEach(([key, val]) => {
          const cssVar = map[key];
          if (cssVar && val) root.style.setProperty(cssVar, val);
        });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return null;
}
