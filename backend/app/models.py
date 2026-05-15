from pydantic import BaseModel, field_validator
import re
from datetime import datetime


class Task(BaseModel):
    id: str
    name: str
    description: str = ""
    start_date: str
    end_date: str
    progress: int = 0
    type: str = "task"
    dependencies: list[str] = []
    assignee: str = ""
    project: str = ""
    model_config = {"from_attributes": True}

    @field_validator("start_date", "end_date")
    @classmethod
    def date_format(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("Date must be YYYY-MM-DD")
        return v

    @field_validator("progress")
    @classmethod
    def progress_range(cls, v: int) -> int:
        if not 0 <= v <= 100:
            raise ValueError("Progress must be 0-100")
        return v

    @field_validator("type")
    @classmethod
    def task_type(cls, v: str) -> str:
        if v not in ("task", "milestone", "project"):
            raise ValueError("Type must be task, milestone, or project")
        return v

    @field_validator("name", "description", "assignee")
    @classmethod
    def sanitize_html(cls, v: str) -> str:
        if not v:
            return v
        return v.replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


class TaskCreate(BaseModel):
    name: str
    description: str = ""
    start_date: str
    end_date: str = ""
    progress: int = 0
    type: str = "task"
    dependencies: list[str] = []
    assignee: str = ""
    project: str = ""


class TaskUpdate(BaseModel):
    id: str
    name: str | None = None
    description: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    progress: int | None = None
    type: str | None = None
    dependencies: list[str] | None = None
    assignee: str | None = None
    project: str | None = None


class Plan(BaseModel):
    tasks: dict[str, Task] = {}


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str = datetime.now().isoformat()


class SeedTask(BaseModel):
    name: str
    description: str = ""
    start: str
    end: str
    progress: int = 0
    type: str = "task"
    assignee: str = ""
    dependencies: list[str] = []


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
