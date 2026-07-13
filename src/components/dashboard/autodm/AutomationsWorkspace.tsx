'use client';

import React, { useState } from 'react';
import {
  Plus, Search, Zap, Send, MessageSquare, Hash, Bell, Edit3, Trash2,
  UserCheck, Bot,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, Toggle, SplitWorkspace, DmPreviewBubble } from './ui';
import { TRIGGER_ICONS, TRIGGER_LABELS } from './types';
import type { Automation } from './types';

export function AutomationsWorkspace({ automations, onEdit, onToggleActive, onDelete, onCreateNew, isMutating }: {
  automations: Automation[];
  onEdit: (id: string) => void;
  onToggleActive: (a: Automation) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  isMutating: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derived, not synced via effect: falls back to the first automation whenever
  // the explicit selection is empty or no longer exists in the list.
  const effectiveSelectedId = automations.some(a => a.id === selectedId) ? selectedId : automations[0]?.id ?? null;

  const filtered = automations.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  const selected = automations.find(a => a.id === effectiveSelectedId) ?? null;

  return (
    <SplitWorkspace
      left={
        <>
          <div className="p-3 border-b border-[var(--border-subtle)] space-y-2.5 shrink-0">
            <button
              onClick={onCreateNew}
              disabled={isMutating}
              className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold px-4 py-2 rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
            >
              <Plus className="w-4 h-4" /> New Automation
            </button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search automations..."
                className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-30 text-[var(--text-tertiary)]" />
                <p className="text-xs text-[var(--text-secondary)]">{automations.length === 0 ? 'No automations yet' : 'No matches'}</p>
              </div>
            ) : filtered.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                  a.id === effectiveSelectedId ? 'bg-[var(--brand)]/5' : 'hover:bg-[var(--surface-hover)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.active ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />
                  <p className={`text-sm font-medium truncate ${a.id === effectiveSelectedId ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{a.name}</p>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1 pl-3.5">{a.dmCount} DMs · {a.keywords.length} keywords</p>
              </button>
            ))}
          </div>
        </>
      }
      right={
        selected ? (
          <AutomationDetail
            automation={selected}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
            isMutating={isMutating}
          />
        ) : (
          <Card>
            <EmptyState
              icon={Zap}
              title="No automation selected"
              description="Pick one from the list, or create a new comment-to-DM automation."
              action={
                <button onClick={onCreateNew} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold px-4 py-2 rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  New Automation
                </button>
              }
            />
          </Card>
        )
      }
    />
  );
}

function AutomationDetail({ automation: a, onEdit, onToggleActive, onDelete, isMutating }: {
  automation: Automation;
  onEdit: (id: string) => void;
  onToggleActive: (a: Automation) => void;
  onDelete: (id: string) => void;
  isMutating: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${a.active ? 'bg-[var(--brand)]/10' : 'bg-[var(--surface-muted)]'}`}>
              <Zap className={`w-5 h-5 ${a.active ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)]'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">{a.name}</h2>
                <Badge color={a.active ? 'green' : 'default'}>{a.active ? 'Active' : 'Paused'}</Badge>
                <Badge color="default">{a.listener === 'SMARTAI' ? '✦ Smart AI' : '✉ Message'}</Badge>
                {a.requireFollow && <Badge color="blue"><UserCheck className="w-3 h-3" /> Follow-gated</Badge>}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Created {a.createdAt}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Toggle checked={a.active} onChange={() => onToggleActive(a)} />
            <button onClick={() => onEdit(a.id)} className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(a.id)} disabled={isMutating} className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--danger-bg)] text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-40">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><Send className="w-3.5 h-3.5" /> {a.dmCount} DMs sent</div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><MessageSquare className="w-3.5 h-3.5" /> {a.commentCount} comments</div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><Bell className="w-3.5 h-3.5" /> {a.triggers.length} triggers</div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4 text-[var(--text-secondary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Keywords</h3>
        </div>
        {a.keywords.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)]">No keywords set.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {a.keywords.map(k => (
              <span key={k.id} className="px-2 py-0.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-full text-xs text-[var(--text-secondary)]">#{k.word}</span>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Triggers</h3>
        </div>
        {a.triggers.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)]">No triggers set.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {a.triggers.map(t => {
              const Icon = TRIGGER_ICONS[t.type];
              return (
                <span key={t.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)]">
                  <Icon className="w-3.5 h-3.5" /> {TRIGGER_LABELS[t.type]}
                </span>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">DM Preview</h3>
        <DmPreviewBubble text={a.prompt} placeholder="No message written yet." />
      </Card>
    </div>
  );
}
