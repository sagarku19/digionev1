'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { Plus, X, Package, Tag, FileText } from 'lucide-react';

export default function ProductsOverview() {
  const router = useRouter();
  const { products, isLoading, createProduct, isCreating } = useProducts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Product Draft State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('digital');
  const [price, setPrice] = useState('0');

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    try {
      const newProd = await createProduct({
        name,
        category,
        price: parseFloat(price) || 0,
        is_published: false
      });
      
      if (newProd) {
        setIsModalOpen(false);
        router.push(`/dashboard/products/${newProd.id}`);
      }
    } catch (err) {
      console.error("Failed to create product", err);
      alert("Error creating product. Please try again.");
    }
  };

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const columns: ColumnDef<any>[] = [
    { 
      header: 'Product', 
      accessorKey: 'name',
      sortable: true,
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
            {row.thumbnail_url ? (
              <img src={row.thumbnail_url} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{row.name}</div>
            <div className="text-xs text-gray-500 capitalize">{row.category || 'Digital'}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'Price', 
      accessorKey: 'price',
      sortable: true,
      cell: (row: any) => <span className="font-medium text-gray-900 dark:text-gray-100">{formatINR(row.price || 0)}</span>
    },
    {
      header: 'Status',
      accessorKey: 'is_published',
      sortable: true,
      cell: (row: any) => <StatusPill status={row.is_published ? 'published' : 'draft'} />
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row: any) => <span className="text-gray-500 text-sm">{new Date(row.created_at).toLocaleDateString()}</span>
    },
    {
      header: '',
      accessorKey: 'id',
      cell: (row: any) => (
        <div className="flex justify-end">
          <button 
            onClick={() => router.push(`/dashboard/products/${row.id}`)}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Edit
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your digital products, courses, and digital downloads.</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Product
          </button>
        </div>

        <div className="bg-white dark:bg-[#0A0A1A]">
          <DataTable 
            data={products} 
            columns={columns} 
            searchable={true} 
            searchKeys={['name', 'category']}
            emptyState={isLoading ? "Loading products..." : "You haven't created any products yet."}
          />
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Product</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProduct} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Name</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  placeholder="e.g. Complete Figma Mastery"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Category</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCategory('digital')}
                    className={`flex flex-col items-center justify-center gap-2 p-4 border rounded-xl transition ${
                      category === 'digital' 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <FileText className="w-6 h-6" />
                    <span className="font-semibold text-sm">Digital File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('course')}
                    className={`flex flex-col items-center justify-center gap-2 p-4 border rounded-xl transition ${
                      category === 'course' 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <Tag className="w-6 h-6" />
                    <span className="font-semibold text-sm">Course</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Base Price (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                  <input 
                    type="number"
                    required
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-mono"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">You can change this later or add discounts.</p>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isCreating || !name}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition shadow-sm"
                >
                  {isCreating ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
