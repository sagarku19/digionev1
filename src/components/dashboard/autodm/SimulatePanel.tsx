'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Send, CheckCircle2, XCircle } from 'lucide-react';
import type { SimulateEventType } from './types';

// Demo-account-only control: fires a synthetic comment/DM/story-reply event through
// the real inbound pipeline so a creator without a live Instagram connection can see
// automations, leads, and the DM log populate end to end.
export function SimulatePanel() {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState<SimulateEventType>('comment');
  const [text, setText] = useState('');
  const [igUsername, setIgUsername] = useState('');

  const { mutate, isPending, isSuccess, isError } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instaauto/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, text: text || eventType, igUsername: igUsername || undefined }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Simulate failed');
      }
    },
    onSuccess: () => {
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['instaauto'] });
      }, 1200);
      setText('');
      setIgUsername('');
    },
  });

  return (
    <div className="bg-[var(--surface)] border border-[var(--brand)]/30 rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-[var(--brand)]" />
        <p className="text-sm font-bold text-[var(--text-primary)]">Simulate Event <span className="text-xs font-normal text-[var(--text-tertiary)]">(demo mode)</span></p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={eventType}
          onChange={e => setEventType(e.target.value as SimulateEventType)}
          className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
        >
          <option value="comment">Comment</option>
          <option value="dm">DM</option>
          <option value="story_reply">Story Reply</option>
        </select>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Keyword / message text..."
          className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
        />
        <input
          value={igUsername}
          onChange={e => setIgUsername(e.target.value)}
          placeholder="Username (optional)"
          className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-bold px-4 py-2 rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
        >
          <Send className="w-3.5 h-3.5" /> {isPending ? 'Sending…' : 'Fire event'}
        </button>
        {isSuccess && <span className="text-xs text-[var(--success)] font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Sent — refreshing in 1s</span>}
        {isError && <span className="text-xs text-[var(--danger)] font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Failed</span>}
      </div>
    </div>
  );
}
