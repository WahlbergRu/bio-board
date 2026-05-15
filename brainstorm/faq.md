# FAQ — AI-Native Gantt Planner

## Gantt Library

### Q: Why gantt-task-react over frappe-gantt or dhtmlx-gantt?

A: gantt-task-react is the only React-native option with MIT license. frappe-gantt is vanilla JS requiring a React wrapper. dhtmlx-gantt has GPL-2.0 license (copyleft). gantt-task-react provides TypeScript types, declarative callbacks (`onDateChange`, `onDelete`, `onProgressChange`), and dependency support via a simple `dependencies` string array — perfect for LLM-driven state sync.

Source: 2026-05-15-ai-gantt-planner

### Q: gantt-task-react hasn't been updated since 2022. Is it safe to use?

A: Risk acknowledged. Mitigation: wrap in isolated component, test React 18+ compatibility, have frappe-gantt as fallback. The library is stable and simple enough that lack of updates doesn't indicate brokenness. 129 open issues are mostly feature requests, not critical bugs.

Source: 2026-05-15-ai-gantt-planner

## LLM Integration

### Q: How does the LLM know what tasks exist in the plan?

A: The system prompt includes a summary of current plan state (task count, names, dates). Before each chat interaction, `list_tasks` tool is available to the LLM. The LLM can query the plan if it needs details before making changes.

Source: 2026-05-15-ai-gantt-planner

### Q: What if the LLM hallucinates a task ID?

A: All MCP tools validate task IDs against PlanState before execution. Invalid IDs return descriptive errors ("Task 'X' not found"). The LLM receives the error and can retry or inform the user.

Source: 2026-05-15-ai-gantt-planner

### Q: Which LLM models are supported?

A: Any OpenAI-compatible API. Configured via env vars: `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`. Works with OpenAI GPT-4/4o, Azure OpenAI, local models via Ollama/litellm, Groq, etc.

Source: 2026-05-15-ai-gantt-planner

## MCP

### Q: Why use MCP instead of direct REST + OpenAI tools?

A: MCP provides a standardized protocol for LLM tool access. Benefits: interoperability with Claude Desktop, MCP Inspector, other MCP clients. Clean separation between LLM-facing tools and REST-facing API. Easier to add new tools without modifying REST layer.

Source: 2026-05-15-ai-gantt-planner

### Q: Can the app work without MCP?

A: Yes. The REST API works independently. MCP is an additional layer for LLM tool access. The chat endpoint can call OpenAI tools directly if MCP is not configured.

Source: 2026-05-15-ai-gantt-planner

## Excel

### Q: What Excel format is required for import?

A: .xlsx file with columns: `task` (name), `description`, `assignee`, `duration` (days as integer), `predecessors` (semicolon-separated task IDs, e.g., "1; 3"). Column names are case-insensitive. Missing columns generate warnings.

Source: 2026-05-15-ai-gantt-planner

### Q: Are Excel formulas executed during import?

A: No. openpyxl reads cell values, not formula results. Formulas are ignored. Only literal values are imported.

Source: 2026-05-15-ai-gantt-planner

## State Management

### Q: Is data persistent across server restarts?

A: Yes. PlanState auto-saves to `plan.json` on every mutation. On startup, it loads from the file. If the file doesn't exist, it starts empty or with seed data.

Source: 2026-05-15-ai-gantt-planner

### Q: Can multiple users edit the plan simultaneously?

A: No. This is a single-user demo. Backend is single-threaded (asyncio). No locking or conflict resolution. For multi-user, add WebSocket + operational transforms or a database.

Source: 2026-05-15-ai-gantt-planner

## Security

### Q: Is the app protected against XSS?

A: Yes. React auto-escapes JSX content. Excel input is validated and sanitized. Task names/descriptions are rendered as text, not HTML. CSP headers configured in production.

Source: 2026-05-15-ai-gantt-planner

### Q: Can a malicious Excel file execute code?

A: No. openpyxl reads data only — it doesn't execute macros or embedded scripts. `defusedxml` is installed to guard against XML billion-laugs attacks.

Source: 2026-05-15-ai-gantt-planner
