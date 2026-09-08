"""Main FastAPI entrypoint for EdgarDiff backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="EdgarDiff API",
    description="Backend API for SEC EDGAR filing diffing and analysis",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Welcome to EdgarDiff API", "status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
