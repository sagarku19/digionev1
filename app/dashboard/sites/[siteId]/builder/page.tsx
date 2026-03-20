'use client';
// Site Page Builder — drag-and-drop section editor for a site.
// DB tables: sites (read), site_sections_config (read/write), site_main (read)

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Save, Eye, EyeOff, GripVertical, Plus, Trash2, Loader2,
  CheckCircle2, ExternalLink, ChevronUp, ChevronDown, Layout,
  Megaphone, MessageSquare, HelpCircle, ShieldCheck, Star, ImageIcon,
  Type, Code2, Mail
} from 'lucide-react';
import Link from 'next/link';

// ─── Section type catalogue ──────────────────────────────────
const SECTION_TYPES: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
  hero_banner:       { label: 'Hero Banner',      icon: Layout,       desc: 'Top banner with title, subtitle & CTA' },
  featured_products: { label: 'Featured Products', icon: Star,         desc: 'Product grid from your catalogue' },
  trust_badges:      { label: 'Trust Badges',      icon: ShieldCheck,  desc: 'Icons showing guarantees' },
  testimonials:      { label: 'Testimonials',      icon: MessageSquare,desc: 'Social proof quotes' },
  faq_accordion:     { label: 'FAQ',               icon: HelpCircle,   desc: 'Collapsible Q&A' },
  email_capture:     { label: 'Email Capture',     icon: Mail,         desc: 'Newsletter opt-in with lead storage' },
  rich_text:         { label: 'Rich Text',         icon: Type,         desc: 'Custom text / HTML block' },
  image_banner:      { label: 'Image Banner',      icon: ImageIcon,    desc: 'Full-width image' },
  cta_bar:           { label: 'CTA Bar',           icon: Megaphone,    desc: 'Sticky call-to-action ribbon' },
  custom_code:       { label: 'Custom Code',       icon: Code2,        desc: 'Embed custom HTML/JS' },
};

type Section = {
  id: string;
  type: string;
  sort_order: number;
  is_visible: boolean;
  settings: Record<string, unknown>;
};

function SectionRow({
  section,
  index,
  total,
  onMove,
  onToggle,
  onDelete,
}: {
  section: Section;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta = SECTION_TYPES[section.type] ?? { label: section.type, icon: Layout, desc: '' };
  const Icon = meta.icon;

  return (
    <div className={`group flex items-center gap-4 bg-white dark:bg-[#0A0A1A] border rounded-xl px-4 py-3.5 transition-all ${
      section.is_visible
        ? 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-800'
        : 'border-dashed border-gray-200 dark:border-gray-800 opacity-60'
    }`}>
      {/* Drag handle / order controls */}
      <div className="flex flex-col items-center gap-0.5 text-gray-300 dark:text-gray-700">
        <button
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          className="p-0.5 rounded hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <GripVertical className="w-4 h-4" />
        <button
          onClick={() => onMove(index, index + 1)}
          disabled={index === total - 1}
          className="p-0.5 rounded hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{meta.label}</p>
        <p className="text-xs text-gray-400 truncate">{meta.desc}</p>
      </div>

      {/* Badge */}
      <span className={`hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
        section.is_visible
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
      }`}>
        {section.is_visible ? 'Visible' : 'Hidden'}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => onToggle(section.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title={section.is_visible ? 'Hide section' : 'Show section'}
        >
          {section.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onDelete(section.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          title="Delete section"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Add section panel ───────────────────────────────────────
function AddSectionPanel({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0D0E1A] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#0D0E1A]">
          <h3 className="font-bold text-gray-900 dark:text-white">Add a section</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition text-xl font-light leading-none">×</button>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(SECTION_TYPES).map(([type, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => { onAdd(type); onClose(); }}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 truncate">{meta.label}</p>
                  <p className="text-xs text-gray-400 truncate">{meta.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Builder Page ───────────────────────────────────────
export default function SiteBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const supabase = createClient();

  const [sections, setSections] = useState<Section[]>([]);
  const [siteName, setSiteName] = useState('');
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: site }, { data: config }, { data: sm }] = await Promise.all([
        supabase.from('sites').select('slug, child_slug').eq('id', siteId).single(),
        supabase.from('site_sections_config').select('sections').eq('site_id', siteId).single(),
        supabase.from('site_main').select('title').eq('site_id', siteId).maybeSingle(),
      ]);
      setSiteName(sm?.title ?? site?.slug ?? 'Untitled');
      setSiteSlug(site?.slug ?? site?.child_slug ?? null);
      const raw = config?.sections as Section[] | null;
      if (raw) {
        setSections([...raw].sort((a, b) => a.sort_order - b.sort_order));
      }
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const handleMove = useCallback((from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    setSections(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((s, i) => ({ ...s, sort_order: i + 1 }));
    });
  }, [sections.length]);

  const handleToggle = useCallback((id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, is_visible: !s.is_visible } : s));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSections(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, sort_order: i + 1 })));
  }, []);

  const handleAdd = useCallback((type: string) => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      type,
      sort_order: sections.length + 1,
      is_visible: true,
      settings: {},
    };
    setSections(prev => [...prev, newSection]);
  }, [sections.length]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from('site_sections_config')
      .update({ sections: sections as unknown as import('@/types/database.types').Json })
      .eq('site_id', siteId);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm text-gray-500">Loading builder…</span>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/sites/${siteId}`)}
            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Page Builder</p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{siteName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {siteSlug && (
            <Link
              href={`/${siteSlug}`}
              target="_blank"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Preview
            </Link>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-5 p-3.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex items-start gap-3">
        <Layout className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          Drag sections up/down to reorder. Toggle visibility to show or hide on your live site.
          Changes are only saved when you click <strong>Save</strong>.
        </p>
      </div>

      {/* Section list */}
      <div className="space-y-2.5 mb-5">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
            <Layout className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-500">No sections yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first section below to build this page.</p>
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
            />
          ))
        )}
      </div>

      {/* Add section */}
      <button
        onClick={() => setShowAddPanel(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 font-semibold text-sm transition-all"
      >
        <Plus className="w-4 h-4" />
        Add Section
      </button>

      {showAddPanel && (
        <AddSectionPanel onAdd={handleAdd} onClose={() => setShowAddPanel(false)} />
      )}
    </div>
  );
}
