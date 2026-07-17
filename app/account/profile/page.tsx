'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/current-user';
import { useProfileQuery, useProfileMutations } from '@/hooks/creator/useProfile';
import {
  User as UserIcon,
  Mail,
  Phone,
  Loader2,
  Save,
  BadgeCheck,
  Check,
  ArrowRight,
  Store,
} from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';
import type { Database } from '@/types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  mobile: string | null;
  mobile_verified: boolean | null;
}

const INPUT =
  'w-full px-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all';
const LABEL = 'text-[13px] font-semibold text-[#16130F] flex items-center gap-2';

const CREATOR_BENEFITS = [
  'Build storefronts, link-in-bio, and sales pages',
  'Upload and sell unlimited digital products',
  'Track earnings, customers, and analytics',
  'Request payouts straight to your bank',
];

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    avatar_url: '',
    mobile: '',
    mobile_verified: false,
  });
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [upgradeError, setUpgradeError] = useState('');
  const [profileId, setProfileId] = useState('');
  const [bootstrapping, setBootstrapping] = useState(true);
  const { data: profileRow } = useProfileQuery(profileId);
  const { updateProfile } = useProfileMutations();

  // Single bootstrap: one getUser() (auth lock hit once) + one joined query that
  // resolves the profile row in the same trip, seeded into the query cache so
  // useProfileQuery returns it without a second round-trip. Replaces the previous
  // 4-call chain (getUser → getCreatorProfileId's duplicate getUser → users→id →
  // profiles.*) that made the page slow to settle.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const user = await getCurrentUser();
      if (!user) { window.location.href = '/login'; return; }
      setEmail(user.email || '');
      setRole((user.app_metadata?.role as string) ?? null);

      const { data } = await supabase
        .from('users')
        .select('id, profiles(*)')
        .eq('auth_provider_id', user.id)
        .maybeSingle();

      const prof = (Array.isArray(data?.profiles) ? data?.profiles[0] : data?.profiles) as ProfileRow | null;
      if (prof?.id) {
        queryClient.setQueryData(['profiles', 'detail', prof.id], prof);
        setProfileId(prof.id);
      }
      setBootstrapping(false);
    })();
  }, [queryClient]);

  // Hydrate form from server data exactly once per profileId. Without the guard,
  // background refetches (or the post-save invalidation) would clobber unsaved edits.
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profileRow || !profileId || hydratedRef.current === profileId) return;
    hydratedRef.current = profileId;
    setProfile({
      full_name: profileRow.full_name,
      avatar_url: profileRow.avatar_url,
      mobile: profileRow.mobile,
      mobile_verified: profileRow.mobile_verified,
    });
  }, [profileRow, profileId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;

    const mobile = (profile.mobile || '').trim();
    if (mobile && !/^\d{10}$/.test(mobile)) {
      setMessage({ text: 'Enter a valid 10-digit mobile number.', type: 'error' });
      return;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      // A changed number can no longer claim the old verified state.
      const numberChanged = (profileRow?.mobile ?? '') !== mobile;
      await updateProfile({
        creatorId: profileId,
        updates: {
          full_name: profile.full_name,
          mobile: mobile || null,
          ...(numberChanged ? { mobile_verified: false } : {}),
        },
      });
      if (numberChanged) setProfile((p) => ({ ...p, mobile_verified: false }));
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    setUpgradeError('');
    try {
      const res = await fetch('/api/account/upgrade-to-creator', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not upgrade your account.');
      const supabase = createClient();
      await supabase.auth.refreshSession();
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      window.location.href = '/dashboard';
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : 'Could not upgrade your account.');
      setUpgrading(false);
    }
  };

  const initials = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'C';
  const isCreator = role === 'creator' || role === 'super_admin';
  const accountType = role === 'super_admin' ? 'Super admin' : role === 'creator' ? 'Creator' : 'Buyer';

  // Save is enabled only when an editable field differs from the saved row.
  const isDirty =
    (profile.full_name ?? '') !== (profileRow?.full_name ?? '') ||
    (profile.mobile ?? '').trim() !== (profileRow?.mobile ?? '');

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-7 h-7 text-black/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full overflow-hidden bg-white">

      {/* Header */}
      <section className="relative bg-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(22,19,15,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,19,15,0.035) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 0%, transparent 100%)',
          }}
        />
        <Rails className="pt-28 sm:pt-32">
          <div className="px-5 sm:px-10 lg:px-14 pb-10 sm:pb-12">
            <div className="max-w-3xl mx-auto">
              <Kicker index="00" route="/account/profile" />
              <h1 className="mt-7 text-[30px] sm:text-[40px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F]">
                My <span className="text-[#E83A2E]">profile.</span>
              </h1>
              <p className="mt-4 text-[14px] sm:text-[15px] font-medium text-black/50 max-w-xl leading-relaxed">
                Manage your personal information, contact details, and account access.
              </p>
            </div>
          </div>
        </Rails>
      </section>

      {/* Form */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <div className="px-5 sm:px-10 lg:px-14 py-10 sm:py-14">
            <div className="max-w-3xl mx-auto bg-white border border-black/[0.1] rounded-xl shadow-[0_16px_50px_-30px_rgba(22,19,15,0.25)] p-6 sm:p-8">
              <form onSubmit={handleUpdate} className="space-y-8">

                {/* Identity Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-8 border-b border-black/[0.06]">
                  <div className="w-20 h-20 rounded-lg bg-[#E83A2E] flex items-center justify-center text-white font-bold text-3xl overflow-hidden shrink-0">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#16130F] mb-1.5">
                      {profile.full_name || 'Your account'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold border ${
                          isCreator
                            ? 'bg-[#E83A2E]/[0.06] border-[#E83A2E]/15 text-[#E83A2E]'
                            : 'bg-black/[0.04] border-black/[0.08] text-black/55'
                        }`}
                      >
                        {isCreator ? <BadgeCheck className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                        {accountType}
                      </span>
                      {!isCreator && (
                        <span className="text-[12px] font-medium text-black/45">
                          Upgrade below to start selling.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-5">
                  <div className="grid gap-2">
                    <label className={LABEL}>
                      <UserIcon className="w-4 h-4 text-black/35" /> Full name
                    </label>
                    <input
                      type="text"
                      value={profile.full_name || ''}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Enter your full name"
                      className={INPUT}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className={LABEL}>
                      <Phone className="w-4 h-4 text-black/35" /> Mobile number
                      {profile.mobile && (
                        profile.mobile_verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold">
                            <BadgeCheck className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/[0.04] border border-black/[0.08] text-black/45 text-[11px] font-semibold">
                            Not verified
                          </span>
                        )
                      )}
                    </label>
                    <div className="flex items-stretch rounded-lg border border-black/[0.1] bg-white focus-within:ring-2 focus-within:ring-[#E83A2E]/15 focus-within:border-[#E83A2E] transition-all overflow-hidden">
                      <span className="flex items-center px-3 text-[14px] font-medium text-black/45 border-r border-black/[0.08] bg-[#FAF8F6] select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={profile.mobile || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })
                        }
                        placeholder="10-digit mobile number"
                        className="flex-1 px-4 py-3 text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none bg-transparent"
                      />
                    </div>
                    <p className="font-ledger text-[10px] text-black/35">
                      Used for order updates.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label className={LABEL}>
                      <Mail className="w-4 h-4 text-black/35" /> Authorized email address
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      title="Your login email cannot be changed here."
                      className={`${INPUT} bg-[#FAF8F6] text-black/50 cursor-not-allowed`}
                    />
                    <p className="font-ledger text-[10px] text-black/35">
                      Email tied to your authentication provider.
                    </p>
                  </div>
                </div>

                {message.text && (
                  <div
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-medium border ${
                      message.type === 'error'
                        ? 'bg-[#E83A2E]/[0.06] border-[#E83A2E]/15 text-[#E83A2E]'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${message.type === 'error' ? 'bg-[#E83A2E]' : 'bg-emerald-500'}`} />
                    {message.text}
                  </div>
                )}

                <div className="pt-4 border-t border-black/[0.06] flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || !isDirty}
                    className="flex items-center gap-2 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#E83A2E]"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving changes...' : 'Save profile details'}
                  </button>
                </div>

              </form>
            </div>

            {/* Upgrade to Creator */}
            {!isCreator && (
              <div className="max-w-3xl mx-auto mt-6 relative overflow-hidden rounded-xl bg-[#16130F] p-6 sm:p-8">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none opacity-50"
                  style={{ background: 'radial-gradient(circle at 85% 15%, rgba(232,58,46,0.22) 0%, transparent 45%)' }}
                />
                <div className="relative">
                  <div className="flex items-center gap-2 font-ledger text-[10px] uppercase tracking-[0.18em] text-[#FF6B5C]">
                    <span className="text-[#FF6B5C] font-semibold">&gt;&gt;</span>
                    <span className="h-px flex-1 bg-white/[0.12]" />
                    <span className="text-white/40">/dashboard</span>
                  </div>

                  <div className="mt-6 flex items-start gap-4">
                    <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5 text-[#FF6B5C]" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3 className="text-[19px] font-bold tracking-[-0.02em] text-white">
                        Start selling as a creator.
                      </h3>
                      <p className="mt-1 text-[14px] font-medium text-white/55 leading-relaxed max-w-md">
                        Turn your account into a creator workspace and unlock the full DigiOne dashboard — free to start.
                      </p>
                    </div>
                  </div>

                  <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    {CREATOR_BENEFITS.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-[13.5px] font-medium text-white/70">
                        <Check className="w-4 h-4 text-[#FF6B5C] mt-0.5 shrink-0" strokeWidth={2.2} />
                        {b}
                      </li>
                    ))}
                  </ul>

                  {upgradeError && (
                    <div className="mt-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-[#E83A2E]/15 border border-[#E83A2E]/25 text-[13px] font-medium text-[#FF6B5C]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B5C] shrink-0" />
                      {upgradeError}
                    </div>
                  )}

                  <div className="mt-7">
                    <button
                      type="button"
                      onClick={handleUpgrade}
                      disabled={upgrading}
                      className="group inline-flex items-center gap-2 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {upgrading ? 'Upgrading...' : 'Become a creator'}
                      {!upgrading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
        </Rails>
      </section>
    </div>
  );
}
