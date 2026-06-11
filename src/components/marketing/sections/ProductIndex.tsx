import InView from '@/src/components/marketing/InView';
import { SectionShell } from '@/src/components/marketing/Ledger';
import {
  Package, Store, ShoppingBag, Users, Image as ImageIcon,
  BarChart2, DollarSign, Landmark,
  Instagram, Zap, Ticket, BookOpen, Calendar,
  type LucideIcon,
} from 'lucide-react';

type Module = { icon: LucideIcon; name: string; desc: string };
type Group = { label: string; modules: Module[] };

const GROUPS: Group[] = [
  {
    label: 'Workspace',
    modules: [
      { icon: Package, name: 'Products', desc: 'Courses, ebooks, templates, presets — every digital format' },
      { icon: Store, name: 'My Sites', desc: 'Build and theme all four storefronts visually' },
      { icon: ShoppingBag, name: 'Orders', desc: 'Every sale, refund, and delivery in one stream' },
      { icon: Users, name: 'Customers', desc: 'Who bought what, and what to offer them next' },
      { icon: ImageIcon, name: 'Media', desc: 'One library for covers, files, and deliverables' },
    ],
  },
  {
    label: 'Money',
    modules: [
      { icon: BarChart2, name: 'Analytics', desc: 'Revenue, visitors, and conversion over 7, 30, or 90 days' },
      { icon: DollarSign, name: 'Earnings', desc: 'Live balance backed by a tamper-evident ledger' },
      { icon: Landmark, name: 'Payouts', desc: 'Instant UPI withdrawals, KYC-secured' },
    ],
  },
  {
    label: 'Grow',
    modules: [
      { icon: Instagram, name: 'Auto DM', desc: 'Instagram comments answered with your link in seconds' },
      { icon: Zap, name: 'Automation', desc: 'Email, WhatsApp, Telegram, and Sheets workflows' },
      { icon: Ticket, name: 'Coupons & Affiliates', desc: 'Discounts, commissions, and leaderboards' },
      { icon: BookOpen, name: 'Leads & Referrals', desc: 'Capture forms and word-of-mouth loops' },
      { icon: Calendar, name: 'Services', desc: 'Sell 1-on-1 calls and consulting slots' },
    ],
  },
];

export default function ProductIndex() {
  return (
    <SectionShell
      index="02"
      route="/dashboard"
      title="The dashboard is the product."
      sub="Everything a one-person business needs, grouped the way you actually work. No add-ons, no app store — it ships wired together."
      tone="white"
    >
      <InView className="mt-10 sm:mt-14">
        <div className="iv grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-0 lg:divide-x lg:divide-black/[0.07]">
          {GROUPS.map((g, gi) => (
            <div key={gi} className={gi > 0 ? 'lg:pl-10' : ''}>
              <div className="flex items-center gap-3 mb-5">
                <span className="font-ledger text-[11px] font-semibold tracking-[0.18em] uppercase text-[#E83A2E]">
                  {g.label}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
                <span className="font-ledger text-[10px] text-black/30">{String(g.modules.length).padStart(2, '0')}</span>
              </div>
              <ul className="divide-y divide-black/[0.05]">
                {g.modules.map((m, mi) => {
                  const Icon = m.icon;
                  return (
                    <li key={mi} className="group flex items-start gap-3.5 py-4 first:pt-0">
                      <span className="mt-0.5 w-8 h-8 rounded-lg border border-black/[0.08] bg-white group-hover:bg-[#16130F] group-hover:border-[#16130F] flex items-center justify-center shrink-0 transition-colors duration-300">
                        <Icon className="w-4 h-4 text-[#16130F] group-hover:text-white transition-colors duration-300" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-[#16130F] tracking-tight leading-tight">{m.name}</p>
                        <p className="mt-1 text-[13px] text-black/45 font-medium leading-snug">{m.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </InView>
    </SectionShell>
  );
}
