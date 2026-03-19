'use client';

import React from 'react';
import { useGuestLeads } from '@/hooks/useGuestLeads';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Users, Mail, ArrowRight } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';

export default function LeadsPage() {
  const { leads, isLoading } = useGuestLeads();

  const columns: ColumnDef<any>[] = [
    { 
      header: 'Prospect Email', 
      accessorKey: 'email',
      sortable: true,
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{row.email}</span>
        </div>
      )
    },
    { 
      header: 'Captured From Product', 
      accessorKey: 'products',
      cell: (row: any) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm line-clamp-1 max-w-[200px]">
          {row.products?.name || 'General Form'}
        </span>
      )
    },
    {
      header: 'Conversion Event',
      accessorKey: 'conversion_event_type',
      cell: (row: any) => (
        <span className="capitalize text-sm text-gray-500">
          {row.conversion_event_type ? row.conversion_event_type.replace(/_/g, ' ') : 'Newsletter'}
        </span>
      )
    },
    {
      header: 'Captured On',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row: any) => new Date(row.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
  ];

  if (isLoading) return <div className="p-8 text-center text-gray-500">Parsing abandoned carts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-gray-400" />
            Guest Leads & Prospects
          </h1>
          <p className="text-sm text-gray-500 mt-1">Export captured emails from abandoned checkouts to retarget promotions.</p>
        </div>
        
        {leads.length > 0 && (
          <button 
            className="flex items-center gap-2 bg-white dark:bg-[#1A1A2E] hover:bg-gray-50 dark:hover:bg-[#2A2A4A] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Export CSV
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-0">
          <DataTable 
            data={leads} 
            columns={columns} 
            searchKeys={['email']}
            emptyState="No leads captured yet. Your conversion funnels will appear here when guests interact!"
          />
        </div>
      </div>
    </div>
  );
}
