"""FastAPI application entry point for AI Gantt Planner."""

import os
import time
import hmac
import hashlib
import json
import base64
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.llm_agent import LLMAgent
from app.mcp_server import get_mcp_app
from app.models import SeedTask, TokenResponse, LoginRequest
from app.store import PlanState
from app.routes import tasks, chat, excel, plan

DATA_DIR = Path("plan.json").parent
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
USERS = {os.getenv("ADMIN_USER", "admin"): os.getenv("ADMIN_PASS", "admin")}

# Simple rate limiter
rate_limits: dict[str, list[float]] = {}
RATE_LIMIT = 30  # requests per minute
RATE_WINDOW = 60


def _check_rate(ip: str) -> bool:
    now = time.time()
    history = rate_limits.get(ip, [])
    history = [t for t in history if now - t < RATE_WINDOW]
    rate_limits[ip] = history
    if len(history) >= RATE_LIMIT:
        return False
    history.append(now)
    return True


def _make_token(user: str) -> str:
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps({"user": user, "exp": int(time.time() + 86400)}).encode()
    ).decode().rstrip("=")
    sig = hmac.new(JWT_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def _verify_token(token: str) -> dict | None:
    try:
        payload_b64, sig = token.rsplit(".", 1)
        expected = hmac.new(JWT_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if sig != expected:
            return None
        padded = payload_b64 + "=" * (4 - len(payload_b64) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    store: PlanState = app.state.store
    if not store.tasks:
        store.seed(_default_seed())
    yield


app = FastAPI(title="AI Gantt Planner API", lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

store = PlanState()
app.state.store = store
app.state.llm = LLMAgent(
    api_key=os.getenv("OPENAI_API_KEY") or "sk-placeholder",
    base_url=os.getenv("OPENAI_BASE_URL"),
    model=os.getenv("OPENAI_MODEL"),
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    if request.url.path.startswith("/api/") and not _check_rate(ip):
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "Rate limit exceeded"}, status_code=429)
    return await call_next(request)


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    if USERS.get(req.username) == req.password:
        return TokenResponse(access_token=_make_token(req.username))
    raise HTTPException(401, "Invalid credentials")


@app.get("/api/auth/me")
async def get_me(request: Request):
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        data = _verify_token(auth[7:])
        if data:
            return {"user": data["user"]}
    raise HTTPException(401, "Not authenticated")


@app.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({"status": "ok", "echo": data}))
    except WebSocketDisconnect:
        pass


app.include_router(tasks.router)
app.include_router(chat.router)
app.include_router(excel.router)
app.include_router(plan.router)

mcp = get_mcp_app(store)
app.mount("/mcp", mcp.streamable_http_app())


@app.get("/health")
async def health():
    return {"status": "ok", "tasks": len(store.tasks)}


def _default_seed() -> list[SeedTask]:
    return [
        SeedTask(name="Project Kickoff", description="Define scope, team, and milestones",
                 start="2026-05-15", end="2026-05-20", progress=0, type="milestone", assignee="PM"),
        SeedTask(name="Requirements Gathering", description="Collect and document all requirements",
                 start="2026-05-21", end="2026-06-10", progress=0, type="task", assignee="Analyst", dependencies=["1"]),
        SeedTask(name="Architecture Design", description="Design system architecture and tech stack",
                 start="2026-06-11", end="2026-06-25", progress=0, type="task", assignee="Architect", dependencies=["2"]),
    ]
