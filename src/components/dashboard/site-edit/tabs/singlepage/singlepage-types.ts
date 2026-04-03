export type SinglePageContentData = {
  // Hero & Media
  title: string;
  description: string;
  heroImage: string;
  videoUrl: string;
  stats: { label: string; value: string }[];

  // Product & Features
  productId: string | null;
  upsellProductIds: string[];
  features: { title: string; description: string; icon: string }[];
  whatsIncluded: string[];

  // Content blocks
  contentBlocks: ContentBlock[];

  // Trust & Social Proof
  creatorProfile: { name: string; avatarUrl: string; bio: string };
  faqs: { question: string; answer: string }[];
  testimonials: { name: string; role: string; text: string; avatarUrl?: string }[];

  // Logo & Header
  logoUrl: string;
  headerAlignment: 'left' | 'center' | 'right';
  showLogo: boolean;
  headerStyle: 'minimal' | 'standard' | 'bold';

  // Social
  socialLinks: { platform: string; url: string }[];

  // Checkout
  checkoutStyle: 'embedded' | 'redirect' | 'modal';
  checkoutAlignment: 'left' | 'center' | 'right';
  ctaText: string;
  ctaSubtext: string;

  // Advanced
  customCss: string;
  customJs: string;
  contactEmail: string;
  contactMobile: string;
};

export type ContentBlock = {
  id: string;
  type: 'text' | 'heading' | 'image' | 'iframe' | 'divider' | 'html';
  content: string;
  metadata?: Record<string, any>;
};
