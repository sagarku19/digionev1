'use client';
import { ChevronsLeft } from 'lucide-react';
import type { ElementType } from 'react';

export type SidebarItem = {
  id: string;
  label: string;
  icon: ElementType;
  group: 'main' | 'tools';
  comingSoon?: boolean;
};

type Props = {
  items: SidebarItem[];
  active: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export default function EditorSidebar({ items, active, onSelect, collapsed, onToggleCollapse }: Props) {
  const main = items.filter((i) => i.group === 'main');
  const tools = items.filter((i) => i.group === 'tools');
  const width = collapsed ? 'w-[64px]' : 'w-[210px]';

  const Row = (it: SidebarItem) => {
    const isActive = active === it.id;
    return (
      <button
        key={it.id}
        onClick={() => onSelect(it.id)}
        title={it.label}
        className={`flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${collapsed ? 'justify-center' : ''} ${
          isActive
            ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <it.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 truncate text-left">{it.label}</span>}
        {!collapsed && it.comingSoon && (
          <span className="rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">soon</span>
        )}
      </button>
    );
  };

  return (
    <div className={`${width} hidden shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-all duration-200 lg:flex`}>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5">
        {main.map(Row)}
        {tools.length > 0 && (
          <>
            {!collapsed && <p className="px-2.5 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Tools</p>}
            {collapsed && <div className="my-2 h-px bg-[var(--border)]" />}
            {tools.map(Row)}
          </>
        )}
      </div>
      <div className="border-t border-[var(--border)] p-2.5">
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
          className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${collapsed ? 'justify-center' : ''}`}
        >
          <ChevronsLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );
}
