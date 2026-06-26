'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { ZoomIn, ZoomOut, RotateCcw, Check, ChevronLeft, Loader2 } from 'lucide-react';

const ASPECT_RATIOS = [
  { label: '9:16', value: 9 / 16 },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:5', value: 4 / 5 },
  { label: 'Free', value: 0 },
] as const;

const CHIP_ON = 'bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/30';
const CHIP_OFF = 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border)]';
const BTN = 'px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

export interface CropStageProps {
  imageSrc: string;
  busy?: boolean;
  initialAspectIdx?: number;
  onConfirm: (croppedAreaPixels: Area) => void;
  onUseOriginal: () => void;
  onBack: () => void;
}

export default function CropStage({ imageSrc, busy, initialAspectIdx = 1, onConfirm, onUseOriginal, onBack }: CropStageProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectIdx, setAspectIdx] = useState(initialAspectIdx);
  const areaRef = useRef<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const currentAspect = ASPECT_RATIOS[aspectIdx];

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    areaRef.current = pixels;
    // Live preview: draw the cropped region to a small canvas (debounced via rAF).
    requestAnimationFrame(() => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        const max = 96;
        const scale = Math.min(max / pixels.width, max / pixels.height, 1);
        c.width = Math.max(1, Math.round(pixels.width * scale));
        c.height = Math.max(1, Math.round(pixels.height * scale));
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, c.width, c.height);
        try { setPreview(c.toDataURL('image/webp')); } catch { /* tainted (cross-origin) — skip preview */ }
      };
      img.src = imageSrc;
    });
  }, [imageSrc]);

  const confirm = useCallback(() => { if (areaRef.current) onConfirm(areaRef.current); }, [onConfirm]);

  // Keyboard: Enter confirms, Esc backs out, arrows nudge the crop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === 'Enter') { e.preventDefault(); confirm(); }
      else if (e.key === 'Escape') { e.preventDefault(); onBack(); }
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 5;
        setCrop((c) => ({
          x: c.x + (e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0),
          y: c.y + (e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0),
        }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, confirm, onBack]);

  const previewBox = useMemo(() => ({
    aspectRatio: currentAspect.value ? `${currentAspect.value}` : '1',
  }), [currentAspect.value]);

  return (
    <div className="flex flex-col">
      <div className="relative w-full h-[22rem] bg-[var(--bg-tertiary)]">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={currentAspect.value || undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          cropShape="rect"
          showGrid
          style={{ containerStyle: { background: 'var(--bg-tertiary)' } }}
        />
      </div>

      <div className="p-4 space-y-3 border-t border-[var(--border)]">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Aspect Ratio</label>
              <div className="flex gap-1.5 flex-wrap">
                {ASPECT_RATIOS.map((r, i) => (
                  <button key={r.label} onClick={() => setAspectIdx(i)} className={`${BTN} border ${aspectIdx === i ? CHIP_ON : CHIP_OFF}`}>{r.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Zoom</label>
              <div className="flex items-center gap-3">
                <ZoomOut className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--brand)] h-1.5" />
                <ZoomIn className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                <button onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }} title="Reset" className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="shrink-0">
            <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Preview</label>
            <div className="w-24 rounded-[var(--radius-md)] overflow-hidden border border-[var(--border)] bg-[var(--surface-muted)]" style={previewBox}>
              {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-muted)]">
        <button onClick={onBack} disabled={busy} className={`${BTN} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-1`}>
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onUseOriginal} disabled={busy} className={`${BTN} text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5`}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Use Original
          </button>
          <button onClick={confirm} disabled={busy} className={`${BTN} bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] flex items-center gap-1.5`}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Crop &amp; Add
          </button>
        </div>
      </div>
    </div>
  );
}
