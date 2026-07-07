"""
Scoped vector search over the shared `chunks` table.

This is the retrieval-layer half of tenant isolation (the other half is
`auth.verify_workspace_access`, which stops cross-workspace requests at the
route level). Even if that check were ever missed on some future route,
a query issued here can still only ever touch rows for the given
workspace_id, because the filter lives inside the SQL itself -- never
applied by filtering results in Python after the fact.
"""

from uuid import UUID

from app.db.client import get_connection
from app.ingestion.embedder import embed_text

DEFAULT_TOP_K = 5


def search_chunks(workspace_id: UUID, query: str, top_k: int = DEFAULT_TOP_K) -> list[dict]:
    """Embeds `query` and returns the top_k most similar chunks that belong
    to `workspace_id`, ordered by cosine distance (closest first).

    The `where workspace_id = %s` filter is INSIDE the query, combined with
    the vector ORDER BY -- pgvector never even ranks another workspace's
    rows, let alone returns them. Do not "optimize" this by removing the
    filter and post-filtering in Python; that would defeat the isolation
    guarantee this function exists to provide.
    """
    query_embedding = embed_text(query, task_type="retrieval_query")

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select
                    c.id,
                    c.document_id,
                    c.content,
                    c.chunk_index,
                    d.filename,
                    1 - (c.embedding <=> %s::vector) as similarity
                from chunks c
                join documents d on d.id = c.document_id
                where c.workspace_id = %s
                order by c.embedding <=> %s::vector
                limit %s
                """,
                (query_embedding, str(workspace_id), query_embedding, top_k),
            )
            rows = cur.fetchall()

    return [
        {
            "chunk_id": row["id"],
            "document_id": row["document_id"],
            "filename": row["filename"],
            "content": row["content"],
            "chunk_index": row["chunk_index"],
            "similarity": row["similarity"],
        }
        for row in rows
    ]
