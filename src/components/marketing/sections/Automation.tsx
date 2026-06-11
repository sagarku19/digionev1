import InView from '@/src/components/marketing/InView';
import { SectionShell } from '@/src/components/marketing/Ledger';
import { Instagram, Mail, MessageCircle, FileSpreadsheet, Send, type LucideIcon } from 'lucide-react';

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
      <div className="w-7 h-7 rounded-full bg-[#16130F] flex items-center justify-center text-white shrink-0">
        <span className="font-ledger text-[10px] font-medium">P</span>
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

    <div className="px-4 pt-3 pb-2">
      <p className="font-ledger text-[9px] tracking-[0.18em] text-black/35 uppercase mb-2">Trigger keywords</p>
      <div className="flex gap-1.5 flex-wrap">
        {['COURSE', 'LINK', 'PDF'].map((k) => (
          <span key={k} className="font-ledger px-2 py-0.5 border border-black/[0.1] rounded text-[10px] font-medium text-[#16130F]">
            {k}
          </span>
        ))}
      </div>
    </div>

    <div className="px-4 pt-2 pb-4 space-y-2">
      <div className="flex justify-end">
        <span className="bg-[#FAF8F6] border border-black/[0.06] text-[#16130F] text-[12px] font-semibold px-3.5 py-2 rounded-xl rounded-br-sm">
          COURSE
        </span>
      </div>
      <div className="flex justify-start">
        <div className="bg-[#16130F] text-white text-[12px] font-medium px-3.5 py-2.5 rounded-xl rounded-bl-sm max-w-[230px] leading-snug">
          Hey Priya! Here&apos;s your link →{' '}
          <span className="font-ledger text-[11px] text-[#FF6B5C]">digione.ai/priya/course</span>
        </div>
      </div>
      <p className="font-ledger text-[9px] text-black/30 text-center pt-1">replied in 0.3s · auto</p>
    </div>
  </div>
);

export default function Automation() {
  return (
    <SectionShell
      index="04"
      route="/dashboard/automation"
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
              fig. 04-A — comment-to-DM flow, Instagram
            </p>
          </div>
        </InView>
      </div>
    </SectionShell>
  );
}
