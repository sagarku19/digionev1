import type { BioLink } from './blockEditors/types';

// One-line row summary shown under each block title in the section list.
export function summarizeBlock(l: BioLink): string {
  switch (l.link_type) {
    case 'url':
      return [l.title || 'Link', l.url].filter(Boolean).join(' · ');
    case 'header':
      return l.title || 'Header';
    case 'heading':
      return l.title || 'Section title';
    case 'text':
      return (l.metadata?.content as string) || 'Text';
    case 'social_icons': {
      const n = Array.isArray(l.metadata?.links) ? l.metadata.links.length : 0;
      return `${n} platform${n === 1 ? '' : 's'}`;
    }
    case 'lead_form':
      return l.title || 'Lead form';
    case 'product':
      return l.title || 'Product';
    case 'image':
      return l.title || 'Image';
    case 'banner':
      return l.title || 'Banner';
    case 'video_embed':
      return 'Video';
    case 'spotify':
      return 'Spotify';
    case 'html_embed':
      return 'Embed';
    case 'space':
      return 'Spacer';
    case 'divider':
      return 'Divider';
    default:
      return l.link_type;
  }
}
