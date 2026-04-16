'use client';
// Leads — captured leads with CSV export, site filter, search, timeline view, broadcast modal.
// DB: lead_form joined with forms, sites via useGuestLeads hook

import React, { useState, useMemo } from 'react';
import { useGuestLeads } from '@/hooks/useGuestLeads';
import {
  Users, Mail, ArrowDownToLine, Send, X, Filter,
  MailOpen, AlertCircle, CheckCircle2, Search,
  Globe, FileText, Phone, Clock, TrendingUp, UserCheck, RefreshCw,
} from 'lucide-react';

function exportCSV(leads: any[]) {
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
  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-rose-500'];
  const color = colors[letter.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center shrink-0 text-white font-bold text-sm`}>
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
    allLeads.forEach((l: any) => { if (l.sites?.slug) s.set(l.site_id, l.sites.slug); });
    return [{ id: 'all', slug: 'All Sites' }, ...Array.from(s, ([id, slug]) => ({ id, slug }))];
  }, [allLeads]);

  const filtered = leads.filter((l: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.email?.toLowerCase().includes(q) || l.full_name?.toLowerCase().includes(q) || l.mobile?.includes(q);
  });

  // Stats
  const withEmail  = leads.filter((l: any) => l.email).length;
  const withMobile = leads.filter((l: any) => l.mobile).length;
  const now = new Date();
  const thisMonth  = leads.filter((l: any) => l.created_at && new Date(l.created_at).getMonth() === now.getMonth() && new Date(l.created_at).getFullYear() === now.getFullYear()).length;

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
    const groups: Record<string, any[]> = {};
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
            <p className="text-sm text-gray-500 mt-0.5">Captured leads from your link-in-bio forms</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {leads.length > 0 && (
              <>
                <button onClick={() => exportCSV(filtered)}
                  className="flex items-center gap-2 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 hover:border-indigo-400 text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-xl text-sm font-semibold transition">
                  <ArrowDownToLine className="w-4 h-4" /> Export CSV
                </button>
                <button onClick={() => setShowBroadcast(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition">
                  <Send className="w-4 h-4" /> Broadcast
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Leads',  value: leads.length, icon: Users,     color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
            { label: 'With Email',   value: withEmail,    icon: Mail,      color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
            { label: 'With Mobile',  value: withMobile,   icon: Phone,     color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: 'This Month',   value: thisMonth,    icon: TrendingUp,color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900 dark:text-white leading-none">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + view toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, mobile…"
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 text-gray-900 dark:text-white placeholder-gray-400" />
          </div>

          {sites.length > 2 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              {sites.map(s => (
                <button key={s.id} onClick={() => setFilterSite(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    filterSite === s.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-indigo-400'
                  }`}>{s.slug}</button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl ml-auto shrink-0">
            {(['table', 'timeline'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  view === v ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}>{v}</button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-24 text-center bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-800">
              <UserCheck className="w-7 h-7 text-gray-300 dark:text-gray-700" />
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{search ? `No leads matching "${search}"` : 'No leads yet'}</p>
            <p className="text-sm text-gray-500 max-w-xs">Add Lead Form blocks to your link-in-bio pages to start collecting leads.</p>
          </div>
        )}

        {/* Table view */}
        {!isLoading && filtered.length > 0 && view === 'table' && (
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Leads</h2>
              <span className="text-xs text-gray-400">{filtered.length} leads</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((lead: any) => (
                <div key={lead.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition group">
                  <Avatar name={lead.full_name} email={lead.email} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{lead.full_name || '—'}</p>
                    <p className="text-xs text-gray-500 truncate">{lead.email || lead.mobile || '—'}</p>
                  </div>
                  {lead.mobile && (
                    <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                      <Phone className="w-3 h-3" />{lead.mobile}
                    </div>
                  )}
                  {lead.forms?.title && (
                    <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <FileText className="w-3 h-3" />{lead.forms.title}
                    </span>
                  )}
                  {lead.sites?.slug && (
                    <span className="hidden lg:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Globe className="w-3 h-3" />{lead.sites.slug}
                    </span>
                  )}
                  <div className="hidden xl:flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  {lead.other && Object.keys(lead.other).length > 0 && (
                    <div className="hidden xl:block text-xs text-gray-400 max-w-[160px] truncate">
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
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{date}</span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                  <span className="text-xs text-gray-400">{items.length} lead{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {items.map((lead: any) => (
                    <div key={lead.id} className="flex items-center gap-4 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-3.5 hover:border-gray-300 dark:hover:border-gray-700 transition">
                      <div className="relative">
                        <Avatar name={lead.full_name} email={lead.email} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{lead.full_name || '—'}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {lead.email && <span className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                          {lead.mobile && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{lead.mobile}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {lead.forms?.title && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">{lead.forms.title}</span>
                        )}
                        {lead.sites?.slug && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">{lead.sites.slug}</span>
                        )}
                        <span className="text-xs text-gray-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MailOpen className="w-5 h-5 text-indigo-500" /> Broadcast Email
              </h2>
              <button onClick={() => setShowBroadcast(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBroadcast} className="p-6 space-y-4">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-sm text-indigo-700 dark:text-indigo-400">
                <Mail className="w-4 h-4 shrink-0" />
                Sending to <strong className="ml-1">{filtered.filter((l: any) => l.email).length} leads</strong>
                {filterSite !== 'all' && <span className="ml-1 opacity-70">(filtered)</span>}
              </div>

              {broadcastError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {broadcastError}
                </div>
              )}
              {sent && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Broadcast queued successfully!
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subject Line</label>
                <input type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Special offer just for you!"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none text-gray-900 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
                <textarea required rows={6} value={body} onChange={e => setBody(e.target.value)}
                  placeholder={"Hi {{name}},\n\nI wanted to share something special with you...\n\nUse code SPECIAL20 for 20% off.\n\n— Your Name"}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none text-gray-900 dark:text-white placeholder-gray-400 resize-none" />
                <p className="text-xs text-gray-400 mt-1">Use {'{{name}}'} to personalize.</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Email delivery requires Resend/SendGrid configured in your backend.
              </div>
              <button type="submit" disabled={sending || sent}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                {sending ? 'Sending…' : sent ? 'Sent!' : `Send to ${filtered.filter((l: any) => l.email).length} leads`}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
