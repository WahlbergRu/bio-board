"""Streaming chat route with SSE."""

import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.llm_agent import LLMAgent
from app.store import PlanState

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


def get_store() -> PlanState:
    from app.main import app_state
    return app_state["store"]


def get_agent() -> LLMAgent:
    from app.main import app_state
    return app_state["agent"]


def _build_plan_context(store: PlanState) -> str:
    tasks = store.get_all_tasks()
    if not tasks:
        return "No tasks in plan."
    lines = []
    for t in tasks:
        deps = ", ".join(t.dependencies) if t.dependencies else "none"
        lines.append(
            f"  [{t.id}] {t.name} | {t.start_date}→{t.end_date} | "
            f"{t.progress}% | {t.assignee or 'unassigned'} | deps: {deps}"
        )
    return "\n".join(lines)


@router.post("/")
async def chat(
    body: ChatRequest,
    store: PlanState = Depends(get_store),
    agent: LLMAgent = Depends(get_agent),
):
    messages = [*body.history, {"role": "user", "content": body.message}]
    plan_ctx = _build_plan_context(store)

    async def event_stream() -> AsyncGenerator[str, None]:
        async for chunk in agent.chat(messages=messages, tools=[], plan_context=plan_ctx):
            data = json.dumps({"text": chunk})
            yield f"data: {data}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
