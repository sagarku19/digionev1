'use client';

// Store settings page — placeholder for store name, slug, and branding settings.
// DB tables: sites, profiles (read/write)

import React from 'react';
import Link from 'next/link';
import { Store, ArrowLeft } from 'lucide-react';

export default function StoreSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure your store branding, slug, and preferences.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
          <Store className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Store Settings — Coming Soon</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            Customise your store name, public URL slug (e.g. digione.in/yourname),
            logo, and SEO metadata. This page is being built.
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          In the meantime, manage your store layout in{' '}
          <Link href="/dashboard/products" className="text-indigo-500 hover:underline">Products</Link>.
        </p>
      </div>
    </div>
  );
}
