'use client';

import React from 'react';
import { Send, MessageSquare, Users, XCircle, BarChart3 } from 'lucide-react';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import type { Automation } from './types';

export function AnalyticsView({ automations, totalLeads, totalSent, totalFailed }: {
  automations: Automation[];
  totalLeads: number;
  totalSent: number;
  totalFailed: number;
}) {
  const totalDMs = automations.reduce((s, a) => s + a.dmCount, 0);
  const totalComments = automations.reduce((s, a) => s + a.commentCount, 0);
  const deliveryRate = totalSent + totalFailed > 0
    ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <KpiGrid>
        <StatCard icon={Send} label="Total DMs Sent" value={totalSent} />
        <StatCard icon={MessageSquare} label="Comments Replied" value={totalComments} />
        <StatCard icon={Users} label="Leads Captured" value={totalLeads} />
        <StatCard icon={XCircle} label="Failed DMs" value={totalFailed} />
      </KpiGrid>

      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-5">Per-Automation Performance</h3>
        {automations.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No automations yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {automations.map(a => {
              const dmPct = totalDMs ? Math.round((a.dmCount / totalDMs) * 100) : 0;
              return (
                <div key={a.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">{a.name}</span>
                    <span className="text-[var(--text-tertiary)]">{a.dmCount} DMs · {a.commentCount} comments · {dmPct}%</span>
                  </div>
                  <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--brand)] rounded-full transition-all" style={{ width: `${dmPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">DM Delivery Rate</h3>
        {totalSent + totalFailed === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)]">No DMs sent yet.</p>
        ) : (
          <>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-[var(--text-primary)]">{deliveryRate}<span className="text-xl text-[var(--brand)]">%</span></p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">of DMs delivered successfully ({totalSent} sent, {totalFailed} failed)</p>
            </div>
            <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--success)] rounded-full" style={{ width: `${deliveryRate}%` }} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
