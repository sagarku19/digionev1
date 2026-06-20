'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfileQuery, useProfileMutations } from '@/hooks/creator/useProfile';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import { User as UserIcon, Mail, Camera, Loader2, Save } from 'lucide-react';
import { Rails, Cross, Kicker } from '@/src/components/marketing/Ledger';

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
}

const INPUT =
  'w-full px-4 py-3 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all';
const LABEL = 'text-[13px] font-semibold text-[#16130F] flex items-center gap-2';

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({ full_name: '', avatar_url: '' });
  const [email, setEmail] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [profileId, setProfileId] = useState('');
  const { data: profileRow, isLoading: loading } = useProfileQuery(profileId);
  const { updateProfile } = useProfileMutations();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return; }
      setEmail(user.email || '');
      getCreatorProfileId().then(setProfileId).catch(() => {});
    });
  }, []);

  // Hydrate form from server data exactly once per profileId. Without the guard,
  // background refetches (or the post-save invalidation) would clobber unsaved edits.
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profileRow || !profileId || hydratedRef.current === profileId) return;
    hydratedRef.current = profileId;
    setProfile({ full_name: profileRow.full_name, avatar_url: profileRow.avatar_url });
  }, [profileRow, profileId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      await updateProfile({
        creatorId: profileId,
        updates: { full_name: profile.full_name, avatar_url: profile.avatar_url },
      });
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'C';

  if (loading) {
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
            <Kicker index="00" route="/account/profile" />
            <h1 className="mt-7 text-[30px] sm:text-[40px] font-bold tracking-[-0.04em] leading-[1.05] text-[#16130F]">
              My <span className="text-[#E83A2E]">profile.</span>
            </h1>
            <p className="mt-4 text-[14px] sm:text-[15px] font-medium text-black/50 max-w-xl leading-relaxed">
              Manage your personal information, connected email, and public image.
            </p>
          </div>
        </Rails>
      </section>

      {/* Form */}
      <section className="relative bg-white">
        <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
        <Rails>
          <Cross className="-bottom-[5px] -left-[5px]" />
          <Cross className="-bottom-[5px] -right-[5px]" />
          <div className="px-5 sm:px-10 lg:px-14 py-10 sm:py-14">
            <div className="max-w-3xl bg-white border border-black/[0.1] rounded-xl shadow-[0_16px_50px_-30px_rgba(22,19,15,0.25)] p-6 sm:p-8">
              <form onSubmit={handleUpdate} className="space-y-8">

                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-8 border-b border-black/[0.06]">
                  <div className="w-20 h-20 rounded-lg bg-[#E83A2E] flex items-center justify-center text-white font-bold text-3xl overflow-hidden shrink-0 relative group">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                    <div className="absolute inset-0 bg-[#16130F]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#16130F] mb-1">Profile avatar</h3>
                    <p className="text-[13px] font-medium text-black/50 mb-3 max-w-sm leading-relaxed">
                      This image will be visible on your receipts, navigation menu, and community posts.
                    </p>
                    <input
                      type="text"
                      placeholder="Paste an image URL here..."
                      value={profile.avatar_url || ''}
                      onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                      className={`${INPUT} sm:w-80 py-2 text-[13px]`}
                    />
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
                    disabled={saving}
                    className="flex items-center gap-2 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving changes...' : 'Save profile details'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </Rails>
      </section>
    </div>
  );
}
