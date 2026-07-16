import InView from '@/src/components/marketing/InView';
import { SectionShell } from '@/src/components/marketing/Ledger';

/* Flat step mockups — div-composed, no icons, dark-surface palette */

const MockSignup = () => (
  <div className="h-28 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3.5 flex flex-col justify-between">
    <div className="space-y-2">
      <div className="h-1.5 w-16 rounded-full bg-white/[0.18]" />
      <div className="h-7 rounded-md border border-white/[0.12] px-2.5 flex items-center">
        <span className="font-ledger text-[9px] text-white/35">you@example.com</span>
        <span aria-hidden="true" className="ml-1 w-px h-3 bg-[#FF6B5C] animate-pulse" />
      </div>
    </div>
    <div className="h-7 rounded-md bg-[#E83A2E] opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <span className="h-1.5 w-14 rounded-full bg-white/80" />
    </div>
  </div>
);

const MockBuild = () => (
  <div className="h-28 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3.5 flex gap-3">
    <div className="flex-1 rounded-md border border-white/[0.12] p-2 flex flex-col justify-between">
      <div className="h-9 rounded-sm bg-[#E83A2E]/70 opacity-90 group-hover:opacity-100 transition-opacity" />
      <div className="h-1 w-3/4 rounded-full bg-white/[0.18]" />
      <div className="h-1 w-1/3 rounded-full bg-white/[0.32]" />
    </div>
    <div className="w-16 rounded-md border border-white/[0.12] p-2 flex flex-col justify-between">
      <div className="flex gap-1">
        <span className="w-3 h-3 rounded-full bg-[#E83A2E]" />
        <span className="w-3 h-3 rounded-full bg-white/[0.28]" />
        <span className="w-3 h-3 rounded-full bg-white/[0.12]" />
      </div>
      <div className="w-full space-y-1.5">
        <div className="h-1 w-full rounded-full bg-white/[0.15]" />
        <div className="h-1 w-2/3 rounded-full bg-white/[0.15]" />
      </div>
    </div>
  </div>
);

const MockPaid = () => (
  <div className="h-28 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3.5 flex flex-col justify-between">
    <div className="self-start rounded-md border border-white/[0.12] px-2.5 py-1.5 inline-flex items-center gap-2">
      <span className="relative flex w-1.5 h-1.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
      </span>
      <span className="font-ledger text-[9px] text-white/60">digione.ai/you</span>
    </div>
    <div className="rounded-md bg-white/[0.05] border border-white/[0.10] px-2.5 py-2 flex items-center gap-2">
      <span className="w-5 h-5 rounded-md bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center font-ledger text-[9px] font-semibold text-emerald-400">
        ₹
      </span>
      <div className="leading-tight">
        <p className="font-ledger text-[9.5px] font-semibold text-white/85">+₹499 · New sale</p>
        <p className="font-ledger text-[8px] text-white/35">just now · UPI</p>
      </div>
    </div>
  </div>
);

const STEPS = [
  {
    num: '01',
    tag: '30 SECONDS',
    title: 'Sign up free',
    desc: 'Create your free account with just an email. No credit card, no commitment.',
    mock: MockSignup,
  },
  {
    num: '02',
    tag: 'NO CODE',
    title: 'Upload & style your store',
    desc: 'Add your products and design your storefront with the visual builder.',
    mock: MockBuild,
  },
  {
    num: '03',
    tag: 'INSTANT UPI',
    title: 'Share & get paid',
    desc: 'Share your link anywhere. Instant UPI payouts straight to your bank.',
    mock: MockPaid,
  },
];

export default function Steps() {
  return (
    <SectionShell
      index="05"
      route="/signup"
      title={
        <span className="lg:whitespace-nowrap">
          <span className="text-[#E83A2E]">Make your store</span> live in three steps.
        </span>
      }
      sub="From first login to first sale — no code, no waiting, nothing to install."
      tone="ink"
    >
      <InView className="mt-10 sm:mt-12">
        <ol className="iv grid grid-cols-1 sm:grid-cols-3 border border-white/[0.09] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-white/[0.09]">
          {STEPS.map((s, i) => {
            const Mock = s.mock;
            return (
              <li
                key={i}
                className="group relative bg-white/[0.02] hover:bg-white/[0.05] transition-colors duration-300 flex flex-col"
              >
                <div className="flex items-baseline justify-between px-6 sm:px-7 pt-6">
                  <p className="font-ledger text-[11px] text-white/30 group-hover:text-[#FF6B5C] transition-colors duration-300 tracking-[0.1em]">
                    {s.num} /
                  </p>
                  <span className="font-ledger text-[9px] tracking-[0.16em] text-white/25 uppercase">{s.tag}</span>
                </div>
                <div className="px-6 sm:px-7 pt-5">
                  <Mock />
                </div>
                <div className="px-6 sm:px-7 pt-5 pb-6 sm:pb-7">
                  <h3 className="text-[16px] sm:text-[17px] font-bold text-white tracking-tight mb-2">{s.title}</h3>
                  <p className="text-[13px] sm:text-[13.5px] text-white/45 font-medium leading-relaxed">{s.desc}</p>
                </div>
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full bg-[#E83A2E] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
              </li>
            );
          })}
        </ol>
        <p className="iv font-ledger text-[11px] text-white/35 mt-6 tracking-[0.06em]">
          <span aria-hidden="true" className="text-[#FF6B5C] mr-2">✳</span>
          Join 10,000+ creators already earning on DigiOne
        </p>
      </InView>
    </SectionShell>
  );
}
