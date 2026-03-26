'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, BookOpen, Layout, Sparkles, Layers,
  ShoppingCart, ExternalLink, Share2, Heart, Star, User,
  Clock, Shield, ChevronRight,
} from 'lucide-react';

interface Creator {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  thumbnail_url: string | null;
  images: any;
  content: any;
  creator_id: string;
  product_link: string | null;
  post_purchase_instructions: string | null;
  created_at: string | null;
  profiles: Creator | Creator[] | null;
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  category: string | null;
  thumbnail_url: string | null;
  creator_id: string;
  profiles?: Creator | Creator[] | null;
}

const CATEGORIES: Record<string, { label: string; icon: React.ElementType }> = {
  digital: { label: 'Digital Download', icon: Package },
  course: { label: 'Course', icon: BookOpen },
  template: { label: 'Template', icon: Layout },
  other: { label: 'Digital Product', icon: Sparkles },
};

function getCreator(product: { profiles?: Creator | Creator[] | null }): Creator | null {
  if (!product.profiles) return null;
  if (Array.isArray(product.profiles)) return product.profiles[0] ?? null;
  return product.profiles;
}

function formatPrice(price: number) {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
}

export default function DiscoverProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [creatorProducts, setCreatorProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`/api/discover/${productId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setProduct(null);
        } else {
          setProduct(data.product);
          setRelated(data.related || []);
          setCreatorProducts(data.creatorProducts || []);
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-6 bg-white/[0.06] rounded-lg w-32" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="aspect-square bg-white/[0.04] rounded-2xl" />
              <div className="space-y-4">
                <div className="h-8 bg-white/[0.06] rounded-lg w-3/4" />
                <div className="h-4 bg-white/[0.04] rounded-lg w-1/2" />
                <div className="h-12 bg-white/[0.06] rounded-lg w-40" />
                <div className="space-y-2 pt-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-3 bg-white/[0.04] rounded-lg" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center">
            <Package className="w-7 h-7 text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Product Not Found</h2>
          <p className="text-slate-500 mb-6">This product may have been removed or is no longer available.</p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  const creator = getCreator(product);
  const catInfo = CATEGORIES[product.category || 'other'] || CATEGORIES.other;
  const CatIcon = catInfo.icon;
  const allImages: string[] = [];
  if (product.thumbnail_url) allImages.push(product.thumbnail_url);
  if (Array.isArray(product.images)) {
    product.images.forEach((img: any) => {
      const url = typeof img === 'string' ? img : img?.url;
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

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link href="/discover" className="text-slate-500 hover:text-white transition-colors">Discover</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-500">{catInfo.label}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-white truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">

          {/* Left: Images */}
          <div className="lg:col-span-3 space-y-4">
            {/* Main Image */}
            <div className="aspect-[16/10] bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden relative">
              {allImages.length > 0 ? (
                <img
                  src={allImages[activeImage] || allImages[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-slate-700" />
                </div>
              )}
            </div>

            {/* Thumbnail gallery */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImage === i ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="pt-6">
                <h3 className="text-lg font-bold text-white mb-3">About this product</h3>
                <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </div>
              </div>
            )}

            {/* What you get */}
            <div className="pt-6 space-y-4">
              <h3 className="text-lg font-bold text-white">What you get</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <Package className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Instant Access</p>
                    <p className="text-xs text-slate-500">Get the product immediately after purchase</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <Clock className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Lifetime Access</p>
                    <p className="text-xs text-slate-500">Access your purchase forever</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <Shield className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Secure Checkout</p>
                    <p className="text-xs text-slate-500">Safe & encrypted payment</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <Star className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Quality Guaranteed</p>
                    <p className="text-xs text-slate-500">Handpicked by DigiOne</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Product Info + Buy */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Category */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 text-xs font-medium">
                  <CatIcon className="w-3.5 h-3.5" />
                  {catInfo.label}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{product.name}</h1>

              {/* Creator */}
              {creator && (
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 overflow-hidden">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-bold">
                        {(creator.full_name || 'C').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{creator.full_name || 'Creator'}</p>
                    <p className="text-xs text-slate-500">DigiOne Creator</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-extrabold ${product.price === 0 ? 'text-emerald-400' : 'text-white'}`}>
                  {formatPrice(product.price)}
                </span>
                {product.price > 0 && (
                  <span className="text-sm text-slate-500">one-time payment</span>
                )}
              </div>

              {/* CTA Button */}
              {product.product_link ? (
                <a
                  href={product.product_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-base font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.price === 0 ? 'Get for Free' : `Buy Now — ${formatPrice(product.price)}`}
                </a>
              ) : (
                <button
                  className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-base font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.price === 0 ? 'Get for Free' : `Buy Now — ${formatPrice(product.price)}`}
                </button>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setLiked(l => !l)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    liked
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-red-400' : ''}`} />
                  {liked ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] text-sm font-medium transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>

              {/* Trust Signals */}
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Secure payment powered by DigiOne</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Package className="w-4 h-4 text-indigo-400" />
                  <span>Instant digital delivery</span>
                </div>
                {product.created_at && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Published {new Date(product.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* More from Creator */}
        {creator && creatorProducts.length > 0 && (
          <section className="mt-20 pt-12 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 overflow-hidden">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-bold">{(creator.full_name || 'C').charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">More from {creator.full_name || 'this creator'}</h2>
                  <p className="text-xs text-slate-500">Other products by this creator</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {creatorProducts.map(p => (
                <MiniProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-16 pt-12 border-t border-white/[0.06] pb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-white">You might also like</h2>
                <p className="text-xs text-slate-500 mt-1">Similar products you may be interested in</p>
              </div>
              <Link href="/discover" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
                Browse all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.slice(0, 4).map(p => (
                <MiniProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Mini Product Card ────────────────────────────────────────── */
function MiniProductCard({ product }: { product: RelatedProduct }) {
  const creator = product.profiles ? getCreator(product as any) : null;
  const catLabel = CATEGORIES[product.category || 'other']?.label || 'Digital';

  return (
    <Link
      href={`/discover/${product.id}`}
      className="group flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-white/[0.03]">
        {product.thumbnail_url ? (
          <img
            src={product.thumbnail_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-slate-700" />
          </div>
        )}
        <div className="absolute bottom-2 right-2">
          <span className={`px-2 py-0.5 backdrop-blur-md text-xs font-bold rounded-md ${
            product.price === 0 ? 'bg-emerald-500/80 text-white' : 'bg-black/60 text-white'
          }`}>
            {formatPrice(product.price)}
          </span>
        </div>
      </div>
      <div className="p-3.5">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">{catLabel}</p>
        <h4 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">
          {product.name}
        </h4>
        {creator && (
          <p className="text-xs text-slate-500 mt-2 truncate">by {creator.full_name || 'Creator'}</p>
        )}
      </div>
    </Link>
  );
}
