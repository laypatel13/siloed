# Multi-Workspace Document Assistant (RAG & Tool Calling)

A multi-tenant RAG assistant. Users sign in, manage multiple workspaces, upload
documents into a workspace, chat with an assistant grounded strictly in that
workspace's content, and trigger tool calls (save a task, send a Slack
summary) — all backed by a single shared pgvector table with per-row
workspace isolation.

## What it does
- Sign-in, multiple workspaces per user, workspace switcher
- Document upload → chunk → embed → store (tagged with workspace_id)
- Chat grounded only in the active workspace's chunks, with citations
- Honest "I don't know" when the workspace has no answer
- Tool calling: `save_task`, `send_slack_summary` — validated + logged
- Dashboard: documents, chat history, tool-call log

## Stack
- Backend: FastAPI (Python)
- DB: Supabase Postgres + pgvector (single `chunks` table, `workspace_id` column)
- Auth: Supabase Auth
- Embeddings: Gemini embedding model
- LLM + tool calling: Groq
- Frontend: React (Vite)
- Hosting: Render (backend) + Vercel (frontend)

## Run locally

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # fill in your keys
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Database
Run `backend/db/schema.sql` against your Supabase Postgres instance
(SQL Editor in the Supabase dashboard, or `psql`).

## Environment variables
See `.env.example`. Never commit real values.

## Deployment
- Backend deployed to Render, connected to this repo's `backend/` folder.
- Frontend deployed to Vercel, connected to this repo's `frontend/` folder.
- Supabase project hosts both the Postgres/pgvector store and Auth.

## Test account & sample data
(fill in once seeded) — throwaway login + 2 preloaded workspaces with sample docs.
