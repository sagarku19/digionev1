const logos = ["YouTube", "Instagram", "Spotify", "Substack", "Teachable", "Notion", "Twitter", "Patreon", "WhatsApp", "Gumroad"];

const stats = [
  {
    value: "₹4.2 Cr+",
    label: "earned by creators",
    bars: ["bg-[#E83A2E]/20", "bg-[#E83A2E]/40", "bg-[#E83A2E]/25", "bg-[#E83A2E]"],
  },
  {
    value: "12,400+",
    label: "products sold securely",
    bars: ["bg-violet-200", "bg-violet-300", "bg-violet-400", "bg-violet-500"],
  },
  {
    value: "99.9%",
    label: "uptime SLA",
    bars: ["bg-emerald-200", "bg-emerald-300", "bg-emerald-300", "bg-emerald-500"],
  },
];

const sparkHeights = ["40%", "60%", "50%", "100%"];

export default function Marquee() {
  return (
    <section className="bg-white overflow-hidden pt-4 pb-10 sm:pb-20">
      <div className="max-w-7xl mx-auto px-4 text-center mb-8 sm:mb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-10">
          Creators from these platforms use DigiOne
        </p>
        <div className="relative flex overflow-x-hidden">
          <div
            className="flex items-center gap-4 whitespace-nowrap"
            style={{ animation: 'marqueescroll 25s linear infinite', minWidth: '200%' }}
          >
            {[...logos, ...logos, ...logos].map((logo, i) => (
              <span
                key={i}
                className="inline-flex items-center px-5 py-2 bg-white border border-black/[0.07] rounded-full text-[13px] font-bold text-gray-400 tracking-wider uppercase shadow-[0_2px_10px_-4px_rgba(0,0,0,0.06)]"
              >
                {logo}
              </span>
            ))}
          </div>
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        {stats.map((s, i) => (
          <div
            key={i}
            className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-7 text-center border border-black/[0.07] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]"
          >
            <div className="text-2xl sm:text-4xl font-black text-gray-900 mb-1">{s.value}</div>
            <div className="text-[12px] sm:text-sm text-gray-500 leading-tight">{s.label}</div>
            <div aria-hidden="true" className="mt-3 sm:mt-4 flex items-end justify-center gap-1 h-4">
              {s.bars.map((barClass, j) => (
                <div key={j} className={`w-2 rounded-sm ${barClass}`} style={{ height: sparkHeights[j] }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
