"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Quote,
} from "lucide-react";
import { DiffResponse, StrategicChange } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const SECTION_LABELS: Record<string, string> = {
  item_1a: "Item 1A: Risk Factors",
  item_7: "Item 7: MD&A",
  item_8: "Item 8: Financial Statements",
};

export function VarianceDiffView({
  data,
  activeSection,
  onSectionChange,
}: VarianceDiffViewProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "changes_only">("all");
  const [selectedSnippet, setSelectedSnippet] = useState<string | null>(null);

  const {
    ticker,
    year_1,
    year_2,
    materiality_score,
    variance_summary,
    diff_blocks = [],
  } = data;

  const filteredBlocks = diff_blocks.filter((block) => {
    if (filterType === "changes_only") {
      return block.status !== "unchanged";
    }
    return true;
  });

  const additionsCount = diff_blocks.filter((b) => b.status === "added").length;
  const removalsCount = diff_blocks.filter((b) => b.status === "removed").length;
  const modifiedCount = diff_blocks.filter((b) => b.status === "modified").length;
  const unchangedCount = diff_blocks.filter((b) => b.status === "unchanged").length;

  const getScoreBadge = (score: number) => {
    if (score >= 65) {
      return {
        variant: "destructive" as const,
        label: "High Materiality / Strategic Shift",
        color: "text-rose-400 bg-rose-950/40 border-rose-800/60",
      };
    }
    if (score >= 35) {
      return {
        variant: "warning" as const,
        label: "Moderate Narrative Evolution",
        color: "text-amber-400 bg-amber-950/40 border-amber-800/60",
      };
    }
    return {
      variant: "success" as const,
      label: "Routine / Minor Variance",
      color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60",
    };
  };

  const scoreInfo = getScoreBadge(materiality_score);

  return (
    <div className="space-y-6">
      {/* Top Controls & KPI Ribbon */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(SECTION_LABELS).map(([key, label]) => (
            <button
              key={key}
              id={`section-tab-${key}`}
              onClick={() => onSectionChange(key)}
              className={`rounded-lg px-3 py-2 text-xs font-mono font-medium transition ${
                activeSection === key
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/50"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Center: Shift Score Meter */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3.5 py-2">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Materiality Score
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-bold font-mono text-white">
                  {materiality_score}
                </span>
                <span className="text-xs font-mono text-slate-500">/ 100</span>
              </div>
            </div>

            {/* Score progress mini bar */}
            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  materiality_score >= 65
                    ? "bg-rose-500"
                    : materiality_score >= 35
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, materiality_score))}%` }}
              />
            </div>

            <Badge
              variant="default"
              className={`text-[10px] hidden sm:inline-flex ${scoreInfo.color}`}
            >
              {scoreInfo.label}
            </Badge>
          </div>

          {/* AI Drawer Trigger */}
          <Button
            id="open-ai-drawer-btn"
            variant="default"
            size="sm"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
          >
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold text-xs">AI Analyst Shifts</span>
            {variance_summary?.top_strategic_changes?.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 text-[11px] font-mono text-emerald-300 border border-emerald-400/40">
                {variance_summary.top_strategic_changes.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Stats and Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-mono">
        <div className="flex items-center space-x-3 text-slate-400">
          <span className="font-semibold text-slate-300">
            {ticker} 10-K YoY Diff:
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">
            FY{year_1}
          </span>
          <ArrowRight className="h-3 w-3 text-slate-500" />
          <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">
            FY{year_2}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
            +{additionsCount} Additions
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
            -{removalsCount} Removals
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
            ~{modifiedCount} Modified
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700/40">
            {unchangedCount} Unchanged
          </span>

          <div className="ml-3 pl-3 border-l border-slate-800 flex items-center space-x-1">
            <button
              id="filter-toggle-all"
              onClick={() => setFilterType("all")}
              className={`px-2 py-0.5 rounded text-[10px] ${
                filterType === "all"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All
            </button>
            <button
              id="filter-toggle-changes"
              onClick={() => setFilterType("changes_only")}
              className={`px-2 py-0.5 rounded text-[10px] ${
                filterType === "changes_only"
                  ? "bg-slate-700 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Changes Only
            </button>
          </div>
        </div>
      </div>

      {/* Split-screen Diff Reader */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-xl">
        {/* Column Headers */}
        <div className="grid grid-cols-1 divide-y divide-slate-800 border-b border-slate-800 bg-slate-900/90 font-mono text-xs md:grid-cols-2 md:divide-y-0 md:divide-x">
          <div className="flex items-center justify-between px-4 py-2.5 text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-200">PRIOR YEAR:</span>
              <Badge variant="secondary" className="font-mono text-[11px]">
                FY{year_1}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-500">Deletions / Baseline</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-emerald-400">REPORTING YEAR:</span>
              <Badge variant="success" className="font-mono text-[11px]">
                FY{year_2}
              </Badge>
            </div>
            <span className="text-[11px] text-emerald-500/80">Additions / Revisions</span>
          </div>
        </div>

        {/* Diff Rows */}
        <div className="divide-y divide-slate-800/80 max-h-[720px] overflow-y-auto">
          {filteredBlocks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-mono text-xs">
              No differences matching the selected filter.
            </div>
          ) : (
            filteredBlocks.map((block, idx) => {
              const status = block.status;

              return (
                <div
                  key={idx}
                  id={`diff-block-${idx}`}
                  className={`grid grid-cols-1 md:grid-cols-2 md:divide-x divide-slate-800 transition-colors ${
                    status === "added"
                      ? "bg-emerald-950/15 hover:bg-emerald-950/25"
                      : status === "removed"
                      ? "bg-rose-950/15 hover:bg-rose-950/25"
                      : status === "modified"
                      ? "bg-amber-950/15 hover:bg-amber-950/25"
                      : "hover:bg-slate-900/40"
                  }`}
                >
                  {/* Left Column (Old / Year 1) */}
                  <div className="relative p-4 text-xs">
                    {/* Status marker */}
                    <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span className="text-slate-500">Block #{idx + 1}</span>
                      {status === "removed" && (
                        <span className="rounded bg-rose-950/60 px-1.5 py-0.5 font-bold text-rose-300 border border-rose-800/50">
                          - REMOVED
                        </span>
                      )}
                      {status === "modified" && (
                        <span className="rounded bg-amber-950/60 px-1.5 py-0.5 text-amber-300 border border-amber-800/50">
                          ~ ORIGINAL ({Math.round(block.similarity * 100)}% match)
                        </span>
                      )}
                    </div>

                    {block.old_text ? (
                      <div
                        className={
                          status === "removed"
                            ? "border-l-2 border-rose-500 pl-3 text-rose-200/90 font-sans leading-relaxed"
                            : status === "modified"
                            ? "border-l-2 border-amber-500/60 pl-3 text-slate-300 font-sans leading-relaxed"
                            : "pl-3 text-slate-300 font-sans leading-relaxed"
                        }
                      >
                        <MarkdownContent content={block.old_text} />
                      </div>
                    ) : (
                      <div className="flex h-16 items-center justify-center rounded border border-dashed border-slate-800 text-[11px] font-mono italic text-slate-600">
                        (Clause did not exist in FY{year_1})
                      </div>
                    )}
                  </div>

                  {/* Right Column (New / Year 2) */}
                  <div className="relative p-4 text-xs">
                    {/* Status marker */}
                    <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span className="text-slate-500">FY{year_2} Clause</span>
                      {status === "added" && (
                        <span className="rounded bg-emerald-950/60 px-1.5 py-0.5 font-bold text-emerald-300 border border-emerald-800/50">
                          + ADDED
                        </span>
                      )}
                      {status === "modified" && (
                        <span className="rounded bg-amber-950/60 px-1.5 py-0.5 font-bold text-amber-300 border border-amber-800/50">
                          ~ REVISED (+{block.shift_score} shift)
                        </span>
                      )}
                      {status === "unchanged" && (
                        <span className="text-[10px] font-mono text-slate-600">
                          IDENTICAL
                        </span>
                      )}
                    </div>

                    {block.new_text ? (
                      <div
                        className={
                          status === "added"
                            ? "border-l-2 border-emerald-500 pl-3 text-emerald-200 font-sans leading-relaxed"
                            : status === "modified"
                            ? "border-l-2 border-amber-500 pl-3 text-emerald-100 font-sans leading-relaxed"
                            : "pl-3 text-slate-300 font-sans leading-relaxed"
                        }
                      >
                        <MarkdownContent content={block.new_text} />
                      </div>
                    ) : (
                      <div className="flex h-16 items-center justify-center rounded border border-dashed border-slate-800 text-[11px] font-mono italic text-slate-600">
                        (Clause omitted in FY{year_2})
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right-hand Sheet Drawer: AI Analyst Summary of Narrative Shifts */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          id="ai-analyst-drawer"
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl bg-slate-950/98 border-slate-800 text-slate-100"
        >
          <SheetHeader>
            <div className="flex items-center space-x-2 text-emerald-400">
              <Sparkles className="h-5 w-5" />
              <SheetTitle className="text-lg font-bold font-mono text-white">
                AI Equity Analyst Synthesis
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-slate-400">
              Quantitative variance breakdown and strategic narrative trajectory for{" "}
              <strong className="text-slate-200">{ticker}</strong> (FY{year_1} vs FY{year_2}).
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Risk Posture Card */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400">
                  Risk Posture Trajectory
                </span>
                <Badge variant="destructive" className="font-mono text-[10px]">
                  {variance_summary?.risk_posture_shift || "Elevated Regulatory Scrutiny"}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {variance_summary?.executive_summary ||
                  "Narrative diff indicates substantial managerial reprioritization regarding supply chain sovereignty, antitrust disclosures, and enterprise AI capital expenditures."}
              </p>
            </div>

            {/* Strategic Changes List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Top Strategic Narrative Shifts ({variance_summary?.top_strategic_changes?.length || 0})
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  Click snippet to inspect
                </span>
              </div>

              {variance_summary?.top_strategic_changes?.map((change: StrategicChange, idx: number) => {
                const isSelected = selectedSnippet === change.snippet_reference;

                return (
                  <Card
                    key={idx}
                    id={`strategic-change-card-${idx}`}
                    className={`cursor-pointer transition-all border ${
                      isSelected
                        ? "border-emerald-500 bg-slate-900/90 shadow-lg shadow-emerald-950/30"
                        : "border-slate-800 hover:border-slate-700 bg-slate-900/60"
                    }`}
                    onClick={() => setSelectedSnippet(isSelected ? null : change.snippet_reference)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-100 font-sans">
                            {change.theme}
                          </span>
                        </div>
                        <Badge
                          variant={
                            change.type === "added"
                              ? "success"
                              : change.type === "removed"
                              ? "destructive"
                              : "warning"
                          }
                          className="uppercase text-[10px] font-mono"
                        >
                          {change.type}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 text-xs space-y-3">
                      <p className="text-slate-300 leading-relaxed font-sans">
                        {change.analysis}
                      </p>

                      {/* Verbatim snippet reference */}
                      <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
                        <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-500 mb-1">
                          <Quote className="h-3 w-3 text-emerald-400" />
                          <span>FILING CITATION (EXACT SNIPPET):</span>
                        </div>
                        <p className="font-mono text-[11px] text-emerald-300/90 italic leading-relaxed">
                          &ldquo;{change.snippet_reference}&rdquo;
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
