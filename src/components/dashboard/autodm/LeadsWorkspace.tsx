'use client';

import React, { useState } from 'react';
import { Search, Users, Download, UserCheck, Mail, Zap, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge, SplitWorkspace } from './ui';
import type { Automation, DbLead } from './types';

const SOURCE_COLORS: Record<string, 'pink' | 'blue' | 'yellow' | 'default'> = {
  comment: 'pink', dm: 'blue', story_mention: 'yellow', story_reply: 'yellow',
};

export function LeadsWorkspace({ leads, isLoading, automations }: {
  leads: DbLead[];
  isLoading: boolean;
  automations: Automation[];
}) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derived, not synced via effect: falls back to the first lead whenever the
  // explicit selection is empty or no longer exists in the list.
  const effectiveSelectedId = leads.some(l => l.id === selectedId) ? selectedId : leads[0]?.id ?? null;

  const filtered = leads.filter(l =>
    (sourceFilter === 'all' || l.first_source === sourceFilter) &&
    (l.ig_username ?? l.ig_user_id).toLowerCase().includes(search.toLowerCase())
  );
  const selected = leads.find(l => l.id === effectiveSelectedId) ?? null;
  const automationName = selected?.first_automation_id
    ? automations.find(a => a.id === selected.first_automation_id)?.name
    : undefined;

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>;
  }

  return (
    <SplitWorkspace
      left={
        <>
          <div className="p-3 border-b border-[var(--border-subtle)] space-y-2.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username..."
                className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition" />
            </div>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
              className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition">
              <option value="all">All Sources</option>
              <option value="comment">Comment</option>
              <option value="dm">DM</option>
              <option value="story_reply">Story Reply</option>
              <option value="story_mention">Story Mention</option>
            </select>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-[var(--text-tertiary)]" />
                <p className="text-xs text-[var(--text-secondary)]">{leads.length === 0 ? 'No leads yet' : 'No matches'}</p>
              </div>
            ) : filtered.map(l => {
              const username = l.ig_username ?? l.ig_user_id;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] flex items-center gap-3 ${
                    l.id === effectiveSelectedId ? 'bg-[var(--brand)]/5' : 'hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--text-on-brand)] text-xs font-bold shrink-0">
                    {username[0]?.toUpperCase() ?? 'I'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${l.id === effectiveSelectedId ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>@{username}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{(l.first_source ?? 'unknown').replace(/_/g, ' ')}</p>
                  </div>
                  {l.is_follower && <UserCheck className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      }
      right={
        selected ? (
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--text-on-brand)] text-base font-bold shrink-0">
                {(selected.ig_username ?? selected.ig_user_id)[0]?.toUpperCase() ?? 'I'}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">@{selected.ig_username ?? selected.ig_user_id}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge color={SOURCE_COLORS[selected.first_source ?? ''] ?? 'default'}>{(selected.first_source ?? 'unknown').replace(/_/g, ' ')}</Badge>
                  {selected.is_follower ? <Badge color="green"><UserCheck className="w-3 h-3" /> Follower</Badge> : <Badge color="default">Not confirmed following</Badge>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
              {selected.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {selected.email}</div>}
              <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> {selected.interaction_count} interaction{selected.interaction_count !== 1 ? 's' : ''}</div>
              {automationName && <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> First: {automationName}</div>}
              <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Captured {new Date(selected.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
              {selected.last_user_message_at && (
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Last active {new Date(selected.last_user_message_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <EmptyState icon={Users} title="No lead selected" description="Leads captured from comments, DMs, and story replies will show up here." />
          </Card>
        )
      }
    />
  );
}
