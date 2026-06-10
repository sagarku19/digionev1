---
noteId: "3a0d1e4064c111f1a2458925ff71e28e"
tags: []

---

# Homepage Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product-shot visuals to the DigiOne homepage — an earnings-focused dashboard mockup in the Hero, plus mini-mockup upgrades to Marquee, Steps, ProductTypes, and Showcase — per the approved spec.

**Architecture:** All visuals are flat div-composed mockups (no images, no new packages), the same technique as the existing Features bento graphics. A single `.sk-shimmer` utility in `globals.css` (reusing the existing `shimmer` keyframe) powers all skeleton bars. Each section component is self-contained; small graphic sub-components live in the same section file, placed above any module-level array that references them.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, lucide-react (meta rows only — never inside mockup bodies), pure CSS animations.

**Spec:** `docs/superpowers/specs/2026-06-10-homepage-visual-upgrade-design.md`

**Testing note:** This project has no unit-test infrastructure (see `.claude/rules/verification.md` — Lane 2 not in place). Verification per task is `npx tsc --noEmit` + `npm run lint`; final task adds the manual responsive check and a token-leak grep. TDD steps are therefore replaced by type/lint gates — this is the project's documented verification workflow, not an omission.

**Hard constraints (from spec — re-read before every task):**
- No copy changes. No new accent hues (white/grays + `#E83A2E`; emerald/violet/amber only where those families already appear in the file being edited).
- No images, no new packages, no new CSS files. Only `globals.css` may gain the shimmer utility.
- No lucide icons inside mockup bodies. Unicode glyphs (`✓`, `₹`) as text are fine.
- Every decorative mockup wrapper gets `aria-hidden="true"` and contains no focusable elements (no `<button>`/`<a>` — use `<div>`/`<span>`).
- Light mode only — no `dark:` variants.
- No `console.log`.

## File structure

| File | Change |
|---|---|
| `app/globals.css` | Add `.sk-shimmer` utility (reuses existing `@keyframes shimmer` at line 5) |
| `src/components/marketing/sections/Hero.tsx` | Add dashboard product-shot block below CTAs; move the 3 floating cards to overlap its corners |
| `src/components/marketing/sections/Marquee.tsx` | Logos → pill chips; stat tiles → bordered cards with sparkline; remove dashboard CSS vars |
| `src/components/marketing/sections/Steps.tsx` | Add 3 mini-mockup graphic components + render one under each step |
| `src/components/marketing/sections/ProductTypes.tsx` | Add a small `visual` per tile, absolutely positioned top-right |
| `src/components/marketing/sections/Showcase.tsx` | Replace flat gradient cover interior with mini storefront (header bar + 3-card product grid) |

Not touched: `app/(marketing)/page.tsx`, `Features.tsx`, `Testimonials.tsx`, `CtaBanner.tsx`, `MarketingNav.tsx`, `InView.tsx`.

---

### Task 1: Skeleton shimmer utility

**Files:**
- Modify: `app/globals.css` (insert after the `marqueescroll` keyframe, line 18)

- [x] **Step 1: Add the `.sk-shimmer` utility class**

Insert after line 18 (`}` closing `@keyframes marqueescroll`):

```css
/* Skeleton shimmer bars — marketing mockups (reuses @keyframes shimmer above) */
.sk-shimmer {
  background: linear-gradient(90deg, #ececec 25%, #f7f7f7 50%, #ececec 75%);
  background-size: 200% 100%;
  animation: shimmer 1.8s linear infinite;
}
```

- [x] **Step 2: Verify build health**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

Run: `npm run lint`
Expected: no new errors (CSS isn't linted by ESLint; this confirms nothing else broke).

- [x] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(marketing): add sk-shimmer skeleton utility for homepage mockups"
```

---

### Task 2: Hero dashboard product shot

**Files:**
- Modify: `src/components/marketing/sections/Hero.tsx`
  - Floating cards: lines 146–203 (three `hidden xl:block absolute …` wrappers)
  - Insertion point: after the mobile social-proof block (closes at line 293), still inside the `relative mx-auto max-w-6xl` content container

- [x] **Step 1: Move the three floating cards inside a new product-shot wrapper and add the dashboard mockup**

Delete the three floating-card blocks at lines 146–203 (keep their inner card markup — only the outer positioning wrappers change). Then insert the following block immediately after the mobile social-proof `div` (after line 293), as the last child of the content container:

```tsx
        {/* Dashboard product shot */}
        <div
          aria-hidden="true"
          className="relative w-full max-w-5xl mx-auto mt-12 sm:mt-20"
          style={{ animation: 'heroFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.34s both' }}
        >
          {/* Floating card — purchase (left corner) */}
          <div
            className="hidden xl:block absolute -left-28 top-1/3 z-20"
            style={{ animation: 'floatCard1 7s ease-in-out infinite' }}
          >
            <div className="bg-white border border-black/[0.07] rounded-2xl px-4 py-3.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.14)] w-[220px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E83A2E] to-orange-400 flex items-center justify-center shrink-0 text-lg leading-none">🧑</div>
                <div>
                  <p className="text-[10px] font-black text-gray-900 leading-none">Arjun Sharma</p>
                  <p className="text-[9px] text-gray-400 leading-none mt-0.5">just purchased</p>
                </div>
                <span className="ml-auto text-[9px] font-bold text-gray-400">2s ago</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                <span className="text-[11px] font-bold text-gray-700">Masterclass Course</span>
                <span className="text-[11px] font-black text-emerald-600">₹999</span>
              </div>
            </div>
          </div>

          {/* Floating card — revenue (top-right corner) */}
          <div
            className="hidden xl:block absolute -right-28 -top-10 z-20"
            style={{ animation: 'floatCard2 9s ease-in-out infinite' }}
          >
            <div className="bg-white border border-black/[0.07] rounded-2xl px-4 py-4 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.16)] w-52.5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">+24% today</span>
              </div>
              <p className="text-[10px] font-semibold text-gray-400 leading-none mb-1">Revenue today</p>
              <p className="text-[22px] font-black text-gray-900 leading-none tracking-tight">₹38,240</p>
              <div className="mt-2.5 h-1 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full w-[72%] rounded-full bg-linear-to-r from-violet-400 to-indigo-500" />
              </div>
            </div>
          </div>

          {/* Floating card — auto DMs (bottom-right corner) */}
          <div
            className="hidden xl:block absolute -right-20 bottom-24 z-20"
            style={{ animation: 'floatCard3 11s ease-in-out infinite' }}
          >
            <div className="bg-white border border-black/[0.07] rounded-2xl px-4 py-3.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.14)] flex items-center gap-3 w-[210px]">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E83A2E] to-orange-400 flex items-center justify-center shadow-sm shrink-0">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-400 leading-none mb-1">Auto DMs sent</p>
                <p className="text-[16px] font-black text-gray-900 leading-none">3,821</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black text-green-600">Live</span>
              </div>
            </div>
          </div>

          {/* Browser frame */}
          <div className="relative rounded-t-2xl border border-black/[0.08] border-b-0 bg-white shadow-[0_-20px_80px_-24px_rgba(0,0,0,0.16),0_30px_80px_-30px_rgba(0,0,0,0.20)] overflow-hidden text-left">
            {/* Chrome bar */}
            <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-gray-50/90 border-b border-black/[0.06]">
              <div className="flex gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <span className="mx-auto inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-500 font-medium bg-white border border-black/[0.07] px-4 sm:px-8 py-1 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                digione.ai/dashboard
              </span>
              <div className="w-[52px] shrink-0" />
            </div>

            <div className="flex">
              {/* Sidebar — hidden below sm */}
              <div className="hidden sm:flex flex-col w-44 shrink-0 bg-gray-50/80 border-r border-black/[0.05] p-4 gap-1.5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-md bg-[#E83A2E]" />
                  <div className="sk-shimmer h-2 w-16 rounded-full" />
                </div>
                <div className="flex items-center gap-2 bg-[#E83A2E]/[0.08] border-l-[3px] border-[#E83A2E] rounded-md px-2.5 py-2">
                  <div className="w-2.5 h-2.5 rounded-[3px] bg-[#E83A2E]" />
                  <div className="h-1.5 w-16 rounded-full bg-[#E83A2E]/35" />
                </div>
                {[80, 56, 96, 48, 72].map((w, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-2">
                    <div className="w-2.5 h-2.5 rounded-[3px] bg-gray-200" />
                    <div className="sk-shimmer h-1.5 rounded-full" style={{ width: w }} />
                  </div>
                ))}
              </div>

              {/* Main area */}
              <div className="flex-1 p-4 sm:p-5">
                {/* Balance card */}
                <div className="relative rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 sm:p-5 text-white overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 12% 60%, rgba(255,255,255,0.35) 0%, transparent 45%)' }}
                  />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] opacity-75 mb-1">Available Balance</p>
                      <p className="text-[26px] sm:text-[32px] font-black tracking-tight leading-none">₹1,24,850</p>
                      <p className="text-[9px] sm:text-[10px] opacity-75 mt-1.5 font-medium">Cashfree · Instant UPI</p>
                    </div>
                    <span className="bg-white/20 border border-white/25 text-[10px] font-black rounded-full px-3 py-1.5">Withdraw</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-[1.25fr_1fr] gap-4">
                  {/* Incoming payments */}
                  <div className="space-y-2">
                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Incoming payments</p>
                    {[
                      { tone: 'from-emerald-400 to-teal-500', amt: '+₹4,200', amtClass: 'text-emerald-600', sub: '2m ago', subClass: 'text-gray-300' },
                      { tone: 'from-emerald-400 to-teal-500', amt: '+₹11,500', amtClass: 'text-emerald-600', sub: '1h ago', subClass: 'text-gray-300' },
                      { tone: 'from-amber-400 to-amber-500', amt: '+₹3,800', amtClass: 'text-amber-600', sub: 'Processing', subClass: 'text-amber-500' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white border border-black/[0.06] rounded-xl px-3 py-2.5">
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${row.tone} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="sk-shimmer h-2 w-3/5 rounded-full mb-1.5" />
                          <div className="sk-shimmer h-1.5 w-2/5 rounded-full" />
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-[12px] font-black leading-tight ${row.amtClass}`}>{row.amt}</p>
                          <p className={`text-[9px] leading-tight ${row.subClass}`}>{row.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Revenue chart — md+ only */}
                  <div className="hidden md:flex flex-col bg-white border border-black/[0.06] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Revenue · 7d</p>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">+24%</span>
                    </div>
                    <div className="flex items-end gap-1.5 flex-1 min-h-[88px]">
                      {[
                        { h: '35%', c: 'bg-[#E83A2E]/15' },
                        { h: '52%', c: 'bg-[#E83A2E]/30' },
                        { h: '42%', c: 'bg-[#E83A2E]/15' },
                        { h: '68%', c: 'bg-[#E83A2E]/30' },
                        { h: '55%', c: 'bg-[#E83A2E]/15' },
                        { h: '92%', c: 'bg-[#E83A2E]' },
                        { h: '74%', c: 'bg-[#E83A2E]/30' },
                      ].map((bar, i) => (
                        <div key={i} className={`flex-1 rounded-t ${bar.c}`} style={{ height: bar.h }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom fade into next section */}
          <div className="absolute bottom-0 inset-x-0 h-20 sm:h-24 bg-gradient-to-b from-transparent to-white pointer-events-none z-10" />
        </div>
```

Notes for the implementer:
- The `TrendingUp` and `Zap` imports already exist at the top of the file — do not remove them.
- The `floatCard1/2/3` and `heroFadeUp` keyframes already exist in the inline `<style>` block — do not duplicate.
- The `floatCard4` keyframe becomes unused; leave it (it's inert CSS) or delete it — either is fine.
- Headline, sub-copy, badge, CTAs, blobs, dot grid, grain: untouched.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `npm run lint`
Expected: no new errors.

- [x] **Step 3: Commit**

```bash
git add src/components/marketing/sections/Hero.tsx
git commit -m "feat(marketing): hero dashboard product shot — earnings mockup with floating cards"
```

---

### Task 3: Marquee — pill chips + stat cards

**Files:**
- Modify: `src/components/marketing/sections/Marquee.tsx` (whole file — it's 43 lines)

- [x] **Step 1: Replace the file body**

Replace the full contents of `Marquee.tsx` with:

```tsx
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
```

This keeps all copy and the marquee animation, converts logos to chips, converts stat tiles to bordered white cards with a 4-bar sparkline, and removes both `var(--text-primary)` / `var(--text-secondary)` usages.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run lint` → no new errors.

- [x] **Step 3: Commit**

```bash
git add src/components/marketing/sections/Marquee.tsx
git commit -m "feat(marketing): marquee logo chips + stat cards with sparklines, drop dashboard tokens"
```

---

### Task 4: Steps — mini-mockup per step

**Files:**
- Modify: `src/components/marketing/sections/Steps.tsx`

- [x] **Step 1: Add graphic components and render them under each step**

(a) Directly after the imports (NOT at the bottom of the file — the `steps` array initializer reads these bindings at module load, so they must be defined above it), add:

```tsx
const stepGraphicCard =
  'rounded-2xl border border-black/[0.06] bg-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.10)] p-4 text-left w-full max-w-[240px]';

const DragDots = () => (
  <div className="grid grid-cols-2 gap-[3px] shrink-0">
    {[0, 1, 2, 3, 4, 5].map((d) => (
      <span key={d} className="w-[3px] h-[3px] rounded-full bg-gray-300" />
    ))}
  </div>
);

const SignupGraphic = () => (
  <div className={stepGraphicCard}>
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E83A2E] to-orange-400 shrink-0" />
      <div className="sk-shimmer h-2 w-1/2 rounded-full" />
    </div>
    <div className="sk-shimmer h-4 w-full rounded-lg mb-2" />
    <div className="sk-shimmer h-4 w-full rounded-lg mb-3" />
    <div className="h-5 rounded-lg bg-[#E83A2E] flex items-center justify-center">
      <div className="h-1 w-1/3 rounded-full bg-white/60" />
    </div>
  </div>
);

const BuilderGraphic = () => (
  <div className={stepGraphicCard}>
    <div className="flex items-center gap-2 bg-[#E83A2E]/[0.06] border border-[#E83A2E]/20 border-l-[3px] border-l-[#E83A2E] rounded-lg px-2.5 py-2 mb-1.5">
      <DragDots />
      <div className="w-2 h-2 rounded-sm bg-gradient-to-br from-[#E83A2E] to-orange-400 shrink-0" />
      <div className="h-1.5 w-2/5 rounded-full bg-gray-700/70" />
    </div>
    <div className="flex items-center gap-2 px-2.5 py-2 mb-1.5">
      <DragDots />
      <div className="w-2 h-2 rounded-sm bg-violet-300 shrink-0" />
      <div className="sk-shimmer h-1.5 w-1/2 rounded-full" />
    </div>
    <div className="flex items-center gap-2 px-2.5 py-2">
      <DragDots />
      <div className="w-2 h-2 rounded-sm bg-emerald-300 shrink-0" />
      <div className="sk-shimmer h-1.5 w-1/3 rounded-full" />
    </div>
  </div>
);

const PayoutGraphic = () => (
  <div className={stepGraphicCard}>
    <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 mb-2.5">
      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
        <span className="text-white text-[10px] font-black leading-none">✓</span>
      </div>
      <div>
        <p className="text-[11px] font-black text-emerald-900 leading-tight">₹12,400 credited</p>
        <p className="text-[8px] text-emerald-600 leading-tight font-medium">Instant UPI · just now</p>
      </div>
    </div>
    <div className="flex items-center gap-2 px-1">
      <div className="sk-shimmer h-1.5 flex-1 rounded-full" />
      <span className="text-[9px] font-black text-emerald-600 shrink-0">+₹2,100</span>
    </div>
  </div>
);
```

(b) Add a `graphic` field to the `steps` array entries (top of file). The array becomes:

```tsx
const steps = [
  {
    num: "01",
    title: "Sign up in 30 seconds",
    desc: "Create your free account. No credit card, no commitment — just your email.",
    icon: UserPlus,
    color: "from-[#E83A2E] to-orange-500",
    graphic: SignupGraphic,
  },
  {
    num: "02",
    title: "Upload & style your store",
    desc: "Add your products and design your storefront with our drag-and-drop visual builder.",
    icon: Upload,
    color: "from-violet-500 to-indigo-500",
    graphic: BuilderGraphic,
  },
  {
    num: "03",
    title: "Share & get paid",
    desc: "Share your link anywhere. Receive instant UPI payouts directly to your bank account.",
    icon: IndianRupee,
    color: "from-emerald-500 to-teal-500",
    graphic: PayoutGraphic,
  },
];
```

(c) Inside the render, after the `<p>` holding `step.desc` (line 78–80 in the current file), add:

```tsx
                  <div aria-hidden="true" className="mt-6 w-full flex justify-center">
                    <Graphic />
                  </div>
```

and at the top of the map callback (next to `const Icon = step.icon;`) add:

```tsx
            const Graphic = step.graphic;
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run lint` → no new errors.

- [x] **Step 3: Commit**

```bash
git add src/components/marketing/sections/Steps.tsx
git commit -m "feat(marketing): steps section mini-mockups — signup, builder, payout"
```

---

### Task 5: ProductTypes — mini product visuals

**Files:**
- Modify: `src/components/marketing/sections/ProductTypes.tsx`

- [x] **Step 1: Add a `visual` renderer per type and slot it into the tile**

(a) Directly after the imports, add six small visual components (they must be defined before the `types` array that references them):

```tsx
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
    <div className="absolute top-1 left-1 w-10 h-12 rounded bg-rose-200" />
    <div className="relative w-10 h-12 rounded bg-gradient-to-br from-rose-500 to-pink-500 p-1.5 shadow-[0_3px_8px_-2px_rgba(0,0,0,0.20)]">
      <div className="h-1 w-4/5 rounded-full bg-white/70 mb-1" />
      <div className="h-1 w-1/2 rounded-full bg-white/45" />
    </div>
  </div>
);

const DesignVisual = () => (
  <div className="grid grid-cols-2 gap-1 w-11">
    <div className="h-4.5 rounded bg-violet-200" />
    <div className="h-4.5 rounded bg-violet-300" />
    <div className="h-4.5 rounded bg-violet-400" />
    <div className="h-4.5 rounded bg-violet-500" />
  </div>
);

const TemplateVisual = () => (
  <div className="w-12 rounded-md bg-white border border-black/[0.08] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.10)] p-1 space-y-[3px]">
    <div className="h-1.5 rounded-sm bg-blue-400" />
    <div className="grid grid-cols-3 gap-[3px]">
      {[0, 1, 2, 3, 4, 5].map((c) => (
        <div key={c} className="h-1.5 rounded-sm bg-blue-100" />
      ))}
    </div>
  </div>
);

const PhotoVisual = () => (
  <div className="relative w-12 h-12">
    <div className="absolute top-1 left-1 w-10 h-10 rounded-md bg-teal-200 rotate-6" />
    <div className="relative w-10 h-10 rounded-md bg-gradient-to-br from-teal-400 to-emerald-500 shadow-[0_3px_8px_-2px_rgba(0,0,0,0.20)] overflow-hidden">
      <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white/80" />
      <div className="absolute -bottom-1 -left-1 w-7 h-5 bg-emerald-700/40 rounded-tr-[10px]" />
    </div>
  </div>
);

const ServiceVisual = () => (
  <div className="w-12 rounded-md bg-white border border-black/[0.08] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.10)] overflow-hidden">
    <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
    <div className="p-1 space-y-[3px]">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        <div className="sk-shimmer h-1 flex-1 rounded-full" />
      </div>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-200 shrink-0" />
        <div className="sk-shimmer h-1 flex-1 rounded-full" />
      </div>
    </div>
  </div>
);
```

(b) Add `visual` to each entry of the `types` array:

```tsx
const types = [
  { title: "Courses", icon: GraduationCap, desc: "Drip video lessons with access control", color: "from-orange-500 to-[#E83A2E]", bg: "bg-orange-50", border: "border-orange-100", visual: CourseVisual },
  { title: "Ebooks", icon: BookOpen, desc: "PDFs with smart buyer watermarks", color: "from-rose-500 to-pink-500", bg: "bg-rose-50", border: "border-rose-100", visual: EbookVisual },
  { title: "Design Assets", icon: Palette, desc: "Figma, Sketch & premium UI kits", color: "from-violet-500 to-indigo-500", bg: "bg-violet-50", border: "border-violet-100", visual: DesignVisual },
  { title: "Templates", icon: FileSpreadsheet, desc: "Notion, Excel & Google Slides", color: "from-blue-500 to-cyan-500", bg: "bg-blue-50", border: "border-blue-100", visual: TemplateVisual },
  { title: "Photography", icon: Camera, desc: "High-res presets & photo packs", color: "from-teal-500 to-emerald-500", bg: "bg-teal-50", border: "border-teal-100", visual: PhotoVisual },
  { title: "Services", icon: Handshake, desc: "1-on-1 calls & consulting slots", color: "from-amber-500 to-orange-500", bg: "bg-amber-50", border: "border-amber-100", visual: ServiceVisual },
];
```

(c) In the tile render (the `types.map` callback), next to `const Icon = t.icon;` add `const Visual = t.visual;`, and inside the tile `div` — directly after the hover accent bar div (line 49 in the current file) — add:

```tsx
                  <div aria-hidden="true" className="absolute top-4 right-4 sm:top-5 sm:right-5 opacity-80 group-hover:opacity-100 transition-opacity duration-400">
                    <Visual />
                  </div>
```

So titles never run under the visual, change the `<h3>` line (line 53 in the current file) to add `pr-14`:

```tsx
                  <h3 className="text-[16px] sm:text-[18px] font-black text-gray-900 mb-1.5 tracking-tight pr-14">{t.title}</h3>
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run lint` → no new errors.

- [x] **Step 3: Commit**

```bash
git add src/components/marketing/sections/ProductTypes.tsx
git commit -m "feat(marketing): product-type tiles gain mini product visuals"
```

---

### Task 6: Showcase — mini storefront covers

**Files:**
- Modify: `src/components/marketing/sections/Showcase.tsx:46-54` (the cover `div` inside the `creators.map`)

- [x] **Step 1: Replace the cover block**

Replace lines 46–54 (the `div` with `h-36 sm:h-40 bg-gradient-to-br ...` and its children) with:

```tsx
              <div className={`h-36 sm:h-40 bg-gradient-to-br ${c.color} relative px-4 pt-3 overflow-hidden`}>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:22px_22px]" />
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2.5 py-1 text-[10px] font-black text-white z-10">
                  {c.revenue}
                </div>
                {/* mini storefront */}
                <div aria-hidden="true" className="relative">
                  <div className="h-1.5 w-1/3 rounded-full bg-white/60 mb-2.5" />
                  <div className="flex gap-2">
                    {[0, 1, 2].map((n) => (
                      <div key={n} className="flex-1 bg-white rounded-t-lg p-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.10)]">
                        <div className="h-9 sm:h-11 rounded-md bg-gray-100 mb-1.5" />
                        <div className="sk-shimmer h-1 w-3/4 rounded-full mb-1" />
                        <div className="h-1 w-1/2 rounded-full bg-[#E83A2E]/30" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-14 h-14 rounded-2xl bg-white border-2 border-white shadow-lg flex items-center justify-center z-10">
                  <span className="text-lg font-black text-gray-800">{c.name.charAt(0)}</span>
                </div>
              </div>
```

Everything below the cover (name, niche, link pill) is unchanged.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run lint` → no new errors.

- [x] **Step 3: Commit**

```bash
git add src/components/marketing/sections/Showcase.tsx
git commit -m "feat(marketing): showcase creator covers become mini storefronts"
```

---

### Task 7: Final verification

**Files:** none (verification only)

- [x] **Step 1: Full type + lint pass**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run lint` → no errors.

- [x] **Step 2: Dashboard-token leak grep**

Run:
```bash
grep -rn "var(--" src/components/marketing/sections/
```
Expected: **zero hits** (Marquee was the only offender; Task 3 removed it).

- [x] **Step 3: Manual responsive check**

Run: `npm run dev` (kill any stale node process first) and open `http://localhost:3000` in Chrome. Check with devtools at these widths:

| Width | Checks |
|---|---|
| 360px | No horizontal scrollbar anywhere. Hero mockup shows chrome bar + balance card + 3 payment rows only (no sidebar, no chart). Marquee chips wrap/scroll without overflow. Step mini-mockups stack centered. ProductTypes visuals don't collide with titles. Showcase covers render 3 mini product cards without clipping the avatar. |
| 768px | Hero mockup gains the sidebar. Stats row is 3-up. Steps are 3 columns with connector line. |
| 1440px | Floating cards overlap the mockup corners (left, top-right, bottom-right) without covering the balance amount. Bottom fade blends into Marquee. Shimmer animation visible on skeleton bars. |

- [x] **Step 4: Mark plan complete and commit any checkbox updates**

```bash
git add docs/superpowers/plans/2026-06-10-homepage-visual-upgrade.md
git commit -m "docs(plan): homepage visual upgrade — execution complete"
```
