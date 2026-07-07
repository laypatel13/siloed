from functools import lru_cache
from uuid import UUID

import logging

from fastapi import Depends, HTTPException, Header
from supabase import create_client, Client

from app.core.config import settings
from app.db.client import get_connection
from app.schemas.domain import CurrentUser

logger = logging.getLogger(__name__)


@lru_cache
def _get_supabase() -> Client:
    # Lazy + cached: constructed on first request, not at import time, so a
    # bad/missing key surfaces as a 401 on the request that needed auth
    # (with a real traceback in the logs) instead of crash-looping the
    # entire app, including routes like /health that don't need Supabase.
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_current_user(authorization: str = Header(...)) -> CurrentUser:
    """Verifies the bearer token against Supabase Auth and returns the user.
    Expects header: Authorization: Bearer <access_token>
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        result = _get_supabase().auth.get_user(token)
    except Exception:
        # Covers both a bad token AND a bad SUPABASE_URL/ANON_KEY -- log the
        # real cause so a config problem doesn't look identical to a normal
        # expired-token 401 in the logs.
        logger.exception("Supabase auth check failed")
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