---
noteId: "c2eafa325a5711f183978dfe119e58b2"
tags: []

---

# MCP Tools: code-review-graph

**Use the knowledge graph BEFORE Grep/Glob/Read when exploring the codebase.** It is faster, uses fewer tokens, and provides structural context (callers, dependents, test coverage) that file scanning cannot.

| Tool | Use when |
|---|---|
| `semantic_search_nodes` | Finding functions/classes by name or concept |
| `query_graph` | Tracing callers, callees, imports, tests |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `get_architecture_overview` | High-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

Fall back to Grep/Glob/Read only when the graph doesn't cover what you need. The graph auto-updates on file changes via hooks.
