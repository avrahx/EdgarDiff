"""Main FastAPI application for EdgarDiff backend API.

Exposes endpoints for health monitoring, SEC filing discovery, YoY section diffing,
structured M&A covenant extraction, and instant pre-cached demonstration data.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.models.deal_covenants import (
    DealCovenants,
    DealParties,
    DealValuation,
    FullDealAnalysis,
)
from backend.services.covenant_extractor import (
    extract_covenants_from_filing,
    extract_full_deal_from_filing,
)
from backend.services.diff_engine import (
    compute_text_diff,
    summarize_variance,
)
from backend.services.parser import extract_10k_sections
from backend.services.sec_client import (
    download_filing_html,
    fetch_recent_filings,
    get_sec_client,
)

app = FastAPI(
    title="EdgarDiff API",
    description="Intelligent diffing, section segmentation, and M&A covenant extraction for SEC EDGAR filings",
    version="0.1.0",
)

# 2. Enable CORS middleware for frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request Models
class DiffRequest(BaseModel):
    ticker: str = Field(..., examples=["AAPL"], description="Stock ticker symbol")
    form_type: str = Field(default="10-K", examples=["10-K"], description="SEC filing form type")
    year_1: int = Field(..., examples=[2022], description="Base reporting year (Year N-1)")
    year_2: int = Field(..., examples=[2023], description="Target reporting year (Year N)")
    section: str = Field(
        default="item_1a",
        examples=["item_1a"],
        description="Target section: 'item_1a' (Risk Factors), 'item_7' (MD&A), or 'item_8' (Financials)",
    )


class CovenantsRequest(BaseModel):
    ticker: Optional[str] = Field(default=None, examples=["ATVI"], description="Target company ticker")
    accession_number: Optional[str] = Field(
        default=None, examples=["0001193125-22-011478"], description="SEC filing accession number"
    )
    filing_text: Optional[str] = Field(
        default=None, description="Raw or excerpted merger agreement text"
    )


# 1. Health Endpoints
@app.get("/")
def root():
    return {"message": "Welcome to EdgarDiff API", "status": "ok"}


@app.get("/health")
def legacy_health():
    return {"status": "healthy"}


@app.get("/api/health")
def api_health():
    return {
        "status": "healthy",
        "service": "EdgarDiff API",
        "version": "0.1.0",
        "fair_access_agent": os.getenv("SEC_EDGAR_USER_AGENT", "EdgarDiff admin@edgardiff.local"),
    }


# 2. SEC Filings Discovery
@app.get("/api/filings/{ticker}")
def get_available_filings(
    ticker: str,
    forms: Optional[str] = Query(
        default="10-K,8-K,10-Q",
        description="Comma-separated list of form types to filter (e.g. '10-K,8-K')",
    ),
):
    """Retrieve available 10-K, 8-K, and 10-Q filings for a given company ticker."""
    requested_forms = [f.strip().upper() for f in forms.split(",") if f.strip()]
    try:
        sec = get_sec_client()
        filings = sec.fetch_recent_filings(ticker=ticker, form_types=requested_forms)
        return {
            "ticker": ticker.upper(),
            "count": len(filings),
            "filings": filings,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch filings for '{ticker}': {str(exc)}",
        )


# 3. YoY Section Variance Diffing
@app.post("/api/diff")
def diff_filing_sections(req: DiffRequest):
    """Calculate YoY paragraph-level variance, classification, shift score, and senior analyst summary."""
    clean_ticker = req.ticker.strip().upper()
    sec_key = req.section.strip().lower()

    if sec_key not in ("item_1a", "item_7", "item_8"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid section '{req.section}'. Must be 'item_1a', 'item_7', or 'item_8'.",
        )

    try:
        sec = get_sec_client()
        filings = sec.fetch_recent_filings(clean_ticker, form_types=[req.form_type])

        # Match filings corresponding to year_1 and year_2
        filing_1 = next(
            (f for f in filings if str(req.year_1) in f.get("filing_date", "")),
            None,
        )
        filing_2 = next(
            (f for f in filings if str(req.year_2) in f.get("filing_date", "")),
            None,
        )

        # If direct matching by year failed, take the two latest filings for demo
        if not filing_1 and len(filings) >= 2:
            filing_1 = filings[1]
        if not filing_2 and len(filings) >= 1:
            filing_2 = filings[0]

        if not filing_1 or not filing_2:
            raise HTTPException(
                status_code=404,
                detail=f"Could not locate consecutive {req.form_type} filings for {clean_ticker} matching {req.year_1} and {req.year_2}.",
            )

        html_1 = sec.download_filing_html(filing_1["accession_number"], clean_ticker)
        html_2 = sec.download_filing_html(filing_2["accession_number"], clean_ticker)

        sections_1 = extract_10k_sections(html_1)
        sections_2 = extract_10k_sections(html_2)

        text_1 = sections_1.get(sec_key, "")
        text_2 = sections_2.get(sec_key, "")

        diff_blocks = compute_text_diff(text_1, text_2)
        summary = summarize_variance(diff_blocks)

        materiality_score = diff_blocks[0].get("materiality_score", 0.0) if diff_blocks else 0.0

        return {
            "ticker": clean_ticker,
            "form_type": req.form_type,
            "section": sec_key,
            "year_1": req.year_1,
            "year_2": req.year_2,
            "filing_1": filing_1,
            "filing_2": filing_2,
            "materiality_score": materiality_score,
            "variance_summary": summary,
            "diff_blocks": diff_blocks,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Diff computation error: {str(exc)}")


# 4. M&A Deal Covenant Extraction
@app.post("/api/covenants", response_model=DealCovenants)
def extract_deal_covenants(req: CovenantsRequest):
    """Extract structured M&A covenants into DealCovenants schema."""
    # Case A: Direct filing text provided
    if req.filing_text and req.filing_text.strip():
        return extract_covenants_from_filing(req.filing_text)

    # Case B: Accession number and ticker provided
    if req.accession_number and req.ticker:
        try:
            sec = get_sec_client()
            html_content = sec.download_filing_html(req.accession_number, req.ticker)
            return extract_covenants_from_filing(html_content)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed downloading filing '{req.accession_number}': {str(exc)}",
            )

    # Case C: Ticker provided - search for recent 8-K merger disclosure
    if req.ticker:
        try:
            sec = get_sec_client()
            filings = sec.fetch_recent_filings(req.ticker, form_types=["8-K"])
            if not filings:
                raise HTTPException(
                    status_code=404,
                    detail=f"No Form 8-K filings found for ticker '{req.ticker}'.",
                )
            latest_8k = filings[0]
            html_content = sec.download_filing_html(latest_8k["accession_number"], req.ticker)
            return extract_covenants_from_filing(html_content)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    raise HTTPException(
        status_code=400,
        detail="Must provide either 'filing_text', or 'ticker' and 'accession_number'.",
    )


# 5. Pre-Cached Demonstration Landmark Deal (MSFT / ATVI $68.7B All-Cash Acquisition)
SAMPLE_DEAL_DATA: Dict[str, Any] = {
    "deal_name": "Microsoft Corporation / Activision Blizzard, Inc.",
    "transaction_type": "Public Company All-Cash Merger",
    "announcement_date": "2022-01-18",
    "filing_reference": {
        "form": "8-K",
        "ticker": "ATVI",
        "accession_number": "0001193125-22-011478",
        "filing_date": "2022-01-19",
        "document_url": "https://www.sec.gov/Archives/edgar/data/718877/000119312522011478/d283286d8k.htm",
    },
    "parties": {
        "acquirer": "Microsoft Corporation",
        "target": "Activision Blizzard, Inc.",
        "deal_type": "cash",
    },
    "valuation": {
        "enterprise_value": 68700000000.0,
        "equity_value": 68700000000.0,
        "implied_ebitda_multiple": 18.2,
        "per_share_offer_price_usd": 95.00,
        "premium_to_unaffected_share_price_percent": 45.3,
    },
    "covenants": {
        "termination_fee_target_usd": 2270000000.0,
        "termination_fee_percent": 3.3,
        "reverse_termination_fee_usd": 3000000000.0,
        "go_shop_period_days": None,
        "matching_rights_window_days": 5,
        "exact_source_quote": (
            "Under Section 8.3 of the Merger Agreement, Activision Blizzard may be required to pay "
            "Microsoft a termination fee of $2,270,000,000 (approximately 3.3% of transaction equity value) "
            "if the Merger Agreement is terminated under specified circumstances... "
            "Microsoft will be required to pay Activision Blizzard a reverse termination fee of $3,000,000,000 "
            "(increasing to $3,500,000,000 if extended past January 18, 2023, and $4,000,000,000 if extended past April 18, 2023) "
            "if the Merger is terminated due to failure to obtain antitrust regulatory approvals."
        ),
    },
    "strategic_analysis": {
        "deal_thesis": (
            "Acquisition accelerates Microsoft's cross-platform gaming ecosystem (Xbox Game Pass), "
            "providing iconic intellectual property (Call of Duty, World of Warcraft, Candy Crush) "
            "while establishing key footholds in mobile gaming and future cloud infrastructure."
        ),
        "antitrust_posture": (
            "Substantial regulatory scrutiny triggered across FTC (US), CMA (UK), and European Commission. "
            "The escalating $3.0B -> $3.5B -> $4.0B reverse breakup fee reflected heavy regulatory risk allocation "
            "absorbed by Microsoft to secure target shareholder commitment."
        ),
        "covenant_risk_grade": "High Protections / Asymmetric Regulatory Break Risk",
    },
    "status": "success",
    "cached": True,
}


@app.get("/api/demo/sample-deal")
def get_sample_deal():
    """Return instant pre-cached results for landmark MSFT / ATVI ($68.7B) transaction."""
    import json
    from pathlib import Path
    
    # Check data/sample_deal.json or frontend/data/sampleDeal.json
    for path in [
        Path(__file__).resolve().parent.parent / "data" / "sample_deal.json",
        Path(__file__).resolve().parent / "data" / "sample_deal.json",
        Path(__file__).resolve().parent.parent / "frontend" / "data" / "sampleDeal.json",
    ]:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    return SAMPLE_DEAL_DATA
