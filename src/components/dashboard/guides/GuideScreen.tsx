'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { useGuide } from './GuideProvider';
import { GUIDES, type GuideKey } from './content';
import { BackButton } from '@/components/dashboard/BackButton';

export function GuideScreen({ guideKey }: { guideKey: GuideKey }) {
  const { closeGuide } = useGuide();
  const guide = GUIDES[guideKey];

  return (
    <div className="pt-4 pb-20 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <BackButton onClick={closeGuide} label="Back" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)] mb-1">Guide</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{guide.title}</h1>
        </div>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mt-1 mb-6">{guide.intro}</p>

      <div className="relative space-y-3 before:content-[''] before:absolute before:left-3 before:top-4 before:bottom-4 before:w-px before:bg-[var(--border)]">
        {guide.steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="relative flex gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-5 py-4 hover:border-[var(--brand)]/30 hover:shadow-[var(--shadow-xs)] transition-all duration-200"
            >
              <div className="w-6 h-6 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 z-10">
                {Icon ? <Icon className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {guide.tips && guide.tips.length > 0 && (
        <div className="mt-6 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Pro Tips</p>
          {guide.tips.map((t, i) => (
            <div key={i} className="flex gap-2.5 text-xs text-[var(--text-secondary)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand)] shrink-0 mt-0.5" />
              {t}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={closeGuide}
          className="inline-flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          Go to {guide.home} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
