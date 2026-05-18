"""Chat endpoint using CommandEngine + LLM fallback."""

import json
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
    """Chat endpoint: tries CommandEngine first, falls back to LLM suggestions."""
    
    # Direct LLM mode: /llm prefix bypasses CommandEngine
    message = body.message
    force_llm = False
    if message.strip().lower().startswith("/llm"):
        force_llm = True
        message = message.strip()[4:].strip()  # Remove "/llm" prefix
        if not message:
            async def empty_stream():
                yield "data: Напишите запрос после /llm (напр.: /llm какие риски у проекта?)\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(empty_stream(), media_type="text/event-stream")

    if not force_llm:
        engine = CommandEngine(store)
        result_text = engine.parse_and_execute(body.message)
        
        # Check if command engine didn't understand
        needs_llm = result_text.startswith("❌") or result_text.startswith("❓")
    else:
        result_text = ""
        needs_llm = True
    
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
            if force_llm:
                # Direct LLM mode — free-form response
                full_response = ""
                async for chunk in llm.direct_chat(message, plan_context):
                    full_response += chunk
                yield f"data: {full_response}\n\n"
            else:
                # Suggest mode — try to parse as JSON suggestions
                full_response = ""
                async for chunk in llm.suggest_commands(message, plan_context, error_context=result_text):
                    full_response += chunk
                
                try:
                    cleaned = full_response.strip()
                    if cleaned.startswith("```"):
                        cleaned = cleaned.split("```")[1]
                        if cleaned.startswith("json"):
                            cleaned = cleaned[4:]
                        cleaned = cleaned.rstrip("`").strip()
                    
                    parsed = json.loads(cleaned)
                    if isinstance(parsed, dict) and "suggestions" in parsed:
                        suggestions_payload = json.dumps({
                            "type": "suggestions",
                            "note": parsed.get("note", ""),
                            "error": result_text,
                            "commands": parsed["suggestions"],
                        }, ensure_ascii=False)
                        yield f"data: {suggestions_payload}\n\n"
                    else:
                        yield f"data: {full_response}\n\n"
                except (json.JSONDecodeError, IndexError):
                    yield f"data: {full_response}\n\n"
            
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(llm_stream(), media_type="text/event-stream")
    
    # Return plain text via SSE (command executed successfully)
    async def text_stream():
        yield f"data: {result_text}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(text_stream(), media_type="text/event-stream")
