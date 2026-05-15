"""FastAPI application entry point for AI Gantt Planner."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.llm_agent import LLMAgent
from app.mcp_server import get_mcp_app
from app.models import SeedTask
from app.store import PlanState
from app.routes import tasks, chat, excel, plan

DATA_DIR = Path("plan.json").parent


def _default_seed() -> list[SeedTask]:
    return [
        SeedTask(
            name="Project Kickoff",
            description="Define scope, team, and milestones",
            start="2026-05-15",
            end="2026-05-20",
            progress=0,
            type="milestone",
            assignee="PM",
        ),
        SeedTask(
            name="Requirements Gathering",
            description="Collect and document all requirements",
            start="2026-05-21",
            end="2026-06-10",
            progress=0,
            type="task",
            assignee="Analyst",
            dependencies=["1"],
        ),
        SeedTask(
            name="Architecture Design",
            description="Design system architecture and tech stack",
            start="2026-06-11",
            end="2026-06-25",
            progress=0,
            type="task",
            assignee="Architect",
            dependencies=["2"],
        ),
    ]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: ensure data dir, load state, auto-seed if empty."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    store: PlanState = app.state.store
    if not store.tasks:
        store.seed(_default_seed())
    yield


app = FastAPI(title="AI Gantt Planner API", lifespan=lifespan)

# ── CORS (dev: allow all) ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── State ───────────────────────────────────────────────────────────
store = PlanState()
app.state.store = store
app.state.llm = LLMAgent(
    api_key=os.getenv("OPENAI_API_KEY") or "sk-placeholder",
    base_url=os.getenv("OPENAI_BASE_URL"),
    model=os.getenv("OPENAI_MODEL"),
)

# ── Routers ─────────────────────────────────────────────────────────
app.include_router(tasks.router)
app.include_router(chat.router)
app.include_router(excel.router)
app.include_router(plan.router)

# ── MCP mount ───────────────────────────────────────────────────────
mcp = get_mcp_app(store)
app.mount("/mcp", mcp.streamable_http_app())

# ── Health ──────────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok"}
