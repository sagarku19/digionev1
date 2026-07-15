'use client';

import { Fragment, useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Check, Loader2, Plus, X, Link2, Tag, Megaphone,
  CalendarClock, SlidersHorizontal, Lock, Smartphone, Globe, MousePointerClick, Copy,
} from 'lucide-react';
import { BackButton } from '@/components/dashboard/BackButton';
import { getShortlinkDomain, shortUrl } from '@/lib/shared/shortlink';
import type { ShortLink, CreateLinkInput, UpdateLinkInput } from '@/hooks/marketing/useShortLinks';

const INPUT =
  'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';
const LABEL = 'block text-sm font-medium text-[var(--text-primary)] mb-1.5';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
type TabKey = 'destination' | 'details' | 'utm' | 'expiry' | 'advanced';

const TABS: { key: TabKey; icon: React.ElementType; label: string; desc: string }[] = [
  { key: 'destination', icon: Link2, label: 'Destination', desc: 'Where this link redirects to.' },
  { key: 'details', icon: Tag, label: 'Title & tags', desc: 'Name and organize this link.' },
  { key: 'utm', icon: Megaphone, label: 'UTM parameters', desc: 'Tag traffic for your analytics tools.' },
  { key: 'expiry', icon: CalendarClock, label: 'Expiration', desc: 'Auto-expire and set a fallback URL.' },
  { key: 'advanced', icon: SlidersHorizontal, label: 'Advanced targeting', desc: 'Custom code, password, device, geo, social preview, limits.' },
];

function faviconUrl(destination: string): string | null {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(destination).host}&sz=64`;
  } catch {
    return null;
  }
}

function Chip({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)]">
      <Icon className="w-3 h-3 text-[var(--text-tertiary)]" /> {children}
    </span>
  );
}

export function LinkFormView({
  editing, onCreate, onUpdate, onCreated, onBack, busy,
}: {
  editing: ShortLink | null;
  onCreate: (input: CreateLinkInput) => Promise<unknown>;
  onUpdate: (input: UpdateLinkInput & { id: string }) => Promise<unknown>;
  onCreated: (link: ShortLink) => void;
  onBack: () => void;
  busy: boolean;
}) {
  const [tab, setTab] = useState<TabKey>('destination');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [utm, setUtm] = useState({ source: '', medium: '', campaign: '', term: '', content: '' });
  const [expiresAt, setExpiresAt] = useState('');
  const [fallback, setFallback] = useState('');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Phase 2 state
  const [password, setPassword] = useState('');
  const [iosUrl, setIosUrl] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [geoRows, setGeoRows] = useState<Array<{ cc: string; url: string }>>([]);
  const [og, setOg] = useState({ title: '', description: '', image: '' });
  const [maxClicks, setMaxClicks] = useState('');

  useEffect(() => {
    // Prop→state sync: seed the form from `editing` (or reset for a new link)
    // whenever the target changes. Legitimate effect use — not data fetching.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('');
    setAvailability('idle');
    setTab('destination');
    if (editing) {
      setDestination(editing.destination_url);
      setCode(editing.code);
      setTitle(editing.title ?? '');
      setTags((editing.tags ?? []).join(', '));
      setUtm({
        source: editing.utm_source ?? '', medium: editing.utm_medium ?? '',
        campaign: editing.utm_campaign ?? '', term: editing.utm_term ?? '',
        content: editing.utm_content ?? '',
      });
      setExpiresAt(editing.expires_at ? editing.expires_at.slice(0, 10) : '');
      setFallback(editing.expired_redirect_url ?? '');
      // Phase 2 — password is NEVER prefilled
      setPassword('');
      setIosUrl(editing.ios_url ?? '');
      setAndroidUrl(editing.android_url ?? '');
      setGeoRows(editing.geo && typeof editing.geo === 'object'
        ? Object.entries(editing.geo as Record<string, string>).map(([cc, url]) => ({ cc, url }))
        : []);
      setOg({
        title: editing.og_title ?? '',
        description: editing.og_description ?? '',
        image: editing.og_image ?? '',
      });
      setMaxClicks(editing.max_clicks != null ? String(editing.max_clicks) : '');
    } else {
      setDestination(''); setCode(''); setTitle(''); setTags('');
      setUtm({ source: '', medium: '', campaign: '', term: '', content: '' });
      setExpiresAt(''); setFallback('');
      setPassword('');
      setIosUrl('');
      setAndroidUrl('');
      setGeoRows([]);
      setOg({ title: '', description: '', image: '' });
      setMaxClicks('');
    }
  }, [editing]);

  // Debounced code availability check (skip when unchanged in edit mode).
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!code) { setAvailability('idle'); return; }
      if (editing && code === editing.code) { setAvailability('idle'); return; }
      setAvailability('checking');
      try {
        const res = await fetch(`/api/links/check-code?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (res.status === 400) setAvailability('invalid');
        else setAvailability(data.available ? 'available' : 'taken');
      } catch {
        setAvailability('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code, editing]);

  const domain = getShortlinkDomain() || 'linkln.me';
  const codeForPreview = code.trim() || editing?.code || '';
  const previewUrl = codeForPreview ? shortUrl(codeForPreview) : '';
  const fav = faviconUrl(destination);
  const invalid = busy || !destination.trim() || availability === 'checking' || availability === 'taken' || availability === 'invalid';

  const utmCount = Object.values(utm).filter((v) => v.trim()).length;
  const geoCount = geoRows.filter((r) => r.cc.trim() && r.url.trim()).length;
  const hasPassword = !!password.trim() || !!editing?.password_hash;
  const hasDevice = !!iosUrl.trim() || !!androidUrl.trim();
  const advancedCount =
    (hasPassword ? 1 : 0) + (hasDevice ? 1 : 0) + (geoCount ? 1 : 0) +
    (og.title.trim() || og.description.trim() || og.image.trim() ? 1 : 0) +
    (maxClicks.trim() ? 1 : 0);

  const tabHasContent: Record<TabKey, boolean> = {
    destination: !!destination.trim(),
    details: !!title.trim() || tags.split(',').some((t) => t.trim()),
    utm: utmCount > 0,
    expiry: !!expiresAt || !!fallback.trim(),
    advanced: advancedCount > 0,
  };

  const copyPreview = () => {
    if (!previewUrl) return;
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submit = async () => {
    if (invalid) { setTab('destination'); return; }
    setError('');
    setJustSaved(false);
    try {
      const payload = {
        destination_url: destination.trim(),
        code: code.trim() || undefined,
        title: title.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        utm_source: utm.source.trim() || undefined,
        utm_medium: utm.medium.trim() || undefined,
        utm_campaign: utm.campaign.trim() || undefined,
        utm_term: utm.term.trim() || undefined,
        utm_content: utm.content.trim() || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        expired_redirect_url: fallback.trim() || null,
        ...(password.trim() ? { password } : {}),
        ios_url: iosUrl.trim() || null,
        android_url: androidUrl.trim() || null,
        geo: geoRows.reduce((acc, r) => {
          const cc = r.cc.trim().toUpperCase();
          if (cc && r.url.trim()) acc[cc] = r.url.trim();
          return acc;
        }, {} as Record<string, string>),
        og_title: og.title.trim() || null,
        og_description: og.description.trim() || null,
        og_image: og.image.trim() || null,
        max_clicks: maxClicks.trim() ? Number(maxClicks) : null,
      };
      if (editing) {
        await onUpdate({ id: editing.id, ...payload });
      } else {
        const res = await onCreate(payload);
        const link = (res as { link?: ShortLink } | null)?.link;
        if (link) onCreated(link);
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  };

  const activeMeta = TABS.find((t) => t.key === tab)!;

  return (
    <div className="pb-6" onKeyDown={onKeyDown}>
      {/* Header — back button before the title, save action at the top */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton onClick={onBack} label="Back to links" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{editing ? 'Edit short link' : 'New short link'}</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {editing ? 'Update the destination, code, and targeting rules.' : 'Point a short, branded code at any URL and start tracking clicks.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {justSaved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--success)] mr-1">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {editing ? 'Back to links' : 'Cancel'}
          </button>
          <button
            onClick={submit}
            disabled={invalid}
            title="⌘ / Ctrl + Enter"
            className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-[var(--text-on-brand)] px-5 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create link'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-xs text-[var(--danger)] bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[var(--radius-sm)] px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sub-sidebar tabs */}
        <nav className="flex lg:flex-col gap-1 lg:w-56 shrink-0 overflow-x-auto lg:overflow-visible no-scrollbar w-full items-center lg:items-stretch">
          {TABS.map((t) => {
            const active = tab === t.key;
            const isFirstAdvanced = t.key === 'details';
            return (
              <Fragment key={t.key}>
                {isFirstAdvanced && (
                  <p className="shrink-0 px-3 lg:pt-3 lg:pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Advanced options
                  </p>
                )}
                <button
                  onClick={() => setTab(t.key)}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] lg:w-full ${
                    active
                      ? 'bg-[var(--surface-muted)] text-[var(--text-primary)] shadow-[var(--shadow-xs)] border border-[var(--border)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent'
                  }`}
                >
                  <t.icon className={`w-4 h-4 shrink-0 ${active ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'}`} />
                  <span className="truncate">{t.label}</span>
                  {tabHasContent[t.key] && (
                    <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-[var(--brand)]' : 'bg-[var(--text-tertiary)]'}`} />
                  )}
                </button>
              </Fragment>
            );
          })}
        </nav>

        {/* Middle — active tab fields */}
        <div className="flex-1 min-w-0 w-full">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)]">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{activeMeta.label}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{activeMeta.desc}</p>
            </div>
            <div className="p-5">
              {tab === 'destination' && (
                <div>
                  <label className={LABEL}>Destination URL</label>
                  <div className="relative">
                    {fav ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fav} alt="" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm" />
                    ) : (
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    )}
                    <input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="https://your-page.com/…"
                      className={`${INPUT} pl-9`}
                      autoFocus
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                    A short code is generated automatically. To set a custom one, open <span className="font-medium text-[var(--text-secondary)]">Advanced targeting</span>.
                  </p>
                </div>
              )}

              {tab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Title <span className="text-[var(--text-tertiary)] font-normal">optional</span></label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spring sale promo" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Tags <span className="text-[var(--text-tertiary)] font-normal">comma-separated</span></label>
                    <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="promo, instagram" className={INPUT} />
                  </div>
                </div>
              )}

              {tab === 'utm' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['source', 'medium', 'campaign', 'term', 'content'] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-xs text-[var(--text-tertiary)] mb-1 capitalize">{k}</label>
                      <input value={utm[k]} onChange={(e) => setUtm((p) => ({ ...p, [k]: e.target.value }))} className={INPUT} />
                    </div>
                  ))}
                </div>
              )}

              {tab === 'expiry' && (
                <div className="space-y-3">
                  <div>
                    <label className={LABEL}>Expires on</label>
                    <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Fallback URL when expired</label>
                    <input value={fallback} onChange={(e) => setFallback(e.target.value)} placeholder="https://…" className={INPUT} />
                  </div>
                </div>
              )}

              {tab === 'advanced' && (
                <div className="space-y-5">
                  <div>
                    <label className={LABEL}>Custom short link</label>
                    <div className="flex items-stretch">
                      <span className="inline-flex items-center px-3 text-sm text-[var(--text-tertiary)] bg-[var(--surface-muted)] border border-r-0 border-[var(--border)] rounded-l-[var(--radius-md)] shrink-0">
                        {domain}/
                      </span>
                      <div className="relative flex-1">
                        <input
                          value={code}
                          onChange={(e) => setCode(e.target.value.toLowerCase())}
                          placeholder="auto-generated if empty"
                          className="w-full pl-3 pr-9 py-2 text-sm border border-[var(--border)] rounded-r-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {availability === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />}
                          {availability === 'available' && <Check className="w-4 h-4 text-[var(--success)]" />}
                          {(availability === 'taken' || availability === 'invalid') && <X className="w-4 h-4 text-[var(--danger)]" />}
                        </span>
                      </div>
                    </div>
                    {availability === 'taken' && <p className="mt-1.5 text-xs text-[var(--danger)]">That code is taken — try another.</p>}
                    {availability === 'invalid' && <p className="mt-1.5 text-xs text-[var(--danger)]">3–50 chars: letters, numbers, - or _.</p>}
                    {availability === 'available' && <p className="mt-1.5 text-xs text-[var(--success)]">Available.</p>}
                    {availability === 'idle' && <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">Leave blank to keep the auto-generated code.</p>}
                  </div>

                  <div>
                    <label className={LABEL}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank for no password"
                      className={INPUT}
                    />
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {editing?.password_hash
                        ? 'This link is password-protected. Leave blank to keep the current password; type a new one to change it.'
                        : 'Require a password before redirecting.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Device targeting</p>
                    <div>
                      <label className={LABEL}>iOS URL</label>
                      <input value={iosUrl} onChange={(e) => setIosUrl(e.target.value)} placeholder="https://apps.apple.com/…" className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Android URL</label>
                      <input value={androidUrl} onChange={(e) => setAndroidUrl(e.target.value)} placeholder="https://play.google.com/…" className={INPUT} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Geo targeting</p>
                    {geoRows.map((row, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={row.cc}
                          onChange={(e) => setGeoRows((prev) => prev.map((r, j) => j === i ? { ...r, cc: e.target.value.toUpperCase().slice(0, 2) } : r))}
                          placeholder="IN"
                          maxLength={2}
                          className="w-14 px-2 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow uppercase"
                        />
                        <input
                          value={row.url}
                          onChange={(e) => setGeoRows((prev) => prev.map((r, j) => j === i ? { ...r, url: e.target.value } : r))}
                          placeholder="https://…"
                          className={`${INPUT} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={() => setGeoRows((prev) => prev.filter((_, j) => j !== i))}
                          className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--danger)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                          aria-label="Remove country"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setGeoRows((prev) => [...prev, { cc: '', url: '' }])}
                      className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded py-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add country
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Social preview</p>
                    <div>
                      <label className={LABEL}>OG title</label>
                      <input value={og.title} onChange={(e) => setOg((p) => ({ ...p, title: e.target.value }))} placeholder="Title shown when shared" className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>OG description</label>
                      <input value={og.description} onChange={(e) => setOg((p) => ({ ...p, description: e.target.value }))} placeholder="Short description" className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>OG image URL</label>
                      <input value={og.image} onChange={(e) => setOg((p) => ({ ...p, image: e.target.value }))} placeholder="https://…" className={INPUT} />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Max clicks</label>
                    <input
                      type="number"
                      min={1}
                      value={maxClicks}
                      onChange={(e) => setMaxClicks(e.target.value)}
                      placeholder="Unlimited"
                      className={INPUT}
                    />
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">Link stops working after this many clicks.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview column */}
        <div className="lg:w-72 shrink-0 w-full lg:sticky lg:top-6 space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)]">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-4">Preview</p>

            <div className="flex flex-col items-center text-center">
              <div className="rounded-[var(--radius-md)] bg-white p-3 border border-[var(--border-subtle)]">
                {previewUrl ? (
                  <QRCodeCanvas value={previewUrl} size={128} level="M" includeMargin={false} />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-[10px] text-neutral-400 px-2">
                    QR appears once you set a code
                  </div>
                )}
              </div>

              <div className="mt-4 w-full">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="font-mono text-sm font-semibold text-[var(--text-primary)] truncate">
                    {domain}/{codeForPreview || <span className="text-[var(--text-tertiary)]">your-code</span>}
                  </span>
                  {previewUrl && (
                    <button
                      onClick={copyPreview}
                      title="Copy"
                      className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] truncate">
                  {destination.trim() ? `→ ${destination.trim()}` : 'Add a destination URL'}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap gap-2 justify-center">
              {expiresAt && <Chip icon={CalendarClock}>Expires {expiresAt}</Chip>}
              {maxClicks.trim() && <Chip icon={MousePointerClick}>Max {maxClicks} clicks</Chip>}
              {hasPassword && <Chip icon={Lock}>Password</Chip>}
              {geoCount > 0 && <Chip icon={Globe}>{geoCount} geo</Chip>}
              {hasDevice && <Chip icon={Smartphone}>Device</Chip>}
              {utmCount > 0 && <Chip icon={Megaphone}>UTM</Chip>}
              {!expiresAt && !maxClicks.trim() && !hasPassword && geoCount === 0 && !hasDevice && utmCount === 0 && (
                <span className="text-xs text-[var(--text-tertiary)]">No extra rules yet — pick a tab to add targeting.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
