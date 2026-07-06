"""Extracts raw text from an uploaded file's bytes, based on its extension."""

import io

from pypdf import PdfReader


def extract_text(filename: str, raw_bytes: bytes) -> str:
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "pdf":
        reader = PdfReader(io.BytesIO(raw_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if ext in ("txt", "md"):
        return raw_bytes.decode("utf-8", errors="ignore")

    raise ValueError(f"Unsupported file type: .{ext}. Supported: .pdf, .txt, .md")
