"use client";

import React, { useState } from "react";
import {
  Search,
  Sparkles,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  activeTab: "diff" | "covenants";
  onTabChange: (tab: "diff" | "covenants") => void;
  ticker: string;
  onTickerChange: (ticker: string) => void;
  onSearch: (ticker: string) => void;
  onLoadSampleDeal: () => void;
  isBackendOnline: boolean;
  isLoading: boolean;
}

const SAMPLE_TICKERS = ["MSFT", "ATVI", "AAPL", "NVDA", "TSLA"];

export function TopBar({
  activeTab,
  onTabChange,
  ticker,
  onTickerChange,
  onSearch,
  onLoadSampleDeal,
  isBackendOnline,
  isLoading,
}: TopBarProps) {
  const [inputVal, setInputVal] = useState(ticker);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim().toUpperCase());
    }
  };

  const handleChipClick = (sym: string) => {
    setInputVal(sym);
    onTickerChange(sym);
    onSearch(sym);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-base font-bold tracking-tight text-white">
                  Edgar<span className="text-emerald-400">Diff</span>
                </span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 font-mono border border-emerald-500/20">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
                SEC 10-K Variance & M&A Covenant Intelligence
              </p>
            </div>
          </div>

          {/* Backend Status Pill */}
          <div className="hidden lg:flex items-center space-x-1.5 pl-3 border-l border-slate-800">
            {isBackendOnline ? (
              <Badge
                variant="success"
                className="gap-1 text-[11px] font-mono py-0.5 px-2 bg-emerald-950/40 border-emerald-800/50"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>API :8000</span>
              </Badge>
            ) : (
              <Badge
                variant="warning"
                className="gap-1 text-[11px] font-mono py-0.5 px-2 bg-amber-950/40 border-amber-800/50"
              >
                <AlertCircle className="h-3 w-3 text-amber-400" />
                <span>Local Cache</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Center: Search & Quick Tickers */}
        <div className="flex items-center space-x-3 flex-1 max-w-md mx-4">
          <form onSubmit={handleSubmit} className="relative w-full">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="ticker-search-input"
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                placeholder="Search Ticker (e.g. MSFT, AAPL)..."
                className="h-9 w-full rounded-md border border-slate-800 bg-slate-900/90 pl-9 pr-14 text-xs font-mono uppercase text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-1.5 h-6 px-2 text-[10px] font-mono font-medium rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Go
              </button>
            </div>
          </form>

          {/* Quick ticker chips */}
          <div className="hidden xl:flex items-center space-x-1">
            {SAMPLE_TICKERS.map((sym) => (
              <button
                key={sym}
                id={`ticker-chip-${sym.toLowerCase()}`}
                type="button"
                onClick={() => handleChipClick(sym)}
                className={`rounded px-2 py-1 text-[10px] font-mono font-semibold transition border ${
                  ticker === sym
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Right: View Mode Toggle & Sample Deal Button */}
        <div className="flex items-center space-x-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-1">
            <button
              id="view-toggle-diff"
              onClick={() => onTabChange("diff")}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "diff"
                  ? "bg-slate-800 text-emerald-400 shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>10-K Variance</span>
            </button>
            <button
              id="view-toggle-covenants"
              onClick={() => onTabChange("covenants")}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "covenants"
                  ? "bg-slate-800 text-emerald-400 shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>M&A Covenants</span>
            </button>
          </div>

          {/* Load Sample Deal Action */}
          <Button
            id="load-sample-deal-btn"
            variant="deal"
            size="sm"
            onClick={onLoadSampleDeal}
            disabled={isLoading}
            className="hidden sm:flex items-center space-x-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-semibold text-xs">Load Sample Deal</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
