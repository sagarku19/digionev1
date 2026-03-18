---
description: Build a new storefront section component for the SectionRenderer
---

## Steps
### 1. Read the spec
Read docs/digione_public_pages_design.md §5 for the section type definition.
Note the settings fields from site_sections_config.sections jsonb.

### 2. Create the component
Path: src/components/store/sections/{SectionType}.tsx
Props: settings (typed from section config), theme (from site_design_tokens), products[] if needed.
Must support: responsive (mobile-first), dark and light creator themes, Framer Motion entry animation.

### 3. Register in SectionRenderer
Update src/components/store/SectionRenderer.tsx — add case for new section_type.

### 4. Add settings form to Site Customizer
Update app/dashboard/sites/[siteId]/customize — add settings panel for this section.

### 5. Verify
Test with Arjun's seed store at localhost:3000/arjun.
Check mobile at 390px viewport.