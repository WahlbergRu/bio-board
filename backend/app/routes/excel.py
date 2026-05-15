"""Excel import/export routes."""

from datetime import datetime, timedelta
from tempfile import NamedTemporaryFile
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import FileResponse

from app import excel_service
from app.models import TaskCreate
from app.store import PlanState

router = APIRouter(prefix="/api/excel", tags=["excel"])

_DEFAULT_START = "2026-01-01"


def get_store() -> PlanState:
    from app.main import app_state
    return app_state["store"]


def _rows_to_creates(rows: list[dict]) -> list[TaskCreate]:
    """Convert parsed excel rows to TaskCreate models with generated dates."""
    tasks: list[TaskCreate] = []
    cursor = datetime.fromisoformat(_DEFAULT_START)

    for row in rows:
        name = row.get("name", "").strip()
        if not name:
            continue
        dur = max(row.get("duration", 1), 1)
        start = cursor.isoformat()[:10]
        end = (cursor + timedelta(days=dur - 1)).isoformat()[:10]
        cursor = cursor + timedelta(days=dur)

        tasks.append(TaskCreate(
            name=name,
            description=row.get("description", ""),
            start_date=start,
            end_date=end,
            assignee=row.get("assignee", ""),
            dependencies=row.get("predecessors", []),
        ))
    return tasks


@router.post("/upload")
async def upload_excel(file: UploadFile, store: PlanState = Depends(get_store)):
    raw = await file.read()
    rows = excel_service.parse_excel(raw)
    creates = _rows_to_creates(rows)
    for tc in creates:
        store.create_task(tc)
    return {"imported": len(creates)}


@router.get("/export")
def export_excel(store: PlanState = Depends(get_store)):
    tasks = [t.model_dump() for t in store.get_all_tasks()]
    xlsx_bytes = excel_service.export_excel(tasks)

    tmp = NamedTemporaryFile(
        suffix=".xlsx", delete=False, dir="workspace", prefix="gantt_export_"
    )
    tmp.write(xlsx_bytes)
    tmp.close()

    return FileResponse(
        path=tmp.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="gantt_plan.xlsx",
    )
