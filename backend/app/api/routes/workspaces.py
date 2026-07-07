from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, verify_workspace_access
from app.db.client import get_connection
from app.schemas.domain import CurrentUser, Workspace, WorkspaceCreate

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[Workspace])
def list_workspaces(current_user: CurrentUser = Depends(get_current_user)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select id, user_id, name, created_at from workspaces "
                "where user_id = %s order by created_at asc",
                (str(current_user.id),),
            )
            rows = cur.fetchall()
    return rows


@router.post("", response_model=Workspace)
def create_workspace(
    payload: WorkspaceCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "insert into workspaces (user_id, name) values (%s, %s) "
                "returning id, user_id, name, created_at",
                (str(current_user.id), payload.name),
            )
            row = cur.fetchone()
        conn.commit()
    return row


@router.get("/{workspace_id}", response_model=Workspace)
def get_workspace(
    workspace_id: UUID = Depends(verify_workspace_access),
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select id, user_id, name, created_at from workspaces where id = %s",
                (str(workspace_id),),
            )
            row = cur.fetchone()
    return row
