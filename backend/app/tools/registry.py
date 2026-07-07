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
            "explicitly asks you to save, log, or track a task or action item. "
            "A non-empty title is required -- if the user hasn't given one, "
            "ask them for it instead of calling this tool with a blank title."
        ),
        args_schema=SaveTaskArgs,
    ),
    "send_slack_summary": ToolDefinition(
        name="send_slack_summary",
        description=(
            "Send a short summary message to the workspace's Slack channel. "
            "Use only when the user explicitly asks to send/post/share a "
            "summary to Slack. A non-empty summary is required."
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


# Business-rule checks that go beyond what the pydantic schema alone
# enforces -- kept here, separate from schemas.py, specifically so the
# JSON schema handed to Groq stays permissive (see schemas.py's note) while
# we still refuse to actually execute a call that's missing real content.
def _content_error(name: str, parsed: BaseModel) -> str | None:
    if name == "save_task" and not (parsed.title and parsed.title.strip()):
        return "A non-empty title is required to save a task."
    if name == "send_slack_summary" and not (parsed.summary and parsed.summary.strip()):
        return "A non-empty summary is required to send a Slack message."
    return None


def validate_tool_call(name: str, raw_arguments: dict[str, Any]) -> ToolValidationResult:
    """Validates a proposed tool call before execution. Rejects gracefully,
    never raises, never runs anything, for any of: unknown tool name,
    schema validation failure, or a business-rule content check (e.g. an
    empty title). Callers are expected to log a rejected call with
    status="error" in the tool_calls table.
    """
    tool = TOOL_REGISTRY.get(name)
    if tool is None:
        return ToolValidationResult(ok=False, error=f"Unknown tool: {name}")

    try:
        parsed = tool.args_schema.model_validate(raw_arguments)
    except ValidationError as e:
        return ToolValidationResult(ok=False, error=str(e))

    content_error = _content_error(name, parsed)
    if content_error:
        return ToolValidationResult(ok=False, error=content_error)

    return ToolValidationResult(ok=True, parsed_args=parsed)