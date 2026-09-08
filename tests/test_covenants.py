"""Unit tests for structured M&A covenant extraction and Pydantic models."""

from unittest.mock import MagicMock, patch
import pytest
from pydantic import ValidationError

from backend.models.deal_covenants import (
    DealCovenants,
    DealParties,
    DealValuation,
    FullDealAnalysis,
)
from backend.services.covenant_extractor import (
    extract_covenants_from_filing,
    extract_full_deal_from_filing,
    find_merger_agreement_sections,
)


@pytest.fixture
def sample_merger_filing_text() -> str:
    return """
    ITEM 1.01 ENTRY INTO A MATERIAL DEFINITIVE AGREEMENT

    On September 1, 2024, Alpha Acquisition Corp. ("Parent"), a Delaware corporation,
    entered into an Agreement and Plan of Merger with Beta Technologies, Inc. ("Company").

    SECTION 5.04 NO SOLICITATION; GO-SHOP PERIOD
    During the period beginning on the date of this Agreement and continuing until 11:59 p.m.
    (New York City time) on the date that is 40 calendar days thereafter (the "Go-Shop Period"),
    the Company and its Representatives shall have the right to actively initiate, solicit and
    encourage alternative Acquisition Proposals. Following the expiration of the Go-Shop Period,
    the Company shall immediately cease all discussions.

    SECTION 5.05 MATCHING RIGHTS
    Prior to making an Adverse Recommendation Change, the Company shall provide Parent
    with written notice of the Superior Proposal and permit Parent a period of 4 business days
    to match any such unsolicited proposal or negotiate amendments to this Agreement.

    SECTION 7.03 TERMINATION FEES AND EXPENSES
    (a) In the event that the Merger Agreement is terminated by Parent pursuant to Section 7.01(d)
    (Company Board Adverse Recommendation Change), the Company shall pay to Parent a
    Company Termination Fee equal to $120,000,000 (which represents approximately 3.2% of the
    aggregate transaction equity value) in immediately available funds.

    (b) In the event that this Agreement is terminated by either party due to the failure to obtain
    required Antitrust Clearances or injunctions, Parent shall pay to the Company a
    Parent Termination Fee (Reverse Termination Fee) equal to $250,000,000.
    """.strip()


class TestDealCovenantsPydanticSchema:
    def test_missing_covenants_return_null_safely(self):
        """Verify that when covenants are not disclosed, fields evaluate to None safely without validation errors."""
        covenants = DealCovenants(
            exact_source_quote="The agreement does not provide for a breakup fee or go-shop period."
        )

        assert covenants.termination_fee_target_usd is None
        assert covenants.termination_fee_percent is None
        assert covenants.reverse_termination_fee_usd is None
        assert covenants.go_shop_period_days is None
        assert covenants.matching_rights_window_days is None
        assert covenants.exact_source_quote == "The agreement does not provide for a breakup fee or go-shop period."

        # Verify JSON serialization represents them as null
        data = covenants.model_dump()
        assert data["termination_fee_target_usd"] is None
        assert data["reverse_termination_fee_usd"] is None
        assert data["go_shop_period_days"] is None
        assert data["matching_rights_window_days"] is None

    def test_strict_validation_requires_exact_source_quote(self):
        """Verify that exact_source_quote is mandatory and raises ValidationError if omitted."""
        with pytest.raises(ValidationError):
            DealCovenants()  # Missing required exact_source_quote

    def test_extra_fields_forbidden(self):
        """Verify that extra unauthorized fields are forbidden by strict schema."""
        with pytest.raises(ValidationError):
            DealCovenants(
                exact_source_quote="Some quote",
                unauthorized_extra_field="invalid",
            )

    def test_deal_parties_validation(self):
        parties = DealParties(
            acquirer="Alpha Corp",
            target="Beta Inc",
            deal_type="cash",
        )
        assert parties.acquirer == "Alpha Corp"
        assert parties.target == "Beta Inc"
        assert parties.deal_type == "cash"

        # Test invalid deal_type literal
        with pytest.raises(ValidationError):
            DealParties(
                acquirer="Alpha Corp",
                target="Beta Inc",
                deal_type="crypto",  # invalid literal
            )

    def test_deal_valuation_optional_fields(self):
        val = DealValuation(
            enterprise_value=1_500_000_000.0,
            equity_value=1_200_000_000.0,
            implied_ebitda_multiple=14.5,
        )
        assert val.enterprise_value == 1_500_000_000.0
        assert val.equity_value == 1_200_000_000.0
        assert val.implied_ebitda_multiple == 14.5

        # All optional
        empty_val = DealValuation()
        assert empty_val.enterprise_value is None


class TestChunkedSectionSearch:
    def test_find_merger_agreement_sections(self, sample_merger_filing_text: str):
        # Create a document padded with unrelated filler paragraphs
        top_filler = "\n\n".join(
            [f"Top filler paragraph {i} discussing executive compensation and routine items." for i in range(25)]
        )
        bottom_filler = "\n\n".join(
            [f"Bottom filler paragraph {i} discussing routine governance matters." for i in range(25)]
        )
        full_filing = f"{top_filler}\n\n{sample_merger_filing_text}\n\n{bottom_filler}"

        isolated = find_merger_agreement_sections(full_filing, max_chars=10000)

        # Confirm the extracted chunk contains the essential merger clauses
        assert "TERMINATION FEES AND EXPENSES" in isolated
        assert "GO-SHOP PERIOD" in isolated
        assert "MATCHING RIGHTS" in isolated
        # Confirm that bulk unrelated filler was filtered out
        assert "Top filler paragraph 0" not in isolated
        assert "Bottom filler paragraph 24" not in isolated

    def test_find_merger_sections_empty(self):
        assert find_merger_agreement_sections("") == ""


class TestCovenantExtractorService:
    def test_extract_covenants_complete_filing(self, sample_merger_filing_text: str):
        covenants = extract_covenants_from_filing(sample_merger_filing_text)

        assert isinstance(covenants, DealCovenants)
        assert covenants.termination_fee_target_usd == 120_000_000.0
        assert covenants.termination_fee_percent == 3.2
        assert covenants.reverse_termination_fee_usd == 250_000_000.0
        assert covenants.go_shop_period_days == 40
        assert covenants.matching_rights_window_days == 4
        assert len(covenants.exact_source_quote) > 0

    def test_extract_covenants_partial_missing_returns_null(self):
        partial_text = """
        The Merger Agreement provides that in the event of termination under specified conditions,
        the Company will pay Parent a termination fee of $45,000,000.
        Neither party is subject to a reverse termination fee or go-shop provision.
        """
        covenants = extract_covenants_from_filing(partial_text)

        assert covenants.termination_fee_target_usd == 45_000_000.0
        assert covenants.reverse_termination_fee_usd is None
        assert covenants.go_shop_period_days is None
        assert covenants.matching_rights_window_days is None
        assert len(covenants.exact_source_quote) > 0

    def test_extract_covenants_empty_input(self):
        covenants = extract_covenants_from_filing("")
        assert covenants.termination_fee_target_usd is None
        assert covenants.exact_source_quote == "No merger agreement or covenant text available."

    @patch("backend.services.covenant_extractor.instructor.from_litellm")
    def test_extract_covenants_with_mock_instructor(
        self, mock_from_litellm, sample_merger_filing_text: str
    ):
        mock_client = MagicMock()
        mock_from_litellm.return_value = mock_client

        mock_result = DealCovenants(
            termination_fee_target_usd=120_000_000.0,
            termination_fee_percent=3.2,
            reverse_termination_fee_usd=250_000_000.0,
            go_shop_period_days=40,
            matching_rights_window_days=4,
            exact_source_quote="Company Termination Fee equal to $120,000,000",
        )
        mock_client.chat.completions.create.return_value = mock_result

        covenants = extract_covenants_from_filing(
            sample_merger_filing_text, api_key="sk-test-key"
        )

        assert mock_client.chat.completions.create.called
        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["response_model"] == DealCovenants
        assert covenants.termination_fee_target_usd == 120_000_000.0
        assert covenants.go_shop_period_days == 40

    def test_extract_full_deal(self, sample_merger_filing_text: str):
        full_deal = extract_full_deal_from_filing(sample_merger_filing_text)
        assert isinstance(full_deal, FullDealAnalysis)
        assert isinstance(full_deal.covenants, DealCovenants)
        assert full_deal.covenants.termination_fee_target_usd == 120_000_000.0
