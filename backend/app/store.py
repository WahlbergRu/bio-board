"""In-memory state store with JSON persistence."""

import json
from pathlib import Path

from app.models import Task, TaskCreate, TaskUpdate, SeedTask


class PlanState:
    _file_path: Path = Path("plan.json")

    def __init__(self) -> None:
        self.tasks: dict[str, Task] = {}
        self._load()

    # ── persistence ──────────────────────────────────────────────

    def _load(self) -> None:
        if self._file_path.exists():
            raw = json.loads(self._file_path.read_text(encoding="utf-8"))
            self.tasks = {k: Task.model_validate(v) for k, v in raw.items()}

    def save(self) -> None:
        self._file_path.parent.mkdir(parents=True, exist_ok=True)
        data = {k: v.model_dump() for k, v in self.tasks.items()}
        self._file_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    # ── CRUD ─────────────────────────────────────────────────────

    def get_task(self, task_id: str) -> Task | None:
        return self.tasks.get(task_id)

    def get_all_tasks(self) -> list[Task]:
        return list(self.tasks.values())

    # ── constraints ────────────────────────────────────────────────

    MAX_TASKS = 500

    def create_task(self, data: TaskCreate) -> Task | str:
        if len(self.tasks) >= self.MAX_TASKS:
            return f"error: Maximum {self.MAX_TASKS} tasks reached"
        tid = self._next_id()
        task_data = data.model_dump()
        # Resolve dependency names to IDs
        if task_data.get("dependencies"):
            task_data["dependencies"] = self._resolve_dependencies(task_data["dependencies"])
        task = Task(id=tid, **task_data)
        self.tasks[tid] = task
        self.save()
        return task

    def update_task(self, task_id: str, data: TaskUpdate) -> Task | None:
        task = self.tasks.get(task_id)
        if task is None:
            return None
        updates = data.model_dump(exclude_unset=True)
        updates.pop("id", None)
        # Resolve dependency names to IDs
        if "dependencies" in updates and updates["dependencies"] is not None:
            updates["dependencies"] = self._resolve_dependencies(updates["dependencies"])
        for k, v in updates.items():
            setattr(task, k, v)
        self.save()
        return task

    def delete_task(self, task_id: str) -> bool:
        if task_id not in self.tasks:
            return False
        del self.tasks[task_id]
        # remove dangling deps
        for t in self.tasks.values():
            if task_id in t.dependencies:
                t.dependencies.remove(task_id)
        self.save()
        return True

    # ── dependencies ─────────────────────────────────────────────

    def add_dependency(self, source_id: str, target_id: str) -> bool:
        src = self.tasks.get(source_id)
        tgt = self.tasks.get(target_id)
        if src is None or tgt is None:
            return False
        if target_id in src.dependencies:
            return False
        src.dependencies.append(target_id)
        if self.has_cycle():
            src.dependencies.pop()
            return False
        self.save()
        return True

    def remove_dependency(self, source_id: str, target_id: str) -> bool:
        src = self.tasks.get(source_id)
        if src is None or target_id not in src.dependencies:
            return False
        src.dependencies.remove(target_id)
        self.save()
        return True

    # ── cycle detection ──────────────────────────────────────────

    def has_cycle(self) -> bool:
        visited: set[str] = set()
        rec_stack: set[str] = set()
        return any(
            self._detect_cycle_from(tid, visited, rec_stack)
            for tid in self.tasks
            if tid not in visited
        )

    def _detect_cycle_from(
        self, start_id: str, visited: set[str], rec_stack: set[str]
    ) -> bool:
        visited.add(start_id)
        rec_stack.add(start_id)
        task = self.tasks.get(start_id)
        if task:
            for dep in task.dependencies:
                if dep not in visited:
                    if self._detect_cycle_from(dep, visited, rec_stack):
                        return True
                elif dep in rec_stack:
                    return True
        rec_stack.discard(start_id)
        return False

    # ── seed ─────────────────────────────────────────────────────

    def seed(self, seed_tasks: list[SeedTask]) -> None:
        self.tasks.clear()
        for st in seed_tasks:
            tid = self._next_id()
            self.tasks[tid] = Task(
                id=tid,
                name=st.name,
                description=st.description,
                start_date=st.start,
                end_date=st.end,
                progress=st.progress,
                type=st.type,
                assignee=st.assignee,
                dependencies=st.dependencies,
            )
        self.save()

    # ── name resolution ──────────────────────────────────────────

    def _resolve_name_to_id(self, name: str) -> str | None:
        """Find task by name (exact or partial match), return its ID."""
        name_lower = name.lower().strip()
        for t in self.tasks.values():
            if t.name.lower() == name_lower or name_lower in t.name.lower():
                return t.id
        return None

    def _resolve_dependencies(self, deps: list[str]) -> list[str]:
        """Resolve dependency names/IDs to IDs. Already-ID values pass through."""
        resolved = []
        for d in deps:
            # If it looks like an ID (numeric string), keep it
            if d.isdigit():
                if d in self.tasks:
                    resolved.append(d)
            else:
                # Treat as task name → resolve to ID
                rid = self._resolve_name_to_id(d)
                if rid:
                    resolved.append(rid)
        return resolved

    # ── id generation ────────────────────────────────────────────

    def _next_id(self) -> str:
        if not self.tasks:
            return "1"
        return str(max(int(k) for k in self.tasks) + 1)
