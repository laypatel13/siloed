"""
Compatibility shim: keeps `uvicorn main:app --reload` working unchanged
after the app moved into the `app/` package. The real application lives
in app/main.py -- this file just re-exports it.
"""

from app.main import app

__all__ = ["app"]
