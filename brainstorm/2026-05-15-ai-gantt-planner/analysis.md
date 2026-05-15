# Analysis — AI-Native Gantt Planner

## WHITE Hat — Facts

- **Frontend**: React + TypeScript + gantt-task-react (MIT, 1.1k stars)
- **Backend**: FastAPI (Python) + FastMCP (official MCP SDK, 23k stars)
- **LLM**: OpenAI-compatible API with function calling (tools param, strict schema)
- **Excel**: openpyxl 3.1.5 (MIT, Python >= 3.8)
- **State**: In-memory dict with JSON file persistence (plan.json)
- **File count**: ~25-30 files across frontend + backend
- **Dependencies**: react, gantt-task-react, openai (Python), fastapi, uvicorn, mcp, openpyxl
- **No database** — in-memory state, simple for demo scope
- **gantt-task-react last update**: v0.3.9 (Jul 2022) — stable but unmaintained
- **MCP transport**: streamable-http, mountable on FastAPI ASGI
- **LLM streaming**: async iterator with content deltas + tool call events

## RED Hat — Intuition

- gantt-task-react feels risky — last commit 2022, 129 open issues. Could break on React 18+. May need wrapper/fallback.
- LLM function calling for plan edits is powerful but fragile — hallucinated task IDs, wrong dependency chains.
- Chat + Gantt side-by-side UX is untested — screen real estate competition.
- In-memory state means data loss on crash. For demo: acceptable. For real: needs DB.
- MCP integration is novel but adds complexity layer — could just use direct REST + OpenAI tools.
- Excel upload with predecessor parsing feels brittle — "P1; P2" format depends on exact ID matching.

## BLACK Hat — Risks

1. **gantt-task-react abandonment** — repo stale since 2022, 129 open issues. React 19 compatibility unknown. [see risks.md R1]
2. **LLM hallucination on task IDs** — model invents non-existent task IDs, creates circular dependencies. [see risks.md R2]
3. **Circular dependency detection** — predecessor chains can form cycles, crash Gantt render. [see risks.md R3]
4. **No concurrency control** — simultaneous chat edits + UI drags cause race conditions in in-memory state. [see risks.md R4]
5. **Excel format drift** — user uploads Excel with different column names, missing fields, wrong types. [see risks.md R5]
6. **LLM API cost** — every chat message costs tokens. Streaming + function calls amplify cost.
7. **MCP spec volatility** — MCP v2 in development, breaking changes possible.
8. **CORS + browser MCP client** — MCP streamable-http needs CORS for browser, security boundary blur.
9. **No undo/redo** — LLM-driven edits lack revert capability. User makes mistake, can't go back.
10. **XSS via Excel** — openpyxl warns about XML attacks. Malicious Excel files possible.

## YELLOW Hat — Strengths

1. **gantt-task-react native React** — component model, declarative, TypeScript types. Perfect for React app.
2. **MCP as abstraction layer** — LLM tools map cleanly to plan operations. Standardized protocol.
3. **FastAPI auto-docs** — Swagger UI for REST endpoints, Pydantic validation built-in.
4. **OpenAI function calling mature** — strict schemas, auto-parsing, streaming support. Reliable.
5. **In-memory state = fast** — no DB latency. Perfect for demo. JSON persistence for basic durability.
6. **Excel import/export** — standard business format. Users already have project data in Excel.
7. **Chat-driven UX** — natural language is faster than clicking for common operations.
8. **Modular backend** — MCP tools, REST endpoints, Excel service cleanly separated.

## GREEN Hat — Alternatives

### Alternative 1: Custom SVG Gantt (no library)
- Build Gantt from scratch with SVG/Canvas
- Pros: full control, no dependency risk, lighter bundle
- Cons: months of work, re-implement drag-drop, arrows, zoom

### Alternative 2: dhtmlx-gantt with GPL license
- Pros: feature-rich, actively maintained (v9.1.4, Apr 2026), smart rendering
- Cons: GPL-2.0 forces open-source distribution of derivative works

### Alternative 3: Direct REST + OpenAI tools (skip MCP)
- Skip MCP layer, expose REST endpoints, call OpenAI tools directly from backend
- Pros: simpler architecture, one less protocol
- Cons: lose MCP interoperability, can't connect Claude Desktop/other MCP clients

### Alternative 4: WebSocket instead of HTTP streaming
- Use WebSocket for real-time chat + state sync
- Pros: bidirectional, lower latency
- Cons: more complex deployment, scaling issues

### Alternative 5: SQLite instead of in-memory
- Use SQLite for persistent state
- Pros: durable, queryable, no data loss
- Cons: more setup, overkill for demo scope

## BLUE Hat — Plan

**Recommendation**: Proceed with chosen stack. Mitigate gantt-task-react risk with wrapper component and fallback message. Add circular dependency detection. Implement simple undo stack.

**Phases**:
1. **Skeleton** — project scaffolding, dependencies, config
2. **Backend core** — PlanState model, in-memory store, JSON persistence
3. **MCP tools** — create_task, update_task, delete_task, add_dependency, remove_dependency, list_tasks
4. **REST API** — CRUD endpoints, Excel import/export, chat proxy
5. **LLM agent** — OpenAI function calling with tool schemas, streaming responses
6. **Frontend** — React app, gantt-task-react wrapper, chat panel, task modal
7. **Integration** — wire chat → LLM → MCP tools → state → Gantt update
8. **Seed data + polish** — seed dataset, styling, error handling

**Success criteria**:
- Gantt renders seed data with dependencies shown as arrows
- Chat accepts natural language commands, edits plan, Gantt updates
- Excel upload parses tasks correctly
- Excel download produces valid .xlsx
- Task click opens detail modal
- No circular dependencies crash the app
- LLM responses stream in real-time

**Minimum scope**: Single-user, in-memory, basic CRUD via chat, no auth, no undo, no collaboration.
