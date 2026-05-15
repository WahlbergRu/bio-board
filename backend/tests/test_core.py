import pytest
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, AsyncMock

# ── Models ────────────────────────────────────────────────────────

def test_task_valid():
    from app.models import Task
    t = Task(id="1", name="Test", start_date="2026-01-01", end_date="2026-01-05")
    assert t.name == "Test"
    assert t.progress == 0
    assert t.type == "task"
    assert t.dependencies == []

def test_task_invalid_date():
    from app.models import Task
    with pytest.raises(Exception):
        Task(id="1", name="Test", start_date="01-01-2026", end_date="2026-01-05")

def test_task_invalid_progress():
    from app.models import Task
    with pytest.raises(Exception):
        Task(id="1", name="Test", start_date="2026-01-01", end_date="2026-01-05", progress=150)

def test_task_invalid_type():
    from app.models import Task
    with pytest.raises(Exception):
        Task(id="1", name="Test", start_date="2026-01-01", end_date="2026-01-05", type="invalid")

def test_task_xss_sanitization():
    from app.models import Task
    t = Task(id="1", name="<script>alert(1)</script>", start_date="2026-01-01", end_date="2026-01-05")
    assert "<script>" not in t.name
    assert "&lt;" in t.name

def test_task_serialize():
    from app.models import Task
    t = Task(id="1", name="Test", start_date="2026-01-01", end_date="2026-01-05", progress=50)
    d = t.model_dump()
    assert d["name"] == "Test"
    assert d["progress"] == 50

# ── Store ─────────────────────────────────────────────────────────

@pytest.fixture
def tmp_store():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        fpath = Path(f.name)
    from app.store import PlanState
    store = PlanState()
    store._file_path = fpath
    yield store
    fpath.unlink(missing_ok=True)

def test_store_create_task(tmp_store):
    from app.models import TaskCreate
    result = tmp_store.create_task(TaskCreate(
        name="New Task", start_date="2026-01-01", end_date="2026-01-05"
    ))
    assert isinstance(result, object)
    assert result.name == "New Task"
    assert result.id in tmp_store.tasks

def test_store_update_task(tmp_store):
    from app.models import TaskCreate, TaskUpdate
    task = tmp_store.create_task(TaskCreate(
        name="Old", start_date="2026-01-01", end_date="2026-01-05"
    ))
    updated = tmp_store.update_task(task.id, TaskUpdate(id=task.id, name="New"))
    assert updated.name == "New"

def test_store_delete_task(tmp_store):
    from app.models import TaskCreate
    task = tmp_store.create_task(TaskCreate(
        name="Delete me", start_date="2026-01-01", end_date="2026-01-05"
    ))
    assert tmp_store.delete_task(task.id) is True
    assert task.id not in tmp_store.tasks

def test_store_delete_nonexistent(tmp_store):
    assert tmp_store.delete_task("999") is False

def test_store_max_tasks():
    from app.store import PlanState
    import tempfile
    from pathlib import Path
    f = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
    f.close()
    store = PlanState()
    store._file_path = Path(f.name)
    from app.models import TaskCreate
    for i in range(store.MAX_TASKS):
        store.create_task(TaskCreate(
            name=f"Task {i}", start_date="2026-01-01", end_date="2026-01-05"
        ))
    result = store.create_task(TaskCreate(
        name="Overflow", start_date="2026-01-01", end_date="2026-01-05"
    ))
    assert isinstance(result, str)
    assert "Maximum" in result
    Path(f.name).unlink()

def test_store_cycle_detection(tmp_store):
    from app.models import TaskCreate
    t1 = tmp_store.create_task(TaskCreate(name="A", start_date="2026-01-01", end_date="2026-01-05"))
    t2 = tmp_store.create_task(TaskCreate(name="B", start_date="2026-01-06", end_date="2026-01-10"))
    t3 = tmp_store.create_task(TaskCreate(name="C", start_date="2026-01-11", end_date="2026-01-15"))

    # A depends on B
    tmp_store.tasks[t1.id].dependencies.append(t2.id)
    # B depends on C
    tmp_store.tasks[t2.id].dependencies.append(t3.id)
    assert tmp_store.has_cycle() is False

    # C depends on A → cycle
    tmp_store.tasks[t3.id].dependencies.append(t1.id)
    assert tmp_store.has_cycle() is True

def test_store_add_dependency_cycle_blocked(tmp_store):
    from app.models import TaskCreate
    t1 = tmp_store.create_task(TaskCreate(name="A", start_date="2026-01-01", end_date="2026-01-05"))
    t2 = tmp_store.create_task(TaskCreate(name="B", start_date="2026-01-06", end_date="2026-01-10"))
    # Add A→B, then B→A (cycle)
    tmp_store.tasks[t1.id].dependencies.append(t2.id)
    # Adding B→A should be detected and reverted
    result = tmp_store.add_dependency(t2.id, t1.id)
    assert result is False
    assert t1.id not in tmp_store.tasks[t2.id].dependencies

def test_store_persistence(tmp_store):
    from app.models import TaskCreate
    tmp_store.create_task(TaskCreate(
        name="Persisted", start_date="2026-01-01", end_date="2026-01-05"
    ))
    assert tmp_store._file_path.exists()
    data = json.loads(tmp_store._file_path.read_text())
    assert len(data) == 1

def test_store_delete_removes_dangling_deps(tmp_store):
    from app.models import TaskCreate
    t1 = tmp_store.create_task(TaskCreate(name="A", start_date="2026-01-01", end_date="2026-01-05"))
    t2 = tmp_store.create_task(TaskCreate(name="B", start_date="2026-01-06", end_date="2026-01-10"))
    tmp_store.tasks[t1.id].dependencies.append(t2.id)
    tmp_store.delete_task(t2.id)
    assert t2.id not in tmp_store.tasks[t1.id].dependencies

def test_store_seed(tmp_store):
    from app.models import SeedTask
    seeds = [
        SeedTask(name="S1", start="2026-01-01", end="2026-01-05", assignee="Alice"),
        SeedTask(name="S2", start="2026-01-06", end="2026-01-10", assignee="Bob"),
    ]
    tmp_store.seed(seeds)
    assert len(tmp_store.tasks) == 2
    assert any(t.name == "S1" for t in tmp_store.tasks.values())

# ── Excel Service ─────────────────────────────────────────────────

def test_excel_roundtrip():
    from app.excel_service import export_excel, parse_excel
    tasks = [
        {"name": "Task 1", "description": "Desc 1", "assignee": "Alice",
         "start_date": "2026-01-01", "end_date": "2026-01-05",
         "dependencies": ["2"]},
        {"name": "Task 2", "description": "Desc 2", "assignee": "Bob",
         "start_date": "2026-01-06", "end_date": "2026-01-10",
         "dependencies": []},
    ]
    xlsx_bytes = export_excel(tasks)
    assert len(xlsx_bytes) > 0
    parsed = parse_excel(xlsx_bytes)
    assert len(parsed) == 2
    assert parsed[0]["name"] == "Task 1"

def test_excel_empty():
    from app.excel_service import export_excel, parse_excel
    xlsx_bytes = export_excel([])
    assert len(xlsx_bytes) > 0
    parsed = parse_excel(xlsx_bytes)
    assert parsed == []

def test_excel_duration_calc():
    from app.excel_service import _calculate_duration
    assert _calculate_duration("2026-01-01", "2026-01-05") == 4
    assert _calculate_duration("2026-01-01", "2026-01-01") == 0

def test_excel_dependencies_semicolon():
    from app.excel_service import export_excel, parse_excel
    tasks = [
        {"name": "A", "description": "", "assignee": "",
         "start_date": "2026-01-01", "end_date": "2026-01-05", "predecessors": ["2", "3"]},
        {"name": "B", "description": "", "assignee": "",
         "start_date": "2026-01-06", "end_date": "2026-01-10", "predecessors": []},
        {"name": "C", "description": "", "assignee": "",
         "start_date": "2026-01-06", "end_date": "2026-01-10", "predecessors": []},
    ]
    xlsx_bytes = export_excel(tasks)
    parsed = parse_excel(xlsx_bytes)
    assert len(parsed) == 3
    assert "2" in parsed[0]["predecessors"]
    assert "3" in parsed[0]["predecessors"]

# ── Auth ──────────────────────────────────────────────────────────

def test_auth_token_create_and_verify():
    from app.main import _make_token, _verify_token
    token = _make_token("testuser")
    assert "." in token
    data = _verify_token(token)
    assert data is not None
    assert data["user"] == "testuser"

def test_auth_token_expired():
    from app.main import _make_token, _verify_token
    import time
    import json
    import hmac
    import hashlib
    from app.main import JWT_SECRET
    # Create expired token manually
    payload = json.dumps({"user": "testuser", "exp": time.time() - 100})
    sig = hmac.new(JWT_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    expired_token = f"{payload}.{sig}"
    assert _verify_token(expired_token) is None

def test_auth_token_tampered():
    from app.main import _verify_token
    assert _verify_token("bad.payload") is None
    assert _verify_token("totally-invalid") is None

# ── Rate Limit ────────────────────────────────────────────────────

def test_rate_limit_allows_normal():
    from app.main import _check_rate, rate_limits
    rate_limits.clear()
    assert _check_rate("test-ip") is True
    assert _check_rate("test-ip") is True

def test_rate_limit_blocks_excess():
    from app.main import _check_rate, rate_limits, RATE_LIMIT
    rate_limits.clear()
    for _ in range(RATE_LIMIT):
        _check_rate("block-ip")
    assert _check_rate("block-ip") is False

def test_rate_limit_resets_after_window():
    from app.main import _check_rate, rate_limits, RATE_WINDOW
    import time
    rate_limits.clear()
    rate_limits["old-ip"] = [time.time() - RATE_WINDOW - 10]
    assert _check_rate("old-ip") is True
