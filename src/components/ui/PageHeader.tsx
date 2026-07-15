import { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumbs?: ReactNode;
  /** Optional back control (e.g. `<BackButton />`) rendered inline before the title. */
  back?: ReactNode;
}

export function PageHeader({ title, description, action, breadcrumbs, back }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mt-6 mb-4">
      <div className="flex items-start gap-3 min-w-0">
        {back && <div className="shrink-0 mt-0.5">{back}</div>}
        <div className="min-w-0">
          {breadcrumbs && (
            <div className="mb-2 text-sm text-[var(--text-tertiary)]">
              {breadcrumbs}
            </div>
          )}
          <h1 className="text-2xl font-semibold font-display text-[var(--text-primary)] tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
