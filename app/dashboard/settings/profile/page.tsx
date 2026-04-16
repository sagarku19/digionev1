'use client';
// Profile Settings — creator name, email, phone, avatar + email/phone verification.
// DB tables: profiles (read/write), auth (email OTP via supabase)

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import {
  Save, CheckCircle2, User, AtSign, Phone, Loader2, AlertCircle,
  Twitter, Instagram, Youtube, Globe, Camera, BadgeCheck,
  Mail, Smartphone, Linkedin, Send, RefreshCw, X, Link2,
  MapPin, Briefcase, Hash
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition';

type Profile = {
  full_name: string | null;
  email: string | null;
  email_verified: boolean | null;
  mobile: string | null;
  mobile_verified: boolean | null;
  avatar_url: string | null;
};

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
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
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-500/20 transition disabled:opacity-60"
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
    } catch (e: any) {
      setError(e.message);
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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => { sendOtp(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl">
              {type === 'email' ? <Mail size={15} className="text-indigo-600 dark:text-indigo-400" /> : <Smartphone size={15} className="text-indigo-600 dark:text-indigo-400" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Verify {type === 'email' ? 'Email' : 'Mobile'}</p>
              <p className="text-xs text-gray-400 truncate max-w-[180px]">{target}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <X size={15} />
          </button>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              A 6-digit code was sent to <span className="font-medium text-gray-700 dark:text-gray-300">{target}</span>. Enter it below.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/40 outline-none text-gray-900 dark:text-white"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={verifyOtp}
              disabled={otp.length < 6 || verifying}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm"
            >
              {verifying ? 'Verifying…' : 'Confirm Code'}
            </button>
            <button onClick={sendOtp} disabled={sending} className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
              {sending ? 'Resending…' : "Didn't receive it? Resend"}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Loader2 size={20} className="animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs text-gray-400 mt-2">Sending code…</p>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [profileId, setProfileId] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    mobile: '',
    avatar_url: '',
    // extra profile fields stored as JSON metadata or separate cols — saved as-is
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

  const loadProfile = async () => {
    try {
      const pid = await getCreatorProfileId(supabase);
      setProfileId(pid);
      const { data } = await supabase.from('profiles').select('*').eq('id', pid).single();
      if (data) {
        setProfile(data as Profile);
        const meta = (data as any).metadata ?? {};
        setForm({
          full_name: data.full_name ?? '',
          email: data.email ?? '',
          mobile: data.mobile ?? '',
          avatar_url: data.avatar_url ?? '',
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
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.from('profiles').update({
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
      } as any).eq('id', profileId);
      if (err) throw err;
      await loadProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySuccess = async () => {
    setVerifyModal(null);
    // Update verified flag in profiles table
    if (verifyModal?.type === 'email') {
      await supabase.from('profiles').update({ email_verified: true } as any).eq('id', profileId);
    } else {
      await supabase.from('profiles').update({ mobile_verified: true } as any).eq('id', profileId);
    }
    await loadProfile();
  };

  const CATEGORIES = [
    'Content Creator', 'Educator', 'Consultant', 'Coach', 'Designer',
    'Developer', 'Author', 'Musician', 'Photographer', 'Videographer',
    'Entrepreneur', 'Artist', 'Other',
  ];

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pb-16 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 animate-pulse space-y-4">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const initials = form.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Your public identity — shown on your store page and creator bio.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all shrink-0"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/40 px-4 py-3 rounded-xl">
            <CheckCircle2 size={14} className="shrink-0" /> Profile saved.
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 px-4 py-3 rounded-xl">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}

        {/* ── Avatar + Identity ── */}
        <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          {/* Cover strip */}
          <div className="h-24 bg-linear-to-r from-indigo-500 via-violet-500 to-fuchsia-500 relative">
            <div className="absolute -bottom-8 left-6">
              <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-[#0D0D1F] bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center overflow-hidden shadow-lg">
                {form.avatar_url
                  ? <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-white">{initials}</span>
                }
              </div>
            </div>
          </div>

          <div className="px-6 pt-12 pb-6 space-y-5">
            {/* Avatar URL */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Profile Photo URL
              </label>
              <div className="relative">
                <Camera size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="url" value={form.avatar_url} onChange={e => set('avatar_url', e.target.value)}
                  placeholder="https://example.com/photo.jpg" className={`${INPUT} pl-9`} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                    placeholder="Your display name" className={`${INPUT} pl-9`} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                  <select value={form.category} onChange={e => set('category', e.target.value)}
                    className={`${INPUT} pl-9 appearance-none`}>
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Tagline</label>
              <div className="relative">
                <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" maxLength={100} value={form.tagline} onChange={e => set('tagline', e.target.value)}
                  placeholder="One line that describes you — e.g. 'Helping 10K+ developers ship faster'" className={`${INPUT} pl-9`} />
              </div>
              <p className="text-xs text-gray-400 text-right mt-1">{form.tagline.length}/100</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Location</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                  placeholder="Mumbai, India" className={`${INPUT} pl-9`} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Contact & Verification ── */}
        <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Contact & Verification</p>
            <p className="text-xs text-gray-400 mt-0.5">Verified contact details are required for payouts and notifications.</p>
          </div>
          <div className="px-6 py-6 space-y-5">
            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email Address</label>
                {profile?.email_verified
                  ? <VerifiedBadge />
                  : form.email
                    ? <UnverifiedBadge loading={sendingVerify === 'email'} onClick={() => { setSendingVerify('email'); setVerifyModal({ type: 'email', target: form.email }); }} />
                    : null
                }
              </div>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={form.email} onChange={e => { set('email', e.target.value); }}
                  placeholder="you@example.com" className={`${INPUT} pl-9`} />
              </div>
              {!profile?.email_verified && form.email && (
                <p className="text-xs text-amber-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> Email not verified — click "Verify now" to confirm ownership.
                </p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mobile Number</label>
                {profile?.mobile_verified
                  ? <VerifiedBadge />
                  : form.mobile
                    ? <UnverifiedBadge loading={sendingVerify === 'mobile'} onClick={() => { setSendingVerify('mobile'); setVerifyModal({ type: 'sms', target: form.mobile }); }} />
                    : null
                }
              </div>
              <div className="relative">
                <Smartphone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)}
                  placeholder="+91 98765 43210" className={`${INPUT} pl-9`} />
              </div>
              {!profile?.mobile_verified && form.mobile && (
                <p className="text-xs text-amber-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> Mobile not verified — required for WhatsApp notifications.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Social & Web ── */}
        <div className="bg-white dark:bg-[#0D0D1F] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Links & Social</p>
            <p className="text-xs text-gray-400 mt-0.5">Shown on your public store / bio page.</p>
          </div>
          <div className="px-6 py-6 space-y-4">
            {([
              { key: 'website',   label: 'Website',    Icon: Globe,     ph: 'https://yoursite.com',            prefix: '' },
              { key: 'twitter',   label: 'X / Twitter', Icon: Twitter,  ph: 'https://x.com/handle',            prefix: '' },
              { key: 'instagram', label: 'Instagram',  Icon: Instagram, ph: 'https://instagram.com/handle',    prefix: '' },
              { key: 'youtube',   label: 'YouTube',    Icon: Youtube,   ph: 'https://youtube.com/@channel',    prefix: '' },
              { key: 'linkedin',  label: 'LinkedIn',   Icon: Linkedin,  ph: 'https://linkedin.com/in/handle',  prefix: '' },
              { key: 'telegram',  label: 'Telegram',   Icon: Send,      ph: 'https://t.me/username',           prefix: '' },
            ] as const).map(({ key, label, Icon, ph }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
                <div className="relative">
                  <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="url" value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                    placeholder={ph} className={`${INPUT} pl-9`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save CTA at bottom */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all">
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
