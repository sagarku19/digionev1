'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEarnings } from '@/hooks/commerce/useEarnings';
import {
  ShieldCheck, ShieldAlert, Building2, AlertCircle, Clock,
  ChevronRight, User, Eye, EyeOff,
  CheckCircle2, RefreshCw, BadgeCheck, MapPin, Calendar,
  Smartphone, Wallet, Info,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

const inputCls = 'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow disabled:opacity-60 disabled:cursor-not-allowed';

type KycData = {
  status: string;
  kyc_level: string;
  legal_name: string | null;
  pan: string | null;
  pan_last4: string | null;
  pan_verified: boolean | null;
  pan_verified_at: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  bank_last4: string | null;
  bank_verified: boolean | null;
  bank_verified_at: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
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
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--success)] bg-[var(--success-bg)] border border-[var(--success)]/20 px-2 py-0.5 rounded-[var(--radius-pill)]">
      <BadgeCheck size={11} /> Verified{at ? ` · ${new Date(at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
    </span>
  );
}

function Section({ title, subtitle, icon: Icon, iconBg, iconColor, tag, children }: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  tag?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
        <div className={`p-2 ${iconBg} rounded-[var(--radius-md)]`}>
          <Icon size={15} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
          {subtitle && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{subtitle}</p>}
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
      <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-[var(--text-tertiary)] mt-1">{hint}</p>}
    </div>
  );
}

function StatusBanner({ status, rejectionReason }: { status?: string; rejectionReason?: string | null }) {
  if (status === 'verified') return (
    <div className="flex items-start gap-3 p-4 bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-[var(--radius-lg)]">
      <ShieldCheck size={18} className="text-[var(--success)] shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-[var(--success)]">Identity Verified · Payouts Enabled</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your KYC and bank account have been verified. You can withdraw available funds anytime.</p>
      </div>
    </div>
  );
  if (status === 'pending') return (
    <div className="flex items-start gap-3 p-4 bg-[var(--info-bg)] border border-[var(--info)]/20 rounded-[var(--radius-lg)]">
      <Clock size={18} className="text-[var(--info)] shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-[var(--info)]">Under Review</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your submission is being reviewed by our compliance team — typically 1–2 business days.</p>
      </div>
    </div>
  );
  if (status === 'rejected') return (
    <div className="flex items-start gap-3 p-4 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[var(--radius-lg)]">
      <AlertCircle size={18} className="text-[var(--danger)] shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-[var(--danger)]">Verification Rejected — Please Re-submit</p>
        {rejectionReason && <p className="text-xs font-mono mt-1.5 text-[var(--danger)] bg-[var(--danger-bg)] px-2 py-1 rounded-[var(--radius-sm)]">{rejectionReason}</p>}
      </div>
    </div>
  );
  return (
    <div className="flex items-start gap-3 p-4 bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-[var(--radius-lg)]">
      <ShieldAlert size={18} className="text-[var(--warning)] shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-[var(--warning)]">KYC Not Submitted</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Complete the form below to enable payouts from your store.</p>
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
  const { kyc, isLoading, updateKyc } = useEarnings();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAccount, setShowAccount] = useState(false);
  const [showUpi, setShowUpi] = useState(false);

  const empty: KycData = {
    status: '', kyc_level: 'basic',
    legal_name: '', pan: '', pan_last4: null, pan_verified: null, pan_verified_at: null,
    bank_account: '', bank_account_name: '', bank_last4: null, bank_verified: null, bank_verified_at: null,
    ifsc_code: '', upi_id: '', upi_verified: null, upi_verified_at: null,
    aadhaar_last4: '', dob: '', gender: '',
    address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: 'India',
    rejection_reason: null,
  };

  const [form, setForm] = useState(empty);
  const set = (k: keyof KycData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!kyc || hydratedRef.current) return;
    hydratedRef.current = true;
    // hydrate non-secret fields from the stored row; never put ciphertext into the raw PII inputs
    const { pan_enc, bank_account_enc, upi_id_enc, ...rest } = kyc as Record<string, unknown>;
    void pan_enc; void bank_account_enc; void upi_id_enc;
    setForm({ ...empty, ...(rest as Partial<typeof empty>) });
  }, [kyc, empty]);

  const isVerified = kyc?.status === 'verified';
  const isPending = kyc?.status === 'pending';
  const isLocked = isVerified || isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    setIsSubmitting(true);
    try {
      await updateKyc({
        legal_name: form.legal_name,
        pan: form.pan,
        bank_account: form.bank_account,
        bank_account_name: form.bank_account_name,
        ifsc_code: form.ifsc_code,
        upi_id: form.upi_id || '',
        aadhaar_last4: form.aadhaar_last4 || null,
        dob: form.dob || null,
        gender: form.gender || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        postal_code: form.postal_code || null,
        country: form.country || 'India',
      });
      setSuccessMsg('Details submitted! Our compliance team will review within 1–2 business days.');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to submit KYC details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { label: 'Fill Details', done: !!kyc },
    { label: 'Under Review', done: isVerified || isPending },
    { label: 'Verified', done: isVerified },
  ];

  const activeStepIdx = steps.filter(s => s.done).length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Billing & KYC"
        description="Verify your identity and bank account to receive payouts from your store."
      />

      {!isLoading && <StatusBanner status={kyc?.status} rejectionReason={kyc?.rejection_reason} />}

      {!isLoading && (
        <Card>
          <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-5">Verification Progress</p>
          <div className="flex items-center">
            {steps.map((step, idx) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    step.done
                      ? 'bg-[var(--success)] border-[var(--success)] text-[var(--text-on-brand)] shadow-[var(--shadow-sm)]'
                      : idx === activeStepIdx
                      ? 'border-[var(--text-primary)] text-[var(--text-secondary)] bg-[var(--surface-muted)]'
                      : 'border-[var(--border)] text-[var(--text-tertiary)] bg-[var(--surface-muted)]'
                  }`}>
                    {step.done ? <CheckCircle2 size={17} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <span className={`text-xs font-medium text-center leading-tight ${
                    step.done
                      ? 'text-[var(--success)]'
                      : idx === activeStepIdx
                      ? 'text-[var(--text-secondary)]'
                      : 'text-[var(--text-tertiary)]'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mb-5 transition-colors ${step.done ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">

          <Section
            title="Personal Identity (PAN)"
            subtitle="Must exactly match your PAN card"
            icon={User}
            iconBg="bg-[var(--surface-muted)]"
            iconColor="text-[var(--text-secondary)]"
            tag={kyc?.pan_verified ? <VerifiedTag at={kyc.pan_verified_at} /> : undefined}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Legal Name">
                <input
                  type="text"
                  required
                  value={form.legal_name ?? ''}
                  disabled={isLocked}
                  onChange={e => set('legal_name', e.target.value)}
                  className={inputCls}
                  placeholder="As per PAN card"
                />
              </Field>
              <Field label="PAN Number" hint="Format: ABCDE1234F">
                <input
                  type="text"
                  required
                  value={form.pan ?? ''}
                  disabled={isLocked}
                  maxLength={10}
                  onChange={e => set('pan', e.target.value.toUpperCase())}
                  className={`${inputCls} font-mono uppercase`}
                  placeholder="ABCDE1234F"
                />
                {kyc?.pan_last4 && isLocked && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Ending in ••••• {kyc.pan_last4}</p>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date of Birth">
                <div className="relative">
                  <Calendar size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="date"
                    value={form.dob ?? ''}
                    disabled={isLocked}
                    onChange={e => set('dob', e.target.value)}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </Field>
              <Field label="Gender">
                <select
                  value={form.gender ?? ''}
                  disabled={isLocked}
                  onChange={e => set('gender', e.target.value)}
                  className={`${inputCls} appearance-none`}
                >
                  <option value="">Select…</option>
                  <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                </select>
              </Field>
              <Field label="Aadhaar Last 4 Digits" hint="Optional — for faster verification">
                <div className="relative">
                  <Smartphone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    maxLength={4}
                    value={form.aadhaar_last4 ?? ''}
                    disabled={isLocked}
                    onChange={e => set('aadhaar_last4', e.target.value.replace(/\D/g, ''))}
                    className={`${inputCls} pl-9 font-mono`}
                    placeholder="XXXX"
                  />
                </div>
              </Field>
            </div>
          </Section>

          <Section
            title="Address"
            subtitle="Your current residential address"
            icon={MapPin}
            iconBg="bg-[var(--surface-muted)]"
            iconColor="text-[var(--text-secondary)]"
          >
            <Field label="Address Line 1">
              <input
                type="text"
                value={form.address_line1 ?? ''}
                disabled={isLocked}
                onChange={e => set('address_line1', e.target.value)}
                className={inputCls}
                placeholder="Flat / House no., Street"
              />
            </Field>
            <Field label="Address Line 2 (optional)">
              <input
                type="text"
                value={form.address_line2 ?? ''}
                disabled={isLocked}
                onChange={e => set('address_line2', e.target.value)}
                className={inputCls}
                placeholder="Area, Landmark"
              />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="City">
                <input
                  type="text"
                  value={form.city ?? ''}
                  disabled={isLocked}
                  onChange={e => set('city', e.target.value)}
                  className={inputCls}
                  placeholder="Mumbai"
                />
              </Field>
              <div className="sm:col-span-1">
                <Field label="State">
                  <select
                    value={form.state ?? ''}
                    disabled={isLocked}
                    onChange={e => set('state', e.target.value)}
                    className={`${inputCls} appearance-none`}
                  >
                    <option value="">Select…</option>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Pincode">
                <input
                  type="text"
                  maxLength={6}
                  value={form.postal_code ?? ''}
                  disabled={isLocked}
                  onChange={e => set('postal_code', e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} font-mono`}
                  placeholder="400001"
                />
              </Field>
              <Field label="Country">
                <input
                  type="text"
                  value={form.country ?? 'India'}
                  disabled={isLocked}
                  onChange={e => set('country', e.target.value)}
                  className={inputCls}
                  placeholder="India"
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Settlement Bank Account"
            subtitle="Payout will be transferred here"
            icon={Building2}
            iconBg="bg-[var(--info-bg)]"
            iconColor="text-[var(--info)]"
            tag={kyc?.bank_verified ? <VerifiedTag at={kyc.bank_verified_at} /> : undefined}
          >
            <Field label="Account Holder Name" hint="Must match your legal name exactly">
              <input
                type="text"
                required
                value={form.bank_account_name ?? ''}
                disabled={isLocked}
                onChange={e => setForm(f => ({ ...f, bank_account_name: e.target.value }))}
                className={inputCls}
                placeholder="Full name as per bank records"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Account Number">
                <div className="relative">
                  <input
                    type={showAccount ? 'text' : 'password'}
                    required
                    value={form.bank_account ?? ''}
                    disabled={isLocked}
                    onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))}
                    className={`${inputCls} font-mono pr-10`}
                    placeholder="••••••••••••"
                  />
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => setShowAccount(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
                    >
                      {showAccount ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
                {kyc?.bank_last4 && isLocked && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Ending in •••• {kyc.bank_last4}</p>
                )}
              </Field>
              <Field label="IFSC Code" hint="11-character bank branch code">
                <input
                  type="text"
                  required
                  value={form.ifsc_code ?? ''}
                  disabled={isLocked}
                  maxLength={11}
                  onChange={e => setForm(f => ({ ...f, ifsc_code: e.target.value.toUpperCase() }))}
                  className={`${inputCls} font-mono uppercase`}
                  placeholder="SBIN0001234"
                />
              </Field>
            </div>
          </Section>

          <Section
            title="UPI ID"
            subtitle="Optional — for instant payout via UPI"
            icon={Wallet}
            iconBg="bg-[var(--success-bg)]"
            iconColor="text-[var(--success)]"
            tag={
              kyc?.upi_verified
                ? <VerifiedTag at={kyc.upi_verified_at} />
                : <span className="text-xs text-[var(--text-tertiary)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-[var(--radius-pill)]">Optional</span>
            }
          >
            <Field label="UPI ID" hint="e.g. name@upi or 9876543210@ybl">
              <div className="relative">
                <Wallet size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type={showUpi ? 'text' : 'password'}
                  value={form.upi_id ?? ''}
                  disabled={isLocked}
                  onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))}
                  className={`${inputCls} pl-9 pr-10 font-mono`}
                  placeholder="yourname@upi"
                />
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => setShowUpi(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]"
                  >
                    {showUpi ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </Field>
          </Section>

          <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              {errorMsg && <p className="text-sm text-[var(--danger)] flex items-center gap-1.5"><AlertCircle size={13} />{errorMsg}</p>}
              {successMsg && <p className="text-sm text-[var(--success)] flex items-center gap-1.5"><CheckCircle2 size={13} />{successMsg}</p>}
              {!errorMsg && !successMsg && (
                <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Info size={11} /> Financial details are encrypted and stored securely.
                </p>
              )}
            </div>

            {!isLocked && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] font-semibold px-6 py-2.5 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors text-sm"
              >
                {isSubmitting
                  ? <><RefreshCw size={13} className="animate-spin" />Submitting…</>
                  : <>Submit for Verification <ChevronRight size={13} /></>}
              </button>
            )}
            {isPending && (
              <div className="flex items-center gap-2 text-sm text-[var(--info)]">
                <Clock size={14} /> Awaiting review
              </div>
            )}
            {isVerified && (
              <div className="flex items-center gap-2 text-sm text-[var(--success)]">
                <ShieldCheck size={14} /> Verified · No changes needed
              </div>
            )}
          </Card>
        </form>
      )}
    </div>
  );
}
