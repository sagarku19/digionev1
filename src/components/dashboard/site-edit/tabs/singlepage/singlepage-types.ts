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
  fakePrice?: number;
  features: { title: string; description: string; icon: string }[];
  whatsIncluded: string[];

  // Content blocks
  contentBlocks: ContentBlock[];

  // Trust & Social Proof
  creatorProfile: { name: string; avatarUrl: string; bio: string };
  faqs: { question: string; answer: string }[];
  testimonials: { name: string; role: string; text: string; avatarUrl?: string; rating?: number }[];

  // Logo & Header
  logoUrl: string;
  logoShape?: 'free' | 'circle' | 'square';
  headerText?: string;
  headerAlignment: 'left' | 'center' | 'right';
  showLogo: boolean;
  headerStyle: 'minimal' | 'standard' | 'bold';
  logoPlacement?: 'top-bar' | 'above-hero' | 'inline-hero' | 'floating';
  logoHeaderGap?: 'none' | 'sm' | 'md' | 'lg';
  headerDivider?: boolean;
  headerWidth?: 'sm' | 'md' | 'lg' | 'full';

  // Social
  socialLinks: { platform: string; url: string }[];
  socialDisplayStyle?: 'icons-only' | 'icons-labels' | 'pills';
  socialPosition?: 'header' | 'footer' | 'both';

  // Checkout
  checkoutStyle: 'embedded' | 'redirect' | 'modal';
  checkoutAlignment: 'left' | 'center' | 'right';
  ctaText: string;
  ctaSubtext: string;
  ctaButtonStyle?: 'solid' | 'gradient' | 'outline' | 'glow';
  ctaButtonSize?: 'sm' | 'md' | 'lg' | 'xl';
  showTrustBadges?: boolean;
  trustBadges?: string[];
  showPaymentIcons?: boolean;

  // Advanced
  customCss: string;
  customJs: string;
  customHeadTags?: string;
  contactEmail: string;
  contactMobile: string;
  contactWhatsApp?: string;
  redirectAfterPurchase?: string;
  passwordProtection?: boolean;
  pagePassword?: string;
  analyticsGoogleId?: string;
  analyticsFbPixelId?: string;
};

export type ContentBlock = {
  id: string;
  type: 'text' | 'heading' | 'image' | 'iframe' | 'divider' | 'html' | 'video' | 'button' | 'spacer' | 'quote';
  content: string;
  metadata?: Record<string, any>;
};
