'use client';

import React from 'react';
import { Server, ArrowRight, Bot, BarChart, MessageSquare, Key } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

const serviceCards = [
  {
    title: 'AI Models & API Keys',
    description: 'Select your preferred AI model and add your custom API keys for integration.',
    icon: Bot,
    color: 'text-[var(--info)]',
    bg: 'bg-[var(--info-bg)]',
  },
  {
    title: 'Google Analytics Integration',
    description: 'Integrate Google Analytics API and tracking keys to monitor your website traffic.',
    icon: BarChart,
    color: 'text-[var(--warning)]',
    bg: 'bg-[var(--warning-bg)]',
  },
  {
    title: 'Website Bot Integration',
    description: 'Configure and embed smart conversational bots directly into your website.',
    icon: MessageSquare,
    color: 'text-[var(--success)]',
    bg: 'bg-[var(--success-bg)]',
  },
  {
    title: 'API Access',
    description: 'Manage developer API access, generate tokens, and set up webhooks.',
    icon: Key,
    color: 'text-[var(--brand)]',
    bg: 'bg-[var(--surface-muted)]',
  },
];

export default function ServicesPage() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Integrations"
        description="Manage your third-party integrations, AI models, and API access securely."
        action={<Server className="w-5 h-5 text-[var(--text-tertiary)]" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {serviceCards.map((service, index) => (
          <button
            key={index}
            type="button"
            className="group text-left bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-6 hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-all duration-200 flex flex-col gap-4 cursor-pointer"
          >
            <div className={`w-11 h-11 ${service.bg} ${service.color} rounded-[var(--radius-md)] flex items-center justify-center`}>
              <service.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">{service.title}</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{service.description}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${service.color} group-hover:gap-2 transition-all`}>
              Configure <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
