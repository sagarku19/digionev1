'use client';
// Edit page: Single Page (Product Landing) — visual editor with content editing and live preview.

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import SiteVisualEditor from '@/components/dashboard/site-edit/SiteVisualEditor';
import {
  Layers, Search, Sparkles, Plus, X, HelpCircle, MessageSquare,
  Star, ImageIcon, Timer, ShoppingBag, Eye,
} from 'lucide-react';

const INPUT = 'w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/40 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm';

export default function EditSinglePagePage() {
  const params = useParams();
  const siteId = params.id as string;
  const supabase = createClient();
  const { products } = useProducts();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [whatsIncluded, setWhatsIncluded] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [testimonials, setTestimonials] = useState<{ name: string; role: string; text: string }[]>([]);
  const [showBuyNow, setShowBuyNow] = useState(true);
  const [showAddToCart, setShowAddToCart] = useState(true);
  const [enableReviews, setEnableReviews] = useState(false);
  const [countdownEnd, setCountdownEnd] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: sp } = await supabase
        .from('site_singlepage')
        .select('*')
        .eq('site_id', siteId)
        .maybeSingle();
      if (sp) {
        setTitle(sp.title ?? '');
        setDescription(sp.description ?? '');
        setProductId(sp.product_id ?? null);
        setHeroImage(sp.hero_image_url ?? '');
        setWhatsIncluded((sp.guarantee_badges as string[]) ?? []);
        setFaqs((sp.faq_items as any[]) ?? []);
        setTestimonials((sp.testimonials as any[]) ?? []);
        setShowBuyNow(sp.show_buy_now ?? true);
        setShowAddToCart(sp.show_add_to_cart ?? true);
        setEnableReviews(sp.enable_reviews ?? false);
        setCountdownEnd(sp.countdown_end_at ?? '');
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const handleTypeSave = async () => {
    const { data: existing } = await supabase.from('site_singlepage').select('site_id').eq('site_id', siteId).maybeSingle();
    const payload = {
      title, description, product_id: productId ?? '',
      hero_image_url: heroImage || null,
      guarantee_badges: whatsIncluded,
      faq_items: faqs, testimonials,
      show_buy_now: showBuyNow,
      show_add_to_cart: showAddToCart,
      enable_reviews: enableReviews,
      countdown_end_at: countdownEnd || null,
    };
    if (existing) {
      await supabase.from('site_singlepage').update(payload).eq('site_id', siteId);
    } else {
      await supabase.from('site_singlepage').insert({ site_id: siteId, ...payload });
    }
  };

  const filteredProducts = products.filter((p: any) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <SiteVisualEditor
      siteId={siteId}
      typeLabel="Single Page"
      typeIcon={Layers}
      typeIconColor="text-[var(--text-secondary)]"
      onTypeSave={handleTypeSave}
      showSlug={true}
    >
      {() => (
        <div className="space-y-5">
          {/* Page Info */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Page Info</h3>
              <p className="text-xs text-gray-500 mt-0.5">Title and description for your landing page</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Page Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className={INPUT} placeholder="e.g. Launch: Ultimate Design Course" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                <span className={`text-xs tabular-nums ${description.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>{description.length}/200</span>
              </div>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                className={`${INPUT} resize-none`} placeholder="Short pitch for your product..." />
            </div>
          </div>

          {/* Hero Image */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[var(--text-secondary)]" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Hero Image</h3>
            </div>
            <input type="url" value={heroImage} onChange={e => setHeroImage(e.target.value)}
              className={INPUT} placeholder="https://..." />
            {heroImage && (
              <img src={heroImage} alt="Hero preview" className="w-full h-32 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
            )}
          </div>

          {/* Linked Product */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[var(--text-secondary)]" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Linked Product</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder="Search your products..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400" />
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
              {filteredProducts.map((p: any) => (
                <button key={p.id} onClick={() => setProductId(productId === p.id ? null : p.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition text-sm ${
                    productId === p.id ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  } border-b border-gray-100 dark:border-gray-800 last:border-0`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${productId === p.id ? 'bg-[var(--bg-tertiary)]' : 'bg-gray-300'}`} />
                  <span className="text-gray-900 dark:text-white truncate">{p.name}</span>
                  {p.price > 0 && <span className="ml-auto text-xs text-gray-500">{'\u20B9'}{p.price}</span>}
                </button>
              ))}
              {products.length === 0 && <p className="text-sm text-gray-500 p-4 text-center">No products yet</p>}
            </div>
            {productId && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                <Sparkles className="w-3 h-3" />
                Linked: {products.find((p: any) => p.id === productId)?.name ?? 'Product'}
              </div>
            )}
          </div>

          {/* What's Included */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">What&apos;s Included</h3>
            </div>
            <div className="space-y-2">
              {whatsIncluded.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={item}
                    onChange={e => setWhatsIncluded(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                    className={`${INPUT} flex-1`} placeholder="e.g. 10 video modules" />
                  <button onClick={() => setWhatsIncluded(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setWhatsIncluded(prev => [...prev, ''])}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
          </div>

          {/* FAQ */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">FAQ</h3>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Q{i + 1}</span>
                    <button onClick={() => setFaqs(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  </div>
                  <input type="text" value={faq.question}
                    onChange={e => setFaqs(prev => prev.map((f, idx) => idx === i ? { ...f, question: e.target.value } : f))}
                    placeholder="Question" className={INPUT} />
                  <textarea rows={2} value={faq.answer}
                    onChange={e => setFaqs(prev => prev.map((f, idx) => idx === i ? { ...f, answer: e.target.value } : f))}
                    placeholder="Answer" className={`${INPUT} resize-none`} />
                </div>
              ))}
            </div>
            <button onClick={() => setFaqs(prev => [...prev, { question: '', answer: '' }])}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <Plus className="w-3.5 h-3.5" /> Add FAQ
            </button>
          </div>

          {/* Testimonials */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Testimonials</h3>
            </div>
            <div className="space-y-3">
              {testimonials.map((t, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Testimonial {i + 1}</span>
                    <button onClick={() => setTestimonials(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  </div>
                  <input type="text" value={t.name}
                    onChange={e => setTestimonials(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                    placeholder="Name" className={INPUT} />
                  <input type="text" value={t.role}
                    onChange={e => setTestimonials(prev => prev.map((x, idx) => idx === i ? { ...x, role: e.target.value } : x))}
                    placeholder="Role / Title" className={INPUT} />
                  <textarea rows={2} value={t.text}
                    onChange={e => setTestimonials(prev => prev.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x))}
                    placeholder="Quote" className={`${INPUT} resize-none`} />
                </div>
              ))}
            </div>
            <button onClick={() => setTestimonials(prev => [...prev, { name: '', role: '', text: '' }])}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
              <Plus className="w-3.5 h-3.5" /> Add testimonial
            </button>
          </div>

          {/* Options */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Options</h3>
            {[
              { key: 'showBuyNow', label: 'Show Buy Now', desc: 'Buy Now button on page', val: showBuyNow, set: setShowBuyNow },
              { key: 'showAddToCart', label: 'Add to Cart', desc: 'Add to Cart button', val: showAddToCart, set: setShowAddToCart },
              { key: 'enableReviews', label: 'Reviews', desc: 'Show customer reviews section', val: enableReviews, set: setEnableReviews },
            ].map(opt => (
              <div key={opt.key} className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input type="checkbox" className="sr-only peer" checked={opt.val} onChange={e => opt.set(e.target.checked)} />
                  <div className="w-10 h-[22px] bg-gray-300 dark:bg-gray-700 peer-checked:bg-[var(--bg-tertiary)] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-[18px] shadow-inner" />
                </label>
              </div>
            ))}
          </div>

          {/* Countdown Timer */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Countdown Timer</h3>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">End Date/Time</label>
              <input type="datetime-local" value={countdownEnd} onChange={e => setCountdownEnd(e.target.value)}
                className={INPUT} />
            </div>
            <p className="text-xs text-gray-400">Leave empty to hide the countdown timer.</p>
          </div>
        </div>
      )}
    </SiteVisualEditor>
  );
}
