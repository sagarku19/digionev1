'use client';

import React from 'react';
import { Users, Code } from 'lucide-react';

export default function ReferralsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-gray-400" />
          Buyer Referrals
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track rewards allocated to buyers who refer their friends to your store.</p>
      </div>

      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Code className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Referral Engine is Processing</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          The dual-sided reward structure is currently being indexed. Buyers will automatically generate referral links upon successful checkouts.
        </p>
      </div>
    </div>
  );
}
