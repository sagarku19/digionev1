const logos = ["YouTube", "Instagram", "Spotify", "Substack", "Teachable", "Notion", "Twitter", "Patreon", "WhatsApp", "Gumroad"];

const stats = [
  { value: "₹4.2 Cr+", label: "earned by creators" },
  { value: "12,400+", label: "products sold securely" },
  { value: "99.9%", label: "uptime SLA" },
];

export default function Marquee() {
  return (
    <section className="bg-white overflow-hidden pt-4 pb-10 sm:pb-20">
      <div className="max-w-7xl mx-auto px-4 text-center mb-8 sm:mb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-10">
          Creators from these platforms use DigiOne
        </p>
        <div className="relative flex overflow-x-hidden">
          <div
            className="flex items-center gap-16 whitespace-nowrap"
            style={{ animation: 'marqueescroll 25s linear infinite', minWidth: '200%' }}
          >
            {[...logos, ...logos, ...logos].map((logo, i) => (
              <span key={i} className="text-lg font-bold text-gray-300 tracking-wider inline-block uppercase">
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
          <div key={i} className={`rounded-xl sm:rounded-2xl bg-[#f7f7f8] p-4 sm:p-8 text-center border-t-2 ${i === 0 ? 'border-[#E83A2E]/20' : i === 1 ? 'border-violet-200/40' : 'border-emerald-200/40'}`}>
            <div className="text-2xl sm:text-4xl font-black text-[var(--text-primary)] mb-1">{s.value}</div>
            <div className="text-[12px] sm:text-sm text-[var(--text-secondary)] leading-tight sm:mt-2">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
