"""Streaming chat route with SSE — LLM agent with live tool execution."""

import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.llm_agent import LLMAgent
from app.store import PlanState

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


def get_store(request: Request) -> PlanState:
    return request.app.state.store


def get_agent(request: Request) -> LLMAgent:
    return request.app.state.llm


def _build_plan_context(store: PlanState) -> str:
    tasks = store.get_all_tasks()
    if not tasks:
        return "No tasks in plan."
    lines = []
    for t in tasks:
        deps = ", ".join(t.dependencies) if t.dependencies else "none"
        lines.append(
            f"  [{t.id}] {t.name} | {t.start_date}\u2192{t.end_date} | "
            f"{t.progress}% | {t.assignee or 'unassigned'} | deps: {deps}"
        )
    return "\n".join(lines)


def _make_tool_handlers(store: PlanState):
    """Return dict of tool_name -> handler(store, args) -> str."""
    from app.models import TaskCreate, TaskUpdate

    async def create_task_handler(args: dict) -> str:
        tc = TaskCreate(
            name=args["name"],
            description=args.get("description", ""),
            start_date=args["start_date"],
            end_date=args.get("end_date", ""),
            progress=args.get("progress", 0),
            type=args.get("type", "task"),
            assignee=args.get("assignee", ""),
        )
        result = store.create_task(tc)
        if isinstance(result, str):
            return f"Error: {result}"
        return json.dumps({"id": result.id, "name": result.name, "start": result.start_date, "end": result.end_date})

    async def update_task_handler(args: dict) -> str:
        tid = args.get("id", "")
        updates = {k: v for k, v in args.items() if k != "id" and v is not None}
        tu = TaskUpdate(id=tid, **updates)
        result = store.update_task(tid, tu)
        if result is None:
            return f"Error: Task {tid} not found"
        return json.dumps({"id": result.id, "name": result.name, "updated": True})

    async def delete_task_handler(args: dict) -> str:
        tid = args.get("id", "")
        ok = store.delete_task(tid)
        return json.dumps({"deleted": ok, "id": tid})

    async def add_dependency_handler(args: dict) -> str:
        sid = args.get("source_id", "")
        tid = args.get("target_id", "")
        ok = store.add_dependency(sid, tid)
        if not ok:
            return "Error: Cycle detected or invalid task IDs"
        return json.dumps({"source": sid, "target": tid, "added": True})

    async def remove_dependency_handler(args: dict) -> str:
        sid = args.get("source_id", "")
        tid = args.get("target_id", "")
        ok = store.remove_dependency(sid, tid)
        return json.dumps({"source": sid, "target": tid, "removed": ok})

    async def list_tasks_handler(args: dict) -> str:
        tasks = store.get_all_tasks()
        return json.dumps([{"id": t.id, "name": t.name, "start": t.start_date,
                           "end": t.end_date, "assignee": t.assignee, "deps": t.dependencies}
                          for t in tasks])

    return {
        "create_task": create_task_handler,
        "update_task": update_task_handler,
        "delete_task": delete_task_handler,
        "add_dependency": add_dependency_handler,
        "remove_dependency": remove_dependency_handler,
        "list_tasks": list_tasks_handler,
    }


@router.post("/")
async def chat(
    body: ChatRequest,
    store: PlanState = Depends(get_store),
    agent: LLMAgent = Depends(get_agent),
):
    messages = [*body.history, {"role": "user", "content": body.message}]
    plan_ctx = _build_plan_context(store)
    handlers = _make_tool_handlers(store)

    async def event_stream() -> AsyncGenerator[str, None]:
        async for chunk in agent.chat_with_store(
            messages=messages, plan_context=plan_ctx, tool_handlers=handlers
        ):
            data = json.dumps({"text": chunk}, ensure_ascii=False)
            yield f"data: {data}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
