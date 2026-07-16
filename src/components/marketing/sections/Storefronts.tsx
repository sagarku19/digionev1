import InView from '@/src/components/marketing/InView';
import { SectionShell } from '@/src/components/marketing/Ledger';

const MOCK_FRAME =
  'w-full max-w-[180px] h-[132px] rounded-lg border border-black/[0.08] bg-white overflow-hidden shadow-[0_2px_12px_-4px_rgba(22,19,15,0.10)]';

const MockStore = () => (
  <div className={`${MOCK_FRAME} flex flex-col`}>
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-black/[0.06] shrink-0">
      <span className="w-3 h-3 rounded-full bg-[#16130F]" />
      <span className="h-1 w-10 rounded-full bg-black/[0.18]" />
      <span className="ml-auto h-2.5 w-6 rounded-sm bg-[#E83A2E]" />
    </div>
    <div className="p-2 grid grid-cols-2 gap-1.5 flex-1">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="rounded-md border border-black/[0.06] p-1.5 flex flex-col justify-between">
          <div className={`h-4 rounded-sm ${n === 0 ? 'bg-[#E83A2E]/80' : 'bg-black/[0.07]'}`} />
          <div className="h-1 w-3/4 rounded-full bg-black/[0.12]" />
          <div className="h-1 w-1/3 rounded-full bg-black/[0.2]" />
        </div>
      ))}
    </div>
  </div>
);

const MockSingle = () => (
  <div className={`${MOCK_FRAME} flex flex-col`}>
    <div className="h-14 bg-[#16130F] relative shrink-0">
      <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(232,58,46,0.5) 0%, transparent 60%)' }} />
      <div className="absolute bottom-1.5 left-2 h-1.5 w-16 rounded-full bg-white/70" />
    </div>
    <div className="p-2.5 flex-1 flex flex-col justify-between">
      <div className="space-y-1.5">
        <div className="h-1 w-full rounded-full bg-black/[0.1]" />
        <div className="h-1 w-4/5 rounded-full bg-black/[0.1]" />
      </div>
      <div className="flex items-center justify-between">
        <span className="font-ledger text-[9px] font-semibold text-[#16130F]">₹999</span>
        <span className="h-4 w-14 rounded-sm bg-[#E83A2E]" />
      </div>
    </div>
  </div>
);

const MockPayment = () => (
  <div className={`${MOCK_FRAME} p-2.5 flex flex-col justify-between`}>
    <div className="h-1.5 w-20 rounded-full bg-black/[0.15]" />
    <div className="rounded-md border border-black/[0.1] px-2 py-1.5 flex items-center gap-1">
      <span className="font-ledger text-[10px] text-black/35">₹</span>
      <span className="font-ledger text-[11px] font-semibold text-[#16130F]">2,500</span>
      <span className="ml-auto w-px h-3 bg-[#E83A2E] animate-pulse" />
    </div>
    <div className="rounded-md border border-black/[0.06] px-2 py-1.5">
      <div className="h-1 w-2/3 rounded-full bg-black/[0.1]" />
    </div>
    <div className="h-6 rounded-md bg-[#E83A2E] flex items-center justify-center">
      <span className="h-1 w-10 rounded-full bg-white/70" />
    </div>
  </div>
);

const MockLinkInBio = () => (
  <div className={`${MOCK_FRAME} p-2.5 flex flex-col items-center`}>
    <div className="w-6 h-6 rounded-full bg-[#16130F] mb-1.5 flex items-center justify-center shrink-0">
      <span className="font-ledger text-[9px] font-medium text-white">A</span>
    </div>
    <div className="h-1 w-12 rounded-full bg-black/[0.2] mb-2 shrink-0" />
    <div className="w-full flex-1 flex flex-col justify-between gap-1.5">
      <div className="rounded-md bg-[#E83A2E] flex-1" />
      <div className="rounded-md border border-black/[0.1] flex-1" />
      <div className="rounded-md border border-black/[0.1] flex-1" />
    </div>
  </div>
);

const SITES = [
  {
    name: 'Main Store',
    url: '/store/you',
    desc: 'A full catalog storefront with search, cart, and checkout built in.',
    mock: MockStore,
  },
  {
    name: 'Product Site',
    url: '/site/you',
    desc: 'A single-product sales page, built to convert one offer.',
    mock: MockSingle,
  },
  {
    name: 'Payment Link',
    url: '/pay/...',
    desc: 'Collect any amount with a link. No page-building required.',
    mock: MockPayment,
  },
  {
    name: 'Link in Bio',
    url: '/link/you',
    desc: 'One link for every social bio — products, links, and lead capture.',
    mock: MockLinkInBio,
  },
];

export default function Storefronts() {
  return (
    <SectionShell
      index="01"
      route="/dashboard/sites"
      title="Four storefronts. One dashboard."
      sub="Pick the surface that matches how you sell — or run all four. Every site pulls from the same products, orders, and balance."
      tone="white"
    >
      <InView className="mt-10 sm:mt-14">
        <div className="iv grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black/[0.08] border border-black/[0.08] rounded-xl overflow-hidden">
          {SITES.map((s, i) => {
            const Mock = s.mock;
            return (
              <div key={i} className="group bg-[#FAF8F6] hover:bg-white transition-colors duration-300 flex flex-col">
                <div className="h-44 flex items-center justify-center p-5 border-b border-black/[0.06]">
                  <div className="group-hover:-translate-y-1 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] w-full flex justify-center">
                    <Mock />
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <h3 className="text-[15px] font-bold text-[#16130F] tracking-tight">{s.name}</h3>
                    <span className="font-ledger text-[10px] text-black/35 group-hover:text-[#E83A2E] transition-colors duration-300 truncate">
                      {s.url}
                    </span>
                  </div>
                  <p className="text-[13px] text-black/50 font-medium leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </InView>
    </SectionShell>
  );
}
