'use client';

import React, { useState } from 'react';
import { MessageCircle, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge, SplitWorkspace } from './ui';
import type { DbMessage } from './types';

const STATUS_COLORS: Record<string, 'green' | 'yellow' | 'red' | 'default'> = {
  sent: 'green', queued: 'yellow', processing: 'yellow', failed: 'red',
};

export function InboxWorkspace({ messages, isLoading }: { messages: DbMessage[]; isLoading: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derived, not synced via effect: falls back to the first message whenever the
  // explicit selection is empty or no longer exists in the list.
  const effectiveSelectedId = messages.some(m => m.id === selectedId) ? selectedId : messages[0]?.id ?? null;
  const selected = messages.find(m => m.id === effectiveSelectedId) ?? null;

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <SplitWorkspace
      left={
        <>
          <div className="p-3 border-b border-[var(--border-subtle)] shrink-0">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {messages.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-[var(--text-tertiary)]" />
                <p className="text-xs text-[var(--text-secondary)]">No DMs yet — automations will log here when they fire.</p>
              </div>
            ) : messages.map(m => {
              const recipient = m.recipient_username ? `@${m.recipient_username}` : m.recipient_ig_user_id ?? 'Unknown';
              const statusColor = STATUS_COLORS[m.status] ?? 'default';
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                    m.id === effectiveSelectedId ? 'bg-[var(--brand)]/5' : 'hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${m.id === effectiveSelectedId ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{recipient}</p>
                    <Badge color={statusColor}>{m.status}</Badge>
                  </div>
                  {m.message_text && <p className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-1">{m.message_text}</p>}
                </button>
              );
            })}
          </div>
        </>
      }
      right={
        selected ? (
          <Card>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--text-on-brand)] text-sm font-bold shrink-0">
                  {(selected.recipient_username ?? selected.recipient_ig_user_id ?? 'U')[0]?.toUpperCase() ?? 'U'}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">{selected.recipient_username ? `@${selected.recipient_username}` : selected.recipient_ig_user_id ?? 'Unknown'}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge color={STATUS_COLORS[selected.status] ?? 'default'}>
                      {selected.status === 'sent' && <CheckCircle2 className="w-3 h-3" />}
                      {selected.status === 'failed' && <XCircle className="w-3 h-3" />}
                      {(selected.status === 'queued' || selected.status === 'processing') && <Clock className="w-3 h-3" />}
                      {selected.status}
                    </Badge>
                    <Badge color="default">{selected.message_type.replace(/_/g, ' ')}</Badge>
                    {selected.simulated && <Badge color="yellow">Simulated</Badge>}
                  </div>
                </div>
              </div>
              <span className="text-xs text-[var(--text-tertiary)] shrink-0">
                {new Date(selected.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>

            {selected.message_text && (
              <div className="mt-5 pt-5 border-t border-[var(--border-subtle)]">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Message</p>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{selected.message_text}</p>
              </div>
            )}

            {selected.status === 'failed' && selected.last_error && (
              <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[var(--radius-md)] text-xs text-[var(--danger)]">
                <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {selected.last_error}
              </div>
            )}

            {selected.instaauto_automations?.name && (
              <p className="text-xs text-[var(--brand)] mt-4 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> {selected.instaauto_automations.name}</p>
            )}
          </Card>
        ) : (
          <Card>
            <EmptyState icon={MessageCircle} title="No message selected" description="Sent and queued DMs from your automations will show up here." />
          </Card>
        )
      }
    />
  );
}
