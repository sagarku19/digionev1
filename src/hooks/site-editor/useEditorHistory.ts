'use client';
// Undo/redo + dirty tracking for the site editors, in one place.
//
// Combining history and dirty state fixes the cross-effect ordering bug the
// hand-rolled copies had: a single effect both schedules the snapshot and marks
// dirty, and it short-circuits during a restore — so undo/redo never spuriously
// marks the editor dirty, and the restore flag can't be reset before both
// concerns observe it.
//
// `deps` is the editor's tracked state. `build` snapshots it; `apply` restores
// a snapshot. The first post-load run captures a baseline (no dirty); later
// changes mark dirty and debounce a snapshot.
import { useCallback, useEffect, useRef, useState } from 'react';

export function useEditorHistory<T>({
  build,
  apply,
  deps,
  enabled,
  max = 50,
}: {
  build: () => T;
  apply: (snap: T) => void;
  deps: unknown[];
  enabled: boolean;
  max?: number;
}) {
  const historyRef = useRef<T[]>([]);
  const indexRef = useRef(-1);
  const restoringRef = useRef(false);
  const initRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const bump = () => setVersion((v) => v + 1);

  // Latest closures in refs so the effect can stay keyed on `deps` only.
  const buildRef = useRef(build);
  buildRef.current = build;
  const applyRef = useRef(apply);
  applyRef.current = apply;

  const pushSnapshot = useCallback(() => {
    const snap = buildRef.current();
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > max) historyRef.current.shift();
    indexRef.current = historyRef.current.length - 1;
    bump();
  }, [max]);

  useEffect(() => {
    if (!enabled) return;
    if (restoringRef.current) { restoringRef.current = false; return; }
    const firstRun = !initRef.current;
    initRef.current = true;
    if (!firstRun) setDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(pushSnapshot, firstRun ? 0 : 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pushSnapshot, ...deps]);

  const restore = useCallback((snap: T) => {
    restoringRef.current = true;
    applyRef.current(snap);
    bump();
  }, []);

  const canUndo = version >= 0 && indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    restore(historyRef.current[indexRef.current]);
  }, [restore]);
  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    restore(historyRef.current[indexRef.current]);
  }, [restore]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return { canUndo, canRedo, undo, redo, dirty, setDirty };
}
