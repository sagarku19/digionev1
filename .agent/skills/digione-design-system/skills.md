---
name: digione-design-system
description: Use when building any UI component, page layout, or styling.
  Triggers on: "component", "page", "layout", "design", "styling", "UI", "dark mode"
---

# DigiOne Design System

## Brand colours (DigiOne pages)
--dg-indigo: #6366F1  (primary brand)
--dg-violet: #8B5CF6
--dg-pink:   #EC4899
--dg-bg:     #060612  (page background)
--dg-text:   #F8FAFC

## Storefront colours (from site_design_tokens — injected per creator)
var(--store-primary), var(--store-text), var(--store-surface)
→ Never hardcode creator storefront colours

## Typography
DigiOne brand pages: Inter body, Bricolage Grotesque for display
Storefronts: var(--store-font-heading), var(--store-font-body)

## Animation
Entry: whileInView={{ opacity:1, y:0 }} initial={{ opacity:0, y:24 }}
Ease: cubic-bezier(0.16, 1, 0.3, 1)
Stagger children: 0.06s delay

## Key layout constants
Sidebar: 240px fixed width
Dashboard content: calc(100vw - 240px), max-width 1200px, padding 24px
Card radius: 12px (var(--border-radius-lg))
Status pills: completed=green, pending=amber, failed=red, refunded=slate