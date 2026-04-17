'use client';

import React from 'react';
import { Server, ArrowRight, Bot, BarChart, MessageSquare, Key } from 'lucide-react';

const serviceCards = [
  {
    title: 'AI Models & API Keys',
    description: 'Select your preferred AI model and add your custom API keys for integration.',
    icon: Bot,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    title: 'Google Analytics Integration',
    description: 'Integrate Google Analytics API and tracking keys to monitor your website traffic.',
    icon: BarChart,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
  },
  {
    title: 'Website Bot Integration',
    description: 'Configure and embed smart conversational bots directly into your website.',
    icon: MessageSquare,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    title: 'API Access',
    description: 'Manage developer API access, generate tokens, and set up webhooks.',
    icon: Key,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
  },
];

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2 pt-4">
          <Server className="w-6 h-6 text-[var(--text-secondary)]" />
          Integrations
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage your third-party integrations, AI models, and API access securely.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {serviceCards.map((service, index) => (
          <div
            key={index}
            className="group bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent)] hover:shadow-md transition-all duration-200 flex flex-col gap-4 cursor-pointer"
          >
            <div className={`w-12 h-12 ${service.bg} ${service.color} rounded-xl flex items-center justify-center`}>
              <service.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">{service.title}</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{service.description}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${service.color} group-hover:gap-2 transition-all`}>
              Configure <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
