# Plan — AI-Native Gantt Planner

## Recommended Approach

React + D3.js Gantt (custom) + Kanban with drag-and-drop, FastAPI + FastMCP backend, OpenAI function calling for chat-driven plan edits. Docker + Kubernetes deployment. In-memory state with JSON persistence. Streamable HTTP for MCP. No database.

## Module Decomposition

### Backend Modules

| Module | Responsibility | Contract |
|--------|---------------|----------|
| `models` | Pydantic models for Task, Plan, Dependency | Data validation, serialization |
| `store` | In-memory PlanState with JSON persistence | CRUD, cycle detection, save/load |
| `mcp_server` | FastMCP server with plan tools | MCP tools: create_task, update_task, delete_task, add_dependency, remove_dependency, list_tasks, get_plan |
| `excel_service` | openpyxl read/write | parse_excel(file) → List[Task], export_excel(plan) → bytes |
| `llm_agent` | OpenAI function calling wrapper | chat(message, tools, history) → StreamingResponse |
| `routes` | FastAPI REST endpoints | /api/tasks, /api/chat, /api/upload, /api/export, /api/plan |

### Frontend Modules

| Module | Responsibility | Contract |
|--------|---------------|----------|
| `GanttView` | D3.js Gantt chart component | Props: tasks, onTaskClick, onTaskDragEnd. SVG rendering, dependency arrows, zoom, scroll |
| `KanbanView` | Kanban board with drag-and-drop | Props: tasks, onTaskDrop. Grouped by assignee/status, HTML5 DnD or @dnd-kit |
| `ChatPanel` | Streaming chat UI | Props: messages, onSend, isLoading |
| `TaskModal` | Task detail/edit modal | Props: task, isOpen, onClose, onSave |
| `ExcelHandler` | Upload/download UI | Props: onImport, onExport |
| `store` | Zustand state management | tasks, chatMessages, selectedTask, viewMode (gantt/kanban) |
| `api` | HTTP client wrappers | fetchTasks, updateTask, sendChat, uploadExcel, exportExcel |

### Infrastructure Modules

| Module | Responsibility | Contract |
|--------|---------------|----------|
| `Dockerfile.backend` | Backend container image | Multi-stage build, uvicorn on port 8000 |
| `Dockerfile.frontend` | Frontend container image | Nginx serving Vite build, port 80 |
| `docker-compose.yml` | Local dev compose | backend + frontend + nginx reverse proxy |
| `k8s/` | Kubernetes manifests | Deployment, Service, Ingress, ConfigMap, HPA |

## Exact File Paths

```
backend/
├── pyproject.toml                          # Dependencies: fastapi, uvicorn, mcp, openai, openpyxl, pydantic
├── Dockerfile                              # Multi-stage: python slim, install deps, run uvicorn
├── app/
│   ├── __init__.py
│   ├── main.py                             # FastAPI app, mount MCP, CORS, startup hooks
│   ├── models.py                           # Task, Plan, Dependency, ChatMessage Pydantic models
│   ├── store.py                            # PlanState class: CRUD, cycle detection, JSON persistence
│   ├── mcp_server.py                       # FastMCP tools registration
│   ├── excel_service.py                    # parse_excel(), export_excel()
│   ├── llm_agent.py                        # OpenAI streaming + tool calling
│   └── routes/
│       ├── __init__.py
│       ├── tasks.py                        # /api/tasks CRUD
│       ├── chat.py                         # /api/chat streaming
│       ├── excel.py                        # /api/upload, /api/export
│       └── plan.py                         # /api/plan (get/seed/reset)

frontend/
├── package.json                            # Dependencies: react, d3, zustand, axios, @dnd-kit/core, @dnd-kit/sortable
├── Dockerfile                              # Node build → nginx
├── vite.config.ts
├── tsconfig.json
├── index.html
├── nginx.conf                              # Nginx config for SPA + API proxy
├── src/
│   ├── main.tsx                            # React entry point
│   ├── App.tsx                             # Layout: tabs Gantt/Kanban + Chat side by side
│   ├── api/
│   │   ├── client.ts                       # Axios instance with base URL
│   │   ├── tasks.ts                        # Task CRUD API calls
│   │   ├── chat.ts                         # Chat streaming API call
│   │   └── excel.ts                        # Upload/download API calls
│   ├── store/
│   │   └── index.ts                        # Zustand store: tasks, chat, selectedTask, viewMode
│   ├── components/
│   │   ├── GanttView.tsx                   # D3.js Gantt: SVG bars, arrows, axis, zoom, drag
│   │   ├── KanbanView.tsx                  # Kanban columns by assignee, drag-and-drop cards
│   │   ├── ChatPanel.tsx                   # Chat UI with streaming
│   │   ├── TaskModal.tsx                   # Task detail modal
│   │   ├── ExcelHandler.tsx                # Upload/download buttons
│   │   ├── Header.tsx                      # App header with title, view toggle, export
│   │   └── ViewSwitcher.tsx                # Gantt/Kanban tab toggle
│   ├── hooks/
│   │   ├── useGantt.ts                     # D3 rendering logic hook
│   │   └── useDragDrop.ts                  # DnD event handlers for Gantt bar dragging
│   ├── types/
│   │   └── index.ts                        # TypeScript interfaces for Task, ChatMessage
│   └── styles/
│       └── globals.css                     # Global styles, layout, Kanban columns

k8s/
├── backend-deployment.yaml
├── backend-service.yaml
├── frontend-deployment.yaml
├── frontend-service.yaml
├── ingress.yaml
├── configmap.yaml
└── hpa.yaml

docker-compose.yml
```

## Parallel Execution Opportunities

| Phase | Parallel Tasks |
|-------|---------------|
| Skeleton | Backend pyproject.toml + Frontend package.json + Dockerfiles (independent) |
| Backend core | models.py + store.py (models first, then store depends) |
| MCP + REST | mcp_server.py + routes/ (independent, both depend on store) |
| LLM agent | llm_agent.py (independent of routes/MCP) |
| Excel service | excel_service.py (independent, depends on models) |
| Frontend | GanttView D3 + KanbanView DnD + ChatPanel (independent components) |
| Frontend store | store/index.ts + api/* (independent of components) |
| Docker/K8s | Dockerfiles + docker-compose + k8s manifests (independent) |
| Integration | Wire chat→LLM→MCP (depends on all backend + frontend pieces) |

## Phase Breakdown

### Phase 1: Skeleton (skeleton-builder)
- Create backend/ with pyproject.toml, app/ structure, Dockerfile
- Create frontend/ with Vite + React + TypeScript + D3 + @dnd-kit, Dockerfile, nginx.conf
- Create docker-compose.yml
- Create k8s/ directory with placeholder manifests
- Install all dependencies
- Configure CORS, base URLs
- **Output**: Both projects scaffold, `npm run dev` + `uvicorn` start clean, docker compose builds

### Phase 2: Backend Core
- `models.py`: Task(id, name, description, start, end, progress, type, dependencies, assignee, project), Plan, ChatMessage
- `store.py`: PlanState class with dict[str, Task], save/load JSON, cycle detection (DFS)
- **Output**: Store works, CRUD operations tested, JSON persists

### Phase 3: MCP Tools
- `mcp_server.py`: FastMCP with 7 tools
  - `list_tasks()` → List[Task]
  - `get_task(task_id)` → Task
  - `create_task(name, start, end, assignee?, description?, duration?)` → Task
  - `update_task(task_id, **fields)` → Task
  - `delete_task(task_id)` → bool
  - `add_dependency(source_id, target_id)` → bool
  - `remove_dependency(source_id, target_id)` → bool
- `main.py`: Mount MCP on FastAPI at `/mcp`
- **Output**: MCP server responds to tool calls

### Phase 4: REST API
- `routes/tasks.py`: GET/POST/PUT/DELETE /api/tasks
- `routes/chat.py`: POST /api/chat (streaming SSE)
- `routes/excel.py`: POST /api/upload (multipart), GET /api/export
- `routes/plan.py`: GET /api/plan, POST /api/plan/seed, DELETE /api/plan/reset
- `llm_agent.py`: OpenAI streaming with tools param, function call parsing
- **Output**: All REST endpoints functional, chat streams LLM responses

### Phase 5: Frontend — Gantt (D3) + Kanban
- `types/index.ts`: Task, ChatMessage interfaces
- `store/index.ts`: Zustand store with tasks[], messages[], selectedTask, viewMode
- `api/*`: Axios wrappers for all endpoints
- `hooks/useGantt.ts`: D3 scale/time, SVG bar rendering, dependency arrows, axis, zoom behavior
- `hooks/useDragDrop.ts`: D3 drag behavior for Gantt bars (move task on timeline)
- `components/GanttView.tsx`: D3 SVG container, zoom, scroll, task bars, dependency arrows, click handler
- `components/KanbanView.tsx`: @dnd-kit columns by assignee, drag-and-drop cards, drop → reassign task
- `components/ChatPanel.tsx`: Message list, input, streaming via EventSource/fetch
- `components/TaskModal.tsx`: Detail view, edit form
- `components/ExcelHandler.tsx`: File input + download button
- `components/ViewSwitcher.tsx`: Gantt/Kanban tab toggle
- `components/Header.tsx`: Title + view switcher + export
- `App.tsx`: Layout with tabs + Chat sidebar
- **Output**: Full UI renders, D3 Gantt + Kanban interact with backend

### Phase 6: Infrastructure — Docker + K8s
- `backend/Dockerfile`: Multi-stage Python slim, uvicorn on :8000
- `frontend/Dockerfile`: Node build → nginx serving static
- `frontend/nginx.conf`: SPA routing, /api proxy to backend
- `docker-compose.yml`: backend + frontend services, network, volumes for plan.json
- `k8s/backend-deployment.yaml`: Deployment + Service + HPA
- `k8s/frontend-deployment.yaml`: Deployment + Service
- `k8s/ingress.yaml`: Ingress with TLS annotation
- `k8s/configmap.yaml`: Environment variables (LLM_API_KEY, etc.)
- **Output**: docker compose up works, k8s manifests valid

### Phase 7: Integration + Seed Data
- Wire Gantt D3 drag → REST API → store update → Gantt re-render
- Wire Kanban DnD → REST API → reassign → both views update
- Wire Chat → LLM → MCP tools → store update → Gantt/Kanban refresh
- Seed data: 12-task project with dependencies, 3 assignees
- Error handling, loading states, empty states
- **Output**: End-to-end working demo

## Success Criteria

1. D3 Gantt renders 12 seed tasks with dependency arrows within 1s
2. Gantt bars draggable — drag updates task dates via API
3. Kanban columns by assignee, drag card → reassigns task, both views sync
4. Chat accepts "Add task X, 3 days, after Y" → task appears on Gantt + Kanban within 3s
5. Chat accepts "Move X to [date]" → task repositions on both views
6. Chat accepts "Delete X" → task removed, arrows cleaned
7. Excel upload with 5 tasks → Gantt + Kanban update with all 5
8. Excel download → valid .xlsx that re-imports identically
9. Task click → modal opens with full details
10. Circular dependency attempt → error message, no crash
11. LLM API unavailable → graceful error message
12. JSON persistence survives page reload
13. docker compose up starts full stack in <30s
14. k8s manifests pass `kubectl apply --dry-run=client`

## Seed Data Specification

```json
{
  "tasks": [
    {"id": "1", "name": "Project Planning", "start": "2026-05-18", "end": "2026-05-19", "progress": 100, "type": "milestone", "assignee": "Alice"},
    {"id": "2", "name": "Requirements Gathering", "start": "2026-05-20", "end": "2026-05-23", "progress": 100, "type": "task", "assignee": "Alice", "dependencies": ["1"]},
    {"id": "3", "name": "UI/UX Design", "start": "2026-05-24", "end": "2026-05-30", "progress": 60, "type": "task", "assignee": "Bob", "dependencies": ["2"]},
    {"id": "4", "name": "Backend Architecture", "start": "2026-05-24", "end": "2026-05-28", "progress": 80, "type": "task", "assignee": "Charlie", "dependencies": ["2"]},
    {"id": "5", "name": "Frontend Development", "start": "2026-05-31", "end": "2026-06-10", "progress": 20, "type": "task", "assignee": "Bob", "dependencies": ["3"]},
    {"id": "6", "name": "API Development", "start": "2026-05-29", "end": "2026-06-05", "progress": 30, "type": "task", "assignee": "Charlie", "dependencies": ["4"]},
    {"id": "7", "name": "MCP Integration", "start": "2026-06-06", "end": "2026-06-10", "progress": 0, "type": "task", "assignee": "Charlie", "dependencies": ["6"]},
    {"id": "8", "name": "LLM Agent Setup", "start": "2026-06-06", "end": "2026-06-09", "progress": 0, "type": "task", "assignee": "Alice", "dependencies": ["6"]},
    {"id": "9", "name": "Integration Testing", "start": "2026-06-11", "end": "2026-06-15", "progress": 0, "type": "task", "assignee": "Bob", "dependencies": ["5", "7"]},
    {"id": "10", "name": "Excel Import/Export", "start": "2026-06-11", "end": "2026-06-13", "progress": 0, "type": "task", "assignee": "Alice", "dependencies": ["5"]},
    {"id": "11", "name": "User Acceptance Testing", "start": "2026-06-16", "end": "2026-06-19", "progress": 0, "type": "task", "assignee": "Alice", "dependencies": ["9", "10"]},
    {"id": "12", "name": "Launch", "start": "2026-06-20", "end": "2026-06-20", "progress": 0, "type": "milestone", "assignee": "Alice", "dependencies": ["11"]}
  ]
}
```

## LLM Prompt Design

### System Prompt
```
You are a project planning assistant. You manage a Gantt chart with tasks.
Each task has: id, name, description, start_date, end_date, progress (0-100),
assignee, dependencies (list of task IDs), type (task/milestone/project).

You can modify the plan using the available tools. Always confirm changes
to the user in natural language.

Current plan state:
{plan_summary}

Rules:
- Use task IDs from the current plan only
- Dates must be in YYYY-MM-DD format
- When creating tasks, calculate end_date from start_date + duration
- When adding dependencies, check for cycles
- If the user asks about the plan, use list_tasks first
- Be concise. Confirm changes with before/after dates when relevant.
```

### Chat Flow
1. User message → append to history
2. Send to LLM with tools schema + system prompt + plan context
3. LLM responds with text or tool calls
4. Execute tool calls on PlanState via MCP
5. Send tool results back to LLM
6. LLM generates confirmation message
7. Stream confirmation to UI
8. UI refreshes Gantt with updated state

## MCP Tools Specification

### `list_tasks`
- **Description**: List all tasks in the current plan
- **Parameters**: None
- **Returns**: `{"result": [Task, ...]}`

### `get_task`
- **Description**: Get details of a specific task
- **Parameters**: `task_id: str` (required)
- **Returns**: `{"result": Task}` or error

### `create_task`
- **Description**: Create a new task in the plan
- **Parameters**:
  - `name: str` (required)
  - `start_date: str` (required, YYYY-MM-DD)
  - `end_date: str` (optional, YYYY-MM-DD, auto-calculated if duration given)
  - `duration: int` (optional, days)
  - `assignee: str` (optional)
  - `description: str` (optional)
  - `dependencies: list[str]` (optional, task IDs)
- **Returns**: `{"result": Task, "success": true}` or error

### `update_task`
- **Description**: Update fields of an existing task
- **Parameters**:
  - `task_id: str` (required)
  - `name: str` (optional)
  - `start_date: str` (optional, YYYY-MM-DD)
  - `end_date: str` (optional, YYYY-MM-DD)
  - `progress: int` (optional, 0-100)
  - `assignee: str` (optional)
  - `description: str` (optional)
- **Returns**: `{"result": Task, "success": true}` or error

### `delete_task`
- **Description**: Delete a task from the plan
- **Parameters**: `task_id: str` (required)
- **Returns**: `{"success": true, "message": "Task deleted"}` or error

### `add_dependency`
- **Description**: Add a dependency between two tasks (target depends on source)
- **Parameters**: `source_id: str`, `target_id: str`
- **Returns**: `{"success": true}` or error with cycle detection message

### `remove_dependency`
- **Description**: Remove a dependency between two tasks
- **Parameters**: `source_id: str`, `target_id: str`
- **Returns**: `{"success": true}` or error

## Pipeline

```
requirements -> architect -> planning -> skeleton-builder -> coder + scenario-writer (parallel) -> tests
```

**Skeleton-builder output location**: `backend/app/` and `frontend/src/` with stub files
**Scenario-writer output location**: `backend/tests/` and `frontend/src/__tests__/`
