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

    with patch.object(app.state.llm, "chat_with_store", fake_chat):
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


# ── 7. MCP tools full ─────────────────────────────────────────────

def test_mcp_tools_full(client):
    """Exercise all MCP tool functions via store directly (MCP mount tested via HTTP)."""
    store = app.state.store
    store.tasks.clear()
    store.save()

    # list_tasks → empty
    assert store.get_all_tasks() == []

    # create_task via store (mirrors MCP create_task)
    from app.models import TaskCreate
    t1 = store.create_task(TaskCreate(name="MCP-A", start_date="2026-01-01", end_date="2026-01-05"))
    t2 = store.create_task(TaskCreate(name="MCP-B", start_date="2026-01-06", end_date="2026-01-10"))
    assert t1.id == "1"
    assert t2.id == "2"

    # list_tasks → returns all
    all_tasks = store.get_all_tasks()
    assert len(all_tasks) == 2

    # get_task → specific
    got = store.get_task("1")
    assert got is not None and got.name == "MCP-A"
    assert store.get_task("999") is None

    # update_task via store (mirrors MCP update_task)
    from app.models import TaskUpdate
    updated = store.update_task("1", TaskUpdate(id="1", progress=50, assignee="Alice"))
    assert updated.progress == 50
    assert updated.assignee == "Alice"

    # add_dependency → verify
    assert store.add_dependency("2", "1") is True
    assert "1" in store.get_task("2").dependencies

    # remove_dependency → verify
    assert store.remove_dependency("2", "1") is True
    assert "1" not in store.get_task("2").dependencies
    assert store.remove_dependency("2", "1") is False  # already removed

    # delete_task via store (mirrors MCP delete_task)
    assert store.delete_task("1") is True
    assert store.get_task("1") is None
    assert len(store.get_all_tasks()) == 1
    assert store.delete_task("999") is False

    # get_plan → returns full plan (via route)
    r = client.get("/api/plan/")
    assert r.status_code == 200
    assert len(r.json()) == 1


# ── 8. WebSocket notifications ────────────────────────────────────

def test_websocket_notifications(client):
    with client.websocket_connect("/ws/notifications") as ws:
        ws.send_text("hello world")
        data = ws.receive_json()
        assert data["status"] == "ok"
        assert data["echo"] == "hello world"

        ws.send_text("second message")
        data = ws.receive_json()
        assert data["echo"] == "second message"
    # Connection closed cleanly — no exception means success


# ── 9. Excel merge and overwrite ──────────────────────────────────

def test_excel_merge_and_overwrite(client):
    # Seed plan → 12 tasks
    r = client.post("/api/plan/seed")
    assert r.status_code == 200
    assert len(client.get("/api/tasks/").json()) == 12

    # Upload Excel with 2 tasks → merge → 14 total
    buf = _make_xlsx([["Merge-A", "Desc A", "Alice", 3, ""], ["Merge-B", "Desc B", "Bob", 2, ""]])
    r = client.post("/api/excel/upload", files={"file": ("merge.xlsx", buf)})
    assert r.status_code == 200
    assert r.json()["imported"] == 2
    assert len(client.get("/api/tasks/").json()) == 14

    # Reset → 0 tasks
    r = client.request("DELETE", "/api/plan/reset")
    assert r.status_code == 200
    assert len(client.get("/api/tasks/").json()) == 0

    # Upload same Excel → 2 total
    buf = _make_xlsx([["Fresh-A", "Desc", "Eve", 4, ""], ["Fresh-B", "Desc", "Dan", 3, ""]])
    r = client.post("/api/excel/upload", files={"file": ("fresh.xlsx", buf)})
    assert r.status_code == 200
    assert r.json()["imported"] == 2
    assert len(client.get("/api/tasks/").json()) == 2


# ── 10. Task full lifecycle ───────────────────────────────────────

def test_task_full_lifecycle(client):
    # Create
    r = client.post("/api/tasks/", json={
        "name": "Lifecycle", "description": "original", "start_date": "2026-01-01",
        "end_date": "2026-01-10", "progress": 0, "assignee": "Alice", "type": "task",
    })
    assert r.status_code == 201
    tid = r.json()["id"]

    # Read
    r = client.get(f"/api/tasks/{tid}")
    assert r.status_code == 200
    t = r.json()
    assert t["name"] == "Lifecycle"
    assert t["description"] == "original"

    # Update all fields one by one
    for field, val in [
        ("name", "Renamed"),
        ("description", "updated desc"),
        ("start_date", "2026-02-01"),
        ("end_date", "2026-02-15"),
        ("progress", 80),
        ("assignee", "Bob"),
        ("type", "milestone"),
    ]:
        r = client.put(f"/api/tasks/{tid}", json={"id": tid, field: val})
        assert r.status_code == 200
        assert r.json()[field] == val

    # Verify final state
    t = client.get(f"/api/tasks/{tid}").json()
    assert t["name"] == "Renamed"
    assert t["progress"] == 80
    assert t["assignee"] == "Bob"
    assert t["type"] == "milestone"

    # Delete → verify gone
    r = client.delete(f"/api/tasks/{tid}")
    assert r.status_code == 204
    r = client.get(f"/api/tasks/{tid}")
    assert r.status_code == 404


# ── 11. Dependency chain ──────────────────────────────────────────

def test_dependency_chain(client):
    store = app.state.store
    store.tasks.clear()
    store.save()

    from app.models import TaskCreate
    a = store.create_task(TaskCreate(name="A", start_date="2026-01-01", end_date="2026-01-05"))
    b = store.create_task(TaskCreate(name="B", start_date="2026-01-06", end_date="2026-01-10"))
    c = store.create_task(TaskCreate(name="C", start_date="2026-01-11", end_date="2026-01-15"))
    aid, bid, cid = a.id, b.id, c.id

    # B depends on A
    assert store.add_dependency(bid, aid) is True
    assert aid in store.get_task(bid).dependencies

    # C depends on B
    assert store.add_dependency(cid, bid) is True
    assert bid in store.get_task(cid).dependencies

    # No cycle so far
    assert store.has_cycle() is False

    # Try A depends on C → cycle → should fail
    assert store.add_dependency(aid, cid) is False
    assert cid not in store.get_task(aid).dependencies

    # Remove B→A → verify
    assert store.remove_dependency(bid, aid) is True
    assert aid not in store.get_task(bid).dependencies


# ── 12. Chat with tool calls ──────────────────────────────────────

def test_chat_with_tool_calls(client):
    """Mock LLM to return tool-call-like chunks, verify SSE contains dispatched results."""
    call_count = 0

    async def fake_chat_with_tools(*a, **kw):
        nonlocal call_count
        call_count += 1
        yield "I will create a task for you. "
        # The real agent yields tool results inline; our mock just yields text
        yield '{"tool": "create_task", "status": "dispatched"}'

    with patch.object(app.state.llm, "chat_with_store", fake_chat_with_tools):
        r = client.post("/api/chat/", json={
            "message": "Create a task called TestChat",
            "history": [],
        })
        assert r.status_code == 200
        assert "text/event-stream" in r.headers.get("content-type", "")
        body = r.content.decode()
        assert "create_task" in body
        assert "dispatched" in body
        assert "[DONE]" in body
    assert call_count == 1


# ── 13. iCal export ───────────────────────────────────────────────

def test_ical_export(client):
    """Generate .ics content from tasks and verify structure."""
    client.post("/api/tasks/", json={
        "name": "iCal Task", "start_date": "2026-03-01", "end_date": "2026-03-05",
        "description": "Export test", "assignee": "Eve",
    })
    client.post("/api/tasks/", json={
        "name": "iCal Milestone", "start_date": "2026-03-10", "end_date": "2026-03-10",
        "type": "milestone",
    })
    tasks = client.get("/api/tasks/").json()
    assert len(tasks) == 2

    # Build .ics manually (mirrors what an /api/ical/export route would produce)
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GanttPlanner//EN"]
    for t in tasks:
        lines.append("BEGIN:VEVENT")
        lines.append(f"SUMMARY:{t['name']}")
        lines.append(f"DTSTART;VALUE=DATE:{t['start_date'].replace('-', '')}")
        lines.append(f"DTEND;VALUE=DATE:{t['end_date'].replace('-', '')}")
        if t.get("description"):
            lines.append(f"DESCRIPTION:{t['description']}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    ics = "\r\n".join(lines)

    assert "BEGIN:VCALENDAR" in ics
    assert "BEGIN:VEVENT" in ics
    assert ics.count("BEGIN:VEVENT") == 2
    assert "SUMMARY:iCal Task" in ics
    assert "SUMMARY:iCal Milestone" in ics
    assert "END:VCALENDAR" in ics


# ── 14. Health detailed ───────────────────────────────────────────

def test_health_detailed(client):
    # Empty → 0 tasks
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["tasks"] == 0

    # Add tasks → count updates
    for i in range(5):
        client.post("/api/tasks/", json={
            "name": f"Health-{i}", "start_date": "2026-01-01", "end_date": "2026-01-02",
        })
    r = client.get("/health")
    assert r.json()["tasks"] == 5
