# EdgarDiff

EdgarDiff is an intelligent diffing and analysis engine for SEC EDGAR corporate filings (10-K, 10-Q, 8-K). It ingests official SEC filings under fair-access rules, decomposes and structures filing HTML, and provides semantic diffing across reporting periods.

## Project Layout

```
EdgarDiff/
├── backend/
│   ├── app/                 # FastAPI application routes and entrypoints
│   ├── services/            # Core business logic (SEC ingestion, caching, parsing)
│   │   └── sec_client.py    # SEC EDGAR client with fair-access compliance
│   ├── requirements.in      # Direct dependency specifications
│   ├── requirements.txt     # Locked dependencies compiled via pip-tools
│   └── pyproject.toml       # Backend package metadata & tool configurations
├── frontend/                # Frontend application (Next.js / Vite)
├── data/
│   └── cache/               # Local cache for downloaded SEC documents
├── tests/                   # Pytest test suite
├── .env.example             # Environment variable template
└── README.md
```

## Quick Start

### 1. Environment Setup

Configure your Python 3.11+ virtual environment:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install pip-tools
pip-sync requirements.txt
```

### 2. SEC EDGAR Fair Access Configuration

Copy `.env.example` to `.env` and set your identity User-Agent conforming to SEC requirements (`Sample Company Name AdminContact@domain.com`):

```bash
SEC_EDGAR_USER_AGENT="EdgarDiff admin@edgardiff.local"
SEC_CACHE_DIR="data/cache"
```

### 3. Run Tests

```powershell
.\backend\.venv\Scripts\pytest -v tests/
```

### 4. Run Backend API

```powershell
.\backend\.venv\Scripts\python -m uvicorn backend.app.main:app --reload
```