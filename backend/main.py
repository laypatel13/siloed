from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings

from routes import chat, documents, tool_logs, workspaces

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
app.include_router(tool_logs.router)
