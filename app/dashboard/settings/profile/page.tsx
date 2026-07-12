'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import { useProfileQuery, useProfileMutations } from '@/hooks/creator/useProfile';
import {
  Save, CheckCircle2, User, Loader2, AlertCircle,
  Twitter, Instagram, Youtube, Globe, BadgeCheck,
  Mail, Smartphone, Linkedin, Send, RefreshCw, X,
  Briefcase, Hash, ShieldCheck, Link2,
  ImagePlus, Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import ImagePickerModal from '@/components/dashboard/image-picker/ImagePickerModal';
import { useConfirm } from '@/hooks/useConfirm';

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

function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <header className="flex items-start gap-3 mb-5">
      <div className="p-2 bg-[var(--surface-muted)] rounded-[var(--radius-md)] shrink-0">
        <Icon size={16} className="text-[var(--text-secondary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        {description && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>}
      </div>
    </header>
  );
}

function Field({ label, action, hint, children }: {
  label: string;
  action?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{label}</label>
        {action}
      </div>
      {children}
      {hint}
    </div>
  );
}

function IconInput({ icon: Icon, ...props }: { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
      <input {...props} className={`${INPUT} pl-9`} />
    </div>
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
  const { confirm, confirmDialog } = useConfirm();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    mobile: '',
    avatar_url: '',
    tagline: '',
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    getCreatorProfileId().then(setProfileId).catch((e) => setError(e.message));
  }, []);

  const hydratedRef = useRef<string | null>(null);
  const savedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || !profileId || hydratedRef.current === profileId) return;
    hydratedRef.current = profileId;
    const meta = (profile.metadata ?? {}) as Record<string, string | undefined>;
    const nextForm = {
      full_name: profile.full_name ?? '',
      email: profile.email ?? '',
      mobile: profile.mobile ?? '',
      avatar_url: profile.avatar_url ?? '',
      tagline: meta.tagline ?? '',
      category: meta.category ?? '',
      website: meta.website ?? '',
      twitter: meta.twitter ?? '',
      instagram: meta.instagram ?? '',
      youtube: meta.youtube ?? '',
      linkedin: meta.linkedin ?? '',
      telegram: meta.telegram ?? '',
    };
    setForm(nextForm);
    savedRef.current = JSON.stringify(nextForm);
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
      savedRef.current = JSON.stringify(form);
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

  const removeAvatar = async () => {
    if (await confirm({ title: 'Remove profile photo?', description: 'Your photo will be cleared. The image stays in your Media Library.' })) {
      set('avatar_url', '');
    }
  };

  const CATEGORIES = [
    'Content Creator', 'Educator', 'Consultant', 'Coach', 'Designer',
    'Developer', 'Author', 'Musician', 'Photographer', 'Videographer',
    'Entrepreneur', 'Artist', 'Other',
  ];

  const SOCIALS = ([
    { key: 'website',   label: 'Website',     Icon: Globe,     ph: 'https://yoursite.com' },
    { key: 'twitter',   label: 'X / Twitter', Icon: Twitter,   ph: 'https://x.com/handle' },
    { key: 'instagram', label: 'Instagram',   Icon: Instagram, ph: 'https://instagram.com/handle' },
    { key: 'youtube',   label: 'YouTube',     Icon: Youtube,   ph: 'https://youtube.com/@channel' },
    { key: 'linkedin',  label: 'LinkedIn',    Icon: Linkedin,  ph: 'https://linkedin.com/in/handle' },
    { key: 'telegram',  label: 'Telegram',    Icon: Send,      ph: 'https://t.me/username' },
  ] as const);

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Profile" description="Your public identity — shown on your store page and creator bio." />
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
  const dirty = savedRef.current !== null && JSON.stringify(form) !== savedRef.current;

  return (
    <>
      <div className="space-y-6 pb-12">
        <PageHeader
          title="Profile"
          description="Your public identity — shown on your store page and creator bio."
          action={
            <div className="flex items-center gap-2.5">
              {saved && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[var(--success)]">
                  <CheckCircle2 size={13} /> Saved
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className={`flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold shadow-[var(--shadow-xs)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60 ${
                  dirty
                    ? 'bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)]'
                    : 'cursor-not-allowed border border-[var(--border)] bg-[var(--surface)] text-[var(--text-tertiary)]'
                }`}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          }
        />

        {error && (
          <div className="flex items-center gap-2 text-sm text-[var(--danger)] bg-[var(--danger-bg)] border border-[var(--danger)]/20 px-4 py-3 rounded-[var(--radius-md)]">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}

        {/* ───────── Public Identity ───────── */}
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-5 bg-[var(--surface-muted)] border-b border-[var(--border-subtle)]">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                aria-label={form.avatar_url ? 'Change profile photo' : 'Add profile photo'}
                className="group relative block w-16 h-16 rounded-[var(--radius-lg)] overflow-hidden bg-[var(--brand)] ring-2 ring-[var(--surface)] shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {form.avatar_url
                  ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="flex w-full h-full items-center justify-center text-lg font-bold text-[var(--text-on-brand)]">{initials}</span>}
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImagePlus size={18} className="text-white" />
                </span>
              </button>
              {form.avatar_url && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  aria-label="Remove profile photo"
                  className="absolute -right-1.5 -top-1.5 z-10 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-[var(--text-tertiary)] shadow-[var(--shadow-sm)] hover:border-[var(--danger)]/40 hover:text-[var(--danger)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-[var(--text-primary)] truncate">{form.full_name || 'Your name'}</p>
              {form.tagline
                ? <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-1">{form.tagline}</p>
                : <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Add a tagline to introduce yourself</p>}
              {form.category && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-[var(--text-tertiary)]">
                  <span className="inline-flex items-center gap-1"><Briefcase size={11} /> {form.category}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] px-2.5 py-1.5 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors"
            >
              <ImagePlus size={12} /> {form.avatar_url ? 'Change photo' : 'Add photo'}
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name">
                <IconInput
                  icon={User}
                  type="text"
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  placeholder="Your display name"
                />
              </Field>
              <Field label="Category">
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] z-10 pointer-events-none" />
                  <select
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className={`${INPUT} pl-9 appearance-none`}
                  >
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </Field>
            </div>

            <Field
              label="Tagline"
              hint={<p className="text-xs text-[var(--text-tertiary)] text-right mt-1">{form.tagline.length}/100</p>}
            >
              <IconInput
                icon={Hash}
                type="text"
                maxLength={100}
                value={form.tagline}
                onChange={e => set('tagline', e.target.value)}
                placeholder="One line that describes you — e.g. 'Helping 10K+ developers ship faster'"
              />
            </Field>
          </div>
        </Card>

        {/* ───────── Contact & Verification ───────── */}
        <Card>
          <SectionHeader
            icon={ShieldCheck}
            title="Contact & Verification"
            description="Verified contact details are required for payouts and notifications."
          />
          <div className="space-y-5">
            <Field
              label="Email Address"
              action={
                profile?.email_verified
                  ? <VerifiedBadge />
                  : form.email
                    ? <UnverifiedBadge loading={sendingVerify === 'email'} onClick={() => { setSendingVerify('email'); setVerifyModal({ type: 'email', target: form.email }); }} />
                    : null
              }
              hint={!profile?.email_verified && form.email
                ? <p className="text-xs text-[var(--warning)] mt-1.5 flex items-center gap-1"><AlertCircle size={11} /> Email not verified — click &ldquo;Verify now&rdquo; to confirm ownership.</p>
                : undefined}
            >
              <IconInput
                icon={Mail}
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <Field
              label="Mobile Number"
              action={
                profile?.mobile_verified
                  ? <VerifiedBadge />
                  : form.mobile
                    ? <UnverifiedBadge loading={sendingVerify === 'mobile'} onClick={() => { setSendingVerify('mobile'); setVerifyModal({ type: 'sms', target: form.mobile }); }} />
                    : null
              }
              hint={!profile?.mobile_verified && form.mobile
                ? <p className="text-xs text-[var(--warning)] mt-1.5 flex items-center gap-1"><AlertCircle size={11} /> Mobile not verified — required for WhatsApp notifications.</p>
                : undefined}
            >
              <IconInput
                icon={Smartphone}
                type="tel"
                value={form.mobile}
                onChange={e => set('mobile', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </Field>
          </div>
        </Card>

        {/* ───────── Links & Social ───────── */}
        <Card>
          <SectionHeader
            icon={Link2}
            title="Links & Social"
            description="Shown on your public store / bio page."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SOCIALS.map(({ key, label, Icon, ph }) => (
              <Field key={key} label={label}>
                <IconInput
                  icon={Icon}
                  type="url"
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={ph}
                />
              </Field>
            ))}
          </div>
        </Card>
      </div>

      {verifyModal && (
        <OtpModal
          type={verifyModal.type}
          target={verifyModal.target}
          onSuccess={handleVerifySuccess}
          onClose={() => { setVerifyModal(null); setSendingVerify(null); }}
        />
      )}

      <ImagePickerModal
        open={pickerOpen}
        bucket="creator-public"
        kind="avatar"
        title="Select Profile Photo"
        currentUrl={form.avatar_url || undefined}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => set('avatar_url', url)}
      />
      {confirmDialog}
    </>
  );
}
