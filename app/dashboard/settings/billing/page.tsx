'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEarnings } from '@/hooks/commerce/useEarnings';
import {
  ShieldCheck, ShieldAlert, Building2, AlertCircle, Clock,
  ChevronRight, ChevronLeft, User, Eye, EyeOff, Check, Lock,
  CheckCircle2, RefreshCw, BadgeCheck, MapPin, Calendar,
  Smartphone, Wallet, FileText, Upload,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useKycDocuments, type KycDocType } from '@/hooks/creator/useKycDocuments';

const inputCls = 'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow disabled:opacity-60 disabled:cursor-not-allowed';
const btnPrimary = 'inline-flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--accent-fg)] font-semibold px-5 py-2.5 rounded-[var(--radius-md)] text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors';
const btnBrand = 'inline-flex items-center justify-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-on-brand)] font-semibold px-5 py-2.5 rounded-[var(--radius-md)] text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors';
const btnGhost = 'inline-flex items-center justify-center gap-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] font-medium px-4 py-2.5 rounded-[var(--radius-md)] text-sm focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] transition-colors';

const STEP_LABELS = ['Identity', 'Address', 'Bank', 'Documents', 'Review'] as const;

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const isPan = (v: string) => PAN_RE.test((v ?? '').trim().toUpperCase());
const isIfsc = (v: string) => IFSC_RE.test((v ?? '').trim().toUpperCase());
const isAcct = (v: string) => /^[0-9]{9,18}$/.test((v ?? '').replace(/\s/g, ''));

const maskTail = (v?: string | null, keep = 4) => {
  const s = (v ?? '').replace(/\s/g, '');
  if (!s) return '—';
  if (s.length <= keep) return s;
  return '•'.repeat(Math.min(6, s.length - keep)) + s.slice(-keep);
};
const maskPan = (v?: string | null) => {
  const s = (v ?? '').trim().toUpperCase();
  if (!s) return '—';
  return s.length >= 6 ? `${s.slice(0, 5)}····${s.slice(-1)}` : s;
};

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

const EMPTY_FORM: KycData = {
  status: '', kyc_level: 'basic',
  legal_name: '', pan: '', pan_last4: null, pan_verified: null, pan_verified_at: null,
  bank_account: '', bank_account_name: '', bank_last4: null, bank_verified: null, bank_verified_at: null,
  ifsc_code: '', upi_id: '', upi_verified: null, upi_verified_at: null,
  aadhaar_last4: '', dob: '', gender: '',
  address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: 'India',
  rejection_reason: null,
};

function VerifiedTag({ at }: { at?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--success)] bg-[var(--success-bg)] border border-[var(--success)]/20 px-2 py-0.5 rounded-[var(--radius-pill)]">
      <BadgeCheck size={11} /> Verified{at ? ` · ${new Date(at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
    </span>
  );
}

function Field({ label, hint, required, error, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-[var(--danger)] ml-0.5">*</span>}
      </label>
      {children}
      {error
        ? <p className="text-xs text-[var(--danger)] mt-1 flex items-center gap-1"><AlertCircle size={11} />{error}</p>
        : hint && <p className="text-xs text-[var(--text-tertiary)] mt-1">{hint}</p>}
    </div>
  );
}

function StepHeader({ icon: Icon, title, description, tag }: {
  icon: React.ElementType;
  title: string;
  description: string;
  tag?: React.ReactNode;
}) {
  return (
    <header className="flex items-start gap-3 mb-5">
      <div className="p-2 bg-[var(--surface-muted)] rounded-[var(--radius-md)] shrink-0">
        <Icon size={16} className="text-[var(--text-secondary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>
      </div>
      {tag}
    </header>
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
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Complete the 5 quick steps below to enable payouts from your store.</p>
      </div>
    </div>
  );
}

function Stepper({ step, furthest, onJump }: { step: number; furthest: number; onJump: (s: number) => void }) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2 text-xs font-medium mb-5">
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const isActive = idx === step;
        const isDone = idx < step;
        const reachable = idx <= furthest;
        return (
          <React.Fragment key={label}>
            <li>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onJump(idx)}
                className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1.5 py-1 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${reachable ? 'cursor-pointer' : 'cursor-not-allowed'} ${
                  isActive ? 'text-[var(--brand)]' : isDone ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'
                }`}
              >
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold ${
                  isActive
                    ? 'bg-[var(--brand)] text-[var(--text-on-brand)]'
                    : isDone
                    ? 'bg-[var(--success)] text-[var(--text-on-brand)]'
                    : 'bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-tertiary)]'
                }`}>
                  {isDone ? <Check className="w-3 h-3" /> : idx}
                </span>
                <span className={`hidden sm:inline ${isActive ? 'font-semibold' : ''}`}>{label}</span>
              </button>
            </li>
            {idx < STEP_LABELS.length && <li aria-hidden className="text-[var(--text-tertiary)] px-0.5">→</li>}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

function SummaryRow({ label, value, mono, verified, at, missing }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  verified?: boolean | null;
  at?: string | null;
  missing?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-xs text-[var(--text-tertiary)] shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {verified ? <VerifiedTag at={at} /> : null}
        <span className={`text-sm text-right truncate ${missing ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'} ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
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
  const { latestByType, uploadDoc, isUploading } = useKycDocuments();

  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);
  const [triedNext, setTriedNext] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAccount, setShowAccount] = useState(false);
  const [showUpi, setShowUpi] = useState(false);
  const [docUploadError, setDocUploadError] = useState<Partial<Record<KycDocType, string>>>({});

  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k: keyof KycData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleDocUpload = async (file: File, docType: KycDocType) => {
    setDocUploadError(prev => ({ ...prev, [docType]: '' }));
    try {
      await uploadDoc({ file, docType });
    } catch (err) {
      setDocUploadError(prev => ({ ...prev, [docType]: (err as Error).message || 'Upload failed.' }));
    }
  };

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!kyc || hydratedRef.current) return;
    hydratedRef.current = true;
    // hydrate non-secret fields from the stored row; never put ciphertext into the raw PII inputs
    const { pan_enc, bank_account_enc, upi_id_enc, ...rest } = kyc as Record<string, unknown>;
    void pan_enc; void bank_account_enc; void upi_id_enc;
    setForm({ ...EMPTY_FORM, ...(rest as Partial<typeof EMPTY_FORM>) });
  }, [kyc]);

  const isVerified = kyc?.status === 'verified';
  const isPending = kyc?.status === 'pending';
  const isLocked = isVerified || isPending;

  const v1 = !!form.legal_name?.trim() && isPan(form.pan ?? '');
  const v3 = !!form.bank_account_name?.trim() && isAcct(form.bank_account ?? '') && isIfsc(form.ifsc_code ?? '');
  const vDocs = !!latestByType('pan_card') && !!latestByType('bank_proof');
  const canSubmit = v1 && v3 && vDocs;

  const stepValid = (s: number) => (s === 1 ? v1 : s === 3 ? v3 : s === 4 ? vDocs : true);

  const goNext = () => {
    if (!stepValid(step)) { setTriedNext(true); return; }
    setTriedNext(false);
    setStep(s => {
      const n = Math.min(STEP_LABELS.length, s + 1);
      setFurthest(f => Math.max(f, n));
      return n;
    });
  };
  const goBack = () => { setErrorMsg(''); setTriedNext(false); setStep(s => Math.max(1, s - 1)); };
  const jumpTo = (n: number) => { if (n <= furthest) { setTriedNext(false); setErrorMsg(''); setStep(n); } };

  const handleSubmit = async () => {
    if (!canSubmit) { setTriedNext(true); return; }
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

  const formAddress = [form.address_line1, form.address_line2, form.city, form.state, form.postal_code, form.country]
    .map(s => (s ?? '').trim()).filter(Boolean).join(', ');
  const lockedAddress = kyc
    ? [kyc.address_line1, kyc.address_line2, kyc.city, kyc.state, kyc.postal_code, kyc.country]
        .map(s => (s ?? '').trim()).filter(Boolean).join(', ')
    : '';

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Billing & KYC"
        description="Verify your identity and bank account to receive payouts from your store."
      />

      {!isLoading && <StatusBanner status={kyc?.status} rejectionReason={kyc?.rejection_reason} />}

      {isLoading ? (
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </Card>
      ) : isLocked ? (
        /* ───────── Read-only summary (pending / verified) ───────── */
        <div className="max-w-3xl">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Lock size={14} className="text-[var(--text-tertiary)]" />
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Submitted Details</p>
            </div>
            <SummaryRow label="Legal name" value={kyc?.legal_name || '—'} />
            <SummaryRow label="PAN" value={kyc?.pan_last4 ? `•••••${kyc.pan_last4}` : '—'} mono verified={kyc?.pan_verified} at={kyc?.pan_verified_at} />
            {kyc?.dob && <SummaryRow label="Date of birth" value={kyc.dob} />}
            {kyc?.gender && <SummaryRow label="Gender" value={kyc.gender} />}
            {kyc?.aadhaar_last4 && <SummaryRow label="Aadhaar" value={`••••••••${kyc.aadhaar_last4}`} mono />}
            {lockedAddress && <SummaryRow label="Address" value={lockedAddress} />}
            <SummaryRow label="Account holder" value={kyc?.bank_account_name || '—'} />
            <SummaryRow label="Account number" value={kyc?.bank_last4 ? `••••${kyc.bank_last4}` : '—'} mono verified={kyc?.bank_verified} at={kyc?.bank_verified_at} />
            <SummaryRow label="IFSC" value={kyc?.ifsc_code || '—'} mono />
            <SummaryRow
              label="UPI"
              value={(kyc as Record<string, unknown>)?.upi_id_enc ? 'Added' : '—'}
              verified={kyc?.upi_verified}
              at={kyc?.upi_verified_at}
            />
          </Card>
          <p className="mt-3 text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
            <Lock size={11} /> Your PAN, account number and UPI are encrypted at rest — only the last few digits are ever shown.
          </p>
        </div>
      ) : (
        /* ───────── Editable wizard ───────── */
        <div className="max-w-3xl">
          <Stepper step={step} furthest={furthest} onJump={jumpTo} />

          <Card>
            {/* Step 1 — Identity */}
            {step === 1 && (
              <div>
                <StepHeader icon={User} title="Identity" description="Must exactly match your PAN card." tag={kyc?.pan_verified ? <VerifiedTag at={kyc.pan_verified_at} /> : undefined} />
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Legal Name" required error={triedNext && !form.legal_name?.trim() ? 'Required.' : undefined}>
                      <input type="text" value={form.legal_name ?? ''} onChange={e => set('legal_name', e.target.value)} className={inputCls} placeholder="As per PAN card" />
                    </Field>
                    <Field label="PAN Number" required hint="Format: ABCDE1234F" error={triedNext && !isPan(form.pan ?? '') ? 'Enter a valid 10-character PAN.' : undefined}>
                      <input type="text" value={form.pan ?? ''} maxLength={10} onChange={e => set('pan', e.target.value.toUpperCase())} className={`${inputCls} font-mono uppercase`} placeholder="ABCDE1234F" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Date of Birth" hint="Optional">
                      <div className="relative">
                        <Calendar size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                        <input type="date" value={form.dob ?? ''} onChange={e => set('dob', e.target.value)} className={`${inputCls} pl-9`} />
                      </div>
                    </Field>
                    <Field label="Gender" hint="Optional">
                      <select value={form.gender ?? ''} onChange={e => set('gender', e.target.value)} className={`${inputCls} appearance-none`}>
                        <option value="">Select…</option>
                        <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                      </select>
                    </Field>
                    <Field label="Aadhaar Last 4" hint="Optional — faster verification">
                      <div className="relative">
                        <Smartphone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                        <input type="text" maxLength={4} value={form.aadhaar_last4 ?? ''} onChange={e => set('aadhaar_last4', e.target.value.replace(/\D/g, ''))} className={`${inputCls} pl-9 font-mono`} placeholder="XXXX" />
                      </div>
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Address */}
            {step === 2 && (
              <div>
                <StepHeader icon={MapPin} title="Address" description="Your current residential address. This whole step is optional." />
                <div className="space-y-4">
                  <Field label="Address Line 1" hint="Optional">
                    <input type="text" value={form.address_line1 ?? ''} onChange={e => set('address_line1', e.target.value)} className={inputCls} placeholder="Flat / House no., Street" />
                  </Field>
                  <Field label="Address Line 2" hint="Optional">
                    <input type="text" value={form.address_line2 ?? ''} onChange={e => set('address_line2', e.target.value)} className={inputCls} placeholder="Area, Landmark" />
                  </Field>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Field label="City"><input type="text" value={form.city ?? ''} onChange={e => set('city', e.target.value)} className={inputCls} placeholder="Mumbai" /></Field>
                    <Field label="State">
                      <select value={form.state ?? ''} onChange={e => set('state', e.target.value)} className={`${inputCls} appearance-none`}>
                        <option value="">Select…</option>
                        {STATES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Pincode"><input type="text" maxLength={6} value={form.postal_code ?? ''} onChange={e => set('postal_code', e.target.value.replace(/\D/g, ''))} className={`${inputCls} font-mono`} placeholder="400001" /></Field>
                    <Field label="Country"><input type="text" value={form.country ?? 'India'} onChange={e => set('country', e.target.value)} className={inputCls} placeholder="India" /></Field>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Bank */}
            {step === 3 && (
              <div>
                <StepHeader icon={Building2} title="Settlement Bank Account" description="Payouts are transferred here. UPI is optional." tag={kyc?.bank_verified ? <VerifiedTag at={kyc.bank_verified_at} /> : undefined} />
                <div className="space-y-4">
                  <Field label="Account Holder Name" required hint="Must match your legal name exactly" error={triedNext && !form.bank_account_name?.trim() ? 'Required.' : undefined}>
                    <input type="text" value={form.bank_account_name ?? ''} onChange={e => set('bank_account_name', e.target.value)} className={inputCls} placeholder="Full name as per bank records" />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Account Number" required error={triedNext && !isAcct(form.bank_account ?? '') ? '9–18 digits.' : undefined}>
                      <div className="relative">
                        <input type={showAccount ? 'text' : 'password'} value={form.bank_account ?? ''} onChange={e => set('bank_account', e.target.value.replace(/\s/g, ''))} className={`${inputCls} font-mono pr-10`} placeholder="••••••••••••" />
                        <button type="button" onClick={() => setShowAccount(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]">
                          {showAccount ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </Field>
                    <Field label="IFSC Code" required hint="11-character branch code" error={triedNext && !isIfsc(form.ifsc_code ?? '') ? 'Enter a valid IFSC (e.g. SBIN0001234).' : undefined}>
                      <input type="text" value={form.ifsc_code ?? ''} maxLength={11} onChange={e => set('ifsc_code', e.target.value.toUpperCase())} className={`${inputCls} font-mono uppercase`} placeholder="SBIN0001234" />
                    </Field>
                  </div>
                  <Field label="UPI ID" hint="Optional — for instant payout via UPI">
                    <div className="relative">
                      <Wallet size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                      <input type={showUpi ? 'text' : 'password'} value={form.upi_id ?? ''} onChange={e => set('upi_id', e.target.value)} className={`${inputCls} pl-9 pr-10 font-mono`} placeholder="yourname@upi" />
                      <button type="button" onClick={() => setShowUpi(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)]">
                        {showUpi ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {/* Step 4 — Documents */}
            {step === 4 && (
              <div>
                <StepHeader icon={FileText} title="Documents" description="Upload your PAN card and a bank proof (cancelled cheque or statement)." />
                <div className="space-y-5">
                  {(['pan_card', 'bank_proof', 'aadhaar'] as const).map((docType) => {
                    const isRequired = docType !== 'aadhaar';
                    const label =
                      docType === 'pan_card' ? 'PAN Card' :
                      docType === 'bank_proof' ? 'Bank Proof (cancelled cheque or statement)' :
                      'Aadhaar (optional)';
                    const doc = latestByType(docType);
                    const sf = doc?.storage_files;
                    const fileName = sf
                      ? (Array.isArray(sf)
                          ? (sf[0] as { file_name: string } | undefined)?.file_name
                          : (sf as { file_name: string }).file_name)
                      : undefined;
                    return (
                      <Field key={docType} label={label} required={isRequired} error={docUploadError[docType]}>
                        {doc ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-sm text-[var(--success)]">
                              <Check size={13} />
                              Uploaded{fileName ? ` — ${fileName}` : ''}
                            </span>
                            <label className={`text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[var(--radius-sm)] px-2 py-1 border border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] ${(isUploading || isLocked) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                              Replace
                              <input
                                type="file"
                                className="sr-only"
                                accept="image/*,application/pdf"
                                disabled={isUploading || isLocked}
                                onChange={async e => {
                                  const f = e.target.files?.[0];
                                  if (f) await handleDocUpload(f, docType);
                                  e.currentTarget.value = '';
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <label className={`flex items-center justify-center gap-2 w-full px-3 py-4 text-sm border border-dashed border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition-colors focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--focus-ring)] ${(isUploading || isLocked) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                            {isUploading
                              ? <><RefreshCw size={13} className="animate-spin" /> Uploading…</>
                              : <><Upload size={13} /> Choose file (PDF or image)</>}
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*,application/pdf"
                              disabled={isUploading || isLocked}
                              onChange={async e => {
                                const f = e.target.files?.[0];
                                if (f) await handleDocUpload(f, docType);
                                e.currentTarget.value = '';
                              }}
                            />
                          </label>
                        )}
                      </Field>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 5 — Review */}
            {step === 5 && (
              <div>
                <StepHeader icon={CheckCircle2} title="Review & Submit" description="Confirm your details. Sensitive numbers are masked and encrypted on submit." />
                {!canSubmit && (
                  <div className="flex items-start gap-2 p-3 mb-4 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[var(--radius-md)]">
                    <AlertCircle size={14} className="text-[var(--danger)] shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--danger)]">
                      Some required details are missing or invalid.{' '}
                      {!v1 && <button type="button" onClick={() => jumpTo(1)} className="underline font-semibold focus-visible:outline-none">Fix Identity</button>}
                      {!v1 && (!v3 || !vDocs) && ' · '}
                      {!v3 && <button type="button" onClick={() => jumpTo(3)} className="underline font-semibold focus-visible:outline-none">Fix Bank</button>}
                      {!v3 && !vDocs && ' · '}
                      {!vDocs && <button type="button" onClick={() => jumpTo(4)} className="underline font-semibold focus-visible:outline-none">Upload Documents</button>}
                    </p>
                  </div>
                )}
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] px-4">
                  <SummaryRow label="Legal name" value={form.legal_name || '—'} missing={!form.legal_name?.trim()} />
                  <SummaryRow label="PAN" value={maskPan(form.pan)} mono missing={!isPan(form.pan ?? '')} />
                  {form.dob && <SummaryRow label="Date of birth" value={form.dob} />}
                  {form.gender && <SummaryRow label="Gender" value={form.gender} />}
                  {form.aadhaar_last4 && <SummaryRow label="Aadhaar" value={`••••••••${form.aadhaar_last4}`} mono />}
                  {formAddress && <SummaryRow label="Address" value={formAddress} />}
                  <SummaryRow label="Account holder" value={form.bank_account_name || '—'} missing={!form.bank_account_name?.trim()} />
                  <SummaryRow label="Account number" value={maskTail(form.bank_account)} mono missing={!isAcct(form.bank_account ?? '')} />
                  <SummaryRow label="IFSC" value={(form.ifsc_code || '—').toUpperCase()} mono missing={!isIfsc(form.ifsc_code ?? '')} />
                  <SummaryRow label="UPI" value={form.upi_id ? form.upi_id : '—'} mono />
                  <SummaryRow label="PAN card doc" value={latestByType('pan_card') ? '✓ Uploaded' : 'Missing'} missing={!latestByType('pan_card')} />
                  <SummaryRow label="Bank proof doc" value={latestByType('bank_proof') ? '✓ Uploaded' : 'Missing'} missing={!latestByType('bank_proof')} />
                  {latestByType('aadhaar') && <SummaryRow label="Aadhaar doc" value="✓ Uploaded" />}
                </div>
                {errorMsg && <p className="mt-3 text-sm text-[var(--danger)] flex items-center gap-1.5"><AlertCircle size={13} />{errorMsg}</p>}
                {successMsg && <p className="mt-3 text-sm text-[var(--success)] flex items-center gap-1.5"><CheckCircle2 size={13} />{successMsg}</p>}
              </div>
            )}

            {/* Nav controls */}
            <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-[var(--border-subtle)]">
              {step > 1
                ? <button type="button" onClick={goBack} className={btnGhost}><ChevronLeft size={15} /> Back</button>
                : <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5"><Lock size={11} /> Encrypted &amp; secure</span>}

              {step < STEP_LABELS.length ? (
                <button type="button" onClick={goNext} className={btnPrimary}>
                  {step === 2 && formAddress === '' ? 'Skip' : 'Continue'} <ChevronRight size={15} />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={isSubmitting || !canSubmit} className={btnBrand}>
                  {isSubmitting
                    ? <><RefreshCw size={14} className="animate-spin" /> Submitting…</>
                    : <><ShieldCheck size={14} /> Submit for Verification</>}
                </button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
