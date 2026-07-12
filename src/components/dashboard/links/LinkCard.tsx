'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, BarChart2, Lock, MoreHorizontal, Pencil, Trash2, Pause, Play, Link2, Archive, ArchiveRestore, type LucideIcon } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { QRButton } from './QRButton';
import { shortUrl } from '@/lib/shared/shortlink';
import type { ShortLink } from '@/hooks/marketing/useShortLinks';

function faviconUrl(destination: string): string | null {
  try {
    const host = new URL(destination).host;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

function statusOf(link: ShortLink): string {
  if (link.archived_at) return 'archived';
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return 'expired';
  return link.is_active ? 'active' : 'inactive';
}

export function LinkCard({
  link, onEdit, onToggle, onArchive, onDelete,
}: {
  link: ShortLink;
  onEdit: (l: ShortLink) => void;
  onToggle: (l: ShortLink) => void;
  onArchive: (l: ShortLink) => void;
  onDelete: (l: ShortLink) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const url = shortUrl(link.code);
  const fav = faviconUrl(link.destination_url);

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-hover)] transition group">
      {/* Favicon well */}
      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 overflow-hidden">
        {fav && imgOk ? (
          <img src={fav} alt="" className="w-5 h-5" onError={() => setImgOk(false)} />
        ) : (
          <Link2 className="w-4 h-4 text-[var(--text-tertiary)]" />
        )}
      </div>

      {/* Main */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{url}</span>
          <button onClick={copy} title="Copy" className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <QRButton url={url} label={link.code} />
          {link.password_hash ? <Lock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" aria-label="Password protected" /> : null}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--text-secondary)] truncate">{link.destination_url}</span>
          {(link.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">#{t}</span>
          ))}
        </div>
      </div>

      {/* Clicks */}
      <Link
        href={`/dashboard/links/${link.id}`}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded px-1"
      >
        <BarChart2 className="w-4 h-4" />
        <span className="font-semibold text-[var(--text-primary)]">{link.click_count.toLocaleString('en-IN')}</span>
        <span className="hidden sm:inline text-xs">clicks</span>
      </Link>

      <StatusPill status={statusOf(link)} />

      {/* Overflow */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenu((v) => !v)}
          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div
              className="absolute right-0 top-full mt-1 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] py-1 z-20"
              onMouseLeave={() => setMenu(false)}
            >
              <MenuItem icon={Pencil} label="Edit" onClick={() => { setMenu(false); onEdit(link); }} />
              <MenuItem
                icon={link.is_active ? Pause : Play}
                label={link.is_active ? 'Pause' : 'Resume'}
                onClick={() => { setMenu(false); onToggle(link); }}
              />
              <MenuItem icon={link.archived_at ? ArchiveRestore : Archive} label={link.archived_at ? 'Unarchive' : 'Archive'} onClick={() => { setMenu(false); onArchive(link); }} />
              <MenuItem icon={Trash2} label="Delete" danger onClick={() => { setMenu(false); onDelete(link); }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: {
  icon: LucideIcon; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
        danger
          ? 'text-[var(--danger)] hover:bg-[var(--danger-bg)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
