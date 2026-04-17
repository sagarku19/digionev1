"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [role, setRole] = useState<'creator' | 'user'>('creator');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const getPasswordStrength = () => {
    if (password.length === 0) return { label: '', color: 'bg-gray-200' };
    if (password.length < 6) return { label: 'Weak', color: 'bg-red-500' };
    if (password.length < 10 && !/\d/.test(password)) return { label: 'Medium', color: 'bg-amber-500' };
    return { label: 'Strong', color: 'bg-green-500' };
  };

  const str = getPasswordStrength();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (fullName.length < 2) {
      setError('Full name must be at least 2 characters');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (referralCode && data.user) {
      const { data: refData } = await supabase
        .from('referral_codes')
        .select('id, owner_creator_id')
        .eq('code', referralCode)
        .eq('is_active', true)
        .single();
        
      if (refData) {
        await supabase
          .from('user_referrals')
          .insert({
            referred_user_id: data.user.id,
            referrer_creator_id: refData.owner_creator_id,
            referral_code_id: refData.id,
          });
      }
    }

    if (data.session && data.user) {
      // Insert welcome notification — look up creator profile id first
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profile?.id) {
          await supabase.from('notifications').insert({
            recipient_creator_id: profile.id,
            title: '👋 Welcome to DigiOne!',
            message: "You're all set! Start by creating your first product or setting up your storefront.",
            type: 'welcome',
            action_url: '/dashboard/products',
          } as any);
        }
      } catch {
        // Non-critical — don't block redirect if notification insert fails
      }
      router.push('/dashboard');
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4 font-display">Check your email</h2>
        <p className="text-[var(--auth-text-2)] mb-8">
          We've sent a verification link to {email}. Click the link to complete your registration.
        </p>
        <Link href="/login" className="text-[var(--brand)] font-medium hover:underline">
          Return to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-8 font-display">Create your account</h2>
      
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input 
            type="text" 
            required
            className="w-full px-4 py-2 border rounded-md border-[var(--color-border)] focus:outline-none focus:border-[var(--brand)]" 
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />
        </div>
        
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
          <label className="block text-sm font-medium mb-1">Password</label>
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
          {password.length > 0 && (
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-[var(--auth-text-2)]">Strength: {str.label}</span>
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-1 w-8 rounded-full ${i < getPasswordStrengthScore(password) ? str.color : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Referral Code (Optional)</label>
          <input 
            type="text" 
            className="w-full px-4 py-2 border rounded-md border-[var(--color-border)] focus:outline-none focus:border-[var(--brand)]" 
            value={referralCode}
            onChange={e => setReferralCode(e.target.value.toUpperCase())}
          />
        </div>

        <div className="pt-2">
          <label className="block text-sm font-medium mb-2">I want to:</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                checked={role === 'creator'} 
                onChange={() => setRole('creator')}
                name="role"
                className="w-4 h-4 text-[var(--brand)] focus:ring-[var(--brand)]"
              />
              <span>Sell products (Creator account)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                checked={role === 'user'} 
                onChange={() => setRole('user')}
                name="role"
                className="w-4 h-4 text-[var(--brand)] focus:ring-[var(--brand)]"
              />
              <span>Buy products (Buyer account)</span>
            </label>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm py-2">{error}</div>}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[var(--brand)] text-white font-medium rounded-md hover:bg-[var(--brand-hover)] transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? 'Creating account...' : 'Create account →'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center text-sm">
        <span className="text-[var(--auth-text-2)]">Already have an account? </span>
        <Link href="/login" className="text-[var(--brand)] font-medium hover:underline">
          Log in →
        </Link>
      </div>

      <p className="mt-8 text-xs text-center text-[var(--auth-text-2)]">
        By signing up you agree to our Terms of Service and Privacy Policy.
      </p>
    </>
  );
}

function getPasswordStrengthScore(p: string) {
  let score = 0;
  if (p.length > 5) score++;
  if (p.length > 8) score++;
  if (/\d/.test(p)) score++;
  if (/[A-Z]/.test(p) && /[^a-zA-Z0-9]/.test(p)) score++;
  return score || 1;
}
