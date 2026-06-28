'use client';

import React from 'react';
import {
  Mail, ArrowRight, Table2, PhoneForwarded, Send,
  CheckCircle2, Link2, Clock, Bot, BarChart3, MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

type Status = 'connected' | 'not_connected' | 'soon';

type Integration = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  status: Status;
  href?: string;
};

const CHANNELS: Integration[] = [
  {
    id: 'email',
    title: 'Email Sequences',
    description: 'Welcome emails, order confirmations, and abandoned-cart recovery on autopilot.',
    icon: Mail,
    color: 'text-[var(--info)]',
    bg: 'bg-[var(--info-bg)]',
    status: 'connected',
    href: '/dashboard/integrations/email',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Bots',
    description: 'Send automated order updates and replies via the WhatsApp Business API.',
    icon: PhoneForwarded,
    color: 'text-[var(--success)]',
    bg: 'bg-[var(--success-bg)]',
    status: 'not_connected',
    href: '/dashboard/integrations/whatsapp',
  },
  {
    id: 'telegram',
    title: 'Telegram Broadcasts',
    description: 'Push order and lead alerts to your Telegram channel through a bot.',
    icon: Send,
    color: 'text-[var(--info)]',
    bg: 'bg-[var(--info-bg)]',
    status: 'not_connected',
    href: '/dashboard/integrations/telegram',
  },
  {
    id: 'google-sheets',
    title: 'Google Sheets',
    description: 'Auto-sync orders, leads, and customers to a spreadsheet in real time.',
    icon: Table2,
    color: 'text-[var(--success)]',
    bg: 'bg-[var(--success-bg)]',
    status: 'not_connected',
    href: '/dashboard/integrations/google-sheets',
  },
];

const ANALYTICS: Integration[] = [
  {
    id: 'ai-models',
    title: 'AI Models & API Keys',
    description: 'Bring your own AI model and API keys to power product copy and assistants.',
    icon: Bot,
    color: 'text-[var(--info)]',
    bg: 'bg-[var(--info-bg)]',
    status: 'soon',
  },
  {
    id: 'google-analytics',
    title: 'Google Analytics',
    description: 'Connect a GA4 property to track storefront traffic and conversions.',
    icon: BarChart3,
    color: 'text-[var(--warning)]',
    bg: 'bg-[var(--warning-bg)]',
    status: 'soon',
  },
  {
    id: 'website-bot',
    title: 'Website Bot',
    description: 'Embed a conversational support bot directly into your storefront.',
    icon: MessageSquare,
    color: 'text-[var(--success)]',
    bg: 'bg-[var(--success-bg)]',
    status: 'soon',
  },
];

function ConnectionBadge({ status }: { status: Status }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--success-bg)] text-[var(--success)]">
        <CheckCircle2 className="w-3 h-3" /> Connected
      </span>
    );
  }
  if (status === 'soon') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--warning-bg)] text-[var(--warning)]">
        <Clock className="w-3 h-3" /> Soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
      <Link2 className="w-3 h-3" /> Not connected
    </span>
  );
}

function IntegrationCard({ item }: { item: Integration }) {
  const Icon = item.icon;
  const connected = item.status === 'connected';
  const soon = item.status === 'soon';

  const body = (
    <Card hoverable={!soon} padded={false} className={`h-full ${soon ? 'opacity-70' : ''}`}>
      <div className="p-5 flex flex-col gap-4 h-full">
        <div className="flex items-start justify-between gap-3">
          <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center ${item.bg} ${item.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <ConnectionBadge status={item.status} />
        </div>

        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{item.title}</h3>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)] leading-relaxed">{item.description}</p>
        </div>

        <div className={`flex items-center gap-1.5 text-[13px] font-medium ${soon ? 'text-[var(--text-tertiary)]' : item.color}`}>
          {connected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />}
          {soon ? 'Coming soon' : connected ? 'Manage' : 'Connect'}
          {!soon && <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />}
        </div>
      </div>
    </Card>
  );

  if (soon || !item.href) return <div>{body}</div>;
  return (
    <Link
      href={item.href}
      className="group block h-full rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      {body}
    </Link>
  );
}

export default function IntegrationsHubPage() {
  const connectedCount = CHANNELS.filter((c) => c.status === 'connected').length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <PageHeader
        title="Integrations"
        description="Connect your tools and put your store on autopilot."
        action={
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-pill)] px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            {connectedCount} of {CHANNELS.length} channels connected
          </span>
        }
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Automations &amp; channels</h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Wire DigiOne into the apps your customers already use.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CHANNELS.map((item) => (
            <IntegrationCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Analytics &amp; AI</h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Bring your own keys to track performance and power AI features.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ANALYTICS.map((item) => (
            <IntegrationCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
