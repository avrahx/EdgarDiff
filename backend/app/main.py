"""Main FastAPI entrypoint for EdgarDiff backend (re-exports backend.main.app)."""

from backend.main import app

__all__ = ["app"]
