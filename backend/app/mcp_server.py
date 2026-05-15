"""FastMCP server exposing Gantt planner tools for AI agents."""

from datetime import datetime, timedelta
from typing import Annotated

from pydantic import Field
from mcp.server.fastmcp import FastMCP

from app.models import TaskCreate, TaskUpdate
from app.store import PlanState


def get_mcp_app(store: PlanState) -> FastMCP:
    """Create FastMCP app with tools bound to *store*."""
    mcp = FastMCP("GanttPlanner")

    @mcp.tool(description="List all tasks in the plan.")
    def list_tasks() -> list[dict]:
        return [t.model_dump() for t in store.get_all_tasks()]

    @mcp.tool(description="Get a single task by ID.")
    def get_task(
        task_id: Annotated[str, Field(description="ID of the task")],
    ) -> dict:
        t = store.get_task(task_id)
        if t is None:
            return {"error": f"Task {task_id} not found"}
        return t.model_dump()

    @mcp.tool(description="Create a new task. Provide duration (days) to auto-calculate end_date.")
    def create_task(
        name: Annotated[str, Field(description="Task name")],
        start_date: Annotated[str, Field(description="Start date YYYY-MM-DD")],
        end_date: Annotated[str | None, Field(description="End date YYYY-MM-DD")] = None,
        duration: Annotated[int | None, Field(description="Duration in days (auto end_date)")] = None,
        assignee: Annotated[str, Field(description="Assigned person")] = "",
        description: Annotated[str, Field(description="Task description")] = "",
        dependencies: Annotated[list[str] | None, Field(description="List of dependency task IDs")] = None,
    ) -> dict:
        if end_date is None and duration is not None:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            end_date = (sd + timedelta(days=duration)).strftime("%Y-%m-%d")
        if end_date is None:
            return {"error": "Provide end_date or duration"}
        data = TaskCreate(
            name=name, start_date=start_date, end_date=end_date,
            assignee=assignee, description=description,
            dependencies=dependencies or [],
        )
        task = store.create_task(data)
        return task.model_dump()

    @mcp.tool(description="Update an existing task. Only provided fields are changed.")
    def update_task(
        task_id: Annotated[str, Field(description="ID of the task to update")],
        name: Annotated[str | None, Field(description="New name")] = None,
        start_date: Annotated[str | None, Field(description="New start date")] = None,
        end_date: Annotated[str | None, Field(description="New end date")] = None,
        progress: Annotated[int | None, Field(description="Progress 0-100")] = None,
        assignee: Annotated[str | None, Field(description="New assignee")] = None,
        description: Annotated[str | None, Field(description="New description")] = None,
    ) -> dict:
        data = TaskUpdate(
            id=task_id, name=name, start_date=start_date,
            end_date=end_date, progress=progress,
            assignee=assignee, description=description,
        )
        task = store.update_task(task_id, data)
        if task is None:
            return {"error": f"Task {task_id} not found"}
        return task.model_dump()

    @mcp.tool(description="Delete a task by ID.")
    def delete_task(
        task_id: Annotated[str, Field(description="ID of the task to delete")],
    ) -> dict:
        ok = store.delete_task(task_id)
        if ok:
            return {"success": True, "message": f"Task {task_id} deleted"}
        return {"success": False, "message": f"Task {task_id} not found"}

    @mcp.tool(description="Add a dependency (source → target). Rejects if it creates a cycle.")
    def add_dependency(
        source_id: Annotated[str, Field(description="Source task ID")],
        target_id: Annotated[str, Field(description="Target task ID")],
    ) -> dict:
        ok = store.add_dependency(source_id, target_id)
        if ok:
            return {"success": True, "message": f"Dependency {source_id}→{target_id} added"}
        return {"success": False, "message": "Failed: task not found or cycle detected"}

    @mcp.tool(description="Remove a dependency between two tasks.")
    def remove_dependency(
        source_id: Annotated[str, Field(description="Source task ID")],
        target_id: Annotated[str, Field(description="Target task ID")],
    ) -> dict:
        ok = store.remove_dependency(source_id, target_id)
        if ok:
            return {"success": True, "message": f"Dependency {source_id}→{target_id} removed"}
        return {"success": False, "message": "Dependency not found"}

    return mcp
