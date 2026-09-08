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
import { SampleDealData, StructuredCovenantItem } from "@/types";

interface CovenantsViewProps {
  dealData: SampleDealData;
  isLoading?: boolean;
}

export function CovenantsView({ dealData, isLoading = false }: CovenantsViewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const leftViewerRef = useRef<HTMLDivElement>(null);

  const {
    deal_name,
    transaction_type,
    announcement_date,
    filing_reference,
    parties,
    valuation,
    covenants,
    structured_covenants = [],
    agreement_sections = [],
    strategic_analysis,
  } = dealData;

  const handleCovenantClick = (covenant: StructuredCovenantItem) => {
    setActiveAnchor(covenant.id);

    // Smooth scroll in left document viewer
    if (leftViewerRef.current) {
      const targetEl = leftViewerRef.current.querySelector(`#${covenant.id}`);
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
    if (!val) return "N/A";
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
          <span className="font-semibold text-zinc-100">{deal_name}</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300">{transaction_type}</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500">Announced {announcement_date}</span>
        </div>

        {/* SEC Provenance Popover pill */}
        <div className="flex items-center space-x-3 text-[11px] text-zinc-400">
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-500">CIK:</span>
            <span className="text-zinc-300 font-semibold">{filing_reference?.target_cik || "0000718877"}</span>
          </div>
          <span className="text-zinc-700">•</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-500">ACC:</span>
            <span className="text-zinc-300">{filing_reference?.accession_number || "0001104659-22-004695"}</span>
          </div>
          <span className="text-zinc-700">•</span>
          <a
            href={filing_reference?.document_url || "https://www.sec.gov"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 inline-flex items-center space-x-0.5"
          >
            <span>EDGAR</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Top Summary KPI Ribbon (4 Grid Cards, font-mono numbers) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 font-mono">
        {/* KPI 1: Target Equity Value & Multiple */}
        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-wider">
            <span>Target Equity Value</span>
            <span className="text-zinc-400 font-sans">{parties.deal_type.toUpperCase()}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-zinc-100">
              {formatCurrency(valuation.enterprise_value)}
            </span>
            <span className="text-xs text-sky-400 font-semibold">
              ${valuation.per_share_offer_price_usd?.toFixed(2) || "95.00"} / sh
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Implied EBITDA Multiple</span>
            <span className="text-zinc-300 font-medium">
              {valuation.implied_ebitda_multiple?.toFixed(1) || "17.2"}x
            </span>
          </div>
        </div>

        {/* KPI 2: Target Termination Fee */}
        <div
          onClick={() => {
            const targetItem = structured_covenants.find((c) => c.category === "breakup");
            if (targetItem) handleCovenantClick(targetItem);
          }}
          className="group cursor-pointer rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3.5 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-900/90"
        >
          <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-wider">
            <span>Target Termination Fee</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300">
              {covenants.termination_fee_percent || 3.3}% EV
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-zinc-100">
              {formatCurrency(covenants.termination_fee_target_usd)}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-sky-400 transition" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Fiduciary Out Standard</span>
            <span className="text-emerald-400 font-medium">Revlon Compliant</span>
          </div>
        </div>

        {/* KPI 3: Reverse Regulatory Termination Fee */}
        <div
          onClick={() => {
            const revItem = structured_covenants.find((c) => c.category === "reverse_breakup");
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
              {formatCurrency(covenants.reverse_termination_fee_usd)}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-sky-400 transition" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Escalation Band</span>
            <span className="text-zinc-300 font-medium">Up to $4.00B</span>
          </div>
        </div>

        {/* KPI 4: Go-Shop & Matching Rights Window */}
        <div
          onClick={() => {
            const gsItem = structured_covenants.find((c) => c.category === "solicitation");
            if (gsItem) handleCovenantClick(gsItem);
          }}
          className="group cursor-pointer rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3.5 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-900/90"
        >
          <div className="flex items-center justify-between text-[11px] text-zinc-500 uppercase tracking-wider">
            <span>Go-Shop / Solicitation</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-300">
              Strict No-Shop
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-zinc-100">
              {covenants.go_shop_period_days || 0} Days
            </span>
            <span className="text-xs text-sky-400 font-medium">
              {covenants.matching_rights_window_days || 5}d Match
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Fiduciary Window</span>
            <span className="text-zinc-300 font-medium">Active Fiduciary Out</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Split View (60% Left Document Viewer, 40% Right Inspector) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* Left Panel: Definitive Merger Agreement Text Viewer (60%) */}
        <div className="lg:col-span-7 flex flex-col rounded-md border border-zinc-800/80 bg-[#0c0e14] shadow-md overflow-hidden">
          {/* Document Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-2 text-xs font-mono">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Building2 className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-semibold text-zinc-200">
                EXHIBIT 2.1: AGREEMENT AND PLAN OF MERGER
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-zinc-500">
              <span>DEFM14A / Form 8-K Source</span>
              <span>•</span>
              <span className="text-zinc-400">Verbatim SEC Text</span>
            </div>
          </div>

          {/* Document Scrolling Text Area */}
          <div
            ref={leftViewerRef}
            className="p-5 max-h-[640px] overflow-y-auto space-y-6 text-xs font-sans leading-relaxed text-zinc-300 select-text"
          >
            {agreement_sections.map((section) => (
              <div key={section.id} className="space-y-3">
                <div className="border-b border-zinc-800/60 pb-1.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-sky-400 font-semibold">
                    {section.section_number}
                  </span>
                  <h4 className="text-xs font-mono font-bold text-zinc-200 mt-0.5">
                    {section.title}
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {section.paragraphs.map((para) => {
                    const isAnchor = para.is_covenant_anchor;
                    const isActive = activeAnchor === para.id;

                    return (
                      <div
                        key={para.id}
                        id={para.id}
                        className={`rounded p-2.5 transition-all duration-300 ${
                          isActive
                            ? "animate-flash-cyan border-l-2 border-sky-400 bg-sky-500/15 text-zinc-100 shadow-sm"
                            : isAnchor
                            ? "border-l-2 border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60"
                            : "text-zinc-400"
                        }`}
                      >
                        <p className="font-sans leading-relaxed text-xs">
                          {para.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Structured Covenants & Compliance Audit Inspector (40%) */}
        <div className="lg:col-span-5 flex flex-col rounded-md border border-zinc-800/80 bg-[#0c0e14] shadow-md overflow-hidden">
          {/* Inspector Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-2 text-xs font-mono">
            <div className="flex items-center space-x-2 text-zinc-200">
              <Scale className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-semibold text-zinc-100">
                STRUCTURED COVENANTS & COMPLIANCE
              </span>
            </div>
            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono text-sky-400 border border-sky-500/20">
              {structured_covenants.length} TERMS EXTRACTED
            </span>
          </div>

          {/* Extracted Covenants Cards List */}
          <div className="p-3 max-h-[640px] overflow-y-auto space-y-2.5">
            {structured_covenants.map((covenant) => {
              const isSelected = activeAnchor === covenant.id;

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
                      {covenant.sec_section}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                        CONFIDENCE: {covenant.confidence_score}%
                      </span>
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                        VERIFIED SEC
                      </span>
                    </div>
                  </div>

                  {/* Covenant Title & Metric */}
                  <div className="flex items-baseline justify-between mb-1">
                    <h5 className="text-xs font-bold text-zinc-100 font-sans">
                      {covenant.name}
                    </h5>
                    <span className="font-mono text-xs font-semibold text-sky-300">
                      {covenant.metric}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed mb-2.5">
                    {covenant.summary}
                  </p>

                  {/* Verbatim Statutory Quote Snippet */}
                  <div className="rounded border border-zinc-800/90 bg-[#08090c] p-2 text-[10px] font-mono text-zinc-300 relative group/quote">
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                      <span className="flex items-center space-x-1">
                        <Quote className="h-3 w-3 text-sky-400" />
                        <span>STATUTORY QUOTE:</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyQuote(covenant.statutory_quote, covenant.id);
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
                      &ldquo;{covenant.statutory_quote}&rdquo;
                    </p>
                  </div>

                  {/* Risk Implication */}
                  <div className="mt-2 text-[10px] text-zinc-500 font-sans flex items-start space-x-1">
                    <span className="text-zinc-400 font-medium">Implication:</span>
                    <span className="text-zinc-400 leading-tight">
                      {covenant.risk_implication}
                    </span>
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
            <span className="text-zinc-500 uppercase tracking-wider text-[11px]">ANTITRUST POSTURE:</span>
            <span className="text-zinc-300 font-sans text-xs">{strategic_analysis.antitrust_posture}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0 text-[11px]">
          <div>
            <span className="text-zinc-500 mr-1.5">MAE THRESHOLD:</span>
            <span className="text-zinc-300 font-semibold">{strategic_analysis.mae_standard}</span>
          </div>
          <span className="text-zinc-700">•</span>
          <div>
            <span className="text-zinc-500 mr-1.5">COVENANT GRADE:</span>
            <span className="text-amber-400 font-semibold">{strategic_analysis.covenant_risk_grade}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
