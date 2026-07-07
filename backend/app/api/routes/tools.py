"""
Lets a user see which tools the assistant can call, and call one directly
without going through the LLM -- useful for debugging/demoing a tool in
isolation, since the log alone (tool_calls.py) only shows past calls, not
what's available or a way to trigger one on demand.

Manual invocation deliberately reuses the exact same validate -> execute ->
log path (`execute_tool_call`) that the LLM-triggered path in chat/answer.py
uses. That's the point: a manually-triggered call gets identical safety
guarantees (schema validation, no crash on bad args, always logged) as one
the model proposes. This route is not a way to bypass validation, only a
way to bypass the model.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import verify_workspace_access
from app.tools.executor import execute_tool_call
from app.tools.registry import TOOL_REGISTRY

router = APIRouter(prefix="/workspaces/{workspace_id}/tools", tags=["tools"])


def _describe_tool(name: str) -> dict:
    tool = TOOL_REGISTRY[name]
    schema = tool.args_schema.model_json_schema()
    return {
        "name": tool.name,
        "description": tool.description,
        "fields": [
            {
                "name": field_name,
                "type": field_schema.get("type", "string"),
                "required": field_name in schema.get("required", []),
            }
            for field_name, field_schema in schema.get("properties", {}).items()
        ],
    }


@router.get("")
def list_tools(workspace_id: UUID = Depends(verify_workspace_access)):
    """Returns the tools the assistant can call, with a simplified field
    list the frontend can render as a form -- not Groq's raw JSON schema,
    which carries more detail than the UI needs.
    """
    return [_describe_tool(name) for name in TOOL_REGISTRY]


@router.post("/{tool_name}/invoke")
def invoke_tool(
    tool_name: str,
    arguments: dict,
    workspace_id: UUID = Depends(verify_workspace_access),
):
    """Runs a tool directly, scoped to this workspace, through the same
    execute_tool_call path the LLM's tool calls go through. Bad arguments
    or an unknown tool name come back as a normal 4xx with the validation
    error -- never a crash -- and every attempt is logged to tool_calls
    exactly like an LLM-triggered one, so it shows up in Tool Logs too.
    """
    if tool_name not in TOOL_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {tool_name}")

    outcome = execute_tool_call(workspace_id, tool_name, arguments)

    if not outcome.ok:
        raise HTTPException(status_code=422, detail=outcome.error)

    return {"status": "success", "result": outcome.result}
