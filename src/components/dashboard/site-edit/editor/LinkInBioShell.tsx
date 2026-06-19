'use client';
// LinkInBioShell — link-in-bio composition of the shared EditorShell:
// the 5-section nav + Tools, and the iPhone PreviewPane on the right.
import { type RefObject, type ElementType, type ReactNode } from 'react';
import { LayoutList, LayoutTemplate, User, Palette, Settings2, BarChart3, GraduationCap, Link2, CalendarDays } from 'lucide-react';
import PreviewPane from './PreviewPane';
import EditorShell from './EditorShell';
import { type SidebarItem } from './EditorSidebar';

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

const SECTION_META: Record<SectionId, string> = {
  profile: 'Your avatar, name, and bio.',
  template: 'Pick a starting layout for your page.',
  content: 'Arrange the blocks visitors see on your page.',
  design: 'Theme, colors, and buttons.',
  settings: 'Link address, SEO, and visibility.',
};

type Props = {
  title: string; typeLabel: string; typeIcon: ElementType; onBack: () => void;
  onNavigate?: (href: string) => void;
  saving: boolean; saved: boolean; dirty?: boolean; onSave: () => void;
  canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void;
  previewUrl: string | null; displayUrl: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>; previewKey: number; onRefresh: () => void;
  sections: Record<SectionId, ReactNode>;
  active?: string;
  onActiveChange?: (id: string) => void;
};

export default function LinkInBioShell(props: Props) {
  return (
    <EditorShell
      siteType="linkinbio"
      storageKey="linkinbio-editor-sidebar"
      nav={NAV}
      sectionMeta={SECTION_META}
      sections={props.sections}
      defaultActive="content"
      title={props.title}
      typeLabel={props.typeLabel}
      typeIcon={props.typeIcon}
      onBack={props.onBack}
      onNavigate={props.onNavigate}
      saving={props.saving}
      saved={props.saved}
      dirty={props.dirty}
      onSave={props.onSave}
      canUndo={props.canUndo}
      canRedo={props.canRedo}
      onUndo={props.onUndo}
      onRedo={props.onRedo}
      active={props.active}
      onActiveChange={props.onActiveChange}
      preview={
        <PreviewPane
          previewUrl={props.previewUrl} displayUrl={props.displayUrl} iframeRef={props.iframeRef}
          previewKey={props.previewKey} onRefresh={props.onRefresh}
        />
      }
    />
  );
}
