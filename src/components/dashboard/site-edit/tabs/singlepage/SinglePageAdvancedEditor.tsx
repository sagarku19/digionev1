'use client';

import React from 'react';
import { Code, Mail, Phone, Terminal, MessageCircle, ExternalLink, FileCode } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-300';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{children}</label>;
}

function SectionCard({ icon: Icon, title, desc, color = 'purple', children }: { icon: React.ElementType; title: string; desc?: string; color?: string; children: React.ReactNode }) {
  const colors: Record<string, string> = { purple: 'text-purple-500', emerald: 'text-emerald-500', blue: 'text-blue-500', amber: 'text-amber-500' };
  return (
    <div className="bg-white dark:bg-[#151525] border border-gray-200/60 dark:border-gray-800/60 rounded-3xl p-6 space-y-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colors[color] ?? 'text-purple-500'}`} /> {title}
        </h3>
        {desc && <p className="text-[13px] text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SinglePageAdvancedEditor({
  data,
  onChange,
}: {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}) {
  return (
    <div className="space-y-6">

      {/* ── Contact Info ── */}
      <SectionCard icon={Mail} title="Contact Information" desc="Show your contact details on the landing page.">
        <div>
          <FieldLabel>Email Address</FieldLabel>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <input type="email" value={data.contactEmail || ''} onChange={e => onChange({ ...data, contactEmail: e.target.value })}
              className={`${INPUT} flex-1`} placeholder="hello@yoursite.com" />
          </div>
        </div>
        <div>
          <FieldLabel>Mobile Number</FieldLabel>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <input type="tel" value={data.contactMobile || ''} onChange={e => onChange({ ...data, contactMobile: e.target.value })}
              className={`${INPUT} flex-1`} placeholder="+91 98765 43210" />
          </div>
        </div>
        <div>
          <FieldLabel>WhatsApp Number</FieldLabel>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-gray-400 shrink-0" />
            <input type="tel" value={data.contactWhatsApp || ''} onChange={e => onChange({ ...data, contactWhatsApp: e.target.value })}
              className={`${INPUT} flex-1`} placeholder="+91 98765 43210" />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">If set, a floating WhatsApp button will appear on the page.</p>
        </div>
      </SectionCard>

      {/* ── Redirect After Purchase ── */}
      <SectionCard icon={ExternalLink} title="Post-Purchase Redirect" desc="Send buyers to a custom URL after successful payment." color="blue">
        <div>
          <FieldLabel>Redirect URL</FieldLabel>
          <input type="url" value={data.redirectAfterPurchase || ''} onChange={e => onChange({ ...data, redirectAfterPurchase: e.target.value })}
            className={INPUT} placeholder="https://yourdomain.com/thank-you" />
          <p className="text-[10px] text-gray-400 mt-1">Leave blank to use the default thank-you page.</p>
        </div>
      </SectionCard>

      {/* ── Custom Head Tags ── */}
      <SectionCard icon={FileCode} title="Custom Head Tags" desc="Inject meta tags, verification codes, or structured data into the page head." color="amber">
        <div>
          <FieldLabel>HTML Head Tags</FieldLabel>
          <textarea rows={5} value={data.customHeadTags || ''} onChange={e => onChange({ ...data, customHeadTags: e.target.value })}
            className={`${INPUT} resize-none font-mono text-xs`}
            placeholder={'<meta name="google-site-verification" content="..." />\n<script type="application/ld+json">...</script>'} />
          <p className="text-[10px] text-gray-400 mt-1">Tags are inserted into the &lt;head&gt; of your page.</p>
        </div>
      </SectionCard>

      {/* ── Custom CSS ── */}
      <SectionCard icon={Code} title="Custom CSS" desc="Add custom styles to override the default look.">
        <div>
          <FieldLabel>CSS Code</FieldLabel>
          <textarea rows={8} value={data.customCss || ''} onChange={e => onChange({ ...data, customCss: e.target.value })}
            className={`${INPUT} resize-none font-mono text-xs`}
            placeholder={`.my-page {\n  /* your custom styles */\n}`} />
          <p className="text-[10px] text-gray-400 mt-1.5">Styles are injected into the page head. Use with caution.</p>
        </div>
      </SectionCard>

      {/* ── Custom JS ── */}
      <SectionCard icon={Terminal} title="Custom JavaScript" desc="Add tracking scripts or custom behavior.">
        <div>
          <FieldLabel>JavaScript Code</FieldLabel>
          <textarea rows={8} value={data.customJs || ''} onChange={e => onChange({ ...data, customJs: e.target.value })}
            className={`${INPUT} resize-none font-mono text-xs`}
            placeholder={`// Analytics, pixels, etc.\nconsole.log('Page loaded');`} />
          <p className="text-[10px] text-amber-500 mt-1.5">Scripts run on page load. Test carefully before publishing.</p>
        </div>
      </SectionCard>

    </div>
  );
}
