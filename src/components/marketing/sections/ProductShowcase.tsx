import { ArrowRight, Star, Layers, Palette, PenTool, Boxes, Camera, Music, Clapperboard, Code2, Gamepad2, GraduationCap, TrendingUp, Sparkles, Dumbbell, BookOpen, BookMarked } from 'lucide-react';
import InView from '@/src/components/marketing/InView';
import { Rails, Kicker } from '@/src/components/marketing/Ledger';

const CATEGORIES = [
  { label: 'All products', icon: Layers, featured: true },
  { label: 'Art & Illustration', icon: Palette },
  { label: 'Design & Templates', icon: PenTool },
  { label: '3D & Animation', icon: Boxes },
  { label: 'Photography & Presets', icon: Camera },
  { label: 'Music & Sound Design', icon: Music },
  { label: 'Film & Video', icon: Clapperboard },
  { label: 'Code & Software', icon: Code2 },
  { label: 'Gaming', icon: Gamepad2 },
  { label: 'Courses & Education', icon: GraduationCap },
  { label: 'Business & Finance', icon: TrendingUp },
  { label: 'Self-Improvement', icon: Sparkles },
  { label: 'Fitness & Wellness', icon: Dumbbell },
  { label: 'Writing & Ebooks', icon: BookOpen },
  { label: 'Comics & Manga', icon: BookMarked },
];

function IphoneMock() {
  return (
    <div className="relative w-[280px] sm:w-[300px] mx-auto">

      {/* Vermilion glow behind the device */}
      <div
        aria-hidden="true"
        className="absolute -inset-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(232,58,46,0.10) 0%, transparent 70%)' }}
      />

      {/* Frame */}
      <div className="relative rounded-[52px] bg-[#16130F] p-[9px] shadow-[0_40px_80px_-40px_rgba(22,19,15,0.5)] ring-1 ring-black/[0.08]">
        {/* Side buttons */}
        <span aria-hidden="true" className="absolute -left-[2px] top-24 w-[3px] h-6 rounded-l-md bg-[#2A2620]" />
        <span aria-hidden="true" className="absolute -left-[2px] top-[136px] w-[3px] h-11 rounded-l-md bg-[#2A2620]" />
        <span aria-hidden="true" className="absolute -left-[2px] top-[188px] w-[3px] h-11 rounded-l-md bg-[#2A2620]" />
        <span aria-hidden="true" className="absolute -right-[2px] top-32 w-[3px] h-16 rounded-r-md bg-[#2A2620]" />

        {/* Screen */}
        <div className="relative rounded-[43px] bg-white overflow-hidden">

          {/* Status bar + dynamic island */}
          <div className="relative flex items-center justify-between px-7 pt-3.5 pb-1">
            <span className="font-ledger text-[10px] font-semibold text-[#16130F]">9:41</span>
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[88px] h-[24px] bg-[#16130F] rounded-full" />
            <div className="flex items-center gap-1">
              {/* Signal */}
              <span className="flex items-end gap-[2px]" aria-hidden="true">
                <span className="w-[2.5px] h-[4px] rounded-sm bg-[#16130F]" />
                <span className="w-[2.5px] h-[6px] rounded-sm bg-[#16130F]" />
                <span className="w-[2.5px] h-[8px] rounded-sm bg-[#16130F]" />
              </span>
              {/* Battery */}
              <span className="ml-1 w-[18px] h-[9px] rounded-[3px] border border-black/30 p-[1.5px]" aria-hidden="true">
                <span className="block h-full w-3/4 rounded-[1.5px] bg-[#16130F]" />
              </span>
            </div>
          </div>

          <div className="pt-4 pb-4 px-4">
            {/* Store header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-md bg-[#16130F] flex items-center justify-center text-white font-ledger text-[9px] font-medium shrink-0">
                A
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-[11px] font-bold text-[#16130F] truncate">Aarav Shoots</p>
                <p className="font-ledger text-[8px] text-black/35 truncate">digione.ai/aarav</p>
              </div>
              <span className="ml-auto font-ledger text-[8px] font-medium text-emerald-700 inline-flex items-center gap-1 shrink-0">
                <span className="relative flex w-1 h-1">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500" />
                </span>
                LIVE
              </span>
            </div>

            {/* Product cover — before/after preset illustration */}
            <div className="relative rounded-xl bg-[#16130F] aspect-[4/3] overflow-hidden mb-2">
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: 'radial-gradient(circle at 78% 18%, rgba(232,58,46,0.4) 0%, transparent 55%)' }}
              />
              {/* Before half — washed out */}
              <div className="absolute inset-y-0 left-0 w-1/2 bg-white/[0.08] backdrop-saturate-0" />
              <span aria-hidden="true" className="absolute inset-y-3 left-1/2 w-px bg-white/30" />
              <span className="absolute top-3 left-3 font-ledger text-[7px] tracking-[0.18em] text-white/40 uppercase">Before</span>
              <span className="absolute top-3 right-3 font-ledger text-[7px] tracking-[0.18em] text-white/70 uppercase">After</span>

              {/* Preset sliders */}
              <div className="absolute inset-x-4 bottom-4 space-y-2">
                {[
                  { w: '72%' },
                  { w: '45%' },
                  { w: '85%' },
                ].map((s, i) => (
                  <div key={i} className="relative h-1 rounded-full bg-white/15">
                    <div className="absolute left-0 top-0 h-full rounded-full bg-[#E83A2E]" style={{ width: s.w }} />
                    <span
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
                      style={{ left: s.w }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Thumbnail strip */}
            <div className="grid grid-cols-4 gap-1.5 mb-3" aria-hidden="true">
              {[0.35, 0.2, 0.5, 0.12].map((o, i) => (
                <div key={i} className={`h-8 rounded-md bg-[#16130F] relative overflow-hidden ${i === 0 ? 'ring-1 ring-[#E83A2E]' : ''}`}>
                  <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 25%, rgba(232,58,46,${o}) 0%, transparent 60%)` }} />
                </div>
              ))}
            </div>

            {/* Title + rating */}
            <p className="text-[13px] font-bold text-[#16130F] leading-tight mb-1">
              Cinematic Preset Pack
            </p>
            <p className="text-[10.5px] font-medium text-black/45 leading-relaxed mb-2.5">
              120 Lightroom presets for moody Indian street photography. Lifetime access.
            </p>
            <div className="flex items-center gap-1.5 mb-3">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-ledger text-[9px] font-medium text-[#16130F]">4.9</span>
              <span className="font-ledger text-[9px] text-black/30">· 212 sales</span>
            </div>

            {/* Price + Buy now */}
            <div className="flex items-center justify-between border-t border-black/[0.06] pt-3 mb-3">
              <div className="leading-none">
                <p className="font-ledger text-[18px] font-semibold tracking-tight text-[#16130F]">
                  ₹499
                </p>
                <p className="font-ledger text-[9px] text-black/30 line-through mt-1">₹999</p>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-[#E83A2E] text-white font-semibold text-[11px] rounded-lg px-4 py-2.5">
                Buy now
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            <p className="font-ledger text-[7.5px] tracking-[0.18em] text-black/30 uppercase text-center">
              UPI · Cards · Instant delivery
            </p>

            {/* Home indicator */}
            <div className="mt-3 mx-auto w-24 h-1 rounded-full bg-black/[0.18]" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Floating sale toast */}
      <div className="absolute -right-6 sm:-right-10 top-20 bg-white border border-black/[0.08] rounded-lg shadow-[0_16px_40px_-20px_rgba(22,19,15,0.3)] px-3 py-2 flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center font-ledger text-[9px] font-semibold text-emerald-700">
          ₹
        </span>
        <div className="leading-tight">
          <p className="font-ledger text-[10px] font-semibold text-[#16130F]">+₹499 · New sale</p>
          <p className="font-ledger text-[8px] text-black/35">just now · UPI</p>
        </div>
      </div>
    </div>
  );
}

export default function ProductShowcase() {
  return (
    <section className="relative bg-white">
      <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
      <Rails>
        <div className="px-5 sm:px-10 lg:px-14 py-14 sm:py-20 lg:py-24">
          <InView>
            <div className="iv">
              <Kicker index="01" route="/discover" />
            </div>

            <div className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_1fr] gap-14 lg:gap-12 items-center">

              {/* iPhone — left */}
              <div className="iv order-2 lg:order-1">
                <IphoneMock />
              </div>

              {/* Copy + category boxes — right */}
              <div className="order-1 lg:order-2">
                <div className="iv max-w-2xl">
                  <h2 className="text-[28px] sm:text-[38px] lg:text-[44px] font-bold tracking-[-0.03em] leading-[1.08] text-[#16130F]">
                    Your own storefront.
                    <br />
                    <span className="text-[#E83A2E]">Plus a marketplace that sells for you.</span>
                  </h2>
                  <p className="mt-4 text-[15px] sm:text-[16px] leading-relaxed font-medium text-black/50">
                    Build your own store or website on DigiOne — then list the same
                    products on Discover, where buyers browse every category daily.
                    One upload, two places to sell.
                  </p>
                </div>

                {/* Category grid — 3 columns × 5 rows, rectangle tiles */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {CATEGORIES.map(({ label, icon: Icon, featured }, i) => (
                    <div
                      key={label}
                      className={`iv group flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-colors duration-200 ${
                        featured
                          ? 'bg-[#16130F] border-[#16130F]'
                          : 'bg-white border-black/[0.08] hover:border-black/[0.22] hover:bg-[#FAF8F6]'
                      }`}
                      style={{ transitionDelay: `${i * 35}ms` }}
                    >
                      <span className={`min-w-0 truncate text-[12.5px] font-semibold leading-snug ${featured ? 'text-white' : 'text-[#16130F]'}`}>
                        {label}
                      </span>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
                          featured ? 'text-[#FF6B5C]' : 'text-black/25 group-hover:text-[#E83A2E]'
                        }`}
                        strokeWidth={1.8}
                      />
                    </div>
                  ))}
                </div>

                <p className="iv font-ledger mt-6 text-[11px] text-black/35" style={{ transitionDelay: '620ms' }}>
                  Sell from your storefront · Get discovered on the marketplace
                </p>
              </div>
            </div>
          </InView>
        </div>
      </Rails>
    </section>
  );
}
