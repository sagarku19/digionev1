'use client';

import React, { useState } from 'react';
import { useEarnings } from '@/hooks/useEarnings';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { ArrowDownCircle, ArrowUpRight, CheckCircle2, AlertCircle, RefreshCcw, X, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function EarningsPage() {
  const { creatorBalances, payouts, kyc, isLoading, refreshEarnings } = useEarnings();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const amt = parseFloat(payoutAmount);
    
    if (!amt || amt <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }
    
    if (creatorBalances && amt > creatorBalances.available_balance) {
      setErrorMsg('Cannot request more than your available balance.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt })
      });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to request payout');
      }

      setIsModalOpen(false);
      setPayoutAmount('');
      refreshEarnings();
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    { 
      header: 'Request Date', 
      accessorKey: 'created_at',
      sortable: true,
      cell: (row: any) => new Date(row.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    },
    { 
      header: 'Amount', 
      accessorKey: 'amount',
      sortable: true,
      cell: (row: any) => <span className="font-medium text-gray-900 dark:text-gray-100">{formatINR(row.amount)}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row: any) => <StatusPill status={String(row.status)} />
    },
    {
      header: 'Processed Date',
      accessorKey: 'processed_at',
      cell: (row: any) => row.processed_at ? new Date(row.processed_at).toLocaleDateString() : '-'
    }
  ];

  if (isLoading && creatorBalances === undefined) {
    return <div className="p-8 text-center text-gray-500">Connecting to Ledger...</div>;
  }

  const isKycVerified = kyc?.status === 'verified';
  const available = creatorBalances?.available_balance || 0;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Earnings & Payouts</h1>
            <p className="text-sm text-gray-500 mt-1">Track your store revenue and withdraw funds securely to your bank.</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors"
          >
            <ArrowUpRight className="w-5 h-5" />
            Request Payout
          </button>
        </div>

        {/* KYC Warning Banner */}
        {!isKycVerified && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Action Required: Verify KYC & Bank Details</h3>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-0.5">We cannot process payouts until your identity and bank account are verified.</p>
              </div>
            </div>
            <Link 
              href="/dashboard/settings/billing"
              className="whitespace-nowrap bg-white dark:bg-amber-500/20 hover:bg-amber-50 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-sm font-bold px-4 py-2 border border-amber-200 dark:border-amber-500/30 rounded-lg transition"
            >
              Complete KYC
            </Link>
          </div>
        )}

        {/* Ledger Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            label="Available for Payout" 
            value={formatINR(available)} 
            icon={CheckCircle2} 
            className="border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/10 dark:bg-indigo-900/10 ring-1 ring-inset ring-indigo-50 dark:ring-indigo-900/20"
          />
          <StatCard 
            label="Pending Clearance" 
            value={formatINR(creatorBalances?.pending_payout || 0)} 
            icon={RefreshCcw} 
            subValue="Under 48hr settlement period"
          />
          <StatCard 
            label="Total Earnings Overview" 
            value={formatINR(creatorBalances?.total_earnings || 0)} 
            icon={ArrowDownCircle} 
            subValue="Lifetime gross revenue"
          />
        </div>

        {/* Payout History Table */}
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Withdrawal History</h2>
          </div>
          <div className="p-0">
            <DataTable 
              data={payouts} 
              columns={columns} 
              emptyState="You haven't requested any payouts yet."
            />
          </div>
        </div>
      </div>

      {/* Payout Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Withdraw Funds</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRequestPayout} className="p-6">
              {!isKycVerified ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">KYC Missing</h3>
                  <p className="text-sm text-gray-500 mb-6">You must complete KYC and attach a Bank Account before withdrawing funds.</p>
                  <Link 
                    href="/dashboard/settings/billing"
                    className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition"
                  >
                    Set up Bank Account
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {errorMsg && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-500/20 rounded-lg">
                      {errorMsg}
                    </div>
                  )}
                  
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount to Withdraw (INR)</label>
                      <button 
                        type="button" 
                        onClick={() => setPayoutAmount(String(available))}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Max: {formatINR(available)}
                      </button>
                    </div>
                    
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                      <input 
                        type="number"
                        required
                        min="100"
                        step="1"
                        max={available}
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-mono text-lg"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Minimum withdrawal is ₹100. Funds arrive in 1-2 business days.</p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting || !payoutAmount || Number(payoutAmount) <= 0}
                    className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 py-3.5 rounded-xl font-bold transition shadow-sm"
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
