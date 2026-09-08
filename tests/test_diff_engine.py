"""Unit tests for YoY Section Variance Engine and Analyst LLM synthesis."""

import json
from unittest.mock import MagicMock, patch
import pytest

from backend.services.diff_engine import (
    ANALYST_SYSTEM_PROMPT,
    calculate_materiality_score,
    calculate_paragraph_similarity,
    compute_text_diff,
    split_into_paragraphs,
    summarize_variance,
)


@pytest.fixture
def sample_old_text() -> str:
    return """
    Item 1A. Risk Factors.

    Our primary supply chain operates primarily through suppliers in Southeast Asia. Geopolitical risks may disrupt component deliveries.

    | Supplier Region | Dependency % |
    | --- | --- |
    | Southeast Asia | 65% |
    | North America | 35% |

    We rely heavily on short-term revolving debt facilities to fund seasonal operational working capital.

    Our legacy patents protect our core optical transceivers through 2024.
    """.strip()


@pytest.fixture
def sample_new_text() -> str:
    return """
    Item 1A. Risk Factors.

    Our primary supply chain operates through diversified suppliers across North America and Southeast Asia. Geopolitical tensions and maritime shipping delays may disrupt component deliveries and inflate freight expenses.

    | Supplier Region | Dependency % |
    | --- | --- |
    | Southeast Asia | 45% |
    | North America | 55% |

    Rapid advancements in artificial intelligence and hyperscale datacenter architectures could render our legacy product portfolio obsolete if we fail to innovate.

    We rely heavily on short-term revolving debt facilities to fund seasonal operational working capital.
    """.strip()


class TestParagraphSegmentation:
    def test_split_into_paragraphs_preserves_tables(self):
        text = "Paragraph one.\n\n| Col 1 | Col 2 |\n| --- | --- |\n| Val 1 | Val 2 |\n\nParagraph two."
        paras = split_into_paragraphs(text)
        assert len(paras) == 3
        assert paras[0] == "Paragraph one."
        assert "| Col 1 | Col 2 |" in paras[1]
        assert paras[2] == "Paragraph two."

    def test_split_empty(self):
        assert split_into_paragraphs("") == []
        assert split_into_paragraphs("   \n\n  ") == []


class TestSimilarityAndScoring:
    def test_identical_similarity(self):
        sim = calculate_paragraph_similarity("Exact sentence.", "Exact sentence.")
        assert sim == 1.0

    def test_distinct_similarity(self):
        sim = calculate_paragraph_similarity(
            "The quick brown fox jumps over the lazy dog.",
            "Quantum computing algorithms accelerate cryptographic factorizations.",
        )
        assert sim < 0.35

    def test_materiality_score_zero_for_unchanged(self):
        diff_blocks = [
            {"status": "unchanged", "similarity": 1.0, "old_text": "A", "new_text": "A"},
            {"status": "unchanged", "similarity": 1.0, "old_text": "B", "new_text": "B"},
        ]
        assert calculate_materiality_score(diff_blocks) == 0.0

    def test_materiality_score_max_for_complete_churn(self):
        diff_blocks = [
            {"status": "added", "similarity": 0.0, "old_text": None, "new_text": "New content"},
            {"status": "removed", "similarity": 0.0, "old_text": "Old content", "new_text": None},
        ]
        assert calculate_materiality_score(diff_blocks) == 100.0


class TestDiffTagging:
    def test_exact_match_all_unchanged(self):
        text = "Paragraph 1.\n\nParagraph 2."
        diff = compute_text_diff(text, text)

        assert len(diff) == 2
        for b in diff:
            assert b["status"] == "unchanged"
            assert b["similarity"] == 1.0
            assert b["shift_score"] == 0.0
            assert b["materiality_score"] == 0.0

    def test_single_paragraph_modified(self):
        old_p = "Consolidated operating margin for the fiscal year was 18.5% driven by hardware sales."
        new_p = "Consolidated operating margin for the fiscal year expanded to 21.2% driven by enterprise software subscriptions."

        diff = compute_text_diff(old_p, new_p)
        assert len(diff) == 1
        block = diff[0]
        assert block["status"] == "modified"
        assert block["old_text"] == old_p
        assert block["new_text"] == new_p
        assert 0.35 <= block["similarity"] < 0.95
        assert block["shift_score"] > 0
        assert block["materiality_score"] > 0

    def test_paragraph_added(self):
        old_text = "First paragraph."
        new_text = "First paragraph.\n\nNewly added second paragraph regarding cyber risk."

        diff = compute_text_diff(old_text, new_text)
        assert len(diff) == 2
        assert diff[0]["status"] == "unchanged"
        assert diff[1]["status"] == "added"
        assert diff[1]["old_text"] is None
        assert "Newly added second paragraph" in diff[1]["new_text"]
        assert diff[1]["shift_score"] == 100.0

    def test_paragraph_removed(self):
        old_text = "Retained paragraph.\n\nDeprecated paragraph about ceased joint venture."
        new_text = "Retained paragraph."

        diff = compute_text_diff(old_text, new_text)
        assert len(diff) == 2
        assert diff[0]["status"] == "unchanged"
        assert diff[1]["status"] == "removed"
        assert "Deprecated paragraph" in diff[1]["old_text"]
        assert diff[1]["new_text"] is None
        assert diff[1]["shift_score"] == 100.0

    def test_mixed_yoy_diff(self, sample_old_text: str, sample_new_text: str):
        diff = compute_text_diff(sample_old_text, sample_new_text)

        statuses = [b["status"] for b in diff]
        # Expect a mix of unchanged, modified, added, and removed
        assert "unchanged" in statuses
        assert "modified" in statuses
        assert "added" in statuses
        assert "removed" in statuses

        # Check that the AI risk paragraph was tagged as added
        ai_blocks = [b for b in diff if b.get("new_text") and "artificial intelligence" in b["new_text"]]
        assert len(ai_blocks) == 1
        assert ai_blocks[0]["status"] == "added"

        # Check that the legacy patent paragraph was tagged as removed
        patent_blocks = [b for b in diff if b.get("old_text") and "legacy patents" in b["old_text"]]
        assert len(patent_blocks) == 1
        assert patent_blocks[0]["status"] == "removed"

        # Materiality score should be moderate (between 10.0 and 80.0)
        score = diff[0]["materiality_score"]
        assert 10.0 <= score <= 80.0


class TestSummarizeVariance:
    def test_summarize_variance_fallback(self, sample_old_text: str, sample_new_text: str):
        diff = compute_text_diff(sample_old_text, sample_new_text)
        summary = summarize_variance(diff)

        assert "executive_summary" in summary
        assert "materiality_score" in summary
        assert "risk_posture_shift" in summary
        assert "top_strategic_changes" in summary

        changes = summary["top_strategic_changes"]
        assert len(changes) >= 1
        for change in changes:
            assert change["type"] in ("added", "removed", "modified")
            assert "theme" in change
            assert "analysis" in change
            assert "snippet_reference" in change
            assert len(change["snippet_reference"]) > 0

    @patch("backend.services.diff_engine.litellm.completion")
    def test_summarize_variance_with_mock_llm(
        self, mock_litellm, sample_old_text: str, sample_new_text: str
    ):
        mock_response = MagicMock()
        mock_payload = {
            "executive_summary": "Management aggressively shifted disclosure tone towards AI disruption and supply chain resilience.",
            "materiality_score": 38.5,
            "risk_posture_shift": "Defensive Technological Reorientation",
            "top_strategic_changes": [
                {
                    "type": "added",
                    "theme": "AI Disruption Risk",
                    "analysis": "Management added direct warning that rapid AI advancements could render product portfolio obsolete.",
                    "snippet_reference": "Rapid advancements in artificial intelligence...",
                },
                {
                    "type": "modified",
                    "theme": "Supply Chain Diversification",
                    "analysis": "Reduced Southeast Asian dependency from 65% to 45% while lifting North America to 55%.",
                    "snippet_reference": "Our primary supply chain operates through diversified suppliers...",
                },
            ],
        }
        mock_response.choices = [
            MagicMock(message=MagicMock(content=json.dumps(mock_payload)))
        ]
        mock_litellm.return_value = mock_response

        diff = compute_text_diff(sample_old_text, sample_new_text)
        result = summarize_variance(diff, api_key="sk-mock-key-for-test")

        assert mock_litellm.called
        call_kwargs = mock_litellm.call_args.kwargs
        # Verify Senior M&A / Equity Research Analyst persona prompt was sent
        messages = call_kwargs["messages"]
        assert any("Senior M&A and Equity Research Analyst" in m["content"] for m in messages)

        assert result["risk_posture_shift"] == "Defensive Technological Reorientation"
        assert len(result["top_strategic_changes"]) == 2
        assert result["top_strategic_changes"][0]["theme"] == "AI Disruption Risk"
