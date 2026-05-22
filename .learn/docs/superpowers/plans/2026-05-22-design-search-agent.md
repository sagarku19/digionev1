---
noteId: "70bfe48055bd11f1b7be799ad997d0e5"
tags: []

---

# Design Search Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `/design <query>` Claude Code slash command that searches the web for UI design inspiration and prints a structured terminal report covering colors, layout patterns, typography, and component patterns.

**Architecture:** A single `.claude/commands/design.md` skill file. When invoked, it uses `WebSearch` to query design-rich sources (Refactoring UI, Smashing Magazine, Tailwind, shadcn), fetches the top results with `WebFetch`, synthesizes the content, and prints a fixed-structure markdown report. No DigiOne codebase changes. No new packages.

**Tech Stack:** Claude Code skills (Markdown), WebSearch tool, WebFetch tool

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `.claude/commands/design.md` | The slash command skill — full agent instructions |

---

### Task 1: Create the `/design` skill file

**Files:**
- Create: `.claude/commands/design.md`

This is the only file in this plan. The entire agent lives here.

- [ ] **Step 1: Create `.claude/commands/design.md` with the following exact content**

```markdown
You are a design research agent. Your job is to search the web for UI/UX design inspiration based on the user's query, then synthesize what you find into a structured, actionable design report printed to the terminal.

Query: $ARGUMENTS

---

## Instructions

### Step 1 — Run targeted web searches

Run ALL of the following searches in parallel using the WebSearch tool:

1. `$ARGUMENTS UI design pattern site:smashingmagazine.com`
2. `$ARGUMENTS component design tailwind`
3. `$ARGUMENTS UI design shadcn example`
4. `$ARGUMENTS design system color layout 2024`

### Step 2 — Fetch the most relevant pages

From the search results, pick the 3 most relevant URLs (prefer articles over homepages, prefer pages with concrete design examples). Fetch each using WebFetch.

Skip URLs that are paywalled, require login, or return empty content. If a fetch fails, move on to the next result.

### Step 3 — Synthesize and print the report

Read the fetched content carefully. Extract concrete, specific design decisions — not vague advice. Then print the following report structure exactly. Every section must be present. If you found no strong signal for a section, write "No strong signal found for this query — consider searching [suggested alternative query]."

---

## Design Research: "$ARGUMENTS"

### Color Palette
List 4–6 specific color suggestions with hex values and their roles. Example format:
- `#0F0F11` — page background (near-black base)
- `#1E1E2E` — surface / card background
- `#6366F1` — primary accent / interactive elements
- `#E2E8F0` — primary text
- `#94A3B8` — muted / secondary text
- `#2A2A3E` — border / divider

### Layout Patterns
List 4–6 specific layout decisions with exact values where possible. Example format:
- Sidebar: fixed 240px, collapses to 64px icon-only at < 768px
- Nav item height: 40px, padding: 8px 12px
- Active state: 3px left accent border + 8% background fill
- Content area: max-width 1200px, 24px horizontal padding

### Typography
List 4–6 specific typography decisions. Example format:
- Nav labels: 14px / font-medium / leading-5
- Section dividers: 11px / font-semibold / uppercase / tracking-wider / text-muted
- Badge/count text: 11px / tabular-nums
- Page headings: 24px / font-bold / tracking-tight

### Component Patterns
List 4–6 specific interaction or component patterns. Example format:
- Hover: background transition 150ms ease-in-out
- Focus ring: 2px offset, accent color, rounded
- Tooltip: appear on collapsed icon-only nav items, 200ms delay
- Avatar: 32px circle, initials fallback with brand color background
- Empty state: centered icon + heading + CTA button

### Sources
List every URL you fetched, as markdown links. If a page had no useful content, still list it with "(no useful content)" noted.

---

After printing the report, add this footer:

---
*Run `/design <different query>` to search for something else.*
```

- [ ] **Step 2: Verify the file exists and is readable**

Run in terminal:
```
cat .claude/commands/design.md
```
Expected: full file content printed with no errors.

- [ ] **Step 3: Test the skill**

In a Claude Code session, run:
```
/design dark sidebar navigation
```

Expected output: A formatted report with all 5 sections (Color Palette, Layout Patterns, Typography, Component Patterns, Sources) populated with specific values. Sources section must contain at least 2 URLs.

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/design.md
git commit -m "feat: add /design slash command for web design inspiration research"
```

Expected: commit succeeds, no hook failures.

---

## Self-Review

**Spec coverage check:**
- [x] Slash command at `.claude/commands/design.md` — covered in Task 1 Step 1
- [x] Uses WebSearch targeting design sources — covered in Step 1 of skill instructions
- [x] Uses WebFetch to read pages — covered in Step 2 of skill instructions
- [x] Fixed output structure (Color, Layout, Typography, Components, Sources) — covered in Step 3
- [x] Prints to terminal only, no file writes — skill has no Write tool calls
- [x] No new packages or DigiOne codebase changes — confirmed, single file

**Placeholder scan:** None found. All steps have exact content.

**Type consistency:** N/A — no code types in a markdown skill file.
