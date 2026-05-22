---
noteId: "5e98555055b111f182ef899b3c9e17b9"
tags: []

---

# Installed Plugins (5 total)

## frontend-design
- **Skill:** `/frontend-design`
- **Purpose:** Generates production-grade, distinctive UI — avoids generic AI aesthetics
- **Use when:** Building components, pages, layouts, empty states, redesigning sections
- **Example:** `/frontend-design redesign the earnings page stat cards with a premium feel`
- **Watch out:** Does not auto-read CLAUDE.md — remind it to use `var(--bg-primary)` CSS vars, `lucide-react` only, Tailwind only

---

## supabase
- **Skills:** `/supabase`, `/supabase-postgres-best-practices`
- **MCP Tools:** Supabase MCP server (auth, database, storage, edge functions)
- **Purpose:** Any task involving Supabase — schema, RLS, auth, migrations, queries
- **Use when:** Auth issues, RLS policies, schema changes, query optimization, storage
- **Example:** `/supabase check RLS policies on the orders table`

---

## context7
- **MCP Tools:** `query-docs`, `resolve-library-id`
- **Purpose:** Fetches live, up-to-date docs for any library/framework — more reliable than training data
- **Use when:** Debugging library APIs, checking Next.js App Router patterns, Tailwind v4 syntax, Supabase JS client
- **Auto-triggers:** When you ask about a library Claude may give outdated answers for
- **Example:** Ask about `@supabase/ssr` cookie handling — context7 fetches the current docs

---

## superpowers
- **Skills (14):**

| Skill | When to use |
|---|---|
| `using-superpowers` | Start of any conversation — establishes how to find and use skills |
| `brainstorming` | Before any creative work — features, components, UI, behavior changes |
| `writing-plans` | When you have a spec for a multi-step task, before touching code |
| `executing-plans` | Running a written plan in a separate session with review checkpoints |
| `systematic-debugging` | Any bug, test failure, or unexpected behavior — before proposing fixes |
| `test-driven-development` | Before writing implementation code for any feature or bugfix |
| `dispatching-parallel-agents` | 2+ independent tasks with no shared state or sequential dependencies |
| `subagent-driven-development` | Executing independent tasks in parallel within the current session |
| `verification-before-completion` | Before claiming work is done, committing, or opening a PR |
| `requesting-code-review` | After completing a feature or major change — verify before merging |
| `receiving-code-review` | Before acting on review feedback — rigor over blind implementation |
| `finishing-a-development-branch` | When implementation is complete and you need to merge/PR/clean up |
| `using-git-worktrees` | Feature isolation before big changes or before executing a plan |
| `writing-skills` | Creating new skills, editing existing ones, or verifying skills before deploy |

---

## code-review
- **Skill:** `/code-review`
- **Purpose:** Reviews a pull request for bugs, quality, and efficiency — then fixes issues found
- **Use when:** After implementing a feature, before merging, or to audit recent changes
- **Example:** `/code-review` — runs against current branch changes

---

## Plugin Commands

```
/plugin list               # list installed plugins
/plugin install <name>     # install a plugin
/plugin uninstall <name>   # remove a plugin
/reload-plugins            # apply changes after install/uninstall
```
