// Route: /store/product/{productId} — Product detail page
// Shows full product details when clicking on a product from the main store
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStorefrontTheme } from '@/lib/storefront-theme';
import Link from 'next/link';
import { ArrowLeft, Shield, Package } from 'lucide-react';
import { BuyNowButton } from './BuyNowButton';

export const revalidate = 60;

function formatPrice(price: number) {
  // Manual string concatenation avoids browser vs server whitespace mismatches from Intl currency formatter
  const val = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(price);
  return `₹${val}`;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = await createClient();

  // Load product (only columns that exist in products table)
  const { data: product } = await supabase
    .from('products')
    .select('id, name, description, price, category, thumbnail_url, is_published, creator_id, product_link, images')
    .eq('id', productId)
    .eq('is_published', true)
    .maybeSingle();

  if (!product) notFound();

  // Find creator's main site for theming + back link
  const { data: mainSite } = await supabase
    .from('sites')
    .select('id, slug')
    .eq('creator_id', product.creator_id)
    .eq('site_type', 'main')
    .eq('is_active', true)
    .maybeSingle();

  // Theme from main site or fallback
  const siteIdForTheme = mainSite?.id;

  let themeCSS = '';
  let nav = null;
  let main = null;

  if (siteIdForTheme) {
    const theme = await getStorefrontTheme(siteIdForTheme);
    themeCSS = theme.themeCSS;
    nav = theme.nav;
    main = theme.main;
  } else {
    themeCSS = `
      :root {
        --creator-primary: #6366F1; --creator-secondary: #8B5CF6; --creator-accent: #EC4899;
        --creator-surface: #FFFFFF; --creator-text: #0F172A; --creator-text-muted: #64748B; --creator-bg: #FFFFFF;
      }
    `;
  }

  const backPath = mainSite ? `/store/${mainSite.slug}` : '/';

  // Get additional images from the images JSON field
  const imageList = (product.images as string[] | null) ?? [];

  return (
    <div className="min-h-screen flex flex-col store-theme bg-[--creator-bg] text-[--creator-text]">
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />

      <main className="flex-1 w-full bg-gradient-to-b from-[--creator-bg] to-[--creator-bg] pt-4 pb-24 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-[--creator-primary] opacity-[0.03] blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
          {/* Back link */}
          <Link href={backPath} className="inline-flex items-center gap-2 text-sm font-bold text-[--creator-text-muted] hover:text-[--creator-primary] mb-8 sm:mb-12 transition-all bg-[--creator-surface] px-4 py-2.5 rounded-full border border-[--creator-text]/5 shadow-sm hover:shadow-md hover:-translate-y-0.5">
            <ArrowLeft className="w-4 h-4" /> Back to store
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-16 items-start">
            
            {/* Left Column: Images & Description */}
            <div className="space-y-10">
              {/* Main Media Gallery */}
              <div className="space-y-4">
                <div className="relative aspect-square sm:aspect-[4/3] rounded-[32px] overflow-hidden bg-[--creator-surface] border border-[--creator-text]/5 shadow-[0_20px_60px_rgba(0,0,0,0.06)] group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
                  {product.thumbnail_url ? (
                    <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/50 dark:bg-zinc-900/50">
                      <Package className="w-20 h-20 text-gray-300 dark:text-gray-700 mb-4" />
                      <span className="text-sm font-semibold text-gray-400">No preview available</span>
                    </div>
                  )}
                </div>
                
                {/* Thumbnails */}
                {imageList.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 sm:gap-4">
                    {/* The main thumbnail itself as a button to preview */}
                    <div className="aspect-square rounded-[20px] overflow-hidden border-2 border-[--creator-primary] cursor-pointer shadow-md">
                        {product.thumbnail_url ? <img src={product.thumbnail_url} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100" />}
                    </div>
                    {imageList.slice(0, 4).map((img: string, i: number) => (
                      <div key={i} className="aspect-square rounded-[20px] overflow-hidden border border-[--creator-text]/10 cursor-pointer hover:border-[--creator-primary]/50 hover:shadow-lg hover:-translate-y-0.5 transition-all opacity-70 hover:opacity-100 bg-[--creator-surface]">
                        <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Description (Mobile/General flow) */}
              <div className="bg-[--creator-surface] rounded-[32px] p-8 sm:p-12 border border-[--creator-text]/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-[--creator-primary]" />
                
                {product.category && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[--creator-primary]/10 text-[--creator-primary] text-xs font-black uppercase tracking-widest mb-6">
                    {product.category}
                  </div>
                )}
                
                <h1 className="text-3xl sm:text-5xl font-extrabold text-[--creator-text] leading-[1.15] mb-8 tracking-tight">{product.name}</h1>
                
                {product.description ? (
                  <div className="prose prose-lg dark:prose-invert prose-headings:text-[--creator-text] prose-p:text-[--creator-text-muted] prose-a:text-[--creator-primary] hover:prose-a:text-[--creator-primary]/80 max-w-none text-[--creator-text-muted]">
                    <p className="whitespace-pre-line leading-relaxed">{product.description}</p>
                  </div>
                ) : (
                  <div className="text-[--creator-text-muted] italic">No detailed description provided.</div>
                )}
              </div>
            </div>

            {/* Right Column: Sticky Checkout Card */}
            <div className="relative">
              <div className="sticky top-10 bg-[--creator-surface] rounded-[32px] p-8 sm:p-10 border border-[--creator-text]/10 shadow-[0_16px_60px_rgba(0,0,0,0.08)] overflow-hidden">
                
                {/* Accent Header */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[--creator-primary] to-[--creator-secondary]" />

                <div className="mb-10 text-center sm:text-left">
                  <span className="block text-[11px] font-black text-[--creator-text-muted] uppercase tracking-[0.2em] mb-3">Total Price</span>
                  <div suppressHydrationWarning className="text-5xl sm:text-[64px] font-black text-[--creator-text] tracking-tighter leading-none">
                    {product.price === 0 ? 'Free' : formatPrice(product.price)}
                  </div>
                </div>

                <div className="space-y-4">
                  <BuyNowButton
                    productId={product.id}
                    price={product.price}
                    label={product.price === 0 ? 'Get Access Now' : `Checkout ${formatPrice(product.price)}`}
                  />

                  {product.product_link && (
                    <a
                      href={product.product_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-center w-full text-sm font-bold text-[--creator-text] bg-[--creator-bg] border-2 border-[--creator-text]/10 py-4 mt-2 rounded-2xl hover:border-[--creator-text]/30 hover:shadow-sm hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                    >
                      Preview / Live Demo
                    </a>
                  )}
                </div>

                {/* Trust Badges */}
                <div className="mt-10 pt-8 border-t border-[--creator-text]/10 grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center p-4 bg-[--creator-bg] rounded-2xl border border-[--creator-text]/5 text-center gap-3 shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-[--creator-text-muted]">Secure<br/>Checkout</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-[--creator-bg] rounded-2xl border border-[--creator-text]/5 text-center gap-3 shadow-inner">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-[--creator-text-muted]">Instant<br/>Delivery</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
