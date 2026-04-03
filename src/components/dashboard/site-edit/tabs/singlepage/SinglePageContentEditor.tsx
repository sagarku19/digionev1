'use client';

import React from 'react';
import { FileText, Plus, X, GripVertical, Type, Image, Code, Minus, Heading1 } from 'lucide-react';
import type { SinglePageContentData, ContentBlock } from './singlepage-types';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{children}</label>;
}

function SectionCard({ icon: Icon, title, desc, children }: { icon: React.ElementType; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-emerald-500" /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

const BLOCK_TYPES = [
  { id: 'text' as const, label: 'Text', icon: Type },
  { id: 'heading' as const, label: 'Heading', icon: Heading1 },
  { id: 'image' as const, label: 'Image', icon: Image },
  { id: 'iframe' as const, label: 'Iframe / Embed', icon: Code },
  { id: 'divider' as const, label: 'Divider', icon: Minus },
  { id: 'html' as const, label: 'HTML', icon: Code },
];

export default function SinglePageContentEditor2({
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
    updateBlocks([...blocks, { id: crypto.randomUUID(), type, content: '', metadata: {} }]);
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    updateBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    updateBlocks(blocks.filter(b => b.id !== id));
  };

  return (
    <div className="space-y-6">

      {/* ── Description ── */}
      <SectionCard icon={FileText} title="Page Description" desc="Main description shown below the hero.">
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea rows={4} value={data.description}
            onChange={e => onChange({ ...data, description: e.target.value })}
            className={`${INPUT} resize-none`} placeholder="Describe your product or service..." />
        </div>
      </SectionCard>

      {/* ── Content Blocks ── */}
      <SectionCard icon={Type} title="Content Blocks" desc="Add sections to your page: text, images, embeds, and more.">
        {blocks.length > 0 && (
          <div className="space-y-3">
            {blocks.map((block) => {
              const typeInfo = BLOCK_TYPES.find(t => t.id === block.type);
              const TypeIcon = typeInfo?.icon || Type;
              return (
                <div key={block.id} className="bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-xl p-4 group relative">
                  <div className="flex items-center gap-2 mb-3">
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />
                    <TypeIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{typeInfo?.label}</span>
                    <button onClick={() => removeBlock(block.id)}
                      className="ml-auto p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {(block.type === 'text' || block.type === 'html') && (
                    <textarea rows={block.type === 'html' ? 6 : 3} value={block.content}
                      onChange={e => updateBlock(block.id, { content: e.target.value })}
                      className={`${INPUT} resize-none ${block.type === 'html' ? 'font-mono text-xs' : ''}`}
                      placeholder={block.type === 'html' ? '<div>Your custom HTML...</div>' : 'Write your content here...'} />
                  )}

                  {block.type === 'heading' && (
                    <input type="text" value={block.content}
                      onChange={e => updateBlock(block.id, { content: e.target.value })}
                      className={INPUT} placeholder="Section heading..." />
                  )}

                  {block.type === 'image' && (
                    <div className="space-y-2">
                      <input type="url" value={block.content}
                        onChange={e => updateBlock(block.id, { content: e.target.value })}
                        className={INPUT} placeholder="https://... image URL" />
                      {block.content && (
                        <img src={block.content} alt="" className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                      )}
                    </div>
                  )}

                  {block.type === 'iframe' && (
                    <div className="space-y-2">
                      <textarea rows={3} value={block.content}
                        onChange={e => updateBlock(block.id, { content: e.target.value })}
                        className={`${INPUT} resize-none font-mono text-xs`}
                        placeholder='<iframe src="https://..." width="100%" height="400"></iframe>' />
                      <p className="text-[10px] text-gray-400">Paste any embed code — YouTube, Google Forms, maps, etc.</p>
                    </div>
                  )}

                  {block.type === 'divider' && (
                    <div className="flex items-center justify-center py-2">
                      <hr className="w-full border-gray-200 dark:border-gray-700" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {blocks.length === 0 && (
          <div className="py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <p className="text-sm text-gray-400">No content blocks yet</p>
            <p className="text-xs text-gray-400 mt-1">Add blocks below to build your page content</p>
          </div>
        )}

        {/* Add block buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {BLOCK_TYPES.map(bt => (
            <button key={bt.id} onClick={() => addBlock(bt.id)}
              className="flex flex-col items-center gap-1.5 py-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:text-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all">
              <bt.icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold">{bt.label}</span>
            </button>
          ))}
        </div>
      </SectionCard>

    </div>
  );
}
