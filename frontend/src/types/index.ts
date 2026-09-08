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
  similarity?: number;
  shift_score?: number;
  materiality_score?: number;
  word_diffs?: WordDiff[];
  diff_analysis?: string;
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
  year_1: number | string;
  year_2: number | string;
  materiality_score: number;
  introduced_risk_count?: number;
  omitted_clause_count?: number;
  unchanged_clause_count?: number;
  variance_summary: VarianceSummary;
  diff_blocks: DiffBlock[];
}

// -----------------------------------------------------------------------------
// Exact M&A Sample Dataset Types (from sampleDeal.json)
// -----------------------------------------------------------------------------

export interface DealMeta {
  dealId: string;
  acquirer: {
    name: string;
    ticker: string;
    cik: string;
  };
  target: {
    name: string;
    ticker: string;
    cik: string;
  };
  filingType: string;
  accessionNumber: string;
  filingDate: string;
  transactionStructure: string;
}

export interface ValuationRibbon {
  offerPricePerShare: number;
  impliedEquityValue: number;
  impliedEnterpriseValue: number;
  impliedLtmEbitdaMultiple: string;
  targetBreakupFeeUsd: number;
  targetBreakupFeePct: number;
  reverseBreakupFeeInitialUsd: number;
  reverseBreakupFeeExtendedUsd: number;
  reverseBreakupFeePct: number;
  goShopWindowDays: number;
  nonSolicitationStatus: string;
  matchingRightsWindowDays: number;
}

export interface CovenantAuditItem {
  id: string;
  clauseType: string;
  title: string;
  confidenceScore: number; // e.g. 0.994
  verificationStatus: string; // e.g. "VERIFIED_SEC_CITATION"
  primaryMetric: string;
  secondaryMetric: string;
  sectionAnchor: string;
  summary: string;
  exactQuote: string;
  filingSnippetId: string;
}

export interface DocumentViewerParagraph {
  id: string;
  sectionNumber: string;
  text: string;
}

export interface DocumentViewer {
  title: string;
  paragraphs: DocumentViewerParagraph[];
}

export interface YoYDiffBlock {
  id: string;
  status: "modified" | "added" | "removed" | "unchanged";
  materiality?: string;
  priorYearText: string;
  currentYearText: string;
  diffAnalysis?: string;
}

export interface YoYSectionDiff {
  filingPeriod: string;
  comparisonLabel: string;
  metrics: {
    netShiftScore: number;
    introducedRiskTopicsCount: number;
    omittedClausesCount: number;
    materialityClassification: string;
  };
  aiSynthesis: {
    executiveSummary: string;
    keyFindings: string[];
  };
  diffBlocks: YoYDiffBlock[];
}

export interface FullSampleDealJson {
  dealMeta: DealMeta;
  valuationRibbon: ValuationRibbon;
  covenantsAudit: CovenantAuditItem[];
  documentViewer: DocumentViewer;
  yoySectionDiff: YoYSectionDiff;
}

export type SampleDealData = FullSampleDealJson | Record<string, unknown>;

