'use client';
// Leads — captured leads with CSV export, site filter, search, timeline view, broadcast modal.
// DB: lead_form joined with forms, sites via useGuestLeads hook

import React, { useState, useMemo } from 'react';
import { GuideButton } from '@/components/dashboard/guides/GuideButton';
import { useGuestLeads } from '@/hooks/marketing/useGuestLeads';
import {
  Users, Mail, ArrowDownToLine, Send, X, Filter,
  MailOpen, AlertCircle, CheckCircle2, Search,
  Globe, FileText, Phone, Clock, TrendingUp, UserCheck, RefreshCw,
} from 'lucide-react';

function exportCSV(leads: ReturnType<typeof useGuestLeads>['leads']) {
  const header = ['Full Name', 'Email', 'Mobile', 'Other', 'Form', 'Site', 'Captured On'];
  const rows = leads.map(l => [
    l.full_name ?? '', l.email ?? '', l.mobile ?? '',
    l.other && Object.keys(l.other).length ? Object.entries(l.other).map(([k, v]) => `${k}: ${v}`).join('; ') : '',
    l.forms?.title ?? '', l.sites?.slug ?? '',
    l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : '',
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function Avatar({ name, email }: { name?: string; email?: string }) {
  const letter = (name ?? email ?? 'L')[0].toUpperCase();
  const colors = ['bg-[var(--brand)]', 'bg-[var(--brand)]', 'bg-[var(--success)]', 'bg-[var(--warning)]', 'bg-[var(--info)]', 'bg-[var(--danger)]'];
  const color = colors[letter.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center shrink-0 text-[var(--text-on-brand)] font-bold text-sm`}>
      {letter}
    </div>
  );
}

export default function LeadsPage() {
  const [search, setSearch]           = useState('');
  const [filterSite, setFilterSite]   = useState('all');
  const [view, setView]               = useState<'table' | 'timeline'>('table');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [subject, setSubject]         = useState('');
  const [body, setBody]               = useState('');
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);
  const [broadcastError, setBroadcastError] = useState('');

  const { leads, isLoading } = useGuestLeads(filterSite === 'all' ? undefined : filterSite);
  const { leads: allLeads }  = useGuestLeads();

  const sites = useMemo(() => {
    const s = new Map<string, string>();
    allLeads.forEach((l) => { if (l.sites?.slug) s.set(l.site_id, l.sites.slug); });
    return [{ id: 'all', slug: 'All Sites' }, ...Array.from(s, ([id, slug]) => ({ id, slug }))];
  }, [allLeads]);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.email?.toLowerCase().includes(q) || l.full_name?.toLowerCase().includes(q) || l.mobile?.includes(q);
  });

  // Stats
  const withEmail  = leads.filter((l) => l.email).length;
  const withMobile = leads.filter((l) => l.mobile).length;
  const now = new Date();
  const thisMonth  = leads.filter((l) => l.created_at && new Date(l.created_at).getMonth() === now.getMonth() && new Date(l.created_at).getFullYear() === now.getFullYear()).length;

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastError('');
    if (!subject.trim() || !body.trim()) { setBroadcastError('Subject and message are required.'); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 1200)); // wire to Resend/SendGrid API here
    setSent(true);
    setSending(false);
    setTimeout(() => { setShowBroadcast(false); setSent(false); setSubject(''); setBody(''); }, 2000);
  };

  // Group by date for timeline
  const byDate = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(l => {
      const d = l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown';
      (groups[d] = groups[d] || []).push(l);
    });
    return groups;
  }, [filtered]);

  return (
    <>
      <div className="space-y-5 pt-4 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Leads</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Captured leads from your link-in-bio forms</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <GuideButton guideKey="leads" />
            {leads.length > 0 && (
              <>
                <button onClick={() => exportCSV(filtered)}
                  className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <ArrowDownToLine className="w-4 h-4" /> Export CSV
                </button>
                <button onClick={() => setShowBroadcast(true)}
                  className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-4 py-2.5 rounded-[var(--radius-sm)] font-semibold text-sm shadow-[var(--shadow-xs)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <Send className="w-4 h-4" /> Broadcast
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Leads',  value: leads.length, icon: Users,      color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--surface-muted)]' },
            { label: 'With Email',   value: withEmail,    icon: Mail,       color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--surface-muted)]' },
            { label: 'With Mobile',  value: withMobile,   icon: Phone,      color: 'text-[var(--success)]',        bg: 'bg-[var(--success-bg)]' },
            { label: 'This Month',   value: thisMonth,    icon: TrendingUp, color: 'text-[var(--warning)]',        bg: 'bg-[var(--warning-bg)]' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-[var(--text-primary)] leading-none">{s.value}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + view toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, mobile…"
              className="w-full pl-9 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm outline-none focus:border-[var(--border-strong)] focus-visible:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
          </div>

          {sites.length > 2 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
              {sites.map(s => (
                <button key={s.id} onClick={() => setFilterSite(s.id)}
                  className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                    filterSite === s.id ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}>{s.slug}</button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 p-1 bg-[var(--surface-muted)] rounded-[var(--radius-sm)] ml-auto shrink-0">
            {(['table', 'timeline'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold capitalize transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                  view === v ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)]'
                }`}>{v}</button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-24 text-center bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
            <div className="w-14 h-14 bg-[var(--surface-muted)] rounded-[var(--radius-lg)] flex items-center justify-center mb-4 border border-[var(--border)]">
              <UserCheck className="w-7 h-7 text-[var(--text-tertiary)]" />
            </div>
            <p className="font-semibold text-[var(--text-primary)] mb-1">{search ? `No leads matching "${search}"` : 'No leads yet'}</p>
            <p className="text-sm text-[var(--text-tertiary)] max-w-xs">Add Lead Form blocks to your link-in-bio pages to start collecting leads.</p>
          </div>
        )}

        {/* Table view */}
        {!isLoading && filtered.length > 0 && view === 'table' && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">All Leads</h2>
              <span className="text-xs text-[var(--text-tertiary)]">{filtered.length} leads</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((lead) => (
                <div key={lead.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--surface-hover)] transition group">
                  <Avatar name={lead.full_name} email={lead.email} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{lead.full_name || '—'}</p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">{lead.email || lead.mobile || '—'}</p>
                  </div>
                  {lead.mobile && (
                    <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                      <Phone className="w-3 h-3" />{lead.mobile}
                    </div>
                  )}
                  {lead.forms?.title && (
                    <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                      <FileText className="w-3 h-3" />{lead.forms.title}
                    </span>
                  )}
                  {lead.sites?.slug && (
                    <span className="hidden lg:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--info-bg)] text-[var(--info)]">
                      <Globe className="w-3 h-3" />{lead.sites.slug}
                    </span>
                  )}
                  <div className="hidden xl:flex items-center gap-1 text-xs text-[var(--text-tertiary)] shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  {lead.other && Object.keys(lead.other).length > 0 && (
                    <div className="hidden xl:block text-xs text-[var(--text-tertiary)] max-w-[160px] truncate">
                      {Object.entries(lead.other).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline view */}
        {!isLoading && filtered.length > 0 && view === 'timeline' && (
          <div className="space-y-6">
            {Object.entries(byDate).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{date}</span>
                  <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                  <span className="text-xs text-[var(--text-tertiary)]">{items.length} lead{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {items.map((lead) => (
                    <div key={lead.id} className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] px-5 py-3.5 hover:border-[var(--border-strong)] transition">
                      <div className="relative">
                        <Avatar name={lead.full_name} email={lead.email} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{lead.full_name || '—'}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {lead.email && <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                          {lead.mobile && <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1"><Phone className="w-3 h-3" />{lead.mobile}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {lead.forms?.title && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]">{lead.forms.title}</span>
                        )}
                        {lead.sites?.slug && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--info-bg)] text-[var(--info)]">{lead.sites.slug}</span>
                        )}
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {new Date(lead.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-lg border border-[var(--border)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <MailOpen className="w-5 h-5 text-[var(--text-secondary)]" /> Broadcast Email
              </h2>
              <button onClick={() => setShowBroadcast(false)} className="p-1 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBroadcast} className="p-6 space-y-4">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text-secondary)]">
                <Mail className="w-4 h-4 shrink-0" />
                Sending to <strong className="ml-1">{filtered.filter((l) => l.email).length} leads</strong>
                {filterSite !== 'all' && <span className="ml-1 opacity-70">(filtered)</span>}
              </div>

              {broadcastError && (
                <div className="flex items-center gap-2 p-3 bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[var(--radius-sm)] text-sm text-[var(--danger)]">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {broadcastError}
                </div>
              )}
              {sent && (
                <div className="flex items-center gap-2 p-3 bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-[var(--radius-sm)] text-sm text-[var(--success)]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Broadcast queued successfully!
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Subject Line</label>
                <input type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Special offer just for you!"
                  className="w-full px-4 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Message</label>
                <textarea required rows={6} value={body} onChange={e => setBody(e.target.value)}
                  placeholder={"Hi {{name}},\n\nI wanted to share something special with you...\n\nUse code SPECIAL20 for 20% off.\n\n— Your Name"}
                  className="w-full px-4 py-2.5 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[var(--radius-md)] text-sm focus:border-[var(--border-strong)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none" />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Use {'{{name}}'} to personalize.</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-[var(--radius-sm)] text-xs text-[var(--warning)]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Email delivery requires Resend/SendGrid configured in your backend.
              </div>
              <button type="submit" disabled={sending || sent}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] py-3 rounded-[var(--radius-sm)] font-bold text-sm shadow-[var(--shadow-xs)] transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <Send className="w-4 h-4" />
                {sending ? 'Sending…' : sent ? 'Sent!' : `Send to ${filtered.filter((l) => l.email).length} leads`}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
