"""
Pydantic schemas for every tool the LLM can call. These are the validation
boundary referenced in CLAUDE.md's hard rules: any arguments the model
proposes must parse against one of these before anything actually runs.
Malformed args -> ValidationError -> caller rejects gracefully, never
executes on unvalidated input.
"""

from pydantic import BaseModel, Field


class SaveTaskArgs(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


class SendSlackSummaryArgs(BaseModel):
    summary: str = Field(..., min_length=1, max_length=4000)
