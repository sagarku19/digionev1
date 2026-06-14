'use client';
import React, { useState } from 'react';
import type { BlockRendererProps } from './_shared';
import { getRadiusClass } from './_shared';

export default function LeadFormBlock({ link, bio, palette, siteId, animStyle }: BlockRendererProps) {
  const fields: { type: string; label: string; required: boolean; placeholder: string }[] =
    link.metadata?.fields ?? [{ type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' }];
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields (keyed by index)
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (f.required && !values[String(i)]?.trim()) {
        setError(`${f.label} is required`);
        return;
      }
    }
    // Email validation
    const emailIdx = fields.findIndex(f => f.type === 'email');
    if (emailIdx >= 0 && values[String(emailIdx)] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[String(emailIdx)])) {
      setError('Please enter a valid email');
      return;
    }

    // Build field values
    let name = '', email = '', mobile = '';
    const custom: Record<string, string> = {};
    fields.forEach((f, i) => {
      const val = (values[String(i)] || '').trim();
      if (f.type === 'name') name = val;
      else if (f.type === 'email') email = val;
      else if (f.type === 'mobile') mobile = val;
      else if (val) custom[f.label] = val;
    });

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: link.metadata?.form_id,
          siteId,
          name: name || null,
          email: email || null,
          mobile: mobile || null,
          custom: Object.keys(custom).length > 0 ? custom : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Submission failed');
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const pri = palette.primary || '#EC4899';
  const txt = palette.text || '#0F172A';
  const muted = palette.muted || '#64748B';

  if (submitted) {
    return (
      <div className="w-full col-span-2" style={animStyle}>
        <div className={`${getRadiusClass(bio.border_radius ?? '')} border-2 p-5 text-center`}
          style={{ borderColor: `${pri}30`, backgroundColor: `${pri}08` }}>
          <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: `${pri}15` }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={pri} strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: txt }}>
            {link.metadata?.success_message || 'Thanks! We\'ll be in touch.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full col-span-2" style={animStyle}>
      <form onSubmit={handleSubmit}
        className={`${getRadiusClass(bio.border_radius ?? '')} border-2 p-4 space-y-3`}
        style={{ borderColor: `${pri}30`, backgroundColor: `${pri}08` }}>
        {link.title && (
          <p className="text-sm font-semibold" style={{ color: txt }}>{link.title}</p>
        )}
        {link.metadata?.description && (
          <p className="text-xs" style={{ color: muted }}>{link.metadata.description}</p>
        )}
        {fields.map((f, i) => (
          <div key={i} className="space-y-1">
            <label className="text-xs font-medium flex items-center gap-0.5" style={{ color: txt }}>
              {f.label}{f.required && <span style={{ color: pri }}>*</span>}
            </label>
            <input
              type={f.type === 'email' ? 'email' : f.type === 'mobile' ? 'tel' : 'text'}
              required={f.required}
              placeholder={f.placeholder || f.label}
              value={values[String(i)] || ''}
              onChange={e => setValues(prev => ({ ...prev, [String(i)]: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition focus:ring-2"
              style={{
                borderColor: `${txt}20`,
                color: txt,
                backgroundColor: 'transparent',
              }}
            />
          </div>
        ))}
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: pri }}>
          {submitting ? 'Submitting...' : (link.metadata?.button_text || 'Submit')}
        </button>
      </form>
    </div>
  );
}
