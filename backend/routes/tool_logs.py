from uuid import UUID

from fastapi import APIRouter, Depends

from auth.deps import verify_workspace_access
from db.client import get_connection

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["tools"])


@router.get("/tasks")
def list_tasks(workspace_id: UUID = Depends(verify_workspace_access)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select id, title, description, created_at from tasks "
                "where workspace_id = %s order by created_at desc",
                (str(workspace_id),),
            )
            rows = cur.fetchall()
    return rows


@router.get("/tool-calls")
def list_tool_calls(workspace_id: UUID = Depends(verify_workspace_access)):
    """The tool-call log for the dashboard -- every attempted call, success
    or error, for the active workspace only."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select id, tool_name, arguments, result, status, created_at "
                "from tool_calls where workspace_id = %s order by created_at desc",
                (str(workspace_id),),
            )
            rows = cur.fetchall()
    return rows
