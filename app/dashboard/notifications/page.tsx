'use client';
// Notifications & Activity Feed — creator's real-time alerts (orders, payouts, leads).
// DB tables: notifications (read/write via useNotifications)

import React, { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import {
  Bell, BellOff, CheckCheck, ShoppingBag, DollarSign,
  Users, AlertTriangle, Info, Megaphone, Circle,
  ExternalLink, Filter
} from 'lucide-react';

type NotifType = 'order' | 'payout' | 'lead' | 'system' | 'marketing' | string;

const TYPE_META: Record<NotifType, { icon: React.ElementType; color: string; bg: string }> = {
  order:     { icon: ShoppingBag,    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  payout:    { icon: DollarSign,     color: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-50 dark:bg-indigo-500/10'   },
  lead:      { icon: Users,          color: 'text-violet-600 dark:text-violet-400',   bg: 'bg-violet-50 dark:bg-violet-500/10'   },
  marketing: { icon: Megaphone,      color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-500/10'     },
  warning:   { icon: AlertTriangle,  color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-500/10'         },
  system:    { icon: Info,           color: 'text-gray-600 dark:text-gray-400',       bg: 'bg-gray-100 dark:bg-gray-800'         },
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
    <div className="space-y-6 pt-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-gray-400" />
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{notifications.length} total · {unreadCount} unread</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 px-4 py-2 rounded-xl transition"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition capitalize ${filter === f ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {f === 'unread' && unreadCount > 0 ? `Unread (${unreadCount})` : f === 'all' ? 'All' : 'Unread'}
            </button>
          ))}
        </div>
        {types.length > 2 && (
          <div className="flex gap-1 flex-wrap">
            {types.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition capitalize ${typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-5">
            <BellOff className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </h2>
          <p className="text-gray-500 text-sm max-w-xs">
            {filter === 'unread' ? 'You have no unread notifications.' : 'Activity from orders, payouts, and leads will appear here.'}
          </p>
          {filter === 'unread' && (
            <button onClick={() => setFilter('all')} className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">View all notifications</button>
          )}
        </div>
      )}

      {/* Notifications list */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map((notif: any) => {
            const meta = getTypeMeta(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 transition ${!notif.is_read ? 'bg-indigo-50/40 dark:bg-indigo-500/5' : ''}`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <meta.icon className={`w-5 h-5 ${meta.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${!notif.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(notif.created_at)}</span>
                      {!notif.is_read && (
                        <Circle className="w-2 h-2 fill-indigo-500 text-indigo-500 shrink-0" />
                      )}
                    </div>
                  </div>
                  {notif.action_url && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      View details <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
