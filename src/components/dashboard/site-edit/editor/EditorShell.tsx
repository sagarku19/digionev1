'use client';
// EditorShell — the premium site-editor chrome shared by the link-in-bio and
// single-page editors: sidebar nav · dotted canvas · live preview column.
// Type-specific bits (nav items, section copy, the preview, the page switcher
// filter) are injected via props so each editor type composes its own surface.
import { useEffect, useState, type ReactNode, type ElementType } from 'react';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';
import EditorSidebar, { type SidebarItem, type EditorSiteType } from './EditorSidebar';
import ComingSoon from './ComingSoon';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  // identity / chrome
  title: string; typeLabel: string; typeIcon: ElementType; onBack: () => void;
  onNavigate?: (href: string) => void;
  siteType: EditorSiteType;
  storageKey: string;
  // save state
  saving: boolean; saved: boolean; dirty?: boolean; onSave: () => void;
  // history
  canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void;
  // navigation + bodies
  nav: SidebarItem[];
  sectionMeta: Record<string, string>;
  sections: Record<string, ReactNode>;
  // right column
  preview: ReactNode;
  previewWidthClass?: string;
  contentMaxWidthClass?: string;
  // controlled active section
  active?: string;
  onActiveChange?: (id: string) => void;
  defaultActive?: string;
};

export default function EditorShell(props: Props) {
  const {
    nav, sections, sectionMeta, preview,
    previewWidthClass = 'lg:w-[400px]',
    contentMaxWidthClass = 'max-w-2xl',
    defaultActive,
  } = props;

  const [internalActive, setInternalActive] = useState<string>(defaultActive ?? nav[0]?.id ?? '');
  const active = props.active ?? internalActive;
  const setActive = (id: string) => {
    if (props.onActiveChange) props.onActiveChange(id);
    else setInternalActive(id);
  };

  const [collapsed, setCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(props.storageKey) === 'collapsed');
  }, [props.storageKey]);
  const toggleCollapse = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(props.storageKey, next ? 'collapsed' : 'expanded');
      return next;
    });

  const activeNav = nav.find((n) => n.id === active);
  const inSections = active in sections;
  const sectionBody = inSections
    ? sections[active]
    : <ComingSoon icon={activeNav?.icon} title={activeNav?.label ?? 'Coming soon'} />;

  const ActiveIcon = activeNav?.icon;
  const sectionHeader = inSections && activeNav && ActiveIcon ? (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
        <ActiveIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">{activeNav.label}</h2>
        {sectionMeta[active] && <p className="text-xs text-[var(--text-secondary)]">{sectionMeta[active]}</p>}
      </div>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      {/* mobile tab switch */}
      <div className="flex shrink-0 gap-1 border-b border-[var(--border)] bg-[var(--bg-primary)] p-2 lg:hidden">
        {(['edit', 'preview'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={`flex-1 rounded-[var(--radius-sm)] py-1.5 text-sm font-medium capitalize transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${mobileTab === t ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <EditorSidebar
          items={nav} active={active} onSelect={setActive} collapsed={collapsed} onToggleCollapse={toggleCollapse}
          title={props.title} typeLabel={props.typeLabel} typeIcon={props.typeIcon} onBack={props.onBack}
          onNavigate={props.onNavigate} siteType={props.siteType}
          canUndo={props.canUndo} canRedo={props.canRedo} onUndo={props.onUndo} onRedo={props.onRedo}
        />

        {/* canvas */}
        <div
          className={`relative min-w-0 flex-1 flex-col bg-[var(--editor-bg)] ${mobileTab === 'edit' ? 'flex' : 'hidden'} lg:flex`}
          style={{
            backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* floating Save */}
          <div className="absolute right-4 top-6 z-20 flex flex-col items-end gap-1.5">
            <button
              onClick={props.onSave}
              disabled={props.saving || !props.dirty}
              className={`flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-xs font-semibold shadow-[var(--shadow-sm)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
                props.dirty
                  ? 'bg-[var(--brand)] text-[var(--text-on-brand)] hover:bg-[var(--brand-hover)]'
                  : props.saved
                    ? 'cursor-default bg-[var(--success)] text-[var(--text-on-brand)]'
                    : 'cursor-not-allowed border border-[var(--border)] bg-[var(--surface)] text-[var(--text-tertiary)]'
              }`}
            >
              {props.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : props.dirty ? <Save className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {props.saving ? 'Saving…' : props.dirty ? 'Save' : props.saved ? 'Saved!' : 'Saved'}
            </button>
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${props.dirty ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'}`} />
              <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{props.dirty ? 'Save to apply live' : 'All changes saved'}</span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className={`mx-auto w-full ${contentMaxWidthClass} p-5`}>
              {/* mobile section switcher */}
              <div className="mb-3 flex gap-1 overflow-x-auto lg:hidden">
                {nav.filter((n) => n.group === 'main').map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setActive(n.id)}
                    className={`shrink-0 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${active === n.id ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-secondary)]'}`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {sectionHeader}
                  {sectionBody}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* preview */}
        <div className={`w-full shrink-0 ${previewWidthClass} ${mobileTab === 'preview' ? 'flex' : 'hidden'} lg:flex`}>
          {preview}
        </div>
      </div>
    </div>
  );
}
