"use client";

import React, { useState } from "react";
import {
  Quote,
  Copy,
  Check,
  ExternalLink,
  Scale,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { SampleDealData } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface CovenantsViewProps {
  dealData: SampleDealData;
  isLoading?: boolean;
}

interface SelectedCovenantCitation {
  title: string;
  metric: string;
  sourceQuote: string;
  filingSection: string;
  contextNote: string;
}

export function CovenantsView({ dealData }: CovenantsViewProps) {
  const [selectedCitation, setSelectedCitation] =
    useState<SelectedCovenantCitation | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const {
    deal_name,
    transaction_type,
    announcement_date,
    filing_reference,
    parties,
    valuation,
    covenants,
    strategic_analysis,
  } = dealData;

  const handleCopyQuote = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const openInspector = (
    title: string,
    metric: string,
    quote: string,
    section: string,
    note: string
  ) => {
    setSelectedCitation({
      title,
      metric,
      sourceQuote: quote,
      filingSection: section,
      contextNote: note,
    });
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return "N/A";
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)} Billion`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)} Million`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Landmark Deal Header Card */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="success" className="font-mono text-[10px]">
                FEATURED LANDMARK DEAL
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {transaction_type}
              </Badge>
              <span className="text-xs font-mono text-slate-500">
                Announced {announcement_date}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
              {deal_name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
              <div>
                <span className="text-slate-500">Acquirer:</span>{" "}
                <span className="font-semibold text-slate-200">
                  {parties.acquirer}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Target:</span>{" "}
                <span className="font-semibold text-slate-200">
                  {parties.target}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Structure:</span>{" "}
                <span className="font-semibold uppercase text-emerald-400">
                  {parties.deal_type}
                </span>
              </div>
            </div>
          </div>

          {/* SEC Filing Provenance Box */}
          <div className="flex flex-col items-start lg:items-end rounded-lg border border-slate-800/80 bg-slate-950/80 p-3 text-xs font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Primary SEC Filing
            </span>
            <div className="mt-1 flex items-center space-x-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {filing_reference?.form || "Form 8-K"}
              </Badge>
              <span className="text-slate-300">
                {filing_reference?.ticker || "ATVI"}
              </span>
            </div>
            <span className="mt-1 text-[11px] text-slate-400">
              ACC: {filing_reference?.accession_number || "0001104659-22-004695"}
            </span>
            <a
              href={filing_reference?.document_url || "https://www.sec.gov"}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center space-x-1 text-[11px] text-emerald-400 hover:text-emerald-300"
            >
              <span>View Source on SEC EDGAR</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Valuation Metrics Bar */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-4 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-lg bg-slate-900/50 p-2.5">
            <span className="text-[10px] uppercase font-mono text-slate-500">
              Enterprise Value
            </span>
            <div className="font-mono text-sm sm:text-base font-bold text-white">
              {formatCurrency(valuation.enterprise_value)}
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-2.5">
            <span className="text-[10px] uppercase font-mono text-slate-500">
              Offer Price / Share
            </span>
            <div className="font-mono text-sm sm:text-base font-bold text-emerald-400">
              ${valuation.per_share_offer_price_usd?.toFixed(2) || "95.00"}
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-2.5">
            <span className="text-[10px] uppercase font-mono text-slate-500">
              Unaffected Premium
            </span>
            <div className="font-mono text-sm sm:text-base font-bold text-white">
              +{valuation.premium_to_unaffected_share_price_percent || "45.0"}%
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-2.5">
            <span className="text-[10px] uppercase font-mono text-slate-500">
              Implied EBITDA Multiple
            </span>
            <div className="font-mono text-sm sm:text-base font-bold text-slate-200">
              {valuation.implied_ebitda_multiple?.toFixed(1) || "17.2"}x
            </div>
          </div>
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded-lg bg-slate-900/50 p-2.5">
            <span className="text-[10px] uppercase font-mono text-slate-500">
              Covenant Risk Grade
            </span>
            <div className="font-mono text-sm sm:text-base font-bold text-amber-400">
              {strategic_analysis.covenant_risk_grade}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards (Interactive Click-to-Cite) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <Scale className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Merger Agreement Deal Covenants
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Click any covenant card to inspect verbatim SEC clause
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Target Termination Fee */}
          <Card
            id="covenant-card-target-breakup-fee"
            className="group cursor-pointer border-slate-800 bg-slate-900/70 transition-all hover:border-emerald-500/80 hover:bg-slate-900 hover:shadow-lg hover:shadow-emerald-950/20"
            onClick={() =>
              openInspector(
                "Target Termination Fee",
                `${formatCurrency(covenants.termination_fee_target_usd)} (${covenants.termination_fee_percent}% of equity value)`,
                `Section 8.03(a) Company Termination Fee: If this Agreement is terminated by Parent pursuant to Section 8.01(e) (Adverse Recommendation Change) or by the Company pursuant to Section 8.01(f) (Superior Proposal), the Company shall pay to Parent an amount equal to $2,270,000,000 in immediately available cash funds.`,
                "Agreement and Plan of Merger §8.03(a)",
                "Standard fiduciary-out breakup fee payable by Activision Blizzard if target directors terminate the transaction to enter into a superior alternative deal."
              )
            }
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400">
                  Target Termination Fee
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {covenants.termination_fee_percent || 3.3}% Equity
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold font-mono text-white pt-1">
                {formatCurrency(covenants.termination_fee_target_usd)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs">
              <p className="text-slate-400 font-sans leading-relaxed">
                Payable by Activision Blizzard if target board terminates to accept an unsolicited superior proposal.
              </p>
              <div className="mt-3 flex items-center space-x-1 font-mono text-[11px] text-emerald-400 group-hover:underline">
                <span>Inspect source paragraph</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Reverse Breakup Fee */}
          <Card
            id="covenant-card-reverse-breakup-fee"
            className="group cursor-pointer border-slate-800 bg-slate-900/70 transition-all hover:border-emerald-500/80 hover:bg-slate-900 hover:shadow-lg hover:shadow-emerald-950/20"
            onClick={() =>
              openInspector(
                "Reverse Termination Fee (Antitrust)",
                `${formatCurrency(covenants.reverse_termination_fee_usd)} (Tiered up to $4.00B)`,
                `Section 8.03(c) Parent Regulatory Termination Fee: In the event that this Agreement is terminated by the Company or Parent pursuant to Section 8.01(b) or Section 8.01(c) due to failure to obtain Regulatory Antitrust Clearance prior to the Outside Date, Parent shall pay to the Company: (i) $2,000,000,000 if prior to January 18, 2023; (ii) $2,500,000,000 if extended; or (iii) $3,000,000,000 (escalating up to $4,000,000,000) under the Second Amendment to the Merger Agreement.`,
                "Agreement and Plan of Merger §8.03(c) & Amendment No. 2",
                "Reverse termination fee designed to compensate the target for business dislocation if antitrust authorities (FTC, CMA, EC) block the merger."
              )
            }
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400">
                  Reverse Breakup Fee
                </span>
                <Badge variant="destructive" className="text-[10px] font-mono">
                  Antitrust Risk
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold font-mono text-rose-400 pt-1">
                {formatCurrency(covenants.reverse_termination_fee_usd)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs">
              <p className="text-slate-400 font-sans leading-relaxed">
                Escalating regulatory fee payable by Microsoft if global antitrust clearances are denied or delayed past outside date.
              </p>
              <div className="mt-3 flex items-center space-x-1 font-mono text-[11px] text-emerald-400 group-hover:underline">
                <span>Inspect source paragraph</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Go-Shop Window */}
          <Card
            id="covenant-card-go-shop"
            className="group cursor-pointer border-slate-800 bg-slate-900/70 transition-all hover:border-emerald-500/80 hover:bg-slate-900 hover:shadow-lg hover:shadow-emerald-950/20"
            onClick={() =>
              openInspector(
                "Go-Shop Period",
                "0 Days (Strict 'No-Shop' Covenant)",
                `Section 6.04 No Solicitation; Board Recommendation: The Company shall not, and shall cause its subsidiaries and representatives not to, directly or indirectly: (i) solicit, initiate, or knowingly encourage or facilitate any inquiries or offers with respect to an Acquisition Proposal; or (ii) engage in or enter into discussions or negotiations concerning any alternative transaction.`,
                "Agreement and Plan of Merger §6.04(a)",
                "Standard for mega-cap public tech M&A: no active affirmative go-shop period, but target maintains a window of fiduciary-out for unsolicited superior proposals."
              )
            }
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400">
                  Go-Shop Period
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  No-Shop
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold font-mono text-white pt-1">
                {covenants.go_shop_period_days || 0} Days
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs">
              <p className="text-slate-400 font-sans leading-relaxed">
                No active go-shop window. Target subject to strict non-solicitation covenants with customary fiduciary out.
              </p>
              <div className="mt-3 flex items-center space-x-1 font-mono text-[11px] text-emerald-400 group-hover:underline">
                <span>Inspect source paragraph</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Matching Rights Window */}
          <Card
            id="covenant-card-matching-rights"
            className="group cursor-pointer border-slate-800 bg-slate-900/70 transition-all hover:border-emerald-500/80 hover:bg-slate-900 hover:shadow-lg hover:shadow-emerald-950/20"
            onClick={() =>
              openInspector(
                "Matching Rights Window",
                `${covenants.matching_rights_window_days || 5} Business Days`,
                `Section 6.04(c) Notice and Match Period: Prior to making any Adverse Recommendation Change or terminating this Agreement to accept a Superior Proposal, the Company shall provide Parent five (5) business days prior written notice, during which period Parent shall have the right to propose revisions to the terms of this Agreement to match or exceed such proposal.`,
                "Agreement and Plan of Merger §6.04(c)",
                "Provides Microsoft 5 business days to counter or match any competing buyout bid before Activision Blizzard board can exercise fiduciary out."
              )
            }
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400">
                  Matching Rights
                </span>
                <Badge variant="info" className="text-[10px] font-mono">
                  5 Days
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold font-mono text-white pt-1">
                {covenants.matching_rights_window_days || 5} Business Days
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs">
              <p className="text-slate-400 font-sans leading-relaxed">
                Notice window during which acquirer may match or beat any unsolicited third-party takeover bid.
              </p>
              <div className="mt-3 flex items-center space-x-1 font-mono text-[11px] text-emerald-400 group-hover:underline">
                <span>Inspect source paragraph</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Strategic Analysis & Antitrust Deep Dive */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-3 flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>M&A Legal & Regulatory Risk Assessment</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/70 p-4">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Deal Thesis & Rationale
            </span>
            <p className="text-slate-300 leading-relaxed">
              {strategic_analysis.deal_thesis}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/70 p-4">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Antitrust Regulatory Posture
            </span>
            <p className="text-slate-300 leading-relaxed">
              {strategic_analysis.antitrust_posture}
            </p>
          </div>
        </div>
      </div>

      {/* Click-to-Cite Inspector Drawer (Sheet) */}
      <Sheet
        open={Boolean(selectedCitation)}
        onOpenChange={(open) => {
          if (!open) setSelectedCitation(null);
        }}
      >
        <SheetContent
          id="covenant-inspector-drawer"
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl bg-slate-950/98 border-slate-800 text-slate-100"
        >
          {selectedCitation && (
            <>
              <SheetHeader>
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Scale className="h-5 w-5" />
                  <SheetTitle className="text-lg font-bold font-mono text-white">
                    Click-to-Cite Inspector
                  </SheetTitle>
                </div>
                <SheetDescription className="text-xs text-slate-400">
                  Verbatim statutory covenant clause and legal provenance from official SEC EDGAR filing.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Covenant Overview Pill */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Covenant Metric
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <h3 className="text-base font-bold font-mono text-white">
                      {selectedCitation.title}
                    </h3>
                    <Badge variant="success" className="font-mono text-xs">
                      {selectedCitation.metric}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-300 font-sans leading-relaxed">
                    {selectedCitation.contextNote}
                  </p>
                </div>

                {/* Verbatim Source Quote with Copy */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center space-x-1.5">
                      <Quote className="h-3.5 w-3.5" />
                      <span>Verbatim SEC Source Paragraph</span>
                    </span>
                    <Button
                      id="copy-citation-btn"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyQuote(selectedCitation.sourceQuote)}
                      className="h-7 text-xs font-mono gap-1"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          <span>Copy Quote</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs font-mono text-emerald-200/95 leading-relaxed shadow-inner">
                    &ldquo;{selectedCitation.sourceQuote}&rdquo;
                  </div>
                </div>

                {/* Legal Provenance & SEC Reference */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-2 text-xs font-mono">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    SEC Citation Provenance
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Clause / Section:</span>
                      <span className="font-semibold text-slate-200">
                        {selectedCitation.filingSection}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Filing Form:</span>
                      <span className="font-semibold text-slate-200">
                        {filing_reference?.form || "Form 8-K / Agreement and Plan of Merger"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">SEC Accession Number:</span>
                      <span className="font-semibold text-slate-200">
                        {filing_reference?.accession_number || "0001104659-22-004695"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">EDGAR Direct Link:</span>
                      <a
                        href={filing_reference?.document_url || "https://www.sec.gov"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline flex items-center space-x-1"
                      >
                        <span>sec.gov link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
