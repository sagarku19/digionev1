"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pageSize?: number;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  emptyState?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({ 
  data, 
  columns, 
  pageSize = 10,
  searchable = false,
  searchKeys = [],
  emptyState
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof T, direction: 'asc' | 'desc' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filter
  let processedData = [...data];
  if (searchable && searchQuery && searchKeys.length > 0) {
    const q = searchQuery.toLowerCase();
    processedData = processedData.filter(row => 
      searchKeys.some(key => String(row[key] ?? '').toLowerCase().includes(q))
    );
  }

  // 2. Sort
  if (sortConfig) {
    processedData.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      // Handle nulls
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // 3. Paginate
  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
  
  // Prevent currentPage from being out of bounds after filter/sort changes
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const paginatedData = processedData.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  return (
    <div className="w-full bg-[var(--surface-color)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col">
      {searchable && (
        <div className="p-4 border-b border-[var(--color-border)] flex items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--color-border)] rounded-md bg-transparent focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-shadow"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-[var(--color-text-secondary)] uppercase bg-gray-50/50 dark:bg-zinc-800/30 border-b border-[var(--color-border)]">
            <tr>
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  className={`px-6 py-4 font-semibold tracking-wider ${col.sortable ? 'cursor-pointer select-none group' : ''}`}
                  onClick={() => col.sortable && col.accessorKey && handleSort(col.accessorKey)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && col.accessorKey && (
                      <span className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                        {sortConfig?.key === col.accessorKey ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center text-[var(--color-text-tertiary)]">
                  {emptyState ? emptyState : 'No results found.'}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                  {columns.map((col, j) => (
                    <td key={j} className="px-6 py-4 text-[var(--color-text-primary)]">
                      {col.cell ? col.cell(row) : (col.accessorKey ? String(row[col.accessorKey] ?? '') : null)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-[var(--color-border)] flex items-center justify-between bg-gray-50/20 dark:bg-zinc-800/10">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Showing <span className="font-medium">{(safeCurrentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(safeCurrentPage * pageSize, processedData.length)}</span> of <span className="font-medium">{processedData.length}</span> results
          </span>
          <div className="flex gap-1.5">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="p-1.5 rounded-md border border-[var(--color-border)] disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-800 transition-colors text-[var(--color-text-secondary)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="p-1.5 rounded-md border border-[var(--color-border)] disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-800 transition-colors text-[var(--color-text-secondary)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
