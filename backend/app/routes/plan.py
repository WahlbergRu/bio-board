"""Plan-level routes: view, seed, reset."""

from fastapi import APIRouter, Request, Depends

from app.models import Task, SeedTask
from app.store import PlanState

router = APIRouter(prefix="/api/plan", tags=["plan"])


def get_store(request: Request) -> PlanState:
    return request.app.state.store


_DEMO_TASKS: list[SeedTask] = [
    SeedTask(name="Project Kickoff", description="Initial planning meeting", start="2026-06-01", end="2026-06-01", progress=0, type="milestone", assignee="PM"),
    SeedTask(name="Requirements Gathering", description="Collect stakeholder needs", start="2026-06-02", end="2026-06-08", progress=0, type="task", assignee="Analyst"),
    SeedTask(name="System Design", description="Architecture & tech stack", start="2026-06-09", end="2026-06-18", progress=0, type="task", assignee="Architect", dependencies=["2"]),
    SeedTask(name="UI/UX Design", description="Wireframes & prototypes", start="2026-06-09", end="2026-06-16", progress=0, type="task", assignee="Designer"),
    SeedTask(name="Backend Development", description="API & business logic", start="2026-06-19", end="2026-07-14", progress=0, type="task", assignee="Backend Dev", dependencies=["3"]),
    SeedTask(name="Frontend Development", description="Web interface", start="2026-06-17", end="2026-07-10", progress=0, type="task", assignee="Frontend Dev", dependencies=["4"]),
    SeedTask(name="Integration Testing", description="End-to-end QA", start="2026-07-15", end="2026-07-22", progress=0, type="task", assignee="QA", dependencies=["5", "6"]),
    SeedTask(name="Performance Tuning", description="Load testing & optimization", start="2026-07-23", end="2026-07-28", progress=0, type="task", assignee="DevOps", dependencies=["7"]),
    SeedTask(name="Security Audit", description="Penetration testing & review", start="2026-07-23", end="2026-07-30", progress=0, type="task", assignee="Security", dependencies=["7"]),
    SeedTask(name="Documentation", description="User guides & API docs", start="2026-07-15", end="2026-07-28", progress=0, type="task", assignee="Tech Writer", dependencies=["5"]),
    SeedTask(name="UAT & Sign-off", description="User acceptance testing", start="2026-07-31", end="2026-08-05", progress=0, type="task", assignee="PM", dependencies=["8", "9", "10"]),
    SeedTask(name="Go Live", description="Production deployment", start="2026-08-06", end="2026-08-06", progress=0, type="milestone", assignee="DevOps", dependencies=["11"]),
]


@router.get("/", response_model=list[Task])
def get_plan(store: PlanState = Depends(get_store)):
    return store.get_all_tasks()


@router.post("/seed", response_model=list[Task])
def seed_plan(store: PlanState = Depends(get_store)):
    store.seed(_DEMO_TASKS)
    return store.get_all_tasks()


@router.delete("/reset")
def reset_plan(store: PlanState = Depends(get_store)):
    store.tasks.clear()
    store.save()
    return {"status": "reset"}
