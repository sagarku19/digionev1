'use client';
// SectionManager — reusable section list with add/edit/delete/reorder + settings panel.
// Extracted from the builder page for use across main & builder site types.

import React, { useState, useCallback } from 'react';
import {
  Plus, Trash2, Eye, EyeOff, GripVertical, Pencil, X,
  ChevronUp, ChevronDown, Layout, Search,
} from 'lucide-react';
import {
  SECTION_TYPES, SECTION_FIELDS, type Section, type FieldDef,
  getNestedValue, setNestedValue, PI,
} from './section-defs';

// ─── Items Editor ─────────────────────────────────────────────
function ItemsEditor({ items, fieldDefs, onChange }: {
  items: any[];
  fieldDefs: { key: string; label: string; multiline?: boolean }[];
  onChange: (items: any[]) => void;
}) {
  const add    = () => onChange([...items, {}]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, key: string, val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="p-3 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-gray-200 dark:border-[var(--border)] space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Item {i + 1}</span>
            <button onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-600 transition">Remove</button>
          </div>
          {fieldDefs.map(f => f.multiline ? (
            <textarea
              key={f.key}
              value={item[f.key] ?? ''}
              onChange={e => update(i, f.key, e.target.value)}
              placeholder={f.label}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-lg resize-none outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-gray-400"
            />
          ) : (
            <input
              key={f.key}
              type="text"
              value={item[f.key] ?? ''}
              onChange={e => update(i, f.key, e.target.value)}
              placeholder={f.label}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-lg outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-gray-400"
            />
          ))}
        </div>
      ))}
      <button
        onClick={add}
        className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-200 dark:border-[var(--border)] text-gray-400 hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)] hover:border-[var(--accent)] rounded-xl text-xs font-semibold transition"
      >
        <Plus className="w-3.5 h-3.5" /> Add item
      </button>
    </div>
  );
}

// ─── Settings Panel (slide-over drawer) ───────────────────────
function SettingsPanel({ section, onUpdate, onClose }: {
  section: Section;
  onUpdate: (id: string, settings: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const fields = SECTION_FIELDS[section.type] ?? [];
  const [local, setLocal] = useState<Record<string, unknown>>(section.settings ?? {});
  const meta = SECTION_TYPES[section.type] ?? { label: section.type, icon: Layout };

  const get = (key: string) => getNestedValue(local, key);
  const set = (key: string, val: unknown) => setLocal(prev => setNestedValue(prev, key, val));

  const handleApply = () => { onUpdate(section.id, local); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 cursor-pointer" onClick={onClose} />
      <div className="w-full max-w-sm bg-[var(--bg-primary)] border-l border-[var(--border)] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            {React.createElement(meta.icon, { className: 'w-4 h-4 text-[var(--text-secondary)]' })}
            <h2 className="font-bold text-[var(--text-primary)]">{meta.label}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] p-1 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No configurable settings for this section type.</p>
          )}

          {fields.map(field => {
            if (field.type === 'items') {
              return (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-2">{field.label}</label>
                  <ItemsEditor
                    items={(get(field.key) as any[]) ?? []}
                    fieldDefs={field.fields}
                    onChange={val => set(field.key, val)}
                  />
                </div>
              );
            }
            if (field.type === 'select') {
              return (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">{field.label}</label>
                  <select value={(get(field.key) as string) ?? ''} onChange={e => set(field.key, e.target.value)} className={PI}>
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            }
            if (field.type === 'toggle') {
              const checked = !!(get(field.key));
              return (
                <div key={field.key} className="flex items-center justify-between py-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-[var(--text-secondary)]">{field.label}</label>
                  <button
                    type="button"
                    onClick={() => set(field.key, !checked)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[var(--accent)]' : 'bg-gray-300 dark:bg-gray-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              );
            }
            if (field.type === 'textarea') {
              return (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">{field.label}</label>
                  <textarea
                    value={(get(field.key) as string) ?? ''}
                    onChange={e => set(field.key, e.target.value)}
                    rows={field.key === 'html' || field.key === 'content' ? 8 : 3}
                    className={`${PI} resize-none font-mono text-xs`}
                  />
                </div>
              );
            }
            if (field.type === 'color') {
              const val = (get(field.key) as string) ?? '#6366f1';
              return (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">{field.label}</label>
                  <div className="flex items-center gap-2.5">
                    <input type="color" value={val} onChange={e => set(field.key, e.target.value)} className="w-11 h-11 rounded-xl cursor-pointer border border-gray-200 dark:border-[var(--border)] p-0.5 bg-white dark:bg-[var(--bg-secondary)]" />
                    <input type="text" value={val} onChange={e => set(field.key, e.target.value)} className={`${PI} flex-1`} placeholder="#6366f1" />
                  </div>
                </div>
              );
            }
            return (
              <div key={field.key}>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">{field.label}</label>
                <input
                  type={field.type === 'number' ? 'number' : field.type}
                  value={(get(field.key) as string | number) ?? ''}
                  onChange={e => set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                  className={PI}
                />
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t border-[var(--border)] shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-[var(--border)] rounded-xl text-sm font-semibold text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)] transition">
            Cancel
          </button>
          <button onClick={handleApply} className="flex-1 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-xl text-sm font-bold transition shadow-lg">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section Row ──────────────────────────────────────────────
function SectionRow({ section, index, total, onMove, onToggle, onDelete, onEdit }: {
  section: Section; index: number; total: number;
  onMove: (from: number, to: number) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (section: Section) => void;
}) {
  const meta = SECTION_TYPES[section.type] ?? { label: section.type, icon: Layout, desc: '' };
  const Icon = meta.icon;
  const hasSettings = (SECTION_FIELDS[section.type] ?? []).length > 0;

  return (
    <div className={`group flex items-center gap-3 bg-[var(--bg-primary)] border rounded-xl px-4 py-3.5 transition-all ${
      section.is_visible
        ? 'border-[var(--border)] hover:border-[var(--accent)]'
        : 'border-dashed border-[var(--border)] opacity-60'
    }`}>
      <div className="flex flex-col items-center gap-0.5 text-gray-300 dark:text-gray-700 shrink-0">
        <button onClick={() => onMove(index, index - 1)} disabled={index === 0} className="p-0.5 rounded hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <GripVertical className="w-4 h-4" />
        <button onClick={() => onMove(index, index + 1)} disabled={index === total - 1} className="p-0.5 rounded hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[var(--text-primary)]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{meta.label}</p>
        <p className="text-xs text-gray-400 truncate">{meta.desc}</p>
      </div>

      <span className={`hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
        section.is_visible
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-500 dark:bg-[var(--bg-secondary)] dark:text-gray-500'
      }`}>
        {section.is_visible ? 'Visible' : 'Hidden'}
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
        {hasSettings && (
          <button
            onClick={() => onEdit(section)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition"
            title="Edit settings"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => onToggle(section.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)] transition" title={section.is_visible ? 'Hide' : 'Show'}>
          {section.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={() => onDelete(section.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Add Section Panel (modal) ────────────────────────────────
function AddSectionPanel({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const entries = Object.entries(SECTION_TYPES).filter(([, m]) =>
    search === '' || m.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-primary)] border border-gray-200 dark:border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="font-bold text-[var(--text-primary)]">Add a section</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-[var(--text-primary)] transition text-xl font-light leading-none">&times;</button>
        </div>
        <div className="px-4 pt-3 shrink-0">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search sections..."
            className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-gray-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entries.map(([type, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => { onAdd(type); onClose(); }}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)] text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[var(--text-primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-primary)] truncate">{meta.label}</p>
                  <p className="text-xs text-gray-400 truncate">{meta.desc}</p>
                </div>
              </button>
            );
          })}
          {entries.length === 0 && (
            <p className="col-span-2 text-center text-sm text-gray-400 py-8">No sections match &ldquo;{search}&rdquo;</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main SectionManager ──────────────────────────────────────
export default function SectionManager({
  sections,
  onChange,
}: {
  sections: Section[];
  onChange: (sections: Section[]) => void;
}) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const handleMove = useCallback((from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next.map((s, i) => ({ ...s, sort_order: i + 1 })));
  }, [sections, onChange]);

  const handleToggle = useCallback((id: string) => {
    onChange(sections.map(s => s.id === id ? { ...s, is_visible: !s.is_visible } : s));
  }, [sections, onChange]);

  const handleDelete = useCallback((id: string) => {
    onChange(sections.filter(s => s.id !== id).map((s, i) => ({ ...s, sort_order: i + 1 })));
  }, [sections, onChange]);

  const handleAdd = useCallback((type: string) => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      type,
      sort_order: sections.length + 1,
      is_visible: true,
      settings: {},
    };
    onChange([...sections, newSection]);
  }, [sections, onChange]);

  const handleUpdateSettings = useCallback((id: string, settings: Record<string, unknown>) => {
    onChange(sections.map(s => s.id === id ? { ...s, settings } : s));
  }, [sections, onChange]);

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl flex items-start gap-3">
        <Layout className="w-4 h-4 text-[var(--text-primary)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-primary)]">
          Hover a section and click <strong>edit</strong> to configure content. Reorder with arrows.
        </p>
      </div>

      <div className="space-y-2.5">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-[var(--border)] rounded-2xl text-center">
            <Layout className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-500">No sections yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first section below to start building.</p>
          </div>
        ) : (
          sections.map((section, index) => (
            <SectionRow
              key={section.id}
              section={section}
              index={index}
              total={sections.length}
              onMove={handleMove}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={setEditingSection}
            />
          ))
        )}
      </div>

      <button
        onClick={() => setShowAddPanel(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--accent)] text-[var(--text-primary)] rounded-xl hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)] font-semibold text-sm transition-all"
      >
        <Plus className="w-4 h-4" />
        Add Section
      </button>

      {showAddPanel && (
        <AddSectionPanel onAdd={handleAdd} onClose={() => setShowAddPanel(false)} />
      )}
      {editingSection && (
        <SettingsPanel
          section={editingSection}
          onUpdate={handleUpdateSettings}
          onClose={() => setEditingSection(null)}
        />
      )}
    </div>
  );
}
