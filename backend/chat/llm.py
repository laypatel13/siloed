"""
Thin wrapper around the Groq chat completion API. Kept separate from
chat/answer.py (the orchestration logic) for the same reason embedder.py
is separate from ingestion/pipeline.py: swapping the LLM provider later
should only touch this file.
"""

from groq import Groq

from config import settings

_client = Groq(api_key=settings.groq_api_key)


def complete(messages: list[dict], temperature: float = 0.2, tools: list[dict] | None = None):
    """Sends `messages` to the configured Groq model and returns the raw
    assistant message object (has `.content` and, when `tools` is passed
    and the model decides to use one, `.tool_calls`).

    Low default temperature -- we want grounded, repeatable answers here,
    not creative ones. `tools` is optional: chat/answer.py's follow-up call
    (after tool results are appended) omits it, since we just want a plain
    text summary at that point, not another round of tool proposals.
    """
    kwargs = {}
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"

    response = _client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=temperature,
        **kwargs,
    )
    return response.choices[0].message
