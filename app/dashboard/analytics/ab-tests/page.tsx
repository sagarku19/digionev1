'use client';

import React from 'react';
import { FlaskConical } from 'lucide-react';

export default function AbTestsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-gray-400" />
          A/B Testing Matrix
        </h1>
        <p className="text-sm text-gray-500 mt-1">Run split experiments on your Storefront components to optimize conversion rates.</p>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-12 text-center shadow-sm">
        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-2">Experiment Framework in Development</h3>
        <p className="text-indigo-700/80 dark:text-indigo-300/80 max-w-md mx-auto leading-relaxed">
          The continuous optimization tracker is preparing to launch. You'll be able to serve variable Pricing strategies, Hero texts, and layouts to track definitive Checkout conversions dynamically.
        </p>
      </div>
    </div>
  );
}
