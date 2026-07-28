# Available Tools

This environment has exactly six external tools configured beyond Claude Code's base toolset. Do not assume any other MCP servers, plugins, or skills exist — if a task seems to call for something not listed here, say so rather than inventing a tool.

## 1. Serena MCP (MCP server — `serena`)
**Nature:** LSP-backed semantic code tool. Operates at the symbol level: find symbol, find references, rename, safe delete, insert before/after a symbol, project-scoped memories.
**When to reach for it:** multi-file refactors, "where is X used/defined", renames, or navigating an unfamiliar/large codebase — anywhere structural accuracy beats text search. Prefer its tools over grep/Read for these cases.
**Caveat:** per-project; the first call in a fresh project may be slow while the language server indexes.

## 2. ccusage (CLI, not MCP — run via Bash: `ccusage daily` / `npx ccusage@latest ...`)
**Nature:** reads local Claude Code usage JSONL logs already on disk; pure reporting, no code interaction, no network calls.
**When to reach for it:** only when the user explicitly asks about token usage, cost, or rate-limit windows. Never invoke proactively.

## 3. Frontend Design (plugin/skill — auto-activating, no slash command)
**Nature:** shapes reasoning before UI/frontend code is written — forces an explicit, committed aesthetic direction and bans generic "AI slop" defaults (Inter/Roboto everywhere, purple gradient on white, etc).
**When to reach for it:** automatically relevant to any UI/visual work. It's a behavior shift, not a callable tool — don't try to invoke it explicitly.

## 4. Playwright MCP (MCP server — `playwright`)
**Nature:** drives a real Chromium browser — navigation, clicking, typing, accessibility-tree snapshots, console/network inspection.
**When to reach for it:** verifying any UI/frontend change actually renders and behaves correctly in a browser. Use accessibility snapshots to target elements, not raw pixel coordinates.

## 5. Claude Context (MCP server — `claude-context`)
**Nature:** MCP server for embedding-based natural-language code search backed by a local LanceDB vector store. Configured to use **Ollama running locally** (`nomic-embed-text` model) for embeddings — not OpenAI — so there's no API key, no per-query cost, and no code ever leaves the machine.
**Dependency:** requires the Ollama background service to be running (it auto-starts on login; check with `Get-Process ollama` if a query fails). If Ollama isn't running, embeddings/search will fail even though the MCP server itself is connected.
**When to reach for it:** natural-language code search ("find the authentication logic") in large/unfamiliar codebases — first ask to index the project, then query in plain English. Complements Serena rather than replacing it — Serena is structural/symbolic, this is fuzzy/semantic.

## 6. Superpowers (plugin — slash commands + auto-activating skills)
**Nature:** a full development-methodology plugin: brainstorm → write-plan → isolate in a git worktree → TDD (red-green-refactor) → subagent-driven implementation with built-in review → merge/cleanup. Adds commands like `/superpowers:brainstorm`, `write-plan`, `execute-plan`.
**When to reach for it:** substantial, multi-step feature builds where structured planning and TDD discipline earn their overhead. Skip it for small, well-scoped fixes.

## General notes
- These are the *only* six tools configured, all six active. Don't reference or assume other MCP servers/plugins exist.
- Serena, Playwright, and Claude Context are registered at **user scope** — available in every project, not just the current one.
- ccusage is a plain CLI invoked via Bash, never an MCP tool call.
