# AI_NOTES.md

## Tools and models used
- **Claude** (via chat, with computer/file access) for the bulk of backend
  logic (ingestion pipeline, retrieval, prompt construction, tool-calling
  loop), debugging a production issue against live logs/screenshots, and
  for this documentation pass.
- **Lovable** for the initial frontend visual scaffold (pages, layout,
  shadcn/ui components) — built first against mock data/timeouts, then
  wired to the real backend one route at a time.
- Rough split: AI wrote the great majority of the code. My own work was
  mostly architectural decisions up front, reviewing/steering generated
  code, running the app and reporting back real behavior (screenshots,
  server logs) when something didn't work, and making the final calls on
  the three decisions below.

## Key decisions I made myself

**1. Raw SQL over an ORM for the isolation-critical query.**
`retrieval/vector_search.py` uses hand-written SQL with `where workspace_id
= %s` inline, rather than an ORM's query builder. The whole assignment is
graded on whether the workspace filter is *inside* the query rather than
applied after fetching rows — I wanted that filter to be visible and
auditable by inspection, not buried inside an ORM abstraction where it's
one accidental refactor away from becoming a Python-side filter instead of
a SQL one.

**2. Cosine-similarity floor gates the text answer, not just row count.**
pgvector's `ORDER BY ... LIMIT k` always returns *something*, even if
nothing in the workspace is actually relevant. I added
`MIN_RELEVANT_SIMILARITY = 0.5` as an explicit floor on the top match, so
"no rows" and "rows, but none of them are actually relevant" both force the
honest "I don't know" — this only occurred to me after testing an
unrelated question against a workspace and getting a confidently-answered
non-answer back the first time.

**3. Tool content-validation lives downstream of the schema handed to the
model, not inside it.**
Originally `title`/`summary` were `required` + `min_length=1` directly in
the pydantic schema — which is also the exact JSON schema sent to Groq's
tool-calling API. That's the source of the hardest bug below, and fixing
it meant deciding that "must be non-empty" is a business rule to enforce
ourselves after the model responds, not a constraint to bake into what the
model has to satisfy while generating.

## The hardest bug (and where the AI led me wrong)

I asked the assistant in chat to **"save a task with no title and no
description"** — deliberately adversarial, since `title` is required. The
UI returned a generic *"Something went wrong generating a response"* over
and over, with no error in the FastAPI console (just clean `200 OK`s in the
uvicorn log). It looked, at first glance, like a frontend bug — the same
user message appearing to resend itself with no visible reply.

What the AI initially assumed (based only on the code I'd uploaded) was
wrong in a subtle way: it started reasoning about the zipped repo snapshot
I'd provided, but that snapshot's `answer.py` had **no error handling at
all** around the Groq call — meaning if that were the code actually
running, an unhandled exception would have produced a `500`, not the clean
`200` the logs showed. The AI caught this itself mid-investigation by
cross-checking the zip against the live server logs, and flagged that the
zip didn't match what was actually deployed — a version mismatch I hadn't
noticed I'd introduced by not re-zipping after later edits.

Once we were reasoning from the actual running code, the real cause became
clear: `SaveTaskArgs.title` was `Field(..., min_length=1)`, and that exact
constraint was being serialized straight into the JSON schema handed to
Groq's tool-calling API via `model_json_schema()`. Asking for a task with
"no title" is a request the model literally cannot satisfy against that
schema — and the resulting tool-call generation was failing at the level
of the **Groq API call itself** (an `APIError`), not at our own pydantic
validation layer, which never even got a chance to run. The `except
APIError` block that caught this had no logging in it at all, which is why
the failure was completely invisible server-side despite happening on
every attempt.

**How I noticed:** by actually running the app and sending the screenshots
of the broken chat UI plus the raw uvicorn terminal log, rather than just
describing the symptom. The clean `200 OK`s with no visible reply were the
key detail — they ruled out a crash and pointed at "caught, but silently."

**How we fixed it:** made the tool schemas permissive at the JSON-schema
level (no `required`/`min_length`), so a syntactically valid tool call is
always possible; moved the actual "must be non-empty" rule into our own
`validate_tool_call`, where a rejection is a normal, logged
`ToolValidationResult(ok=False, ...)` instead of a failed provider call;
and added real logging (`status_code`, message, body) to every `except
APIError` block so this class of failure is never silent again.

## What I'd improve with more time
- Reject not just empty titles but obviously-invented placeholders (e.g.
  the model saving `"Untitled Task"` when explicitly told "no title") —
  currently a non-empty string of any kind passes, which means the model
  can technically override an explicit user instruction rather than asking
  for clarification.
- A retrieval-debug view showing exactly which chunks/workspace an answer
  drew from, for a cleaner way to *prove* isolation beyond the A/B test
  script.
- Multi-round tool use (model calls a tool, sees the result, decides to
  call a second one) — current implementation supports one round per turn,
  which was enough for two tools but wouldn't scale to more.
- Hybrid (keyword + vector) retrieval, since pure cosine similarity can
  miss exact-term matches that a keyword search would catch.