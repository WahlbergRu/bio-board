# Context — AI-Native Gantt Planner

## Project Overview
Full-stack interactive Gantt chart with AI chat assistant. React frontend, FastAPI + MCP backend, OpenAI-compatible LLM function calling for natural language plan editing.

## Technology Analysis

### React Gantt Libraries

| Library | Stars | License | TS Support | Dependency Arrows | Drag-Drop | API Richness |
|---------|-------|---------|------------|-------------------|-----------|--------------|
| **gantt-task-react** | 1.1k | MIT | ✅ Native | ✅ (dependencies array) | ✅ onDateChange, onProgressChange | Good — callbacks for all events |
| frappe-gantt | 6k | MIT | ❌ Needs wrapper | ✅ (links array) | ✅ Imperative API | Moderate — imperative, not React-idiomatic |
| dhtmlx-gantt | 1.8k | GPL-2.0 | ❌ | ✅ 4 types (FS, SS, FF, SF) | ✅ Full DnD | Rich — but GPL license problematic |

**Decision: gantt-task-react**
- MIT license, no copyleft concerns
- Native TypeScript + React — idiomatic component model
- `onDateChange`, `onDelete`, `onProgressChange` callbacks — perfect for LLM-driven state sync
- Supports `dependencies` as string[] of parent IDs
- `type: task | milestone | project` — sufficient for demo
- Custom styling per task, tooltip, locale support
- Last commit: v0.3.9 (Jul 2022) — somewhat stale but stable

### FastAPI + MCP Server Patterns

- **MCP Python SDK** (modelcontextprotocol/python-sdk, 23k stars) — official implementation
- `FastMCP` decorator pattern: `@mcp.tool()` for tools, `@mcp.resource()` for data exposure
- Transport options: stdio, SSE, streamable-http
- Mountable on existing ASGI server — FastAPI can host MCP at `/mcp` path
- Structured output: Pydantic models auto-converted to JSON schema for LLM function calling
- Tool context injection: `Context` object for logging, progress, resource access
- CORS configuration available for browser-based clients

**Pattern: FastAPI as host + FastMCP mounted at `/mcp`**
```python
from mcp.server.fastmcp import FastMCP
mcp = FastMCP("GanttPlanner")
# Mount on FastAPI ASGI
app.mount("/mcp", mcp.streamable_http_app())
```

### LLM Function Calling for Plan Manipulation

- OpenAI API `chat.completions.parse()` method supports auto-parsing function tool calls
- `pydantic_function_tool()` helper converts Pydantic models to strict function schemas
- Streaming via `.chat.completions.stream()` — events for content deltas and tool call arguments
- Tool call events: `FunctionToolCallArgumentsDeltaEvent`, `FunctionToolCallArgumentsDoneEvent`
- Strict mode required: `"strict": true` in tool schema

**Pattern: LLM receives chat message → tool calls for plan edits → execute on backend state → confirm to user**

### Excel Parsing (openpyxl)

- openpyxl 3.1.5 — stable, MIT license, Python >= 3.8
- Read/write xlsx/xlsm files natively
- Direct cell assignment: `ws['A1'] = value`
- Row append: `ws.append([col1, col2, ...])`
- Security: install `defusedxml` to guard against XML attacks
- No external binary dependencies

### Architecture Summary

```
Frontend (React + gantt-task-react)
  ├── Gantt chart with seeded data
  ├── Chat panel (streaming LLM responses)
  ├── Task detail modal
  └── Excel upload/download

Backend (FastAPI + FastMCP)
  ├── REST: /api/tasks (CRUD), /api/export, /api/upload
  ├── MCP: /mcp (tools for LLM)
  ├── In-memory PlanState with JSON persistence
  └── LLM proxy: /api/chat (OpenAI-compatible)
```

### Key Design Decisions

1. **State: in-memory with JSON persistence** — simple for demo, `plan.json` on disk
2. **LLM: OpenAI-compatible API** — configurable base_url, model, api_key via env vars
3. **MCP tools map directly to plan CRUD** — create_task, update_task, delete_task, add_dependency, remove_dependency
4. **Excel columns: task, description, assignee, duration, predecessors** — predecessors as semicolon-separated IDs
5. **Chat: streaming with function calls** — LLM decides which tools to call, backend executes, returns confirmation

### Web Research Sources
- gantt-task-react GitHub: https://github.com/MaTeMaTuK/gantt-task-react
- MCP Python SDK: https://github.com/modelcontextprotocol/python-sdk
- openpyxl PyPI: https://pypi.org/project/openpyxl/
- frappe-gantt: https://github.com/frappe/gantt
- dhtmlx-gantt: https://github.com/dhtmlx/gantt
- OpenAI function calling docs: https://github.com/openai/openai-python
