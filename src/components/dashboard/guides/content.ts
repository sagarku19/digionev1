import type { LucideIcon } from 'lucide-react';
import {
  Package, IndianRupee, Upload, Globe, Trash2, Store, Plus, Palette, Share2,
  Link2, Hash, BarChart2, Ticket, Users, Network, Gift, Calendar, Percent,
  Clock, Zap, FileText, Filter, Download, CheckCircle, ClipboardList,
  MessageCircle, Heart, Image as ImageIcon,
} from 'lucide-react';

export const GUIDE_KEYS = [
  'products', 'sites', 'links', 'marketing', 'coupons',
  'leads', 'affiliates', 'referrals', 'services', 'community',
] as const;

export type GuideKey = typeof GUIDE_KEYS[number];

export type GuideStep = { title: string; desc: string; icon?: LucideIcon };

export type Guide = {
  title: string;
  intro: string;
  /** Short label for the page this guide belongs to, used by the "Go to …" button. */
  home: string;
  steps: GuideStep[];
  tips?: string[];
};

export const GUIDES: Record<GuideKey, Guide> = {
  products: {
    title: 'Selling products',
    intro: 'Create, price, deliver, and manage your digital products from one place.',
    home: 'Products',
    steps: [
      { title: 'Create a product', desc: 'Click Add Product, then work through the tabs — Basic, Pricing, Content, Marketing, Settings — starting with a clear name, category, and description.', icon: Package },
      { title: 'Set your price', desc: 'Price it in ₹. Add a compare-at price to show a strikethrough discount, or switch on Free to collect emails instead of charging.', icon: IndianRupee },
      { title: 'Add what buyers get', desc: 'In the Content tab, upload the files buyers download, add a post-purchase URL, and add labelled access links they see right after paying.', icon: Upload },
      { title: 'Add a thumbnail & gallery', desc: 'Pick a cover image and gallery from the Media picker so the product looks polished on your storefront.', icon: ImageIcon },
      { title: 'Publish it', desc: 'Hit Publish to go live — a product needs at least one file or access link first. Unpublish anytime without affecting existing buyers.', icon: Globe },
      { title: 'Organize & bulk-edit', desc: 'Use the status tabs, search, and category filters. Select several products to publish, unpublish, or delete them together.', icon: Filter },
      { title: 'Trash & restore', desc: 'Move products to Trash instead of deleting — they are restorable and buyers keep access. Permanent delete is blocked while a product has buyers or powers a site.', icon: Trash2 },
    ],
    tips: [
      'A product needs at least one file or access link before it can be published.',
      'Free products still capture buyer emails — a great top-of-funnel lead magnet.',
      'A compare-at price renders as a strikethrough, which makes a discount feel real.',
      'Access links never disappear for buyers, even if you edit or archive them later.',
      'Use categories so products group cleanly on your Store site.',
    ],
  },
  sites: {
    title: 'Building your storefront',
    intro: 'Create and manage the pages where people discover and buy from you.',
    home: 'My Sites',
    steps: [
      { title: 'Pick a site type', desc: 'Choose the right page: Store (a product grid), Single-page (one focused sales page), Link-in-bio (a social profile), or Payment link (custom amounts).', icon: Store },
      { title: 'Create it', desc: 'Click Create New Site, pick a type, and choose a slug — that becomes your public URL.', icon: Plus },
      { title: 'Design it in the editor', desc: 'Open a site to customize sections, colours and typography, navigation, and layout — with a live web and mobile preview.', icon: Palette },
      { title: 'Assign products', desc: 'On a Store or Single-page site, add the products you want to sell so they appear for buyers.', icon: Package },
      { title: 'Publish & share', desc: 'Publish the site, then copy its link to drop into your bio, posts, or a short link.', icon: Share2 },
      { title: 'Manage & trash', desc: 'Filter by type, unpublish to hide a site without deleting, or move it to Trash (restorable; child pages cascade).', icon: Trash2 },
    ],
    tips: [
      'Link-in-bio is one per creator — perfect for the single link in your social bio.',
      'Unpublish hides a site; Trash removes it — they are different actions.',
      'Payment links use the site ID in the URL, so they need no slug.',
      'Preview on both web and mobile in the editor before you publish.',
    ],
  },
  links: {
    title: 'Short links',
    intro: 'Create branded, trackable short links and see exactly what gets clicked.',
    home: 'Short Links',
    steps: [
      { title: 'Create a link', desc: 'Click Create link to open the builder right on the page, paste the destination URL, and give it a short, memorable code.', icon: Link2 },
      { title: 'Pick a code', desc: 'Type your own code and we check availability live with a preview of the final short link, or let one be generated for you.', icon: Hash },
      { title: 'Add rules (optional)', desc: 'Expand the Title & tags, UTM, Expiration, or Advanced sections to set an expiry date, a max-click limit, geo or device targeting, or a password gate.', icon: Clock },
      { title: 'Save it', desc: 'Use the Create link button in the save bar — or press ⌘/Ctrl + Enter — then Cancel or Back returns you to the list.', icon: Share2 },
      { title: 'Track clicks', desc: 'Open a link to see total clicks and analytics over time so you know what is working.', icon: BarChart2 },
    ],
    tips: [
      'Short, memorable codes get typed and shared more often.',
      'The builder opens inline — edits happen on the same page, no popup to lose your place.',
      'Use a different link per channel to compare what performs best.',
      'Set an expiry or max-clicks for time-limited drops.',
      'Password-gate a link when you only want certain people through.',
    ],
  },
  marketing: {
    title: 'Marketing tools',
    intro: 'Everything to grow your audience and boost sales, in one place.',
    home: 'Marketing',
    steps: [
      { title: 'Coupons', desc: 'Create discount codes with expiry dates and usage caps to drive urgency.', icon: Ticket },
      { title: 'Leads', desc: 'Collect emails captured from your sites and export them to your email tools.', icon: Users },
      { title: 'Affiliates', desc: 'Recruit partners who promote your products for a commission.', icon: Network },
      { title: 'Referrals', desc: 'Reward existing buyers for bringing in new customers.', icon: Gift },
      { title: 'Services', desc: 'Sell your time with bookable 1:1s, audits, or retainers.', icon: Calendar },
      { title: 'Community', desc: 'Post updates and keep your audience engaged around your brand.', icon: MessageCircle },
    ],
    tips: [
      'Start with a coupon to create urgency for a launch.',
      'Referrals and affiliates both turn other people into your growth channel.',
      'Capture leads early — an email list is an asset you own.',
    ],
  },
  coupons: {
    title: 'Coupons',
    intro: 'Create discount codes that create urgency and drive purchases.',
    home: 'Coupons',
    steps: [
      { title: 'Create a coupon', desc: 'Click New Coupon and enter a code, or generate a random one.', icon: Ticket },
      { title: 'Set the discount', desc: 'Choose a percentage off or a fixed ₹ amount off the cart.', icon: Percent },
      { title: 'Add limits', desc: 'Set an expiry date and a maximum number of redemptions.', icon: Clock },
      { title: 'Scope & activate', desc: 'Activate the coupon so it works at checkout. Pause it anytime — expired or maxed-out codes stop automatically.', icon: Zap },
      { title: 'Track usage', desc: 'Watch total, active, and redeemed counts to see which offers land.', icon: BarChart2 },
    ],
    tips: [
      'Percentage discounts feel bigger on cheap products; fixed amounts on pricey ones.',
      'Usage caps create scarcity — think "first 50 buyers".',
      'Short, upper-case codes like LAUNCH20 are easy to remember and type.',
      'Expired or maxed-out coupons stop working automatically — no cleanup needed.',
    ],
  },
  leads: {
    title: 'Leads',
    intro: 'Capture emails from your storefronts and turn visitors into an audience you own.',
    home: 'Leads',
    steps: [
      { title: 'Add a lead form', desc: 'Add a lead-capture block to a Link-in-bio or Single-page site so visitors can opt in.', icon: FileText },
      { title: 'Offer an incentive', desc: 'Give something in return — a freebie, discount, or early access — to boost signups.', icon: Gift },
      { title: 'Watch leads arrive', desc: 'Submissions appear here in real time as people subscribe.', icon: Users },
      { title: 'Filter by site', desc: 'Narrow the list to a single storefront to see where your leads come from.', icon: Filter },
      { title: 'Export', desc: 'Download leads as a CSV to import into your email or CRM tool.', icon: Download },
    ],
    tips: [
      'A freebie in exchange for an email dramatically boosts opt-ins.',
      'Export regularly to keep your email provider in sync.',
      'Filter by site to learn which page converts best.',
    ],
  },
  affiliates: {
    title: 'Affiliates',
    intro: 'Recruit partners to promote your products for a share of each sale.',
    home: 'Affiliates',
    steps: [
      { title: 'Add an affiliate', desc: 'Create an affiliate and set the commission rate they will earn.', icon: Network },
      { title: 'Share their link', desc: 'Give them their unique link — sales through it are attributed to them.', icon: Share2 },
      { title: 'Track performance', desc: 'See clicks, conversions, and commission owed per affiliate.', icon: BarChart2 },
      { title: 'Pay & manage', desc: 'Adjust rates, pause affiliates, or settle what you owe them.', icon: IndianRupee },
    ],
    tips: [
      'Higher commissions attract more motivated promoters.',
      'Recruit affiliates who already reach your target audience.',
      'Give affiliates ready-made assets so they can promote fast.',
    ],
  },
  referrals: {
    title: 'Referral program',
    intro: 'Reward customers for bringing in new buyers.',
    home: 'Referrals',
    steps: [
      { title: 'Create a code', desc: 'Generate a referral code, or let one be created for you.', icon: Gift },
      { title: 'Set the reward', desc: 'Set the reward given for each successful referral.', icon: Percent },
      { title: 'Share', desc: 'Buyers share their code; new customers who use it convert into sales.', icon: Share2 },
      { title: 'Track redemptions', desc: 'View per-code analytics and exactly who redeemed.', icon: BarChart2 },
      { title: 'Toggle & manage', desc: 'Activate, pause, or delete codes as your campaigns change.', icon: Zap },
    ],
    tips: [
      'Promote referral codes right after a successful purchase — that is peak goodwill.',
      'A clear, simple reward converts better than a complicated one.',
      'Track per-code analytics to double down on your best advocates.',
    ],
  },
  services: {
    title: 'Services & bookings',
    intro: 'Sell your time — 1:1 calls, audits, or retainers — and manage bookings.',
    home: 'Services',
    steps: [
      { title: 'Create a service', desc: 'Add a service — a 1:1 call, audit, or retainer — with a title, type, and price.', icon: Calendar },
      { title: 'Describe the scope', desc: 'Spell out what is included and how long it takes so clients know what they get.', icon: FileText },
      { title: 'Publish it', desc: 'Activate the service so clients can request a booking.', icon: Zap },
      { title: 'Manage bookings', desc: 'Review incoming requests and move each one through its status.', icon: ClipboardList },
      { title: 'Deliver & complete', desc: 'Mark bookings complete as you finish, keeping your pipeline clean.', icon: CheckCircle },
    ],
    tips: [
      'Clear scope and duration cut down on back-and-forth with clients.',
      'Retainers create predictable, recurring income.',
      'Price by outcome, not just hours, wherever you can.',
    ],
  },
  community: {
    title: 'Community',
    intro: 'Post updates and keep the audience around your brand engaged.',
    home: 'Community',
    steps: [
      { title: 'Create a post', desc: 'Share an update, tip, or announcement with your audience.', icon: MessageCircle },
      { title: 'Engage', desc: 'Buyers react to your posts — reply and keep the conversation going.', icon: Heart },
      { title: 'Post consistently', desc: 'A steady rhythm keeps your audience warm between launches.', icon: Calendar },
      { title: 'Moderate', desc: 'Remove posts you no longer want shown to keep the feed on-brand.', icon: Trash2 },
    ],
    tips: [
      'Post consistently to stay top-of-mind between launches.',
      'Tease launches here before they go live to build anticipation.',
      'Ask questions — engagement compounds when people reply.',
    ],
  },
};
