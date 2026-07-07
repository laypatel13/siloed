from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

from app.api.routes import chat, documents, tasks, tool_calls, workspaces

app = FastAPI(title="siloed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.environment}


app.include_router(workspaces.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(tasks.router)
app.include_router(tool_calls.router)
