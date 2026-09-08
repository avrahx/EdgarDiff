"""YoY Section Variance Engine for SEC 10-K Filings.

Provides paragraph-level sequence matching, change classification (unchanged, modified,
added, removed), quantitative Materiality/Shift Score (0-100), and Senior M&A /
Equity Research Analyst LLM synthesis of strategic changes referencing exact snippets.
"""

from __future__ import annotations

import json
import os
import re
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional

try:
    from thefuzz import fuzz
    THEFUZZ_AVAILABLE = True
except ImportError:  # pragma: no cover
    THEFUZZ_AVAILABLE = False

try:
    import litellm
    LITELLM_AVAILABLE = True
except ImportError:  # pragma: no cover
    LITELLM_AVAILABLE = False


ANALYST_SYSTEM_PROMPT = (
    "You are a Senior M&A and Equity Research Analyst conducting forensic analysis "
    "on SEC EDGAR 10-K filings (specifically Item 1A Risk Factors and Item 7 MD&A). "
    "Your objective is to dissect Year-over-Year (YoY) variances between consecutive reporting periods "
    "and produce an executive briefing for institutional investors.\n\n"
    "Key Guidelines:\n"
    "1. Focus on material corporate, operational, financial, and regulatory shifts.\n"
    "2. Identify the top 3-5 strategic changes management added, modified, or removed.\n"
    "3. Reference exact verbatim paragraph snippets for each change to ground your analysis.\n"
    "4. Assess management's overall risk posture (e.g. 'Defensive Hardening', 'Aggressive Expansion', 'Supply Chain Vulnerability').\n"
    "5. Return your response as a valid JSON object matching the requested schema."
)


def split_into_paragraphs(text: str) -> List[str]:
    """Split section text into paragraphs/clauses while preserving Markdown tables."""
    if not text or not text.strip():
        return []

    # Double newlines delimit paragraphs while Markdown tables use single newlines
    raw_blocks = re.split(r"\n\s*\n+", text.strip())
    paragraphs: List[str] = []

    for block in raw_blocks:
        trimmed = block.strip()
        if trimmed:
            paragraphs.append(trimmed)

    return paragraphs


def calculate_paragraph_similarity(p1: str, p2: str) -> float:
    """Calculate normalized similarity ratio between two paragraphs (0.0 to 1.0)."""
    if p1 == p2:
        return 1.0
    if not p1 or not p2:
        return 0.0

    # Base similarity via standard SequenceMatcher
    matcher_sim = SequenceMatcher(None, p1, p2).ratio()

    # If thefuzz is available, blend with token sort ratio for rephrased clauses
    if THEFUZZ_AVAILABLE:
        fuzz_sim = fuzz.token_sort_ratio(p1, p2) / 100.0
        # Weight towards sequence structure while rewarding token overlap
        return round(0.6 * matcher_sim + 0.4 * fuzz_sim, 3)

    return round(matcher_sim, 3)


def calculate_materiality_score(diff_blocks: List[Dict[str, Any]]) -> float:
    """Calculate a quantitative section Materiality/Shift Score (0.0 to 100.0).

    Weights each paragraph by its volume (character length) and churn factor:
    - unchanged: 0% churn
    - modified: (1.0 - similarity) churn
    - added/removed: 100% churn
    """
    if not diff_blocks:
        return 0.0

    total_weight = 0.0
    weighted_churn = 0.0

    for b in diff_blocks:
        old_len = len(b.get("old_text") or "")
        new_len = len(b.get("new_text") or "")
        weight = max(old_len, new_len, 1)

        sim = float(b.get("similarity", 0.0))
        status = b.get("status")

        if status == "unchanged":
            churn = 0.0
        elif status in ("added", "removed"):
            churn = 1.0
        else:  # modified
            churn = max(0.0, min(1.0, 1.0 - sim))

        total_weight += weight
        weighted_churn += weight * churn

    if total_weight == 0:
        return 0.0

    score = (weighted_churn / total_weight) * 100.0
    return round(min(100.0, max(0.0, score)), 2)


def compute_text_diff(old_text: str, new_text: str) -> List[Dict[str, Any]]:
    """Compare YoY section texts and classify paragraphs into diff blocks.

    Matches corresponding paragraphs between Year N-1 and Year N using sequence matching.

    Returns:
        list of dicts, each with:
            - status: "unchanged" | "modified" | "added" | "removed"
            - old_text: str | None
            - new_text: str | None
            - similarity: float (0.0 to 1.0)
            - shift_score: float (0.0 to 100.0)
            - materiality_score: float (overall section score attached to blocks)
    """
    old_paras = split_into_paragraphs(old_text)
    new_paras = split_into_paragraphs(new_text)

    # Fast path: Both empty
    if not old_paras and not new_paras:
        return []

    # Fast path: Entirely new section
    if not old_paras and new_paras:
        blocks = [
            {
                "status": "added",
                "old_text": None,
                "new_text": p,
                "similarity": 0.0,
                "shift_score": 100.0,
            }
            for p in new_paras
        ]
        score = 100.0
        for b in blocks:
            b["materiality_score"] = score
        return blocks

    # Fast path: Completely removed section
    if old_paras and not new_paras:
        blocks = [
            {
                "status": "removed",
                "old_text": p,
                "new_text": None,
                "similarity": 0.0,
                "shift_score": 100.0,
            }
            for p in old_paras
        ]
        score = 100.0
        for b in blocks:
            b["materiality_score"] = score
        return blocks

    matcher = SequenceMatcher(None, old_paras, new_paras)
    opcodes = matcher.get_opcodes()
    diff_blocks: List[Dict[str, Any]] = []

    for tag, i1, i2, j1, j2 in opcodes:
        if tag == "equal":
            for i, j in zip(range(i1, i2), range(j1, j2)):
                diff_blocks.append(
                    {
                        "status": "unchanged",
                        "old_text": old_paras[i],
                        "new_text": new_paras[j],
                        "similarity": 1.0,
                        "shift_score": 0.0,
                    }
                )

        elif tag == "delete":
            for i in range(i1, i2):
                diff_blocks.append(
                    {
                        "status": "removed",
                        "old_text": old_paras[i],
                        "new_text": None,
                        "similarity": 0.0,
                        "shift_score": 100.0,
                    }
                )

        elif tag == "insert":
            for j in range(j1, j2):
                diff_blocks.append(
                    {
                        "status": "added",
                        "old_text": None,
                        "new_text": new_paras[j],
                        "similarity": 0.0,
                        "shift_score": 100.0,
                    }
                )

        elif tag == "replace":
            sub_old = old_paras[i1:i2]
            sub_new = new_paras[j1:j2]
            used_new_indices: set[int] = set()

            for old_p in sub_old:
                best_j = -1
                best_sim = 0.0

                for j_idx, new_p in enumerate(sub_new):
                    if j_idx in used_new_indices:
                        continue
                    sim = calculate_paragraph_similarity(old_p, new_p)
                    if sim > best_sim:
                        best_sim = sim
                        best_j = j_idx

                # Match threshold: 0.35 similarity indicates an edited paragraph
                if best_j != -1 and best_sim >= 0.35:
                    used_new_indices.add(best_j)
                    matched_new = sub_new[best_j]

                    if best_sim >= 0.95:
                        status = "unchanged"
                        shift_score = 0.0
                    else:
                        status = "modified"
                        shift_score = round((1.0 - best_sim) * 100.0, 1)

                    diff_blocks.append(
                        {
                            "status": status,
                            "old_text": old_p,
                            "new_text": matched_new,
                            "similarity": round(best_sim, 3),
                            "shift_score": shift_score,
                        }
                    )
                else:
                    diff_blocks.append(
                        {
                            "status": "removed",
                            "old_text": old_p,
                            "new_text": None,
                            "similarity": 0.0,
                            "shift_score": 100.0,
                        }
                    )

            # Unmatched paragraphs in sub_new are newly added
            for j_idx, new_p in enumerate(sub_new):
                if j_idx not in used_new_indices:
                    diff_blocks.append(
                        {
                            "status": "added",
                            "old_text": None,
                            "new_text": new_p,
                            "similarity": 0.0,
                            "shift_score": 100.0,
                        }
                    )

    # Compute overall section materiality score and decorate blocks
    section_materiality = calculate_materiality_score(diff_blocks)
    for b in diff_blocks:
        b["materiality_score"] = section_materiality

    return diff_blocks


def _build_fallback_analyst_summary(
    diff_blocks: List[Dict[str, Any]], materiality_score: float
) -> Dict[str, Any]:
    """Deterministic, institutional-grade analytical summary when LLM is unavailable."""
    # Prioritize substantive changes: modified, added, removed
    changed_blocks = [b for b in diff_blocks if b.get("status") != "unchanged"]

    # Sort by impact: added/removed and highest shift_score
    changed_blocks.sort(
        key=lambda b: (
            b.get("status") in ("added", "modified", "removed"),
            b.get("shift_score", 0.0),
            len(b.get("new_text") or b.get("old_text") or ""),
        ),
        reverse=True,
    )

    top_changes: List[Dict[str, Any]] = []
    for b in changed_blocks[:5]:
        status = b["status"]
        snippet = b.get("new_text") or b.get("old_text") or ""
        snippet_ref = snippet[:220] + ("..." if len(snippet) > 220 else "")

        # Infer strategic theme based on text contents
        lower_snip = snippet.lower()
        if any(k in lower_snip for k in ("supply", "port", "logistics", "vendor", "supplier")):
            theme = "Supply Chain & Global Logistics Exposure"
        elif any(k in lower_snip for k in ("cyber", "breach", "ransomware", "data security", "privacy")):
            theme = "Cybersecurity & Critical Infrastructure Vulnerability"
        elif any(k in lower_snip for k in ("revenue", "margin", "inflation", "cost", "operating income")):
            theme = "Financial Performance & Operating Margin Pressures"
        elif any(k in lower_snip for k in ("regulation", "sec", "compliance", "antitrust", "sanctions")):
            theme = "Regulatory Enforcement & Governance Compliance"
        elif any(k in lower_snip for k in ("ai", "cloud", "technology", "intellectual property", "patent")):
            theme = "Technological Disruption & IP Protection"
        else:
            theme = "Corporate Strategy & Structural Disclosure Shift"

        if status == "added":
            analysis = (
                f"Management introduced new disclosure regarding {theme.lower()}, "
                "signaling emerging operational sensitivity and proactively addressing newly identified downside risks."
            )
        elif status == "removed":
            analysis = (
                f"Management de-emphasized or resolved previous disclosures regarding {theme.lower()}, "
                "suggesting remediation of prior risks or structural realignments in operational priorities."
            )
        else:
            analysis = (
                f"Management updated language surrounding {theme.lower()} "
                f"(textual shift: {b.get('shift_score', 0)}%), refining risk parameters and financial assessments."
            )

        top_changes.append(
            {
                "type": status,
                "theme": theme,
                "analysis": analysis,
                "snippet_reference": snippet_ref,
            }
        )

    # Risk posture evaluation
    if materiality_score > 40.0:
        posture = "Significant Disclosure Restructuring / Elevated Defensive Posture"
    elif materiality_score > 15.0:
        posture = "Moderate Operational & Strategic Calibration"
    elif materiality_score > 0.0:
        posture = "Stable Risk Profile with Incremental Language Adjustments"
    else:
        posture = "Unchanged Institutional Risk Stance"

    exec_summary = (
        f"Year-over-Year variance analysis indicates a Materiality Shift Score of {materiality_score:.1f}/100. "
        f"Management's disclosure strategy reflects a '{posture}' stance, with {len(changed_blocks)} total "
        f"disrupted paragraph blocks identified across target sections."
    )

    return {
        "executive_summary": exec_summary,
        "materiality_score": materiality_score,
        "risk_posture_shift": posture,
        "top_strategic_changes": top_changes,
    }


def summarize_variance(
    diff_blocks: List[Dict[str, Any]],
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Synthesize YoY variance using a Senior M&A / Equity Research Analyst persona.

    Summarizes top 3-5 strategic changes management introduced or removed in MD&A /
    Risk Factors, referencing exact paragraph snippets.

    Falls back to deterministic analytical synthesis when API keys are not configured.
    """
    materiality_score = calculate_materiality_score(diff_blocks)

    if not diff_blocks:
        return {
            "executive_summary": "No variance detected between the compared periods.",
            "materiality_score": 0.0,
            "risk_posture_shift": "Unchanged",
            "top_strategic_changes": [],
        }

    # Format changed blocks for LLM context
    changed_blocks = [b for b in diff_blocks if b.get("status") != "unchanged"]
    if not changed_blocks:
        return {
            "executive_summary": "Disclosures remained 100% consistent YoY with zero textual churn.",
            "materiality_score": 0.0,
            "risk_posture_shift": "Static Risk Stance",
            "top_strategic_changes": [],
        }

    # Check if LLM integration should be invoked
    chosen_model = model or os.getenv("LLM_MODEL", "gemini/gemini-1.5-flash")
    has_api_key = bool(
        api_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("ANTHROPIC_API_KEY")
    )

    if LITELLM_AVAILABLE and has_api_key:
        try:
            # Prepare diff blocks payload for LLM
            diff_summary_input = []
            for idx, b in enumerate(changed_blocks[:15], 1):
                diff_summary_input.append(
                    {
                        "block_id": idx,
                        "status": b.get("status"),
                        "similarity": b.get("similarity"),
                        "shift_score": b.get("shift_score"),
                        "old_text": b.get("old_text"),
                        "new_text": b.get("new_text"),
                    }
                )

            user_prompt = (
                f"Analyze the following YoY 10-K section diff blocks (Overall Materiality Score: {materiality_score:.1f}/100):\n\n"
                f"{json.dumps(diff_summary_input, indent=2)}\n\n"
                "Synthesize the top 3-5 strategic changes introduced or removed. "
                "Respond in JSON format with keys: executive_summary (string), "
                "materiality_score (float), risk_posture_shift (string), and "
                "top_strategic_changes (list of objects with keys: type, theme, analysis, snippet_reference)."
            )

            kwargs: Dict[str, Any] = {
                "model": chosen_model,
                "messages": [
                    {"role": "system", "content": ANALYST_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.2,
            }
            if api_key:
                kwargs["api_key"] = api_key

            response = litellm.completion(**kwargs)
            content = response.choices[0].message.content

            # Extract JSON from potential markdown code fences
            clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip())
            data = json.loads(clean_json)
            data["materiality_score"] = materiality_score
            return data
        except Exception:
            # Fall back gracefully to institutional heuristic summary
            pass

    return _build_fallback_analyst_summary(diff_blocks, materiality_score)
