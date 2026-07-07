"""
Pydantic schemas for every tool the LLM can call. These are the validation
boundary referenced in CLAUDE.md's hard rules: any arguments the model
proposes must parse against one of these before anything actually runs.
Malformed args -> ValidationError -> caller rejects gracefully, never
executes on unvalidated input.

Note on required-content fields (title, summary): these are intentionally
NOT declared `required`/`min_length` at the schema level anymore. A schema
that's impossible for the model to satisfy (e.g. a user explicitly asking
for "no title") can cause Groq's own tool-call generation to fail the
completion request itself -- a much harder failure to recover from than a
clean validation rejection. Instead, the schema stays permissive enough
that Groq can always produce a syntactically valid call, and the "must
have real content" business rule is enforced ourselves in
registry.validate_tool_call, where a failure is just a normal, gracefully
handled ToolValidationResult(ok=False, ...).
"""

from pydantic import BaseModel, Field


class SaveTaskArgs(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


class SendSlackSummaryArgs(BaseModel):
    summary: str | None = Field(default=None, max_length=4000)