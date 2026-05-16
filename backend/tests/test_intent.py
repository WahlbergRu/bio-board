"""Tests for the fallback intent parser in chat route."""

import pytest
from fastapi.testclient import TestClient
from app.main import app, rate_limits
from app.routes.chat import _parse_intent
from app.store import PlanState


@pytest.fixture
def client():
    app.state.store.tasks.clear()
    app.state.store.save()
    rate_limits.clear()
    yield TestClient(app)
    app.state.store.tasks.clear()
    app.state.store.save()


@pytest.fixture
def seeded_store():
    """Store with 3 seeded tasks."""
    store = app.state.store
    store.tasks.clear()
    store.seed([])
    from app.models import TaskCreate
    store.create_task(TaskCreate(name="Backend Dev", start_date="2026-06-01", end_date="2026-06-10", assignee="Alice"))
    store.create_task(TaskCreate(name="Frontend Dev", start_date="2026-06-11", end_date="2026-06-20", assignee="Bob"))
    store.create_task(TaskCreate(name="Testing", start_date="2026-06-21", end_date="2026-06-25", assignee="Charlie"))
    return store


def test_parse_create_task_simple(seeded_store):
    """Add task X"""
    intents = _parse_intent("Add task Design", seeded_store)
    assert len(intents) == 1
    assert intents[0]["tool"] == "create_task"
    assert intents[0]["args"]["name"] == "Design"


def test_parse_create_task_with_duration(seeded_store):
    """Add task X for N days"""
    intents = _parse_intent("Add task Review for 5 days", seeded_store)
    assert len(intents) == 1
    assert intents[0]["args"]["name"] == "Review"


def test_parse_create_task_with_assignee(seeded_store):
    """Add task X by assignee Y"""
    intents = _parse_intent("Add task Code by Ivan", seeded_store)
    assert len(intents) == 1
    assert intents[0]["args"]["name"] == "Code"
    assert intents[0]["args"]["assignee"].strip().lower() == "ivan"


def test_parse_create_task_full(seeded_store):
    """Add task X for N days by Y after Z"""
    intents = _parse_intent("Add task Deploy for 2 days by DevOps after 3", seeded_store)
    assert len(intents) == 1
    assert intents[0]["args"]["name"] == "Deploy"
    assert intents[0]["args"]["assignee"].strip().lower() == "devops"
    assert intents[0]["args"]["dependencies"] == ["3"]


def test_parse_create_english(seeded_store):
    """Add task X for N days"""
    intents = _parse_intent("Add task Review for 3 days", seeded_store)
    assert len(intents) == 1
    assert intents[0]["args"]["name"] == "Review"


def test_parse_delete_by_id(seeded_store):
    """Delete task X (by ID)"""
    intents = _parse_intent("Delete task 2", seeded_store)
    assert len(intents) == 1
    assert intents[0]["tool"] == "delete_task"
    assert intents[0]["args"]["id"] == "2"


def test_parse_delete_by_name(seeded_store):
    """Delete task [name]"""
    intents = _parse_intent("Delete task Testing", seeded_store)
    assert len(intents) == 1
    assert intents[0]["tool"] == "delete_task"


def test_parse_swap_assignees(seeded_store):
    """Swap Alice and Bob"""
    intents = _parse_intent("Поменяй Alice и Bob местами", seeded_store)
    assert len(intents) == 2
    assert all(i["tool"] == "update_task" for i in intents)


def test_parse_assign(seeded_store):
    """Assign X to task Y"""
    intents = _parse_intent("Назначь Ivan на задачу 1", seeded_store)
    assert len(intents) == 1
    assert intents[0]["tool"] == "update_task"
    assert intents[0]["args"]["id"] == "1"
    assert intents[0]["args"]["assignee"].strip().lower() == "ivan"


def test_parse_move(seeded_store):
    """Move task X to date"""
    intents = _parse_intent("Перенеси задачу 1 на 2026-07-01", seeded_store)
    assert len(intents) == 1
    assert intents[0]["tool"] == "update_task"
    assert intents[0]["args"]["id"] == "1"
    assert intents[0]["args"]["start_date"] == "2026-07-01"


def test_parse_no_intent(seeded_store):
    """Message without a command returns empty"""
    intents = _parse_intent("Hello, how are you?", seeded_store)
    assert intents == []


def test_parse_create_with_section(seeded_store):
    """Add task X in section Y — section is ignored"""
    intents = _parse_intent("Add task Test in section Backend", seeded_store)
    assert len(intents) == 1
    assert intents[0]["args"]["name"] == "Test"
