"""Plan-level routes: view and reset."""

from fastapi import APIRouter, Request, Depends

from app.models import Task
from app.store import PlanState

router = APIRouter(prefix="/api/plan", tags=["plan"])


def get_store(request: Request) -> PlanState:
    return request.app.state.store


@router.get("/", response_model=list[Task])
def get_plan(store: PlanState = Depends(get_store)):
    return store.get_all_tasks()


@router.delete("/reset")
def reset_plan(store: PlanState = Depends(get_store)):
    store.tasks.clear()
    store.save()
    return {"status": "reset"}
