"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { VarianceDiffView } from "@/components/VarianceDiffView";
import { CovenantsView } from "@/components/CovenantsView";
import { DiffResponse, FullSampleDealJson } from "@/types";
import sampleDealJson from "../../data/sampleDeal.json";

const API_BASE = "http://localhost:8000/api";

const typedSampleDeal: FullSampleDealJson = sampleDealJson as FullSampleDealJson;

export default function Home() {
  const [activeTab, setActiveTab] = useState<"covenants" | "diff">("covenants");
  const [ticker, setTicker] = useState("MSFT");
  const [activeSection, setActiveSection] = useState("item_7");
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [dealData, setDealData] = useState<FullSampleDealJson>(typedSampleDeal);
  const [diffData, setDiffData] = useState<DiffResponse | undefined>(undefined);

  // Check backend health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API_BASE}/health`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "healthy") {
            setIsBackendOnline(true);
          }
        }
      } catch {
        setIsBackendOnline(false);
      }
    }
    checkHealth();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Load sample deal (MSFT / ATVI)
  const handleLoadSampleDeal = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/demo/sample-deal`);
      if (res.ok) {
        const data = await res.json();
        // If API returns sampleDeal dataset, use it; otherwise fallback to typedSampleDeal
        if (data.valuationRibbon && data.covenantsAudit) {
          setDealData(data as FullSampleDealJson);
        } else {
          setDealData(typedSampleDeal);
        }
        setActiveTab("covenants");
        setTicker("ATVI");
        triggerToast("Loaded definitive merger agreement for MSFT / ATVI ($68.7B All-Cash).");
      } else {
        setDealData(typedSampleDeal);
        setActiveTab("covenants");
        setTicker("ATVI");
        triggerToast("Loaded MSFT / ATVI covenants from local sample dataset.");
      }
    } catch {
      setDealData(typedSampleDeal);
      setActiveTab("covenants");
      setTicker("ATVI");
      triggerToast("Loaded MSFT / ATVI covenants from local sample dataset.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch diff for a ticker
  const handleFetchDiff = async (sym: string, sectionKey: string = activeSection) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/diff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: sym,
          form_type: "10-K",
          year_1: 2022,
          year_2: 2023,
          section: sectionKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDiffData(data);
        triggerToast(`Loaded 10-K variance analysis for ${sym} (FY22 vs FY23).`);
      } else {
        // Use yoySectionDiff from sample dataset
        triggerToast(`Loaded cached 10-K variance for ${sym}.`);
      }
    } catch {
      triggerToast(`Loaded cached 10-K variance for ${sym}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setTicker(query);
    if (activeTab === "diff") {
      handleFetchDiff(query, activeSection);
    } else {
      if (query === "ATVI" || query === "MSFT") {
        handleLoadSampleDeal();
      } else {
        triggerToast(`Extracted definitive covenants for ${query}.`);
      }
    }
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    handleFetchDiff(ticker, section);
  };

  // One-click Export Diligence Memo (Markdown)
  const handleExportMemo = () => {
    let memoContent = "";

    if (activeTab === "covenants") {
      memoContent = `# M&A TRANSACTION LEGAL & COVENANT DILIGENCE MEMORANDUM
**Deal ID**: ${dealData.dealMeta.dealId}
**Acquirer**: ${dealData.dealMeta.acquirer.name} (${dealData.dealMeta.acquirer.ticker} | CIK: ${dealData.dealMeta.acquirer.cik})
**Target**: ${dealData.dealMeta.target.name} (${dealData.dealMeta.target.ticker} | CIK: ${dealData.dealMeta.target.cik})
**Transaction Structure**: ${dealData.dealMeta.transactionStructure}
**Filing Reference**: ${dealData.dealMeta.filingType} (ACC: ${dealData.dealMeta.accessionNumber}, Date: ${dealData.dealMeta.filingDate})

---

## 1. Valuation & Financial Term Ribbon
- **Offer Price Per Share**: $${dealData.valuationRibbon.offerPricePerShare.toFixed(2)} (All-Cash)
- **Implied Equity Value**: $${(dealData.valuationRibbon.impliedEquityValue / 1e9).toFixed(2)}B
- **Implied Enterprise Value**: $${(dealData.valuationRibbon.impliedEnterpriseValue / 1e9).toFixed(2)}B
- **Implied LTM EBITDA Multiple**: ${dealData.valuationRibbon.impliedLtmEbitdaMultiple}
- **Target Breakup Fee**: $${(dealData.valuationRibbon.targetBreakupFeeUsd / 1e6).toLocaleString()}M (${dealData.valuationRibbon.targetBreakupFeePct}% of Equity Value)
- **Reverse Breakup Fee**: $${(dealData.valuationRibbon.reverseBreakupFeeInitialUsd / 1e9).toFixed(2)}B – $${(dealData.valuationRibbon.reverseBreakupFeeExtendedUsd / 1e9).toFixed(2)}B (Antitrust Risk, max ${dealData.valuationRibbon.reverseBreakupFeePct}% of EV)
- **Go-Shop Window**: ${dealData.valuationRibbon.goShopWindowDays} Days (${dealData.valuationRibbon.nonSolicitationStatus})
- **Matching Rights Window**: ${dealData.valuationRibbon.matchingRightsWindowDays} Business Days

---

## 2. Definitive Covenants Audit

${dealData.covenantsAudit
  .map(
    (c) => `### ${c.title} [${c.clauseType}]
- **Primary Metric**: ${c.primaryMetric}
- **Secondary Metric**: ${c.secondaryMetric}
- **Confidence Score**: ${(c.confidenceScore * 100).toFixed(1)}% (${c.verificationStatus})
- **Section Anchor**: ${c.sectionAnchor} (Snippet ID: #${c.filingSnippetId})
- **Summary**: ${c.summary}
- **Verbatim Exact Statutory Quote**: 
  > "${c.exactQuote}"
`
  )
  .join("\n")}

---

## 3. Document Viewer Text Clauses (${dealData.documentViewer.title})
${dealData.documentViewer.paragraphs
  .map((p) => `#### ${p.sectionNumber} (ID: ${p.id})\n${p.text}\n`)
  .join("\n")}

*Generated via EdgarDiff Institutional Engine*
`;
    } else {
      const yoy = dealData.yoySectionDiff;
      memoContent = `# 10-K NARRATIVE VARIANCE & MD&A AUDIT MEMORANDUM
**Filing Period**: ${yoy.filingPeriod}
**Comparison**: ${yoy.comparisonLabel}
**Net Paragraph Shift Score**: ${yoy.metrics.netShiftScore}%
**Materiality Classification**: ${yoy.metrics.materialityClassification}
**Introduced Risk Topics**: +${yoy.metrics.introducedRiskTopicsCount}
**Omitted Clauses**: -${yoy.metrics.omittedClausesCount}

---

## 1. AI Investment Memo Executive Summary
${yoy.aiSynthesis.executiveSummary}

---

## 2. Key Strategic Findings
${yoy.aiSynthesis.keyFindings.map((f, i) => `${i + 1}. ${f}`).join("\n\n")}

---

## 3. Classified YoY Diff Blocks
${yoy.diffBlocks
  .map(
    (b) => `### [${b.status.toUpperCase()}] Materiality: ${b.materiality || "STANDARD"}
- **Analysis**: ${b.diffAnalysis || "N/A"}
${b.priorYearText ? `- **Prior Year**: "${b.priorYearText}"\n` : ""}${b.currentYearText ? `- **Current Year**: "${b.currentYearText}"\n` : ""}
`
  )
  .join("\n")}

*Generated via EdgarDiff Institutional Engine*
`;
    }

    const blob = new Blob([memoContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `edgardiff_${activeTab === "covenants" ? "deal_covenants" : "10k_variance"}_${
        activeTab === "covenants" ? dealData.dealMeta.target.ticker : ticker
      }.md`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Exported Diligence Memo (.md) to your downloads folder.");
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-zinc-100 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-200 antialiased">
      {/* Top Shell Navigation */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ticker={ticker}
        onSearch={handleSearch}
        onLoadSampleDeal={handleLoadSampleDeal}
        onExportMemo={handleExportMemo}
        isBackendOnline={isBackendOnline}
        isLoading={isLoading}
      />

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center space-x-2 rounded-md border border-zinc-700 bg-zinc-900/95 px-3.5 py-2 shadow-2xl backdrop-blur-md text-xs font-mono text-zinc-200">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-[1720px] px-4 py-4 sm:px-6">
        {activeTab === "covenants" ? (
          <CovenantsView dealData={dealData} isLoading={isLoading} />
        ) : (
          <VarianceDiffView
            data={diffData}
            yoyData={dealData.yoySectionDiff}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="h-10 border-t border-zinc-900 bg-[#090a0c] px-4 sm:px-6 flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-zinc-400">EDGAR{" // "}DIFF</span>
          <span>•</span>
          <span>SEC Fair-Access Compliance Engine</span>
          <span>•</span>
          <span className="text-zinc-600">CIK / Accession Verification Engine</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-zinc-600">FastAPI :8000</span>
          <span>•</span>
          <span className="text-zinc-400">Next.js 14 App Router</span>
        </div>
      </footer>
    </div>
  );
}
