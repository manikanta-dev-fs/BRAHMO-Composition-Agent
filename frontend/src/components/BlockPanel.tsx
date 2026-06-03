"use client";
import { useState } from "react";
import { BlockInfo, NodeDetail } from "@/lib/api";
import NodeCard from "./NodeCard";

interface Props {
  blocks: Record<string, BlockInfo>;
  nodes: NodeDetail[];
}

const BLOCK_COLORS: Record<number, string> = {
  1: "from-purple-500/20 to-indigo-500/20 border-purple-500/30",
  2: "from-red-500/20 to-rose-500/20 border-red-500/30",
  3: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
  4: "from-red-600/20 to-orange-500/20 border-red-600/30",
  5: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
  6: "from-slate-500/10 to-slate-600/10 border-slate-500/20",
  7: "from-amber-500/20 to-yellow-500/20 border-amber-500/30",
  8: "from-indigo-500/20 to-purple-600/20 border-indigo-500/30",
};

const BLOCK_ICONS: Record<number, string> = {
  1: "👤",
  2: "🔴",
  3: "📋",
  4: "🛑",
  5: "📂",
  6: "❓",
  7: "⚠️",
  8: "📌",
};

export default function BlockPanel({ blocks, nodes }: Props) {
  const [openBlocks, setOpenBlocks] = useState<Set<number>>(new Set([2, 3, 4]));
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);

  const toggle = (n: number) => {
    setOpenBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const blockNumbers = Object.keys(blocks)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
        8-Block Structure
      </h3>

      <div className="space-y-2">
        {blockNumbers.map((num) => {
          const block = blocks[num];
          const isOpen = openBlocks.has(num);
          const blockNodes = nodes.filter((n) => n.block === num);
          const gradient = BLOCK_COLORS[num] || "from-slate-500/10 to-slate-600/10 border-slate-500/20";

          return (
            <div
              key={num}
              className={`rounded-lg border bg-gradient-to-r ${gradient} overflow-hidden transition-all duration-200`}
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                onClick={() => toggle(num)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{BLOCK_ICONS[num] || "📄"}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-muted)]">Block {num}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {block.label}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      {block.node_count} node{block.node_count !== 1 ? "s" : ""} · {block.tokens} tokens
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-700"
                      style={{ width: `${Math.min((block.tokens / 400) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="mono text-xs text-[var(--text-secondary)]">
                    {block.tokens}t
                  </span>
                  <svg
                    className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-3 space-y-2 border-t border-white/5 pt-2">
                  {blockNodes.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic py-2">
                      {num === 6 ? "Empty (reserved for v0.2)" : "No nodes in this block"}
                    </p>
                  ) : (
                    blockNodes.map((node) => (
                      <NodeCard key={node.id} node={node} compact />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
