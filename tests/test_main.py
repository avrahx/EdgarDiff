"""Unit tests for FastAPI endpoints."""

from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_endpoints():
    # Legacy health
    resp1 = client.get("/health")
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "healthy"

    # API health
    resp2 = client.get("/api/health")
    assert resp2.status_code == 200
    data = resp2.json()
    assert data["status"] == "healthy"
    assert data["service"] == "EdgarDiff API"
    assert "version" in data


def test_demo_sample_deal_endpoint():
    response = client.get("/api/demo/sample-deal")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert data["cached"] is True
    assert "Microsoft" in data["deal_name"]
    assert "Activision" in data["deal_name"]

    # Check valuation
    assert data["valuation"]["enterprise_value"] == 68_700_000_000.0
    assert data["valuation"]["per_share_offer_price_usd"] == 95.00

    # Check covenants
    covenants = data["covenants"]
    assert covenants["termination_fee_target_usd"] == 2_270_000_000.0
    assert covenants["termination_fee_percent"] == 3.3
    assert covenants["reverse_termination_fee_usd"] == 3_000_000_000.0
    assert covenants["go_shop_period_days"] is None
    assert covenants["matching_rights_window_days"] == 5
    assert len(covenants["exact_source_quote"]) > 0


@patch("backend.main.get_sec_client")
def test_get_filings_endpoint(mock_get_sec_client):
    mock_sec = MagicMock()
    mock_get_sec_client.return_value = mock_sec

    mock_filings = [
        {
            "accession_number": "0000320193-23-000106",
            "filing_date": "2023-11-03",
            "form_type": "10-K",
            "document_url": "https://sec.gov/doc1",
        },
        {
            "accession_number": "0000320193-24-000006",
            "filing_date": "2024-02-02",
            "form_type": "8-K",
            "document_url": "https://sec.gov/doc2",
        },
    ]
    mock_sec.fetch_recent_filings.return_value = mock_filings

    response = client.get("/api/filings/AAPL?forms=10-K,8-K")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert data["count"] == 2
    assert len(data["filings"]) == 2
    mock_sec.fetch_recent_filings.assert_called_once_with(ticker="AAPL", form_types=["10-K", "8-K"])


def test_post_covenants_with_text():
    sample_text = """
    SECTION 7.03 TERMINATION FEES
    The Company will pay a termination fee of $65,000,000 to Parent under specified circumstances.
    """
    response = client.post("/api/covenants", json={"filing_text": sample_text})
    assert response.status_code == 200
    data = response.json()
    assert data["termination_fee_target_usd"] == 65_000_000.0
    assert data["reverse_termination_fee_usd"] is None
    assert data["go_shop_period_days"] is None
    assert len(data["exact_source_quote"]) > 0


@patch("backend.main.get_sec_client")
def test_post_covenants_with_accession(mock_get_sec_client):
    mock_sec = MagicMock()
    mock_get_sec_client.return_value = mock_sec
    mock_sec.download_filing_html.return_value = """
    SECTION 7.03 TERMINATION FEES
    Parent will pay a reverse termination fee of $150,000,000 if antitrust clearance is denied.
    """

    response = client.post(
        "/api/covenants",
        json={"ticker": "XYZ", "accession_number": "0001193125-22-000001"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["reverse_termination_fee_usd"] == 150_000_000.0
    mock_sec.download_filing_html.assert_called_once_with("0001193125-22-000001", "XYZ")


@patch("backend.main.get_sec_client")
def test_post_diff_endpoint(mock_get_sec_client):
    mock_sec = MagicMock()
    mock_get_sec_client.return_value = mock_sec

    # Mock filing list
    mock_sec.fetch_recent_filings.return_value = [
        {"accession_number": "0001-2023", "filing_date": "2023-11-01"},
        {"accession_number": "0001-2022", "filing_date": "2022-10-28"},
    ]

    html_2022 = """
    <html><body>
    <div>
        <p><b>ITEM 1A. RISK FACTORS</b></p>
        <p>We rely on single-source microchip fabricators.</p>
        <p><b>ITEM 1B. UNRESOLVED STAFF COMMENTS</b></p>
    </div>
    </body></html>
    """
    html_2023 = """
    <html><body>
    <div>
        <p><b>ITEM 1A. RISK FACTORS</b></p>
        <p>We rely on dual-source microchip fabricators across North America and Asia.</p>
        <p><b>ITEM 1B. UNRESOLVED STAFF COMMENTS</b></p>
    </div>
    </body></html>
    """

    def mock_download(acc, ticker):
        if "2022" in acc:
            return html_2022
        return html_2023

    mock_sec.download_filing_html.side_effect = mock_download

    req_payload = {
        "ticker": "AAPL",
        "form_type": "10-K",
        "year_1": 2022,
        "year_2": 2023,
        "section": "item_1a",
    }
    response = client.post("/api/diff", json=req_payload)
    assert response.status_code == 200
    data = response.json()

    assert data["ticker"] == "AAPL"
    assert data["section"] == "item_1a"
    assert data["year_1"] == 2022
    assert data["year_2"] == 2023
    assert "diff_blocks" in data
    assert "variance_summary" in data
    assert len(data["diff_blocks"]) >= 1


def test_cors_headers_present():
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") in (
        "http://localhost:3000",
        "*",
    )
