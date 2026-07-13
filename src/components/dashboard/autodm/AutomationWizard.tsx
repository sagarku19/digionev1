'use client';

import React, { Fragment, useState } from 'react';
import {
  ChevronLeft, X, Check, Send, Bot, XCircle, CheckCircle2, UserCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, Toggle, DmPreviewBubble } from './ui';
import {
  TRIGGER_LABELS, TRIGGER_ICONS, TRIGGER_DESCS, MATCH_MODE_LABELS,
  PHASE1_MATCH_MODES, PHASE2_TRIGGERS,
} from './types';
import type { Automation, TriggerType, MatchMode } from './types';

const STEP_LABELS = ['Keywords', 'Triggers', 'Response', 'Review'] as const;
type Step = 1 | 2 | 3 | 4;

function Breadcrumb({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-medium mb-4">
      {STEP_LABELS.map((label, i) => {
        const idx = (i + 1) as Step;
        const isActive = idx === step;
        const isDone = idx < step;
        return (
          <Fragment key={label}>
            <li className={`inline-flex items-center gap-1.5 ${
              isActive ? 'text-[var(--brand)]' : isDone ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'
            }`}>
              {isDone
                ? <Check className="w-3.5 h-3.5" />
                : <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-[var(--brand)] text-[var(--text-on-brand)]' : 'bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-tertiary)]'
                  }`}>{idx}</span>}
              <span className={isActive ? 'font-semibold' : ''}>{label}</span>
            </li>
            {idx < STEP_LABELS.length && <li aria-hidden className="text-[var(--text-tertiary)]">→</li>}
          </Fragment>
        );
      })}
    </ol>
  );
}

export function AutomationWizard({ automation, onSave, onBack, saveError, isSaving }: {
  automation: Automation;
  onSave: (a: Automation) => Promise<void>;
  onBack: () => void;
  saveError?: string | null;
  isSaving?: boolean;
}) {
  const [local, setLocal] = useState<Automation>(automation);
  const [step, setStep] = useState<Step>(1);
  const [newKeyword, setNewKeyword] = useState('');
  const [newNegKeyword, setNewNegKeyword] = useState('');

  const save = () => { void onSave(local); };

  function addKeyword() {
    const word = newKeyword.trim().toLowerCase();
    if (!word || local.keywords.some(k => k.word === word)) return;
    setLocal(p => ({ ...p, keywords: [...p.keywords, { id: `${Date.now()}`, word }] }));
    setNewKeyword('');
  }
  function removeKeyword(id: string) {
    setLocal(p => ({ ...p, keywords: p.keywords.filter(k => k.id !== id) }));
  }
  function addNegKeyword() {
    const word = newNegKeyword.trim().toLowerCase();
    if (!word || local.negativeKeywords.some(k => k.word === word)) return;
    setLocal(p => ({ ...p, negativeKeywords: [...p.negativeKeywords, { id: `${Date.now()}`, word }] }));
    setNewNegKeyword('');
  }
  function removeNegKeyword(id: string) {
    setLocal(p => ({ ...p, negativeKeywords: p.negativeKeywords.filter(k => k.id !== id) }));
  }
  function toggleTrigger(type: TriggerType) {
    setLocal(p => ({
      ...p,
      triggers: p.triggers.some(t => t.type === type)
        ? p.triggers.filter(t => t.type !== type)
        : [...p.triggers, { id: `${Date.now()}`, type }],
    }));
  }

  const matchModes: { mode: MatchMode; desc: string }[] = [
    { mode: 'exact', desc: 'Only exact word matches' },
    { mode: 'fuzzy', desc: 'Allows typos & variations' },
    { mode: 'ai_intent', desc: 'AI understands meaning' },
    { mode: 'sentiment', desc: 'Matches by emotion/tone' },
  ];

  const canContinue = step === 1 ? local.keywords.length > 0
    : step === 2 ? local.triggers.length > 0
    : true;

  return (
    <div className="space-y-5">
      {/* Top bar — name + active toggle, persistent across steps */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <input
            value={local.name}
            onChange={e => setLocal(p => ({ ...p, name: e.target.value }))}
            className="text-lg font-semibold text-[var(--text-primary)] bg-transparent border-0 outline-none w-full focus:ring-0"
            placeholder="Automation name..."
          />
          <p className="text-xs text-[var(--text-secondary)]">Step {step} of {STEP_LABELS.length} · Configure keywords, triggers, and response</p>
        </div>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <Toggle checked={local.active} onChange={v => setLocal(p => ({ ...p, active: v }))} />
          <span className="text-[var(--text-secondary)]">{local.active ? 'Active' : 'Paused'}</span>
        </div>
      </div>

      {saveError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--danger-bg)] border border-[var(--danger)]/30 rounded-[var(--radius-md)] text-sm text-[var(--danger)] font-semibold">
          <XCircle className="w-4 h-4 shrink-0" />
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div>
          <Breadcrumb step={step} />
          <Card>
            {step === 1 && (
              <KeywordsStep local={local} setLocal={setLocal} newKeyword={newKeyword} setNewKeyword={setNewKeyword}
                addKeyword={addKeyword} removeKeyword={removeKeyword}
                newNegKeyword={newNegKeyword} setNewNegKeyword={setNewNegKeyword}
                addNegKeyword={addNegKeyword} removeNegKeyword={removeNegKeyword} matchModes={matchModes} />
            )}
            {step === 2 && <TriggersStep local={local} toggleTrigger={toggleTrigger} />}
            {step === 3 && <ResponseStep local={local} setLocal={setLocal} />}
            {step === 4 && <ReviewStep local={local} />}

            <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setStep(s => (s > 1 ? (s - 1) as Step : s))}
                disabled={step === 1}
                className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-0 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              {step < 4 ? (
                <button
                  onClick={() => canContinue && setStep(s => (s + 1) as Step)}
                  disabled={!canContinue}
                  className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold px-5 py-2.5 rounded-[var(--radius-md)] transition-colors shadow-[var(--shadow-xs)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={save}
                  disabled={isSaving}
                  className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] text-sm font-semibold px-5 py-2.5 rounded-[var(--radius-md)] transition-colors shadow-[var(--shadow-xs)] disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  {isSaving ? 'Saving…' : 'Save Automation'}
                </button>
              )}
            </div>
          </Card>
        </div>

        <Card padded="sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-3">Preview</div>
          <DmPreviewBubble text={local.prompt} />
          {local.requireFollow && (
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
                <UserCheck className="w-3 h-3" /> If not following yet
              </div>
              <DmPreviewBubble text={local.notFollowerMessage} placeholder="Follow first, then tap ✅ to get the link." />
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-1.5 text-xs text-[var(--text-secondary)]">
            <p>{local.keywords.length} keyword{local.keywords.length !== 1 ? 's' : ''} · {local.triggers.length} trigger{local.triggers.length !== 1 ? 's' : ''}</p>
            {local.commentReply && <p className="truncate">Comment reply: &ldquo;{local.commentReply}&rdquo;</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Step 1 — Keywords ────────────────────────────────────────────────────

function KeywordsStep({ local, setLocal, newKeyword, setNewKeyword, addKeyword, removeKeyword,
  newNegKeyword, setNewNegKeyword, addNegKeyword, removeNegKeyword, matchModes }: {
  local: Automation; setLocal: React.Dispatch<React.SetStateAction<Automation>>;
  newKeyword: string; setNewKeyword: (v: string) => void; addKeyword: () => void; removeKeyword: (id: string) => void;
  newNegKeyword: string; setNewNegKeyword: (v: string) => void; addNegKeyword: () => void; removeNegKeyword: (id: string) => void;
  matchModes: { mode: MatchMode; desc: string }[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Trigger Keywords</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">When someone comments or DMs these words, the automation fires.</p>
      </div>
      <div className="flex gap-2">
        <input
          value={newKeyword}
          onChange={e => setNewKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addKeyword()}
          placeholder="Add keyword..."
          className="flex-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
        />
        <button onClick={addKeyword} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2.5 rounded-[var(--radius-md)] font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {local.keywords.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">No keywords yet. Add at least one to continue.</p>}
        {local.keywords.map(k => (
          <span key={k.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)]/10 border border-[var(--brand)]/20 text-[var(--brand)] rounded-full text-sm font-medium">
            #{k.word}
            <button onClick={() => removeKeyword(k.id)} className="hover:opacity-70 transition-opacity focus-visible:outline-none"><X className="w-3.5 h-3.5" /></button>
          </span>
        ))}
      </div>

      <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--text-primary)]">Match Mode</p>
        <div className="flex flex-wrap gap-2">
          {matchModes.map(({ mode, desc }) => {
            const isPhase2 = !PHASE1_MATCH_MODES.includes(mode);
            return (
              <button
                key={mode}
                title={isPhase2 ? 'Coming soon' : desc}
                disabled={isPhase2}
                onClick={() => !isPhase2 && setLocal(p => ({ ...p, matchMode: mode }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                  isPhase2
                    ? 'bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-tertiary)] opacity-50 cursor-not-allowed'
                    : local.matchMode === mode
                      ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-[var(--shadow-xs)]'
                      : 'bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]/40 hover:text-[var(--brand)]'
                }`}
              >
                {MATCH_MODE_LABELS[mode]}
                {isPhase2 && <span className="text-[9px] font-semibold opacity-70">Soon</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-[var(--danger)]">Negative Keywords</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">If any of these appear, the automation will NOT fire.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={newNegKeyword}
            onChange={e => setNewNegKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNegKeyword()}
            placeholder="Add negative keyword..."
            className="flex-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
          />
          <button onClick={addNegKeyword} className="bg-[var(--danger)] hover:opacity-90 text-white px-4 py-2.5 rounded-[var(--radius-md)] font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {local.negativeKeywords.map(k => (
            <span key={k.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--danger-bg)] border border-[var(--danger)]/20 text-[var(--danger)] rounded-full text-sm font-medium">
              -{k.word}
              <button onClick={() => removeNegKeyword(k.id)} className="hover:opacity-70 transition-opacity focus-visible:outline-none"><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)] pt-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-[var(--text-primary)]">Detect keywords in any language (AI-powered)</p>
            <Badge color="pink">PRO</Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Match keywords regardless of script or language</p>
        </div>
        <Toggle checked={local.multilingual} onChange={v => setLocal(p => ({ ...p, multilingual: v }))} />
      </div>
    </div>
  );
}

// ─── Step 2 — Triggers ────────────────────────────────────────────────────

function TriggersStep({ local, toggleTrigger }: { local: Automation; toggleTrigger: (t: TriggerType) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Trigger Events</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Choose what actions activate this automation. Pick at least one to continue.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map(type => {
          const Icon = TRIGGER_ICONS[type];
          const active = local.triggers.some(t => t.type === type);
          const isPhase2 = PHASE2_TRIGGERS.includes(type);
          return (
            <button
              key={type}
              disabled={isPhase2}
              onClick={() => !isPhase2 && toggleTrigger(type)}
              title={isPhase2 ? 'Coming soon' : TRIGGER_DESCS[type]}
              className={`flex items-center gap-3 p-4 rounded-[var(--radius-md)] border text-left transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                isPhase2
                  ? 'border-[var(--border)] bg-[var(--surface-muted)] opacity-50 cursor-not-allowed'
                  : active ? 'border-[var(--brand)]/50 bg-[var(--brand)]/5' : 'border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--brand)]/30'
              }`}
            >
              <div className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${active && !isPhase2 ? 'bg-[var(--brand)]/15 text-[var(--brand)]' : 'bg-[var(--surface-hover)] text-[var(--text-tertiary)]'}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`text-xs font-semibold truncate ${active && !isPhase2 ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{TRIGGER_LABELS[type]}</p>
                  {isPhase2 && <span className="text-[9px] font-semibold text-[var(--text-tertiary)] bg-[var(--surface-hover)] px-1 rounded shrink-0">Soon</span>}
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 leading-snug">{TRIGGER_DESCS[type]}</p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${active && !isPhase2 ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border)]'}`}>
                {active && !isPhase2 && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[var(--text-tertiary)]">Specific-post targeting is coming soon — automations currently run across all your posts.</p>
    </div>
  );
}

// ─── Step 3 — Response ────────────────────────────────────────────────────

function ResponseStep({ local, setLocal }: { local: Automation; setLocal: React.Dispatch<React.SetStateAction<Automation>> }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Response Type</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Choose how your automation responds to triggers.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {([
          { type: 'MESSAGE' as const, icon: Send, label: 'Static Message', desc: 'Send a fixed message every time.', phase2: false },
          { type: 'SMARTAI' as const, icon: Bot, label: 'Smart AI', desc: 'AI crafts personalized replies using your prompt.', phase2: true },
        ]).map(opt => (
          <button
            key={opt.type}
            disabled={opt.phase2}
            onClick={() => !opt.phase2 && setLocal(p => ({ ...p, listener: opt.type }))}
            title={opt.phase2 ? 'Coming soon' : undefined}
            className={`p-5 rounded-[var(--radius-md)] border text-left transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
              opt.phase2
                ? 'border-[var(--border)] bg-[var(--surface-muted)] opacity-50 cursor-not-allowed'
                : local.listener === opt.type ? 'border-[var(--brand)]/50 bg-[var(--brand)]/5' : 'border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--brand)]/30'
            }`}
          >
            <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center mb-3 ${local.listener === opt.type && !opt.phase2 ? 'bg-[var(--brand)] text-[var(--text-on-brand)] shadow-[var(--shadow-sm)]' : 'bg-[var(--surface-hover)] text-[var(--text-tertiary)]'}`}>
              <opt.icon className="w-5 h-5" />
            </div>
            <p className={`text-sm font-semibold ${local.listener === opt.type && !opt.phase2 ? 'text-[var(--brand)]' : 'text-[var(--text-primary)]'}`}>{opt.label}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{opt.desc}</p>
            {opt.phase2 && <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">Coming soon</span>}
          </button>
        ))}
      </div>

      <div className="border-t border-[var(--border-subtle)] pt-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">{local.listener === 'SMARTAI' ? 'AI Prompt / Context' : 'DM Message'}</label>
          <span className="text-xs text-[var(--text-tertiary)]">{local.prompt.length}/1000</span>
        </div>
        <textarea
          value={local.prompt}
          onChange={e => setLocal(p => ({ ...p, prompt: e.target.value }))}
          placeholder={local.listener === 'SMARTAI' ? 'Tell the AI about your business, offer, and what to share in the DM...' : `Hi {name}! Thanks for reaching out. Here's your link: ...`}
          rows={4}
          className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] resize-none transition"
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-2">Use <code className="bg-[var(--surface-muted)] px-1 rounded">{'{name}'}</code> to personalise.</p>
      </div>

      <div className="border-t border-[var(--border-subtle)] pt-4 space-y-2">
        <label className="text-xs font-semibold text-[var(--text-secondary)]">Comment Reply <span className="text-[var(--text-tertiary)] font-normal">optional</span></label>
        <input
          value={local.commentReply}
          onChange={e => setLocal(p => ({ ...p, commentReply: e.target.value }))}
          placeholder="Check your DMs! 📩"
          className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
        />
        <p className="text-xs text-[var(--text-tertiary)]">Public reply on the post comment before sending the DM.</p>
      </div>

      <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-[var(--info)]" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">Require a follow before delivering the link</p>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Non-followers get a &ldquo;follow first&rdquo; message with a button; the link is delivered only after a live follow check.</p>
          </div>
          <Toggle checked={local.requireFollow} onChange={v => setLocal(p => ({ ...p, requireFollow: v }))} />
        </div>
        {local.requireFollow && (
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Not-a-follower message</label>
            <input
              value={local.notFollowerMessage}
              onChange={e => setLocal(p => ({ ...p, notFollowerMessage: e.target.value }))}
              placeholder="Follow first, then tap ✅ to get the link."
              className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 4 — Review ──────────────────────────────────────────────────────

function ReviewStep({ local }: { local: Automation }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Review</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Double check everything before saving.</p>
      </div>

      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Keywords</dt>
          <dd className="flex flex-wrap gap-1.5">
            {local.keywords.map(k => <span key={k.id} className="px-2 py-0.5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-full text-xs font-medium">#{k.word}</span>)}
            {local.negativeKeywords.map(k => <span key={k.id} className="px-2 py-0.5 bg-[var(--danger-bg)] text-[var(--danger)] rounded-full text-xs font-medium">-{k.word}</span>)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Triggers</dt>
          <dd className="flex flex-wrap gap-1.5">
            {local.triggers.map(t => <Badge key={t.id} color="default">{TRIGGER_LABELS[t.type]}</Badge>)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Response</dt>
          <dd className="text-[var(--text-primary)]">{local.listener === 'SMARTAI' ? 'Smart AI' : 'Static Message'} · Match: {MATCH_MODE_LABELS[local.matchMode]}{local.multilingual ? ' · Multilingual' : ''}</dd>
        </div>
        {local.requireFollow && (
          <div>
            <dt className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Follow gate</dt>
            <dd className="text-[var(--text-primary)] flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-[var(--info)]" /> Required — link withheld until the user follows</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
