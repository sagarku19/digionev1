import { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumbs?: ReactNode;
}

export function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
      <div>
        {breadcrumbs && (
          <div className="mb-2 text-sm text-[var(--color-text-tertiary)]">
            {breadcrumbs}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--color-text-primary)] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm sm:text-base text-[var(--color-text-secondary)] max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 flex items-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
}
