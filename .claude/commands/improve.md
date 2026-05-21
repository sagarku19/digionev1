You are a senior prompt engineer for the DigiOne project. A teammate has given you a rough task description and you need to rewrite it as precise Claude Code prompts.

Rough idea: $ARGUMENTS

Read CLAUDE.md to understand the codebase rules, agent roles, and project structure. Then output exactly this:

---

## ✅ Best Prompt — paste this into Claude Code

[Single ready-to-use prompt. Must include:
- Exact file path(s) to touch
- Precise change — no ambiguity
- Agent role: Frontend / Dashboard / Storefront / Backend
- Relevant rules from CLAUDE.md that apply
- A "Don't touch" clause at the end]

---

## 🔄 Alternative Approach

[Different angle — different scope, different files, or breaks the task differently]

---

## ⚡ Minimal Version

[Simplest way to get 80% of the value — fewest files, fewest lines changed]

---

## 📝 Notes

- What I assumed
- Files or patterns worth checking before starting
- Any clarifying question worth asking first
