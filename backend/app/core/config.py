from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    database_url: str

    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"

    gemini_api_key: str
    gemini_embedding_model: str = "gemini-embedding-001"

    slack_webhook_url: str = ""

    environment: str = "development"
    # Comma-separated list, e.g. "https://siloed.vercel.app,http://localhost:5173"
    frontend_url: str = "http://localhost:5173"

    @property
    def frontend_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_url.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
