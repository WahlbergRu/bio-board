from datetime import datetime
from pydantic import BaseModel, Field


class Task(BaseModel):
    id: str
    name: str
    description: str = ""
    start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    progress: int = Field(default=0, ge=0, le=100)
    type: str = Field(default="task", pattern=r"^(task|milestone|project)$")
    dependencies: list[str] = Field(default_factory=list)
    assignee: str = ""
    project: str = ""

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    name: str
    description: str = ""
    start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    progress: int = Field(default=0, ge=0, le=100)
    type: str = Field(default="task", pattern=r"^(task|milestone|project)$")
    dependencies: list[str] = Field(default_factory=list)
    assignee: str = ""
    project: str = ""

    model_config = {"from_attributes": True}


class TaskUpdate(BaseModel):
    id: str
    name: str | None = None
    description: str | None = None
    start_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    progress: int | None = Field(default=None, ge=0, le=100)
    type: str | None = Field(default=None, pattern=r"^(task|milestone|project)$")
    dependencies: list[str] | None = None
    assignee: str | None = None
    project: str | None = None

    model_config = {"from_attributes": True}


class Plan(BaseModel):
    tasks: dict[str, Task] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class ChatMessage(BaseModel):
    role: str = Field(pattern=r"^(user|assistant|system)$")
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

    model_config = {"from_attributes": True}


class SeedTask(BaseModel):
    name: str
    description: str = ""
    start: str
    end: str
    progress: int = Field(default=0, ge=0, le=100)
    type: str = Field(default="task", pattern=r"^(task|milestone|project)$")
    assignee: str = ""
    dependencies: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}
