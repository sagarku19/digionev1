'use client';

import React from 'react';
import { Network, Plus } from 'lucide-react';

export default function AffiliatesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-gray-400" />
            Affiliate Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Set up commission structures and empower partners to sell your products.</p>
        </div>
        
        <button 
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          Invite Affiliate
        </button>
      </div>

      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Coming Soon: Affiliate Engine</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          We are finalizing the Affiliate tracking matrix. Soon, you will be able to distribute unique tracking links and programmatically split revenues with your ambassadors.
        </p>
      </div>
    </div>
  );
}
