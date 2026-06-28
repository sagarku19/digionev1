'use client';
// Media Library — unified asset gallery.
//  • My Assets: own media images (digione-media) + deliverable files (digione-products, signed)
//  • DigiOne Stock: read-only public stock images (public_images)
// Data via TanStack hooks (useOwnAssets / useDigioneStock). Tokens only, lucide only.

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ImageIcon, FileText, File as FileIcon, Archive, Copy, Check, Trash2,
  Download, Eye, X, FolderOpen, Sparkles, HardDrive, Package, Pencil,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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

  const ownImages = images;
  const ownFiles = files;
  const stockImages = stock;

  const showImages = type === 'all' || type === 'images';
  const showFiles = type === 'all' || type === 'files';
  const mineEmpty = ownImages.length === 0 && ownFiles.length === 0;

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
            <NavItem icon={Sparkles} label="DigiOne Stock Images" active={source === 'digione'} onClick={() => setSource('digione')} />
          </nav>

          <StorageMeter used={usedBytes} quota={quotaBytes} />
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">

      {/* ── My Assets ── */}
      {source === 'mine' && (
        ownLoading ? (
          <SkeletonGrid />
        ) : mineEmpty ? (
          <Card><EmptyState icon={HardDrive} title="No assets yet" description="Images you upload through the picker and files you add to products appear here." /></Card>
        ) : (
          <div className="space-y-8">
            {showFiles && ownFiles.length > 0 && (
              <section>
                <SectionLabel icon={FileIcon} label="Product files" count={ownFiles.length} />
                <div className="space-y-3">
                  {groupFilesByProduct(ownFiles).map((group) => (
                    <ProductFileGroup key={group.productId ?? 'unassigned'} group={group} />
                  ))}
                </div>
              </section>
            )}

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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { deleteImage(deleteTarget.id); showToast('Deleted'); } }}
        title="Delete original?"
        description={deleteTarget ? `This permanently deletes "${deleteTarget.name}" AND every cropped version made from it. Any product cover, avatar, or banner using those crops will break.` : ''}
        confirmLabel="Delete"
        isDestructive
      />

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

interface ProductGroup {
  productId: string | null;
  productName: string | null;
  productCover: string | null;
  files: OwnFile[];
  totalBytes: number;
  latestAt: string;
}

function groupFilesByProduct(files: OwnFile[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  for (const f of files) {
    const key = f.productId ?? '__unassigned__';
    let g = map.get(key);
    if (!g) {
      g = { productId: f.productId, productName: f.productName, productCover: f.productCover, files: [], totalBytes: 0, latestAt: f.createdAt };
      map.set(key, g);
    }
    g.files.push(f);
    g.totalBytes += f.size;
    if (f.createdAt > g.latestAt) g.latestAt = f.createdAt;
  }
  // Newest first — most recently added / edited products on top.
  return [...map.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

function ProductFileGroup({ group }: { group: ProductGroup }) {
  const title = group.productName ?? 'Unassigned files';
  const count = group.files.length;

  const headerInner = (
    <>
      <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
        {group.productCover
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={group.productCover} alt={title} className="w-full h-full object-cover" />
          : group.productId
            ? <Package className="w-5 h-5 text-[var(--text-tertiary)]" />
            : <FolderOpen className="w-5 h-5 text-[var(--text-tertiary)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors" title={title}>{title}</p>
          {group.productId && (
            <span className="inline-flex items-center gap-1.5 shrink-0 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors group-hover:border-[var(--brand)] group-hover:bg-[var(--brand)] group-hover:text-[var(--text-on-brand)]">
              <Pencil className="w-3 h-3" /> Edit
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{count} file{count !== 1 ? 's' : ''} · {formatBytes(group.totalBytes)}</p>
      </div>
      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Last updated</p>
        <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-0.5">{fmtDate(group.latestAt)}</p>
      </div>
    </>
  );

  return (
    <Card padded={false} className="group overflow-hidden">
      {group.productId ? (
        <Link
          href={`/dashboard/products/${group.productId}`}
          title={`Edit ${title}`}
          className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          {headerInner}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
          {headerInner}
        </div>
      )}
      <div className="divide-y divide-[var(--border-subtle)]">
        {group.files.map((f) => <FileRow key={f.id} file={f} />)}
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
          {formatBytes(file.size)} · {fmtDate(file.createdAt)}
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
