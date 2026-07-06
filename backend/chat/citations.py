"""
Turns [n] citation markers in a model's answer back into structured
references to the actual retrieved chunks, for display in the frontend.

Numbering convention: [1] is chunks[0], [2] is chunks[1], etc. -- must stay
in sync with the numbering used in chat/prompt.py's build_context_block.
"""

import re

CITATION_MARKER_RE = re.compile(r"\[(\d+)\]")


def extract_cited_indices(answer_text: str) -> list[int]:
    """Returns the unique source numbers (1-based) referenced in the
    answer, in first-seen order. E.g. "... [2] and again [1][2]" -> [2, 1].
    """
    seen: list[int] = []
    for match in CITATION_MARKER_RE.finditer(answer_text):
        n = int(match.group(1))
        if n not in seen:
            seen.append(n)
    return seen


def build_citations(answer_text: str, chunks: list[dict]) -> list[dict]:
    """Resolves the [n] markers actually used in `answer_text` into the
    source chunk metadata the frontend needs to render them (filename,
    snippet, similarity). Silently drops any marker number that's out of
    range rather than raising -- a malformed citation shouldn't break the
    response.
    """
    citations = []
    for n in extract_cited_indices(answer_text):
        idx = n - 1
        if 0 <= idx < len(chunks):
            chunk = chunks[idx]
            citations.append(
                {
                    "marker": n,
                    "document_id": chunk["document_id"],
                    "filename": chunk["filename"],
                    "chunk_index": chunk["chunk_index"],
                    "snippet": chunk["content"][:200],
                    "similarity": chunk["similarity"],
                }
            )
    return citations
