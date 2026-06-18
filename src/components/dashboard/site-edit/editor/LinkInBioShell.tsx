'use client';
import { useEffect, useState, type ReactNode, type RefObject, type ElementType } from 'react';
import { LayoutList, LayoutTemplate, User, Palette, Settings2, BarChart3, GraduationCap, Link2, CalendarDays, Undo2, Redo2, Save, Loader2, CheckCircle2 } from 'lucide-react';
import PreviewPane from './PreviewPane';
import EditorSidebar, { type SidebarItem } from './EditorSidebar';
import ComingSoon from './ComingSoon';
import { AnimatePresence, motion } from 'framer-motion';

type SectionId = 'profile' | 'template' | 'content' | 'design' | 'settings';

const NAV: SidebarItem[] = [
  { id: 'profile', label: 'Profile', icon: User, group: 'main' },
  { id: 'template', label: 'Template', icon: LayoutTemplate, group: 'main' },
  { id: 'content', label: 'Content', icon: LayoutList, group: 'main' },
  { id: 'design', label: 'Design', icon: Palette, group: 'main' },
  { id: 'settings', label: 'Settings', icon: Settings2, group: 'main' },
  { id: 'insights', label: 'Insights', icon: BarChart3, group: 'tools', comingSoon: true },
  { id: 'course', label: 'Course', icon: GraduationCap, group: 'tools', comingSoon: true },
  { id: 'link-shortener', label: 'Link shortener', icon: Link2, group: 'tools', comingSoon: true },
  { id: 'social-planner', label: 'Social planner', icon: CalendarDays, group: 'tools', comingSoon: true },
];

const COMING_SOON: Record<string, { label: string; icon: ElementType }> = {
  insights: { label: 'Insights', icon: BarChart3 },
  course: { label: 'Course', icon: GraduationCap },
  'link-shortener': { label: 'Link shortener', icon: Link2 },
  'social-planner': { label: 'Social planner', icon: CalendarDays },
};

const SECTION_META: Record<SectionId, string> = {
  profile: 'Your avatar, name, and bio.',
  template: 'Pick a starting layout for your page.',
  content: 'Arrange the blocks visitors see on your page.',
  design: 'Theme, colors, and buttons.',
  settings: 'Link address, SEO, and visibility.',
};

type Props = {
  // top bar
  title: string; typeLabel: string; typeIcon: ElementType; onBack: () => void;
  saving: boolean; saved: boolean; onSave: () => void;
  canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void;
  // preview
  previewUrl: string | null; displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>; previewKey: number; onRefresh: () => void;
  // section bodies
  sections: Record<SectionId, ReactNode>;
  // optional controlled section nav
  active?: string;
  onActiveChange?: (id: string) => void;
};

export default function LinkInBioShell(props: Props) {
  const { sections } = props;
  const [internalActive, setInternalActive] = useState<string>('content');
  const active = props.active ?? internalActive;
  const setActive = (id: string) => {
    if (props.onActiveChange) props.onActiveChange(id);
    else setInternalActive(id);
  };

  const [collapsed, setCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    // Client-only: hydrate the collapse preference from localStorage after mount
    // (avoids an SSR hydration mismatch on the sidebar width).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem('linkinbio-editor-sidebar') === 'collapsed');
  }, []);
  const toggleCollapse = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('linkinbio-editor-sidebar', next ? 'collapsed' : 'expanded');
      return next;
    });

  const sectionBody =
    active in sections
      ? sections[active as SectionId]
      : <ComingSoon icon={COMING_SOON[active]?.icon} title={COMING_SOON[active]?.label ?? 'Coming soon'} />;

  const activeNav = NAV.find((n) => n.id === active);
  const ActiveIcon = activeNav?.icon;
  const sectionHeader = active in sections && activeNav && ActiveIcon ? (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
        <ActiveIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">{activeNav.label}</h2>
        <p className="text-xs text-[var(--text-secondary)]">{SECTION_META[active as SectionId]}</p>
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
          items={NAV} active={active} onSelect={setActive} collapsed={collapsed} onToggleCollapse={toggleCollapse}
          title={props.title} typeLabel={props.typeLabel} typeIcon={props.typeIcon} onBack={props.onBack}
        />

        {/* canvas */}
        <div className={`min-w-0 flex-1 flex-col bg-[var(--bg-primary)] ${mobileTab === 'edit' ? 'flex' : 'hidden'} lg:flex`}>
          {/* canvas toolbar: undo/redo (left) · Save (right) */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-2.5">
            <div className="flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] p-1">
              <button onClick={props.onUndo} disabled={!props.canUndo} title="Undo" aria-label="Undo" className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Undo2 className="h-4 w-4" /></button>
              <button onClick={props.onRedo} disabled={!props.canRedo} title="Redo" aria-label="Redo" className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"><Redo2 className="h-4 w-4" /></button>
            </div>
            <button onClick={props.onSave} disabled={props.saving} className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 ${props.saved ? 'bg-[var(--success)] text-[var(--text-on-brand)]' : 'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]'}`}>
              {props.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : props.saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {props.saved ? 'Saved!' : 'Save'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl p-5">
            {/* mobile section switcher */}
            <div className="mb-3 flex gap-1 overflow-x-auto lg:hidden">
              {NAV.filter((n) => n.group === 'main').map((n) => (
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
        <div className={`w-full shrink-0 lg:w-[400px] ${mobileTab === 'preview' ? 'flex' : 'hidden'} lg:flex`}>
          <PreviewPane
            previewUrl={props.previewUrl} displayUrl={props.displayUrl} iframeRef={props.iframeRef}
            previewKey={props.previewKey} onRefresh={props.onRefresh}
          />
        </div>
      </div>
    </div>
  );
}
