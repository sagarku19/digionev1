'use client';
// Affiliate Management — invite partners, set commission, track & toggle status.
// DB tables: affiliates (read/write via useAffiliates)

import React, { useState } from 'react';
import { useAffiliates } from '@/hooks/useAffiliates';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  Network, Plus, X, Copy, Check, Trash2, ToggleLeft,
  ToggleRight, Percent, AlertCircle, ExternalLink
} from 'lucide-react';

const INPUT = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition';

function AffiliateLink({ affiliateId }: { affiliateId: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/ref/${affiliateId}`;
  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  );
}

export default function AffiliatesPage() {
  const { affiliates, isLoading, inviteAffiliate, updateAffiliate, removeAffiliate, isInviting } = useAffiliates();
  const [showModal, setShowModal] = useState(false);
  const [affiliateUserId, setAffiliateUserId] = useState('');
  const [commission, setCommission] = useState(20);
  const [formError, setFormError] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!affiliateUserId.trim()) { setFormError('Affiliate user ID is required.'); return; }
    if (commission <= 0 || commission > 80) { setFormError('Commission must be between 1% and 80%.'); return; }
    try {
      await inviteAffiliate({ affiliate_user_id: affiliateUserId.trim(), commission_percent: commission });
      setShowModal(false);
      setAffiliateUserId('');
      setCommission(20);
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to add affiliate.');
    }
  };

  const toggleActive = (aff: any) => updateAffiliate({ id: aff.id, updates: { is_active: !aff.is_active } });
  const handleRemove = async (id: string) => {
    if (!confirm('Remove this affiliate permanently?')) return;
    await removeAffiliate(id);
  };

  const activeCount   = affiliates.filter((a: any) => a.is_active).length;
  const totalRevShare = affiliates.reduce((s: number, a: any) => s + (a.commission_percent || 0), 0);

  const columns: ColumnDef<any>[] = [
    {
      header: 'Affiliate ID',
      accessorKey: 'affiliate_user_id',
      cell: (row) => (
        <div>
          <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate max-w-[160px]">{row.affiliate_user_id}</p>
          <AffiliateLink affiliateId={row.affiliate_user_id} />
        </div>
      )
    },
    {
      header: 'Commission',
      accessorKey: 'commission_percent',
      sortable: true,
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
          <Percent className="w-3.5 h-3.5" />
          {row.commission_percent}%
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'is_active',
      cell: (row) => <StatusPill status={row.is_active ? 'active' : 'inactive'} />
    },
    {
      header: 'Joined',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleActive(row)}
            title={row.is_active ? 'Deactivate' : 'Activate'}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
          >
            {row.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button
            onClick={() => handleRemove(row.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ];

  return (
    <>
      <div className="space-y-6 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Network className="w-6 h-6 text-gray-400" />
              Affiliate Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Invite partners to promote your products and earn commission on every sale.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Affiliate
          </button>
        </div>

        {/* Stats */}
        {affiliates.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Affiliates', value: affiliates.length },
              { label: 'Active', value: activeCount },
              { label: 'Avg. Commission', value: `${affiliates.length ? Math.round(totalRevShare / affiliates.length) : 0}%` },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-sm text-indigo-700 dark:text-indigo-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>How it works:</strong> Each affiliate gets a unique referral link. When a buyer uses their link and completes a purchase, the affiliate earns their commission % automatically credited to their wallet.
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <DataTable
            data={affiliates}
            columns={columns}
            searchKeys={['affiliate_user_id']}
            emptyState="No affiliates yet. Add your first partner to start growing your reach."
          />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D0D1F] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Affiliate</h2>
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/40 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Affiliate's User ID</label>
                <input
                  type="text" required autoFocus value={affiliateUserId} onChange={e => setAffiliateUserId(e.target.value)}
                  placeholder="Paste their DigiOne user ID"
                  className={INPUT}
                />
                <p className="text-xs text-gray-400 mt-1.5">The affiliate must have a DigiOne account. Ask them to share their User ID from their profile settings.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Commission Rate</label>
                <div className="relative">
                  <input
                    type="number" min={1} max={80} required value={commission} onChange={e => setCommission(parseInt(e.target.value) || 0)}
                    className={`${INPUT} pr-8`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Industry standard: 10–30%. Platform fee still applies on top of this.</p>
              </div>
              <button
                type="submit" disabled={isInviting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all"
              >
                {isInviting ? 'Adding…' : 'Add Affiliate →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
