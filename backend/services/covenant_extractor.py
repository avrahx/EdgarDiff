"""M&A covenant and deal terms extraction service using Pydantic and Instructor.

Locates merger agreement sections (Termination, Covenants, Consideration) using
chunked search and performs structured extraction into DealCovenants schema.
"""

from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional
from backend.models.deal_covenants import DealCovenants, DealParties, DealValuation, FullDealAnalysis

try:
    import instructor
    import litellm
    INSTRUCTOR_AVAILABLE = True
except ImportError:  # pragma: no cover
    INSTRUCTOR_AVAILABLE = False


MERGER_KEYWORDS = [
    # Termination and breakup provisions
    r"\btermination\s+fees?\b",
    r"\bcompany\s+termination\s+fees?\b",
    r"\bparent\s+termination\s+fees?\b",
    r"\breverse\s+termination\s+fees?\b",
    r"\bbreakup\s+fees?\b",
    r"\bbreak-up\s+fees?\b",
    r"\bliquidated\s+damages?\b",
    # Covenants, solicitation, and windows
    r"\bgo-shop\b",
    r"\bno-shop\b",
    r"\bsolicitation\b",
    r"\bsuperior\s+proposals?\b",
    r"\bmatching\s+rights?\b",
    r"\bmatch\s+rights?\b",
    r"\bnotice\s+of\s+adverse\s+recommendation\b",
    r"\bunsolicited\s+proposals?\b",
    # Valuation and consideration
    r"\bmerger\s+considerations?\b",
    r"\bper\s+share\s+merger\s+considerations?\b",
    r"\bexchange\s+ratios?\b",
    r"\bequity\s+values?\b",
    r"\benterprise\s+values?\b",
]

COMPILED_MERGER_PATTERNS = [re.compile(pattern, re.I) for pattern in MERGER_KEYWORDS]


def find_merger_agreement_sections(filing_text: str, max_chars: int = 30000) -> str:
    """Use chunked search to locate merger agreement sections (Termination, Covenants, Consideration).

    Scans filing text in paragraph/clause blocks, scores blocks based on M&A covenant
    density, and aggregates relevant sections within the target character budget.
    """
    if not filing_text or not filing_text.strip():
        return ""

    # Split into paragraph blocks
    raw_blocks = re.split(r"\n\s*\n+", filing_text.strip())
    scored_blocks: List[tuple[int, int, str]] = []

    for idx, block in enumerate(raw_blocks):
        trimmed = block.strip()
        if not trimmed:
            continue

        score = 0
        for pat in COMPILED_MERGER_PATTERNS:
            matches = len(pat.findall(trimmed))
            score += matches

        if score > 0:
            scored_blocks.append((score, idx, trimmed))

    if not scored_blocks:
        # If no explicit keyword matches, return beginning of document up to max_chars
        return filing_text[:max_chars].strip()

    # Sort blocks by document order while including contextual neighbors
    selected_indices: set[int] = set()
    for _, idx, _ in scored_blocks:
        # Add the matching block and adjacent paragraph for context
        selected_indices.add(idx)
        if idx > 0:
            selected_indices.add(idx - 1)
        if idx + 1 < len(raw_blocks):
            selected_indices.add(idx + 1)

    sorted_indices = sorted(selected_indices)
    collected_paragraphs: List[str] = []
    current_length = 0

    for idx in sorted_indices:
        para = raw_blocks[idx].strip()
        para_len = len(para)
        if current_length + para_len > max_chars and collected_paragraphs:
            break
        collected_paragraphs.append(para)
        current_length += para_len + 2

    return "\n\n".join(collected_paragraphs)


def _parse_currency_amount(amount_str: str, multiplier_str: Optional[str] = None) -> Optional[float]:
    """Convert currency string (e.g. '120,000,000' or '120 million') into float."""
    try:
        clean_num = amount_str.replace(",", "").strip()
        val = float(clean_num)
        if multiplier_str:
            m_lower = multiplier_str.lower()
            if "million" in m_lower:
                val *= 1_000_000
            elif "billion" in m_lower:
                val *= 1_000_000_000
        return val
    except (ValueError, TypeError):
        return None


def _extract_covenants_heuristic(text: str) -> DealCovenants:
    """Heuristic fallback extraction using financial regex patterns and sentence grounding."""
    # 1. Target Termination Fee in USD
    target_fee_usd: Optional[float] = None
    target_fee_percent: Optional[float] = None
    reverse_fee_usd: Optional[float] = None
    go_shop_days: Optional[int] = None
    matching_rights_days: Optional[int] = None
    quotes: List[str] = []

    # Reverse termination fee (Parent termination fee)
    reverse_match = re.search(
        r"(?:reverse\s+termination\s+fee|parent\s+termination\s+fee)[^\.\$]{0,80}\$\s*([0-9,]+(?:\.[0-9]+)?)\s*(million|billion)?",
        text,
        re.I,
    )
    if reverse_match:
        reverse_fee_usd = _parse_currency_amount(reverse_match.group(1), reverse_match.group(2))
        quotes.append(reverse_match.group(0).strip())

    # Target termination fee (Company termination fee)
    target_match = re.search(
        r"(?:company\s+termination\s+fee|target\s+termination\s+fee|termination\s+fee)[^\.\$]{0,80}\$\s*([0-9,]+(?:\.[0-9]+)?)\s*(million|billion)?",
        text,
        re.I,
    )
    if target_match:
        target_fee_usd = _parse_currency_amount(target_match.group(1), target_match.group(2))
        quotes.append(target_match.group(0).strip())

    # Termination fee percent
    percent_match = re.search(
        r"(?:termination\s+fee|fee)[^\.\%]{0,60}?(?:equal\s+to|represents?|representing|approximate(?:ly)?)\s*([0-9]+(?:\.[0-9]+)?)\s*%",
        text,
        re.I,
    )
    if percent_match:
        try:
            target_fee_percent = float(percent_match.group(1))
            quotes.append(percent_match.group(0).strip())
        except ValueError:
            pass

    # Go-shop period in days
    go_shop_match = re.search(
        r"([0-9]+)\s*[-–\s]*(?:calendar\s*)?days?[^\.]{0,60}?(?:go-shop|go\s*shop)",
        text,
        re.I,
    )
    if not go_shop_match:
        go_shop_match = re.search(
            r"(?:go-shop|go\s*shop)[^\.]{0,60}?([0-9]+)\s*[-–\s]*(?:calendar\s*)?days?",
            text,
            re.I,
        )
    if go_shop_match:
        try:
            go_shop_days = int(go_shop_match.group(1))
            quotes.append(go_shop_match.group(0).strip())
        except ValueError:
            pass

    # Matching rights window in business days
    match_window_match = re.search(
        r"([0-9]+)\s*[-–\s]*(?:business\s*)?days?\s*(?:to\s*match|matching\s*rights?|negotiate\s*in\s*good\s*faith)",
        text,
        re.I,
    )
    if not match_window_match:
        match_window_match = re.search(
            r"(?:matching\s*rights?|match\s*window)[^\.]{0,40}?([0-9]+)\s*(?:business\s*)?days?",
            text,
            re.I,
        )
    if match_window_match:
        try:
            matching_rights_days = int(match_window_match.group(1))
            quotes.append(match_window_match.group(0).strip())
        except ValueError:
            pass

    # Determine exact source quote
    if quotes:
        exact_quote = " | ".join(quotes)
    else:
        # Fallback to first non-empty sentence in text
        sentences = [s.strip() for s in text.split(".") if len(s.strip()) > 20]
        exact_quote = sentences[0] if sentences else text[:200].strip()

    return DealCovenants(
        termination_fee_target_usd=target_fee_usd,
        termination_fee_percent=target_fee_percent,
        reverse_termination_fee_usd=reverse_fee_usd,
        go_shop_period_days=go_shop_days,
        matching_rights_window_days=matching_rights_days,
        exact_source_quote=exact_quote,
    )


def extract_covenants_from_filing(
    filing_text: str,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> DealCovenants:
    """Extract structured M&A deal covenants from filing text using Pydantic and Instructor.

    Uses chunked search to isolate relevant merger agreement sections (Termination, Covenants,
    Consideration) before invoking the structured extraction model.

    Missing covenants return null (None) safely without throwing validation errors.
    """
    if not filing_text or not filing_text.strip():
        return DealCovenants(
            exact_source_quote="No merger agreement or covenant text available."
        )

    # 1. Chunked search for relevant sections
    relevant_excerpt = find_merger_agreement_sections(filing_text)

    # 2. Check for LLM API credentials
    chosen_model = model or os.getenv("LLM_MODEL", "gemini/gemini-1.5-flash")
    has_api_key = bool(
        api_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("ANTHROPIC_API_KEY")
    )

    if INSTRUCTOR_AVAILABLE and has_api_key:
        try:
            client = instructor.from_litellm(litellm.completion)
            covenants: DealCovenants = client.chat.completions.create(
                model=chosen_model,
                response_model=DealCovenants,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert M&A legal analyst and institutional investment researcher. "
                            "Extract M&A deal protection covenants, breakup fees, and window rights into the strict schema.\n\n"
                            "Rules:\n"
                            "1. If a covenant is NOT present in the text (e.g. no reverse termination fee, no go-shop period, "
                            "or no matching rights), you MUST set that field to null (None).\n"
                            "2. Do NOT invent or infer covenants that are not disclosed.\n"
                            "3. exact_source_quote MUST be a verbatim citation from the text detailing the covenants."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Extract deal covenants from the following merger agreement clauses:\n\n{relevant_excerpt}",
                    },
                ],
                temperature=0.0,
            )
            return covenants
        except Exception:
            # Fall back gracefully to institutional heuristic extraction
            pass

    return _extract_covenants_heuristic(relevant_excerpt)


def extract_full_deal_from_filing(
    filing_text: str,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> FullDealAnalysis:
    """Extract parties, valuation, and covenants into FullDealAnalysis container."""
    covenants = extract_covenants_from_filing(filing_text, model=model, api_key=api_key)

    # Heuristic extraction for parties & valuation if text permits
    parties = None
    acquirer_match = re.search(r"between\s+([A-Z][\w\s,\.]+?)\s*(?:\(|,)\s*(?:\"Parent\"|\"Acquirer\"|Parent|Acquirer)", filing_text)
    target_match = re.search(r"and\s+([A-Z][\w\s,\.]+?)\s*(?:\(|,)\s*(?:\"Company\"|\"Target\"|Company|Target)", filing_text)
    if acquirer_match and target_match:
        deal_type = "cash" if "all-cash" in filing_text.lower() or "$ per share in cash" in filing_text.lower() else "unknown"
        parties = DealParties(
            acquirer=acquirer_match.group(1).strip(),
            target=target_match.group(1).strip(),
            deal_type=deal_type,
        )

    return FullDealAnalysis(
        parties=parties,
        valuation=None,
        covenants=covenants,
    )
