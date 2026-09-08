"use client";

import React, { useState } from "react";
import {
  Search,
  Layers,
  FileSpreadsheet,
  Download,
  BookOpen,
  Command,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  activeTab: "covenants" | "diff";
  onTabChange: (tab: "covenants" | "diff") => void;
  ticker: string;
  onSearch: (query: string) => void;
  onLoadSampleDeal: () => void;
  onExportMemo: () => void;
  isBackendOnline: boolean;
  isLoading: boolean;
}

const PRESET_COMMANDS = [
  { label: "MSFT / ATVI (8-K)", value: "ATVI", mode: "covenants" as const },
  { label: "AAPL (10-K YoY)", value: "AAPL", mode: "diff" as const },
  { label: "NVDA (Item 1A)", value: "NVDA", mode: "diff" as const },
];

export function TopBar({
  activeTab,
  onTabChange,
  ticker,
  onSearch,
  onLoadSampleDeal,
  onExportMemo,
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

  const handleCommandClick = (cmd: typeof PRESET_COMMANDS[0]) => {
    setInputVal(cmd.value);
    onTabChange(cmd.mode);
    onSearch(cmd.value);
  };

  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b border-zinc-800/80 bg-[#090a0c]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1720px] items-center justify-between px-4 sm:px-6">
        {/* Left: Terminal Brand & Live Status Ping */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-sky-400 shadow-inner">
              <Layers className="h-4 w-4" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-mono text-sm font-bold tracking-tight text-zinc-100">
                EDGAR<span className="text-zinc-500">{" // "}</span>DIFF
              </span>
              <div className="hidden md:flex items-center space-x-1.5 rounded-sm bg-zinc-900/90 px-1.5 py-0.5 border border-zinc-800">
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                      isBackendOnline ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                      isBackendOnline ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  {isBackendOnline ? "LIVE EDGAR V2.1" : "STANDALONE ENGINE"}
                </span>
              </div>
            </div>
          </div>

          {/* Segmented Control Workspace Toggle */}
          <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900/90 p-0.5">
            <button
              id="view-toggle-covenants"
              type="button"
              onClick={() => onTabChange("covenants")}
              className={`flex items-center space-x-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                activeTab === "covenants"
                  ? "bg-zinc-800 text-sky-300 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>M&A Deal Covenants</span>
            </button>
            <button
              id="view-toggle-diff"
              type="button"
              onClick={() => onTabChange("diff")}
              className={`flex items-center space-x-1.5 rounded px-2.5 py-1 text-xs font-medium transition ${
                activeTab === "diff"
                  ? "bg-zinc-800 text-sky-300 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>10-K Section Diff</span>
            </button>
          </div>
        </div>

        {/* Center: Command Bar & Preset Pills */}
        <div className="hidden lg:flex items-center space-x-3 flex-1 max-w-xl mx-4">
          <form onSubmit={handleSubmit} className="relative w-72">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              <input
                id="ticker-search-input"
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value.toUpperCase())}
                placeholder="Search Ticker, Deal, CIK..."
                className="h-8 w-full rounded-md border border-zinc-800 bg-zinc-900/90 pl-8 pr-10 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
              <div className="absolute right-2 flex items-center space-x-0.5 text-[10px] font-mono text-zinc-500 pointer-events-none">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>
          </form>

          {/* Quick presets */}
          <div className="flex items-center space-x-1.5">
            {PRESET_COMMANDS.map((cmd) => (
              <button
                key={cmd.label}
                type="button"
                onClick={() => handleCommandClick(cmd)}
                className="rounded border border-zinc-800/80 bg-zinc-900/60 px-2 py-0.5 font-mono text-[11px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* Export Diligence Memo */}
          <button
            id="export-memo-btn"
            type="button"
            onClick={onExportMemo}
            className="hidden sm:inline-flex items-center space-x-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition"
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" />
            <span>Export Memo</span>
          </button>

          {/* Load Sample Deal (Institutional White Button) */}
          <Button
            id="load-sample-deal-btn"
            type="button"
            size="sm"
            onClick={onLoadSampleDeal}
            disabled={isLoading}
            className="h-8 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white font-medium px-3 text-xs shadow-sm transition border border-transparent"
          >
            <span>Load Sample Deal</span>
          </Button>

          {/* API Docs Link */}
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            title="FastAPI Swagger Documentation"
            className="hidden xl:inline-flex items-center space-x-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="font-mono text-[11px]">API</span>
          </a>

          {/* GitHub Link */}
          <a
            href="https://github.com/avrahx/EdgarDiff"
            target="_blank"
            rel="noopener noreferrer"
            title="View Source on GitHub"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 transition"
          >
            <svg
              className="h-4 w-4 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
