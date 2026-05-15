"""OpenAI-compatible LLM agent with function calling for Gantt planning."""

import os
import json
from collections.abc import AsyncGenerator

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
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
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
        """Stream LLM response, execute tool calls, yield text chunks."""
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
                    stream_options={"include_usage": True},
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
                                tool_calls[idx] = {
                                    "id": tc.id,
                                    "function": {"name": "", "arguments": ""},
                                }
                            if tc.id:
                                tool_calls[idx]["id"] = tc.id
                            if tc.function:
                                if tc.function.name:
                                    tool_calls[idx]["function"]["name"] += (
                                        tc.function.name
                                    )
                                if tc.function.arguments:
                                    tool_calls[idx]["function"]["arguments"] += (
                                        tc.function.arguments
                                    )

                if not tool_calls:
                    return

                # Execute tool calls
                all_messages.append(
                    {
                        "role": "assistant",
                        "content": "".join(text_parts) or None,
                        "tool_calls": [
                            {
                                "id": tc["id"],
                                "type": "function",
                                "function": tc["function"],
                            }
                            for tc in tool_calls.values()
                        ],
                    }
                )

                for tc in tool_calls.values():
                    result = await self._execute_tool(
                        tc["function"]["name"],
                        tc["function"]["arguments"],
                    )
                    all_messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "content": result,
                        }
                    )

        except Exception as exc:
            yield f"\n[LLM Error] {exc}"

    async def _execute_tool(self, name: str, arguments: str) -> str:
        """Dispatch tool call. Returns JSON result string."""
        # Tool execution is handled by the caller via MCP layer.
        # This method provides a default passthrough.
        return json.dumps({"tool": name, "arguments": arguments, "status": "dispatched"})

    @staticmethod
    def _build_system_prompt(plan_context: str) -> str:
        return (
            "You are an AI Gantt chart planning assistant. "
            "Help users create, modify, and analyze project plans.\n\n"
            "Rules:\n"
            "- All dates must be YYYY-MM-DD format\n"
            "- Always reference tasks by their numeric ID\n"
            "- Detect and warn about circular dependencies before adding them\n"
            "- Ensure start_date <= end_date for every task\n"
            "- When creating tasks, provide realistic timelines\n"
            "- When adding dependencies, verify both task IDs exist\n\n"
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
                    "strict": True,
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Task name"},
                            "description": {"type": "string", "description": "Task description"},
                            "start_date": {"type": "string", "description": "Start date YYYY-MM-DD"},
                            "end_date": {"type": "string", "description": "End date YYYY-MM-DD"},
                            "progress": {"type": "integer", "description": "Progress 0-100"},
                            "type": {
                                "type": "string",
                                "enum": ["task", "milestone", "project"],
                                "description": "Task type",
                            },
                            "assignee": {"type": "string", "description": "Person assigned"},
                        },
                        "required": [
                            "name", "description", "start_date",
                            "end_date", "progress", "type", "assignee",
                        ],
                        "additionalProperties": False,
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "update_task",
                    "description": "Update an existing task by ID",
                    "strict": True,
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "description": "Task ID to update"},
                            "name": {"type": "string", "description": "New name"},
                            "description": {"type": "string", "description": "New description"},
                            "start_date": {"type": "string", "description": "New start YYYY-MM-DD"},
                            "end_date": {"type": "string", "description": "New end YYYY-MM-DD"},
                            "progress": {"type": "integer", "description": "New progress 0-100"},
                            "type": {
                                "type": "string",
                                "enum": ["task", "milestone", "project"],
                                "description": "New type",
                            },
                            "assignee": {"type": "string", "description": "New assignee"},
                        },
                        "required": [
                            "id", "name", "description", "start_date",
                            "end_date", "progress", "type", "assignee",
                        ],
                        "additionalProperties": False,
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_task",
                    "description": "Delete a task by ID",
                    "strict": True,
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "description": "Task ID to delete"},
                        },
                        "required": ["id"],
                        "additionalProperties": False,
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "add_dependency",
                    "description": "Add dependency: source depends on target",
                    "strict": True,
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_id": {"type": "string", "description": "Source task ID"},
                            "target_id": {"type": "string", "description": "Target (prerequisite) task ID"},
                        },
                        "required": ["source_id", "target_id"],
                        "additionalProperties": False,
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "remove_dependency",
                    "description": "Remove dependency between two tasks",
                    "strict": True,
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_id": {"type": "string", "description": "Source task ID"},
                            "target_id": {"type": "string", "description": "Target task ID"},
                        },
                        "required": ["source_id", "target_id"],
                        "additionalProperties": False,
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "list_tasks",
                    "description": "List all tasks in the current plan",
                    "strict": True,
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": [],
                        "additionalProperties": False,
                    },
                },
            },
        ]
