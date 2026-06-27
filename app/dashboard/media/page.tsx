'use client';
// Media Library — unified asset gallery.
//  • My Assets: own media images (digione-media) + deliverable files (digione-products, signed)
//  • DigiOne Stock: read-only public stock images (public_images)
// Data via TanStack hooks (useOwnAssets / useDigioneStock). Tokens only, lucide only.

import React, { useMemo, useState } from 'react';
import {
  ImageIcon, FileText, File as FileIcon, Archive, Search, Copy, Check, Trash2,
  Download, Eye, X, FolderOpen, Sparkles, HardDrive,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useOwnAssets, useDigioneStock, type OwnImage, type OwnFile, type StockImage } from '@/hooks/storage/useMediaLibrary';
import { formatBytes } from '@/lib/format-bytes';

type Source = 'mine' | 'digione';
type TypeFilter = 'all' | 'images' | 'files';

function renderFileIcon(name: string, mime: string | null) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const cls = 'w-4 h-4 text-[var(--text-secondary)]';
  if ((mime ?? '').startsWith('image/')) return <ImageIcon className={cls} />;
  if (ext === 'pdf' || mime === 'application/pdf') return <FileText className={cls} />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <Archive className={cls} />;
  return <FileIcon className={cls} />;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MediaPage() {
  const { images, files, usedBytes, quotaBytes, isLoading: ownLoading, deleteImage } = useOwnAssets();
  const [source, setSource] = useState<Source>('mine');
  const { stock, isLoading: stockLoading } = useDigioneStock(source === 'digione');

  const [type, setType] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OwnImage | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };
  const copyUrl = (id: string, url: string | null) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('URL copied');
    setTimeout(() => setCopiedId(''), 1800);
  };

  const q = search.trim().toLowerCase();
  const ownImages = useMemo(() => images.filter((i) => !q || i.name.toLowerCase().includes(q)), [images, q]);
  const ownFiles = useMemo(() => files.filter((f) => !q || f.name.toLowerCase().includes(q) || (f.productName ?? '').toLowerCase().includes(q)), [files, q]);
  const stockImages = useMemo(() => stock.filter((s) => !q || s.name.toLowerCase().includes(q)), [stock, q]);

  const showImages = type === 'all' || type === 'images';
  const showFiles = type === 'all' || type === 'files';
  const mineEmpty = ownImages.length === 0 && ownFiles.length === 0;

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteImage(deleteTarget.id);
    showToast('Deleted');
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Media Library"
        description="Your uploaded images and product files, plus DigiOne's stock library."
      />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left sub-sidebar */}
        <aside className="w-full md:w-56 shrink-0 md:sticky md:top-4 space-y-3">
          <nav className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-2">
            <p className="px-2.5 pt-1.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Library</p>
            <NavItem icon={FolderOpen} label="My Assets" count={images.length + files.length} active={source === 'mine'} onClick={() => setSource('mine')} />
            {source === 'mine' && (
              <div className="ml-3 my-1 pl-3 border-l border-[var(--border-subtle)] space-y-0.5">
                <SubItem label="All" count={images.length + files.length} active={type === 'all'} onClick={() => setType('all')} />
                <SubItem label="Images" count={images.length} active={type === 'images'} onClick={() => setType('images')} />
                <SubItem label="Files" count={files.length} active={type === 'files'} onClick={() => setType('files')} />
              </div>
            )}
            <NavItem icon={Sparkles} label="DigiOne Stock" active={source === 'digione'} onClick={() => setSource('digione')} />
          </nav>

          <StorageMeter used={usedBytes} quota={quotaBytes} />
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets…"
              className="w-full pl-9 pr-9 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

      {/* ── My Assets ── */}
      {source === 'mine' && (
        ownLoading ? (
          <SkeletonGrid />
        ) : mineEmpty ? (
          <Card><EmptyState icon={HardDrive} title="No assets yet" description="Images you upload through the picker and files you add to products appear here." /></Card>
        ) : (
          <div className="space-y-8">
            {showImages && ownImages.length > 0 && (
              <section>
                <SectionLabel icon={ImageIcon} label="Images" count={ownImages.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {ownImages.map((img) => (
                    <ImageCard
                      key={img.id} image={img} copied={copiedId === img.id}
                      onPreview={() => img.url && setPreview({ url: img.url, name: img.name })}
                      onCopy={() => copyUrl(img.id, img.url)}
                      onDelete={() => setDeleteTarget(img)}
                    />
                  ))}
                </div>
              </section>
            )}

            {showFiles && ownFiles.length > 0 && (
              <section>
                <SectionLabel icon={FileIcon} label="Product files" count={ownFiles.length} />
                <Card padded={false}>
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {ownFiles.map((f) => <FileRow key={f.id} file={f} />)}
                  </div>
                </Card>
              </section>
            )}

            {showImages && !showFiles && ownImages.length === 0 && (
              <Card><EmptyState icon={ImageIcon} title="No images" description="Upload images through the picker to see them here." /></Card>
            )}
            {showFiles && !showImages && ownFiles.length === 0 && (
              <Card><EmptyState icon={FileIcon} title="No product files" description="Add deliverable files to a product's Content Files tab." /></Card>
            )}
          </div>
        )
      )}

      {/* ── DigiOne Stock ── */}
      {source === 'digione' && (
        stockLoading ? (
          <SkeletonGrid />
        ) : stockImages.length === 0 ? (
          <Card><EmptyState icon={Sparkles} title="No stock images" description="DigiOne's curated stock library will appear here." /></Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {stockImages.map((s) => (
              <StockCard key={s.id} image={s} copied={copiedId === s.id}
                onPreview={() => setPreview({ url: s.url, name: s.name })}
                onCopy={() => copyUrl(s.id, s.url)} />
            ))}
          </div>
        )
      )}
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white focus-visible:outline-none"><X className="w-6 h-6" /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt={preview.name} className="w-full max-h-[80vh] object-contain rounded-[var(--radius-lg)]" />
            <p className="mt-3 text-center text-white/60 text-xs">{preview.name}</p>
          </div>
        </div>
      )}

      {/* Delete confirm (own images, hard-cascade) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full !shadow-[var(--shadow-lg)]">
            <div className="w-11 h-11 rounded-full bg-[var(--danger-bg)] flex items-center justify-center mb-4"><Trash2 className="w-5 h-5 text-[var(--danger)]" /></div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Delete original?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              This permanently deletes <span className="font-medium text-[var(--text-primary)]">{deleteTarget.name}</span> AND every cropped version made from it. Any product cover, avatar, or banner using those crops will break.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-[var(--border)] rounded-[var(--radius-sm)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-2 bg-[var(--danger)] hover:opacity-90 text-[var(--text-on-brand)] rounded-[var(--radius-sm)] text-sm font-medium transition flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Trash2 className="w-4 h-4" />Delete</button>
            </div>
          </Card>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-medium rounded-[var(--radius-md)] shadow-[var(--shadow-lg)]">
          <Check className="w-4 h-4" />{toast}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ icon: Icon, label, count }: { icon: typeof ImageIcon; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-[var(--text-tertiary)]" />
      <h2 className="text-base font-semibold text-[var(--text-primary)]">{label}</h2>
      <span className="text-xs text-[var(--text-tertiary)]">{count}</span>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square bg-[var(--surface-muted)] rounded-[var(--radius-lg)] animate-pulse" />
      ))}
    </div>
  );
}

function ImageCard({ image, copied, onPreview, onCopy, onDelete }: { image: OwnImage; copied: boolean; onPreview: () => void; onCopy: () => void; onDelete: () => void }) {
  return (
    <Card padded={false} className="group overflow-hidden">
      <div className="relative aspect-square bg-[var(--surface-muted)] overflow-hidden">
        {image.url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={image.url} alt={image.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-[var(--text-tertiary)]" /></div>}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
          <IconBtn title="Preview" onClick={onPreview}><Eye className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn title="Copy URL" onClick={onCopy}>{copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}</IconBtn>
          <IconBtn title="Delete" onClick={onDelete} danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-[var(--text-primary)] truncate" title={image.name}>{image.name}</p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{formatBytes(image.size)}</p>
      </div>
    </Card>
  );
}

function StockCard({ image, copied, onPreview, onCopy }: { image: StockImage; copied: boolean; onPreview: () => void; onCopy: () => void }) {
  return (
    <Card padded={false} className="group overflow-hidden">
      <div className="relative aspect-square bg-[var(--surface-muted)] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={image.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
          <IconBtn title="Preview" onClick={onPreview}><Eye className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn title="Copy URL" onClick={onCopy}>{copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}</IconBtn>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-[var(--text-primary)] truncate" title={image.name}>{image.name}</p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 capitalize">{image.category}</p>
      </div>
    </Card>
  );
}

function FileRow({ file }: { file: OwnFile }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-hover)] transition">
      <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center shrink-0">
        {renderFileIcon(file.name, file.mimeType)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{file.name}</p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {formatBytes(file.size)}{file.productName ? ` · ${file.productName}` : ''} · {fmtDate(file.createdAt)}
        </p>
      </div>
      {file.signedUrl && (
        <a href={file.signedUrl} target="_blank" rel="noreferrer" download className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]" title="Download">
          <Download className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title} className={`p-2 bg-white/90 rounded-[var(--radius-md)] shadow transition hover:bg-white focus-visible:outline-none ${danger ? 'text-[var(--danger)]' : 'text-neutral-800'}`}>
      {children}
    </button>
  );
}

function NavItem({ icon: Icon, label, count, active, onClick }: { icon: typeof FolderOpen; label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'}`}>
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[var(--brand)]' : ''}`} />
      <span className="flex-1 text-left">{label}</span>
      {typeof count === 'number' && <span className="text-[11px] text-[var(--text-tertiary)]">{count}</span>}
    </button>
  );
}

function SubItem({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[12px] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active ? 'text-[var(--brand)] font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-[var(--brand)]' : 'bg-[var(--border-strong)]'}`} />
      <span className="flex-1 text-left">{label}</span>
      <span className="text-[11px] text-[var(--text-tertiary)]">{count}</span>
    </button>
  );
}

function StorageMeter({ used, quota }: { used: number; quota: number }) {
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const free = Math.max(0, quota - used);
  const over = pct >= 90;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xs)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <HardDrive className="w-4 h-4 text-[var(--text-secondary)]" />
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">Files Storage</p>
      </div>
      <div className="h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: over ? 'var(--danger)' : 'var(--brand)' }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-[var(--text-secondary)] font-medium">{formatBytes(used)} used</span>
        <span className="text-[var(--text-tertiary)]">{formatBytes(free)} free</span>
      </div>
      <p className="mt-2.5 text-[10px] leading-relaxed text-[var(--text-tertiary)]">Product files only · {formatBytes(quota)} on your plan</p>
    </div>
  );
}
