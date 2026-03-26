// Route: /p/product/{productId} — Product detail page
// Shows full product details when clicking on a product from the main store
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStorefrontTheme } from '@/lib/storefront-theme';
import StorefrontHeader from '@/components/storefront/StorefrontHeader';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Shield, Package } from 'lucide-react';

export const revalidate = 60;

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
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

  const backPath = mainSite ? `/p/${mainSite.slug}` : '/';

  // Get additional images from the images JSON field
  const imageList = (product.images as string[] | null) ?? [];

  return (
    <div className="min-h-screen flex flex-col store-theme bg-[--creator-bg] text-[--creator-text]">
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <StorefrontHeader navConfig={nav} siteMain={main} />

      <main className="flex-1 w-full">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Back link */}
          <Link href={backPath} className="inline-flex items-center gap-1.5 text-sm text-[--creator-text-muted] hover:text-[--creator-primary] mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to store
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Product image */}
            <div className="space-y-3">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                {product.thumbnail_url ? (
                  <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                  </div>
                )}
              </div>
              {/* Additional images */}
              {imageList.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {imageList.slice(0, 4).map((img: string, i: number) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                      <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="flex flex-col">
              {product.category && (
                <span className="text-xs font-semibold text-[--creator-primary] uppercase tracking-widest mb-3">{product.category}</span>
              )}

              <h1 className="text-3xl font-extrabold text-[--creator-text] leading-tight mb-4">{product.name}</h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-extrabold text-[--creator-text]">
                  {product.price === 0 ? 'Free' : formatPrice(product.price)}
                </span>
              </div>

              {/* Description */}
              {product.description && (
                <div className="prose prose-gray dark:prose-invert max-w-none mb-8 text-[--creator-text-muted]">
                  <p className="whitespace-pre-line leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* CTA */}
              <div className="mt-auto space-y-3">
                <a
                  href={`/api/checkout?productId=${product.id}`}
                  className="flex items-center justify-center gap-2.5 w-full bg-[--creator-primary] text-white font-bold text-base px-8 py-4 rounded-2xl shadow-lg shadow-[--creator-primary]/20 hover:opacity-90 transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.price === 0 ? 'Get for Free' : `Buy Now - ${formatPrice(product.price)}`}
                </a>

                {product.product_link && (
                  <a
                    href={product.product_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full text-sm font-semibold text-[--creator-text-muted] border border-gray-200 dark:border-gray-700 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    View Demo
                  </a>
                )}
              </div>

              {/* Trust */}
              <div className="flex items-center gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1.5 text-xs text-[--creator-text-muted]">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Secure checkout
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[--creator-text-muted]">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  Instant delivery
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <StorefrontFooter navConfig={nav} siteMain={main} />
    </div>
  );
}
