'use client';
import React, { memo } from 'react';
import { useMyMedia } from '@/hooks/storage/useMyMedia';
import { ImageIcon, Loader2, Crop } from 'lucide-react';

function MyUploadsPanel({ onPick }: { onPick: (sel: { fileId: string; url: string }) => void }) {
  const { images, isLoading } = useMyMedia();
  const usable = images.filter((i) => i.url);
  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[var(--brand)]" /></div>;
  if (usable.length === 0) return (
    <div className="text-center py-16">
      <ImageIcon className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
      <p className="text-sm text-[var(--text-secondary)]">No uploads yet</p>
      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Images you upload appear here to reuse</p>
    </div>
  );
  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        {usable.map((img) => (
          <button key={img.id} onClick={() => onPick({ fileId: img.id, url: img.url! })} className="group relative aspect-square rounded-[var(--radius-lg)] overflow-hidden border-2 border-transparent hover:border-[var(--brand)] transition-all duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            <img src={img.url!} alt={img.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[var(--surface)]/90 rounded-[var(--radius-md)]"><Crop className="w-4 h-4 text-[var(--brand)]" /></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
export default memo(MyUploadsPanel);
