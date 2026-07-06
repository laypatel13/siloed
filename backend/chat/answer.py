"""
Orchestrates a single RAG chat turn: retrieve -> (honest fallback check) ->
prompt -> LLM -> citations -> persist -> return.

The "I don't know" fallback is deliberately checked BEFORE calling the LLM:
if scoped retrieval finds nothing relevant in this workspace, there's no
point spending a model call on it, and it removes any chance of the model
guessing from outside knowledge when the sources are empty/weak.
"""

import json
from uuid import UUID

from chat.citations import build_citations
from chat.llm import complete
from chat.prompt import build_messages
from db.client import get_connection
from retrieval.vector_search import search_chunks

# Cosine similarity below this is treated as "not actually relevant" --
# pgvector will always return top_k rows even if none of them are a good
# match, so a floor is needed on top of "did we get any rows at all".
MIN_RELEVANT_SIMILARITY = 0.5

FALLBACK_ANSWER = (
    "I don't know -- I couldn't find anything in this workspace's documents "
    "that answers that question."
)


def _has_relevant_context(chunks: list[dict]) -> bool:
    return bool(chunks) and chunks[0]["similarity"] >= MIN_RELEVANT_SIMILARITY


def _save_message(workspace_id: UUID, role: str, content: str, citations: list[dict] | None):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "insert into chat_messages (workspace_id, role, content, citations) "
                "values (%s, %s, %s, %s)",
                (str(workspace_id), role, content, json.dumps(citations) if citations else None),
            )
        conn.commit()


def generate_answer(workspace_id: UUID, query: str) -> dict:
    """Runs one full chat turn scoped to `workspace_id` and returns
    {"answer": str, "citations": list[dict], "grounded": bool}.
    """
    _save_message(workspace_id, "user", query, None)

    chunks = search_chunks(workspace_id, query)

    if not _has_relevant_context(chunks):
        _save_message(workspace_id, "assistant", FALLBACK_ANSWER, None)
        return {"answer": FALLBACK_ANSWER, "citations": [], "grounded": False}

    messages = build_messages(query, chunks)
    answer_text = complete(messages)
    citations = build_citations(answer_text, chunks)

    _save_message(workspace_id, "assistant", answer_text, citations)

    return {"answer": answer_text, "citations": citations, "grounded": True}
