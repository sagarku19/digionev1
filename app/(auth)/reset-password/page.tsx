"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Determine where to route based on Role
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
      <h2 className="text-2xl font-bold mb-8 font-display">Set a new password</h2>
      
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">New password</label>
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

        <div>
           <label className="block text-sm font-medium mb-1">Confirm password</label>
          <div className="relative">
            <input 
              type={showConfirm ? 'text' : 'password'} 
              required
              className="w-full px-4 py-2 border rounded-md border-[var(--color-border)] focus:outline-none focus:border-[var(--brand)]" 
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
            <button 
              type="button"
              className="absolute right-3 top-2.5 text-[var(--auth-text-2)] hover:text-[var(--auth-text)]"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm py-2">{error}</div>}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[var(--brand)] text-white font-medium rounded-md hover:bg-[var(--brand-hover)] transition-colors disabled:opacity-50 mt-6"
        >
          {loading ? 'Updating...' : 'Update password →'}
        </button>
      </form>
    </>
  );
}
