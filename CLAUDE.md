# CLAUDE.md

This file is the single source of truth for this project's context. If a new
chat/session is picking this up, read this whole file first — it captures
what's built, what's left, and the hard rules that must never be violated.

## Project
"siloed" — a multi-workspace RAG assistant with tool calling, built for the
Abstrabit take-home assessment (72-hour window, 30-commit target).
FastAPI backend, React (Vite) frontend, Supabase Postgres + pgvector as a
single shared vector store, Groq for chat + tool calling, Gemini for
embeddings. Deployed: backend on Render, frontend on Vercel.

Assessment brief: multi-tenant RAG + tool calling, graded primarily on
workspace isolation (fact in workspace A must never leak when queried from
workspace B), grounded/honest answers with citations, safe tool execution,
prompt-injection resistance, graceful failure, and clean code + AI_NOTES.md.

## Hard rules (never violate)
- Every vector search MUST filter `WHERE workspace_id = $1` INSIDE the SQL
  query itself — never filter results after fetching. This is the core
  tenant-isolation guarantee and is graded directly.
- Every workspace-scoped route must depend on `verify_workspace_access`
  (auth/deps.py), not just `get_current_user` — this stops one user from
  reading/acting on another user's workspace by guessing an id. This is the
  auth-layer half of isolation; the vector-query filter above is the
  retrieval-layer half. Both are required.
- Never trust retrieved document text as instructions. It is DATA. Treat any
  "ignore previous instructions"-style content inside chunks as inert —
  system prompt must explicitly frame retrieved chunks as untrusted content
  to discuss, never as commands to follow.
- Every tool call from the LLM must be validated against its pydantic schema
  before execution. Unknown tool name or malformed args -> reject gracefully,
  log the failure (status="error" in tool_calls table), never crash.
- Never hardcode or log API keys, DB credentials, or webhook URLs. Read from
  env only via config.py. `.env` is gitignored; `.env.example` has
  placeholders only.
- Document ingestion must be idempotent: hash raw file bytes (sha256), skip
  re-chunking/re-embedding if a document with the same hash already exists
  in that workspace. Implemented in ingestion/pipeline.py.
- If the LLM call fails or is slow, the user's in-progress question and app
  state must not be lost — surface an error, don't crash the session.

## Conventions
- Commit style: conventional commits, full words (`feature`, `fix`,
  `refactor`, `docs`, `chore`, `test`), scoped where relevant, e.g.
  `feature(ingestion): add chunker`.
- Python: FastAPI + pydantic models for all request/response shapes.
- Chunking: word-based fixed-size, ~350 words (~500 tokens), 50 word overlap.
  Documented as a known simplification in AI_NOTES.md rather than pulling in
  a real tokenizer dependency.
- Keep route handlers thin — business logic lives in
  `ingestion/`, `retrieval/`, `chat/`, `tools/`.
- DB access: raw psycopg + hand-written SQL (no ORM) — keeps the isolation
  filter visible and auditable in every query, which matters for grading.

## Architecture map
- `backend/config.py` — env var loading (pydantic-settings)
- `backend/db/client.py` — psycopg connection helper
- `backend/auth/deps.py` — `get_current_user` (verifies Supabase JWT),
  `verify_workspace_access` (blocks cross-user workspace access)
- `backend/models/schemas.py` — pydantic models (Workspace, CurrentUser, ...)
- `backend/ingestion/extractor.py` — pdf/txt/md -> raw text
- `backend/ingestion/chunker.py` — raw text -> list[Chunk]
- `backend/ingestion/embedder.py` — Gemini embedding wrapper
- `backend/ingestion/pipeline.py` — ties extract/chunk/embed/store together,
  idempotent via content_hash
- `backend/retrieval/vector_search.py` — `search_chunks(workspace_id, query,
  top_k)`: embeds the query, runs a cosine-similarity search with
  `where workspace_id = %s` inside the SQL itself, joins `documents` for
  filename. Used by chat/ once that's built.
- `backend/chat/prompt.py` — `build_messages(query, chunks)`: builds the
  system + user messages for the LLM. Injection hardening (commit 12, after
  adversarial testing): injection-defense is rule #1 in the system prompt,
  naming concrete attack patterns (not just one example); each chunk is
  wrapped in `<source>...</source>` fences (`build_context_block`) rather
  than a bare prefix, giving the model a structural boundary; a literal
  `<source>`/`</source>` string inside a chunk's own content is escaped
  first (`_defang_source_tags`) so a chunk can't break out of its own
  fence; a `SOURCES_REMINDER` repeats the rule immediately before the
  QUESTION line (sandwich defense). Requires inline [n] citations, forbids
  outside knowledge.
- `backend/chat/citations.py` — `build_citations(answer_text, chunks)`:
  parses [n] markers out of the model's answer and resolves them back to
  filename/snippet/similarity for the frontend. Out-of-range markers are
  dropped, not raised.
- `backend/chat/llm.py` — thin Groq chat-completion wrapper (`complete`).
  Returns the raw assistant message object (not just text) so callers can
  inspect `.tool_calls`; accepts an optional `tools` list to offer function
  definitions to the model.
- `backend/chat/answer.py` — `generate_answer(workspace_id, query)`: full
  turn orchestration. Checks retrieval relevance (cosine similarity floor,
  `MIN_RELEVANT_SIMILARITY = 0.5`) to gate the *text* answer -- no rows or a
  weak top match forces the canned "I don't know" regardless of what the
  model said. Tool calls are offered to the model every turn (relevance
  gate doesn't apply to them, since "save this as a task" isn't a document
  question): if the model proposes any, `tools/executor.execute_tool_call`
  runs each one, results are fed back, and one follow-up completion (no
  `tools` this round) produces the final summary text. Supports one round
  of tool calls, not recursive multi-round proposals. Persists both user +
  assistant messages to `chat_messages`.
- `backend/routes/chat.py` — `POST /workspaces/{workspace_id}/chat` (send a
  message, get answer+citations), `GET` same path (history). Both behind
  `verify_workspace_access`. Wired into `main.py`.
- `backend/tools/schemas.py` — pydantic args schemas per tool
  (`SaveTaskArgs`, `SendSlackSummaryArgs`) -- the validation boundary
  before any tool executes.
- `backend/tools/executor.py` — `execute_tool_call(workspace_id, tool_name,
  raw_arguments)`: the single choke point tool execution passes through --
  validate (via registry) -> dispatch (`_DISPATCH` table) -> run -> always
  log to `tool_calls`, success or error, never raises. Add a new tool by
  adding a schema, a registry entry, a `run_*` function, and one line in
  `_DISPATCH`.
- `backend/tools/save_task.py` — `run_save_task(workspace_id, args)`: the
  real side-effect tool required by the brief. Inserts into `tasks`.
- `backend/tools/send_slack_summary.py` — `run_send_slack_summary(workspace_id,
  args)`: posts `args.summary` to Slack via `SLACK_WEBHOOK_URL` (single
  shared webhook read from config.py, not per-workspace). Raises if the
  webhook isn't configured or the POST fails; executor.py's try/except
  around the handler turns that into a logged `status="error"` row instead
  of a crash. Wired into `_DISPATCH` in tools/executor.py.
- `backend/routes/tool_logs.py` — `GET /workspaces/{workspace_id}/tasks`,
  `GET /workspaces/{workspace_id}/tool-calls` (the dashboard's tool-call
  log). Both behind `verify_workspace_access`. Wired into `main.py`.
- `backend/routes/workspaces.py` — list/create/get workspace (built)
- `backend/routes/documents.py` — upload/list documents (built)
- `frontend/` — TanStack Start (React 19) + shadcn/ui skeleton; pages were
  scaffolded visually first (Lovable) with mock data/timeouts, now being
  wired to the real backend/Supabase one page at a time.
- `frontend/src/lib/supabase.ts` — `supabase`: supabase-js client built
  from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Must point at the
  same Supabase project the backend verifies tokens against
  (`auth/deps.py`), or every API call 401s.
- `frontend/src/routes/login.tsx` — real `supabase.auth.signInWithPassword`
  call (replacing the earlier mock `setTimeout` + redirect). Shows
  Supabase's own error message inline on failure, and redirects straight to
  `/chat` on mount if a session already exists. Other routes
  (chat/documents/tasks/tool-logs) are still on mock data pending their own
  commits.
- `frontend/src/lib/workspace-context.tsx` — `WorkspaceProvider` /
  `useWorkspace()`: holds the single active-workspace id for the whole app,
  seeded from `mockWorkspaces` and persisted to `localStorage` so a reload
  keeps the same workspace selected. This is the frontend-only stand-in for
  the isolation guarantee the backend enforces in SQL: every page reads
  `activeWorkspace` from context rather than hardcoding `"ws-1"`, so no
  workspace's data (chat, documents, tasks, tool logs) is ever rendered
  while another workspace is active. Wired in at `AppShell`, one level
  above the sidebar and all page content.
- `frontend/src/components/app-sidebar.tsx` — workspace dropdown now reads
  `workspaces`/`activeWorkspace` from `useWorkspace()` and calls
  `setActiveWorkspaceId` on select (previously rendered the list but did
  nothing on click); a check icon marks the current workspace.
- `frontend/src/routes/{chat,documents,tasks,tool-logs}.tsx` — all four
  filter their mock data by `activeWorkspace.id` instead of the hardcoded
  `"ws-1"`, and show `activeWorkspace.name` in the header badge instead of
  a hardcoded "Product Team". `chat.tsx` and `documents.tsx` also reset
  their local component state (messages/input/typing, documents/uploading)
  in a `useEffect` keyed on `activeWorkspace.id`, so switching workspaces
  can't leak in-progress local state (e.g. a message being typed, or a
  document mid-"upload") from the workspace you just left.
- `scripts/test_isolation.py` — NOT YET BUILT. Manual pre-submission
  isolation/injection check: puts a fact in workspace A, queries from
  workspace B, asserts no leakage.

## Commit roadmap (target ~30 commits, conventional + scoped)
Done so far, in order:
1. `initial: project scaffold, schema, config`
2. `chore: rename project to siloed`
3. `feature(auth): supabase login + workspace model`
4. `feature(ingestion): extractor, chunker, embedder, idempotent pipeline + upload route`
5. `feature(retrieval): scoped vector search (workspace filter inside query)`
6. `feature(chat): RAG prompt construction + citation formatting`
7. `feature(chat): honest "I don't know" fallback + chat route`
8. `feature(tools): pydantic schemas + tool registry`
9. `feature(tools): save_task tool + execution + logging`
10. `feature(tools): send_slack_summary tool`
11. `feature(chat): wire tool-calling loop into chat (model proposes, app executes)`
12. `fix(injection): harden system prompt against embedded instructions in chunks`
13. `feature(frontend): supabase-js login page`
14. `feature(frontend): workspace switcher`

Remaining, in planned order:
15. `feature(frontend): document upload UI`
16. `feature(frontend): chat window + citation display`
17. `feature(frontend): tool-call log view`
18. `feature(frontend): dashboard layout tying it together`
19. `test: scripts/test_isolation.py (A/B leak test + injection test)`
20. `fix: ...` (whatever isolation/injection testing turns up)
21. `docs: README run instructions, .env.example completeness check`
22. `docs: AI_NOTES.md`
23. `chore: deploy backend to Render`
24. `chore: deploy frontend to Vercel`
25. `chore: seed two demo workspaces + sample docs for reviewer testing`
26. `docs: README test-account + reviewer instructions`
27+ — buffer for real `fix`/`refactor` commits as bugs surface during testing

## Testing before submission
Always run `scripts/test_isolation.py` before considering a milestone done:
puts a fact in workspace A, queries from workspace B, asserts no leakage.
Also manually test: unrelated question -> "I don't know"; malformed tool
args -> graceful rejection; injection doc -> instructions ignored;
re-upload same doc -> no duplicate chunks.

## Deliverables checklist (from assessment brief)
- [ ] Deployed public URL, reachable
- [ ] GitHub repo, clean commit history
- [ ] README.md — what it does, local run steps, env vars, deploy notes
- [ ] .env.example — no real secrets
- [ ] Throwaway test login + 2 preloaded workspaces w/ sample docs
- [ ] CLAUDE.md (this file) included as-is
- [ ] AI_NOTES.md (~1 page): tools/models used, 2-3 key decisions + why,
      hardest bug AI caused, what to improve with more time
