"""
Splits raw document text into fixed-size, overlapping chunks.

Strategy: word-based fixed-size chunking with overlap. Simple, predictable,
easy to defend in AI_NOTES.md, and good enough for short-to-medium docs.
Token-accurate chunking (tiktoken etc.) is a stretch upgrade, not required.
"""

from dataclasses import dataclass

CHUNK_SIZE_WORDS = 350   # ~ roughly 500 tokens for English text
CHUNK_OVERLAP_WORDS = 50


@dataclass
class Chunk:
    content: str
    chunk_index: int


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE_WORDS,
    overlap: int = CHUNK_OVERLAP_WORDS,
) -> list[Chunk]:
    """Split text into overlapping word-based chunks."""
    words = text.split()
    if not words:
        return []

    chunks: list[Chunk] = []
    start = 0
    index = 0
    step = max(chunk_size - overlap, 1)  # guard against overlap >= chunk_size

    while start < len(words):
        end = start + chunk_size
        piece = " ".join(words[start:end])
        chunks.append(Chunk(content=piece, chunk_index=index))
        index += 1
        if end >= len(words):
            break
        start += step

    return chunks
