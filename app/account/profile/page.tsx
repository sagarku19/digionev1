'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User as UserIcon, Mail, Camera, Loader2, Save } from 'lucide-react';

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({ full_name: '', avatar_url: '' });
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          window.location.href = '/login';
          return;
        }

        setEmail(session.user.email || '');

        const { data, error } = await supabase
          .from('users')
          .select('profiles(full_name, avatar_url)')
          .eq('auth_provider_id', session.user.id)
          .maybeSingle();

        if (data && data.profiles) {
          const pData = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
          if (pData) setProfile({ full_name: pData.full_name, avatar_url: pData.avatar_url });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // Update users table link if needed or directly profiles
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_provider_id', session.user.id)
        .single();
        
      if (!userData) throw new Error('User not found in system table');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        })
        .eq('id', userData.id);

      if (error) throw error;
      
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'C';

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-gray-50 dark:bg-black">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white mb-2">My Profile</h1>
        <p className="text-gray-500 mb-8">Manage your personal information, connected email, and public image.</p>
        
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-3xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
          <form onSubmit={handleUpdate} className="space-y-8 relative z-10">
            
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-8 border-b border-gray-100 dark:border-gray-800/50">
              <div className="w-24 h-24 rounded-full bg-[#E83A2E] flex items-center justify-center text-white font-bold text-3xl shadow-sm overflow-hidden shrink-0 relative group">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Profile Avatar</h3>
                <p className="text-sm text-gray-500 mb-3 max-w-sm">
                  This image will be visible on your receipts, navigation menu, and community posts.
                </p>
                <input 
                  type="text" 
                  placeholder="Paste an image URL here..." 
                  value={profile.avatar_url || ''}
                  onChange={(e) => setProfile({...profile, avatar_url: e.target.value})}
                  className="w-full sm:w-80 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/20 focus:border-[#E83A2E] transition-all"
                />
              </div>
            </div>

            {/* Account Details */}
            <div className="space-y-5">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-gray-400" /> Full Name
                </label>
                <input 
                  type="text" 
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-md focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/20 focus:border-[#E83A2E] transition-all font-medium text-gray-900"
                />
              </div>

              <div className="grid gap-2 opacity-70">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" /> Authorized Email Address
                </label>
                <input 
                  type="email" 
                  value={email}
                  disabled
                  title="Your login email cannot be changed here."
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-md cursor-not-allowed font-medium text-gray-600"
                />
                <p className="text-xs text-gray-500 font-medium ml-1">Email tied to your authentication provider.</p>
              </div>
            </div>

            {message.text && (
              <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                {message.text}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-[#E83A2E] hover:bg-[#d4352b] text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(232,58,46,0.39)] hover:shadow-[0_6px_20px_rgba(232,58,46,0.5)] active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving Changes...' : 'Save Profile Details'}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
