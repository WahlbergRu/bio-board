"""LLM settings routes."""

from fastapi import APIRouter, Request

from app.models import LLMSettingsUpdate, LLMSettingsResponse

router = APIRouter(prefix="/api/settings/llm", tags=["settings"])


@router.get("", response_model=LLMSettingsResponse)
async def get_llm_settings(request: Request):
    """Return current LLM configuration."""
    llm = request.app.state.llm
    return LLMSettingsResponse(
        base_url=llm.base_url or "",
        model=llm.model or "",
        api_key_set=bool(llm.api_key and llm.api_key != "sk-placeholder"),
    )


@router.post("", response_model=LLMSettingsResponse)
async def update_llm_settings(data: LLMSettingsUpdate, request: Request):
    """Update LLM configuration at runtime."""
    request.app.state.llm.reconfigure(
        api_key=data.api_key,
        base_url=data.base_url,
        model=data.model,
    )

    llm = request.app.state.llm
    return LLMSettingsResponse(
        base_url=llm.base_url or "",
        model=llm.model or "",
        api_key_set=bool(llm.api_key and llm.api_key != "sk-placeholder"),
    )
