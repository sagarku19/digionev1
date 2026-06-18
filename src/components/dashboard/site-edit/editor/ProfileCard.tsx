'use client';
import { Pencil } from 'lucide-react';

type Props = {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  onEdit: () => void;
};

export default function ProfileCard({ name, username, bio, avatarUrl, onEdit }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{name || 'Your name'}</p>
        <p className="truncate text-xs text-[var(--text-tertiary)]">
          {username ? `@${username}` : 'username'}{bio ? ` · ${bio}` : ''}
        </p>
      </div>
      <button
        onClick={onEdit}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>
    </div>
  );
}
