"""SEC EDGAR client conforming to SEC fair-access rules with local caching."""

from __future__ import annotations

import os
import re
import time
from pathlib import Path
from typing import Any, List, Optional
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# SEC Fair Access User-Agent format: "Sample Company Name AdminContact@<sample company domain>.com"
USER_AGENT_PATTERN = re.compile(r"^.+?\s+[\w\.-]+@[\w\.-]+\.\w+$")
SEC_RATE_LIMIT_DELAY = 0.1  # Max 10 requests per second -> minimum 100ms delay between calls
SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data/{cik_num}/{accession_no_hyphen}/{primary_doc}"


def get_default_cache_dir() -> Path:
    """Resolve data/cache relative to the project root or environment variable."""
    env_cache = os.getenv("SEC_CACHE_DIR")
    if env_cache:
        path = Path(env_cache)
        if not path.is_absolute():
            # Resolve relative to project root (two levels up from backend/services)
            project_root = Path(__file__).resolve().parent.parent.parent
            path = project_root / env_cache
    else:
        project_root = Path(__file__).resolve().parent.parent.parent
        path = project_root / "data" / "cache"

    path.mkdir(parents=True, exist_ok=True)
    return path


class SECClient:
    """Client for SEC EDGAR submissions and filings conforming to fair access policy."""

    def __init__(
        self,
        user_agent: Optional[str] = None,
        cache_dir: Optional[Path | str] = None,
        client: Optional[httpx.Client] = None,
    ) -> None:
        self.user_agent = user_agent or os.getenv("SEC_EDGAR_USER_AGENT", "EdgarDiff admin@edgardiff.local")
        self._validate_user_agent(self.user_agent)

        self.cache_dir = Path(cache_dir) if cache_dir else get_default_cache_dir()
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self._client = client or httpx.Client(
            headers={"User-Agent": self.user_agent, "Accept-Encoding": "gzip, deflate"},
            timeout=30.0,
            follow_redirects=True,
        )
        self._last_request_time = 0.0
        self._ticker_cik_cache: dict[str, str] = {}

        # Configure edgartools identity if installed
        try:
            import edgar  # type: ignore

            edgar.set_identity(self.user_agent)
        except Exception:
            pass

    @staticmethod
    def _validate_user_agent(ua: str) -> None:
        """Validate User-Agent follows 'Name email@domain.com' convention."""
        if not ua or "@" not in ua or len(ua.strip().split()) < 2:
            raise ValueError(
                f"Invalid SEC User-Agent '{ua}'. SEC fair access rules require: "
                "'User-Agent: Sample Company Name AdminContact@samplecompanydomain.com'"
            )

    def _respect_rate_limit(self) -> None:
        """Ensure requests respect the SEC 10 requests/second limit."""
        elapsed = time.time() - self._last_request_time
        if elapsed < SEC_RATE_LIMIT_DELAY:
            time.sleep(SEC_RATE_LIMIT_DELAY - elapsed)
        self._last_request_time = time.time()

    def get_cik_for_ticker(self, ticker: str) -> str:
        """Resolve ticker symbol to a 10-digit zero-padded CIK string."""
        ticker_upper = ticker.strip().upper()
        if ticker_upper in self._ticker_cik_cache:
            return self._ticker_cik_cache[ticker_upper]

        # Check if ticker is already an integer CIK
        if ticker_upper.isdigit():
            padded = ticker_upper.zfill(10)
            self._ticker_cik_cache[ticker_upper] = padded
            return padded

        self._respect_rate_limit()
        resp = self._client.get(SEC_TICKERS_URL)
        resp.raise_for_status()
        tickers_data = resp.json()

        for entry in tickers_data.values():
            if entry.get("ticker", "").upper() == ticker_upper:
                cik_str = str(entry["cik_str"]).zfill(10)
                self._ticker_cik_cache[ticker_upper] = cik_str
                return cik_str

        raise ValueError(f"Ticker '{ticker}' not found in SEC company directory.")

    def fetch_recent_filings(
        self,
        ticker: str,
        form_types: Optional[List[str]] = None,
    ) -> List[dict[str, Any]]:
        """Fetch recent filings for a company, filtering for specified form types (e.g. 10-K, 10-Q, 8-K).

        Returns a list of dicts containing:
        - accession_number: str
        - filing_date: str
        - form_type: str
        - document_url: str
        - primary_doc_name: str
        - ticker: str
        - cik: str
        """
        if form_types is None:
            form_types = ["10-K", "10-Q", "8-K"]

        allowed_forms = {f.upper() for f in form_types}
        cik = self.get_cik_for_ticker(ticker)
        cik_num = str(int(cik))  # Unpadded integer format for archive URLs

        self._respect_rate_limit()
        submissions_url = SEC_SUBMISSIONS_URL.format(cik=cik)
        resp = self._client.get(submissions_url)
        resp.raise_for_status()
        submissions = resp.json()

        recent = submissions.get("filings", {}).get("recent", {})
        accession_numbers = recent.get("accessionNumber", [])
        filing_dates = recent.get("filingDate", [])
        forms = recent.get("form", [])
        primary_docs = recent.get("primaryDocument", [])

        results: List[dict[str, Any]] = []
        for i in range(len(accession_numbers)):
            form = forms[i] if i < len(forms) else ""
            if form.upper() in allowed_forms:
                acc_num = accession_numbers[i]
                acc_no_hyphen = acc_num.replace("-", "")
                primary_doc = primary_docs[i] if i < len(primary_docs) else ""
                doc_url = SEC_ARCHIVE_URL.format(
                    cik_num=cik_num,
                    accession_no_hyphen=acc_no_hyphen,
                    primary_doc=primary_doc,
                )
                results.append(
                    {
                        "accession_number": acc_num,
                        "filing_date": filing_dates[i] if i < len(filing_dates) else "",
                        "form_type": form,
                        "document_url": doc_url,
                        "primary_doc_name": primary_doc,
                        "ticker": ticker.upper(),
                        "cik": cik,
                    }
                )

        return results

    def download_filing_html(
        self,
        accession_number: str,
        ticker: str,
        cache_dir: Optional[Path | str] = None,
    ) -> str:
        """Download and cache the primary document locally in data/cache.

        Returns the HTML content as a string. If already cached, loads from disk.
        """
        target_dir = Path(cache_dir) if cache_dir else self.cache_dir
        target_dir.mkdir(parents=True, exist_ok=True)

        clean_acc = accession_number.strip()
        clean_ticker = ticker.strip().upper()
        cache_filename = f"{clean_ticker}_{clean_acc}.html"
        cache_file_path = target_dir / cache_filename

        # Return cached content if available
        if cache_file_path.exists() and cache_file_path.stat().st_size > 0:
            return cache_file_path.read_text(encoding="utf-8", errors="replace")

        # Find document URL by checking recent filings
        filings = self.fetch_recent_filings(
            clean_ticker,
            form_types=["10-K", "10-Q", "8-K", "10-K/A", "10-Q/A", "8-K/A"],
        )
        target_filing = next(
            (f for f in filings if f["accession_number"] == clean_acc), None
        )

        if target_filing and target_filing.get("document_url"):
            doc_url = target_filing["document_url"]
        else:
            # Fallback direct construction if not in recent list
            cik = self.get_cik_for_ticker(clean_ticker)
            cik_num = str(int(cik))
            acc_no_hyphen = clean_acc.replace("-", "")
            # Try fetching the index directory or accession html
            doc_url = f"https://www.sec.gov/Archives/edgar/data/{cik_num}/{acc_no_hyphen}/{clean_acc}.txt"

        self._respect_rate_limit()
        resp = self._client.get(doc_url)
        resp.raise_for_status()
        html_content = resp.text

        # Write to cache
        cache_file_path.write_text(html_content, encoding="utf-8")
        return html_content


# Module-level convenience singleton & functions
_default_client: Optional[SECClient] = None


def get_sec_client() -> SECClient:
    global _default_client
    if _default_client is None:
        _default_client = SECClient()
    return _default_client


def fetch_recent_filings(
    ticker: str, form_types: Optional[List[str]] = None
) -> List[dict[str, Any]]:
    """Fetch recent filings using default SECClient."""
    return get_sec_client().fetch_recent_filings(ticker, form_types)


def download_filing_html(accession_number: str, ticker: str) -> str:
    """Download and cache filing HTML using default SECClient."""
    return get_sec_client().download_filing_html(accession_number, ticker)
