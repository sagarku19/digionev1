'use client';

import React, { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import {
  Bell, BellOff, CheckCheck, ShoppingBag, DollarSign,
  Users, AlertTriangle, Info, Megaphone,
  ExternalLink, Gift,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  order:     { icon: ShoppingBag,   color: 'text-[var(--success)]', bg: 'bg-[var(--success-bg)]' },
  sale:      { icon: ShoppingBag,   color: 'text-[var(--success)]', bg: 'bg-[var(--success-bg)]' },
  payout:    { icon: DollarSign,    color: 'text-[var(--info)]',    bg: 'bg-[var(--info-bg)]' },
  lead:      { icon: Users,         color: 'text-[var(--brand)]',   bg: 'bg-[var(--surface-muted)]' },
  marketing: { icon: Megaphone,     color: 'text-[var(--warning)]', bg: 'bg-[var(--warning-bg)]' },
  warning:   { icon: AlertTriangle, color: 'text-[var(--danger)]',  bg: 'bg-[var(--danger-bg)]' },
  welcome:   { icon: Gift,          color: 'text-[var(--brand)]',   bg: 'bg-[var(--surface-muted)]' },
  system:    { icon: Info,          color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--surface-muted)]' },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META.system;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const TYPE_LABELS: Record<string, string> = {
  order: 'Orders', sale: 'Sales', payout: 'Payouts', lead: 'Leads',
  marketing: 'Marketing', warning: 'Alerts', welcome: 'Welcome', system: 'System',
};

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllRead } = useNotifications();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const types = ['all', ...Array.from(new Set(notifications.map((n: any) => n.type)))];

  const filtered = notifications.filter((n: any) => {
    if (filter === 'unread' && n.is_read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const handleClick = async (notif: any) => {
    if (!notif.is_read) await markAsRead(notif.id);
    if (notif.action_url) router.push(notif.action_url);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Notifications"
        description={`${notifications.length} total · ${unreadCount} unread`}
        action={
          unreadCount > 0 ? (
            <button
              onClick={() => markAllRead()}
              className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-3 py-2 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-[var(--surface-muted)] p-1 rounded-[var(--radius-sm)]">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium capitalize focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition ${
                filter === f
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f === 'unread' && unreadCount > 0 ? `Unread (${unreadCount})` : f === 'all' ? 'All' : 'Unread'}
            </button>
          ))}
        </div>

        {types.length > 2 && (
          <div className="flex gap-1.5 flex-wrap">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold capitalize focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition ${
                  typeFilter === t
                    ? 'bg-[var(--brand)] text-[var(--text-on-brand)]'
                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                }`}
              >
                {TYPE_LABELS[t] ?? t}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[76px] w-full" rounded="lg" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card padded={false}>
          <EmptyState
            icon={BellOff}
            title={filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            description={
              filter === 'unread'
                ? 'No unread notifications right now.'
                : 'Orders, payouts, and system alerts will show up here.'
            }
            action={
              filter === 'unread' ? (
                <button
                  onClick={() => setFilter('all')}
                  className="text-sm font-medium text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
                >
                  View all notifications
                </button>
              ) : undefined
            }
          />
        </Card>
      )}

      {!isLoading && filtered.length > 0 && (
        <Card padded={false} className="overflow-hidden">
          <div className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((notif: any) => {
              const meta = getTypeMeta(notif.type);
              const Icon = meta.icon;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-[var(--surface-hover)] ${
                    !notif.is_read ? 'bg-[var(--surface-muted)]' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold leading-snug ${!notif.is_read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                          {notif.title}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">{notif.message}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">{timeAgo(notif.created_at)}</span>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0 mt-0.5" />
                        )}
                      </div>
                    </div>
                    {notif.action_url && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-[var(--brand)]">
                        View details <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
