"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Quote,
  AlertTriangle,
} from "lucide-react";
import { DiffResponse, StrategicChange, AnomalyFlag } from "@/types";
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
  data: DiffResponse;
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
  activeSection,
  onSectionChange,
  isLoading = false,
}: VarianceDiffViewProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "changes_only">("all");
  const [selectedSnippet, setSelectedSnippet] = useState<string | null>(null);

  const {
    ticker,
    year_1,
    year_2,
    materiality_score,
    introduced_risk_count = 6,
    omitted_clause_count = 2,
    unchanged_clause_count = 18,
    variance_summary,
    diff_blocks = [],
  } = data;

  const filteredBlocks = diff_blocks.filter((block) => {
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
            {ticker} COMPARATIVE PERIOD:
          </span>
          <span className="rounded bg-zinc-900 px-2 py-0.5 text-zinc-300 border border-zinc-800">
            FY {year_1} vs. FY {year_2} Form 10-K
          </span>
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
            {variance_summary?.top_strategic_changes?.length > 0 && (
              <span className="rounded bg-zinc-950 px-1 py-0.2 text-[10px] text-sky-300 border border-zinc-800">
                {variance_summary.top_strategic_changes.length}
              </span>
            )}
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
              {materiality_score.toFixed(1)}%
            </span>
            <span className="text-[10px] text-amber-400">Material Narrative Drift</span>
          </div>
        </div>

        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            Introduced Risk Topics
          </span>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-emerald-400">
              +{introduced_risk_count}
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
              -{omitted_clause_count}
            </span>
            <span className="text-[10px] text-zinc-500">Deprecated Disclaimers</span>
          </div>
        </div>

        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            Unchanged Clauses
          </span>
          <div className="mt-1 flex items-baseline space-x-1.5">
            <span className="text-xl font-bold text-zinc-300">
              {unchanged_clause_count}
            </span>
            <span className="text-[10px] text-zinc-500">Static Boilerplate</span>
          </div>
        </div>
      </div>

      {/* Two-Column Code-Review Style Split Diff */}
      <div className="rounded-md border border-zinc-800/80 bg-[#0c0e14] shadow-md overflow-hidden">
        {/* Table Control Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-2 font-mono text-xs">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-zinc-300">
              CODE-REVIEW SPLIT DIFF (MD&A / 10-K)
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
              <span className="text-zinc-500">BASE:</span>
              <span className="font-bold text-zinc-300">FY {year_1} (10-K Prior Year)</span>
            </div>
            <span className="text-[11px] text-zinc-600">Deletions</span>
          </div>

          <div className="flex items-center justify-between px-4 py-2 text-zinc-400">
            <div className="flex items-center space-x-2">
              <span className="text-sky-400">CURRENT:</span>
              <span className="font-bold text-zinc-100">FY {year_2} (10-K Reporting Year)</span>
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
                {/* Left Column (Old / Year 1) */}
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
                        (Not present in FY {year_1})
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column (New / Year 2) */}
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
                      </div>
                    ) : (
                      <div className="flex h-12 items-center justify-center rounded border border-dashed border-zinc-800/70 text-[10px] font-mono italic text-zinc-700">
                        (Omitted in FY {year_2})
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
              Algorithmic synthesis of managerial narrative shift, capital allocation pivots, and risk factor trajectory for{" "}
              <strong className="text-zinc-200">{ticker}</strong> (FY{year_1} vs FY{year_2}).
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Executive Synthesis */}
            <div className="rounded-md border border-zinc-800/80 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                  Risk Posture Assessment
                </span>
                <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono text-rose-400 border border-rose-500/20">
                  {variance_summary?.risk_posture_shift || "Elevated Regulatory Exposure"}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {variance_summary?.executive_summary}
              </p>
            </div>

            {/* Footnote & Liquidity Anomaly Flags */}
            {variance_summary?.anomaly_flags && variance_summary.anomaly_flags.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                    Footnote & Liquidity Anomaly Flags
                  </h4>
                </div>

                <div className="space-y-2">
                  {variance_summary.anomaly_flags.map((anomaly: AnomalyFlag, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-md border border-zinc-800/80 bg-zinc-900/40 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-zinc-200 font-mono text-[11px]">
                          [{anomaly.category.toUpperCase()}] {anomaly.title}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-mono uppercase ${
                            anomaly.severity === "high"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {anomaly.severity} Severity
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                        {anomaly.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Narrative Shifts List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                  Strategic Narrative Shifts ({variance_summary?.top_strategic_changes?.length || 0})
                </h4>
                <span className="text-[10px] font-mono text-zinc-500">
                  Click to inspect snippet
                </span>
              </div>

              {variance_summary?.top_strategic_changes?.map((change: StrategicChange, idx: number) => {
                const isSelected = selectedSnippet === change.snippet_reference;

                return (
                  <div
                    key={idx}
                    id={`strategic-change-card-${idx}`}
                    onClick={() => setSelectedSnippet(isSelected ? null : change.snippet_reference)}
                    className={`cursor-pointer rounded-md border p-3.5 transition-all text-xs ${
                      isSelected
                        ? "border-sky-400 bg-zinc-900/90 shadow-md shadow-sky-950/20"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-100 font-sans">
                        {change.theme}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                          change.type === "added"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : change.type === "removed"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {change.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed mb-2.5">
                      {change.analysis}
                    </p>

                    <div className="rounded border border-zinc-800/80 bg-[#08090c] p-2 text-[10px] font-mono text-zinc-300">
                      <div className="flex items-center space-x-1 text-zinc-500 mb-0.5">
                        <Quote className="h-3 w-3 text-sky-400" />
                        <span>VERBATIM 10-K DISCLOSURE:</span>
                      </div>
                      <p className="italic text-zinc-300/90 leading-relaxed">
                        &ldquo;{change.snippet_reference}&rdquo;
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
