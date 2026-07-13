'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

const STEPS = [
  { num: 1, title: 'Connect or add a demo account', desc: 'Go to Settings → "Add demo account" to test immediately without real Instagram credentials, or click "Connect Instagram" to link your Business/Creator account via OAuth.' },
  { num: 2, title: 'Create an Automation', desc: 'Go to Automations → New Automation. Give it a descriptive name (e.g. "Free Guide Giveaway").' },
  { num: 3, title: 'Add Keywords', desc: 'Add trigger words people comment or DM (e.g. "guide", "free", "link"). Use broad words for higher reach.' },
  { num: 4, title: 'Choose Triggers', desc: 'Select what fires the automation — Post Comment, Story Mention, DM Keyword, or Story Reply. Post Like and Live Comment are coming in Phase 2.' },
  { num: 5, title: 'Set the response', desc: 'Pick Static Message for a fixed DM (Smart AI personalised replies are coming in Phase 2), then optionally add a public Comment Reply so the interaction feels natural.' },
  { num: 6, title: 'Gate the link behind a follow (optional)', desc: 'Turn on "Require a follow" to hold the link until someone follows you. Non-followers get a "follow first" message with a button — the link only sends after a live follow check.' },
  { num: 7, title: 'Activate and test', desc: 'Toggle the automation on. On a demo account, use the "Simulate Event" panel in Overview to fire a test comment or DM and watch leads + DMs appear in real time.' },
];

const TIPS = [
  'Use broad keywords like "free", "link", "send" for maximum reach.',
  'Always set a comment reply to make the interaction feel natural.',
  'Follow-gating is a strong growth lever — pair it with a lead magnet worth following for.',
  'On a demo account, fire multiple simulate events with different keywords to test each automation.',
  'Monitor your DM Inbox and Leads regularly to track engagement.',
  'Coming in Phase 2: Smart AI replies, post-like triggers, live-stream comments, and specific-post targeting.',
];

export function GuideView() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--text-secondary)] -mt-2">How to set up and use Instagram Auto DM effectively.</p>

      <div className="space-y-3">
        {STEPS.map(s => (
          <div key={s.num} className="flex gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] px-5 hover:border-[var(--brand)]/30 hover:shadow-[var(--shadow-xs)] transition-all duration-200 py-4">
            <div className="w-6 h-6 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {s.num}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Pro Tips</p>
        {TIPS.map((t, i) => (
          <div key={i} className="flex gap-2.5 text-xs text-[var(--text-secondary)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--brand)] shrink-0 mt-0.5" />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
