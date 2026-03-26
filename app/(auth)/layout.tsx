import { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--auth-bg)]">
      {/* Left Branding Panel */}
      <div
        className="hidden md:flex flex-col justify-center w-full md:w-5/12 p-12 text-white"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <div className="max-w-md mx-auto w-full">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-sm">
              D1
            </div>
            <span className="text-xl font-bold tracking-tight">DigiOne</span>
          </div>
          <h1 className="text-3xl font-display font-bold mb-3 leading-tight">
            Build your creator business.
          </h1>
          <p className="text-lg mb-10 opacity-80 leading-relaxed">
            Start free in 30 seconds.
          </p>
          <div className="space-y-4">
            <Feature check="UPI payouts in 24 hours" />
            <Feature check="5% platform fee on Pro" />
            <Feature check="Your store live instantly" />
            <Feature check="GST invoices automated" />
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-[var(--auth-surface)]">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

function Feature({ check }: { check: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-white/80 shrink-0" />
      <span className="text-base opacity-90">{check}</span>
    </div>
  );
}
