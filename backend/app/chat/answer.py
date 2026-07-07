"""
Orchestrates a single RAG + tool-calling chat turn: retrieve -> (honest
fallback check) -> prompt -> LLM (with tools offered) -> [execute any
proposed tool calls -> LLM again for a final summary] -> citations ->
persist -> return.

The "I don't know" fallback is deliberately checked BEFORE calling the LLM
for the RAG *answer*: if scoped retrieval finds nothing relevant, we don't
trust whatever text the model produced against empty/weak sources. Tool
calls are a separate concern from document-grounded answering, though --
"save this as a task" isn't a document question, so the model is always
given the tool definitions and allowed to propose a call regardless of
retrieval relevance. The fallback only overrides the final *text* answer,
never blocks tool execution.

Scope note: this supports one round of tool calls (the model can propose
several tools in a single turn; each is executed and its result fed back),
then one follow-up completion for the final message. It does not recurse
into further rounds of tool proposals -- enough for this brief's two
tools, and avoids having to reason about infinite tool-call loops.
"""

import json
from uuid import UUID

from app.chat.citations import build_citations
from app.chat.llm import complete
from app.chat.prompt import build_messages
from app.db.client import get_connection
from app.retrieval.vector_search import search_chunks
from app.tools.executor import execute_tool_call
from app.tools.registry import get_tool_definitions

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
                (str(workspace_id), role, content, json.dumps(citations, default=str) if citations else None),
            )
        conn.commit()


def _run_tool_calls(workspace_id: UUID, messages: list[dict], tool_calls) -> list[dict]:
    """Executes every tool call the model proposed, appends the assistant's
    tool-call message and each tool's result back onto `messages` (so the
    follow-up completion has the full exchange), and returns a list of
    executed-call summaries for the API response / dashboard.
    """
    messages.append(
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in tool_calls
            ],
        }
    )

    executed = []
    for tc in tool_calls:
        tool_name = tc.function.name
        try:
            raw_arguments = json.loads(tc.function.arguments or "{}")
        except json.JSONDecodeError:
            raw_arguments = {}

        outcome = execute_tool_call(workspace_id, tool_name, raw_arguments)

        tool_message_content = (
            json.dumps(outcome.result) if outcome.ok else json.dumps({"error": outcome.error})
        )
        messages.append(
            {
                "role": "tool",
                "tool_call_id": tc.id,
                "content": tool_message_content,
            }
        )

        executed.append(
            {
                "tool_name": tool_name,
                "status": "success" if outcome.ok else "error",
                "result": outcome.result,
                "error": outcome.error,
            }
        )

    return executed


def generate_answer(workspace_id: UUID, query: str) -> dict:
    """Runs one full chat turn scoped to `workspace_id` and returns
    {"answer": str, "citations": list[dict], "grounded": bool,
    "tool_calls": list[dict]}.
    """
    _save_message(workspace_id, "user", query, None)

    chunks = search_chunks(workspace_id, query)
    has_context = _has_relevant_context(chunks)

    messages = build_messages(query, chunks)
    response_message = complete(messages, tools=get_tool_definitions())

    executed_tool_calls: list[dict] = []
    if response_message.tool_calls:
        executed_tool_calls = _run_tool_calls(workspace_id, messages, response_message.tool_calls)
        # Follow-up call with no `tools` -- we just want a plain-text
        # summary of what happened, not another round of proposals.
        final_message = complete(messages)
        answer_text = final_message.content or ""
        citations = build_citations(answer_text, chunks) if has_context else []
        grounded = has_context
    elif has_context:
        answer_text = response_message.content
        citations = build_citations(answer_text, chunks)
        grounded = True
    else:
        answer_text = FALLBACK_ANSWER
        citations = []
        grounded = False

    _save_message(workspace_id, "assistant", answer_text, citations)

    return {
        "answer": answer_text,
        "citations": citations,
        "grounded": grounded,
        "tool_calls": executed_tool_calls,
    }
