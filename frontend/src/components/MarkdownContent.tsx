"use client";

import React from "react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = "" }) => {
  if (!content) return null;

  // Check if content contains markdown table
  const lines = content.split("\n");
  const isTableLine = (line: string) => line.trim().startsWith("|") && line.trim().endsWith("|");

  const blocks: { type: "text" | "table"; content: string[] }[] = [];
  let currentBlock: { type: "text" | "table"; content: string[] } = { type: "text", content: [] };

  for (const line of lines) {
    if (isTableLine(line)) {
      if (currentBlock.type !== "table") {
        if (currentBlock.content.length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = { type: "table", content: [] };
      }
      currentBlock.content.push(line);
    } else {
      if (currentBlock.type !== "text") {
        if (currentBlock.content.length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = { type: "text", content: [] };
      }
      currentBlock.content.push(line);
    }
  }
  if (currentBlock.content.length > 0) {
    blocks.push(currentBlock);
  }

  return (
    <div className={`space-y-3 leading-relaxed text-slate-200 text-sm ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "table" && block.content.length >= 2) {
          const rows = block.content.filter(
            (r) => !r.includes("---") && r.trim().startsWith("|")
          );
          if (rows.length === 0) return null;

          const headerCells = rows[0]
            .split("|")
            .map((c) => c.trim())
            .filter((_, i, arr) => i !== 0 && i !== arr.length - 1);

          const bodyRows = rows.slice(1).map((r) =>
            r
              .split("|")
              .map((c) => c.trim())
              .filter((_, i, arr) => i !== 0 && i !== arr.length - 1)
          );

          return (
            <div key={idx} className="overflow-x-auto my-3 rounded-lg border border-slate-800 shadow-sm">
              <table className="markdown-table">
                <thead>
                  <tr>
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} className="font-mono text-xs text-slate-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((bRow, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                      {bRow.map((cell, cIdx) => (
                        <td key={cIdx} className="font-mono text-xs">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const textContent = block.content.join("\n").trim();
        if (!textContent) return null;

        return (
          <p key={idx} className="whitespace-pre-line">
            {textContent}
          </p>
        );
      })}
    </div>
  );
};
