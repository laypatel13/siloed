from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile

from app.api.deps import verify_workspace_access
from app.db.client import get_connection
from app.ingestion.pipeline import ingest_document

router = APIRouter(prefix="/workspaces/{workspace_id}/documents", tags=["documents"])


@router.post("")
async def upload_document(
    file: UploadFile,
    workspace_id: UUID = Depends(verify_workspace_access),
):
    raw_bytes = await file.read()
    result = ingest_document(workspace_id, file.filename, raw_bytes)
    return result


@router.get("")
def list_documents(workspace_id: UUID = Depends(verify_workspace_access)):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "select id, filename, created_at from documents "
                "where workspace_id = %s order by created_at desc",
                (str(workspace_id),),
            )
            rows = cur.fetchall()
    return rows
