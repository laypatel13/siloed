"""
Central registry of tools the LLM is allowed to call. Two jobs:
1. Produce the `tools` array passed to Groq's chat completion, so the model
   only ever sees the schemas we define here.
2. Validate a proposed tool call (name + raw arguments dict) against its
   pydantic schema before anything is executed.

Execution logic (what actually happens once a call validates) is added in
later commits, per-tool -- this file only owns definitions + validation.
"""

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ValidationError

from app.tools.schemas import SaveTaskArgs, SendSlackSummaryArgs


@dataclass
class ToolDefinition:
    name: str
    description: str
    args_schema: type[BaseModel]


TOOL_REGISTRY: dict[str, ToolDefinition] = {
    "save_task": ToolDefinition(
        name="save_task",
        description=(
            "Save a task/to-do item for this workspace. Use when the user "
            "explicitly asks you to save, log, or track a task or action item."
        ),
        args_schema=SaveTaskArgs,
    ),
    "send_slack_summary": ToolDefinition(
        name="send_slack_summary",
        description=(
            "Send a short summary message to the workspace's Slack channel. "
            "Use only when the user explicitly asks to send/post/share a "
            "summary to Slack."
        ),
        args_schema=SendSlackSummaryArgs,
    ),
}


def get_tool_definitions() -> list[dict]:
    """Returns tool definitions in the OpenAI/Groq function-calling format,
    built directly from each schema's pydantic JSON schema so the model's
    view of a tool's shape can never drift from what validate_tool_call
    actually enforces.
    """
    definitions = []
    for tool in TOOL_REGISTRY.values():
        definitions.append(
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.args_schema.model_json_schema(),
                },
            }
        )
    return definitions


@dataclass
class ToolValidationResult:
    ok: bool
    parsed_args: BaseModel | None = None
    error: str | None = None


def validate_tool_call(name: str, raw_arguments: dict[str, Any]) -> ToolValidationResult:
    """Validates a proposed tool call before execution. Two failure modes,
    both handled the same way: reject gracefully, never raise, never run
    anything. Callers are expected to log a rejected call with
    status="error" in the tool_calls table (wired in a later commit).
    """
    tool = TOOL_REGISTRY.get(name)
    if tool is None:
        return ToolValidationResult(ok=False, error=f"Unknown tool: {name}")

    try:
        parsed = tool.args_schema.model_validate(raw_arguments)
    except ValidationError as e:
        return ToolValidationResult(ok=False, error=str(e))

    return ToolValidationResult(ok=True, parsed_args=parsed)
