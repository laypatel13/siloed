from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import verify_workspace_access
from app.chat.answer import generate_answer
from app.db.client import get_connection
from app.schemas.domain import ChatRequest, ChatResponse

router = APIRouter(prefix="/workspaces/{workspace_id}/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    workspace_id: UUID = Depends(verify_workspace_access),
):
    return generate_answer(workspace_id, payload.message)


@router.get("")
def chat_history(workspace_id: UUID = Depends(verify_workspace_access)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select role, content, citations, created_at from chat_messages "
                "where workspace_id = %s order by created_at asc",
                (str(workspace_id),),
            )
            rows = cur.fetchall()
    return rows
