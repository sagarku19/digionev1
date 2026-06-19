// Block-type catalogue for the Link-in-Bio editor.
// Drives the "Add block" picker (`AddSectionPicker`) and the section registry.
// The block LIST + per-type editors live in ./blockEditors and the shell's
// `SectionList`; this module is just the categorised type metadata.
import {
  Link as LinkIcon, Package, Type, Minus, Image, Code,
  Share2, Megaphone, Heading1, FileText, ArrowUpDown, ClipboardList,
} from 'lucide-react';

export type { BioLink } from './blockEditors/types';

export const BLOCK_CATEGORIES = [
  {
    label: 'Content',
    types: [
      { id: 'url', label: 'Link', icon: LinkIcon, desc: 'External URL' },
      { id: 'header', label: 'Header', icon: Heading1, desc: 'Title + subtitle' },
      { id: 'text', label: 'Text', icon: FileText, desc: 'Paragraph block' },
      { id: 'heading', label: 'Section Title', icon: Type, desc: 'Simple label' },
      { id: 'divider', label: 'Divider', icon: Minus, desc: 'Visual separator' },
      { id: 'space', label: 'Space', icon: ArrowUpDown, desc: 'Empty vertical gap' },
    ],
  },
  {
    label: 'Commerce & Social',
    types: [
      { id: 'product', label: 'Product', icon: Package, desc: 'Sell a product' },
      { id: 'lead_form', label: 'Lead Form', icon: ClipboardList, desc: 'Collect visitor info' },
      { id: 'social_icons', label: 'Social Icons', icon: Share2, desc: 'Icon row' },
      { id: 'banner', label: 'Banner CTA', icon: Megaphone, desc: 'Call-to-action card' },
    ],
  },
  {
    label: 'Media & Embeds',
    types: [
      { id: 'image', label: 'Image', icon: Image, desc: 'Full-width image' },
      { id: 'html_embed', label: 'HTML / Iframe', icon: Code, desc: 'Custom embed code' },
    ],
  },
];
