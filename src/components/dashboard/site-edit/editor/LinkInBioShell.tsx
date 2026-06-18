'use client';
import { useEffect, useState, type ReactNode, type RefObject, type ElementType } from 'react';
import { LayoutList, User, Palette, Settings2, BarChart3, GraduationCap, Link2, CalendarDays } from 'lucide-react';
import EditorTopBar from './EditorTopBar';
import PreviewPane from './PreviewPane';
import EditorSidebar, { type SidebarItem } from './EditorSidebar';
import ComingSoon from './ComingSoon';
import { AnimatePresence, motion } from 'framer-motion';

type SectionId = 'content' | 'profile' | 'design' | 'settings';

const NAV: SidebarItem[] = [
  { id: 'content', label: 'Content', icon: LayoutList, group: 'main' },
  { id: 'profile', label: 'Profile', icon: User, group: 'main' },
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
  content: 'Arrange the blocks visitors see on your page.',
  profile: 'Your avatar, name, username, and bio.',
  design: 'Theme, colors, fonts, and templates.',
  settings: 'Link address, SEO, and visibility.',
};

type Props = {
  // top bar
  title: string; typeLabel: string; typeIcon: ElementType; onBack: () => void;
  saving: boolean; saved: boolean; onSave: () => void;
  canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void;
  theme: 'light' | 'dark'; onToggleTheme: () => void;
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
      <EditorTopBar
        title={props.title} typeLabel={props.typeLabel} typeIcon={props.typeIcon} onBack={props.onBack}
        saving={props.saving} saved={props.saved} onSave={props.onSave}
        canUndo={props.canUndo} canRedo={props.canRedo} onUndo={props.onUndo} onRedo={props.onRedo}
        theme={props.theme} onToggleTheme={props.onToggleTheme}
        displayUrl={props.displayUrl}
      />

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
        <EditorSidebar items={NAV} active={active} onSelect={setActive} collapsed={collapsed} onToggleCollapse={toggleCollapse} />

        {/* canvas */}
        <div className={`min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--bg-primary)] ${mobileTab === 'edit' ? 'flex' : 'hidden'} lg:flex`}>
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
