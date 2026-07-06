"""
Thin wrapper around the Groq chat completion API. Kept separate from
chat/answer.py (the orchestration logic) for the same reason embedder.py
is separate from ingestion/pipeline.py: swapping the LLM provider later
should only touch this file.
"""

from groq import Groq

from config import settings

_client = Groq(api_key=settings.groq_api_key)


def complete(messages: list[dict], temperature: float = 0.2) -> str:
    """Sends `messages` to the configured Groq model and returns the
    assistant's reply text. Low default temperature -- we want grounded,
    repeatable answers here, not creative ones.
    """
    response = _client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content
