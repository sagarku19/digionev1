import InView from '@/src/components/marketing/InView';
import { SectionShell } from '@/src/components/marketing/Ledger';

const STEPS = [
  {
    num: '01',
    title: 'Sign up in 30 seconds',
    desc: 'Create your free account. No credit card, no commitment — just your email.',
  },
  {
    num: '02',
    title: 'Upload & style your store',
    desc: 'Add your products and design your storefront with the visual builder.',
  },
  {
    num: '03',
    title: 'Share & get paid',
    desc: 'Share your link anywhere. Instant UPI payouts straight to your bank.',
  },
];

export default function Steps() {
  return (
    <SectionShell
      index="05"
      route="/signup"
      title="Live in three steps."
      tone="white"
    >
      <InView className="mt-10 sm:mt-12">
        <ol className="iv grid grid-cols-1 sm:grid-cols-3 border border-black/[0.08] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-black/[0.08]">
          {STEPS.map((s, i) => (
            <li key={i} className="group relative p-6 sm:p-8 bg-white hover:bg-[#FAF8F6] transition-colors duration-300">
              <p className="font-ledger text-[11px] text-black/30 group-hover:text-[#E83A2E] transition-colors duration-300 mb-4 tracking-[0.1em]">
                {s.num} /
              </p>
              <h3 className="text-[16px] sm:text-[17px] font-bold text-[#16130F] tracking-tight mb-2">{s.title}</h3>
              <p className="text-[13px] sm:text-[13.5px] text-black/45 font-medium leading-relaxed">{s.desc}</p>
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full bg-[#E83A2E] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              />
            </li>
          ))}
        </ol>
        <p className="iv font-ledger text-[11px] text-black/35 mt-6 tracking-[0.06em]">
          Join 10,000+ creators already earning on DigiOne
        </p>
      </InView>
    </SectionShell>
  );
}
