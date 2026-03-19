// lib/tokens.ts
// DigiOne design system TypeScript constants — mirrors CSS custom properties.
// DB tables touched: none.

/**
 * Brand and semantic colour constants.
 * Used for Framer Motion variant objects and dynamic style values.
 * For static styles, prefer CSS custom properties via Tailwind utility classes.
 */

export const COLORS = {
  // Brand
  brand:          '#6366F1',
  brandHover:     '#4F46E5',
  brandGlow:      'rgba(99, 102, 241, 0.20)',
  brandSubtle:    'rgba(99, 102, 241, 0.10)',
  brandBorder:    'rgba(99, 102, 241, 0.30)',
  violet:         '#8B5CF6',
  pink:           '#EC4899',

  // Semantic
  success:        '#10B981',
  successSubtle:  'rgba(16, 185, 129, 0.10)',
  warning:        '#F59E0B',
  warningSubtle:  'rgba(245, 158, 11, 0.10)',
  danger:         '#EF4444',
  dangerSubtle:   'rgba(239, 68, 68, 0.10)',

  // Dashboard — light
  bg:             '#FFFFFF',
  bg2:            '#F8FAFC',
  bg3:            '#F1F5F9',
  border:         '#E2E8F0',
  borderStrong:   '#CBD5E1',
  text:           '#0F172A',
  text2:          '#475569',
  text3:          '#94A3B8',

  // SaaS pages — dark
  saasBg:         '#03040A',
  saasBg2:        '#0D0F1A',
  saasBg3:        '#141628',
  saasText:       '#F1F5F9',
  saasText2:      '#94A3B8',
} as const;

/**
 * Framer Motion easing array — matches CSS cubic-bezier(0.16, 1, 0.3, 1)
 */
export const EASING = [0.16, 1, 0.3, 1] as const;

/**
 * Standard animation durations in seconds.
 */
export const DURATION = {
  fast:   0.15,
  base:   0.25,
  slow:   0.40,
  enter:  0.50,
} as const;

/**
 * Stagger delay between children in Framer Motion.
 * Usage: `transition: { staggerChildren: STAGGER }`
 */
export const STAGGER = 0.06;

/**
 * Reusable Framer Motion variant presets.
 *
 * @example
 * <motion.div variants={VARIANTS.fadeUp} initial="hidden" whileInView="visible">
 */
export const VARIANTS = {
  fadeUp: {
    hidden:  { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION.slow, ease: EASING },
    },
  },
  fadeIn: {
    hidden:  { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: DURATION.base, ease: EASING },
    },
  },
  slideUp: {
    hidden:  { opacity: 0, y: 48 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION.enter, ease: EASING },
    },
  },
  scaleIn: {
    hidden:  { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: DURATION.base, ease: EASING },
    },
  },
  /** Container variant — stagger children */
  container: {
    hidden:  {},
    visible: { transition: { staggerChildren: STAGGER } },
  },
} as const;

/**
 * Layout constants aligned with design spec.
 */
export const LAYOUT = {
  sidebarWidth:    240,   // px — dashboard sidebar
  topBarHeight:    56,    // px — dashboard top bar
  contentMaxWidth: 1200,  // px — dashboard content area
  sectionPaddingDesktop: 96,  // px — SaaS section vertical padding
  sectionPaddingMobile:  64,  // px
  contentPadding:  24,   // px — inner content padding
} as const;

/**
 * Platform fee by plan type.
 * Source: subscription_plans.platform_fee_percent (never hardcode elsewhere).
 */
export const PLATFORM_FEE: Record<string, number> = {
  free: 10,
  plus: 7,
  pro:  5,
} as const;

/**
 * Currency formatting helper — always INR, Indian number system.
 *
 * @example formatINR(12500) → "₹12,500"
 * @example formatINR(150000) → "₹1,50,000"
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Order status → display label + colour token mapping.
 * Use .status-{status} CSS class for pills, or this map for dynamic styles.
 */
export const ORDER_STATUS_MAP = {
  completed: { label: 'Completed', color: COLORS.success,  bg: COLORS.successSubtle },
  pending:   { label: 'Pending',   color: COLORS.warning,  bg: COLORS.warningSubtle },
  failed:    { label: 'Failed',    color: COLORS.danger,   bg: COLORS.dangerSubtle  },
  refunded:  { label: 'Refunded',  color: '#64748B',        bg: 'rgba(100,116,139,0.10)' },
  cancelled: { label: 'Cancelled', color: '#94A3B8',        bg: 'rgba(148,163,184,0.10)' },
} as const;
