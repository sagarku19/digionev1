import { ReactNode } from 'react';

export interface ToolbarProps {
  search?: ReactNode;
  filters?: ReactNode;
  view?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Toolbar({ search, filters, view, actions, className = '' }: ToolbarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {search && <div className="flex-1 min-w-[200px] max-w-md">{search}</div>}
      {filters && <div className="flex items-center gap-2">{filters}</div>}
      {view && <div className="flex items-center gap-2">{view}</div>}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
