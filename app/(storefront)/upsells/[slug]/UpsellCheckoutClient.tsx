'use client';

import { useState } from 'react';
import { ShoppingCart, Shield, Check, Plus, Minus, Package, Mail, Phone, User, Loader2 } from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  metadata: any;
};

type UpsellConfig = {
  logo_url?: string;
  buy_now_label?: string;
  contact_fields?: { show_email?: boolean; show_phone?: boolean; show_name?: boolean };
  theme?: { primary_color?: string; bg_color?: string; text_color?: string };
  show_guarantee_badge?: boolean;
};

type Props = {
  page: { id: string; title: string; slug: string; config: UpsellConfig };
  primaryProduct: Product;
  upsellProducts: Product[];
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
}

export default function UpsellCheckoutClient({ page, primaryProduct, upsellProducts }: Props) {
  const { config } = page;
  const contactFields = config.contact_fields ?? { show_email: true, show_phone: false, show_name: true };
  const buyNowLabel = config.buy_now_label || 'Buy Now';
  const showGuarantee = config.show_guarantee_badge !== false;

  const [selectedUpsells, setSelectedUpsells] = useState<Set<string>>(new Set());
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleUpsell = (id: string) => {
    setSelectedUpsells(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedUpsellProducts = upsellProducts.filter(p => selectedUpsells.has(p.id));
  const total = primaryProduct.price + selectedUpsellProducts.reduce((sum, p) => sum + p.price, 0);

  // "What's included" from product metadata
  const whatsIncluded: string[] = primaryProduct.metadata?.whats_included ?? [];

  const handleCheckout = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const items = [
        { id: primaryProduct.id, qty: 1 },
        ...selectedUpsellProducts.map(p => ({ id: p.id, qty: 1 })),
      ];
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          contact: contactInfo,
          upsellPageId: page.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');

      if (data.status === 'completed') {
        window.location.href = `/payment/status?order_id=${data.orderId}`;
      } else if (data.payment_session_id) {
        const cashfree = await load({
          mode: data.environment === 'production' ? 'production' : 'sandbox',
        });
        cashfree.checkout({
          paymentSessionId: data.payment_session_id,
          returnUrl: `${window.location.origin}/payment/status?order_id=${data.orderId}`,
        });
      } else {
        throw new Error('No payment session received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
      {/* Logo */}
      {config.logo_url && (
        <img
          src={config.logo_url}
          alt=""
          className="h-10 w-auto mb-8 object-contain"
        />
      )}

      <div className="w-full max-w-lg space-y-6">
        {/* Page Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-center" style={{ color: 'var(--upsell-text)' }}>
          {page.title}
        </h1>

        {/* Primary Product Card */}
        <div
          className="rounded-2xl overflow-hidden border-2"
          style={{ borderColor: 'var(--upsell-primary)' }}
        >
          {primaryProduct.thumbnail_url && (
            <div className="aspect-video w-full overflow-hidden bg-gray-100">
              <img
                src={primaryProduct.thumbnail_url}
                alt={primaryProduct.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--upsell-text)' }}>
                  {primaryProduct.name}
                </h2>
                {primaryProduct.description && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--upsell-text-muted)' }}>
                    {primaryProduct.description}
                  </p>
                )}
              </div>
              <span className="text-xl font-extrabold shrink-0" style={{ color: 'var(--upsell-primary)' }}>
                {primaryProduct.price === 0 ? 'Free' : formatPrice(primaryProduct.price)}
              </span>
            </div>

            {/* What's Included */}
            {whatsIncluded.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--upsell-text-muted)' }}>
                  What&apos;s included
                </p>
                <ul className="space-y-1.5">
                  {whatsIncluded.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--upsell-text)' }}>
                      <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--upsell-primary)' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Upsell Add-ons */}
        {upsellProducts.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--upsell-text-muted)' }}>
              Upgrade your order
            </p>
            {upsellProducts.map(product => {
              const selected = selectedUpsells.has(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleUpsell(product.id)}
                  className="w-full text-left rounded-xl border-2 p-4 transition-all"
                  style={{
                    borderColor: selected ? 'var(--upsell-primary)' : 'var(--upsell-border)',
                    backgroundColor: selected ? 'color-mix(in srgb, var(--upsell-primary) 6%, transparent)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox indicator */}
                    <div
                      className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        borderColor: selected ? 'var(--upsell-primary)' : 'var(--upsell-border)',
                        backgroundColor: selected ? 'var(--upsell-primary)' : 'transparent',
                      }}
                    >
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    {/* Thumbnail */}
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--upsell-text)' }}>
                        {product.name}
                      </p>
                      {product.description && (
                        <p className="text-xs truncate" style={{ color: 'var(--upsell-text-muted)' }}>
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <span className="font-bold text-sm shrink-0" style={{ color: selected ? 'var(--upsell-primary)' : 'var(--upsell-text)' }}>
                      {selected ? <Minus className="w-4 h-4 inline mr-1" /> : <Plus className="w-4 h-4 inline mr-1" />}
                      {product.price === 0 ? 'Free' : formatPrice(product.price)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Contact Fields */}
        {(contactFields.show_name || contactFields.show_email || contactFields.show_phone) && (
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--upsell-text-muted)' }}>
              Your details
            </p>
            <div className="space-y-2.5">
              {contactFields.show_name && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--upsell-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Your name"
                    value={contactInfo.name}
                    onChange={e => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-colors focus:ring-2"
                    style={{
                      borderColor: 'var(--upsell-border)',
                      color: 'var(--upsell-text)',
                      backgroundColor: 'transparent',
                    }}
                  />
                </div>
              )}
              {contactFields.show_email && (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--upsell-text-muted)' }} />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={contactInfo.email}
                    onChange={e => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-colors focus:ring-2"
                    style={{
                      borderColor: 'var(--upsell-border)',
                      color: 'var(--upsell-text)',
                      backgroundColor: 'transparent',
                    }}
                  />
                </div>
              )}
              {contactFields.show_phone && (
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--upsell-text-muted)' }} />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={contactInfo.phone}
                    onChange={e => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-colors focus:ring-2"
                    style={{
                      borderColor: 'var(--upsell-border)',
                      color: 'var(--upsell-text)',
                      backgroundColor: 'transparent',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Summary + CTA */}
        <div className="space-y-4 pt-2">
          {/* Total breakdown */}
          {selectedUpsellProducts.length > 0 && (
            <div
              className="rounded-xl border p-4 space-y-2 text-sm"
              style={{ borderColor: 'var(--upsell-border)' }}
            >
              <div className="flex justify-between" style={{ color: 'var(--upsell-text-muted)' }}>
                <span>{primaryProduct.name}</span>
                <span>{formatPrice(primaryProduct.price)}</span>
              </div>
              {selectedUpsellProducts.map(p => (
                <div key={p.id} className="flex justify-between" style={{ color: 'var(--upsell-text-muted)' }}>
                  <span>{p.name}</span>
                  <span>+ {formatPrice(p.price)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold" style={{ borderColor: 'var(--upsell-border)', color: 'var(--upsell-text)' }}>
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-xl">
              {error}
            </p>
          )}

          {/* Buy Now Button */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2.5 font-bold text-base text-white px-8 py-4 rounded-2xl shadow-lg transition-all hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'var(--upsell-primary)' }}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
            {isSubmitting
              ? 'Processing\u2026'
              : total === 0
                ? 'Get for Free'
                : `${buyNowLabel} \u2014 ${formatPrice(total)}`}
          </button>

          {/* Trust badges */}
          {showGuarantee && (
            <div className="flex items-center justify-center gap-5 pt-2">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--upsell-text-muted)' }}>
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                Secure checkout
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--upsell-text-muted)' }}>
                <Package className="w-3.5 h-3.5 text-blue-500" />
                Instant delivery
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs pt-4 pb-8" style={{ color: 'var(--upsell-text-muted)' }}>
          Powered by DigiOne
        </p>
      </div>
    </div>
  );
}
