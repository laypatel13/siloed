from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class WorkspaceCreate(BaseModel):
    name: str


class Workspace(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    created_at: datetime


class CurrentUser(BaseModel):
    id: UUID
    email: str


class ChatRequest(BaseModel):
    message: str


class Citation(BaseModel):
    marker: int
    document_id: UUID
    filename: str
    chunk_index: int
    snippet: str
    similarity: float


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    grounded: bool
