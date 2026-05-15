# Risks — AI-Native Gantt Planner

| ID | Risk | Severity | Mitigation | Status |
|----|------|----------|------------|--------|
| R1 | gantt-task-react abandoned (last commit 2022, 129 open issues) | High | Wrap in isolated component, test React 18+ compatibility, have frappe-gantt as fallback plan | Identified |
| R2 | LLM hallucinates task IDs or creates invalid operations | High | Validate all tool call args against PlanState before execution, return error on invalid IDs | Identified |
| R3 | Circular dependencies crash Gantt render or create infinite loops | Critical | DFS cycle detection on every dependency change, reject with descriptive error | Identified |
| R4 | Race condition: chat edit + UI drag modify same task simultaneously | Medium | Single-threaded Python backend (asyncio), sequential state mutations | Identified |
| R5 | Excel upload with wrong columns/types causes parse errors | Medium | Strict column validation, return detailed error list with row numbers | Identified |
| R6 | LLM API cost runaway from unlimited chat | Low | Rate limit 10 req/min per session, configurable model selection | Identified |
| R7 | MCP spec breaking changes (v2 in development) | Medium | Pin mcp SDK version, abstract MCP layer behind interface | Identified |
| R8 | Data loss on crash (in-memory state) | Medium | Auto-save JSON on every mutation, load on startup | Identified |
| R9 | XSS from user-generated task names/descriptions | High | React auto-escapes by default, sanitize Excel input, CSP headers | Identified |
| R10 | XML bomb in Excel file (billion laughs attack) | Medium | Install defusedxml, openpyxl security best practices | Identified |
| R11 | Gantt performance degrades with 500+ tasks | Low | Scope limit: demo supports 200 tasks max, paginate if needed | Identified |
| R12 | LLM context window overflow with long chat history | Medium | Truncate history to last 20 messages, summarize older messages | Identified |
