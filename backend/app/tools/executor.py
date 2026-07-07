"""
Executes a validated tool call and logs the outcome to tool_calls, for every
tool -- success or failure. This is the single choke point all tool
execution passes through, so "always log, never crash" only has to be
enforced in one place.

Per-tool logic (what save_task/send_slack_summary actually do) lives in
their own files and is imported here; this module owns validation ->
dispatch -> logging, not the side effects themselves.
"""

import json
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from app.db.client import get_connection
from app.tools.registry import validate_tool_call
from app.tools.save_task import run_save_task
from app.tools.send_slack_summary import run_send_slack_summary


@dataclass
class ToolExecutionResult:
    ok: bool
    result: dict | None = None
    error: str | None = None


# Dispatch table: tool name -> callable(workspace_id, parsed_args) -> dict.
# Adding a new tool means: schema in tools/schemas.py, entry in
# tools/registry.py's TOOL_REGISTRY, a run_* function, and one line here.
_DISPATCH = {
    "save_task": run_save_task,
    "send_slack_summary": run_send_slack_summary,
}


def _log_tool_call(
    workspace_id: UUID,
    tool_name: str,
    arguments: dict[str, Any],
    result: dict | None,
    status: str,
) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "insert into tool_calls (workspace_id, tool_name, arguments, result, status) "
                "values (%s, %s, %s, %s, %s)",
                (
                    str(workspace_id),
                    tool_name,
                    json.dumps(arguments),
                    json.dumps(result) if result is not None else None,
                    status,
                ),
            )
        conn.commit()


def execute_tool_call(
    workspace_id: UUID,
    tool_name: str,
    raw_arguments: dict[str, Any],
) -> ToolExecutionResult:
    """Validates raw_arguments against the tool's schema, runs it if valid,
    and unconditionally logs the attempt. Never raises: an unknown tool name,
    a schema validation failure, or an exception inside the tool itself all
    come back as ToolExecutionResult(ok=False, error=...) with a status="error"
    row already written to tool_calls.
    """
    validation = validate_tool_call(tool_name, raw_arguments)

    if not validation.ok:
        _log_tool_call(workspace_id, tool_name, raw_arguments, None, "error")
        return ToolExecutionResult(ok=False, error=validation.error)

    handler = _DISPATCH.get(tool_name)
    if handler is None:
        error = f"No executor implemented for tool: {tool_name}"
        _log_tool_call(workspace_id, tool_name, raw_arguments, None, "error")
        return ToolExecutionResult(ok=False, error=error)

    try:
        result = handler(workspace_id, validation.parsed_args)
    except Exception as e:
        _log_tool_call(workspace_id, tool_name, raw_arguments, None, "error")
        return ToolExecutionResult(ok=False, error=f"Tool execution failed: {e}")

    _log_tool_call(workspace_id, tool_name, raw_arguments, result, "success")
    return ToolExecutionResult(ok=True, result=result)
