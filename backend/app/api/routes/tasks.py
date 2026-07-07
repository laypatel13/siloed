from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import verify_workspace_access
from app.db.client import get_connection

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["tasks"])


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
