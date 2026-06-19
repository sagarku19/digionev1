import React from 'react';
import { GripVertical, X, Plus } from 'lucide-react';
import { FieldLabel, INPUT } from './_shared';
import type { BlockEditorProps } from './types';

type LeadField = { type: string; label: string; required: boolean; placeholder: string };

const FIELD_PRESETS = [
  { type: 'name', label: 'Full Name', placeholder: 'Your name' },
  { type: 'email', label: 'Email', placeholder: 'your@email.com' },
  { type: 'mobile', label: 'Mobile', placeholder: '+91 98765 43210' },
  { type: 'other', label: 'Other', placeholder: 'Type here...' },
];

export default function LeadFormBlock({ link, updateMeta }: BlockEditorProps) {
  const fields: LeadField[] = link.metadata?.fields ?? [];
  const setFields = (next: LeadField[]) => updateMeta('fields', next);
  const usedTypes = fields.map(f => f.type);

  return (
    <>
      <div>
        <FieldLabel>Form Description (optional)</FieldLabel>
        <input type="text" value={link.metadata?.description || ''}
          onChange={e => updateMeta('description', e.target.value)}
          className={INPUT} placeholder="Fill this form to get in touch" />
      </div>

      <div>
        <FieldLabel>Form Fields</FieldLabel>
        <div className="space-y-2">
          {fields.map((field, fi) => (
            <div key={fi} className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-2.5">
              <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--text-tertiary)]" />
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                <input type="text" value={field.label}
                  onChange={e => { const n = [...fields]; n[fi] = { ...n[fi], label: e.target.value }; setFields(n); }}
                  className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs outline-none focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  placeholder="Label" />
                <input type="text" value={field.placeholder}
                  onChange={e => { const n = [...fields]; n[fi] = { ...n[fi], placeholder: e.target.value }; setFields(n); }}
                  className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs outline-none focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  placeholder="Placeholder" />
              </div>
              <button
                onClick={() => { const n = [...fields]; n[fi] = { ...n[fi], required: !n[fi].required }; setFields(n); }}
                className={`shrink-0 rounded-[var(--radius-sm)] px-2 py-1 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${field.required
                    ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                    : 'bg-[var(--surface)] text-[var(--text-tertiary)]'
                  }`}
                title={field.required ? 'Required' : 'Optional'}
              >
                {field.required ? 'Required' : 'Optional'}
              </button>
              <button onClick={() => setFields(fields.filter((_, i) => i !== fi))} aria-label="Remove field"
                className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {FIELD_PRESETS.map(preset => {
            const alreadyUsed = preset.type !== 'other' && usedTypes.includes(preset.type);
            return (
              <button key={preset.type}
                disabled={alreadyUsed}
                onClick={() => setFields([...fields, { type: preset.type, label: preset.label, required: preset.type === 'email', placeholder: preset.placeholder }])}
                className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${alreadyUsed
                    ? 'cursor-not-allowed bg-[var(--surface-muted)] text-[var(--text-tertiary)] opacity-60'
                    : 'border border-[var(--brand)]/30 bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20'
                  }`}>
                <Plus className="h-3 w-3" /> {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Button Text</FieldLabel>
          <input type="text" value={link.metadata?.button_text || ''}
            onChange={e => updateMeta('button_text', e.target.value)}
            className={INPUT} placeholder="Submit" />
        </div>
        <div>
          <FieldLabel>Success Message</FieldLabel>
          <input type="text" value={link.metadata?.success_message || ''}
            onChange={e => updateMeta('success_message', e.target.value)}
            className={INPUT} placeholder="Thanks! We'll be in touch." />
        </div>
      </div>
    </>
  );
}
