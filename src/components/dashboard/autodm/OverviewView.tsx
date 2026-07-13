'use client';

import React from 'react';
import { Zap, Send, Users, MessageSquare, Plus, MessageCircle, Sparkles, ChevronRight } from 'lucide-react';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SimulatePanel } from './SimulatePanel';
import { Badge } from './ui';
import type { Automation, View } from './types';

const QUICK_ACTIONS: { label: string; desc: (n: number) => string; icon: React.ElementType; view: View }[] = [
  { label: 'Create Automation', desc: () => 'Set up keywords and triggers', icon: Plus, view: 'automations' },
  { label: 'View Leads', desc: n => `${n} people captured`, icon: Users, view: 'leads' },
  { label: 'DM Inbox', desc: n => `${n} messages sent`, icon: MessageCircle, view: 'inbox' },
  { label: 'Templates', desc: () => 'Start from a ready-made setup', icon: Sparkles, view: 'templates' },
];

export function OverviewView({ automations, onNavigate, totalLeads, totalSent, isSimulated }: {
  automations: Automation[];
  onNavigate: (v: View) => void;
  totalLeads: number;
  totalSent: number;
  isSimulated: boolean;
}) {
  const totalComments = automations.reduce((s, a) => s + a.commentCount, 0);
  const activeCount = automations.filter(a => a.active).length;

  return (
    <div className="space-y-6">
      <KpiGrid>
        <StatCard icon={Zap} label="Active Automations" value={activeCount} subValue={`of ${automations.length} total`} />
        <StatCard icon={Send} label="DMs Sent" value={totalSent.toLocaleString()} subValue="all time" />
        <StatCard icon={Users} label="Leads Captured" value={totalLeads} subValue="from all sources" />
        <StatCard icon={MessageSquare} label="Comments Replied" value={totalComments.toLocaleString()} subValue="auto-replies" />
      </KpiGrid>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUICK_ACTIONS.map(q => {
          const count = q.view === 'leads' ? totalLeads : totalSent;
          return (
            <button
              key={q.label}
              onClick={() => onNavigate(q.view)}
              className="group bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-200 p-5 text-left flex items-center gap-4 hover:border-[var(--brand)]/40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                <q.icon className="w-5 h-5 text-[var(--brand)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">{q.label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{q.desc(count)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          );
        })}
      </div>

      {isSimulated && <SimulatePanel />}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Recent Automations</h3>
          <button onClick={() => onNavigate('automations')} className="text-xs text-[var(--brand)] hover:opacity-80 font-semibold flex items-center gap-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {automations.length === 0 ? (
          <Card>
            <EmptyState icon={Zap} title="No automations yet" description="Create your first comment-to-DM automation to start capturing leads." action={
              <button onClick={() => onNavigate('automations')} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold px-4 py-2 rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                Create Automation
              </button>
            } />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {automations.slice(0, 5).map(a => (
              <button
                key={a.id}
                onClick={() => onNavigate('automations')}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-5 hover:border-[var(--brand)]/30 hover:shadow-[var(--shadow-xs)] transition-all duration-200 py-3.5 flex items-center gap-4 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${a.active ? 'bg-[var(--success)] shadow-[0_0_6px_var(--success)]' : 'bg-[var(--border)]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{a.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{a.dmCount} DMs · {a.keywords.length} keywords{a.requireFollow ? ' · Follow-gated' : ''}</p>
                </div>
                <Badge color={a.active ? 'green' : 'default'}>{a.active ? 'Active' : 'Paused'}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
