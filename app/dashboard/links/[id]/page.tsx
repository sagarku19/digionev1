'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, MousePointerClick, Users, Globe, Link2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { QRButton } from '@/components/dashboard/links/QRButton';
import { ClicksChart } from '@/components/dashboard/links/ClicksChart';
import { BreakdownList } from '@/components/dashboard/links/BreakdownList';
import { useShortLinks, useShortLinkAnalytics, type ClickEvent } from '@/hooks/marketing/useShortLinks';
import { shortUrl } from '@/lib/shared/shortlink';

function countBy(events: ClickEvent[], key: (e: ClickEvent) => string | null): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const e of events) {
    const k = key(e) || 'Unknown';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export default function LinkAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { links } = useShortLinks();
  const { data: events = [], isLoading } = useShortLinkAnalytics(id);
  const link = links.find((l) => l.id === id);

  const uniqueClicks = useMemo(() => events.filter((e) => e.is_unique).length, [events]);

  const series = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const e of events) {
      const d = e.created_at.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, clicks]) => ({ date: date.slice(5), clicks }));
  }, [events]);

  const countries = useMemo(() => countBy(events, (e) => e.country), [events]);
  const referrers = useMemo(() => countBy(events, (e) => {
    if (!e.referrer_url) return 'Direct';
    try { return new URL(e.referrer_url).host; } catch { return 'Direct'; }
  }), [events]);

  const url = link ? shortUrl(link.code) : '';

  return (
    <div className="space-y-6 pb-12">
      <div className="pt-6">
        <Link href="/dashboard/links" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded">
          <ArrowLeft className="w-4 h-4" /> Back to links
        </Link>
      </div>

      <PageHeader
        title={link?.title || link?.code || 'Link analytics'}
        description={url}
        action={link ? <QRButton url={url} label={link.code} /> : undefined}
      />

      <KpiGrid>
        <StatCard label="Total clicks" value={(link?.click_count ?? 0).toLocaleString('en-IN')} icon={MousePointerClick} />
        <StatCard label="Unique clicks" value={uniqueClicks.toLocaleString('en-IN')} icon={Users} />
        <StatCard label="Top country" value={countries[0]?.label ?? '—'} icon={Globe} />
        <StatCard label="Top referrer" value={referrers[0]?.label ?? '—'} icon={Link2} />
      </KpiGrid>

      {isLoading ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-4 shadow-[var(--shadow-xs)]">
          <Skeleton className="h-5 w-32" rounded="md" />
          <Skeleton className="h-48 w-full" rounded="lg" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <EmptyState icon={MousePointerClick} title="No clicks yet" description="Share this link to start seeing analytics." />
        </div>
      ) : (
        <>
          <ClicksChart data={series} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BreakdownList title="Countries" rows={countries} />
            <BreakdownList title="Referrers" rows={referrers} />
            <BreakdownList title="Devices" rows={countBy(events, (e) => e.device_type)} />
            <BreakdownList title="Browsers" rows={countBy(events, (e) => e.browser)} />
            <BreakdownList title="Operating systems" rows={countBy(events, (e) => e.os)} />
          </div>
        </>
      )}
    </div>
  );
}
