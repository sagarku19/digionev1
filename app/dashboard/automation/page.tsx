'use client';

import React from 'react';
import {
  Mail, ArrowRight, Table2, PhoneForwarded, Send, Zap,
  CheckCircle2, Link2, Instagram,
} from 'lucide-react';
import Link from 'next/link';

type ConnectionStatus = 'connected' | 'not_connected' | 'soon';

const TOOLS: {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  badge?: string;
  badgeColor?: string;
  actionStatus: 'active' | 'connect' | 'soon';
  connectionStatus: ConnectionStatus;
  href: string;
}[] = [
  {
    id: 'instagram',
    title: 'Instagram Auto DM',
    description: 'Auto-reply to comments and DMs, capture leads, and run story automations on Instagram.',
    icon: Instagram,
    color: 'text-[var(--brand)]',
    bg: 'bg-[var(--surface-muted)]',
    badge: 'Hot',
    badgeColor: 'bg-[var(--danger-bg)] text-[var(--danger)]',
    actionStatus: 'connect',
    connectionStatus: 'not_connected',
    href: '/dashboard/autodm',
  },
  {
    id: 'email',
    title: 'Email Sequences',
    description: 'Send automated welcome emails, abandoned cart recovery, and newsletters.',
    icon: Mail,
    color: 'text-[var(--info)]',
    bg: 'bg-[var(--info-bg)]',
    badge: 'Popular',
    badgeColor: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    actionStatus: 'active',
    connectionStatus: 'connected',
    href: '/dashboard/automation/email',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Bots',
    description: 'Engage customers on WhatsApp with automated replies and order updates.',
    icon: PhoneForwarded,
    color: 'text-[var(--success)]',
    bg: 'bg-[var(--success-bg)]',
    badge: 'New',
    badgeColor: 'bg-[var(--success-bg)] text-[var(--success)]',
    actionStatus: 'connect',
    connectionStatus: 'not_connected',
    href: '/dashboard/automation/whatsapp',
  },
  {
    id: 'google-sheets',
    title: 'Google Sheets',
    description: 'Auto-sync orders, leads, and customer data to a Google Sheet in real time.',
    icon: Table2,
    color: 'text-[var(--success)]',
    bg: 'bg-[var(--success-bg)]',
    actionStatus: 'connect',
    connectionStatus: 'not_connected',
    href: '/dashboard/automation/google-sheets',
  },
  {
    id: 'telegram',
    title: 'Telegram Broadcasts',
    description: 'Push updates to your Telegram channel and interact with subscribers via bots.',
    icon: Send,
    color: 'text-[var(--info)]',
    bg: 'bg-[var(--info-bg)]',
    actionStatus: 'connect',
    connectionStatus: 'not_connected',
    href: '/dashboard/automation/telegram',
  },
];

const ACTION_LABEL: Record<string, string> = {
  active: 'Manage',
  connect: 'Connect',
  soon: 'Coming Soon',
};

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/20">
        <CheckCircle2 className="w-3 h-3" />
        Connected
      </span>
    );
  }
  if (status === 'not_connected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border)]">
        <Link2 className="w-3 h-3" />
        Not connected
      </span>
    );
  }
  return null;
}

export default function AutomationHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2 pt-4">
          <Zap className="w-6 h-6 text-[var(--text-secondary)]" />
          Automations
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Connect your tools and put your marketing on autopilot.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isSoon = tool.actionStatus === 'soon';
          const isActive = tool.actionStatus === 'active';

          const card = (
            <div
              className={`group bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-sm)] transition-all duration-200 flex flex-col gap-4 relative ${
                isSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {/* Top row: icon + connection badge */}
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 ${tool.bg} ${tool.color} rounded-[var(--radius-sm)] flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <ConnectionBadge status={tool.connectionStatus} />
                  {tool.badge && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide ${tool.badgeColor}`}>
                      {tool.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Text */}
              <div className="flex-1">
                <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">{tool.title}</h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{tool.description}</p>
              </div>

              {/* Footer action */}
              <div className={`flex items-center gap-1 text-sm font-semibold ${tool.color} group-hover:gap-2 transition-all`}>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse mr-1" />}
                {ACTION_LABEL[tool.actionStatus]} <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          );

          return isSoon ? (
            <div key={tool.id}>{card}</div>
          ) : (
            <Link key={tool.id} href={tool.href} className="flex flex-col h-full focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-lg)]">
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
