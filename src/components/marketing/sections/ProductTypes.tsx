import InView from '@/src/components/marketing/InView';
import { GraduationCap, BookOpen, Palette, FileSpreadsheet, Camera, Handshake } from 'lucide-react';

const types = [
  { title: "Courses", icon: GraduationCap, desc: "Drip video lessons with access control", color: "from-orange-500 to-[#E83A2E]", bg: "bg-orange-50", border: "border-orange-100" },
  { title: "Ebooks", icon: BookOpen, desc: "PDFs with smart buyer watermarks", color: "from-rose-500 to-pink-500", bg: "bg-rose-50", border: "border-rose-100" },
  { title: "Design Assets", icon: Palette, desc: "Figma, Sketch & premium UI kits", color: "from-violet-500 to-indigo-500", bg: "bg-violet-50", border: "border-violet-100" },
  { title: "Templates", icon: FileSpreadsheet, desc: "Notion, Excel & Google Slides", color: "from-blue-500 to-cyan-500", bg: "bg-blue-50", border: "border-blue-100" },
  { title: "Photography", icon: Camera, desc: "High-res presets & photo packs", color: "from-teal-500 to-emerald-500", bg: "bg-teal-50", border: "border-teal-100" },
  { title: "Services", icon: Handshake, desc: "1-on-1 calls & consulting slots", color: "from-amber-500 to-orange-500", bg: "bg-amber-50", border: "border-amber-100" },
];

export default function ProductTypes() {
  return (
    <section className="py-16 sm:py-36 bg-white relative overflow-hidden">

      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,58,46,0.04) 0%, transparent 100%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">

        <InView className="text-center mb-16">
          <div className="iv">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-5 bg-[#E83A2E]/[0.07] px-4 py-1.5 rounded-full border border-[#E83A2E]/15">
              What you can sell
            </p>
            <h2 className="text-[2rem] sm:text-5xl md:text-[3.25rem] font-black text-gray-900 tracking-[-0.035em] leading-[1.1]">
              Sell anything digital.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
              One platform handles every format — from courses to consulting.
            </p>
          </div>
        </InView>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {types.map((t, i) => {
            const Icon = t.icon;
            return (
              <InView key={i} style={{ '--delay': `${i * 70}ms` }}>
                <div className="iv relative group p-5 sm:p-8 rounded-[20px] sm:rounded-[24px] bg-[#fafafa] border border-black/[0.055] hover:bg-white hover:border-black/[0.10] hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-400 cursor-default overflow-hidden">
                  <div className={`absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r ${t.color} opacity-0 group-hover:opacity-100 transition-opacity duration-400`} />
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-5 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.2)] group-hover:scale-110 group-hover:-rotate-3 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-[16px] sm:text-[18px] font-black text-gray-900 mb-1.5 tracking-tight">{t.title}</h3>
                  <p className="text-[13px] sm:text-[14px] text-gray-500 font-medium leading-relaxed">{t.desc}</p>
                  <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-tl ${t.color} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none`} />
                </div>
              </InView>
            );
          })}
        </div>
      </div>
    </section>
  );
}
