import InView from '@/src/components/marketing/InView';
import { ArrowUpRight } from 'lucide-react';

const creators = [
  { name: "Arjun Sharma", niche: "Figma Courses", link: "digione.ai/arjun", revenue: "₹1.2L / mo", color: "from-[#E83A2E] to-orange-500" },
  { name: "Priya Mehta", niche: "Design Assets", link: "digione.ai/priya", revenue: "₹84K / mo", color: "from-violet-500 to-purple-600" },
  { name: "Rahul Verma", niche: "Photography", link: "digione.ai/rahul", revenue: "₹60K / mo", color: "from-orange-400 to-amber-500" },
  { name: "Neha Kapoor", niche: "Podcast Creator", link: "digione.ai/neha", revenue: "₹45K / mo", color: "from-rose-500 to-pink-500" },
  { name: "Vikram Joshi", niche: "Notion Templates", link: "digione.ai/vikram", revenue: "₹38K / mo", color: "from-blue-500 to-cyan-500" },
  { name: "Sneha Iyer", niche: "Illustration Packs", link: "digione.ai/sneha", revenue: "₹52K / mo", color: "from-teal-500 to-emerald-500" },
  { name: "Karan Singh", niche: "Music Production", link: "digione.ai/karan", revenue: "₹72K / mo", color: "from-[#E83A2E] to-rose-600" },
  { name: "Ananya Roy", niche: "Fitness Guides", link: "digione.ai/ananya", revenue: "₹29K / mo", color: "from-amber-400 to-orange-500" },
];

export default function Showcase() {
  return (
    <section id="creators" className="py-28 sm:py-36 bg-white overflow-hidden relative">

      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/8 to-transparent" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 mb-14 text-center relative z-10">
        <InView>
          <div className="iv">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#E83A2E] mb-5 bg-[#E83A2E]/[0.07] px-4 py-1.5 rounded-full border border-[#E83A2E]/15">
              Creator stores
            </p>
            <h2 className="text-4xl sm:text-5xl md:text-[3.25rem] font-black text-gray-900 tracking-[-0.035em] leading-[1.1]">
              See what creators
              <br />
              <span className="text-gray-400">are building.</span>
            </h2>
          </div>
        </InView>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div className="flex overflow-x-auto gap-5 px-5 sm:px-8 pb-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {creators.map((c, i) => (
            <div
              key={i}
              className="min-w-[260px] sm:min-w-[300px] rounded-[24px] bg-[#fafafa] border border-black/[0.055] overflow-hidden shrink-0 snap-center hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-400 group cursor-default"
            >
              <div className={`h-36 bg-gradient-to-br ${c.color} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:22px_22px]" />
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2.5 py-1 text-[10px] font-black text-white">
                  {c.revenue}
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-14 h-14 rounded-2xl bg-white border-2 border-white shadow-lg flex items-center justify-center">
                  <span className="text-lg font-black text-gray-800">{c.name.charAt(0)}</span>
                </div>
              </div>

              <div className="pt-10 pb-6 px-6 text-center">
                <h3 className="text-[16px] font-black text-gray-900 mb-0.5">{c.name}</h3>
                <p className="text-[13px] text-gray-500 font-semibold mb-5">{c.niche}</p>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gray-100 border border-gray-200 text-[11px] font-bold text-gray-600 group-hover:bg-[#E83A2E] group-hover:text-white group-hover:border-transparent group-hover:shadow-[0_4px_14px_rgba(232,58,46,0.28)] transition-all duration-300">
                  {c.link}
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
