"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';

function getPasswordStrengthScore(p: string) {
  let score = 0;
  if (p.length > 5) score++;
  if (p.length > 8) score++;
  if (/\d/.test(p)) score++;
  if (/[A-Z]/.test(p) && /[^a-zA-Z0-9]/.test(p)) score++;
  return score || 1;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getStrength = () => {
    if (password.length === 0) return { label: '', color: 'bg-black/[0.08]' };
    if (password.length < 6) return { label: 'Weak', color: 'bg-[#E83A2E]' };
    if (password.length < 10 && !/\d/.test(password)) return { label: 'Fair', color: 'bg-amber-400' };
    return { label: 'Strong', color: 'bg-emerald-500' };
  };
  const str = getStrength();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('auth_provider_id', user.id)
        .single();
      if (userData?.role === 'creator' || userData?.role === 'super_admin') {
        router.push('/dashboard');
      } else {
        router.push('/account/library');
      }
    } else {
      router.push('/login');
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="w-12 h-12 rounded-lg bg-[#E83A2E]/[0.07] border border-[#E83A2E]/15 flex items-center justify-center mb-5">
          <ShieldCheck className="w-6 h-6 text-[#E83A2E]" />
        </div>
        <p className="font-ledger text-[10px] font-medium tracking-[0.18em] text-black/35 uppercase mb-3">
          <span className="text-[#E83A2E]">{'>>'}</span>&nbsp;&nbsp;/reset-password
        </p>
        <h2 className="text-[26px] font-bold tracking-[-0.03em] text-[#16130F] mb-1.5">
          Set new password
        </h2>
        <p className="text-[14px] text-black/50 font-medium">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-[#16130F] mb-1.5">New password <span className="text-[#E83A2E]">*</span></label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Min. 6 characters"
              className="w-full px-4 py-3 pr-11 rounded-lg border border-black/[0.1] bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E] transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/35 hover:text-[#16130F] transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full flex-1 transition-all duration-300 ${i < getPasswordStrengthScore(password) ? str.color : 'bg-black/[0.06]'}`}
                  />
                ))}
              </div>
              <span className="font-ledger text-[10px] font-medium text-black/45 shrink-0">{str.label}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[#16130F] mb-1.5">Confirm password <span className="text-[#E83A2E]">*</span></label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              placeholder="Re-enter password"
              className={`w-full px-4 py-3 pr-11 rounded-lg border bg-white text-[14px] text-[#16130F] placeholder:text-black/30 focus:outline-none focus:ring-2 transition-all ${
                confirm.length > 0 && confirm !== password
                  ? 'border-[#E83A2E]/40 focus:ring-[#E83A2E]/15 focus:border-[#E83A2E]'
                  : 'border-black/[0.1] focus:ring-[#E83A2E]/15 focus:border-[#E83A2E]'
              }`}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/35 hover:text-[#16130F] transition-colors"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirm.length > 0 && confirm !== password && (
            <p className="mt-1.5 text-[12px] text-[#E83A2E] font-medium">Passwords do not match</p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#E83A2E]/[0.06] border border-[#E83A2E]/15 text-[13px] text-[#E83A2E] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-[#E83A2E] hover:bg-[#C92F24] text-white font-semibold text-[14px] rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? 'Updating…' : (
            <>
              Update password
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </>
  );
}
