"""
Wraps Gemini's embedding model. Kept as a thin adapter so swapping embedding
providers later only touches this one file, not retrieval/ingestion code.
"""

import google.generativeai as genai

from config import settings

genai.configure(api_key=settings.gemini_api_key)

EMBEDDING_DIM = 768  # must match backend/db/schema.sql `vector(768)`


def embed_text(text: str, task_type: str = "retrieval_document") -> list[float]:
    """Returns a single embedding vector for one piece of text.

    task_type differs for documents vs queries in Gemini's API
    ("retrieval_document" vs "retrieval_query") -- using the right one
    improves retrieval quality slightly, so callers should pass it
    explicitly rather than relying on the default.
    """
    result = genai.embed_content(
        model=f"models/{settings.gemini_embedding_model}",
        content=text,
        task_type=task_type,
    )
    return result["embedding"]


def embed_batch(texts: list[str], task_type: str = "retrieval_document") -> list[list[float]]:
    """Embeds multiple texts. Gemini's SDK doesn't batch natively here,
    so this loops -- fine for hackathon-scale document counts. Swap for
    a true batch call if throughput becomes a problem."""
    return [embed_text(t, task_type=task_type) for t in texts]
