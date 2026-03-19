import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 60; // 1 minute ISR

export default async function StorefrontProductPage({
  params,
}: {
  params: Promise<{ slug: string; childslug: string }>;
}) {
  const resolvedParams = await params;
  const { slug, childslug } = resolvedParams;
  const supabase = await createClient();

  // 1. Fetch the main site by slug
  const { data: mainSite } = await supabase
    .from('sites')
    .select('id, creator_id')
    .eq('slug', slug)
    .single();

  if (!mainSite) notFound();

  // 2. Fetch the child site (single product site) using the parent ID and childslug
  const { data: childSite } = await supabase
    .from('sites')
    .select('id, site_type')
    .eq('parent_site_id', mainSite.id)
    .eq('child_slug', childslug)
    .single();

  if (!childSite || childSite.site_type !== 'single') notFound();

  // 3. Fetch the single page content
  const { data: pageData } = await supabase
    .from('site_singlepage')
    .select('*')
    .eq('site_id', childSite.id)
    .single();

  if (!pageData) notFound();

  // 4. Fetch the actual product details for pricing, stock, etc.
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', pageData.product_id)
    .single();

  if (!product) notFound();

  // 5. Render standard high-converting product layout
  return (
    <div className="w-full bg-[--creator-bg] text-[--creator-text]">
      
      {/* Product Hero Setup */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Images/Preview */}
        <div className="flex flex-col gap-4">
          <div className="aspect-video lg:aspect-square w-full bg-[--creator-surface] rounded-2xl overflow-hidden border border-[--creator-border]">
             {pageData.hero_image_url || product.thumbnail_url ? (
               <img src={pageData.hero_image_url || product.thumbnail_url || undefined} alt={pageData.title} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-[--creator-text-muted]">No Preview Available</div>
             )}
          </div>
        </div>

        {/* Right: Copy & Buy Box */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{pageData.title}</h1>
          <p className="text-lg text-[--creator-text-muted] mb-8 leading-relaxed">
            {pageData.description || product.description}
          </p>

          <div className="bg-[--creator-surface] rounded-2xl p-6 md:p-8 border border-[--creator-border] shadow-lg mb-8">
            <div className="flex items-center justify-between mb-8">
              <span className="text-4xl font-extrabold text-[--creator-text]">₹{Number(product.price).toLocaleString('en-IN')}</span>
              {pageData.show_add_to_cart && (
                 <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-green-100 text-green-700 text-sm font-semibold dark:bg-green-900/30 dark:text-green-400">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                   In Stock
                 </span>
              )}
            </div>
            
            <div className="flex flex-col gap-4">
              {pageData.show_buy_now && (
                <button className="w-full py-4 rounded-xl bg-[--creator-primary] text-white font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  Buy Now
                </button>
              )}
              {pageData.show_add_to_cart && (
                <button className="w-full py-4 rounded-xl bg-[--creator-bg] text-[--creator-text] font-bold text-lg hover:bg-[--creator-surface] transition-colors border border-[--creator-border] flex items-center justify-center gap-2">
                  Add to Cart
                </button>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-[--creator-border] text-sm text-[--creator-text-muted] flex items-center justify-center gap-4">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
               Secure checkout powered by Cashfree
            </div>
          </div>
        </div>
      </section>

      {/* Product Content/Description Section */}
      <section className="w-full bg-[--creator-surface] border-t border-[--creator-border] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg dark:prose-invert" dangerouslySetInnerHTML={{ __html: product.content as string || '<p>Detailed product information will be shown here.</p>' }} />
      </section>

    </div>
  );
}
