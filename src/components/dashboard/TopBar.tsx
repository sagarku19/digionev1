'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, User, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  // Stabilise the supabase client so it doesn't change on every render
  // (createClient() is called once and stored in a ref)
  const supabaseRef = useRef(createClient());
  const [showDropdown, setShowDropdown] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // users.auth_provider_id stores the Supabase auth UID
        // profiles links to users via profiles.user_id → users.id
        const { data, error } = await supabase
          .from('users')
          .select('id, profiles(full_name, avatar_url)')
          .eq('auth_provider_id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('TopBar profile fetch error:', error.message);
          return;
        }

        const pd = Array.isArray(data?.profiles) ? data?.profiles[0] : data?.profiles;
        setProfile(pd ?? null);
      } catch (err) {
        console.error('TopBar fetchUser unexpected error:', err);
      }
    };
    fetchUser();
  // Empty deps: run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabaseRef.current.auth.signOut();
    router.push('/login');
  };

  // Dynamically format title based on URL /dashboard/marketing -> Marketing
  const rawPath = pathname?.split('/dashboard')[1] || '';
  const segment = rawPath.split('/')[1] || '';
  const pageTitle = segment ? segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ') : 'Overview';

  return (
    <header className="h-16 w-full bg-white dark:bg-[#060612] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30 ml-auto transition-all">
      <div className="flex items-center gap-4 pl-10 md:pl-0">
         <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        <button className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          <Bell className="w-4 h-4" />
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition focus:outline-none"
          >
            <span className="text-sm font-medium hidden sm:block pl-2 text-gray-700 dark:text-gray-300">
              {profile?.full_name || 'Creator'}
            </span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold uppercase overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name ? profile.full_name.charAt(0) : 'C'
              )}
            </div>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 mb-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {profile?.full_name || 'Creator Account'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  @{profile?.full_name?.toLowerCase().replace(/\s+/g, '_') || 'creator'}
                </p>
              </div>
              
              <button 
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition"
                onClick={() => { setShowDropdown(false); router.push('/dashboard/settings'); }}
              >
                <User className="w-4 h-4 text-gray-500" />
                Profile Settings
              </button>
              
              <button 
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 text-red-400" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
