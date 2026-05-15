"""Route integration tests using FastAPI TestClient."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import io

from app.main import app, rate_limits


@pytest.fixture
def client():
    """Create test client with clean state."""
    app.state.store.tasks.clear()
    app.state.store.save()
    rate_limits.clear()
    yield TestClient(app)
    app.state.store.tasks.clear()
    app.state.store.save()


# ── Health ────────────────────────────────────────────────────────

def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ── Tasks CRUD ────────────────────────────────────────────────────

def test_list_tasks_empty(client):
    res = client.get("/api/tasks/")
    assert res.status_code == 200
    assert res.json() == []


def test_create_task(client):
    res = client.post("/api/tasks/", json={
        "name": "Test Task",
        "start_date": "2026-01-01",
        "end_date": "2026-01-05",
        "assignee": "Alice",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Test Task"
    assert data["assignee"] == "Alice"
    assert data["id"] is not None


def test_get_task(client):
    create_res = client.post("/api/tasks/", json={
        "name": "Get Me", "start_date": "2026-01-01", "end_date": "2026-01-05",
    })
    task_id = create_res.json()["id"]
    res = client.get(f"/api/tasks/{task_id}")
    assert res.status_code == 200
    assert res.json()["name"] == "Get Me"


def test_get_task_not_found(client):
    res = client.get("/api/tasks/nonexistent")
    assert res.status_code == 404


def test_update_task(client):
    create_res = client.post("/api/tasks/", json={
        "name": "Old Name", "start_date": "2026-01-01", "end_date": "2026-01-05",
    })
    task_id = create_res.json()["id"]
    res = client.put(f"/api/tasks/{task_id}", json={
        "id": task_id, "name": "New Name",
    })
    assert res.status_code == 200
    assert res.json()["name"] == "New Name"


def test_delete_task(client):
    create_res = client.post("/api/tasks/", json={
        "name": "Delete Me", "start_date": "2026-01-01", "end_date": "2026-01-05",
    })
    task_id = create_res.json()["id"]
    res = client.delete(f"/api/tasks/{task_id}")
    assert res.status_code == 204
    get_res = client.get(f"/api/tasks/{task_id}")
    assert get_res.status_code == 404


def test_create_task_xss_sanitized(client):
    res = client.post("/api/tasks/", json={
        "name": "<script>alert('xss')</script>",
        "start_date": "2026-01-01",
        "end_date": "2026-01-05",
    })
    assert res.status_code == 201
    assert "<script>" not in res.json()["name"]


# ── Plan ──────────────────────────────────────────────────────────

def test_seed_plan(client):
    res = client.post("/api/plan/seed")
    assert res.status_code == 200
    tasks = client.get("/api/tasks/").json()
    assert len(tasks) >= 3


def test_reset_plan(client):
    client.post("/api/plan/seed")
    res = client.request("DELETE", "/api/plan/reset")
    assert res.status_code == 200
    tasks = client.get("/api/tasks/").json()
    assert len(tasks) == 0


def test_get_plan(client):
    client.post("/api/plan/seed")
    res = client.get("/api/plan/")
    assert res.status_code == 200
    data = res.json()
    assert "tasks" in data or isinstance(data, list)


# ── Excel Export ──────────────────────────────────────────────────

def test_export_excel(client):
    client.post("/api/tasks/", json={
        "name": "Export Test", "start_date": "2026-01-01", "end_date": "2026-01-05",
    })
    res = client.get("/api/excel/export")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument"
    )


# ── Excel Upload ──────────────────────────────────────────────────

def test_upload_excel(client, sample_tasks_xlsx):
    with open(sample_tasks_xlsx, "rb") as f:
        res = client.post("/api/excel/upload", files={"file": ("test.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
    assert res.status_code == 200
    data = res.json()
    assert "imported" in data
    assert data["imported"] >= 1


@pytest.fixture
def sample_tasks_xlsx(tmp_path):
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.append(["задача", "описание", "исполнитель", "длительность", "предшественники"])
    ws.append(["Task A", "Description A", "Alice", 3, ""])
    ws.append(["Task B", "Description B", "Bob", 5, "1"])
    fpath = str(tmp_path / "test.xlsx")
    wb.save(fpath)
    return fpath


# ── Chat ──────────────────────────────────────────────────────────

def test_chat_endpoint(client):
    """Chat endpoint accepts requests and returns SSE stream."""
    res = client.post("/api/chat/", json={
        "message": "Add a task",
        "history": [],
    })
    # SSE endpoint — should return 200 with streaming content
    assert res.status_code == 200
    assert "text/event-stream" in res.headers.get("content-type", "")


# ── Auth ──────────────────────────────────────────────────────────

def test_login_success(client):
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data


def test_login_failure(client):
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "wrong",
    })
    assert res.status_code == 401


def test_get_me_with_token(client):
    login_res = client.post("/api/auth/login", json={
        "username": "admin", "password": "admin",
    })
    token = login_res.json()["access_token"]
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["user"] == "admin"


def test_get_me_no_token(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401
