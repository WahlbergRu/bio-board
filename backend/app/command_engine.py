"""
Command Engine for AI Gantt Planner.
Handles intent parsing (Bag-of-Words) and complex state operations.
"""

import re
from datetime import datetime, timedelta
from typing import Optional

from app.models import Task, TaskCreate, TaskUpdate
from app.store import PlanState


class CommandEngine:
    """Parses natural language commands and executes operations on PlanState."""

    def __init__(self, store: PlanState) -> None:
        self.store = store

    # ── PARSER (Bag-of-Words) ──────────────────────────────────────

    def parse_and_execute(self, text: str) -> str:
        """
        Main entry point. Parses text and executes the command.
        Returns a success message or error.
        """
        msg = text.lower().strip()
        words = msg.split()
        intents = self._detect_intent(words, msg)

        if not intents:
            return "❌ Не распознал команду. Попробуйте: 'сдвинь', 'скопируй', 'удали', 'назначь'."

        try:
            action = intents.get("action")

            if action == "shift_tree":
                return self._do_shift_tree(intents)
            elif action == "copy":
                return self._do_copy(intents)
            elif action == "assign":
                return self._do_assign(intents)
            elif action == "delete":
                return self._do_delete(intents)
            elif action == "move":
                return self._do_move(intents)
            elif action == "create":
                return self._do_create(intents)
            else:
                return "❓ Неизвестная команда."
        except Exception as e:
            return f"❌ Ошибка выполнения: {str(e)}"

    def _detect_intent(self, words: list[str], msg: str) -> Optional[dict[str, object]]:
        """
        Bag-of-Words parser. Order doesn't matter.
        """
        intent: dict[str, object] = {}

        # 1. Detect Action
        if any(w in words for w in ["сдвинь", "shift", "move", "перенеси", "двигай", "сдвинуть"]):
            # Check if it's absolute move (date) or relative shift (days)
            if re.search(r"\d{4}-\d{2}-\d{2}", msg):
                intent["action"] = "move"
            else:
                intent["action"] = "shift_tree"
        elif any(w in words for w in ["скопируй", "copy", "duplicate", "клон", "дублируй", "клонируй"]):
            intent["action"] = "copy"
        elif any(w in words for w in ["удали", "delete", "remove", "убери"]):
            intent["action"] = "delete"
        elif any(w in words for w in ["назначь", "assign", "ответственный", "исполнитель"]):
            intent["action"] = "assign"
        elif any(w in words for w in ["добавь", "создай", "добавь", "new", "create", "создать"]):
            intent["action"] = "create"
        else:
            return None

        # 2. Detect Target (Task Name or ID)
        tasks = self.store.get_all_tasks()
        target_name: Optional[str] = None

        # Strategy 1: Exact or partial match of task names in the message
        sorted_tasks = sorted(tasks, key=lambda t: len(t.name), reverse=True)
        for task in sorted_tasks:
            if task.name.lower() in msg:
                target_name = task.name
                break

        # Strategy 2: Look for numeric ID in words
        if not target_name:
            ids = [w.strip(".,!?;:") for w in words if w.isdigit()]
            for tid in ids:
                t = self.store.get_task(tid)
                if t:
                    target_name = t.name
                    break

        # Strategy 3: Heuristic - take the most likely noun
        if not target_name:
            stop_words = {
                "задачу", "задача", "на", "в", "с", "и", "по", "для", "из", "от", "до", "к", "у",
                "о", "об", "про", "без", "при", "через", "за", "под", "над", "между", "перед",
                "после", "во", "около", "возле", "рядом", "близ", "далеко", "очень", "слишком",
                "довольно", "весьма", "крайне", "невероятно", "фантастически", "потрясающе",
                "удивительно", "поразительно", "необычайно", "необыкновенно", "исключительно",
                "особенно", "специально", "нарочно", "умышленно", "намеренно", "целенаправленно",
                "преднамеренно", "запланированно", "запрограммированно", "автоматически",
                "самостоятельно", "независимо", "автономно", "изолированно", "обособленно",
                "отдельно", "раздельно", "порознь", "вместе", "совместно", "коллективно",
                "группой", "командой", "отделом", "департаментом", "управлением", "службой",
                "подразделением", "филиалом", "офисом", "представительством", "агентством",
                "компанией", "фирмой", "корпорацией", "холдингом", "концерном", "объединением",
                "ассоциацией", "союзом", "лигой", "федерацией", "конфедерацией", "империей",
                "королевством", "царством", "государством", "страной", "республикой",
                "демократией", "монархией", "диктатурой", "тиранией", "олигархией",
                "плутократией", "технократией", "меритократией", "геронтократией", "неократией",
                "хунтой",
            }
            # Special: extract task name after "задачу" or "задача"
            task_words = {"задачу", "задача", "задач", "задаче", "задачей"}
            task_idx = -1
            for i, w in enumerate(words):
                if w in task_words:
                    task_idx = i
                    break
            
            if task_idx >= 0 and task_idx + 1 < len(words):
                # Get word after "задачу/задача", before stop words
                for w in words[task_idx + 1:]:
                    if w in stop_words or w in ["для", "на", "по"]:
                        break
                    if not w.isdigit() and len(w) >= 1:
                        target_name = w.capitalize()
                        break
            
            # Fallback: take the last likely noun
            if not target_name:
                nouns = [
                    w
                    for w in words
                    if w not in stop_words and not w.isdigit() and not re.match(r"^\d{4}-\d{2}-\d{2}$", w) and len(w) >= 1
                ]
                if nouns:
                    target_name = nouns[-1].capitalize()
                target_name = nouns[-1].capitalize()

        if target_name:
            intent["target_name"] = target_name
        else:
            return None  # Cannot execute without target

        # 3. Detect Parameters (Days, Assignee, Date)

        # Days extraction
        days_pattern = re.search(r"(\d+)\s*(?:дн|дня|день|days|day)?", msg)
        if days_pattern:
            intent["days"] = int(days_pattern.group(1))
        else:
            if intent["action"] == "shift_tree":
                intent["days"] = 1

        # Date extraction
        date_pattern = re.search(r"(\d{4}-\d{2}-\d{2})", msg)
        if date_pattern:
            intent["date"] = date_pattern.group(1)

        # Assignee extraction
        assignee_candidates = ["назначь", "assign", "с", "by", "исполнитель", "ответственный"]
        stop_words_assign = {
            "задачу", "задача", "на", "в", "и", "по", "для", "из", "от", "до", "к", "у", "о",
            "об", "про", "без", "при", "через", "за", "под", "над", "между", "перед", "после",
            "во", "около",
        }

        for i, w in enumerate(words):
            if w in assignee_candidates and i + 1 < len(words):
                candidate = words[i + 1]
                if (
                    not candidate.isdigit()
                    and candidate not in stop_words_assign
                    and not re.match(r"^\d{4}-\d{2}-\d{2}$", candidate)
                ):
                    intent["assignee"] = candidate.capitalize()
                    break

        # Direction detection for shift
        if any(w in words for w in ["назад", "back", "вперёд", "вперел", "forward", "вперед"]):
            intent["direction"] = "forward" if any(
                w in words for w in ["вперёд", "вперел", "forward", "вперед"]
            ) else "backward"
        else:
            intent["direction"] = "forward"  # Default

        return intent

    # ── EXECUTORS ──────────────────────────────────────────────────

    def _find_task_by_name(self, name: str) -> Optional[Task]:
        for t in self.store.get_all_tasks():
            if t.name.lower() == name.lower() or name.lower() in t.name.lower():
                return t
        return None

    def _do_shift_tree(self, intent: dict) -> str:
        """Shifts a task and ALL its dependents (subtree) by N days."""
        target_name = str(intent.get("target_name", ""))
        task = self._find_task_by_name(target_name)
        if not task:
            return f"❌ Задача '{target_name}' не найдена."

        days = int(intent.get("days", 1))
        direction = str(intent.get("direction", "forward"))

        if direction == "backward":
            days = -days

        # 1. Get all affected tasks (The task + all recursive dependents)
        affected_ids = self._get_subtree_ids(task.id)

        # 2. Apply shift
        count = 0
        for tid in affected_ids:
            t = self.store.get_task(tid)
            if t:
                try:
                    start = datetime.strptime(t.start_date, "%Y-%m-%d") + timedelta(days=days)
                    end = datetime.strptime(t.end_date, "%Y-%m-%d") + timedelta(days=days)

                    update = TaskUpdate(
                        id=t.id, start_date=start.strftime("%Y-%m-%d"), end_date=end.strftime("%Y-%m-%d")
                    )
                    self.store.update_task(t.id, update)
                    count += 1
                except Exception:
                    continue

        return f"✅ Сдвинул ветку '{task.name}' (и {count-1} зависимых) на {days} дн."

    def _get_subtree_ids(self, root_id: str) -> list:
        """Recursive DFS to find all tasks that depend on root_id (transitive closure)."""
        all_ids: set[str] = set()
        stack = [root_id]

        while stack:
            current_id = stack.pop()
            if current_id in all_ids:
                continue
            all_ids.add(current_id)

            # Find tasks that have current_id in their dependencies
            for t in self.store.get_all_tasks():
                if current_id in t.dependencies:
                    if t.id not in all_ids:
                        stack.append(t.id)
        return list(all_ids)

    def _do_copy(self, intent: dict) -> str:
        """Duplicates a task with a new ID."""
        target_name = str(intent.get("target_name", ""))
        task = self._find_task_by_name(target_name)
        if not task:
            return f"❌ Задача '{target_name}' не найдена."

        # Deep copy data
        new_data = task.model_dump()
        new_data["id"] = self.store._next_id()
        new_data["name"] = f"{task.name} (Копия)"
        new_data["dependencies"] = []  # Reset dependencies for safety

        self.store.create_task(TaskCreate(**new_data))
        return f"✅ Скопировал '{task.name}' -> '{new_data['name']}'"

    def _do_assign(self, intent: dict) -> str:
        """Assigns a person to a task."""
        target_name = str(intent.get("target_name", ""))
        task = self._find_task_by_name(target_name)
        if not task:
            return f"❌ Задача '{target_name}' не найдена."

        person = intent.get("assignee")
        if not person:
            return "❌ Не указан исполнитель (напр: 'назначь Ивана')."

        update = TaskUpdate(id=task.id, assignee=str(person))
        self.store.update_task(task.id, update)
        return f"✅ Назначил '{person}' на '{task.name}'"

    def _do_delete(self, intent: dict) -> str:
        target_name = str(intent.get("target_name", ""))
        task = self._find_task_by_name(target_name)
        if not task:
            return f"❌ Задача '{target_name}' не найдена."

        name = task.name
        self.store.delete_task(task.id)
        return f"✅ Удалил '{name}'"

    def _do_move(self, intent: dict) -> str:
        """Moves a task to an absolute date."""
        target_name = str(intent.get("target_name", ""))
        task = self._find_task_by_name(target_name)
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

            update = TaskUpdate(
                id=task.id, start_date=str(target_date), end_date=new_end.strftime("%Y-%m-%d")
            )
            self.store.update_task(task.id, update)

            return f"✅ Перенёс '{task.name}' на {target_date}"
        except Exception as e:
            return f"❌ Ошибка: {str(e)}"

    def _do_create(self, intent: dict) -> str:
        """Creates a new task with the given name."""
        target_name = str(intent.get("target_name", ""))
        
        if not target_name:
            return "❌ Не указано название задачи (напр: 'добавь задачу Тест')."
        
        from datetime import date
        today = date.today()
        start = today.strftime("%Y-%m-%d")
        end = (today + timedelta(days=3)).strftime("%Y-%m-%d")
        
        new_task = TaskCreate(
            name=target_name,
            start_date=start,
            end_date=end,
            progress=0,
        )
        
        task_id = self.store.create_task(new_task)
        if isinstance(task_id, str) and task_id.startswith("❌"):
            return task_id  # Error from store
        
        return f"✅ Создал задачу '{target_name}' ({start} → {end})"
