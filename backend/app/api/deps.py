from uuid import UUID

from fastapi import Depends, HTTPException, Header
from supabase import create_client, Client

from app.core.config import settings
from app.db.client import get_connection
from app.schemas.domain import CurrentUser

_supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)


def get_current_user(authorization: str = Header(...)) -> CurrentUser:
    """Verifies the bearer token against Supabase Auth and returns the user.
    Expects header: Authorization: Bearer <access_token>
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        result = _supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = getattr(result, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return CurrentUser(id=UUID(user.id), email=user.email)


def verify_workspace_access(
    workspace_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
) -> UUID:
    """Confirms the workspace belongs to the authenticated user.
    Every route that touches a specific workspace must depend on this,
    not just get_current_user -- this is what stops one user from
    reading/acting on another user's workspace by guessing an id.
    Returns the workspace_id for convenience once verified.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select id from workspaces where id = %s and user_id = %s",
                (str(workspace_id), str(current_user.id)),
            )
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return workspace_id
