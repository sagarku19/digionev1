'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TEMPLATE_CARDS } from './types';
import type { TemplateCard } from './types';

export function TemplatesView({ onCreateFromTemplate }: { onCreateFromTemplate: (card: TemplateCard) => void }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--text-secondary)] -mt-2">Start with a pre-built automation and customise it to your needs.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {TEMPLATE_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.type}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all duration-200 overflow-hidden hover:border-[var(--brand)]/30 flex flex-col"
            >
              <div className="h-24 bg-[var(--brand)]/[0.06] border-b border-[var(--border-subtle)] flex items-center justify-center">
                <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--brand)]/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[var(--brand)]" />
                </div>
              </div>

              <div className="p-5 flex flex-col gap-3 flex-1">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{card.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{card.desc}</p>
                </div>

                <ul className="space-y-1.5">
                  {card.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onCreateFromTemplate(card)}
                  className="mt-auto w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold py-2.5 rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  Use Template
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
