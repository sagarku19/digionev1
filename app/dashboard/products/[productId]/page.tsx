'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { 
  FileText, DollarSign, HardDrive, Megaphone, Settings, 
  ArrowLeft, Save, UploadCloud, Trash2, Image as ImageIcon
} from 'lucide-react';

// Next.js 15 async params
export default function ProductEditor({ params }: { params: Promise<{ productId: string }> }) {
  const router = useRouter();
  const { products, updateProduct, isLoading } = useProducts();
  
  // React 19 / Next 15 param unwrapping
  const resolvedParams = React.use(params);
  const productId = resolvedParams.productId;

  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  
  // Local Copy of Product to prevent instant layout jumps until explicitly saved
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && products.length > 0) {
      const p = products.find((x: any) => x.id === productId);
      if (p && !formData) {
        setFormData(p);
      }
    }
  }, [products, isLoading, productId, formData]);

  if (isLoading || !formData) {
    return <div className="p-8 text-center text-gray-500">Loading editor...</div>;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Strip metadata overheads or simply patch what changed 
      // For simplicity, we fire an explicit update of standard fields
      const { id, created_at, updated_at, creator_id, ...updates } = formData;
      await updateProduct({ id: productId, updates });
      alert("Product updated securely.");
    } catch (err) {
      console.error(err);
      alert("Failed to update product.");
    } finally {
      setIsSaving(false);
    }
  };

  const TABS = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'content', label: 'Content Files', icon: HardDrive },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Editor Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#060612] p-6 -mx-6 -mt-6 border-b border-gray-200 dark:border-gray-800 sticky top-16 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/products')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">{formData.name}</h1>
            <p className="text-sm text-gray-500 capitalize">{formData.category || 'Digital'} Product</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            onClick={() => router.push(`/my-store/product/${formData.id}`)} // Placeholder route
          >
            View Live
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1 sticky top-40">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                    isActive 
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Editor Main Pane */}
        <div className="flex-1 max-w-3xl">
          
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white dark:bg-[#0A0A1A] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Basic Information</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Name</label>
                  <input 
                    type="text"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                  <textarea 
                    rows={6}
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell your buyers what this product is all about..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-[#0A0A1A] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Product Thumbnail</h2>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-center transition hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                  {formData.thumbnail_url ? (
                    <img src={formData.thumbnail_url} alt="Thumbnail" className="max-h-48 object-contain rounded-lg mb-4" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  )}
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Click to upload image</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG or WEBP up to 5MB. 16:9 ratio recommended.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRICING */}
          {activeTab === 'pricing' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="bg-white dark:bg-[#0A0A1A] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pricing Strategy</h2>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded" 
                      checked={formData.is_free || false}
                      onChange={e => setFormData({ ...formData, is_free: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Make this product Free</span>
                  </label>
                </div>

                {!formData.is_free && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Base Price (INR)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                        <input 
                          type="number"
                          value={formData.price || 0}
                          onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
               </div>
            </div>
          )}

          {/* TAB 3: CONTENT FILES */}
          {activeTab === 'content' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white dark:bg-[#0A0A1A] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Digital Delivery</h2>
                  <p className="text-sm text-gray-500 mb-6">Upload the actual files your buyers will access post-purchase. Protected by zero-trust architecture.</p>
                  
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-200 dark:divide-gray-800 mb-6">
                    {/* Mocked file list state for UI */}
                    <div className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded flex items-center justify-center">
                           <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Sample_Module_1.zip</p>
                          <p className="text-xs text-gray-500">24.5 MB • Uploaded 2 mins ago</p>
                        </div>
                      </div>
                      <button className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button className="w-full border-2 border-dashed border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 py-6 rounded-xl font-bold flex flex-col items-center justify-center gap-2 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 transition">
                    <UploadCloud className="w-6 h-6" />
                    Upload New Asset
                    <span className="text-xs font-medium opacity-70">Supports PDF, ZIP, MP4, MP3 (Max 2GB per file)</span>
                  </button>
                </div>
             </div>
          )}

          {/* TAB 4: MARKETING */}
          {activeTab === 'marketing' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="bg-white dark:bg-[#0A0A1A] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
                 <h2 className="text-lg font-bold text-gray-900 dark:text-white">SEO & Marketing</h2>
                 <p className="text-sm text-gray-500 -mt-4 mb-4">Control how your product looks on Google and Twitter.</p>
                 
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">SEO Title Optimization</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                      placeholder="Same as product title by default"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Meta Description</label>
                    <textarea 
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white resize-none"
                      placeholder="Brief summary for search engines (150-160 chars recommended)"
                    />
                  </div>
               </div>
             </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               {/* Visibility Card */}
               <div className="bg-white dark:bg-[#0A0A1A] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
                 <div>
                   <h2 className="text-lg font-bold text-gray-900 dark:text-white">Publish Product</h2>
                   <p className="text-sm text-gray-500 mt-1">Make this product visible sequentially on your storefront.</p>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.is_published || false}
                      onChange={e => setFormData({ ...formData, is_published: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
               </div>

               {/* Danger Zone */}
               <div className="border border-red-200 dark:border-red-900/50 rounded-2xl p-6 bg-white dark:bg-[#0A0A1A]">
                  <h3 className="text-red-600 dark:text-red-400 font-bold mb-1">Danger Zone</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Deleting this product is permanent and removes all associated files. Buyers who already purchased it will permanently lose access.</p>
                  
                  <button className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 font-medium px-4 py-2 rounded-lg transition">
                    Delete Product
                  </button>
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
