'use client';

import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ChevronDown, Check, Loader2, Plus, X } from 'lucide-react';
import { SideDrawer } from '@/components/ui/SideDrawer';
import { getShortlinkDomain, shortUrl } from '@/lib/shared/shortlink';
import type { ShortLink, CreateLinkInput, UpdateLinkInput } from '@/hooks/marketing/useShortLinks';

const INPUT =
  'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';
const LABEL = 'block text-sm font-medium text-[var(--text-primary)] mb-1.5';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function LinkFormDrawer({
  open, onClose, editing, onCreate, onUpdate, busy,
}: {
  open: boolean;
  onClose: () => void;
  editing: ShortLink | null;
  onCreate: (input: CreateLinkInput) => Promise<unknown>;
  onUpdate: (input: UpdateLinkInput & { id: string }) => Promise<unknown>;
  busy: boolean;
}) {
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [utm, setUtm] = useState({ source: '', medium: '', campaign: '', term: '', content: '' });
  const [expiresAt, setExpiresAt] = useState('');
  const [fallback, setFallback] = useState('');
  const [showUtm, setShowUtm] = useState(false);
  const [showExpiry, setShowExpiry] = useState(false);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [error, setError] = useState('');

  // Phase 2 state
  const [password, setPassword] = useState('');
  const [iosUrl, setIosUrl] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [geoRows, setGeoRows] = useState<Array<{ cc: string; url: string }>>([]);
  const [og, setOg] = useState({ title: '', description: '', image: '' });
  const [maxClicks, setMaxClicks] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Prop→state sync: reset the form from `editing` each time the drawer opens.
    // This is a legitimate effect use; the rule's cascading-render concern doesn't
    // apply (runs once per open, guarded by `if (!open) return`).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('');
    setAvailability('idle');
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
      // Phase 2 resets
      setPassword('');
      setIosUrl('');
      setAndroidUrl('');
      setGeoRows([]);
      setOg({ title: '', description: '', image: '' });
      setMaxClicks('');
    }
  }, [open, editing]);

  // Debounced code availability check (skip when unchanged in edit mode).
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!open || !code) { setAvailability('idle'); return; }
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
  }, [code, open, editing]);

  const previewUrl = shortUrl(code || 'your-code');

  const submit = async () => {
    setError('');
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
        // Phase 2 fields
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
      if (editing) await onUpdate({ id: editing.id, ...payload });
      else await onCreate(payload);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={editing ? 'Edit link' : 'New short link'}
      footer={
        <button
          onClick={submit}
          disabled={busy || !destination.trim() || availability === 'checking' || availability === 'taken' || availability === 'invalid'}
          className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-[var(--text-on-brand)] py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create link'}
        </button>
      }
    >
      <div className="space-y-4">
        {/* Live preview */}
        <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="rounded-[var(--radius-md)] bg-white p-2 shrink-0">
            <QRCodeCanvas value={previewUrl} size={64} level="M" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Preview</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{previewUrl}</p>
          </div>
        </div>

        {error && (
          <div className="text-xs text-[var(--danger)] bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[var(--radius-sm)] px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className={LABEL}>Destination URL</label>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="https://…" className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Short link</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-tertiary)] shrink-0">{getShortlinkDomain() || 'linkme.you'}/</span>
            <div className="relative flex-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                placeholder="auto-generated if empty"
                className={INPUT}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                {availability === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />}
                {availability === 'available' && <Check className="w-4 h-4 text-[var(--success)]" />}
              </span>
            </div>
          </div>
          {availability === 'taken' && <p className="mt-1 text-xs text-[var(--danger)]">That code is taken.</p>}
          {availability === 'invalid' && <p className="mt-1 text-xs text-[var(--danger)]">3–50 chars: letters, numbers, - or _.</p>}
        </div>

        <div>
          <label className={LABEL}>Title <span className="text-[var(--text-tertiary)] font-normal">optional</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spring sale promo" className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Tags <span className="text-[var(--text-tertiary)] font-normal">comma-separated</span></label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="promo, instagram" className={INPUT} />
        </div>

        {/* UTM section */}
        <button
          type="button"
          onClick={() => setShowUtm((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showUtm ? 'rotate-180' : ''}`} /> UTM parameters
        </button>
        {showUtm && (
          <div className="grid grid-cols-2 gap-3">
            {(['source', 'medium', 'campaign', 'term', 'content'] as const).map((k) => (
              <div key={k}>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1 capitalize">{k}</label>
                <input value={utm[k]} onChange={(e) => setUtm((p) => ({ ...p, [k]: e.target.value }))} className={INPUT} />
              </div>
            ))}
          </div>
        )}

        {/* Expiration section */}
        <button
          type="button"
          onClick={() => setShowExpiry((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showExpiry ? 'rotate-180' : ''}`} /> Expiration
        </button>
        {showExpiry && (
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

        {/* Advanced section */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} /> Advanced
        </button>
        {showAdvanced && (
          <div className="space-y-5">
            {/* Password */}
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

            {/* Device targeting */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Device targeting</p>
              <div>
                <label className={LABEL}>iOS URL</label>
                <input
                  value={iosUrl}
                  onChange={(e) => setIosUrl(e.target.value)}
                  placeholder="https://apps.apple.com/…"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Android URL</label>
                <input
                  value={androidUrl}
                  onChange={(e) => setAndroidUrl(e.target.value)}
                  placeholder="https://play.google.com/…"
                  className={INPUT}
                />
              </div>
            </div>

            {/* Geo targeting */}
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

            {/* Social preview (OG) */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Social preview</p>
              <div>
                <label className={LABEL}>OG title</label>
                <input
                  value={og.title}
                  onChange={(e) => setOg((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Title shown when shared"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>OG description</label>
                <input
                  value={og.description}
                  onChange={(e) => setOg((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Short description"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>OG image URL</label>
                <input
                  value={og.image}
                  onChange={(e) => setOg((p) => ({ ...p, image: e.target.value }))}
                  placeholder="https://…"
                  className={INPUT}
                />
              </div>
            </div>

            {/* Limits */}
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
    </SideDrawer>
  );
}
