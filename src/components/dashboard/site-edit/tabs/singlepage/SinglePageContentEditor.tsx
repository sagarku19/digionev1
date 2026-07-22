'use client';
/* eslint-disable @typescript-eslint/no-explicit-any --
   Editor-internal jsonb block-metadata casts. Deferred "site-edit editor-internal
   any" work in .claude/todo-later/7. */

import React from 'react';
import { X, Type, Image, Code, Minus, Heading1, Play, MousePointerClick, Space, Quote, ChevronUp, ChevronDown } from 'lucide-react';
import type { SinglePageContentData, ContentBlock } from './singlepage-types';
import { INPUT, FieldLabel, SectionCard } from './_shared';

const BLOCK_TYPES: { id: ContentBlock['type']; label: string; icon: React.ElementType }[] = [
  { id: 'heading', label: 'Heading', icon: Heading1 },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'video', label: 'Video', icon: Play },
  { id: 'button', label: 'Button', icon: MousePointerClick },
  { id: 'quote', label: 'Quote', icon: Quote },
  { id: 'divider', label: 'Divider', icon: Minus },
  { id: 'spacer', label: 'Spacer', icon: Space },
  { id: 'iframe', label: 'Embed', icon: Code },
  { id: 'html', label: 'HTML', icon: Code },
];

const HEADING_SIZES = [
  { id: 'h1', label: 'H1 — Large' },
  { id: 'h2', label: 'H2 — Medium' },
  { id: 'h3', label: 'H3 — Small' },
];

const SPACER_SIZES = [
  { id: 'sm', label: 'Small', px: '16px' },
  { id: 'md', label: 'Medium', px: '32px' },
  { id: 'lg', label: 'Large', px: '64px' },
  { id: 'xl', label: 'Extra Large', px: '96px' },
];

export default function SinglePageContentEditor({
  data,
  onChange,
}: {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}) {
  const blocks = data.contentBlocks || [];

  const updateBlocks = (updated: ContentBlock[]) => {
    onChange({ ...data, contentBlocks: updated });
  };

  const addBlock = (type: ContentBlock['type']) => {
    const meta: Record<string, any> = {};
    if (type === 'heading') meta.size = 'h2';
    if (type === 'spacer') meta.size = 'md';
    if (type === 'button') { meta.url = ''; meta.style = 'solid'; meta.size = 'md'; }
    if (type === 'quote') meta.author = '';
    updateBlocks([...blocks, { id: crypto.randomUUID(), type, content: '', metadata: meta }]);
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    updateBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const updateBlockMeta = (id: string, key: string, value: any) => {
    updateBlocks(blocks.map(b => b.id === id ? { ...b, metadata: { ...b.metadata, [key]: value } } : b));
  };

  const removeBlock = (id: string) => {
    updateBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const updated = [...blocks];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    updateBlocks(updated);
  };

  return (
    <div className="space-y-6">

      <SectionCard icon={Type} title="Content Blocks" desc="Build your page with flexible blocks — text, images, videos, buttons, and more.">
        {blocks.length > 0 && (
          <div className="space-y-3">
            {blocks.map((block, blockIdx) => {
              const typeInfo = BLOCK_TYPES.find(t => t.id === block.type);
              const TypeIcon = typeInfo?.icon || Type;
              const meta = block.metadata || {};
              return (
                <div key={block.id} className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-4 group relative">
                  <div className="flex items-center gap-2 mb-3">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button onClick={() => moveBlock(blockIdx, -1)} disabled={blockIdx === 0}
                        className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => moveBlock(blockIdx, 1)} disabled={blockIdx === blocks.length - 1}
                        className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <TypeIcon className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{typeInfo?.label}</span>
                    <button onClick={() => removeBlock(block.id)}
                      className="ml-auto p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* ── Text ── */}
                  {block.type === 'text' && (
                    <textarea rows={3} value={block.content}
                      onChange={e => updateBlock(block.id, { content: e.target.value })}
                      className={`${INPUT} resize-none`}
                      placeholder="Write your content here..." />
                  )}

                  {/* ── HTML ── */}
                  {block.type === 'html' && (
                    <div className="space-y-1">
                      <textarea rows={6} value={block.content}
                        onChange={e => updateBlock(block.id, { content: e.target.value })}
                        className={`${INPUT} resize-none font-mono text-xs`}
                        placeholder='<div>Your custom HTML...</div>' />
                      <p className="text-[10px] text-[var(--warning)]">HTML is rendered directly. Be careful with scripts.</p>
                    </div>
                  )}

                  {/* ── Heading ── */}
                  {block.type === 'heading' && (
                    <div className="space-y-2">
                      <input type="text" value={block.content}
                        onChange={e => updateBlock(block.id, { content: e.target.value })}
                        className={INPUT} placeholder="Section heading..." />
                      <div className="flex gap-1.5">
                        {HEADING_SIZES.map(hs => (
                          <button key={hs.id}
                            onClick={() => updateBlockMeta(block.id, 'size', hs.id)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition ${
                              (meta.size || 'h2') === hs.id
                                ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                            }`}>
                            {hs.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Image ── */}
                  {block.type === 'image' && (
                    <div className="space-y-2">
                      <input type="url" value={block.content}
                        onChange={e => updateBlock(block.id, { content: e.target.value })}
                        className={INPUT} placeholder="https://... image URL" />
                      <input type="text" value={meta.alt || ''}
                        onChange={e => updateBlockMeta(block.id, 'alt', e.target.value)}
                        className={INPUT} placeholder="Alt text (for accessibility)" />
                      {block.content && (
                        <img src={block.content} alt={meta.alt || ''} className="w-full h-32 object-cover rounded-lg border border-[var(--border)]" />
                      )}
                    </div>
                  )}

                  {/* ── Video ── */}
                  {block.type === 'video' && (
                    <div className="space-y-2">
                      <input type="url" value={block.content}
                        onChange={e => updateBlock(block.id, { content: e.target.value })}
                        className={INPUT} placeholder="https://youtube.com/watch?v=... or Vimeo URL" />
                      <p className="text-[10px] text-[var(--text-tertiary)]">Supports YouTube & Vimeo links. Auto-embeds the player.</p>
                      {block.content && (
                        <div className="w-full aspect-video bg-[var(--surface-muted)] rounded-lg flex items-center justify-center border border-[var(--border)]">
                          <Play className="w-8 h-8 text-[var(--text-tertiary)]" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Button ── */}
                  {block.type === 'button' && (
                    <div className="space-y-3">
                      <div>
                        <FieldLabel>Button Label</FieldLabel>
                        <input type="text" value={block.content}
                          onChange={e => updateBlock(block.id, { content: e.target.value })}
                          className={INPUT} placeholder="e.g. Get Started, Learn More..." />
                      </div>
                      <div>
                        <FieldLabel>Link URL</FieldLabel>
                        <input type="url" value={meta.url || ''}
                          onChange={e => updateBlockMeta(block.id, 'url', e.target.value)}
                          className={INPUT} placeholder="https://..." />
                      </div>
                      <div>
                        <FieldLabel>Style</FieldLabel>
                        <div className="flex gap-1.5">
                          {(['solid', 'outline', 'ghost'] as const).map(s => (
                            <button key={s}
                              onClick={() => updateBlockMeta(block.id, 'style', s)}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition capitalize ${
                                (meta.style || 'solid') === s
                                  ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                                  : 'border-[var(--border)] text-[var(--text-secondary)]'
                              }`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Size</FieldLabel>
                        <div className="flex gap-1.5">
                          {(['sm', 'md', 'lg'] as const).map(s => (
                            <button key={s}
                              onClick={() => updateBlockMeta(block.id, 'size', s)}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition uppercase ${
                                (meta.size || 'md') === s
                                  ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                                  : 'border-[var(--border)] text-[var(--text-secondary)]'
                              }`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Quote ── */}
                  {block.type === 'quote' && (
                    <div className="space-y-2">
                      <textarea rows={2} value={block.content}
                        onChange={e => updateBlock(block.id, { content: e.target.value })}
                        className={`${INPUT} resize-none italic`}
                        placeholder="Write the quote text..." />
                      <input type="text" value={meta.author || ''}
                        onChange={e => updateBlockMeta(block.id, 'author', e.target.value)}
                        className={INPUT} placeholder="— Author name (optional)" />
                    </div>
                  )}

                  {/* ── Iframe / Embed ── */}
                  {block.type === 'iframe' && (
                    <div className="space-y-2">
                      <textarea rows={3} value={block.content}
                        onChange={e => updateBlock(block.id, { content: e.target.value })}
                        className={`${INPUT} resize-none font-mono text-xs`}
                        placeholder='<iframe src="https://..." width="100%" height="400"></iframe>' />
                      <p className="text-[10px] text-[var(--text-tertiary)]">Paste any embed code — Google Forms, maps, Calendly, etc.</p>
                    </div>
                  )}

                  {/* ── Divider ── */}
                  {block.type === 'divider' && (
                    <div className="flex items-center justify-center py-2">
                      <hr className="w-full border-[var(--border)]" />
                    </div>
                  )}

                  {/* ── Spacer ── */}
                  {block.type === 'spacer' && (
                    <div className="flex gap-1.5">
                      {SPACER_SIZES.map(sp => (
                        <button key={sp.id}
                          onClick={() => updateBlockMeta(block.id, 'size', sp.id)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-semibold border transition ${
                            (meta.size || 'md') === sp.id
                              ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                              : 'border-[var(--border)] text-[var(--text-secondary)]'
                          }`}>
                          {sp.label} ({sp.px})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {blocks.length === 0 && (
          <div className="py-8 text-center border-2 border-dashed border-[var(--border)] rounded-xl">
            <p className="text-sm text-[var(--text-tertiary)]">No content blocks yet</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Add blocks below to build your page content</p>
          </div>
        )}

        {/* Add block buttons */}
        <div className="grid grid-cols-5 gap-2 pt-2">
          {BLOCK_TYPES.map(bt => (
            <button key={bt.id} onClick={() => addBlock(bt.id)}
              className="flex flex-col items-center gap-1.5 py-3 border border-dashed border-[var(--border)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--brand)] hover:border-[var(--brand)]/40 hover:bg-[var(--surface-hover)] transition-all">
              <bt.icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold">{bt.label}</span>
            </button>
          ))}
        </div>
      </SectionCard>

    </div>
  );
}
