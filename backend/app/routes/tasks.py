"""Task CRUD routes."""

from fastapi import APIRouter, Depends, HTTPException

from app.models import Task, TaskCreate, TaskUpdate
from app.store import PlanState

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def get_store() -> PlanState:
    from app.main import app_state
    return app_state["store"]


@router.get("/", response_model=list[Task])
def list_tasks(store: PlanState = Depends(get_store)):
    return store.get_all_tasks()


@router.get("/{task_id}", response_model=Task)
def get_task(task_id: str, store: PlanState = Depends(get_store)):
    task = store.get_task(task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    return task


@router.post("/", response_model=Task, status_code=201)
def create_task(body: TaskCreate, store: PlanState = Depends(get_store)):
    return store.create_task(body)


@router.put("/{task_id}", response_model=Task)
def update_task(task_id: str, body: TaskUpdate, store: PlanState = Depends(get_store)):
    body.id = task_id
    task = store.update_task(task_id, body)
    if task is None:
        raise HTTPException(404, "Task not found")
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, store: PlanState = Depends(get_store)):
    if not store.delete_task(task_id):
        raise HTTPException(404, "Task not found")
