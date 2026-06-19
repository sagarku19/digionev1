import type { BioLink } from './blockEditors/types';
import type { SectionRegistry, SectionDef } from '../../shell/types';
import { BLOCK_CATEGORIES } from './BioLinksEditor';
import { summarizeBlock } from './summarize';

// Build the shell registry from the existing block categories. Each category's
// `types` entries already carry { id, label, icon }, so we map them 1:1 and
// attach the shared summarize().
export const linkinbioRegistry: SectionRegistry<BioLink> = {
  categories: BLOCK_CATEGORIES.map((c) => ({ id: c.label, label: c.label })),
  defs: BLOCK_CATEGORIES.reduce<Record<string, SectionDef<BioLink>>>((acc, cat) => {
    for (const t of cat.types) {
      acc[t.id] = {
        type: t.id,
        label: t.label,
        icon: t.icon,
        categoryId: cat.label,
        description: t.desc,
        summarize: summarizeBlock,
      };
    }
    return acc;
  }, {}),
};
