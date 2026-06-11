import InView from '@/src/components/marketing/InView';
import { GraduationCap, BookOpen, Palette, FileSpreadsheet, Camera, Handshake } from 'lucide-react';

const CourseVisual = () => (
  <div className="w-12 rounded-md bg-white border border-black/[0.08] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.10)] p-1">
    <div className="h-6 rounded bg-gradient-to-br from-orange-400 to-[#E83A2E] mb-1 flex items-center justify-center">
      <span className="block w-0 h-0 border-l-[5px] border-l-white border-y-[3.5px] border-y-transparent ml-0.5" />
    </div>
    <div className="sk-shimmer h-1 w-full rounded-full mb-1" />
    <div className="h-1 w-3/5 rounded-full bg-[#E83A2E]/40" />
  </div>
);

const EbookVisual = () => (
  <div className="relative w-12 h-14">
    <div className="absolute top-1 left-1 w-10 h-12 rounded bg-[#E83A2E]/15" />
    <div className="relative w-10 h-12 rounded bg-gradient-to-br from-[#E83A2E] to-[#FF7043] p-1.5 shadow-[0_3px_8px_-2px_rgba(0,0,0,0.20)]">
      <div className="h-1 w-4/5 rounded-full bg-white/70 mb-1" />
      <div className="h-1 w-1/2 rounded-full bg-white/45" />
    </div>
  </div>
);

const DesignVisual = () => (
  <div className="grid grid-cols-2 gap-1 w-11">
    <div className="h-4.5 rounded bg-gray-200" />
    <div className="h-4.5 rounded bg-gray-300" />
    <div className="h-4.5 rounded bg-[#E83A2E]" />
    <div className="h-4.5 rounded bg-gray-900" />
  </div>
);

const TemplateVisual = () => (
  <div className="w-12 rounded-md bg-white border border-black/[0.08] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.10)] p-1 space-y-[3px]">
    <div className="h-1.5 rounded-sm bg-gray-900" />
    <div className="grid grid-cols-3 gap-[3px]">
      {[0, 1, 2, 3, 4, 5].map((c) => (
        <div key={c} className={`h-1.5 rounded-sm ${c === 4 ? 'bg-[#E83A2E]/50' : 'bg-gray-200'}`} />
      ))}
    </div>
  </div>
);

const PhotoVisual = () => (
  <div className="relative w-12 h-12">
    <div className="absolute top-1 left-1 w-10 h-10 rounded-md bg-[#E83A2E]/12 rotate-6" />
    <div className="relative w-10 h-10 rounded-md bg-gradient-to-br from-gray-700 to-gray-900 shadow-[0_3px_8px_-2px_rgba(0,0,0,0.20)] overflow-hidden">
      <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white/80" />
      <div className="absolute -bottom-1 -left-1 w-7 h-5 bg-[#E83A2E]/70 rounded-tr-[10px]" />
    </div>
  </div>
);

const ServiceVisual = () => (
  <div className="w-12 rounded-md bg-white border border-black/[0.08] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.10)] overflow-hidden">
    <div className="h-2 bg-gradient-to-r from-[#E83A2E] to-orange-400" />
    <div className="p-1 space-y-[3px]">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E] shrink-0" />
        <div className="sk-shimmer h-1 flex-1 rounded-full" />
      </div>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E83A2E]/30 shrink-0" />
        <div className="sk-shimmer h-1 flex-1 rounded-full" />
      </div>
    </div>
  </div>
);

const types = [
  { title: "Courses", icon: GraduationCap, desc: "Drip video lessons with access control", visual: CourseVisual },
  { title: "Ebooks", icon: BookOpen, desc: "PDFs with smart buyer watermarks", visual: EbookVisual },
  { title: "Design Assets", icon: Palette, desc: "Figma, Sketch & premium UI kits", visual: DesignVisual },
  { title: "Templates", icon: FileSpreadsheet, desc: "Notion, Excel & Google Slides", visual: TemplateVisual },
  { title: "Photography", icon: Camera, desc: "High-res presets & photo packs", visual: PhotoVisual },
  { title: "Services", icon: Handshake, desc: "1-on-1 calls & consulting slots", visual: ServiceVisual },
];

export default function ProductTypes() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-white relative overflow-hidden">

      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/[0.07] to-transparent" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,58,46,0.04) 0%, transparent 100%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">

        <InView className="text-center mb-10 sm:mb-16">
          <div className="iv">
            <div className="flex items-center justify-center gap-4 mb-5 sm:mb-6">
              <span aria-hidden="true" className="h-px w-8 sm:w-12 bg-black/[0.12]" />
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#E83A2E]">
                <span aria-hidden="true" className="text-gray-300 mr-3 select-none">02</span>
                What you can sell
              </p>
              <span aria-hidden="true" className="h-px w-8 sm:w-12 bg-black/[0.12]" />
            </div>
            <h2 className="text-[2rem] sm:text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] font-black text-[#131110] tracking-[-0.035em] leading-[1.1]">
              Sell anything digital.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
              One platform handles every format — from courses to consulting.
            </p>
          </div>
        </InView>

        <InView>
          <div className="iv rounded-[24px] border border-black/[0.08] bg-black/[0.07] overflow-hidden grid grid-cols-2 lg:grid-cols-3 gap-px shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]">
            {types.map((t, i) => {
              const Icon = t.icon;
              const Visual = t.visual;
              return (
                <div
                  key={i}
                  className="group relative bg-white hover:bg-[#FAF8F6] p-5 sm:p-7 lg:p-8 transition-colors duration-300 cursor-default"
                >
                  <div className="flex items-start justify-between mb-8 sm:mb-12">
                    <span className="text-[11px] font-bold tabular-nums tracking-[0.2em] text-gray-300 group-hover:text-[#E83A2E] transition-colors duration-300 select-none">
                      0{i + 1}
                    </span>
                    <div aria-hidden="true" className="opacity-80 group-hover:opacity-100 group-hover:-translate-y-0.5 transition-all duration-300">
                      <Visual />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-4 h-4 text-[#131110] shrink-0" strokeWidth={2.2} />
                    <h3 className="text-[16px] sm:text-[18px] font-black text-[#131110] tracking-tight">{t.title}</h3>
                  </div>
                  <p className="text-[13px] sm:text-[14px] text-gray-500 font-medium leading-relaxed">{t.desc}</p>
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-[#E83A2E] to-[#FF7043] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  />
                </div>
              );
            })}
          </div>
        </InView>
      </div>
    </section>
  );
}
