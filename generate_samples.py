"""Generate sample Excel files for examples/ and verify full import/export roundtrip."""

import sys
from pathlib import Path
from io import BytesIO

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from openpyxl import Workbook
from app.excel_service import parse_excel, export_excel

EXAMPLES_DIR = Path(__file__).parent / "examples"

# --- Sample datasets ---
# Predecessors use TASK NAMES (not IDs) — this matches the export format.
# On import, names are resolved to IDs after all tasks are created.

SIMPLE = [
    {"name": "Анализ требований", "description": "Сбор и анализ требований заказчика", "assignee": "Аналитик", "duration": 5, "predecessors": []},
    {"name": "Дизайн системы", "description": "Проектирование архитектуры", "assignee": "Архитектор", "duration": 7, "predecessors": ["Анализ требований"]},
    {"name": "Разработка", "description": "Кодирование модулей", "assignee": "Разработчик", "duration": 14, "predecessors": ["Дизайн системы"]},
    {"name": "Тестирование", "description": "Модульные и интеграционные тесты", "assignee": "QA", "duration": 5, "predecessors": ["Разработка"]},
    {"name": "Релиз", "description": "Выпуск версии 1.0", "assignee": "PM", "duration": 1, "predecessors": ["Тестирование"]},
]

COMPLEX = [
    {"name": "Старт проекта", "description": "Установочное совещание", "assignee": "PM", "duration": 1, "predecessors": []},
    {"name": "Сбор требований", "description": "Интервью со стейкхолдерами", "assignee": "Аналитик", "duration": 5, "predecessors": ["Старт проекта"]},
    {"name": "Проектирование БД", "description": "Схема данных и миграции", "assignee": "Backend Dev", "duration": 4, "predecessors": ["Сбор требований"]},
    {"name": "Проектирование API", "description": "OpenAPI спецификация", "assignee": "Backend Dev", "duration": 4, "predecessors": ["Сбор требований"]},
    {"name": "UI прототип", "description": "Figma макеты", "assignee": "Дизайнер", "duration": 6, "predecessors": ["Сбор требований"]},
    {"name": "Backend: Auth", "description": "Авторизация и роли", "assignee": "Backend Dev", "duration": 5, "predecessors": ["Проектирование БД", "Проектирование API"]},
    {"name": "Backend: Core", "description": "Бизнес-логика", "assignee": "Backend Dev", "duration": 10, "predecessors": ["Проектирование БД", "Проектирование API"]},
    {"name": "Frontend: Компоненты", "description": "UI библиотека", "assignee": "Frontend Dev", "duration": 7, "predecessors": ["UI прототип"]},
    {"name": "Frontend: Страницы", "description": "Основные экраны", "assignee": "Frontend Dev", "duration": 10, "predecessors": ["UI прототип", "Frontend: Компоненты"]},
    {"name": "Интеграция", "description": "Связка фронтенд + бэкенд", "assignee": "Fullstack Dev", "duration": 5, "predecessors": ["Backend: Auth", "Backend: Core", "Frontend: Страницы"]},
    {"name": "Тестирование", "description": "E2E и нагрузочные тесты", "assignee": "QA", "duration": 5, "predecessors": ["Интеграция"]},
    {"name": "Документация", "description": "Руководство пользователя", "assignee": "Tech Writer", "duration": 4, "predecessors": ["Интеграция"]},
    {"name": "UAT", "description": "Приёмочное тестирование", "assignee": "PM", "duration": 3, "predecessors": ["Тестирование", "Документация"]},
    {"name": "Релиз", "description": "Продакшен деплой", "assignee": "DevOps", "duration": 1, "predecessors": ["UAT"]},
]

PARALLEL = [
    {"name": "Подготовка", "description": "Базовая настройка проекта", "assignee": "PM", "duration": 2, "predecessors": []},
    {"name": "Модуль A", "description": "Независимая ветка A", "assignee": "Dev A", "duration": 8, "predecessors": ["Подготовка"]},
    {"name": "Модуль B", "description": "Независимая ветка B", "assignee": "Dev B", "duration": 6, "predecessors": ["Подготовка"]},
    {"name": "Модуль C", "description": "Независимая ветка C", "assignee": "Dev C", "duration": 10, "predecessors": ["Подготовка"]},
    {"name": "Интеграция A+B", "description": "Слияние модулей A и B", "assignee": "Dev A", "duration": 3, "predecessors": ["Модуль A", "Модуль B"]},
    {"name": "Интеграция ABC", "description": "Финальная сборка", "assignee": "Dev C", "duration": 4, "predecessors": ["Модуль C", "Интеграция A+B"]},
    {"name": "Тест", "description": "Полное тестирование", "assignee": "QA", "duration": 5, "predecessors": ["Интеграция ABC"]},
    {"name": "Деплой", "description": "Выпуск в продакшен", "assignee": "DevOps", "duration": 1, "predecessors": ["Тест"]},
]

NO_DEPS = [
    {"name": "Задача 1", "description": "Первая задача без зависимостей", "assignee": "Иванов", "duration": 3, "predecessors": []},
    {"name": "Задача 2", "description": "Вторая задача без зависимостей", "assignee": "Петров", "duration": 5, "predecessors": []},
    {"name": "Задача 3", "description": "Третья задача без зависимостей", "assignee": "Сидоров", "duration": 2, "predecessors": []},
]


def write_xlsx(filepath: Path, rows: list[dict]) -> None:
    """Write rows to xlsx with Russian headers. Predecessors as task names."""
    wb = Workbook()
    ws = wb.active
    ws.title = "План"
    ws.append(["задача", "описание", "исполнитель", "длительность", "предшественники"])
    for r in rows:
        preds = ";".join(r.get("predecessors", []))
        ws.append([r["name"], r["description"], r["assignee"], r["duration"], preds])
    buf = BytesIO()
    wb.save(buf)
    wb.close()
    filepath.write_bytes(buf.getvalue())


def full_roundtrip(rows: list[dict]) -> bool:
    """Import -> export -> re-import -> verify dependencies preserved."""
    from datetime import datetime, timedelta
    from app.store import PlanState
    from app.models import TaskCreate, TaskUpdate

    # Phase 1: import from rows
    store = PlanState()
    store.tasks.clear()
    xlsx_bytes = _rows_to_bytes(rows)
    parsed = parse_excel(xlsx_bytes)
    cursor = datetime.fromisoformat("2026-01-01")
    for row in parsed:
        nm = row.get("name", "").strip()
        if not nm:
            continue
        dur = max(row.get("duration", 1), 1)
        start = cursor.isoformat()[:10]
        end = (cursor + timedelta(days=dur - 1)).isoformat()[:10]
        cursor += timedelta(days=dur)
        store.create_task(TaskCreate(
            name=nm, description=row.get("description", ""),
            start_date=start, end_date=end,
            assignee=row.get("assignee", ""), dependencies=[],
        ))
    _resolve_deps(store, parsed)

    # Phase 2: export
    tasks = [t.model_dump() for t in store.get_all_tasks()]
    xlsx_bytes2 = export_excel(tasks)
    parsed2 = parse_excel(xlsx_bytes2)

    # Phase 3: re-import
    store2 = PlanState()
    store2.tasks.clear()
    cursor2 = datetime.fromisoformat("2026-01-01")
    for row in parsed2:
        nm = row.get("name", "").strip()
        if not nm:
            continue
        dur = max(row.get("duration", 1), 1)
        start = cursor2.isoformat()[:10]
        end = (cursor2 + timedelta(days=dur - 1)).isoformat()[:10]
        cursor2 += timedelta(days=dur)
        store2.create_task(TaskCreate(
            name=nm, description=row.get("description", ""),
            start_date=start, end_date=end,
            assignee=row.get("assignee", ""), dependencies=[],
        ))
    _resolve_deps(store2, parsed2)

    # Phase 4: compare dep structure by task name
    if len(store.tasks) != len(store2.tasks):
        return False
    for t1 in store.tasks.values():
        match = next((t for t in store2.tasks.values() if t.name == t1.name), None)
        if not match:
            return False
        deps1 = sorted(store.tasks[d].name for d in t1.dependencies if d in store.tasks)
        deps2 = sorted(store2.tasks[d].name for d in match.dependencies if d in store2.tasks)
        if deps1 != deps2:
            return False
    return True


def _rows_to_bytes(rows: list[dict]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "План"
    ws.append(["задача", "описание", "исполнитель", "длительность", "предшественники"])
    for r in rows:
        preds = ";".join(r.get("predecessors", []))
        ws.append([r["name"], r["description"], r["assignee"], r["duration"], preds])
    buf = BytesIO()
    wb.save(buf)
    wb.close()
    return buf.getvalue()


def _resolve_deps(store, rows):
    """Resolve predecessor names/IDs to task IDs after all tasks created."""
    from app.models import TaskUpdate
    for row in rows:
        nm = row.get("name", "").strip()
        preds = row.get("predecessors", [])
        if not nm or not preds:
            continue
        target = next((t for t in store.tasks.values() if t.name == nm), None)
        if not target:
            continue
        resolved = []
        for p in preds:
            p = p.strip()
            if not p:
                continue
            if p in store.tasks:
                resolved.append(p)
                continue
            rid = store._resolve_name_to_id(p)
            if rid and rid != target.id:
                resolved.append(rid)
        if resolved:
            store.update_task(target.id, TaskUpdate(id=target.id, dependencies=resolved))


def main():
    datasets = {
        "simple_pipeline.xlsx": SIMPLE,
        "complex_project.xlsx": COMPLEX,
        "parallel_modules.xlsx": PARALLEL,
        "no_dependencies.xlsx": NO_DEPS,
    }

    all_ok = True
    for filename, rows in datasets.items():
        filepath = EXAMPLES_DIR / filename
        write_xlsx(filepath, rows)
        print(f"Created: {filepath}")

        ok = full_roundtrip(rows)
        status = "PASS" if ok else "FAIL"
        print(f"  Roundtrip [{filename}]: {status}")
        if not ok:
            all_ok = False

    if all_ok:
        print("\nAll roundtrip tests passed!")
    else:
        print("\nSome roundtrip tests FAILED!")
        sys.exit(1)


if __name__ == "__main__":
    main()
