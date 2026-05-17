"""Chat endpoint using CommandEngine + LLM fallback."""

from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.command_engine import CommandEngine
from app.store import PlanState

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


def get_store(request: Request) -> PlanState:
    return request.app.state.store


def get_llm(request: Request):
    return getattr(request.app.state, "llm", None)


@router.post("/")
async def chat(
    body: ChatRequest,
    store: PlanState = Depends(get_store),
    llm=Depends(get_llm),
):
    """Chat endpoint: tries CommandEngine first, falls back to LLM."""
    
    engine = CommandEngine(store)
    result_text = engine.parse_and_execute(body.message)
    
    # Fallback to LLM if command engine didn't understand
    needs_llm = result_text.startswith("❌") or result_text.startswith("❓")
    
    if needs_llm and llm:
        # Build plan context for LLM
        tasks = store.get_all_tasks()
        plan_lines = []
        for t in tasks:
            plan_lines.append(
                f"- [{t.id}] {t.name}: {t.start_date} → {t.end_date} ({t.assignee or 'Unassigned'})"
            )
        plan_context = "\n".join(plan_lines) if plan_lines else "(empty plan)"
        
        async def llm_stream():
            # Build conversation history for context
            messages = [{"role": "user", "content": body.message}]
            if body.history:
                messages = body.history + messages
            
            # Stream LLM response as SSE with plain text (not JSON)
            async for chunk in llm.chat(messages, tools=[], plan_context=plan_context):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(llm_stream(), media_type="text/event-stream")
    
    # Return plain text via SSE (no JSON chunks)
    async def text_stream():
        # SSE format: plain text without JSON wrapping
        yield f"data: {result_text}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(text_stream(), media_type="text/event-stream")
