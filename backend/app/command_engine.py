"""
Command Engine for AI Gantt Planner.
Handles intent parsing (Bag-of-Words) and complex state operations.
"""

import re
from datetime import datetime, timedelta, date
from typing import Optional

from app.models import Task, TaskCreate, TaskUpdate
from app.store import PlanState

# ── Stop words for task name extraction ──────────────────────────
_STOP_WORDS = frozenset({
    "задачу", "задача", "задач", "задаче", "задачей",
    "на", "в", "с", "и", "по", "для", "из", "от", "до", "к", "у",
    "о", "об", "про", "без", "при", "через", "за", "под", "над",
    "между", "перед", "после", "во", "около", "возле", "рядом",
    "очень", "слишком", "довольно", "весьма", "крайне",
    "особенно", "специально", "нарочно", "самостоятельно",
    "вместе", "совместно", "отдельно",
})

# ── Link keywords for dependency commands ────────────────────────
_LINK_KEYWORDS = frozenset({
    "свяжи", "связана", "связан", "связанная", "связаны",
    "зависит", "зависима", "зависимый", "зависимы",
    "привяжи", "привязан", "привязана", "привязаны",
})

# ── Action detection keywords ────────────────────────────────────
_SHIFT_KEYWORDS = frozenset({"сдвинь", "shift", "move", "перенеси", "двигай", "сдвинуть"})
_COPY_KEYWORDS = frozenset({"скопируй", "copy", "duplicate", "клон", "дублируй", "клонируй"})
_DELETE_KEYWORDS = frozenset({"удали", "delete", "remove", "убери"})
_ASSIGN_KEYWORDS = frozenset({"назначь", "assign", "ответственный", "исполнитель"})
_CREATE_KEYWORDS = frozenset({"добавь", "создай", "new", "create", "создать"})


def _default_dates() -> tuple[str, str]:
    """Return default start/end dates for newly created tasks."""
    today = date.today()
    start = today.strftime("%Y-%m-%d")
    end = (today + timedelta(days=3)).strftime("%Y-%m-%d")
    return start, end


def _find_task_by_name(store: PlanState, name: str) -> Optional[Task]:
    """Find task by exact match first, then partial match."""
    name_lower = name.lower()
    # Exact match
    for t in store.get_all_tasks():
        if t.name.lower() == name_lower:
            return t
    # Partial match
    for t in store.get_all_tasks():
        if name_lower in t.name.lower():
            return t
    return None


class CommandEngine:
    """Parses natural language commands and executes operations on PlanState."""

    def __init__(self, store: PlanState) -> None:
        self.store = store

    # ── PARSER (Bag-of-Words) ──────────────────────────────────────

    def parse_and_execute(self, text: str) -> str:
        """Main entry point. Parses text and executes the command."""
        msg = text.lower().strip()
        words = msg.split()
        intents = self._detect_intent(words, msg)

        if not intents:
            return "❌ Не распознал команду. Попробуйте: 'сдвинь', 'скопируй', 'удали', 'назначь'."

        try:
            action = intents.get("action")
            actions = {
                "shift_tree": self._do_shift_tree,
                "copy": self._do_copy,
                "assign": self._do_assign,
                "delete": self._do_delete,
                "move": self._do_move,
                "create": self._do_create,
                "link": self._do_multi_link if intents.get("multi") else self._do_link,
            }
            handler = actions.get(action)
            if handler:
                return handler(intents)
            return "❓ Неизвестная команда."
        except Exception as e:
            return f"❌ Ошибка выполнения: {str(e)}"

    def _detect_intent(self, words: list[str], msg: str) -> Optional[dict]:
        """Bag-of-Words parser. Order doesn't matter."""
        intent: dict = {}

        # 1. Detect Action
        if any(w in words for w in _SHIFT_KEYWORDS):
            intent["action"] = "move" if re.search(r"\d{4}-\d{2}-\d{2}", msg) else "shift_tree"
        elif any(w in words for w in _COPY_KEYWORDS):
            intent["action"] = "copy"
        elif any(w in words for w in _DELETE_KEYWORDS):
            intent["action"] = "delete"
        elif any(w in words for w in _ASSIGN_KEYWORDS):
            intent["action"] = "assign"
        elif any(w in words for w in _CREATE_KEYWORDS):
            intent["action"] = "create"
        elif any(w in words for w in _LINK_KEYWORDS):
            link_count = sum(1 for w in words if w in _LINK_KEYWORDS)
            if link_count > 1:
                intent["action"] = "link"
                intent["multi"] = True
                return intent
            intent["action"] = "link"
            self._parse_dependency_target(words, msg, intent)
            return intent if intent.get("target_name") and intent.get("dep_target_name") else None
        else:
            return None

        # 2. Detect Target (Task Name or ID)
        target_name = self._find_target(words, msg, intent.get("action"))
        if target_name:
            intent["target_name"] = target_name
        else:
            return None

        # 3. Detect Parameters (Days, Assignee, Date)
        days_pattern = re.search(r"(\d+)\s*(?:дн|дня|день|days|day)?", msg)
        if days_pattern:
            intent["days"] = int(days_pattern.group(1))
        elif intent["action"] == "shift_tree":
            intent["days"] = 1

        date_pattern = re.search(r"(\d{4}-\d{2}-\d{2})", msg)
        if date_pattern:
            intent["date"] = date_pattern.group(1)

        # Assignee extraction
        for i, w in enumerate(words):
            if w in _ASSIGN_KEYWORDS and i + 1 < len(words):
                candidate = words[i + 1]
                if (not candidate.isdigit() and candidate not in _STOP_WORDS
                        and not re.match(r"^\d{4}-\d{2}-\d{2}$", candidate)):
                    intent["assignee"] = candidate.capitalize()
                    break

        # Direction detection for shift
        if any(w in words for w in ["назад", "back", "вперёд", "вперел", "forward", "вперед"]):
            intent["direction"] = "forward" if any(
                w in words for w in ["вперёд", "вперел", "forward", "вперед"]
            ) else "backward"
        else:
            intent["direction"] = "forward"

        return intent

    def _find_target(self, words: list[str], msg: str, action: str) -> Optional[str]:
        """Find the target task name from the message."""
        tasks = self.store.get_all_tasks()

        # Strategy 1: Exact or partial match of task names
        sorted_tasks = sorted(tasks, key=lambda t: len(t.name), reverse=True)
        for task in sorted_tasks:
            if task.name.lower() in msg:
                return task.name

        # Strategy 2: Numeric ID
        ids = [w.strip(".,!?;:") for w in words if w.isdigit()]
        for tid in ids:
            t = self.store.get_task(tid)
            if t:
                return t.name

        # Strategy 3: Heuristic noun extraction
        if action == "create":
            # For CREATE: take FIRST word after verb
            for i, w in enumerate(words):
                if w in _CREATE_KEYWORDS and i + 1 < len(words):
                    for ww in words[i + 1:]:
                        cleaned = ww.strip(".,!?:;")
                        if (cleaned.lower() not in _STOP_WORDS and not cleaned.isdigit()
                                and not re.match(r"^\d{4}-\d{2}-\d{2}$", cleaned)):
                            return cleaned.capitalize()
                    break
        else:
            # For other actions: take LAST meaningful noun
            nouns = [
                w for w in words
                if w not in _STOP_WORDS and not w.isdigit()
                and not re.match(r"^\d{4}-\d{2}-\d{2}$", w) and len(w) >= 1
            ]
            if nouns:
                return nouns[-1].capitalize()

        return None

    def _parse_dependency_target(self, words: list[str], msg: str, intent: dict) -> None:
        """Parse two task names from a link command like 'X связана с Y'."""
        link_pos = -1
        for i, w in enumerate(words):
            if w in _LINK_KEYWORDS:
                link_pos = i
                break
        if link_pos < 0:
            return

        before = words[:link_pos]
        after = words[link_pos + 1:]

        # Target name: last meaningful word before link keyword
        for w in reversed(before):
            w_clean = w.strip(".,!?;:")
            if w_clean and w_clean not in _STOP_WORDS and not w_clean.isdigit():
                intent["target_name"] = w_clean.capitalize()
                break

        # Dep name: first meaningful word after keyword (skip prepositions)
        prepositions = {"с", "от", "к", "на", "в"}
        skip_next = False
        for i, w in enumerate(after):
            if skip_next:
                skip_next = False
                continue
            if w in prepositions and i + 1 < len(after):
                dep_name = after[i + 1].strip(".,!?;:")
                if dep_name:
                    intent["dep_target_name"] = dep_name.capitalize()
                break
            elif w not in _STOP_WORDS and not w.isdigit():
                intent["dep_target_name"] = w.strip(".,!?;:").capitalize()
                break

    # ── EXECUTORS ──────────────────────────────────────────────────

    def _get_subtree_ids(self, root_id: str) -> list[str]:
        """Recursive DFS to find all tasks that depend on root_id (transitive closure)."""
        all_ids: set[str] = set()
        stack = [root_id]
        while stack:
            current_id = stack.pop()
            if current_id in all_ids:
                continue
            all_ids.add(current_id)
            for t in self.store.get_all_tasks():
                if current_id in t.dependencies and t.id not in all_ids:
                    stack.append(t.id)
        return list(all_ids)

    def _do_shift_tree(self, intent: dict) -> str:
        """Shifts a task and ALL its dependents (subtree) by N days."""
        target_name = str(intent.get("target_name", ""))
        task = _find_task_by_name(self.store, target_name)
        if not task:
            return f"❌ Задача '{target_name}' не найдена."

        days = int(intent.get("days", 1))
        if str(intent.get("direction", "forward")) == "backward":
            days = -days

        affected_ids = self._get_subtree_ids(task.id)
        count = 0
        for tid in affected_ids:
            t = self.store.get_task(tid)
            if t:
                try:
                    start = datetime.strptime(t.start_date, "%Y-%m-%d") + timedelta(days=days)
                    end = datetime.strptime(t.end_date, "%Y-%m-%d") + timedelta(days=days)
                    self.store.update_task(t.id, TaskUpdate(
                        id=t.id, start_date=start.strftime("%Y-%m-%d"), end_date=end.strftime("%Y-%m-%d")
                    ))
                    count += 1
                except Exception:
                    continue

        return f"✅ Сдвинул ветку '{task.name}' (и {count-1} зависимых) на {days} дн."

    def _do_copy(self, intent: dict) -> str:
        """Duplicates a task with a new ID."""
        target_name = str(intent.get("target_name", ""))
        task = _find_task_by_name(self.store, target_name)
        if not task:
            return f"❌ Задача '{target_name}' не найдена."

        new_data = task.model_dump()
        new_data["id"] = self.store.generate_id()
        new_data["name"] = f"{task.name} (Копия)"
        new_data["dependencies"] = []

        self.store.create_task(TaskCreate(**new_data))
        return f"✅ Скопировал '{task.name}' -> '{new_data['name']}'"

    def _do_assign(self, intent: dict) -> str:
        """Assigns a person to a task."""
        target_name = str(intent.get("target_name", ""))
        task = _find_task_by_name(self.store, target_name)
        if not task:
            return f"❌ Задача '{target_name}' не найдена."

        person = intent.get("assignee")
        if not person:
            return "❌ Не указан исполнитель (напр: 'назначь Ивана')."

        self.store.update_task(task.id, TaskUpdate(id=task.id, assignee=str(person)))
        return f"✅ Назначил '{person}' на '{task.name}'"

    def _do_delete(self, intent: dict) -> str:
        target_name = str(intent.get("target_name", ""))
        task = _find_task_by_name(self.store, target_name)
        if not task:
            return f"❌ Задача '{target_name}' не найдена."

        name = task.name
        self.store.delete_task(task.id)
        return f"✅ Удалил '{name}'"

    def _do_move(self, intent: dict) -> str:
        """Moves a task to an absolute date."""
        target_name = str(intent.get("target_name", ""))
        task = _find_task_by_name(self.store, target_name)
        if not task:
            return f"❌ Задача '{target_name}' не найдена."

        target_date = intent.get("date")
        if not target_date:
            return "❌ Не указана дата (напр: 'на 2026-05-20')."

        try:
            target_dt = datetime.strptime(str(target_date), "%Y-%m-%d")
            duration = (
                datetime.strptime(task.end_date, "%Y-%m-%d") - datetime.strptime(task.start_date, "%Y-%m-%d")
            ).days
            new_end = target_dt + timedelta(days=duration)
            self.store.update_task(task.id, TaskUpdate(
                id=task.id, start_date=str(target_date), end_date=new_end.strftime("%Y-%m-%d")
            ))
            return f"✅ Перенёс '{task.name}' на {target_date}"
        except Exception as e:
            return f"❌ Ошибка: {str(e)}"

    def _do_create(self, intent: dict) -> str:
        """Creates a new task with the given name."""
        target_name = str(intent.get("target_name", ""))
        if not target_name:
            return "❌ Не указано название задачи (напр: 'добавь задачу Тест')."

        start, end = _default_dates()
        task_id = self.store.create_task(TaskCreate(
            name=target_name, start_date=start, end_date=end, progress=0,
        ))
        if isinstance(task_id, str) and task_id.startswith("❌"):
            return task_id

        return f"✅ Создал задачу '{target_name}' ({start} → {end})"

    def _do_link(self, intent: dict) -> str:
        """Links two tasks: target depends on dep_target. Auto-creates missing tasks."""
        target_name = str(intent.get("target_name", ""))
        dep_target_name = str(intent.get("dep_target_name", ""))

        if not target_name or not dep_target_name:
            return "❌ Укажи две задачи: 'X связана с Y'"

        target = _find_task_by_name(self.store, target_name)
        if not target:
            target = self._auto_create_task(target_name)
            if target is None:
                return f"❌ Не удалось создать задачу '{target_name}'"

        dep_target = _find_task_by_name(self.store, dep_target_name)
        if not dep_target:
            dep_target = self._auto_create_task(dep_target_name)
            if dep_target is None:
                return f"❌ Не удалось создать задачу '{dep_target_name}'"

        if target.id == dep_target.id:
            return "❌ Нельзя связать задачу саму с собой."

        if dep_target.id in target.dependencies:
            return f"✅ '{target.name}' уже зависит от '{dep_target.name}'"

        success = self.store.add_dependency(target.id, dep_target.id)
        if not success:
            return f"❌ Не удалось создать связь (возможен цикл)."

        return f"✅ '{target.name}' теперь зависит от '{dep_target.name}'"

    def _auto_create_task(self, name: str) -> Task | None:
        """Helper to create a task with default dates."""
        start, end = _default_dates()
        result = self.store.create_task(TaskCreate(name=name, start_date=start, end_date=end, progress=0))
        if isinstance(result, str):
            return None
        return result

    def _do_multi_link(self, msg: str) -> str:
        """Handle multiple link commands in one message."""
        words = msg.split()
        link_positions = [i for i, w in enumerate(words) if w in _LINK_KEYWORDS]

        if not link_positions:
            return "❌ Не найдена команда связывания"

        prepositions = {"с", "от", "к", "на"}
        results = []

        for idx, pos in enumerate(link_positions):
            # Target: last meaningful word before keyword
            target_name = None
            for i in range(pos - 1, -1, -1):
                w = words[i]
                cleaned = w.strip(".,!?:;")
                if w.endswith(":") or cleaned.lower() in _LINK_KEYWORDS:
                    break
                if cleaned and not cleaned.isdigit() and cleaned.lower() not in _STOP_WORDS and cleaned.lower() not in prepositions:
                    target_name = cleaned.capitalize()
                    break

            # Dep: first meaningful word after keyword
            dep_name = None
            next_link = link_positions[idx + 1] if idx + 1 < len(link_positions) else len(words)
            for i in range(pos + 1, next_link):
                w = words[i]
                cleaned = w.strip(".,!?:;")
                if w.endswith(":") or cleaned.lower() in _STOP_WORDS or w in prepositions:
                    continue
                if cleaned and not cleaned.isdigit():
                    dep_name = cleaned.capitalize()
                    break

            if target_name and dep_name:
                result = self._do_link({"target_name": target_name, "dep_target_name": dep_name})
                results.append(result)

        if not results:
            return "❌ Не удалось распознать пары задач"

        return "✅ " + " | ".join(results)
