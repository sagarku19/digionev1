'use client';
// ProductComparison section — table comparing feature rows across products/plans.
// No DB tables (comparison data from settings)

import React from 'react';
import { Check, X } from 'lucide-react';

interface ComparisonColumn {
  name?: string;
  highlight?: boolean;
}

interface ComparisonRow {
  feature?: string;
  values?: (boolean | string)[];
}

interface ProductComparisonSettings {
  title?: string;
  columns?: ComparisonColumn[];
  rows?: ComparisonRow[];
}

export default function ProductComparison({ settings }: { settings: Record<string, unknown> }) {
  // reason: section settings is jsonb; narrow once to the typed view
  const s = settings as unknown as ProductComparisonSettings;
  const title   = s?.title   ?? 'Compare plans';
  const columns = s?.columns ?? [{ name: 'Basic', highlight: false }, { name: 'Pro', highlight: true }];
  const rows    = s?.rows    ?? [{ feature: 'Unlimited downloads', values: [true, true] }, { feature: 'Priority support', values: [false, true] }];

  return (
    <section className="py-16 px-4 bg-[--creator-surface]">
      <div className="max-w-4xl mx-auto">
        {title && <h2 className="text-3xl font-bold text-center text-[--creator-text] mb-10">{title}</h2>}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-6 py-4 text-sm text-[--creator-text-muted] font-medium w-1/2">Feature</th>
                {columns.map((col, i) => (
                  <th key={i} className={`px-6 py-4 text-center text-sm font-bold ${col.highlight ? 'text-[--creator-primary] bg-[--creator-primary]/5' : 'text-[--creator-text]'}`}>
                    {col.name}
                    {col.highlight && <span className="ml-2 text-xs bg-[--creator-primary] text-white px-2 py-0.5 rounded-full">Popular</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  <td className="px-6 py-4 text-sm text-[--creator-text]">{row.feature}</td>
                  {columns.map((col, ci) => (
                    <td key={ci} className={`px-6 py-4 text-center ${col.highlight ? 'bg-[--creator-primary]/3' : ''}`}>
                      {typeof (row.values ?? [])[ci] === 'boolean' ? (
                        (row.values ?? [])[ci]
                          ? <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                          : <X className="w-4 h-4 text-gray-300 mx-auto" />
                      ) : (
                        <span className="text-sm font-medium text-[--creator-text]">{(row.values ?? [])[ci]}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
