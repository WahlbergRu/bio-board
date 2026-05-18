"""FastAPI application entry point for AI Gantt Planner."""

import os
import time
import json
import hashlib
from contextlib import asynccontextmanager
from pathlib import Path

import jwt
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.llm_agent import LLMAgent
from app.mcp_server import get_mcp_app
from app.models import TokenResponse, LoginRequest
from app.store import PlanState
from app.routes import tasks, chat, excel, plan, settings

DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data"))
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY = 86400  # 24 hours

# Default admin credentials — hashed at startup
_ADMIN_USER = os.getenv("ADMIN_USER", "admin")
_ADMIN_PASS = os.getenv("ADMIN_PASS", "admin")

# CORS — configurable, restrict in production
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
if CORS_ORIGINS == ["*"]:
    ALLOW_ORIGINS = ["*"]
else:
    ALLOW_ORIGINS = [o.strip() for o in CORS_ORIGINS if o.strip()]

# Simple in-memory rate limiter
rate_limits: dict[str, list[float]] = {}
RATE_LIMIT = 30  # requests per minute
RATE_WINDOW = 60


def _check_rate(ip: str) -> bool:
    now = time.time()
    history = [t for t in rate_limits.get(ip, []) if now - t < RATE_WINDOW]
    if len(history) >= RATE_LIMIT:
        return False
    history.append(now)
    rate_limits[ip] = history
    return True


def _make_token(user: str) -> str:
    payload = {"user": user, "exp": int(time.time()) + JWT_EXPIRY, "iat": int(time.time())}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="AI Gantt Planner API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=ALLOW_ORIGINS == ["*"],
    allow_methods=["*"] if ALLOW_ORIGINS == ["*"] else ["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

store = PlanState(data_dir=DATA_DIR)
app.state.store = store
app.state.llm = LLMAgent(
    api_key=os.getenv("OPENAI_API_KEY") or "sk-placeholder",
    base_url=os.getenv("OPENAI_BASE_URL"),
    model=os.getenv("OPENAI_MODEL"),
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        ip = request.client.host if request.client else "unknown"
        if not _check_rate(ip):
            from fastapi.responses import JSONResponse
            return JSONResponse({"error": "Rate limit exceeded"}, status_code=429)
    return await call_next(request)


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    # In production, check against hashed passwords from DB
    if req.username == _ADMIN_USER and hashlib.sha256(req.password.encode()).hexdigest() == app.state.admin_hash:
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
    # TODO: add auth check before accepting
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
app.include_router(settings.router)

mcp = get_mcp_app(store)
app.mount("/mcp", mcp.streamable_http_app())


@app.get("/health")
async def health():
    return {"status": "ok", "tasks": len(store.tasks)}



# Hash admin password at module load time
app.state.admin_hash = hashlib.sha256(_ADMIN_PASS.encode()).hexdigest()
