# Context: Chat Command Suggestions

## Project Stack
- Frontend: TypeScript + React + Vite + Zustand
- Backend: Python + FastAPI
- LLM: OpenAI-compatible (kimi-k2.5)
- Language: Russian UI

## Current Command System

### Parser (Bag-of-Words)
`backend/app/command_engine.py` — `_detect_intent()` matches keywords without order requirement.

### 7 Command Actions
| Action | Keywords | Example |
|--------|----------|---------|
| shift_tree | сдвинь, shift, move, перенеси, двигай, сдвинуть | "Сдвинь Frontend на 5 дней" |
| move (date) | same + YYYY-MM-DD | "Перенеси Frontend на 2026-02-01" |
| copy | скопируй, copy, duplicate, клон, дублируй, клонируй | "Скопируй Frontend" |
| delete | удали, delete, remove, убери | "Удали Frontend" |
| assign | назначь, assign, ответственный, исполнитель | "Назначь Ивана на Frontend" |
| create | добавь, создай, new, create, создать | "Добавь задачу Тест" |
| link | свяжи, связана, связан, зависит, привяжи, привязан | "Frontend связана с Backend" |

### Current Suggestion Flow (LLM-based, post-failure only)
1. User sends message
2. CommandEngine parses → if fails (❌/❓)
3. LLM suggests commands as JSON buttons
4. ChatPanel renders buttons

### NO Client-side Autocomplete Exists
Input is plain `<input>` with no dropdown, no hints, no typeahead.

## Files to Modify
- `frontend/src/components/ChatPanel.tsx` — main target
- Optionally: `backend/app/command_engine.py` — export command definitions

## User Request
After typing a mini-command trigger, show available quick-start commands with their syntax/examples.
