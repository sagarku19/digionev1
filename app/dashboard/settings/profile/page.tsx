'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import { useProfileQuery, useProfileMutations } from '@/hooks/creator/useProfile';
import {
  Save, CheckCircle2, User, Loader2, AlertCircle,
  Twitter, Instagram, Youtube, Globe, Camera, BadgeCheck,
  Mail, Smartphone, Linkedin, Send, RefreshCw, X,
  MapPin, Briefcase, Hash,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

const INPUT = 'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--success)] bg-[var(--success-bg)] border border-[var(--success)]/20 px-2 py-0.5 rounded-[var(--radius-pill)]">
      <BadgeCheck size={11} /> Verified
    </span>
  );
}

function UnverifiedBadge({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--warning)] bg-[var(--warning-bg)] border border-[var(--warning)]/20 px-2 py-0.5 rounded-[var(--radius-pill)] hover:opacity-90 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition disabled:opacity-60"
    >
      {loading ? <RefreshCw size={10} className="animate-spin" /> : <Send size={10} />}
      {loading ? 'Sending…' : 'Verify now'}
    </button>
  );
}

function OtpModal({
  type,
  target,
  onSuccess,
  onClose,
}: {
  type: 'email' | 'sms';
  target: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    setSending(true);
    setError('');
    try {
      if (type === 'email') {
        const { error } = await supabase.auth.signInWithOtp({ email: target, options: { shouldCreateUser: false } });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone: target, options: { shouldCreateUser: false } });
        if (error) throw error;
      }
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    setVerifying(true);
    setError('');
    try {
      const { error } = await supabase.auth.verifyOtp(
        type === 'email'
          ? { email: target, token: otp, type: 'email' }
          : { phone: target, token: otp, type: 'sms' }
      );
      if (error) throw error;
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => { sendOtp(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[var(--surface-muted)] rounded-[var(--radius-md)]">
              {type === 'email'
                ? <Mail size={15} className="text-[var(--text-secondary)]" />
                : <Smartphone size={15} className="text-[var(--text-secondary)]" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Verify {type === 'email' ? 'Email' : 'Mobile'}</p>
              <p className="text-xs text-[var(--text-tertiary)] truncate max-w-[180px]">{target}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition"
          >
            <X size={15} />
          </button>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">
              A 6-digit code was sent to <span className="font-medium text-[var(--text-primary)]">{target}</span>. Enter it below.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] px-4 py-3 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] text-[var(--text-primary)] transition-shadow"
              autoFocus
            />
            {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
            <button
              onClick={verifyOtp}
              disabled={otp.length < 6 || verifying}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] font-semibold py-2.5 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition text-sm"
            >
              {verifying ? 'Verifying…' : 'Confirm Code'}
            </button>
            <button
              onClick={sendOtp}
              disabled={sending}
              className="w-full text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)] transition"
            >
              {sending ? 'Resending…' : "Didn't receive it? Resend"}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Loader2 size={20} className="animate-spin text-[var(--text-secondary)] mx-auto" />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">Sending code…</p>
            {error && <p className="text-xs text-[var(--danger)] mt-2">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [profileId, setProfileId] = useState('');
  const { data: profile, isLoading: loading } = useProfileQuery(profileId);
  const { updateProfile, setEmailVerified, setMobileVerified } = useProfileMutations();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    mobile: '',
    avatar_url: '',
    tagline: '',
    location: '',
    category: '',
    website: '',
    twitter: '',
    instagram: '',
    youtube: '',
    linkedin: '',
    telegram: '',
  });

  const [verifyModal, setVerifyModal] = useState<{ type: 'email' | 'sms'; target: string } | null>(null);
  const [sendingVerify, setSendingVerify] = useState<'email' | 'mobile' | null>(null);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    getCreatorProfileId().then(setProfileId).catch((e) => setError(e.message));
  }, []);

  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || !profileId || hydratedRef.current === profileId) return;
    hydratedRef.current = profileId;
    const meta = (profile.metadata ?? {}) as Record<string, string | undefined>;
    setForm({
      full_name: profile.full_name ?? '',
      email: profile.email ?? '',
      mobile: profile.mobile ?? '',
      avatar_url: profile.avatar_url ?? '',
      tagline: meta.tagline ?? '',
      location: meta.location ?? '',
      category: meta.category ?? '',
      website: meta.website ?? '',
      twitter: meta.twitter ?? '',
      instagram: meta.instagram ?? '',
      youtube: meta.youtube ?? '',
      linkedin: meta.linkedin ?? '',
      telegram: meta.telegram ?? '',
    });
  }, [profile, profileId]);

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        creatorId: profileId,
        updates: {
          full_name: form.full_name.trim() || null,
          email: form.email.trim() || null,
          mobile: form.mobile.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          metadata: {
            tagline: form.tagline.trim() || null,
            location: form.location.trim() || null,
            category: form.category.trim() || null,
            website: form.website.trim() || null,
            twitter: form.twitter.trim() || null,
            instagram: form.instagram.trim() || null,
            youtube: form.youtube.trim() || null,
            linkedin: form.linkedin.trim() || null,
            telegram: form.telegram.trim() || null,
          },
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySuccess = async () => {
    if (!verifyModal) return;
    if (verifyModal.type === 'email') await setEmailVerified(profileId);
    else await setMobileVerified(profileId);
    setVerifyModal(null);
  };

  const CATEGORIES = [
    'Content Creator', 'Educator', 'Consultant', 'Coach', 'Designer',
    'Developer', 'Author', 'Musician', 'Photographer', 'Videographer',
    'Entrepreneur', 'Artist', 'Other',
  ];

  if (loading) {
    return (
      <div className="space-y-4 pb-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const initials = form.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Profile"
          description="Your public identity — shown on your store page and creator bio."
          action={
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] px-3 py-2 rounded-[var(--radius-sm)] text-sm font-semibold focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-all"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          }
        />

        {saved && (
          <div className="flex items-center gap-2 text-sm text-[var(--success)] bg-[var(--success-bg)] border border-[var(--success)]/20 px-4 py-3 rounded-[var(--radius-md)]">
            <CheckCircle2 size={14} className="shrink-0" /> Profile saved.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-[var(--danger)] bg-[var(--danger-bg)] border border-[var(--danger)]/20 px-4 py-3 rounded-[var(--radius-md)]">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="h-20 bg-[var(--brand)] relative">
            <div className="absolute -bottom-8 left-6">
              <div className="w-16 h-16 rounded-[var(--radius-lg)] border-4 border-[var(--surface)] bg-[var(--brand)] flex items-center justify-center overflow-hidden shadow-[var(--shadow-sm)]">
                {form.avatar_url
                  ? <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-[var(--text-on-brand)]">{initials}</span>
                }
              </div>
            </div>
          </div>

          <div className="px-6 pt-12 pb-6 space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">
                Profile Photo URL
              </label>
              <div className="relative">
                <Camera size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="url"
                  value={form.avatar_url}
                  onChange={e => set('avatar_url', e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className={`${INPUT} pl-9`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    placeholder="Your display name"
                    className={`${INPUT} pl-9`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Category</label>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] z-10" />
                  <select
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className={`${INPUT} pl-9 appearance-none`}
                  >
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Tagline</label>
              <div className="relative">
                <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  maxLength={100}
                  value={form.tagline}
                  onChange={e => set('tagline', e.target.value)}
                  placeholder="One line that describes you — e.g. 'Helping 10K+ developers ship faster'"
                  className={`${INPUT} pl-9`}
                />
              </div>
              <p className="text-xs text-[var(--text-tertiary)] text-right mt-1">{form.tagline.length}/100</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">Location</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  placeholder="Mumbai, India"
                  className={`${INPUT} pl-9`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Contact & Verification</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Verified contact details are required for payouts and notifications.</p>
          </div>
          <div className="px-6 py-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Email Address</label>
                {profile?.email_verified
                  ? <VerifiedBadge />
                  : form.email
                    ? <UnverifiedBadge loading={sendingVerify === 'email'} onClick={() => { setSendingVerify('email'); setVerifyModal({ type: 'email', target: form.email }); }} />
                    : null
                }
              </div>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="you@example.com"
                  className={`${INPUT} pl-9`}
                />
              </div>
              {!profile?.email_verified && form.email && (
                <p className="text-xs text-[var(--warning)] mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> Email not verified — click &ldquo;Verify now&rdquo; to confirm ownership.
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Mobile Number</label>
                {profile?.mobile_verified
                  ? <VerifiedBadge />
                  : form.mobile
                    ? <UnverifiedBadge loading={sendingVerify === 'mobile'} onClick={() => { setSendingVerify('mobile'); setVerifyModal({ type: 'sms', target: form.mobile }); }} />
                    : null
                }
              </div>
              <div className="relative">
                <Smartphone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={e => set('mobile', e.target.value)}
                  placeholder="+91 98765 43210"
                  className={`${INPUT} pl-9`}
                />
              </div>
              {!profile?.mobile_verified && form.mobile && (
                <p className="text-xs text-[var(--warning)] mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> Mobile not verified — required for WhatsApp notifications.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Links & Social</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Shown on your public store / bio page.</p>
          </div>
          <div className="px-6 py-6 space-y-4">
            {([
              { key: 'website',   label: 'Website',    Icon: Globe,     ph: 'https://yoursite.com' },
              { key: 'twitter',   label: 'X / Twitter', Icon: Twitter,  ph: 'https://x.com/handle' },
              { key: 'instagram', label: 'Instagram',  Icon: Instagram, ph: 'https://instagram.com/handle' },
              { key: 'youtube',   label: 'YouTube',    Icon: Youtube,   ph: 'https://youtube.com/@channel' },
              { key: 'linkedin',  label: 'LinkedIn',   Icon: Linkedin,  ph: 'https://linkedin.com/in/handle' },
              { key: 'telegram',  label: 'Telegram',   Icon: Send,      ph: 'https://t.me/username' },
            ] as const).map(({ key, label, Icon, ph }) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">{label}</label>
                <div className="relative">
                  <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="url"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={ph}
                    className={`${INPUT} pl-9`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] px-6 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-all"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {verifyModal && (
        <OtpModal
          type={verifyModal.type}
          target={verifyModal.target}
          onSuccess={handleVerifySuccess}
          onClose={() => { setVerifyModal(null); setSendingVerify(null); }}
        />
      )}
    </>
  );
}
