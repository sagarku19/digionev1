'use client';
// Lead Management — captured emails with CSV export, segmentation, and broadcast modal.
// DB tables: guest_leads (read via useGuestLeads), sites (read)

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGuestLeads } from '@/hooks/useGuestLeads';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import {
  Users, Mail, ArrowDownToLine, Send, X, Filter,
  MailOpen, AlertCircle, CheckCircle2, Tag, Search,
  Ticket, Network, Gift,
} from 'lucide-react';

// ─── Marketing Hub Nav ────────────────────────────────────────
const HUB_TABS = [
  { label: 'Coupons',    href: '/dashboard/coupons',    icon: Ticket  },
  { label: 'Leads',      href: '/dashboard/leads',      icon: Users   },
  { label: 'Affiliates', href: '/dashboard/affiliates', icon: Network },
  { label: 'Referrals',  href: '/dashboard/referrals',  icon: Gift    },
];

function MarketingHubNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-fit flex-wrap">
      {HUB_TABS.map(tab => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function exportCSV(leads: any[]) {
  const header = ['Email', 'Full Name', 'Mobile', 'Product', 'Event Type', 'Captured On'];
  const rows = leads.map(l => [
    l.email ?? '',
    l.full_name ?? '',
    l.mobile ?? '',
    l.products?.name ?? 'General Form',
    l.conversion_event_type?.replace(/_/g, ' ') ?? 'newsletter',
    l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : '',
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `leads-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const { leads, isLoading } = useGuestLeads();

  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [broadcastError, setBroadcastError] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Unique sources
  const sources = useMemo(() => {
    const s = new Set<string>();
    leads.forEach((l: any) => s.add(l.conversion_event_type ?? 'newsletter'));
    return ['all', ...Array.from(s)];
  }, [leads]);

  const filtered = leads.filter((l: any) => {
    const matchSearch = !search ||
      l.email?.includes(search.toLowerCase()) ||
      l.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchSource = filterSource === 'all' || (l.conversion_event_type ?? 'newsletter') === filterSource;
    return matchSearch && matchSource;
  });

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastError('');
    if (!broadcastSubject.trim() || !broadcastBody.trim()) {
      setBroadcastError('Subject and message are required.');
      return;
    }
    setIsSending(true);
    // Placeholder — wire to your email API (Resend, SendGrid, etc.)
    await new Promise(r => setTimeout(r, 1500));
    setBroadcastSent(true);
    setIsSending(false);
    setTimeout(() => { setShowBroadcast(false); setBroadcastSent(false); setBroadcastSubject(''); setBroadcastBody(''); }, 2000);
  };

  const columns: ColumnDef<any>[] = [
    {
      header: 'Email',
      accessorKey: 'email',
      sortable: true,
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 text-[var(--text-primary)] font-bold text-sm">
            {(row.full_name ?? row.email ?? 'L')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.full_name || '—'}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Mobile',
      accessorKey: 'mobile',
      cell: (row: any) => <span className="text-sm text-gray-500">{row.mobile || '—'}</span>
    },
    {
      header: 'Source',
      accessorKey: 'conversion_event_type',
      cell: (row: any) => (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] dark:text-[var(--text-secondary)] capitalize">
          <Tag className="w-3 h-3" />
          {(row.conversion_event_type ?? 'newsletter').replace(/_/g, ' ')}
        </span>
      )
    },
    {
      header: 'Product',
      accessorKey: 'products',
      cell: (row: any) => (
        <span className="text-sm text-gray-500 truncate max-w-[140px] block">
          {row.products?.name || 'General'}
        </span>
      )
    },
    {
      header: 'Captured',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row: any) => (
        <span className="text-sm text-gray-500">
          {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
  ];

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading leads…</div>;

  return (
    <>
      <div className="space-y-6 pt-6">
        {/* Marketing hub nav */}
        <MarketingHubNav />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-gray-400" />
              Lead Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">{leads.length} leads captured across all stores</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {leads.length > 0 && (
              <>
                <button
                  onClick={() => exportCSV(filtered)}
                  className="flex items-center gap-2 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 hover:border-[var(--accent)] dark:hover:border-[var(--accent)] text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => setShowBroadcast(true)}
                  className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                  Broadcast Email
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        {leads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Leads', value: leads.length },
              { label: 'With Email', value: leads.filter((l: any) => l.email).length },
              { label: 'With Mobile', value: leads.filter((l: any) => l.mobile).length },
              { label: 'This Month', value: leads.filter((l: any) => l.created_at && new Date(l.created_at).getMonth() === new Date().getMonth()).length },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        {leads.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
            </div>
            {sources.length > 2 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                {sources.map(s => (
                  <button
                    key={s} onClick={() => setFilterSource(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                      filterSource === s
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-[var(--accent)]'
                    }`}
                  >
                    {s === 'all' ? 'All Sources' : s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <DataTable
            data={filtered}
            columns={columns}
            searchKeys={['email', 'full_name']}
            emptyState="No leads captured yet. Add Email Capture sections to your storefront to start building your list."
          />
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MailOpen className="w-5 h-5 text-[var(--text-secondary)]" />
                Broadcast Email
              </h2>
              <button onClick={() => setShowBroadcast(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBroadcast} className="p-6 space-y-4">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)]">
                <Mail className="w-4 h-4 shrink-0" />
                Sending to <strong className="ml-1">{filtered.filter((l: any) => l.email).length} leads</strong>
                {filterSource !== 'all' && <span className="ml-1 opacity-70">(filtered by: {filterSource.replace(/_/g, ' ')})</span>}
              </div>

              {broadcastError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {broadcastError}
                </div>
              )}

              {broadcastSent && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Broadcast queued successfully!
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subject Line</label>
                <input
                  type="text" required value={broadcastSubject} onChange={e => setBroadcastSubject(e.target.value)}
                  placeholder="🎉 Special offer just for you!"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]/40 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
                <textarea
                  required rows={6} value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)}
                  placeholder="Hi {{name}},&#10;&#10;I wanted to share something special with you...&#10;&#10;Use code SPECIAL20 for 20% off.&#10;&#10;— Your Name"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)]/40 outline-none text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">Use {'{{name}}'} to personalize. Plain text only.</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Email delivery requires an email API (Resend/SendGrid) configured in your backend. This will queue the broadcast.
              </div>
              <button
                type="submit" disabled={isSending || broadcastSent}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Sending…' : broadcastSent ? 'Sent!' : `Send to ${filtered.filter((l: any) => l.email).length} leads`}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
