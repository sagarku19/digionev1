'use client';
// Billing & KYC — full identity verification + bank + UPI + address.
// DB tables: creator_kyc (read/write via upsert)

import React, { useState, useEffect } from 'react';
import { useEarnings } from '@/hooks/useEarnings';
import { createClient } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import {
  ShieldCheck, ShieldAlert, Building2, AlertCircle, Clock,
  ChevronRight, User, CreditCard, Eye, EyeOff,
  CheckCircle2, RefreshCw, BadgeCheck, MapPin, Calendar,
  Smartphone, Wallet, Info
} from 'lucide-react';

const inputCls = 'w-full px-4 py-2.5 bg-[var(--bg-secondary)]/60 border border-gray-200 dark:border-[var(--border)]/60 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none text-[var(--text-primary)] text-sm disabled:opacity-60 disabled:cursor-not-allowed transition placeholder-gray-400 dark:placeholder-gray-600';

type KycData = {
  status: string;
  kyc_level: string;
  legal_name: string | null;
  pan_enc: string | null;
  pan_last4: string | null;
  pan_verified: boolean | null;
  pan_verified_at: string | null;
  bank_account_enc: string | null;
  bank_account_name: string | null;
  bank_last4: string | null;
  bank_verified: boolean | null;
  bank_verified_at: string | null;
  ifsc_code: string | null;
  upi_id_enc: string | null;
  upi_verified: boolean | null;
  upi_verified_at: string | null;
  aadhaar_last4: string | null;
  dob: string | null;
  gender: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  rejection_reason: string | null;
};

function VerifiedTag({ at }: { at?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
      <BadgeCheck size={11} /> Verified{at ? ` · ${new Date(at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
    </span>
  );
}

function Section({ title, subtitle, icon: Icon, iconBg, iconColor, tag, children }: {
  title: string; subtitle?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  tag?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
        <div className={`p-2 ${iconBg} rounded-xl`}>
          <Icon size={15} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {tag}
      </div>
      <div className="px-6 py-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function StatusBanner({ status, rejectionReason }: { status?: string; rejectionReason?: string | null }) {
  if (status === 'verified') return (
    <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl">
      <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Identity Verified · Payouts Enabled</p>
        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Your KYC and bank account have been verified. You can withdraw available funds anytime.</p>
      </div>
    </div>
  );
  if (status === 'pending') return (
    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl">
      <Clock size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Under Review</p>
        <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">Your submission is being reviewed by our compliance team — typically 1–2 business days.</p>
      </div>
    </div>
  );
  if (status === 'rejected') return (
    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
      <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-800 dark:text-red-300">Verification Rejected — Please Re-submit</p>
        {rejectionReason && <p className="text-xs font-mono mt-1.5 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 px-2 py-1 rounded">{rejectionReason}</p>}
      </div>
    </div>
  );
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
      <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">KYC Not Submitted</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">Complete the form below to enable payouts from your store.</p>
      </div>
    </div>
  );
}

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
  'Andaman & Nicobar','Chandigarh','Dadra & NH','Daman & Diu','Lakshadweep','Puducherry',
];

export default function KYCAndBillingPage() {
  const { kyc, isLoading, refreshEarnings } = useEarnings();
  const supabase = createClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAccount, setShowAccount] = useState(false);
  const [showUpi, setShowUpi] = useState(false);

  const empty: KycData = {
    status: '', kyc_level: 'basic',
    legal_name: '', pan_enc: '', pan_last4: null, pan_verified: null, pan_verified_at: null,
    bank_account_enc: '', bank_account_name: '', bank_last4: null, bank_verified: null, bank_verified_at: null,
    ifsc_code: '', upi_id_enc: '', upi_verified: null, upi_verified_at: null,
    aadhaar_last4: '', dob: '', gender: '',
    address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: 'India',
    rejection_reason: null,
  };

  const [form, setForm] = useState(empty);
  const set = (k: keyof KycData, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (kyc) setForm({ ...empty, ...kyc });
  }, [kyc]);

  const isVerified = kyc?.status === 'verified';
  const isPending = kyc?.status === 'pending';
  const isLocked = isVerified || isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    setIsSubmitting(true);
    try {
      const profileId = await getCreatorProfileId(supabase);
      const { error } = await supabase.from('creator_kyc').upsert({
        creator_id: profileId,
        legal_name: form.legal_name,
        pan_enc: form.pan_enc,
        bank_account_enc: form.bank_account_enc,
        bank_account_name: form.bank_account_name,
        ifsc_code: form.ifsc_code,
        upi_id_enc: form.upi_id_enc || null,
        aadhaar_last4: form.aadhaar_last4 || null,
        dob: form.dob || null,
        gender: form.gender || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        postal_code: form.postal_code || null,
        country: form.country || 'India',
        status: 'pending',
        kyc_level: 'basic',
      }).eq('creator_id', profileId);
      if (error) throw error;
      setSuccessMsg('Details submitted! Our compliance team will review within 1–2 business days.');
      refreshEarnings();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit KYC details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { label: 'Fill Details', done: !!kyc },
    { label: 'Under Review', done: isVerified || isPending },
    { label: 'Verified', done: isVerified },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 pt-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Billing & KYC</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Verify your identity and bank account to receive payouts from your store.
        </p>
      </div>

      {/* Status Banner */}
      {!isLoading && <StatusBanner status={kyc?.status} rejectionReason={kyc?.rejection_reason} />}

      {/* Progress Steps */}
      {!isLoading && (
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Verification Progress</p>
          <div className="flex items-center">
            {steps.map((step, idx) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    step.done ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : idx === steps.filter(s => s.done).length ? 'border-gray-900 dark:border-white text-gray-600 dark:text-[var(--text-secondary)] bg-gray-100 dark:bg-[var(--bg-secondary)]'
                    : 'border-gray-200 dark:border-[var(--border)] text-gray-400 bg-[var(--bg-secondary)]'
                  }`}>
                    {step.done ? <CheckCircle2 size={17} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <span className={`text-xs font-medium text-center leading-tight ${step.done ? 'text-emerald-600 dark:text-emerald-400' : idx === steps.filter(s => s.done).length ? 'text-gray-600 dark:text-[var(--text-secondary)]' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mb-5 transition-colors ${step.done ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 animate-pulse space-y-4">
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
              {Array.from({ length: 2 }).map((_, j) => <div key={j} className="h-10 bg-gray-100 dark:bg-[var(--bg-secondary)] rounded-xl" />)}
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── PAN / Identity ── */}
          <Section
            title="Personal Identity (PAN)"
            subtitle="Must exactly match your PAN card"
            icon={User}
            iconBg="bg-gray-100 dark:bg-[var(--bg-secondary)]"
            iconColor="text-gray-700 dark:text-[var(--text-secondary)]"
            tag={kyc?.pan_verified ? <VerifiedTag at={kyc.pan_verified_at} /> : undefined}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Legal Name">
                <input type="text" required value={form.legal_name ?? ''} disabled={isLocked}
                  onChange={e => set('legal_name', e.target.value)}
                  className={inputCls} placeholder="As per PAN card" />
              </Field>
              <Field label="PAN Number" hint="Format: ABCDE1234F">
                <input type="text" required value={form.pan_enc ?? ''} disabled={isLocked} maxLength={10}
                  onChange={e => set('pan_enc', e.target.value.toUpperCase())}
                  className={`${inputCls} font-mono uppercase`} placeholder="ABCDE1234F" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date of Birth">
                <div className="relative">
                  <Calendar size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={form.dob ?? ''} disabled={isLocked}
                    onChange={e => set('dob', e.target.value)}
                    className={`${inputCls} pl-9`} />
                </div>
              </Field>
              <Field label="Gender">
                <select value={form.gender ?? ''} disabled={isLocked}
                  onChange={e => set('gender', e.target.value)}
                  className={`${inputCls} appearance-none`}>
                  <option value="">Select…</option>
                  <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                </select>
              </Field>
              <Field label="Aadhaar Last 4 Digits" hint="Optional — for faster verification">
                <div className="relative">
                  <Smartphone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" maxLength={4} value={form.aadhaar_last4 ?? ''} disabled={isLocked}
                    onChange={e => set('aadhaar_last4', e.target.value.replace(/\D/g, ''))}
                    className={`${inputCls} pl-9 font-mono`} placeholder="XXXX" />
                </div>
              </Field>
            </div>
          </Section>

          {/* ── Address ── */}
          <Section
            title="Address"
            subtitle="Your current residential address"
            icon={MapPin}
            iconBg="bg-gray-100 dark:bg-[var(--bg-secondary)]"
            iconColor="text-gray-700 dark:text-[var(--text-secondary)]"
          >
            <Field label="Address Line 1">
              <input type="text" value={form.address_line1 ?? ''} disabled={isLocked}
                onChange={e => set('address_line1', e.target.value)}
                className={inputCls} placeholder="Flat / House no., Street" />
            </Field>
            <Field label="Address Line 2 (optional)">
              <input type="text" value={form.address_line2 ?? ''} disabled={isLocked}
                onChange={e => set('address_line2', e.target.value)}
                className={inputCls} placeholder="Area, Landmark" />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="City">
                <input type="text" value={form.city ?? ''} disabled={isLocked}
                  onChange={e => set('city', e.target.value)}
                  className={inputCls} placeholder="Mumbai" />
              </Field>
              <div className="sm:col-span-1">
                <Field label="State">
                  <select value={form.state ?? ''} disabled={isLocked}
                    onChange={e => set('state', e.target.value)}
                    className={`${inputCls} appearance-none`}>
                    <option value="">Select…</option>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Pincode">
                <input type="text" maxLength={6} value={form.postal_code ?? ''} disabled={isLocked}
                  onChange={e => set('postal_code', e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} font-mono`} placeholder="400001" />
              </Field>
              <Field label="Country">
                <input type="text" value={form.country ?? 'India'} disabled={isLocked}
                  onChange={e => set('country', e.target.value)}
                  className={inputCls} placeholder="India" />
              </Field>
            </div>
          </Section>

          {/* ── Bank Account ── */}
          <Section
            title="Settlement Bank Account"
            subtitle="Payout will be transferred here"
            icon={Building2}
            iconBg="bg-blue-100 dark:bg-blue-500/20"
            iconColor="text-blue-600 dark:text-blue-400"
            tag={kyc?.bank_verified ? <VerifiedTag at={kyc.bank_verified_at} /> : undefined}
          >
            <Field label="Account Holder Name" hint="Must match your legal name exactly">
              <input type="text" required value={form.bank_account_name ?? ''} disabled={isLocked}
                onChange={e => setForm(f => ({ ...f, bank_account_name: e.target.value }))}
                className={inputCls} placeholder="Full name as per bank records" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Account Number">
                <div className="relative">
                  <input
                    type={showAccount ? 'text' : 'password'} required
                    value={form.bank_account_enc ?? ''} disabled={isLocked}
                    onChange={e => setForm(f => ({ ...f, bank_account_enc: e.target.value }))}
                    className={`${inputCls} font-mono pr-10`} placeholder="••••••••••••" />
                  {!isLocked && (
                    <button type="button" onClick={() => setShowAccount(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {showAccount ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
                {kyc?.bank_last4 && isLocked && (
                  <p className="text-xs text-gray-400 mt-1">Ending in •••• {kyc.bank_last4}</p>
                )}
              </Field>
              <Field label="IFSC Code" hint="11-character bank branch code">
                <input type="text" required value={form.ifsc_code ?? ''} disabled={isLocked} maxLength={11}
                  onChange={e => setForm(f => ({ ...f, ifsc_code: e.target.value.toUpperCase() }))}
                  className={`${inputCls} font-mono uppercase`} placeholder="SBIN0001234" />
              </Field>
            </div>
          </Section>

          {/* ── UPI (optional) ── */}
          <Section
            title="UPI ID"
            subtitle="Optional — for instant payout via UPI"
            icon={Wallet}
            iconBg="bg-emerald-100 dark:bg-emerald-500/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
            tag={kyc?.upi_verified ? <VerifiedTag at={kyc.upi_verified_at} /> : <span className="text-xs text-gray-400 bg-gray-100 dark:bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">Optional</span>}
          >
            <Field label="UPI ID" hint="e.g. name@upi or 9876543210@ybl">
              <div className="relative">
                <Wallet size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showUpi ? 'text' : 'password'}
                  value={form.upi_id_enc ?? ''} disabled={isLocked}
                  onChange={e => setForm(f => ({ ...f, upi_id_enc: e.target.value }))}
                  className={`${inputCls} pl-9 pr-10 font-mono`} placeholder="yourname@upi" />
                {!isLocked && (
                  <button type="button" onClick={() => setShowUpi(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showUpi ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </Field>
          </Section>

          {/* Footer */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              {errorMsg && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle size={13} />{errorMsg}</p>}
              {successMsg && <p className="text-sm text-emerald-500 flex items-center gap-1.5"><CheckCircle2 size={13} />{successMsg}</p>}
              {!errorMsg && !successMsg && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Info size={11} /> Financial details are encrypted and stored securely.
                </p>
              )}
            </div>

            {!isLocked && (
              <button type="submit" disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 text-white dark:text-gray-900 font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm">
                {isSubmitting
                  ? <><RefreshCw size={13} className="animate-spin" />Submitting…</>
                  : <>Submit for Verification <ChevronRight size={13} /></>}
              </button>
            )}
            {isPending && (
              <div className="flex items-center gap-2 text-sm text-blue-500">
                <Clock size={14} /> Awaiting review
              </div>
            )}
            {isVerified && (
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <ShieldCheck size={14} /> Verified · No changes needed
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
