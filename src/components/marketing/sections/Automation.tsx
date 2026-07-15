import InView from '@/src/components/marketing/InView';
import { SectionShell } from '@/src/components/marketing/Ledger';
import { Instagram, Mail, MessageCircle, FileSpreadsheet, Send, Heart, Check, type LucideIcon } from 'lucide-react';

type Channel = { icon: LucideIcon; name: string; desc: string };

const CHANNELS: Channel[] = [
  {
    icon: Instagram,
    name: 'Instagram Auto DM',
    desc: 'Auto-reply to comments and DMs, capture leads, run story automations.',
  },
  {
    icon: Mail,
    name: 'Email Sequences',
    desc: 'Welcome flows, launch campaigns, and post-purchase follow-ups.',
  },
  {
    icon: MessageCircle,
    name: 'WhatsApp Bots',
    desc: 'Automated replies and order updates, where India actually chats.',
  },
  {
    icon: FileSpreadsheet,
    name: 'Google Sheets',
    desc: 'Every order and lead synced to a spreadsheet in real time.',
  },
  {
    icon: Send,
    name: 'Telegram Broadcasts',
    desc: 'Push updates to your channel and run subscriber bots.',
  },
];

const DMmock = () => (
  <div className="rounded-xl border border-black/[0.08] bg-white overflow-hidden shadow-[0_8px_40px_-16px_rgba(22,19,15,0.15)]">
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-black/[0.06] bg-[#FAF8F6]">
      <div className="relative w-7 h-7 rounded-full bg-[#16130F] flex items-center justify-center text-white shrink-0">
        <span className="font-ledger text-[10px] font-medium">P</span>
        <span className="absolute -bottom-0.5 -right-1 w-3.5 h-3.5 rounded-full bg-white border border-black/[0.1] flex items-center justify-center">
          <Instagram className="w-2 h-2 text-[#16130F]" strokeWidth={2.4} />
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-[#16130F] truncate">@priya.designs</p>
        <p className="font-ledger text-[9px] text-black/35">82.4K followers</p>
      </div>
      <span className="ml-auto inline-flex items-center gap-1.5 font-ledger text-[9px] font-medium text-emerald-700 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        ACTIVE
      </span>
    </div>

    <div className="px-4 pt-3 flex items-center gap-2.5">
      <p className="font-ledger text-[9px] tracking-[0.18em] text-black/35 uppercase shrink-0">Triggers</p>
      <div className="flex gap-1.5 flex-wrap">
        {['COURSE', 'LINK', 'PDF'].map((k) => (
          <span
            key={k}
            className={`font-ledger px-2 py-0.5 border rounded text-[10px] font-medium ${
              k === 'COURSE' ? 'border-[#E83A2E]/50 text-[#E83A2E] bg-[#E83A2E]/[0.04]' : 'border-black/[0.1] text-[#16130F]'
            }`}
          >
            {k}
          </span>
        ))}
      </div>
    </div>

    <div className="px-4 pt-3.5">
      <p className="font-ledger text-[8px] tracking-[0.16em] text-black/30 mb-1.5">01 / COMMENT ON YOUR REEL</p>
      <div className="flex items-start gap-2.5 rounded-lg border border-black/[0.06] bg-[#FAF8F6] px-3 py-2.5">
        <span className="w-6 h-6 rounded-full bg-white border border-black/[0.1] flex items-center justify-center font-ledger text-[9px] text-[#16130F] shrink-0">
          R
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] leading-snug text-[#16130F]">
            <span className="font-bold">rahul.creates</span>{' '}
            <span className="font-semibold text-[#E83A2E]">COURSE</span>
          </p>
          <p className="font-ledger text-[8.5px] text-black/30 mt-0.5">2s · Reply</p>
        </div>
        <Heart className="w-3 h-3 text-black/25 mt-0.5 shrink-0" strokeWidth={1.8} />
      </div>
      <div className="flex items-center gap-3 mt-1.5 pl-1">
        <span className="inline-flex items-center gap-1 font-ledger text-[8.5px] text-emerald-700">
          <Check className="w-2.5 h-2.5" strokeWidth={2.4} /> keyword match
        </span>
        <span className="inline-flex items-center gap-1 font-ledger text-[8.5px] text-emerald-700">
          <Check className="w-2.5 h-2.5" strokeWidth={2.4} /> follows you
        </span>
      </div>
    </div>

    <div className="flex items-center gap-2 px-4 my-2.5">
      <span aria-hidden="true" className="flex-1 border-t border-dashed border-black/[0.12]" />
      <span className="font-ledger text-[8px] tracking-[0.14em] text-black/30 whitespace-nowrap">→ MOVED TO DMs</span>
      <span aria-hidden="true" className="flex-1 border-t border-dashed border-black/[0.12]" />
    </div>

    <div className="px-4 pb-3.5">
      <p className="font-ledger text-[8px] tracking-[0.16em] text-black/30 mb-1.5">02 / PRIVATE REPLY · AUTO</p>
      <div className="flex justify-start">
        <div className="bg-[#16130F] text-white text-[12px] font-medium px-3.5 py-2.5 rounded-xl rounded-bl-sm max-w-[240px] leading-snug">
          Hey Rahul! Here&apos;s the course
          <span className="mt-1.5 flex items-center gap-1.5 bg-white/[0.08] border border-white/[0.12] rounded-md px-2 py-1 font-ledger text-[10.5px] text-[#FF6B5C] w-fit">
            linklin.me/ef5rth
          </span>
        </div>
      </div>
      <p className="font-ledger text-[8.5px] text-black/30 mt-1.5">
        delivered · 0.3s <span className="text-emerald-700">· +1 lead saved</span>
      </p>
    </div>

    <div className="px-4 py-2.5 border-t border-black/[0.06] bg-[#FAF8F6] flex items-center justify-between gap-3">
      <span className="font-ledger text-[8.5px] tracking-[0.16em] text-black/35">TODAY</span>
      <span className="font-ledger text-[9.5px] text-[#16130F]">
        142 replies · 38 leads · <span className="text-emerald-700">9 sales</span>
      </span>
    </div>
  </div>
);

export default function Automation() {
  return (
    <SectionShell
      index="04"
      route="/dashboard/integrations"
      title="Automation on every channel you already use."
      sub="Wire DigiOne into the apps your audience lives in. Set the trigger once — it runs forever."
      tone="paper"
    >
      <div className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-start">

        <InView>
          <ul className="iv divide-y divide-black/[0.06] border-y border-black/[0.06]">
            {CHANNELS.map((c, i) => {
              const Icon = c.icon;
              return (
                <li key={i} className="group flex items-center gap-4 sm:gap-5 py-4 sm:py-5">
                  <span className="font-ledger text-[10px] text-black/30 group-hover:text-[#E83A2E] transition-colors duration-300 w-6 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="w-9 h-9 rounded-lg border border-black/[0.08] bg-white group-hover:bg-[#16130F] group-hover:border-[#16130F] flex items-center justify-center shrink-0 transition-colors duration-300">
                    <Icon className="w-4 h-4 text-[#16130F] group-hover:text-white transition-colors duration-300" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] sm:text-[15px] font-bold text-[#16130F] tracking-tight leading-tight">{c.name}</p>
                    <p className="mt-0.5 text-[12.5px] sm:text-[13px] text-black/45 font-medium leading-snug">{c.desc}</p>
                  </div>
                  <span className="hidden sm:inline font-ledger text-[9px] tracking-[0.15em] text-emerald-700 shrink-0">LIVE</span>
                </li>
              );
            })}
          </ul>
        </InView>

        <InView style={{ '--delay': '120ms' }}>
          <div className="iv lg:sticky lg:top-28">
            <DMmock />
            <p className="font-ledger text-[10px] text-black/35 mt-3 text-center tracking-[0.06em]">
              Comment-to-DM flow, Instagram
            </p>
          </div>
        </InView>
      </div>
    </SectionShell>
  );
}
