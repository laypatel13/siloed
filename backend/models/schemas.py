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
