"""Chat endpoint using CommandEngine for direct intent execution."""

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


@router.post("/")
async def chat(
    body: ChatRequest,
    store: PlanState = Depends(get_store),
):
    """Chat endpoint: Executes commands via CommandEngine (Bag-of-Words parser)."""
    
    engine = CommandEngine(store)
    result_text = engine.parse_and_execute(body.message)
    
    async def event_stream() -> AsyncGenerator[str, None]:
        # Simulate typing by splitting result
        for word in result_text.split(' '):
            payload = json.dumps({"text": word + " "}, ensure_ascii=False)
            yield f"data: {payload}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
