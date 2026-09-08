"""SEC 10-K filing section parser and segmentation service.

Extracts Item 1A (Risk Factors), Item 7 (MD&A), and Item 8 (Financial Statements)
from SEC 10-K filings using sec-parser and BeautifulSoup4, with Markdown table
preservation, inline XBRL tag unwrapping, whitespace and page number normalization,
and a heuristic/regex fallback for non-standard HTML.
"""

from __future__ import annotations

import re
import warnings
from typing import Any, Dict, List, Optional, Tuple
from bs4 import BeautifulSoup, Comment, NavigableString, Tag

try:
    import sec_parser as sp
    from sec_parser.semantic_elements import (
        EmptyElement,
        PageHeaderElement,
        PageNumberElement,
        TableElement,
        TitleElement,
        TopSectionTitle,
    )
    SEC_PARSER_AVAILABLE = True
except ImportError:  # pragma: no cover
    SEC_PARSER_AVAILABLE = False


# Patterns for 10-K top section start and boundary markers
SECTION_PATTERNS: Dict[str, Tuple[re.Pattern, re.Pattern]] = {
    "item_1a": (
        # Start: Item 1A [Risk Factors]
        re.compile(
            r"(?:^|[\r\n]+)[ \t]*(?:ITEM|Item)\s*1A(?:\.|\:|\s|\-|&#160;|&nbsp;)*(?:\r?\n[ \t]*)?(?:RISK\s*FACTORS|Risk\s*Factors)",
            re.I,
        ),
        # End: Item 1B, 1C, or Item 2
        re.compile(
            r"(?:^|[\r\n]+)[ \t]*(?:ITEM|Item)\s*(?:1B|1C|2)(?:\.|\:|\s|\-|&#160;|&nbsp;)+",
            re.I,
        ),
    ),
    "item_7": (
        # Start: Item 7 [Management's Discussion and Analysis...]
        re.compile(
            r"(?:^|[\r\n]+)[ \t]*(?:ITEM|Item)\s*7(?:\.|\:|\s|\-|&#160;|&nbsp;)*(?:\r?\n[ \t]*)?(?:MANAGEMENT[\'’]?S\s*DISCUSSION|Management[\'’]?s\s*Discussion)",
            re.I,
        ),
        # End: Item 7A or Item 8
        re.compile(
            r"(?:^|[\r\n]+)[ \t]*(?:ITEM|Item)\s*(?:7A|8)(?:\.|\:|\s|\-|&#160;|&nbsp;)+",
            re.I,
        ),
    ),
    "item_8": (
        # Start: Item 8 [Financial Statements and Supplementary Data]
        re.compile(
            r"(?:^|[\r\n]+)[ \t]*(?:ITEM|Item)\s*8(?:\.|\:|\s|\-|&#160;|&nbsp;)*(?:\r?\n[ \t]*)?(?:FINANCIAL\s*STATEMENTS|Financial\s*Statements)",
            re.I,
        ),
        # End: Item 9, 9A, 9B, 9C, or Part III
        re.compile(
            r"(?:^|[\r\n]+)[ \t]*(?:ITEM|Item)\s*(?:9|9A|9B|9C)(?:\.|\:|\s|\-|&#160;|&nbsp;)+|(?:^|[\r\n]+)[ \t]*PART\s+III",
            re.I,
        ),
    ),
}

# Loose start patterns if title phrase is absent on the immediate item header line
LOOSE_START_PATTERNS: Dict[str, re.Pattern] = {
    "item_1a": re.compile(
        r"(?:^|[\r\n]+)[ \t]*(?:ITEM|Item)\s*1A(?:\.|\:|\s|\-|&#160;|&nbsp;)+", re.I
    ),
    "item_7": re.compile(
        r"(?:^|[\r\n]+)[ \t]*(?:ITEM|Item)\s*7(?:\.|\:|\s|\-|&#160;|&nbsp;)+", re.I
    ),
    "item_8": re.compile(
        r"(?:^|[\r\n]+)[ \t]*(?:ITEM|Item)\s*8(?:\.|\:|\s|\-|&#160;|&nbsp;)+", re.I
    ),
}


def table_to_markdown(table: Tag) -> str:
    """Convert an HTML <table> element into a clean Markdown table.

    Pads irregular rows and escapes pipe characters while preserving cell contents.
    """
    rows = table.find_all("tr")
    if not rows:
        return ""

    grid: List[List[str]] = []
    for r in rows:
        cells = r.find_all(["th", "td"])
        row_vals: List[str] = []
        for cell in cells:
            cell_text = " ".join(cell.get_text(" ", strip=True).split())
            cell_text = cell_text.replace("|", "\\|")
            row_vals.append(cell_text)

        if any(row_vals):
            grid.append(row_vals)

    if not grid:
        return ""

    max_cols = max(len(row) for row in grid)
    if max_cols == 0:
        return ""

    # If 1x1 table containing a single text block, return as plain text
    if max_cols == 1 and len(grid) == 1:
        return f"\n\n{grid[0][0]}\n\n"

    # Pad shorter rows to ensure uniform column count
    padded_grid = [row + [""] * (max_cols - len(row)) for row in grid]

    header = padded_grid[0]
    separator = ["---"] * max_cols

    md_lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(separator) + " |",
    ]
    for row in padded_grid[1:]:
        md_lines.append("| " + " | ".join(row) + " |")

    return "\n\n" + "\n".join(md_lines) + "\n\n"


def sanitize_and_format_soup(soup: BeautifulSoup) -> None:
    """Strip script/style tags, unwrap inline XBRL elements, and convert tables to Markdown."""
    # Decompose script, style, comments, noscript
    for element in soup.find_all(["script", "style", "noscript", "meta"]):
        element.decompose()

    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # Handle XBRL tags: decompose headers/hidden, unwrap content containers
    for tag in soup.find_all(re.compile(r"^(?:ix|xbrli):", re.I)):
        tag_name = tag.name.lower()
        if tag_name in ("ix:header", "ix:hidden"):
            tag.decompose()
        else:
            tag.unwrap()

    # Convert all <table> elements into markdown tables
    for table in soup.find_all("table"):
        md_table = table_to_markdown(table)
        table.replace_with(soup.new_string(md_table))


def clean_section_text(text: str) -> str:
    """Clean section text by stripping page numbers and excessive whitespace."""
    if not text:
        return ""

    # Remove inline page numbers at ends of lines or before newlines
    text = re.sub(r"(?:[\.\s]+|\b)Page\s+\d+(?:\s+of\s+\d+)?\s*$", ".", text, flags=re.I)
    text = re.sub(r"(?:[\.\s]+|\b)Page\s+\d+(?:\s+of\s+\d+)?(?=\n)", ".", text, flags=re.I)

    cleaned_lines: List[str] = []
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        trimmed = line.strip()

        # Filter standalone page numbers (e.g. "12", "- 12 -", "Page 12", "Page 12 of 150")
        if re.match(
            r"^(?:Page\s+\d+(?:\s+of\s+\d+)?|[-–—]?\s*\d+\s*[-–—]?|\[\s*\d+\s*\])$",
            trimmed,
            re.I,
        ):
            continue

        cleaned_lines.append(line)

    result = "\n".join(cleaned_lines)
    # Collapse 3+ consecutive newlines into 2
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


def _extract_with_sec_parser(processed_html: str) -> Dict[str, str]:
    """Parse 10-K sections using sec-parser semantic elements."""
    if not SEC_PARSER_AVAILABLE:
        return {}

    sections: Dict[str, str] = {"item_1a": "", "item_7": "", "item_8": ""}

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            parser = sp.Edgar10QParser()
            elements = parser.parse(processed_html)
        except Exception:
            return {}

    current_section: Optional[str] = None
    section_buffers: Dict[str, List[str]] = {
        "item_1a": [],
        "item_7": [],
        "item_8": [],
    }

    for element in elements:
        if isinstance(element, (PageNumberElement, PageHeaderElement, EmptyElement)):
            continue

        text = element.text.strip()
        if not text:
            continue

        # Check entry into Item 1A
        if re.search(
            r"^(?:ITEM|Item)\s*1A(?:\.|\:|\s|\-|&#160;|&nbsp;)*(?:\r?\n[ \t]*)?(?:RISK\s*FACTORS|Risk\s*Factors)",
            text,
            re.I,
        ):
            current_section = "item_1a"
            section_buffers["item_1a"].append(text)
            continue

        # Check exit from Item 1A
        if current_section == "item_1a" and re.search(
            r"^(?:ITEM|Item)\s*(?:1B|1C|2)(?:\.|\:|\s|\-|&#160;|&nbsp;)+", text, re.I
        ):
            current_section = None

        # Check entry into Item 7
        if re.search(
            r"^(?:ITEM|Item)\s*7(?:\.|\:|\s|\-|&#160;|&nbsp;)*(?:\r?\n[ \t]*)?(?:MANAGEMENT[\'’]?S|Management[\'’]?s)",
            text,
            re.I,
        ):
            current_section = "item_7"
            section_buffers["item_7"].append(text)
            continue

        # Check exit from Item 7
        if current_section == "item_7" and re.search(
            r"^(?:ITEM|Item)\s*(?:7A|8)(?:\.|\:|\s|\-|&#160;|&nbsp;)+", text, re.I
        ):
            current_section = None

        # Check entry into Item 8
        if re.search(
            r"^(?:ITEM|Item)\s*8(?:\.|\:|\s|\-|&#160;|&nbsp;)*(?:\r?\n[ \t]*)?(?:FINANCIAL\s*STATEMENTS|Financial\s*Statements)",
            text,
            re.I,
        ):
            current_section = "item_8"
            section_buffers["item_8"].append(text)
            continue

        # Check exit from Item 8
        if current_section == "item_8" and re.search(
            r"^(?:ITEM|Item)\s*(?:9|9A|9B|9C)(?:\.|\:|\s|\-|&#160;|&nbsp;)+|^PART\s+III",
            text,
            re.I,
        ):
            current_section = None

        if current_section:
            section_buffers[current_section].append(text)

    for sec_key, parts in section_buffers.items():
        combined = "\n\n".join(parts)
        # Verify section has substantive content (filter out tiny TOC snippets)
        if len(combined) >= 70:
            sections[sec_key] = clean_section_text(combined)

    return sections


def _extract_with_heuristic_fallback(soup: BeautifulSoup) -> Dict[str, str]:
    """Fallback parser using BeautifulSoup DOM text and regex boundary matching.

    Filters out Table of Contents false positives by selecting substantive candidate slices.
    """
    sections: Dict[str, str] = {"item_1a": "", "item_7": "", "item_8": ""}
    full_text = soup.get_text("\n")

    for sec_key, (start_pat, end_pat) in SECTION_PATTERNS.items():
        starts = list(start_pat.finditer(full_text))
        if not starts:
            starts = list(LOOSE_START_PATTERNS[sec_key].finditer(full_text))

        if not starts:
            continue

        ends = list(end_pat.finditer(full_text))

        best_slice: str = ""
        for start_match in starts:
            start_pos = start_match.start()
            valid_ends = [e for e in ends if e.start() > start_pos]

            if valid_ends:
                end_pos = valid_ends[0].start()
                candidate_slice = full_text[start_pos:end_pos].strip()
            else:
                candidate_slice = full_text[start_pos : start_pos + 250000].strip()

            # If multiple candidates exist (e.g. TOC + main body), choose the largest slice.
            if len(candidate_slice) > len(best_slice):
                best_slice = candidate_slice

        # A true section either is the only match or exceeds short TOC item lines
        if best_slice and (len(starts) == 1 or len(best_slice) >= 80):
            sections[sec_key] = clean_section_text(best_slice)

    return sections


def extract_10k_sections(html_content: str) -> Dict[str, str]:
    """Extract Item 1A, Item 7, and Item 8 from a 10-K filing HTML string.

    Tries the sec-parser semantic pipeline first. If any of the requested sections
    are missing or empty, applies the heuristic/regex fallback parser.

    Returns:
        dict with keys:
            - "item_1a": Risk Factors
            - "item_7": Management's Discussion and Analysis (MD&A)
            - "item_8": Financial Statements and Supplementary Data
    """
    if not html_content or not html_content.strip():
        return {"item_1a": "", "item_7": "", "item_8": ""}

    # Pre-process HTML: unwrap XBRL, format tables to Markdown
    soup = BeautifulSoup(html_content, "html.parser")
    sanitize_and_format_soup(soup)
    processed_html = str(soup)

    sections: Dict[str, str] = {}

    # Attempt 1: sec-parser semantic element extraction
    try:
        sections = _extract_with_sec_parser(processed_html)
    except Exception:
        sections = {}

    # Check for missing or empty sections
    required_keys = ("item_1a", "item_7", "item_8")
    missing_keys = [k for k in required_keys if not sections.get(k)]

    # Attempt 2: Heuristic fallback for any missing section
    if missing_keys:
        fallback_sections = _extract_with_heuristic_fallback(soup)
        for key in required_keys:
            if not sections.get(key) and fallback_sections.get(key):
                sections[key] = fallback_sections[key]

    return {
        "item_1a": sections.get("item_1a", ""),
        "item_7": sections.get("item_7", ""),
        "item_8": sections.get("item_8", ""),
    }
