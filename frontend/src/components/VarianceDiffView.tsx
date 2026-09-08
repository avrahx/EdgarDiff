"use client";

import React, { useState } from "react";
import {
  Sparkles,
} from "lucide-react";
import { DiffResponse, YoYSectionDiff } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MarkdownContent } from "@/components/MarkdownContent";

interface VarianceDiffViewProps {
  data?: DiffResponse;
  yoyData?: YoYSectionDiff;
  activeSection: string;
  onSectionChange: (section: string) => void;
  isLoading?: boolean;
}

const SECTION_OPTIONS = [
  { key: "item_7", label: "Item 7: MD&A" },
  { key: "item_1a", label: "Item 1A: Risk Factors" },
  { key: "item_8", label: "Item 8: Financial Statements" },
];

export function VarianceDiffView({
  data,
  yoyData,
  activeSection,
  onSectionChange,
  isLoading = false,
}: VarianceDiffViewProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "changes_only">("all");

  // Normalized values prioritizing yoyData (from sampleDeal.json) if present
  const comparisonLabel = yoyData?.comparisonLabel || (data ? `FY ${data.year_1} vs. FY ${data.year_2} Form 10-K` : "FY 2022 vs. FY 2023 Form 10-K");
  const filingPeriod = yoyData?.filingPeriod || (data ? `${data.ticker} (${data.section.toUpperCase()})` : "Item 7: MD&A");
  const netShiftScore = yoyData?.metrics?.netShiftScore ?? data?.materiality_score ?? 42.8;
  const introducedCount = yoyData?.metrics?.introducedRiskTopicsCount ?? data?.introduced_risk_count ?? 5;
  const omittedCount = yoyData?.metrics?.omittedClausesCount ?? data?.omitted_clause_count ?? 3;
  const unchangedCount = data?.unchanged_clause_count ?? 18;
  const materialityClassification = yoyData?.metrics?.materialityClassification || (netShiftScore > 40 ? "HIGH_GOVERNANCE_AND_ANTITRUST_SHIFT" : "MODERATE_NARRATIVE_EVOLUTION");

  const executiveSummary =
    yoyData?.aiSynthesis?.executiveSummary ||
    data?.variance_summary?.executive_summary ||
    "Management narrative reflects a critical strategic pivot across regulatory defense and live service monetization.";

  const keyFindings =
    yoyData?.aiSynthesis?.keyFindings ||
    data?.variance_summary?.top_strategic_changes?.map((s) => `${s.theme}: ${s.analysis}`) ||
    [];

  // Normalize diff rows
  const normalizedBlocks = yoyData?.diffBlocks
    ? yoyData.diffBlocks.map((b, idx) => ({
        id: b.id,
        status: b.status,
        materiality: b.materiality,
        old_text: b.priorYearText || null,
        new_text: b.currentYearText || null,
        old_para_num: b.priorYearText ? idx + 1 : undefined,
        new_para_num: b.currentYearText ? idx + 1 : undefined,
        diff_analysis: b.diffAnalysis,
      }))
    : data?.diff_blocks?.map((b, idx) => ({
        id: b.id || `diff-${idx}`,
        status: b.status,
        materiality: (b.shift_score ?? 0) > 60 ? "HIGH" : "MEDIUM",
        old_text: b.old_text,
        new_text: b.new_text,
        old_para_num: b.old_para_num ?? (b.old_text ? idx + 1 : undefined),
        new_para_num: b.new_para_num ?? (b.new_text ? idx + 1 : undefined),
        diff_analysis: undefined,
      })) || [];

  const filteredBlocks = normalizedBlocks.filter((block) => {
    if (filterType === "changes_only") {
      return block.status !== "unchanged";
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 rounded-md bg-zinc-900/60 border border-zinc-800/80" />
        <div className="h-12 rounded-md bg-zinc-900/60 border border-zinc-800/80" />
        <div className="h-[600px] rounded-md bg-zinc-900/60 border border-zinc-800/80" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Meta Header & Section Control */}
      <div className="flex flex-col gap-3 rounded-md border border-zinc-800/80 bg-zinc-950/60 p-3 sm:flex-row sm:items-center sm:justify-between text-xs font-mono">
        {/* Comparative Period Title */}
        <div className="flex items-center space-x-3">
          <span className="font-bold text-zinc-100 uppercase tracking-tight">
            COMPARATIVE PERIOD:
          </span>
          <span className="rounded bg-zinc-900 px-2 py-0.5 text-zinc-300 border border-zinc-800">
            {comparisonLabel}
          </span>
          <span className="hidden md:inline text-zinc-500">•</span>
          <span className="hidden md:inline text-sky-400 font-semibold">{filingPeriod}</span>
        </div>

        {/* Section Selector & Drawer Toggle */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center rounded border border-zinc-800 bg-zinc-900/80 p-0.5">
            {SECTION_OPTIONS.map((sec) => (
              <button
                key={sec.key}
                type="button"
                id={`section-tab-${sec.key}`}
                onClick={() => onSectionChange(sec.key)}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition ${
                  activeSection === sec.key
                    ? "bg-zinc-800 text-sky-300 font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          <Button
            id="open-ai-drawer-btn"
            type="button"
            size="sm"
            onClick={() => setIsDrawerOpen(true)}
            className="h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono border border-zinc-700 flex items-center space-x-1.5 px-2.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            <span>AI Investment Memo</span>
            <span className="rounded bg-zinc-950 px-1 py-0.2 text-[10px] text-sky-300 border border-zinc-800">
              {keyFindings.length}
            </span>
          </Button>
        </div>
      </div>

      {/* Metric Bar (Junior.ai / Hebbia style) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono">
        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            Net Shift Score
          </span>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-zinc-100">
              {netShiftScore.toFixed(1)}%
            </span>
            <span className="text-[10px] text-amber-400 font-sans">{materialityClassification}</span>
          </div>
        </div>

        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            Introduced Risk Topics
          </span>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-emerald-400">
              +{introducedCount}
            </span>
            <span className="text-[10px] text-zinc-500">New Disclosures</span>
          </div>
        </div>

        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            Omitted Clauses
          </span>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-rose-400">
              -{omittedCount}
            </span>
            <span className="text-[10px] text-zinc-500">Deprecated Clauses</span>
          </div>
        </div>

        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            Unchanged Clauses
          </span>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-zinc-300">
              {unchangedCount}
            </span>
            <span className="text-[10px] text-zinc-500">Static Baseline</span>
          </div>
        </div>
      </div>

      {/* Two-Column Code-Review Style Split Diff */}
      <div className="rounded-md border border-zinc-800/80 bg-[#0c0e14] shadow-md overflow-hidden">
        {/* Table Control Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-2 font-mono text-xs">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-zinc-300">
              CODE-REVIEW SPLIT DIFF ({filingPeriod})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-zinc-500 text-[11px]">Filter:</span>
            <div className="flex items-center rounded border border-zinc-800 bg-zinc-900 p-0.5 text-[11px]">
              <button
                type="button"
                id="filter-toggle-all"
                onClick={() => setFilterType("all")}
                className={`px-2 py-0.5 rounded transition ${
                  filterType === "all"
                    ? "bg-zinc-800 text-zinc-100 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All Clauses
              </button>
              <button
                type="button"
                id="filter-toggle-changes"
                onClick={() => setFilterType("changes_only")}
                className={`px-2 py-0.5 rounded transition ${
                  filterType === "changes_only"
                    ? "bg-zinc-800 text-sky-300 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Changes Only
              </button>
            </div>
          </div>
        </div>

        {/* Dual Column Headers */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800 border-b border-zinc-800/80 bg-zinc-900/40 text-xs font-mono">
          <div className="flex items-center justify-between px-4 py-2 text-zinc-400">
            <div className="flex items-center space-x-2">
              <span className="text-zinc-500">PRIOR YEAR:</span>
              <span className="font-bold text-zinc-300">Baseline Form 10-K</span>
            </div>
            <span className="text-[11px] text-zinc-600">Deletions</span>
          </div>

          <div className="flex items-center justify-between px-4 py-2 text-zinc-400">
            <div className="flex items-center space-x-2">
              <span className="text-sky-400">REPORTING YEAR:</span>
              <span className="font-bold text-zinc-100">Current Form 10-K</span>
            </div>
            <span className="text-[11px] text-sky-400/70">Additions / Revisions</span>
          </div>
        </div>

        {/* Diff Rows */}
        <div className="divide-y divide-zinc-800/60 max-h-[700px] overflow-y-auto">
          {filteredBlocks.map((block, idx) => {
            const status = block.status;

            return (
              <div
                key={block.id || idx}
                id={`diff-row-${idx}`}
                className={`grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800/60 transition-colors ${
                  status === "added"
                    ? "bg-emerald-950/15 hover:bg-emerald-950/25"
                    : status === "removed"
                    ? "bg-rose-950/15 hover:bg-rose-950/25"
                    : status === "modified"
                    ? "bg-amber-950/15 hover:bg-amber-950/25"
                    : "hover:bg-zinc-900/30"
                }`}
              >
                {/* Left Column (Old / Prior Year) */}
                <div className="flex p-3 text-xs">
                  {/* Gutter number */}
                  <div className="w-9 shrink-0 select-none font-mono text-[11px] text-zinc-600 text-right pr-3 pt-0.5">
                    {block.old_para_num ? `¶ ${String(block.old_para_num).padStart(2, "0")}` : "---"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-hidden">
                    {block.old_text ? (
                      <div
                        className={
                          status === "removed"
                            ? "border-l-2 border-rose-500/80 pl-2.5 text-rose-200/90 font-sans leading-relaxed"
                            : status === "modified"
                            ? "border-l-2 border-zinc-700 pl-2.5 text-zinc-400 font-sans leading-relaxed"
                            : "pl-2.5 text-zinc-400 font-sans leading-relaxed"
                        }
                      >
                        <MarkdownContent content={block.old_text} />
                      </div>
                    ) : (
                      <div className="flex h-12 items-center justify-center rounded border border-dashed border-zinc-800/70 text-[10px] font-mono italic text-zinc-700">
                        (Clause omitted or newly introduced in current year)
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column (New / Reporting Year) */}
                <div className="flex p-3 text-xs">
                  {/* Gutter number */}
                  <div className="w-9 shrink-0 select-none font-mono text-[11px] text-zinc-600 text-right pr-3 pt-0.5">
                    {block.new_para_num ? `¶ ${String(block.new_para_num).padStart(2, "0")}` : "---"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-hidden">
                    {block.new_text ? (
                      <div
                        className={
                          status === "added"
                            ? "border-l-2 border-emerald-500/80 pl-2.5 text-emerald-100 font-sans leading-relaxed"
                            : status === "modified"
                            ? "border-l-2 border-amber-500/80 pl-2.5 text-zinc-100 font-sans leading-relaxed"
                            : "pl-2.5 text-zinc-300 font-sans leading-relaxed"
                        }
                      >
                        <MarkdownContent content={block.new_text} />
                        {block.diff_analysis && (
                          <div className="mt-2 rounded bg-zinc-950/80 border border-zinc-800/80 p-2 text-[10px] font-mono text-zinc-400">
                            <span className="text-sky-400 font-semibold mr-1">ANALYSIS:</span>
                            <span>{block.diff_analysis}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-12 items-center justify-center rounded border border-dashed border-zinc-800/70 text-[10px] font-mono italic text-zinc-700">
                        (Clause removed in current filing)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating / Docked Right Drawer: "AI Investment Memo Synthesis" */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          id="ai-investment-memo-drawer"
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl bg-[#090a0c] border-zinc-800 text-zinc-100 p-6 overflow-y-auto"
        >
          <SheetHeader>
            <div className="flex items-center space-x-2 text-sky-400">
              <Sparkles className="h-4 w-4" />
              <SheetTitle className="text-base font-bold font-mono text-zinc-100">
                AI Investment Memo Synthesis
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-zinc-400 font-sans">
              Algorithmic synthesis of managerial narrative shift, regulatory defense, and risk factor trajectory ({comparisonLabel}).
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Executive Synthesis */}
            <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                  Executive Narrative Synthesis
                </span>
                <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono text-rose-400 border border-rose-500/20">
                  {materialityClassification}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {executiveSummary}
              </p>
            </div>

            {/* Key Findings List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                  Key Strategic Findings ({keyFindings.length})
                </h4>
              </div>

              {keyFindings.map((finding, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-zinc-800/80 bg-zinc-900/40 p-3.5 text-xs font-sans text-zinc-300 leading-relaxed space-y-1"
                >
                  <div className="flex items-center space-x-2 font-mono text-[10px] text-sky-400 mb-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-950 border border-sky-800 text-sky-300 font-bold">
                      {idx + 1}
                    </span>
                    <span>STRATEGIC SHIFT OBSERVATION</span>
                  </div>
                  <p>{finding}</p>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
