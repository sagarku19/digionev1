'use client';

import React, { useState } from 'react';
import { useCoupons } from '@/hooks/useCoupons';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Ticket, Plus, X, Percent, DollarSign } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';

export default function CouponsPage() {
  const { coupons, isLoading, createCoupon, isCreating } = useCoupons();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    max_uses: ''
  });
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (formData.code.length < 3) throw new Error("Code must be at least 3 characters.");
      if (formData.discount_value <= 0) throw new Error("Discount value must be greater than zero.");
      
      await createCoupon({
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        is_active: true,
        current_uses: 0,
        valid_from: new Date().toISOString(),
        valid_until: null,
        metadata: null
      });

      setIsModalOpen(false);
      setFormData({ code: '', discount_type: 'percentage', discount_value: 0, max_uses: '' });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate coupon.");
    }
  };

  const columns: ColumnDef<any>[] = [
    { 
      header: 'Promo Code', 
      accessorKey: 'code',
      sortable: true,
      cell: (row: any) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono tracking-widest text-sm border border-gray-200 dark:border-gray-700">
          {row.code}
        </span>
      )
    },
    { 
      header: 'Discount', 
      accessorKey: 'discount_value',
      cell: (row: any) => row.discount_type === 'percentage' 
        ? `${row.discount_value}% OFF`
        : `₹${row.discount_value} OFF`
    },
    {
      header: 'Redemptions',
      accessorKey: 'current_uses',
      cell: (row: any) => (
        <span className="text-gray-500">
          {row.current_uses} / {row.max_uses ? row.max_uses : '∞'}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'is_active',
      cell: (row: any) => <StatusPill status={row.is_active ? 'active' : 'inactive'} />
    }
  ];

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Promotional Matrix...</div>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discount Coupons</h1>
            <p className="text-sm text-gray-500 mt-1">Generate dynamic promo codes to drive higher conversion rates.</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Promo Code
          </button>
        </div>

        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-0">
            <DataTable 
              data={coupons} 
              columns={columns} 
              searchKeys={['code']}
              emptyState="No promotion codes active. Create one to kickstart sales!"
            />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-500" />
                Generate Coupon
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleGenerate} className="p-6 space-y-5">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-500/20 rounded-lg">
                  {errorMsg}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Promotion Code</label>
                <input 
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-mono tracking-widest uppercase"
                  placeholder="EARLYBIRD25"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Discount Type</label>
                  <select 
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {formData.discount_type === 'percentage' ? <Percent className="w-4 h-4"/> : <DollarSign className="w-4 h-4" />}
                    </span>
                    <input 
                      type="number"
                      required
                      min="1"
                      value={formData.discount_value || ''}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Maximum Uses (Optional)</label>
                <input 
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <button 
                type="submit" 
                disabled={isCreating}
                className="w-full mt-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 py-3.5 rounded-xl font-bold transition shadow-sm"
              >
                {isCreating ? 'Generating...' : 'Create Promotional Code'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
