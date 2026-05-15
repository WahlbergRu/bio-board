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
            for tc in tool_calls.values():
                name = tc["function"]["name"]
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

    @staticmethod
    def _build_system_prompt(plan_context: str) -> str:
        return (
            "You are an AI Gantt chart planning assistant. "
            "Help users create, modify, and analyze project plans. "
            "Use the available tools to make changes. Always confirm changes to the user.\n\n"
            "Rules:\n"
            "- All dates must be YYYY-MM-DD format\n"
            "- Always reference tasks by their numeric ID\n"
            "- Detect and warn about circular dependencies before adding them\n"
            "- Ensure start_date <= end_date for every task\n"
            "- When creating tasks, provide realistic timelines\n"
            "- When adding dependencies, verify both task IDs exist\n"
            "- Respond in the same language the user writes in (Russian or English)\n"
            "- Be concise. After making changes, summarize what was done.\n\n"
            f"Current plan state:\n{plan_context}"
        )

    @staticmethod
    def _get_tools_schema() -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "create_task",
                    "description": "Create a new task in the plan",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Task name"},
                            "description": {"type": "string", "description": "Task description"},
                            "start_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                            "end_date": {"type": "string", "description": "End date YYYY-MM-DD (optional, calculated from duration)"},
                            "progress": {"type": "integer", "description": "Progress 0-100"},
                            "type": {"type": "string", "enum": ["task", "milestone", "project"]},
                            "assignee": {"type": "string", "description": "Person assigned"},
                        },
                        "required": ["name", "start_date"],
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
