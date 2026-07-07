# AI_NOTES.md

> How AI tools were used to build **siloed**, the calls I made myself, and
> the hardest bug of the 72 hours — told the way it actually happened.

## TL;DR

- **Claude** wrote the majority of backend code and did the debugging;
  **ChatGPT** helped think and organize before any code existed;
  **Lovable** scaffolded the frontend UI against mock data first.
- I made three architectural calls myself (raw SQL for the isolation
  query, a similarity floor for honest refusals, where tool-content
  validation lives) — see [§ Key decisions](#key-decisions-i-made-myself).
- The hardest bug looked like a frontend glitch, was actually a stale zip
  vs. live server mismatch, and underneath *that* was a silently-swallowed
  Groq `APIError` caused by baking a business rule into a JSON schema.
  Full story below.

---

## Tools and models used

| Tool | Role |
|---|---|
| **Claude** (chat, with computer/file access) | Bulk of backend logic — ingestion pipeline, retrieval, prompt construction, tool-calling loop. Debugged the hardest bug against live logs/screenshots. Full documentation pass (README, TEST.md, this file, CLAUDE.md, sample-doc fixtures, README demo GIF). |
| **ChatGPT** | Early brainstorming and organizing, before any code existed — how to keep the workspace filter auditable, what the tool-calling loop should look like at a high level, how to structure docs so a reviewer isn't hunting across five files for one fact. Turned the assessment brief into a checklist that became CLAUDE.md's roadmap. Never touched the codebase directly. |
| **Lovable** | Initial frontend visual scaffold — pages, layout, shadcn/ui components — built first against mock data/timeouts, then wired to the real backend one route at a time. |

**The split, honestly:** ChatGPT helped me think before writing anything;
Claude and Lovable wrote the great majority of the actual code. My own
work was the architectural decisions up front, reviewing and steering
generated code, running the app and reporting back real behavior
(screenshots, server logs) when something broke, and making the three
calls below.

---

## Key decisions I made myself

**1. Raw SQL over an ORM for the isolation-critical query.**
`retrieval/vector_search.py` hand-writes `where workspace_id = %s` inline
instead of going through an ORM's query builder. The whole assignment is
graded on whether that filter sits *inside* the query rather than gets
applied after fetching rows — I wanted it visible and auditable by
inspection, not buried where one careless refactor turns it into a
Python-side filter instead of a SQL one.

**2. A cosine-similarity floor gates the text answer, not just row count.**
`ORDER BY ... LIMIT k` always returns *something*, even when nothing in
the workspace is actually relevant. `MIN_RELEVANT_SIMILARITY = 0.5` forces
the honest "I don't know" whether there are zero rows or just weak ones —
this only became obvious after an unrelated question got a confidently
wrong answer the first time I tried it.

**3. Tool content-validation lives downstream of the model's schema, not
inside it.** `title`/`summary` used to be `required` + `min_length=1`
directly in the pydantic model — which is also the literal JSON schema
sent to Groq's tool-calling API. That's the root of the bug below. Fixing
it meant deciding "must be non-empty" is a business rule to enforce after
the model responds, not a constraint baked into what it has to satisfy
while generating.

---

## The hardest bug

**The ask:** *"save a task with no title and no description"* —
deliberately adversarial, since `title` is required.

**What happened on screen:** the UI returned a generic *"Something went
wrong generating a response"*, over and over. The FastAPI console showed
nothing but clean `200 OK`s. It looked like a frontend bug — the same
message appearing to resend with no visible reply.

**Step 1 — the false lead.**
Working from the zip I'd uploaded, the AI started reasoning about code
that had **no error handling at all** around the Groq call. If that code
were actually running, an unhandled exception should have produced a
`500`, not a clean `200`. The AI caught the contradiction itself —
cross-checked the zip against the live server logs, and flagged that the
zip didn't match what was actually deployed. I'd edited the code after
last zipping it and hadn't noticed.

**Step 2 — reasoning from the real, running code.**
`SaveTaskArgs.title` was `Field(..., min_length=1)`, and that exact
constraint was serialized straight into the JSON schema handed to Groq's
tool-calling API via `model_json_schema()`. A task with "no title" is a
request the model *literally cannot satisfy* against that schema — so
generation was failing at the **Groq API call itself** (an `APIError`),
never reaching our own pydantic validation. The `except APIError` block
that caught it had no logging at all — which is why every failed attempt
was completely invisible server-side.

**How I actually noticed:** by running the app and handing over
screenshots of the broken chat UI plus the raw uvicorn log, instead of
just describing the symptom. The clean `200 OK`s with no visible reply
were the tell — they ruled out a crash and pointed at "caught, but
silent."

**The fix, three parts:**
- Tool schemas made permissive at the JSON-schema level (no
  `required`/`min_length`) — a syntactically valid tool call is always
  possible.
- The real "must be non-empty" rule moved into `validate_tool_call`,
  where a rejection is a normal, logged `ToolValidationResult(ok=False,
  ...)`, not a failed provider call.
- Real logging (`status_code`, message, body) added to every `except
  APIError` block, so this class of failure can't go silent again.

---

## What I'd improve with more time

- **Reject invented placeholders, not just empty strings.** The model can
  currently satisfy "no title" by saving `"Untitled Task"` — a non-empty
  string of any kind passes today, which lets it quietly override an
  explicit instruction instead of asking for clarification.
- **A retrieval-debug view** — which chunks/workspace an answer actually
  drew from — for a cleaner way to *prove* isolation beyond the A/B test
  script.
- **Multi-round tool use.** Current implementation supports one round per
  turn (call → result → final summary), which covered two tools fine but
  wouldn't scale further.
- **Hybrid retrieval** (keyword + vector) — pure cosine similarity can
  miss exact-term matches a keyword search would catch.

---

## Note on the documentation pass

A meaningful chunk of the final effort wasn't new backend code — it was
making the docs match what's actually shipped. What was wrong, found
during that pass:

- README still said "not deployed yet" after it already was.
- The reviewer-instructions section was still raw `TODO`s.
- Two evidence screenshots were linked under filenames that didn't exist
  on disk — one had a stray double extension, one was mislabeled `-422`
  when the code actually returns `404` for an unknown tool.
- `17-slack-*.png` had been provisionally checked off as a Slack success
  before actually confirming what it showed — it turned out to be a
  webhook request still pending approval, not a delivered message, so
  that row stayed honestly marked ⏳ instead of ✅.

All fixed: real screenshots stitched into an actual README GIF, a
`.github/sample-docs/` folder with ready-to-upload fixtures so a reviewer
never hand-writes a test document, and TEST.md's reviewer quick-start
pointing at exact files and exact questions instead of placeholders.

**Still genuinely open:** a throwaway login and a deployed-instance
test-pass date — both need a real browser against the live Supabase
project, which isn't something achievable from a chat session with no
network access to the deployed app.
