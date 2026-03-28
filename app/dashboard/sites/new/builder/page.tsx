'use client';
// Dedicated creation flow: Builder App
// Build a fully custom page from scratch using the drag-and-drop builder.
// 2-step: Slug + Details → Launch (opens builder immediately)

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Hammer, ChevronLeft, Loader2, Zap, Globe,
  Layers, Palette, Code2, LayoutGrid,
  CheckCircle2, XCircle,
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]/40 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

const FEATURES = [
  { icon: Layers, label: '18 section types', desc: 'Hero, FAQ, testimonials, galleries, and more' },
  { icon: Palette, label: 'Custom theming', desc: 'Colors, fonts, and spacing — your brand, your rules' },
  { icon: Code2, label: 'Custom HTML/JS', desc: 'Embed scripts, widgets, or custom code blocks' },
  { icon: LayoutGrid, label: 'Drag & reorder', desc: 'Move sections up/down with one click' },
];

export default function CreateBuilderAppPage() {
  const router = useRouter();

  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced slug availability check
  useEffect(() => {
    if (!slug || slug.length < 3) { setSlugAvailable(null); return; }
    const timer = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const res = await fetch(`/api/sites/check-slug?slug=${encodeURIComponent(slug)}&type=builder`);
        const json = await res.json();
        setSlugAvailable(json.available === true);
      } catch { setSlugAvailable(null); }
      finally { setSlugChecking(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

  const validSlug = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);

  const handleSubmit = async () => {
    if (!title.trim() || !validSlug || !slugAvailable) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_type: 'builder', slug, title, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create');
      // Go straight to the builder
      router.push(`/dashboard/sites/edit/builder/${json.siteId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#07070f]/80 backdrop-blur-sm border-b border-gray-100 dark:border-white/[0.05]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard/sites/new')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
            <ChevronLeft className="w-4 h-4" /> All Types
          </button>
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Builder App</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="space-y-6">
            {/* Hero section */}
            <div className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Hammer className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Build from scratch</h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Create a fully custom page using our visual builder. Start with a blank canvas and add any section you need.
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(f => (
                <div key={f.label} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <f.icon className="w-4 h-4 text-rose-500 mb-2" />
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{f.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* URL + slug input */}
            <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-800/40">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Your URL</span>
              </div>
              <p className="text-sm text-rose-600 dark:text-rose-400 font-mono mb-3">
                digione.ai/w/<span className="font-bold">{slug || '...'}</span>
              </p>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. my-portfolio"
                className={INPUT}
              />
              <div className="flex items-center gap-2 mt-2 min-h-[20px]">
                {slugChecking && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                {!slugChecking && slugAvailable === true && validSlug && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Available</span>
                )}
                {!slugChecking && slugAvailable === false && validSlug && (
                  <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" /> Already taken</span>
                )}
                {slug.length > 0 && !validSlug && (
                  <span className="text-xs text-gray-400">3-50 chars, lowercase letters, numbers, hyphens</span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">You can change this slug later in site settings.</p>
            </div>

            {/* Form */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                App name <span className="text-red-400">*</span>
              </label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. My Portfolio, Landing Page, Linktree" className={INPUT} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="What are you building?" className={`${INPUT} resize-none`} />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</p>}

          <div className="flex items-center justify-end mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button onClick={handleSubmit} disabled={submitting || !title.trim() || !validSlug || !slugAvailable}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-7 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-rose-500/20 transition-all">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                : <><Zap className="w-4 h-4" /> Create &amp; Open Builder</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
