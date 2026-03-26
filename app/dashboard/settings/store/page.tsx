'use client';
// Store Settings — creator profile (name, email, avatar) + main store metadata.
// DB tables: profiles (read/write), sites, site_main (read/write)

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import {
  ArrowLeft, Save, CheckCircle2, User, Store, Globe, AtSign,
  Phone, Image as ImageIcon, Loader2, AlertCircle
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

export default function StoreSettingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [profileId, setProfileId] = useState('');

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Main site fields
  const [mainSiteId, setMainSiteId] = useState('');
  const [siteSlug, setSiteSlug] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const pid = await getCreatorProfileId(supabase);
        setProfileId(pid);

        // Load profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', pid)
          .single();

        if (profile) {
          setFullName(profile.full_name ?? '');
          setEmail(profile.email ?? '');
          setMobile(profile.mobile ?? '');
          setAvatarUrl(profile.avatar_url ?? '');
        }

        // Load main site
        const { data: site } = await supabase
          .from('sites')
          .select('id, slug, site_main(title, meta_description, logo_url)')
          .eq('creator_id', pid)
          .eq('site_type', 'main')
          .maybeSingle();

        if (site) {
          setMainSiteId(site.id);
          setSiteSlug(site.slug ?? '');
          const sm = Array.isArray(site.site_main) ? site.site_main[0] : site.site_main as any;
          if (sm) {
            setSiteTitle(sm.title ?? '');
            setSiteDescription(sm.meta_description ?? '');
            setLogoUrl(sm.logo_url ?? '');
          }
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Update profile
      await supabase.from('profiles').update({
        full_name: fullName.trim() || null,
        email: email.trim() || null,
        mobile: mobile.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      }).eq('id', profileId);

      // Update site_main if we have a main site
      if (mainSiteId) {
        // title is non-nullable in site_main Insert, so fall back to a default
        const payload = {
          site_id: mainSiteId,
          title: siteTitle.trim() || 'My Store',
          meta_description: siteDescription.trim() || null,
          logo_url: logoUrl.trim() || null,
        };
        await supabase.from('site_main').upsert(payload, { onConflict: 'site_id' });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/settings" className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your public profile and store details</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/40 px-4 py-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Changes saved successfully.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Creator Profile */}
      <Card title="Creator Profile" subtitle="Your public identity visible to buyers">
        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              : <User className="w-7 h-7 text-indigo-400" />
            }
          </div>
          <Field label="Profile Photo URL">
            <div className="flex gap-2">
              <input
                type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className={INPUT}
              />
            </div>
          </Field>
        </div>

        <Field label="Full Name">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your display name" className={`${INPUT} pl-10`} />
          </div>
        </Field>

        <Field label="Email" hint="Used for order notifications and creator communications">
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={`${INPUT} pl-10`} />
          </div>
        </Field>

        <Field label="Mobile" hint="For OTP login and WhatsApp notifications">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91 98765 43210" className={`${INPUT} pl-10`} />
          </div>
        </Field>
      </Card>

      {/* Store Details */}
      {mainSiteId ? (
        <Card title="Main Store" subtitle="Branding and metadata for your primary store page">
          <Field label="Store Name" hint="Shown in header, browser tab, and emails">
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={siteTitle} onChange={e => setSiteTitle(e.target.value)} placeholder="My Awesome Store" className={`${INPUT} pl-10`} />
            </div>
          </Field>

          <Field label="Store URL" hint={`Your public address: digione.in/p/${siteSlug}`}>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">digione.in/p/</span>
              <input
                type="text" value={siteSlug} readOnly
                className={`${INPUT} pl-[120px] bg-gray-100 dark:bg-gray-800 cursor-not-allowed`}
              />
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">To change your slug, contact support.</p>
          </Field>

          <Field label="Store Description" hint="Shown in search results and social previews (150–160 chars)">
            <textarea
              rows={3} value={siteDescription} onChange={e => setSiteDescription(e.target.value)}
              placeholder="A brief description of what your store sells..."
              className={`${INPUT} resize-none`}
            />
            <p className="text-xs text-gray-400 mt-1">{siteDescription.length}/160</p>
          </Field>

          <Field label="Logo URL" hint="Paste a hosted image URL for your store logo">
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className={`${INPUT} pl-10`} />
            </div>
            {logoUrl && (
              <img src={logoUrl} alt="Logo preview" className="mt-2 h-10 object-contain rounded-lg border border-gray-200 dark:border-gray-700 p-1" />
            )}
          </Field>
        </Card>
      ) : (
        <Card title="Main Store" subtitle="No main store found. Create one first.">
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/40 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">No main store yet</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-0.5">
                <Link href="/dashboard/sites/new" className="underline">Create a Main Store</Link> to configure branding here.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
