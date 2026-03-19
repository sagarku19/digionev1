"use client";

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    if (data.user) {
      // Determine role for redirect
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('auth_provider_id', data.user.id)
        .single();
        
      const role = userData?.role || 'user';
      
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.push(returnUrl);
      } else if (role === 'creator' || role === 'super_admin') {
        router.push('/dashboard');
      } else {
        router.push('/account/library');
      }
      
      // We don't need to unset loading here because we're navigating away
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-8 font-display">Welcome back</h2>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input 
            type="email" 
            required
            className="w-full px-4 py-2 border rounded-md border-[var(--color-border)] focus:outline-none focus:border-[var(--brand)]" 
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
           <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium">Password</label>
             <Link href="/forgot-password" className="text-sm text-[var(--brand)] hover:underline">
               Forgot password?
             </Link>
          </div>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'} 
              required
              className="w-full px-4 py-2 border rounded-md border-[var(--color-border)] focus:outline-none focus:border-[var(--brand)]" 
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button 
              type="button"
              className="absolute right-3 top-2.5 text-[var(--auth-text-2)] hover:text-[var(--auth-text)]"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm py-2">{error}</div>}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[var(--brand)] text-white font-medium rounded-md hover:bg-[var(--brand-hover)] transition-colors disabled:opacity-50 mt-6"
        >
          {loading ? 'Logging in...' : 'Log in →'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-sm">
        <span className="text-[var(--auth-text-2)]">Don't have an account? </span>
        <Link href="/signup" className="text-[var(--brand)] font-medium hover:underline">
          Sign up free →
        </Link>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginContent />
    </Suspense>
  );
}
