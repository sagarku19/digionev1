'use client';
import React, { memo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

function UploadPanel({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="p-4">
      <div
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) onFile(f); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed rounded-[var(--radius-xl)] cursor-pointer transition-all duration-200 ${over ? 'border-[var(--brand)] bg-[var(--brand)]/5' : 'border-[var(--border)] hover:border-[var(--brand)]/50 bg-[var(--surface-muted)]'}`}
      >
        <div className={`p-3 rounded-[var(--radius-lg)] mb-3 transition-colors ${over ? 'bg-[var(--brand)]/10' : 'bg-[var(--surface-hover)]'}`}>
          <Upload className={`w-6 h-6 ${over ? 'text-[var(--brand)]' : 'text-[var(--text-tertiary)]'}`} />
        </div>
        <p className="text-sm font-semibold text-[var(--text-secondary)]">{over ? 'Drop image here' : 'Click, drag, or paste an image'}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">JPG, PNG, WebP, GIF — up to 15 MB</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      </div>
    </div>
  );
}
export default memo(UploadPanel);
