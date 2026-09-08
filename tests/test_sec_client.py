"""Unit tests for SEC EDGAR client and caching behavior."""

from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from backend.services.sec_client import (
    SECClient,
    download_filing_html,
    fetch_recent_filings,
)


@pytest.fixture
def sample_tickers_json():
    return {
        "0": {"cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc."},
        "1": {"cik_str": 789019, "ticker": "MSFT", "title": "Microsoft Corp"},
    }


@pytest.fixture
def sample_submissions_json():
    return {
        "cik": "0000320193",
        "entityType": "operating",
        "name": "Apple Inc.",
        "tickers": ["AAPL"],
        "filings": {
            "recent": {
                "accessionNumber": [
                    "0000320193-24-000106",
                    "0000320193-24-000050",
                    "0000320193-24-000010",
                    "0000320193-24-000001",
                ],
                "filingDate": [
                    "2024-11-01",
                    "2024-08-02",
                    "2024-05-03",
                    "2024-01-15",
                ],
                "form": [
                    "10-K",
                    "10-Q",
                    "8-K",
                    "4",  # Should be filtered out
                ],
                "primaryDocument": [
                    "aapl-20240928.htm",
                    "aapl-20240629.htm",
                    "aapl-20240502.htm",
                    "doc4.xml",
                ],
            }
        },
    }


class TestSECClientFairAccess:
    def test_valid_user_agent(self, tmp_path: Path):
        client = SECClient(
            user_agent="EdgarDiff admin@edgardiff.local", cache_dir=tmp_path
        )
        assert client.user_agent == "EdgarDiff admin@edgardiff.local"

    def test_invalid_user_agent_missing_email(self, tmp_path: Path):
        with pytest.raises(ValueError, match="SEC fair access rules require"):
            SECClient(user_agent="EdgarDiffNoEmail", cache_dir=tmp_path)

    def test_invalid_user_agent_missing_name(self, tmp_path: Path):
        with pytest.raises(ValueError, match="SEC fair access rules require"):
            SECClient(user_agent="user@example.com", cache_dir=tmp_path)


class TestSECClientFilingsAndCache:
    def test_fetch_recent_filings(
        self, tmp_path: Path, sample_tickers_json, sample_submissions_json
    ):
        mock_http_client = MagicMock()

        # Mock ticker lookup and submissions responses
        tickers_resp = MagicMock()
        tickers_resp.status_code = 200
        tickers_resp.json.return_value = sample_tickers_json

        submissions_resp = MagicMock()
        submissions_resp.status_code = 200
        submissions_resp.json.return_value = sample_submissions_json

        def mock_get(url, *args, **kwargs):
            if "company_tickers.json" in str(url):
                return tickers_resp
            if "CIK0000320193.json" in str(url):
                return submissions_resp
            raise ValueError(f"Unexpected URL: {url}")

        mock_http_client.get.side_effect = mock_get

        client = SECClient(
            user_agent="TestRunner tester@example.com",
            cache_dir=tmp_path,
            client=mock_http_client,
        )

        filings = client.fetch_recent_filings("AAPL", form_types=["10-K", "10-Q", "8-K"])

        # Form 4 should be filtered out, leaving 3 filings (10-K, 10-Q, 8-K)
        assert len(filings) == 3

        form_types_found = [f["form_type"] for f in filings]
        assert form_types_found == ["10-K", "10-Q", "8-K"]

        k10 = filings[0]
        assert k10["accession_number"] == "0000320193-24-000106"
        assert k10["filing_date"] == "2024-11-01"
        assert k10["ticker"] == "AAPL"
        assert k10["primary_doc_name"] == "aapl-20240928.htm"
        assert (
            k10["document_url"]
            == "https://www.sec.gov/Archives/edgar/data/320193/000032019324000106/aapl-20240928.htm"
        )

    def test_download_filing_html_and_caching(
        self, tmp_path: Path, sample_tickers_json, sample_submissions_json
    ):
        mock_http_client = MagicMock()

        tickers_resp = MagicMock()
        tickers_resp.json.return_value = sample_tickers_json
        tickers_resp.status_code = 200

        submissions_resp = MagicMock()
        submissions_resp.json.return_value = sample_submissions_json
        submissions_resp.status_code = 200

        mock_html_content = (
            "<!DOCTYPE html><html><body><h1>Apple Inc. 10-K Filing</h1></body></html>"
        )
        doc_resp = MagicMock()
        doc_resp.text = mock_html_content
        doc_resp.status_code = 200

        def mock_get(url, *args, **kwargs):
            url_str = str(url)
            if "company_tickers.json" in url_str:
                return tickers_resp
            if "CIK0000320193.json" in url_str:
                return submissions_resp
            if "aapl-20240928.htm" in url_str:
                return doc_resp
            raise ValueError(f"Unexpected URL requested: {url_str}")

        mock_http_client.get.side_effect = mock_get

        client = SECClient(
            user_agent="TestRunner tester@example.com",
            cache_dir=tmp_path,
            client=mock_http_client,
        )

        acc_num = "0000320193-24-000106"
        cache_file = tmp_path / f"AAPL_{acc_num}.html"
        assert not cache_file.exists(), "Cache file must not exist initially"

        # First call: should download and save to cache
        html_first = client.download_filing_html(
            accession_number=acc_num, ticker="AAPL"
        )

        assert html_first == mock_html_content
        assert cache_file.exists(), "File should be created in cache"
        assert cache_file.read_text(encoding="utf-8") == mock_html_content

        # Count how many times the document URL was requested
        doc_request_count = sum(
            1
            for call in mock_http_client.get.call_args_list
            if "aapl-20240928.htm" in str(call)
        )
        assert doc_request_count == 1

        # Second call: must read directly from cache without re-downloading
        html_second = client.download_filing_html(
            accession_number=acc_num, ticker="AAPL"
        )

        assert html_second == mock_html_content

        # Total document requests should still be 1 (verifying cache hit)
        doc_request_count_after = sum(
            1
            for call in mock_http_client.get.call_args_list
            if "aapl-20240928.htm" in str(call)
        )
        assert doc_request_count_after == 1, "Cached file should prevent network call"


class TestModuleLevelFunctions:
    @patch("backend.services.sec_client.get_sec_client")
    def test_module_helpers_delegate(self, mock_get_client):
        mock_instance = MagicMock()
        mock_get_client.return_value = mock_instance

        fetch_recent_filings("AAPL", ["10-K"])
        mock_instance.fetch_recent_filings.assert_called_once_with("AAPL", ["10-K"])

        download_filing_html("0000320193-24-000106", "AAPL")
        mock_instance.download_filing_html.assert_called_once_with(
            "0000320193-24-000106", "AAPL"
        )
