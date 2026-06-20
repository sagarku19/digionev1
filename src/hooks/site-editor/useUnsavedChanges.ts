'use client';
// Shared unsaved-changes guard for the site editors.
// Owns the pending-navigation target, the in-app leave intercept, and the
// browser beforeunload prompt. Pair with <UnsavedChangesDialog>.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useUnsavedChanges(dirty: boolean, onSave: () => Promise<void> | void) {
  const router = useRouter();
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  const guardedNavigate = useCallback(
    (href: string) => { if (dirty) setPendingNav(href); else router.push(href); },
    [dirty, router],
  );
  const cancel = useCallback(() => setPendingNav(null), []);
  const discardAndLeave = useCallback(() => {
    const href = pendingNav;
    setPendingNav(null);
    if (href) router.push(href);
  }, [pendingNav, router]);
  const saveAndLeave = useCallback(async () => {
    await onSave();
    const href = pendingNav;
    setPendingNav(null);
    if (href) router.push(href);
  }, [onSave, pendingNav, router]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  return { pendingNav, guardedNavigate, cancel, discardAndLeave, saveAndLeave };
}
