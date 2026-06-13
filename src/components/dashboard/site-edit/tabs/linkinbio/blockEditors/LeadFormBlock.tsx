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
            <div key={fi} className="flex items-center gap-2 p-2.5 bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-xl">
              <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0 cursor-grab" />
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                <input type="text" value={field.label}
                  onChange={e => { const n = [...fields]; n[fi] = { ...n[fi], label: e.target.value }; setFields(n); }}
                  className="px-2 py-1.5 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-lg text-xs outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Label" />
                <input type="text" value={field.placeholder}
                  onChange={e => { const n = [...fields]; n[fi] = { ...n[fi], placeholder: e.target.value }; setFields(n); }}
                  className="px-2 py-1.5 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-lg text-xs outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Placeholder" />
              </div>
              <button
                onClick={() => { const n = [...fields]; n[fi] = { ...n[fi], required: !n[fi].required }; setFields(n); }}
                className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold transition ${field.required
                    ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400'
                    : 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-gray-400'
                  }`}
                title={field.required ? 'Required' : 'Optional'}
              >
                {field.required ? 'Required' : 'Optional'}
              </button>
              <button onClick={() => setFields(fields.filter((_, i) => i !== fi))}
                className="shrink-0 p-1 text-gray-400 hover:text-red-500 transition">
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
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${alreadyUsed
                    ? 'bg-gray-100 dark:bg-[var(--bg-secondary)] text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-500/20 border border-pink-200 dark:border-pink-500/30'
                  }`}>
                <Plus className="w-3 h-3" /> {preset.label}
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
