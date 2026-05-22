---
noteId: "185b42d055bd11f1b7be799ad997d0e5"
tags: []

---

# Design: Web Design Search Agent (Claude Code Skill)

**Date:** 2026-05-22  
**Status:** Approved

---

## Overview

A Claude Code slash command skill invoked as `/design <query>`. The agent searches the web for design inspiration relevant to the query, fetches content from design-rich sources, and prints a structured terminal report covering colors, layout patterns, typography, and component patterns.

This is a standalone skill — not part of the DigiOne dashboard. It runs inside any Claude Code session.

---

## Architecture

### Entry Point
- File: `.claude/commands/design.md`
- Invocation: `/design <query string>`
- The query is passed as `$ARGUMENTS` inside the skill

### Execution Flow

```
User runs /design <query>
  → Skill reads query from $ARGUMENTS
  → Runs 3-4 targeted WebSearch calls against design sources
  → Fetches top 2-3 result pages with WebFetch
  → Synthesizes content into structured output
  → Prints formatted markdown report to terminal
```

### Search Strategy

The agent runs searches targeting high-signal design sources:
- `site:refactoringui.com <query>`
- `site:smashingmagazine.com <query> UI design`
- `tailwind <query> component pattern`
- `shadcn <query> design`
- `<query> UI design pattern 2024`

Fetches top 2–3 URLs per search, extracts relevant text content.

---

## Output Structure

Every invocation produces a report with these fixed sections:

```
## Design Research: "<query>"

### Color Palette
- 3–5 color suggestions with hex values and roles (background, surface, accent, text)

### Layout Patterns
- Specific layout decisions: dimensions, spacing, alignment, hierarchy

### Typography
- Font size, weight, tracking, line-height recommendations

### Component Patterns
- Interaction patterns, states (hover, active, focus), animation timing

### Sources
- Linked list of pages the agent read
```

---

## Constraints

- Output is printed to terminal only — no file writes
- Uses only built-in Claude Code tools: `WebSearch`, `WebFetch`
- No new npm packages or dependencies
- No DigiOne codebase changes — purely a `.claude/commands/` skill file
- Sections are always present even if sparse (agent notes "no strong signal found" rather than omitting)

---

## Success Criteria

- `/design dark sidebar navigation` returns actionable color + layout suggestions in under 60 seconds
- Output is consistently structured across different query types
- Sources are always included and linkable
- Works in any Claude Code session (not DigiOne-specific)
