"use client";

import React, { useState, useRef } from "react";
import {
  Scale,
  ExternalLink,
  ArrowUpRight,
  Quote,
  Check,
  Copy,
  Building2,
  Shield,
} from "lucide-react";
import { FullSampleDealJson, CovenantAuditItem } from "@/types";

interface CovenantsViewProps {
  dealData: FullSampleDealJson;
  isLoading?: boolean;
}

export function CovenantsView({ dealData, isLoading = false }: CovenantsViewProps) {
  const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const documentViewerRef = useRef<HTMLDivElement>(null);

  const {
    dealMeta,
    valuationRibbon,
    covenantsAudit = [],
    documentViewer,
  } = dealData;

  const handleCovenantClick = (covenant: CovenantAuditItem) => {
    setActiveSnippetId(covenant.filingSnippetId);

    // Smooth scroll to the target snippet in Document Viewer
    if (documentViewerRef.current) {
      const targetEl = documentViewerRef.current.querySelector(`#${covenant.filingSnippetId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleCopyQuote = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCurrency = (val?: number | null) => {
    if (!val && val !== 0) return "N/A";
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 rounded-md bg-zinc-900/60 border border-zinc-800/80" />
        <div className="grid grid-cols-4 gap-3">
          <div className="h-24 rounded-md bg-zinc-900/60 border border-zinc-800/80" />
          <div className="h-24 rounded-md bg-zinc-900/60 border border-zinc-800/80" />
          <div className="h-24 rounded-md bg-zinc-900/60 border border-zinc-800/80" />
          <div className="h-24 rounded-md bg-zinc-900/60 border border-zinc-800/80" />
        </div>
        <div className="grid grid-cols-12 gap-4 h-[650px]">
          <div className="col-span-7 rounded-md bg-zinc-900/60 border border-zinc-800/80" />
          <div className="col-span-5 rounded-md bg-zinc-900/60 border border-zinc-800/80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Micro Metadata Banner */}
      <div className="flex flex-col gap-2 rounded-md border border-zinc-800/80 bg-zinc-950/60 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2.5 text-zinc-400">
          <span className="font-semibold text-zinc-100">
            {dealMeta.acquirer.name} / {dealMeta.target.name}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300">{dealMeta.transactionStructure}</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500">Announced {dealMeta.filingDate}</span>
        </div>

        {/* SEC Provenance Popover pill */}
        <div className="flex items-center space-x-3 text-[11px] text-zinc-400">
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-500">CIK:</span>
            <span className="text-zinc-300 font-semibold">{dealMeta.target.cik}</span>
          </div>
          <span className="text-zinc-700">•</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-500">ACC:</span>
            <span className="text-zinc-300">{dealMeta.accessionNumber}</span>
          </div>
          <span className="text-zinc-700">•</span>
          <a
            href={`https://www.sec.gov/edgar/browse/?CIK=${dealMeta.target.cik}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 inline-flex items-center space-x-0.5"
          >
            <span>{dealMeta.filingType}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Top Valuation Ribbon (4 Grid Cards, font-mono numbers from valuationRibbon) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 font-mono">
        {/* Card 1: Target Equity Value & Multiple */}
        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-wider">
            <span>Implied Equity Value</span>
            <span className="text-zinc-400 font-sans">ALL-CASH</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-zinc-100">
              {formatCurrency(valuationRibbon.impliedEquityValue)}
            </span>
            <span className="text-xs text-sky-400 font-semibold">
              ${valuationRibbon.offerPricePerShare.toFixed(2)} / sh
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Implied LTM EBITDA</span>
            <span className="text-zinc-300 font-medium">
              {valuationRibbon.impliedLtmEbitdaMultiple} (EV: {formatCurrency(valuationRibbon.impliedEnterpriseValue)})
            </span>
          </div>
        </div>

        {/* Card 2: Target Termination / Breakup Fee */}
        <div
          onClick={() => {
            const targetItem = covenantsAudit.find((c) => c.clauseType === "TARGET_TERMINATION_FEE");
            if (targetItem) handleCovenantClick(targetItem);
          }}
          className="group cursor-pointer rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3.5 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-900/90"
        >
          <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-wider">
            <span>Target Breakup Fee</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300">
              {valuationRibbon.targetBreakupFeePct}% of EV
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-zinc-100">
              ${(valuationRibbon.targetBreakupFeeUsd / 1e6).toLocaleString()}M
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-sky-400 transition" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Fiduciary Out Trigger</span>
            <span className="text-emerald-400 font-medium">Delaware Standard</span>
          </div>
        </div>

        {/* Card 3: Reverse Regulatory Termination Fee */}
        <div
          onClick={() => {
            const revItem = covenantsAudit.find((c) => c.clauseType === "REVERSE_TERMINATION_FEE");
            if (revItem) handleCovenantClick(revItem);
          }}
          className="group cursor-pointer rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3.5 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-900/90"
        >
          <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-wider">
            <span>Reverse Breakup Fee</span>
            <span className="rounded bg-rose-500/10 px-1.5 py-0.2 text-[10px] text-rose-400 border border-rose-500/20">
              Antitrust Risk
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-rose-300">
              {formatCurrency(valuationRibbon.reverseBreakupFeeInitialUsd)} – {formatCurrency(valuationRibbon.reverseBreakupFeeExtendedUsd)}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-sky-400 transition" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Extended Fee Band</span>
            <span className="text-zinc-300 font-medium">{valuationRibbon.reverseBreakupFeePct}% EV Max</span>
          </div>
        </div>

        {/* Card 4: Go-Shop Window & Matching Rights */}
        <div
          onClick={() => {
            const gsItem = covenantsAudit.find((c) => c.clauseType === "GO_SHOP_PROVISION");
            if (gsItem) handleCovenantClick(gsItem);
          }}
          className="group cursor-pointer rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3.5 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-900/90"
        >
          <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-wider">
            <span>Go-Shop Window</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300">
              Strict No-Shop
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-zinc-100">
              {valuationRibbon.goShopWindowDays} Days
            </span>
            <span className="text-xs text-sky-400 font-medium">
              {valuationRibbon.matchingRightsWindowDays}d Match Right
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Status</span>
            <span className="text-zinc-300 font-medium">{valuationRibbon.nonSolicitationStatus}</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Split View (60% Left Document Viewer, 40% Right Inspector) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* Left Panel: Definitive Merger Agreement Document Viewer (60%) */}
        <div className="lg:col-span-7 flex flex-col rounded-md border border-zinc-800/80 bg-[#0c0e14] shadow-md overflow-hidden">
          {/* Document Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-2 text-xs font-mono">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Building2 className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-semibold text-zinc-200 uppercase">
                {documentViewer.title}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-zinc-500">
              <span>{documentViewer.paragraphs.length} Clauses</span>
              <span>•</span>
              <span className="text-zinc-400">Verbatim SEC Text</span>
            </div>
          </div>

          {/* Document Scrolling Text Area */}
          <div
            ref={documentViewerRef}
            className="p-5 max-h-[640px] overflow-y-auto space-y-4 text-xs font-sans leading-relaxed text-zinc-300 select-text"
          >
            {documentViewer.paragraphs.map((para) => {
              const isHighlighted = activeSnippetId === para.id;

              return (
                <div
                  key={para.id}
                  id={para.id}
                  className={`rounded p-3 transition-all duration-300 ${
                    isHighlighted
                      ? "animate-flash-cyan border-l-2 border-sky-400 bg-sky-500/15 text-zinc-100 shadow-sm"
                      : "border-l-2 border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 font-mono text-[10px] text-zinc-500">
                    <span className="font-semibold text-sky-400">{para.sectionNumber}</span>
                    <span className="text-zinc-600">ID: {para.id}</span>
                  </div>
                  <p className="font-sans leading-relaxed text-xs text-zinc-200">
                    {para.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Structured Covenants Audit Inspector (40%) */}
        <div className="lg:col-span-5 flex flex-col rounded-md border border-zinc-800/80 bg-[#0c0e14] shadow-md overflow-hidden">
          {/* Inspector Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-2 text-xs font-mono">
            <div className="flex items-center space-x-2 text-zinc-200">
              <Scale className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-semibold text-zinc-100 uppercase">
                COVENANTS AUDIT & COMPLIANCE
              </span>
            </div>
            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono text-sky-400 border border-sky-500/20">
              {covenantsAudit.length} TERMS AUDITED
            </span>
          </div>

          {/* Extracted Covenants Cards List */}
          <div className="p-3 max-h-[640px] overflow-y-auto space-y-2.5">
            {covenantsAudit.map((covenant) => {
              const isSelected = activeSnippetId === covenant.filingSnippetId;

              return (
                <div
                  key={covenant.id}
                  id={`covenant-card-${covenant.id}`}
                  onClick={() => handleCovenantClick(covenant)}
                  className={`group cursor-pointer rounded-md border p-3 transition-all ${
                    isSelected
                      ? "border-sky-400/80 bg-zinc-900/95 shadow-md shadow-sky-950/20 ring-1 ring-sky-400/40"
                      : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80"
                  }`}
                >
                  {/* Top Tags & Confidence Badge */}
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                    <span className="text-zinc-400 font-semibold tracking-wide">
                      {covenant.sectionAnchor}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                        CONFIDENCE: {(covenant.confidenceScore * 100).toFixed(1)}%
                      </span>
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                        {covenant.verificationStatus}
                      </span>
                    </div>
                  </div>

                  {/* Covenant Title & Metric */}
                  <div className="flex items-baseline justify-between mb-1">
                    <h5 className="text-xs font-bold text-zinc-100 font-sans">
                      {covenant.title}
                    </h5>
                    <span className="font-mono text-xs font-semibold text-sky-300">
                      {covenant.primaryMetric}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500 mb-1.5">
                    {covenant.secondaryMetric}
                  </div>

                  {/* Summary */}
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed mb-2.5">
                    {covenant.summary}
                  </p>

                  {/* Verbatim Exact Quote */}
                  <div className="rounded border border-zinc-800/90 bg-[#08090c] p-2 text-[10px] font-mono text-zinc-300 relative group/quote">
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                      <span className="flex items-center space-x-1">
                        <Quote className="h-3 w-3 text-sky-400" />
                        <span>EXACT STATUTORY QUOTE:</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyQuote(covenant.exactQuote, covenant.id);
                        }}
                        className="hover:text-zinc-200 text-zinc-500 transition inline-flex items-center space-x-1"
                      >
                        {copiedId === covenant.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="line-clamp-2 italic text-zinc-300/90">
                      &ldquo;{covenant.exactQuote}&rdquo;
                    </p>
                  </div>

                  {/* Action Link to auto-scroll */}
                  <div className="mt-2 text-[10px] text-sky-400/80 font-mono flex items-center space-x-1 group-hover:text-sky-300">
                    <span>Click to inspect line anchor (#{covenant.filingSnippetId})</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Strategic Risk & MAE Assessment Ribbon */}
      <div className="rounded-md border border-zinc-800/80 bg-[#0c0e14] p-3 text-xs font-mono flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-2">
          <Shield className="h-3.5 w-3.5 text-sky-400 shrink-0" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500 uppercase tracking-wider text-[11px]">ANTITRUST LITIGATION POSTURE:</span>
            <span className="text-zinc-300 font-sans text-xs">FTC Administrative Law Judge review, UK CMA appeal & EC undertakings satisfied.</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0 text-[11px]">
          <div>
            <span className="text-zinc-500 mr-1.5">NON-SOLICITATION:</span>
            <span className="text-zinc-300 font-semibold">{valuationRibbon.nonSolicitationStatus}</span>
          </div>
          <span className="text-zinc-700">•</span>
          <div>
            <span className="text-zinc-500 mr-1.5">MATCH RIGHT:</span>
            <span className="text-sky-400 font-semibold">{valuationRibbon.matchingRightsWindowDays} Business Days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
