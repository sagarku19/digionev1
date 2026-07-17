'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Package, Share2, Heart, Star,
  Clock, Shield, ArrowRight, Check,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Rails } from '@/src/components/marketing/Ledger';
import { productCategoryLabel } from '@/lib/shared/product-categories';
import { DiscoverCard } from '@/components/marketing/DiscoverCard';
import { AddToCartButton } from '@/components/store/AddToCartButton';

interface RelatedProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  thumbnail_url: string | null;
  creator_id: string;
}

function formatPrice(price: number) {
  if (price === 0) return 'Free';
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(price)}`;
}

/* Mono kicker row — `>>` + label + flexing hairline (matches the discover list). */
function SectionKicker({ label, href }: { label: string; href?: string }) {
  return (
    <div className="flex items-center gap-4 font-ledger text-[11px] mb-6">
      <span className="text-[#E83A2E] font-semibold">{'>>'}</span>
      <span className="text-black/35 uppercase tracking-[0.18em]">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-black/[0.07]" />
      {href && (
        <Link href={href} className="font-sans text-[12px] text-black/45 hover:text-[#16130F] font-semibold flex items-center gap-1 transition-colors">
          Browse all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function DiscoverProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data, isLoading: loading, isError } = useQuery({
    queryKey: ['discover', 'product', productId ?? null],
    enabled: !!productId,
    queryFn: async () => {
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          id, name, description, price, category, thumbnail_url, images,
          content, creator_id, is_published, is_on_discover_page,
          post_purchase_instructions, product_link, created_at
        `)
        .eq('id', productId!)
        .eq('is_published', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      if (!product) throw new Error('Product not found');

      const { data: related } = await supabase
        .from('products')
        .select('id, name, description, price, category, thumbnail_url, creator_id')
        .eq('is_published', true)
        .eq('is_on_discover_page', true)
        .is('deleted_at', null)
        .neq('id', productId!)
        .or(`category.eq.${product.category},creator_id.eq.${product.creator_id}`)
        .limit(8);

      const { data: creatorProducts } = await supabase
        .from('products')
        .select('id, name, description, price, category, thumbnail_url, creator_id')
        .eq('creator_id', product.creator_id)
        .eq('is_published', true)
        .eq('is_on_discover_page', true)
        .is('deleted_at', null)
        .neq('id', productId!)
        .limit(4);

      return {
        product,
        related: (related ?? []) as RelatedProduct[],
        creatorProducts: (creatorProducts ?? []) as RelatedProduct[],
      };
    },
  });
  const product = data?.product ?? null;
  const related = data?.related ?? [];
  const creatorProducts = data?.creatorProducts ?? [];
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <section className="relative bg-white">
          <Rails className="pt-20 sm:pt-24">
            <div className="px-5 sm:px-10 lg:px-14 pt-5 pb-12">
              <div className="animate-pulse">
                <div className="h-3 w-40 bg-black/[0.05] rounded mb-10" />
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">
                  <div className="lg:col-span-3 space-y-4">
                    <div className="aspect-[16/10] bg-black/[0.05] rounded-xl" />
                    <div className="h-4 bg-black/[0.05] rounded w-1/3 mt-8" />
                    <div className="h-3 bg-black/[0.04] rounded w-full" />
                    <div className="h-3 bg-black/[0.04] rounded w-5/6" />
                  </div>
                  <div className="lg:col-span-2 space-y-5">
                    <div className="h-7 bg-black/[0.05] rounded w-3/4" />
                    <div className="h-10 bg-black/[0.05] rounded w-32" />
                    <div className="h-12 bg-black/[0.05] rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </Rails>
        </section>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-white">
        <section className="relative bg-white">
          <Rails className="pt-20 sm:pt-24">
            <div className="px-5 sm:px-10 lg:px-14 py-24 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-[#FAF8F6] border border-black/[0.07] flex items-center justify-center">
                <Package className="w-6 h-6 text-black/35" />
              </div>
              <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#16130F] mb-1">Product not found</h2>
              <p className="text-[13.5px] font-medium text-black/50 mb-7">This product may have been removed or is no longer available.</p>
              <Link href="/discover" className="inline-flex items-center gap-2 px-5 py-3 bg-[#E83A2E] hover:bg-[#C92F24] text-white rounded-lg text-[14px] font-semibold transition-colors">
                <ArrowRight className="w-4 h-4 rotate-180" /> Back to Discover
              </Link>
            </div>
          </Rails>
        </section>
      </div>
    );
  }

  const catLabel = productCategoryLabel(product.category);
  const allImages: string[] = [];
  if (product.thumbnail_url) allImages.push(product.thumbnail_url);
  if (Array.isArray(product.images)) {
    product.images.forEach((img: unknown) => {
      const url = typeof img === 'string' ? img : (img as { url?: string } | null)?.url;
      if (url && !allImages.includes(url)) allImages.push(url);
    });
  }

  const handleShare = async () => {
    try {
      await navigator.share({ title: product.name, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const PERKS = [
    { icon: Package, t: 'Instant Access', s: 'Delivered immediately after purchase' },
    { icon: Clock, t: 'Lifetime Access', s: 'Yours to keep, forever' },
    { icon: Shield, t: 'Secure Checkout', s: 'Safe & encrypted payment' },
    { icon: Star, t: 'Quality Guaranteed', s: 'Handpicked by DigiOne' },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden bg-white">
      {/* ── Main product ── */}
      <section className="relative bg-white">
        <Rails className="pt-20 sm:pt-24">
          <div className="px-5 sm:px-10 lg:px-14 pt-5 pb-12 sm:pb-16">
            {/* Breadcrumb */}
            <div className="font-ledger text-[11px] flex items-center gap-2 text-black/35 mb-6">
              <Link href="/discover" className="hover:text-[#16130F] transition-colors">/discover</Link>
              <span className="text-black/20">/</span>
              <span className="text-black/45">{catLabel.toLowerCase()}</span>
              <span className="text-black/20">/</span>
              <span className="text-[#16130F] truncate max-w-[220px]">{product.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">
              {/* Left: gallery + copy */}
              <div className="lg:col-span-3 space-y-5">
                <div className="aspect-[16/10] overflow-hidden rounded-xl border border-black/[0.07] bg-[#FAF8F6]">
                  {allImages.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={allImages[activeImage] || allImages[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-16 h-16 text-black/20" /></div>
                  )}
                </div>

                {allImages.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {allImages.map((img, i) => (
                      <button
                        key={i} onClick={() => setActiveImage(i)}
                        className={`w-20 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${activeImage === i ? 'border-[#E83A2E]' : 'border-black/[0.08] hover:border-black/[0.25]'}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {product.description && (
                  <div className="pt-6">
                    <h3 className="text-[17px] font-bold tracking-[-0.02em] text-[#16130F] mb-3">About this product</h3>
                    <div className="text-[15px] font-medium text-black/55 leading-relaxed whitespace-pre-wrap">{product.description}</div>
                  </div>
                )}

                <div className="pt-6">
                  <h3 className="text-[17px] font-bold tracking-[-0.02em] text-[#16130F] mb-4">What you get</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-l border-black/[0.07] rounded-xl overflow-hidden">
                    {PERKS.map((p) => (
                      <div key={p.t} className="flex items-start gap-3 p-4 border-b border-r border-black/[0.07] hover:bg-[#FAF8F6] transition-colors">
                        <p.icon className="w-[18px] h-[18px] text-[#E83A2E] mt-0.5 shrink-0" strokeWidth={1.8} />
                        <div>
                          <p className="text-[14px] font-semibold text-[#16130F]">{p.t}</p>
                          <p className="text-[12.5px] font-medium text-black/45 mt-0.5">{p.s}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: sticky buy panel */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-24 space-y-5">
                  <div>
                    <p className="font-ledger text-[10px] font-medium text-black/35 uppercase tracking-[0.18em]">{catLabel}</p>
                    <h1 className="mt-2 text-[28px] sm:text-[32px] font-bold tracking-[-0.03em] leading-[1.1] text-[#16130F]">{product.name}</h1>
                  </div>

                  <div className="flex items-baseline gap-3 pt-1">
                    <span className={`font-ledger text-[40px] font-semibold tracking-tight leading-none ${product.price === 0 ? 'text-[#E83A2E]' : 'text-[#16130F]'}`}>
                      {formatPrice(product.price)}
                    </span>
                    {product.price > 0 && <span className="text-[13px] font-medium text-black/40">one-time</span>}
                  </div>

                  <AddToCartButton
                    item={{
                      id: product.id,
                      title: product.name,
                      price: product.price ?? 0,
                      creatorId: product.creator_id,
                      coverImage: product.thumbnail_url,
                      slug: product.id,
                    }}
                    variant="primary"
                    className="w-full py-4 !text-[15px]"
                  />

                  {product.product_link && (
                    <a
                      href={product.product_link} target="_blank" rel="noopener noreferrer"
                      className="group flex items-center justify-center gap-2 w-full py-3 bg-white border border-black/[0.1] text-[#16130F] hover:border-black/[0.25] rounded-lg text-[14px] font-semibold transition-colors"
                    >
                      Open external link
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setLiked((l) => !l)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-[13.5px] font-semibold transition-colors ${liked ? 'bg-[#E83A2E]/[0.06] border-[#E83A2E]/30 text-[#E83A2E]' : 'bg-white border-black/[0.1] text-black/55 hover:border-black/[0.25] hover:text-[#16130F]'}`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? 'fill-[#E83A2E]' : ''}`} />
                      {liked ? 'Saved' : 'Save'}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white border border-black/[0.1] text-black/55 hover:border-black/[0.25] hover:text-[#16130F] text-[13.5px] font-semibold transition-colors"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>

                  <div className="border border-black/[0.07] rounded-xl divide-y divide-black/[0.06]">
                    {[
                      { icon: Shield, t: 'Secure payment powered by DigiOne', em: true },
                      { icon: Check, t: 'Instant digital delivery', em: false },
                      ...(product.created_at ? [{ icon: Clock, t: `Published ${new Date(product.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`, em: false }] : []),
                    ].map((r, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-black/55">
                        <r.icon className={`w-4 h-4 shrink-0 ${r.em ? 'text-emerald-600' : 'text-black/35'}`} strokeWidth={1.8} />
                        <span>{r.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Rails>
      </section>

      {/* ── More from creator + related ── */}
      {(creatorProducts.length > 0 || related.length > 0) && (
        <section className="relative bg-white">
          <div aria-hidden="true" className="h-px w-full bg-black/[0.07]" />
          <Rails>
            <div className="px-5 sm:px-10 lg:px-14 py-12 sm:py-16 space-y-14">
              {creatorProducts.length > 0 && (
                <div>
                  <SectionKicker label="More from this creator" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {creatorProducts.slice(0, 3).map((p) => <DiscoverCard key={p.id} product={p} />)}
                  </div>
                </div>
              )}
              {related.length > 0 && (
                <div>
                  <SectionKicker label="You might also like" href="/discover" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {related.slice(0, 3).map((p) => <DiscoverCard key={p.id} product={p} />)}
                  </div>
                </div>
              )}
            </div>
          </Rails>
        </section>
      )}
    </div>
  );
}
