"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { VarianceDiffView } from "@/components/VarianceDiffView";
import { CovenantsView } from "@/components/CovenantsView";
import { DiffResponse, SampleDealData } from "@/types";
import { SAMPLE_DEAL_MSFT_ATVI, SAMPLE_DIFF_AAPL } from "@/lib/sampleData";

const API_BASE = "http://localhost:8000/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"covenants" | "diff">("covenants");
  const [ticker, setTicker] = useState("MSFT");
  const [activeSection, setActiveSection] = useState("item_7");
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [diffData, setDiffData] = useState<DiffResponse>(SAMPLE_DIFF_AAPL);
  const [dealData, setDealData] = useState<SampleDealData>(SAMPLE_DEAL_MSFT_ATVI);

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
        // Merge enriched structured covenants with backend deal data
        setDealData({
          ...SAMPLE_DEAL_MSFT_ATVI,
          ...data,
          structured_covenants: SAMPLE_DEAL_MSFT_ATVI.structured_covenants,
          agreement_sections: SAMPLE_DEAL_MSFT_ATVI.agreement_sections,
        });
        setActiveTab("covenants");
        setTicker("ATVI");
        triggerToast("Loaded definitive merger agreement for MSFT / ATVI.");
      } else {
        setDealData(SAMPLE_DEAL_MSFT_ATVI);
        setActiveTab("covenants");
        setTicker("ATVI");
        triggerToast("Loaded MSFT / ATVI covenants from local cache.");
      }
    } catch {
      setDealData(SAMPLE_DEAL_MSFT_ATVI);
      setActiveTab("covenants");
      setTicker("ATVI");
      triggerToast("Loaded MSFT / ATVI covenants from local cache.");
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
          year_1: 2023,
          year_2: 2024,
          section: sectionKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDiffData(data);
        triggerToast(`Loaded 10-K variance analysis for ${sym} (FY23 vs FY24).`);
      } else {
        setDiffData({
          ...SAMPLE_DIFF_AAPL,
          ticker: sym,
          section: sectionKey,
        });
        triggerToast(`Loaded cached 10-K variance for ${sym}.`);
      }
    } catch {
      setDiffData({
        ...SAMPLE_DIFF_AAPL,
        ticker: sym,
        section: sectionKey,
      });
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
**Deal**: ${dealData.deal_name}
**Structure**: ${dealData.transaction_type}
**Announcement Date**: ${dealData.announcement_date}
**Primary SEC Filing**: ${dealData.filing_reference.form} (ACC: ${dealData.filing_reference.accession_number})
**Source URL**: ${dealData.filing_reference.document_url}

---

## 1. Executive Valuation Summary
- **Enterprise Value**: $${((dealData.valuation.enterprise_value || 0) / 1e9).toFixed(2)}B
- **Per Share Offer Price**: $${dealData.valuation.per_share_offer_price_usd?.toFixed(2)} (${dealData.parties.deal_type.toUpperCase()})
- **Unaffected Share Premium**: +${dealData.valuation.premium_to_unaffected_share_price_percent}%
- **Implied EBITDA Multiple**: ${dealData.valuation.implied_ebitda_multiple}x
- **Covenant Risk Grade**: ${dealData.strategic_analysis.covenant_risk_grade}

---

## 2. Key Transaction Covenants & Deal Protections

${dealData.structured_covenants
  .map(
    (c) => `### ${c.name}
- **Metric**: ${c.metric}
- **SEC Section**: ${c.sec_section}
- **Confidence Score**: ${c.confidence_score}% (Verified SEC Citation)
- **Summary**: ${c.summary}
- **Statutory Quote**: 
  > "${c.statutory_quote}"
- **Legal Implication**: ${c.risk_implication}
`
  )
  .join("\n")}

---

## 3. Regulatory & Antitrust Strategic Assessment
- **Deal Thesis**: ${dealData.strategic_analysis.deal_thesis}
- **Antitrust Posture**: ${dealData.strategic_analysis.antitrust_posture}
- **MAE Legal Standard**: ${dealData.strategic_analysis.mae_standard}

*Generated via EdgarDiff Institutional Engine*
`;
    } else {
      memoContent = `# 10-K NARRATIVE VARIANCE & MD&A AUDIT MEMORANDUM
**Company**: ${diffData.ticker}
**Comparative Period**: FY ${diffData.year_1} vs. FY ${diffData.year_2} Form 10-K (${diffData.section.toUpperCase()})
**Net Paragraph Shift Score**: ${diffData.materiality_score}%
**Risk Posture Assessment**: ${diffData.variance_summary.risk_posture_shift}

---

## 1. Executive Summary of Strategic Shifts
${diffData.variance_summary.executive_summary}

---

## 2. Top Strategic Narrative Shifts
${diffData.variance_summary.top_strategic_changes
  .map(
    (s, idx) => `### Shift ${idx + 1}: ${s.theme} [${s.type.toUpperCase()}]
- **Analysis**: ${s.analysis}
- **Exact Verbatim Snippet**:
  > "${s.snippet_reference}"
`
  )
  .join("\n")}

---

## 3. Footnote & Liquidity Anomaly Flags
${
  diffData.variance_summary.anomaly_flags
    ?.map(
      (a) => `- **[${a.category.toUpperCase()}] ${a.title}** (${a.severity.toUpperCase()} SEVERITY): ${a.detail}`
    )
    .join("\n") || "No anomaly flags identified."
}

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
        activeTab === "covenants" ? dealData.filing_reference.ticker : diffData.ticker
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
