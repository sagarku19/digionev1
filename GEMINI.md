---
noteId: "33c6afb05a6211f183978dfe119e58b2"
tags: []

---

# DigiOne — Gemini CLI Handbook

> **All project rules are shared with Claude Code.** This file imports `CLAUDE.md`
> and the auto-loaded rules so a single source of truth governs both assistants.
> If the imports below ever break, just open and read each file directly.

@./CLAUDE.md
@./.claude/rules/agent-roles.md
@./.claude/rules/mcp-tools.md
@./.claude/rules/feature-checklists.md
@./.claude/rules/hooks-reference.md
@./.claude/rules/data-patterns.md
@./.claude/rules/anti-patterns.md

---

## Gemini-specific notes

These are the only places Gemini CLI diverges from the shared rules above:

| Topic | Mapping |
|---|---|
| Skill invocation | Use Gemini's `activate_skill` tool (Claude Code uses the `Skill` tool — same skills, different tool name) |
| File search | Use Gemini's grep/glob/read primitives (Claude Code's `Glob` / `Grep` / `Read` are the same operations) |
| MCP tools | The `code-review-graph` MCP server in `.claude/rules/mcp-tools.md` works in Gemini if connected — names are identical |
| Personal overrides | This project uses `CLAUDE.local.md` (gitignored). Gemini does **not** auto-load that file — if you want Gemini-only overrides, create `GEMINI.local.md` and add it to `.gitignore` |

## Maintenance

GEMINI.md should not contain duplicate rules. When the codebase changes, update
CLAUDE.md or the relevant `.claude/rules/*.md` file — both assistants will pick it up.
Run `/sync-docs` from Claude Code (or ask Gemini to "audit CLAUDE.md vs the code")
to verify alignment.
