"""OpenAI-compatible LLM agent with function calling for Gantt planning."""

import os
import json
from collections.abc import AsyncGenerator, Callable

from openai import AsyncOpenAI


class LLMAgent:
    """Streaming LLM client with tool execution for plan manipulation."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.base_url = base_url or os.getenv(
            "OPENAI_BASE_URL", "https://api.openai.com/v1"
        )
        self.model = model or os.getenv("OPENAI_MODEL", "kimi-k2.5")
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

    async def chat(
        self,
        messages: list[dict],
        tools: list[dict],
        plan_context: str,
    ) -> AsyncGenerator[str, None]:
        """Legacy: streaming without tool execution."""
        system = self._build_system_prompt(plan_context)
        all_messages = [{"role": "system", "content": system}, *messages]
        tool_schemas = self._get_tools_schema() if not tools else tools

        try:
            while True:
                stream = await self.client.chat.completions.create(
                    model=self.model,
                    messages=all_messages,
                    tools=tool_schemas,
                    stream=True,
                )

                tool_calls: dict[int, dict] = {}
                text_parts: list[str] = []

                async for chunk in stream:
                    delta = chunk.choices[0].delta if chunk.choices else None
                    if delta is None:
                        continue
                    if delta.content:
                        text_parts.append(delta.content)
                        yield delta.content
                    if delta.tool_calls:
                        for tc in delta.tool_calls:
                            idx = tc.index
                            if idx not in tool_calls:
                                tool_calls[idx] = {"id": tc.id, "function": {"name": "", "arguments": ""}}
                            if tc.id:
                                tool_calls[idx]["id"] = tc.id
                            if tc.function:
                                if tc.function.name:
                                    tool_calls[idx]["function"]["name"] += tc.function.name
                                if tc.function.arguments:
                                    tool_calls[idx]["function"]["arguments"] += tc.function.arguments

                if not tool_calls:
                    return
                all_messages.append({"role": "assistant", "content": "".join(text_parts) or None,
                                     "tool_calls": [{"id": tc["id"], "type": "function", "function": tc["function"]} for tc in tool_calls.values()]})
                for tc in tool_calls.values():
                    all_messages.append({"role": "tool", "tool_call_id": tc["id"], "content": "ok"})

        except Exception as exc:
            yield f"\n[LLM Error] {exc}"

    async def suggest_commands(
        self,
        user_message: str,
        plan_context: str,
        error_context: str = "",
    ) -> AsyncGenerator[str, None]:
        """Generate command suggestions as JSON for the UI to render as buttons."""
        system = (
            "You are a command translator for a Gantt chart planner. "
            "The user said something that doesn't match fast commands. "
            "Translate their intent into executable commands.\n\n"
            "Available fast commands:\n"
            "- 'добавь задачу {name}' — create task\n"
            "- '{A} связана с {B}' — link tasks\n"
            "- '{A} связана с {B}' — link tasks\n"
            "- '{name} сдвинь на {N}' — shift task\n"
            "- '{name} перенеси на {YYYY-MM-DD}' — move to date\n"
            "- '{name} назначь {person}' — assign person\n"
            "- '{name} удали' — delete task\n"
            "- '{name} скопируй' — duplicate task\n\n"
            "CRITICAL RULES:\n"
            "- Output ONLY valid JSON with no markdown wrapping\n"
            "- Format: {\"suggestions\": [{\"label\": \"Button text\", \"command\": \"actual command\"}], \"note\": \"Brief explanation\"}\n"
            "- Commands must use exact fast command syntax\n"
            "- Reference tasks by name (not ID)\n"
            "- If no tasks exist, suggest creating them first\n"
            "- Respond note in Russian\n\n"
            f"Current plan:\n{plan_context}\n\n"
            f"Fast parser error: {error_context}\n"
            "Translate this user message into commands."
        )

        messages = [{"role": "system", "content": system}, {"role": "user", "content": user_message}]

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield delta.content
        except Exception as exc:
            yield f"[LLM Error] {exc}"

    async def chat_with_store(
        self,
        messages: list[dict],
        plan_context: str,
        tool_handlers: dict[str, Callable],
        max_turns: int = 5,
    ) -> AsyncGenerator[str, None]:
        """Stream LLM response, execute tool calls against store, yield text."""
        system = self._build_system_prompt(plan_context)
        all_messages: list[dict] = [{"role": "system", "content": system}, *messages]
        tool_schemas = self._get_tools_schema()

        for _ in range(max_turns):
            try:
                stream = await self.client.chat.completions.create(
                    model=self.model,
                    messages=all_messages,
                    tools=tool_schemas,
                    stream=True,
                )
            except Exception as exc:
                yield f"\n[LLM Error] {exc}"
                return

            tool_calls: dict[int, dict] = {}
            text_parts: list[str] = []
            has_content = False

            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta is None:
                    continue
                if delta.content:
                    has_content = True
                    text_parts.append(delta.content)
                    yield delta.content
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in tool_calls:
                            tool_calls[idx] = {"id": tc.id, "function": {"name": "", "arguments": ""}}
                        if tc.id:
                            tool_calls[idx]["id"] = tc.id
                        if tc.function:
                            if tc.function.name:
                                tool_calls[idx]["function"]["name"] += tc.function.name
                            if tc.function.arguments:
                                tool_calls[idx]["function"]["arguments"] += tc.function.arguments

            if not tool_calls:
                return

            # Build assistant message with tool calls
            all_messages.append({
                "role": "assistant",
                "content": "".join(text_parts) if text_parts else None,
                "tool_calls": [
                    {"id": tc["id"], "type": "function", "function": tc["function"]}
                    for tc in tool_calls.values()
                ],
            })

            # Execute each tool call
            tools_called = False
            for tc in tool_calls.values():
                tools_called = True
                name = tc["function"]["name"]
                print(f"TOOL CALLED: {name} args={tc['function']['arguments']}")
                handler = tool_handlers.get(name)
                if handler:
                    try:
                        args = json.loads(tc["function"]["arguments"])
                        result = await handler(args)
                    except Exception as e:
                        result = json.dumps({"error": str(e)})
                else:
                    result = json.dumps({"error": f"Unknown tool: {name}"})

                all_messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": result,
                })

            # Yield a newline between turns for readability
            if has_content and text_parts and not text_parts[-1].endswith("\n"):
                yield "\n"
            if tools_called:
                yield "\x00\x00TOOLS_CALLED\x00\x00"

    def reconfigure(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        """Update LLM config at runtime and recreate the client."""
        if api_key is not None:
            self.api_key = api_key
        if base_url is not None:
            self.base_url = base_url
        if model is not None:
            self.model = model
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

    @staticmethod
    def _build_system_prompt(plan_context: str) -> str:
        return (
            "You are an AI Gantt chart planning assistant. "
            "Help users create, modify, and analyze project plans. "
            "Use the available tools to make changes. Always confirm changes to the user.\n\n"
            "CRITICAL RULES:\n"
            "- ALWAYS create tasks when asked, even with minimal info. NEVER ask for more details.\n"
            "- If no dates provided: start_date = today, end_date = today + 3 days\n"
            "- If no assignee: use 'Unassigned'\n"
            "- If description missing: use task name as description\n"
            "- If 'раздел' or 'section' mentioned: treat it as a group label, add to description\n"
            "- Always reference tasks by their numeric ID\n"
            "- Ensure start_date <= end_date for every task\n"
            "- Respond in Russian (same language as user)\n"
            "- Be concise. After making changes, summarize what was done in Russian.\n\n"
            "Examples:\n"
            "- 'Добавь задачу Тест' → create_task(name='Тест', start_date=today, end_date=today+3d)\n"
            "- 'Удали задачу 5' → delete_task(id='5')\n"
            "- 'Поменяй дизайнера с архитектором' → update_task(id of System Design, assignee='Designer'), update_task(id of UI/UX Design, assignee='Architect')\n\n"
            f"Current plan state:\n{plan_context}"
        )

    @staticmethod
    def _get_tools_schema() -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "create_task",
                    "description": "Create a new task in the plan. If no dates provided, use today as start and today+3 days as end.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Task name"},
                            "description": {"type": "string", "description": "Task description"},
                            "start_date": {"type": "string", "description": "Start date YYYY-MM-DD. Optional, defaults to today."},
                            "end_date": {"type": "string", "description": "End date YYYY-MM-DD. Optional, defaults to start+3 days."},
                            "progress": {"type": "integer", "description": "Progress 0-100, default 0"},
                            "type": {"type": "string", "enum": ["task", "milestone", "project"]},
                            "assignee": {"type": "string", "description": "Person assigned, default 'Unassigned'"},
                            "dependencies": {"type": "array", "items": {"type": "string"}, "description": "List of prerequisite task IDs"},
                        },
                        "required": ["name"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "update_task",
                    "description": "Update an existing task by ID",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "description": "Task ID to update"},
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "start_date": {"type": "string"},
                            "end_date": {"type": "string"},
                            "progress": {"type": "integer"},
                            "type": {"type": "string", "enum": ["task", "milestone", "project"]},
                            "assignee": {"type": "string"},
                        },
                        "required": ["id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_task",
                    "description": "Delete a task by ID",
                    "parameters": {
                        "type": "object",
                        "properties": {"id": {"type": "string"}},
                        "required": ["id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "add_dependency",
                    "description": "Add dependency: source depends on target",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_id": {"type": "string"},
                            "target_id": {"type": "string"},
                        },
                        "required": ["source_id", "target_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "remove_dependency",
                    "description": "Remove dependency between two tasks",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_id": {"type": "string"},
                            "target_id": {"type": "string"},
                        },
                        "required": ["source_id", "target_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "list_tasks",
                    "description": "List all tasks in the current plan",
                    "parameters": {"type": "object", "properties": {}},
                },
            },
        ]
