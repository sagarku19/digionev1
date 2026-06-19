'use client';

import React from 'react';
import { User, MessageSquare, HelpCircle, Plus, X, Star } from 'lucide-react';
import type { SinglePageContentData } from './singlepage-types';
import { INPUT, FieldLabel, SectionCard } from './_shared';

export type { SinglePageContentData };

interface Props {
  data: SinglePageContentData;
  onChange: (d: SinglePageContentData) => void;
}

export default function SinglePageTrustEditor({ data, onChange }: Props) {
  const cp = data.creatorProfile;

  return (
    <div className="space-y-6">

      {/* ── About the Creator ── */}
      <SectionCard icon={User} title="About the Creator" desc="Put a face to the product. Show your authority and build trust." color="amber">
        <div className="flex gap-4 items-start">
          {cp.avatarUrl ? (
            <div className="relative group shrink-0">
              <img src={cp.avatarUrl} alt="Creator avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border)] shadow-md" />
              <button
                onClick={() => onChange({ ...data, creatorProfile: { ...cp, avatarUrl: '' } })}
                className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--danger)] rounded-full text-[var(--text-on-brand)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-[var(--surface-muted)] flex items-center justify-center shrink-0 border-2 border-dashed border-[var(--border)]">
              <User className="w-8 h-8 text-[var(--text-tertiary)]" />
            </div>
          )}
          <div className="flex-1 space-y-3">
            <div>
              <FieldLabel>Avatar URL</FieldLabel>
              <input
                type="url"
                value={cp.avatarUrl}
                onChange={e => onChange({ ...data, creatorProfile: { ...cp, avatarUrl: e.target.value } })}
                className={INPUT}
                placeholder="https://..."
              />
            </div>
            <div>
              <FieldLabel>Your Name</FieldLabel>
              <input
                type="text"
                value={cp.name}
                onChange={e => onChange({ ...data, creatorProfile: { ...cp, name: e.target.value } })}
                className={INPUT}
                placeholder="e.g. Rahul Sharma"
              />
            </div>
          </div>
        </div>
        <div>
          <FieldLabel>Short Bio</FieldLabel>
          <textarea
            rows={3}
            value={cp.bio}
            onChange={e => onChange({ ...data, creatorProfile: { ...cp, bio: e.target.value } })}
            className={`${INPUT} resize-none`}
            placeholder="I'm a designer with 10+ years of experience and I built this course to..."
          />
        </div>
      </SectionCard>

      {/* ── Testimonials ── */}
      <SectionCard icon={MessageSquare} title="Testimonials" desc="Social proof from happy customers. Avatars are optional." color="rose">
        <div className="space-y-4">
          {data.testimonials.map((t, i) => (
            <div key={i} className="p-4 bg-[var(--surface-muted)] rounded-2xl border border-[var(--border)] group relative">
              <button
                onClick={() => onChange({ ...data, testimonials: data.testimonials.filter((_, idx) => idx !== i) })}
                className="absolute top-3 right-3 p-1.5 text-[var(--text-tertiary)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-[var(--danger-bg)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-start gap-3 mb-3">
                {/* Star rating display */}
                <div className="flex gap-0.5 pt-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Name</FieldLabel>
                    <input
                      type="text"
                      value={t.name}
                      onChange={e => onChange({ ...data, testimonials: data.testimonials.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) })}
                      className={INPUT}
                      placeholder="Priya Kapoor"
                    />
                  </div>
                  <div>
                    <FieldLabel>Role / Company</FieldLabel>
                    <input
                      type="text"
                      value={t.role}
                      onChange={e => onChange({ ...data, testimonials: data.testimonials.map((x, idx) => idx === i ? { ...x, role: e.target.value } : x) })}
                      className={INPUT}
                      placeholder="Freelance Designer"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Avatar URL (optional)</FieldLabel>
                  <input
                    type="url"
                    value={t.avatarUrl ?? ''}
                    onChange={e => onChange({ ...data, testimonials: data.testimonials.map((x, idx) => idx === i ? { ...x, avatarUrl: e.target.value } : x) })}
                    className={INPUT}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <FieldLabel>Quote</FieldLabel>
                  <textarea
                    rows={2}
                    value={t.text}
                    onChange={e => onChange({ ...data, testimonials: data.testimonials.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x) })}
                    className={`${INPUT} resize-none`}
                    placeholder="This course completely transformed how I approach design..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => onChange({ ...data, testimonials: [...data.testimonials, { name: '', role: '', text: '', avatarUrl: '' }] })}
          className="flex items-center justify-center w-full gap-2 py-3 border border-dashed border-[var(--border)] rounded-2xl text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)] hover:border-[var(--brand)]/40 hover:bg-[var(--surface-hover)] transition-all"
        >
          <Plus className="w-4 h-4" /> Add Testimonial
        </button>
      </SectionCard>

      {/* ── FAQ ── */}
      <SectionCard icon={HelpCircle} title="FAQ" desc="Answer common objections before they arise." color="amber">
        <div className="space-y-4">
          {data.faqs.map((faq, i) => (
            <div key={i} className="p-4 bg-[var(--surface-muted)] rounded-2xl border border-[var(--border)] group relative">
              <button
                onClick={() => onChange({ ...data, faqs: data.faqs.filter((_, idx) => idx !== i) })}
                className="absolute top-3 right-3 p-1.5 text-[var(--text-tertiary)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-[var(--danger-bg)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="space-y-3">
                <div>
                  <FieldLabel>Question</FieldLabel>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={e => onChange({ ...data, faqs: data.faqs.map((f, idx) => idx === i ? { ...f, question: e.target.value } : f) })}
                    className={INPUT}
                    placeholder="e.g. Do I get lifetime access?"
                  />
                </div>
                <div>
                  <FieldLabel>Answer</FieldLabel>
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={e => onChange({ ...data, faqs: data.faqs.map((f, idx) => idx === i ? { ...f, answer: e.target.value } : f) })}
                    className={`${INPUT} resize-none`}
                    placeholder="Yes, once purchased, you get lifetime access."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => onChange({ ...data, faqs: [...data.faqs, { question: '', answer: '' }] })}
          className="flex items-center justify-center w-full gap-2 py-3 border border-dashed border-[var(--border)] rounded-2xl text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)] hover:border-[var(--brand)]/40 hover:bg-[var(--surface-hover)] transition-all"
        >
          <Plus className="w-4 h-4" /> Add FAQ
        </button>
      </SectionCard>
    </div>
  );
}
