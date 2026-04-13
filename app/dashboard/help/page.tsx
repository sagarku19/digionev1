'use client';

// Help & Support hub for creators — covers getting started, products, sites,
// earnings, marketing, and support contact options.
// DB tables: none

import React, { useState } from 'react';
import {
  HelpCircle, BookOpen, Package, Store, DollarSign, Megaphone,
  Users, ChevronDown, ChevronRight, MessageCircle, Mail, ExternalLink,
  Zap, ShoppingCart, BarChart2, Image, Gift, Ticket, Network,
  FileText, Video, Globe, CreditCard, Bell, Shield, Star,
  GraduationCap, AlertCircle, Headset, ArrowRight, Lightbulb,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type FAQ = { q: string; a: string };
type HelpSection = {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  faqs: FAQ[];
};

// ─── Help Content ─────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { label: 'Learn', description: 'Browse our tutorials and guides to master your store operations.', icon: GraduationCap, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', href: '#' },
  { label: 'Register Complaint', description: 'Facing an issue? Submit a ticket and our team will resolve it.', icon: AlertCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', href: '#' },
  { label: 'Contact Option', description: 'Reach out to our support team via email or live chat directly.', icon: Headset, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', href: '#' },
  { label: 'Docs', description: 'View detailed developer documentation and technical references.', icon: FileText, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10', href: 'https://docs.digione.ai' },
  { label: 'Feature Request', description: 'Have an idea? Ask for new features and vote on the roadmap.', icon: Lightbulb, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', href: '#' },
];

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    icon: Zap,
    label: 'Getting Started',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    faqs: [
      {
        q: 'How do I set up my creator account?',
        a: 'After signing up, head to Settings → Store Settings to add your store name, bio, and branding. Then go to Settings → Billing & KYC to submit your PAN and bank account so you can receive payouts.',
      },
      {
        q: 'What can I sell on DigiOne?',
        a: 'You can sell any digital product — eBooks, templates, courses, presets, music, code, PDFs, and more. Physical products are not supported at this time.',
      },
      {
        q: 'How do I get my store link?',
        a: 'Your store is live at digione.ai/[your-username] once you complete onboarding. You can also create a custom Link-in-Bio site or full storefront from My Sites.',
      },
      {
        q: 'Is there a free plan?',
        a: 'Yes! The free plan lets you list products and receive payments. Upgrading to Pro reduces transaction fees, unlocks priority support, and gives you access to advanced analytics and marketing tools.',
      },
    ],
  },
  {
    id: 'products',
    icon: Package,
    label: 'Products & Digital Downloads',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    faqs: [
      {
        q: 'How do I create a new product?',
        a: 'Click "Add product" in the sidebar or go to Products → New Product. Fill in the title, description, price, and upload your digital file. Save and your product is live instantly.',
      },
      {
        q: 'What file types can I upload?',
        a: 'You can upload PDFs, ZIPs, MP3s, MP4s, images, and most common digital file formats. Maximum file size is 2 GB per product.',
      },
      {
        q: 'Can I offer free products?',
        a: 'Yes — set the price to ₹0 and buyers can download the product for free. This is great for lead magnets or sample content.',
      },
      {
        q: 'How do I set up upsells?',
        a: 'Open a product and go to the Upsells tab. You can add post-purchase offers with a discounted price that appear right after checkout to increase average order value.',
      },
      {
        q: 'Can I limit how many times a product is sold?',
        a: 'Yes — enable "Limited stock" in the product settings and set a maximum quantity. The product will automatically stop selling once the limit is reached.',
      },
      {
        q: 'How do buyers access their downloads?',
        a: 'After a successful payment, buyers receive an email with a secure download link valid for 30 days. They can also access their purchases via their order receipt page.',
      },
    ],
  },
  {
    id: 'sites',
    icon: Store,
    label: 'Sites & Storefronts',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    faqs: [
      {
        q: 'What types of sites can I create?',
        a: 'DigiOne offers four site types: Link-in-Bio (a single page with all your links and products), Main Store (a full product listing page), Product Site (a high-converting landing page for a single product), and Payment Link (accept payments for services).',
      },
      {
        q: 'Can I use a custom domain?',
        a: 'Yes — on the Pro plan you can connect your own domain (e.g., shop.yourbrand.com). Go to My Sites → Edit → Domain Settings and follow the DNS instructions.',
      },
      {
        q: 'How do I edit my Link-in-Bio page?',
        a: 'Go to My Sites, find your Link-in-Bio site, and click Edit. You can rearrange blocks, change colors, add product cards, and update your profile picture and bio.',
      },
      {
        q: 'Can I have multiple sites?',
        a: 'Yes — you can create multiple sites for different audiences or products. Each site has its own URL and can be customised independently.',
      },
      {
        q: 'Is my storefront SEO-friendly?',
        a: 'Yes — all DigiOne storefronts are server-rendered and include meta titles, descriptions, and Open Graph tags. You can edit these in the site settings.',
      },
    ],
  },
  {
    id: 'earnings',
    icon: DollarSign,
    label: 'Earnings & Payouts',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    faqs: [
      {
        q: 'When do I get paid?',
        a: 'Earnings are settled every 7 days to your linked bank account, provided your KYC is verified. You can track pending and settled amounts in the Earnings page.',
      },
      {
        q: 'What are the transaction fees?',
        a: 'Free plan: 5% platform fee + payment gateway fees. Pro plan: 2% platform fee + payment gateway fees. Payment gateway fees are typically 2%–3% depending on the payment method.',
      },
      {
        q: 'How do I complete KYC?',
        a: 'Go to Settings → Billing & KYC and fill in your legal name, PAN number, and bank account details. Verification usually takes 1–3 business days.',
      },
      {
        q: 'Can I set my product prices in other currencies?',
        a: 'Currently all prices are in Indian Rupees (INR). Multi-currency support is on the roadmap.',
      },
      {
        q: 'How do I issue a refund?',
        a: 'Go to Customers, find the order, and click "Refund". Refunds are processed within 5–7 business days back to the buyer\'s original payment method.',
      },
    ],
  },
  {
    id: 'marketing',
    icon: Megaphone,
    label: 'Marketing & Growth',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    faqs: [
      {
        q: 'How do coupons work?',
        a: 'Go to Marketing → Coupons to create discount codes. You can set a percentage or fixed discount, an expiry date, and a maximum number of uses.',
      },
      {
        q: 'What is the Leads feature?',
        a: 'Leads lets you collect email addresses from visitors who haven\'t purchased yet — for example by offering a free resource. You can export leads to use with your email marketing tool.',
      },
      {
        q: 'How does the Affiliate program work?',
        a: 'Go to Marketing → Affiliates to enable affiliates for your products. Set a commission rate and affiliates get a unique link. When someone buys through their link, the affiliate earns the commission automatically.',
      },
      {
        q: 'How do Referrals work?',
        a: 'The Referrals program rewards existing customers who refer new buyers. Set a reward (store credit or discount) in Marketing → Referrals. Each customer gets a unique referral link they can share.',
      },
      {
        q: 'How do I use the Analytics dashboard?',
        a: 'Analytics shows visits, conversions, revenue, and best-performing products over time. Use the A/B Tests feature to test different product titles or prices to see which converts better.',
      },
    ],
  },
  {
    id: 'community',
    icon: Users,
    label: 'Community',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    faqs: [
      {
        q: 'What is the Community feature?',
        a: 'Community lets you build a membership space for your customers and followers. You can post updates, share exclusive content, and interact with your audience directly on DigiOne.',
      },
      {
        q: 'Can I restrict community access to buyers only?',
        a: 'Yes — you can set community access to "Buyers only", "All followers", or "Paid members" depending on your plan and community settings.',
      },
      {
        q: 'Can I send announcements to my community?',
        a: 'Yes — post an announcement in your community and all members will be notified via email and in-app notification.',
      },
    ],
  },
  {
    id: 'account',
    icon: Shield,
    label: 'Account & Security',
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-500/10',
    faqs: [
      {
        q: 'How do I change my email or password?',
        a: 'Go to Settings → Store Settings to update your profile details. To change your password, use the "Forgot password" flow from the login page — a reset link will be sent to your registered email.',
      },
      {
        q: 'How do I manage notifications?',
        a: 'Go to Notifications in the sidebar to see all alerts. You can control which notifications you receive via email in Settings → Store Settings.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Please contact support at support@digione.ai to request account deletion. We\'ll process it within 7 business days after confirming your identity.',
      },
      {
        q: 'Is my data secure?',
        a: 'Yes — all data is encrypted in transit and at rest. Payments are processed through PCI-DSS-compliant gateways. We never store raw card details.',
      },
    ],
  },
];

// ─── Support Options ──────────────────────────────────────────────────────────

const SUPPORT_OPTIONS = [
  {
    icon: Mail,
    label: 'Email Support',
    description: 'Get help via email. We respond within 24 hours on business days.',
    action: 'mailto:support@digione.ai',
    actionLabel: 'Send an email',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    icon: MessageCircle,
    label: 'Live Chat',
    description: 'Chat with our support team in real time during business hours (Mon–Sat, 10am–6pm IST).',
    action: '#',
    actionLabel: 'Start chat',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    icon: BookOpen,
    label: 'Documentation',
    description: 'Read detailed guides and API references in our knowledge base.',
    action: 'https://docs.digione.ai',
    actionLabel: 'Open docs',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-3 py-4 text-left hover:text-[var(--accent)] transition-colors group"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] leading-snug">
          {faq.q}
        </span>
        {open
          ? <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] shrink-0 mt-0.5" />
          : <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0 mt-0.5" />
        }
      </button>
      {open && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed pb-4 -mt-1">
          {faq.a}
        </p>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: HelpSection }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = section.icon;
  return (
    <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center gap-4 p-5 hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className={`w-10 h-10 ${section.bg} ${section.color} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{section.label}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{section.faqs.length} articles</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-5 pb-2 border-t border-[var(--border)]">
          {section.faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? HELP_SECTIONS.map(s => ({
        ...s,
        faqs: s.faqs.filter(
          f =>
            f.q.toLowerCase().includes(search.toLowerCase()) ||
            f.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(s => s.faqs.length > 0)
    : HELP_SECTIONS;

  return (
    <div className="space-y-8 max-w-full">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-[var(--text-secondary)]" />
          Help & Support
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Find answers to common questions or reach out to our support team.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {QUICK_LINKS.map(link => (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="group bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent)] hover:shadow-md transition-all duration-200 flex flex-col gap-4 cursor-pointer"
          >
            <div className={`w-12 h-12 ${link.bg} ${link.color} rounded-xl flex items-center justify-center`}>
              <link.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">{link.label}</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{link.description}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${link.color} group-hover:gap-2 transition-all`}>
              Open <ArrowRight className="w-4 h-4" />
            </div>
          </a>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
        <input
          type="text"
          placeholder="Search help articles…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition"
        />
      </div>

      {/* FAQ Sections */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-3">
          Browse by topic
        </h2>
        <div className="flex flex-col gap-3">
          {filtered.length > 0 ? (
            filtered.map(section => (
              <SectionCard key={section.id} section={section} />
            ))
          ) : (
            <div className="py-12 text-center text-[var(--text-secondary)] text-sm">
              No results for &ldquo;{search}&rdquo; — try a different keyword or contact support below.
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Contact Support */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-3">
          Still need help?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SUPPORT_OPTIONS.map(opt => (
            <a
              key={opt.label}
              href={opt.action}
              target={opt.action.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="group bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-[var(--accent)] hover:shadow-md transition-all duration-200 flex flex-col gap-3"
            >
              <div className={`w-10 h-10 ${opt.bg} ${opt.color} rounded-xl flex items-center justify-center`}>
                <opt.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{opt.label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{opt.description}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${opt.color} group-hover:gap-2 transition-all mt-auto`}>
                {opt.actionLabel} <ExternalLink className="w-3 h-3" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Platform status note */}
      <p className="text-xs text-[var(--text-secondary)] text-center pb-4">
        DigiOne v1 &mdash; For urgent issues email{' '}
        <a href="mailto:support@digione.ai" className="underline hover:text-[var(--text-primary)] transition">
          support@digione.ai
        </a>
      </p>

    </div>
  );
}
