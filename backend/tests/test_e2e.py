"""End-to-end tests: full user journeys via FastAPI TestClient."""

import io
import json
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from openpyxl import Workbook

from app.main import app, rate_limits


@pytest.fixture
def client():
    app.state.store.tasks.clear()
    app.state.store.save()
    rate_limits.clear()
    yield TestClient(app)
    app.state.store.tasks.clear()
    app.state.store.save()


def _login(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert r.status_code == 200
    return r.json()["access_token"]


def _make_xlsx(rows):
    wb = Workbook()
    ws = wb.active
    ws.append(["задача", "описание", "исполнитель", "длительность", "предшественники"])
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


# ── 1. Full user journey ──────────────────────────────────────────

def test_full_user_journey(client):
    # Login
    token = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Seed plan → 12 tasks
    r = client.post("/api/plan/seed")
    assert r.status_code == 200
    tasks = client.get("/api/tasks/").json()
    assert len(tasks) == 12

    # Create new task
    r = client.post("/api/tasks/", json={
        "name": "E2E Task", "start_date": "2026-09-01", "end_date": "2026-09-10",
        "assignee": "Tester",
    })
    assert r.status_code == 201
    tid = r.json()["id"]

    # Update task
    r = client.put(f"/api/tasks/{tid}", json={"id": tid, "progress": 75})
    assert r.status_code == 200
    assert r.json()["progress"] == 75

    # Export Excel
    r = client.get("/api/excel/export")
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers["content-type"]

    # Reset plan
    r = client.request("DELETE", "/api/plan/reset")
    assert r.status_code == 200
    assert len(client.get("/api/tasks/").json()) == 0

    # Upload sample Excel
    buf = _make_xlsx([["Import A", "Desc", "Alice", 3, ""]])
    r = client.post("/api/excel/upload", files={"file": ("s.xlsx", buf)})
    assert r.status_code == 200
    assert r.json()["imported"] >= 1

    # Chat with mocked LLM
    async def fake_chat(*a, **kw):
        yield "mocked response"

    with patch.object(app.state.llm, "chat", fake_chat):
        r = client.post("/api/chat/", json={"message": "hello", "history": []})
        assert r.status_code == 200
        assert "text/event-stream" in r.headers.get("content-type", "")
        assert b"mocked response" in r.content


# ── 2. Concurrent operations ──────────────────────────────────────

def test_concurrent_operations(client):
    ids = []
    for i in range(10):
        r = client.post("/api/tasks/", json={
            "name": f"Rapid {i}", "start_date": "2026-01-01", "end_date": "2026-01-05",
        })
        assert r.status_code == 201
        ids.append(r.json()["id"])

    assert len(client.get("/api/tasks/").json()) == 10

    for tid in ids[:5]:
        r = client.delete(f"/api/tasks/{tid}")
        assert r.status_code == 204

    assert len(client.get("/api/tasks/").json()) == 5


# ── 3. Auth flow ──────────────────────────────────────────────────

def test_auth_flow(client):
    # Login success → token → /me
    token = _login(client)
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["user"] == "admin"

    # Login fail → 401
    r = client.post("/api/auth/login", json={"username": "admin", "password": "bad"})
    assert r.status_code == 401

    # Me without token → 401
    r = client.get("/api/auth/me")
    assert r.status_code == 401


# ── 4. Rate limit ─────────────────────────────────────────────────

def test_rate_limit_e2e(client):
    rate_limits.clear()
    # Exhaust limit (30/min) on /api/ paths
    for _ in range(30):
        r = client.get("/health")
    # health is NOT under /api/ so no rate limit — use /api/tasks/ instead
    rate_limits.clear()
    for _ in range(30):
        r = client.get("/api/tasks/")
        assert r.status_code == 200
    # 31st should be 429
    r = client.get("/api/tasks/")
    assert r.status_code == 429


# ── 5. Task limit ─────────────────────────────────────────────────

def test_task_limit_e2e(client):
    for i in range(500):
        if i % 25 == 0:
            rate_limits.clear()
        r = client.post("/api/tasks/", json={
            "name": f"T{i}", "start_date": "2026-01-01", "end_date": "2026-01-02",
        })
        assert r.status_code == 201, f"Failed at task {i}: {r.text}"

    # 501st → error
    r = client.post("/api/tasks/", json={
        "name": "Overflow", "start_date": "2026-01-01", "end_date": "2026-01-02",
    })
    assert r.status_code == 400
    assert "Maximum" in r.json()["detail"]


# ── 6. Plan persistence ──────────────────────────────────────────

def test_plan_persistence(client, tmp_path):
    plan_file = tmp_path / "persist_test.json"
    # Point store to temp file
    app.state.store._file_path = plan_file
    app.state.store.tasks.clear()
    app.state.store.save()

    client.post("/api/tasks/", json={
        "name": "Persist Me", "start_date": "2026-01-01", "end_date": "2026-01-05",
    })
    client.post("/api/tasks/", json={
        "name": "Persist Too", "start_date": "2026-01-06", "end_date": "2026-01-10",
    })
    assert plan_file.exists()

    # Re-load store from same file
    from app.store import PlanState
    new_store = PlanState()
    new_store._file_path = plan_file
    new_store._load()
    assert len(new_store.tasks) == 2
    assert any(t.name == "Persist Me" for t in new_store.tasks.values())

    # Restore original path
    app.state.store._file_path = Path("plan.json")
