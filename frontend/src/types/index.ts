export type DiffStatus = "unchanged" | "modified" | "added" | "removed";

export interface WordDiff {
  type: "same" | "add" | "delete";
  text: string;
}

export interface DiffBlock {
  id?: string;
  status: DiffStatus;
  old_text: string | null;
  new_text: string | null;
  old_para_num?: number;
  new_para_num?: number;
  similarity: number;
  shift_score: number;
  materiality_score?: number;
  word_diffs?: WordDiff[];
}

export interface StrategicChange {
  type: "added" | "removed" | "modified";
  theme: string;
  analysis: string;
  snippet_reference: string;
}

export interface AnomalyFlag {
  category: "Footnote" | "Liquidity" | "Contingency" | "Accounting Policy";
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

export interface VarianceSummary {
  executive_summary: string;
  materiality_score: number;
  risk_posture_shift: string;
  top_strategic_changes: StrategicChange[];
  anomaly_flags?: AnomalyFlag[];
}

export interface DiffResponse {
  ticker: string;
  form_type: string;
  section: string;
  year_1: number;
  year_2: number;
  materiality_score: number;
  introduced_risk_count?: number;
  omitted_clause_count?: number;
  unchanged_clause_count?: number;
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

export interface StructuredCovenantItem {
  id: string; // DOM anchor id, e.g. "clause-target-breakup"
  name: string;
  metric: string;
  category: "breakup" | "reverse_breakup" | "solicitation" | "matching" | "mae" | "regulatory";
  confidence_score: number; // e.g. 99.4
  sec_section: string;
  summary: string;
  statutory_quote: string;
  risk_implication: string;
}

export interface MergerAgreementSection {
  id: string; // DOM id to scroll to
  section_number: string;
  title: string;
  paragraphs: {
    id: string;
    text: string;
    is_covenant_anchor?: boolean;
    covenant_ref?: string;
  }[];
}

export interface SampleDealData {
  deal_name: string;
  transaction_type: string;
  announcement_date: string;
  filing_reference: {
    form: string;
    ticker: string;
    target_cik: string;
    acquirer_cik: string;
    accession_number: string;
    filing_date: string;
    acceptance_timestamp: string;
    document_url: string;
  };
  parties: DealParties;
  valuation: DealValuation;
  covenants: DealCovenants;
  structured_covenants: StructuredCovenantItem[];
  agreement_sections: MergerAgreementSection[];
  strategic_analysis: {
    deal_thesis: string;
    antitrust_posture: string;
    covenant_risk_grade: string;
    mae_standard: string;
  };
  status: string;
  cached: boolean;
}
