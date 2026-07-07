import hashlib
from uuid import UUID

from app.db.client import get_connection
from app.ingestion.chunker import chunk_text
from app.ingestion.embedder import embed_batch
from app.ingestion.extractor import extract_text


def hash_content(raw_bytes: bytes) -> str:
    """SHA-256 of raw file bytes. Used as the idempotency key: re-uploading
    identical bytes into the same workspace is a no-op, not a duplicate."""
    return hashlib.sha256(raw_bytes).hexdigest()


def ingest_document(workspace_id: UUID, filename: str, raw_bytes: bytes) -> dict:
    """Runs the full pipeline: hash -> (skip if duplicate) -> extract ->
    chunk -> embed -> store, all tagged with workspace_id.

    Returns {"status": "duplicate"|"ingested", "document_id": ..., "chunk_count": ...}
    """
    content_hash = hash_content(raw_bytes)

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Idempotency check: same workspace + same content hash => skip.
            cur.execute(
                "select id from documents where workspace_id = %s and content_hash = %s",
                (str(workspace_id), content_hash),
            )
            existing = cur.fetchone()
            if existing:
                return {
                    "status": "duplicate",
                    "document_id": existing["id"],
                    "chunk_count": 0,
                }

            cur.execute(
                "insert into documents (workspace_id, filename, content_hash) "
                "values (%s, %s, %s) returning id",
                (str(workspace_id), filename, content_hash),
            )
            document_id = cur.fetchone()["id"]
        conn.commit()

    text = extract_text(filename, raw_bytes)
    chunks = chunk_text(text)

    if not chunks:
        return {"status": "ingested", "document_id": document_id, "chunk_count": 0}

    embeddings = embed_batch([c.content for c in chunks], task_type="retrieval_document")

    with get_connection() as conn:
        with conn.cursor() as cur:
            for chunk, embedding in zip(chunks, embeddings):
                cur.execute(
                    "insert into chunks "
                    "(workspace_id, document_id, content, embedding, chunk_index) "
                    "values (%s, %s, %s, %s, %s)",
                    (
                        str(workspace_id),
                        str(document_id),
                        chunk.content,
                        embedding,
                        chunk.chunk_index,
                    ),
                )
        conn.commit()

    return {
        "status": "ingested",
        "document_id": document_id,
        "chunk_count": len(chunks),
    }
