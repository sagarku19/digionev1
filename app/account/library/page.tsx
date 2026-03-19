'use client';

import React from 'react';
import { Download, Library, Search } from 'lucide-react';

export default function BuyerLibraryPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white mb-2">My Digital Library</h1>
        <p className="text-gray-500 mb-8">Access all of your purchased content, courses, and downloads across DigiOne.</p>
        
        <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Library className="w-8 h-8 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your library is currently empty</h2>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            When you purchase templates, assets, or software from Creators, they will appear here forever.
          </p>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md">
            Discover Top Products
          </button>
        </div>
      </div>
    </div>
  );
}
