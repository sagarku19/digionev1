'use client';
// Imperative confirm dialog. Renders the shared designed ConfirmDialog and
// exposes an async `confirm(opts)` that resolves true/false — so any handler
// becomes: `if (await confirm({ title, description })) doThing()`.
import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver.current = resolve;
    setOpts(o);
  }), []);

  const settle = useCallback((v: boolean) => {
    const r = resolver.current;
    resolver.current = null;
    setOpts(null);
    r?.(v);
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      isOpen={!!opts}
      title={opts?.title ?? ''}
      description={opts?.description ?? ''}
      confirmLabel={opts?.confirmLabel ?? 'Delete'}
      cancelLabel={opts?.cancelLabel ?? 'Cancel'}
      isDestructive={opts?.isDestructive ?? true}
      onConfirm={() => settle(true)}
      onClose={() => settle(false)}
    />
  );

  return { confirm, confirmDialog };
}
