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
    
    engine = CommandEngine(store)
    result_text = engine.parse_and_execute(body.message)
    
    # DEBUG
    import sys
    print(f"DEBUG chat: msg={body.message!r}, result={result_text!r}, starts_error={result_text.startswith('❌') or result_text.startswith('❓')}", file=sys.stderr)
    
    # Check if command engine didn't understand
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
        
        async def llm_suggestions_stream():
            # Stream raw LLM output
            full_response = ""
            async for chunk in llm.suggest_commands(body.message, plan_context, error_context=result_text):
                full_response += chunk
                # Stream raw chunks for potential future use
                yield f"data: {chunk}\n\n"
            
            # Try to parse as JSON suggestions
            try:
                # Clean potential markdown
                cleaned = full_response.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("```")[1]
                    if cleaned.startswith("json"):
                        cleaned = cleaned[4:]
                    cleaned = cleaned.rstrip("`").strip()
                
                parsed = json.loads(cleaned)
                if isinstance(parsed, dict) and "suggestions" in parsed:
                    # Send structured suggestions
                    suggestions_payload = json.dumps({
                        "type": "suggestions",
                        "note": parsed.get("note", ""),
                        "commands": parsed["suggestions"],
                    })
                    yield f"data: {suggestions_payload}\n\n"
            except (json.JSONDecodeError, IndexError):
                # Fallback: just text response
                pass
            
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(llm_suggestions_stream(), media_type="text/event-stream")
    
    # Return plain text via SSE (command executed successfully)
    async def text_stream():
        yield f"data: {result_text}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(text_stream(), media_type="text/event-stream")
