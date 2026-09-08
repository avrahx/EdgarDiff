"""Pydantic schemas for M&A deal structures, valuations, and covenants."""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class DealParties(BaseModel):
    """Parties involved in the M&A transaction and consideration structure."""

    model_config = ConfigDict(extra="forbid")

    acquirer: str = Field(..., description="Name of acquiring entity or parent buyer")
    target: str = Field(..., description="Name of acquired or merged target company")
    deal_type: Literal["cash", "stock", "mix", "unknown"] = Field(
        default="unknown",
        description="Type of consideration: all-cash, all-stock, mixed, or unknown",
    )


class DealValuation(BaseModel):
    """Valuation metrics and implied deal transaction multiples."""

    model_config = ConfigDict(extra="forbid")

    enterprise_value: Optional[float] = Field(
        default=None,
        description="Total Enterprise Value (TEV) in USD if disclosed",
    )
    equity_value: Optional[float] = Field(
        default=None,
        description="Aggregate equity purchase price / market cap in USD",
    )
    implied_ebitda_multiple: Optional[float] = Field(
        default=None,
        description="Implied EV/EBITDA transaction multiple if disclosed or computed",
    )


class DealCovenants(BaseModel):
    """M&A deal protection covenants, deal break fees, and window rights."""

    model_config = ConfigDict(extra="forbid")

    termination_fee_target_usd: Optional[float] = Field(
        default=None,
        description="Target company termination fee in USD payable to acquirer upon deal break",
    )
    termination_fee_percent: Optional[float] = Field(
        default=None,
        description="Target termination fee expressed as a percentage of equity deal value",
    )
    reverse_termination_fee_usd: Optional[float] = Field(
        default=None,
        description="Reverse termination fee in USD payable by acquirer (regulatory/financing break fee)",
    )
    go_shop_period_days: Optional[int] = Field(
        default=None,
        description="Duration of go-shop window in calendar days permitting active third-party solicitation",
    )
    matching_rights_window_days: Optional[int] = Field(
        default=None,
        description="Window in business days granted to acquirer to match superior unsolicited proposals",
    )
    exact_source_quote: str = Field(
        ...,
        description="Mandatory verbatim quote from the merger agreement or filing documenting covenants",
    )


class FullDealAnalysis(BaseModel):
    """Unified container representing comprehensive M&A transaction extraction."""

    model_config = ConfigDict(extra="forbid")

    parties: Optional[DealParties] = Field(
        default=None, description="Parties and consideration type"
    )
    valuation: Optional[DealValuation] = Field(
        default=None, description="Valuation and financial multiples"
    )
    covenants: DealCovenants = Field(
        ..., description="Extracted merger covenants and breakup provisions"
    )
