export type DiffStatus = "unchanged" | "modified" | "added" | "removed";

export interface DiffBlock {
  status: DiffStatus;
  old_text: string | null;
  new_text: string | null;
  similarity: number;
  shift_score: number;
  materiality_score?: number;
}

export interface StrategicChange {
  type: "added" | "removed" | "modified";
  theme: string;
  analysis: string;
  snippet_reference: string;
}

export interface VarianceSummary {
  executive_summary: string;
  materiality_score: number;
  risk_posture_shift: string;
  top_strategic_changes: StrategicChange[];
}

export interface DiffResponse {
  ticker: string;
  form_type: string;
  section: string;
  year_1: number;
  year_2: number;
  materiality_score: number;
  variance_summary: VarianceSummary;
  diff_blocks: DiffBlock[];
}

export interface DealParties {
  acquirer: string;
  target: string;
  deal_type: "cash" | "stock" | "mix" | "unknown";
}

export interface DealValuation {
  enterprise_value?: number | null;
  equity_value?: number | null;
  implied_ebitda_multiple?: number | null;
  per_share_offer_price_usd?: number | null;
  premium_to_unaffected_share_price_percent?: number | null;
}

export interface DealCovenants {
  termination_fee_target_usd?: number | null;
  termination_fee_percent?: number | null;
  reverse_termination_fee_usd?: number | null;
  go_shop_period_days?: number | null;
  matching_rights_window_days?: number | null;
  exact_source_quote: string;
}

export interface SampleDealData {
  deal_name: string;
  transaction_type: string;
  announcement_date: string;
  filing_reference: {
    form: string;
    ticker: string;
    accession_number: string;
    filing_date: string;
    document_url: string;
  };
  parties: DealParties;
  valuation: DealValuation;
  covenants: DealCovenants;
  strategic_analysis: {
    deal_thesis: string;
    antitrust_posture: string;
    covenant_risk_grade: string;
  };
  status: string;
  cached: boolean;
}
