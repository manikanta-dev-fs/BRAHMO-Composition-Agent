"use client";
import { useState } from "react";
import { NodeDetail } from "@/lib/api";

interface Props {
  node: NodeDetail;
  compact?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  CONSTRAINT: "🔒",
  DECISION: "📋",
  ANTI_PATTERN: "⚠️",
  FACT: "📌",
  STATIC: "📄",
};

const COMPRESSION_COLORS: Record<string, string> = {
  FULL: "text-emerald-400",
  COMPRESSED: "text-blue-400",
  CONSTRAINT_ONLY: "text-amber-400",
  OMIT: "text-gray-500",
};

const TYPE_CLASS: Record<string, string> = {
  CONSTRAINT: "badge-constraint",
  DECISION: "badge-decision",
  ANTI_PATTERN: "badge-anti_pattern",
  FACT: "badge-fact",
  STATIC: "badge-static",
};

export default function NodeCard({ node, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  const typeClass = TYPE_CLASS[node.type] || "badge-static";
  const compressionColor = COMPRESSION_COLORS[node.final_compression] || "text-gray-400";
  const isOmitted = node.final_compression === "OMIT";

  if (compact) {
    return (
      <div
        className={`rounded-lg px-3 py-2 border transition-all cursor-pointer
          ${isOmitted ? "opacity-40 border-white/5 bg-white/2" : "border-white/8 bg-white/3 hover:bg-white/5"}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">{TYPE_ICONS[node.type] || "📄"}</span>
            <span className="text-xs font-medium text-[var(--text-primary)] truncate">{node.title}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs mono font-semibold ${compressionColor}`}>
              {node.final_compression === "CONSTRAINT_ONLY" ? "C-ONLY" : node.final_compression}
            </span>
            <span className="text-xs text-[var(--text-muted)] mono">{node.tokens_used}t</span>
            {node.is_constraint_protected && (
              <span title="CONSTRAINT — never compressed" className="text-red-400 text-xs">🛡</span>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[var(--text-muted)]">Retrieval </span>
                <span className="mono text-[var(--text-primary)]">{node.retrieval_weight.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Injection </span>
                <span className="mono text-[var(--text-primary)]">{node.injection_weight.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Distance </span>
                <span className="mono text-[var(--text-primary)]">{node.distance}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Zone </span>
                <span className="mono text-[var(--text-primary)]">{node.zone ?? "—"}</span>
              </div>
            </div>
            <div className="text-xs text-[var(--text-muted)] italic mt-1">{node.include_reason}</div>
            {node.content_used && (
              <div className="text-xs text-[var(--text-secondary)] bg-white/3 rounded p-2 mt-1 leading-relaxed">
                {node.content_used}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full card
  return (
    <div
      className={`glass-card p-4 cursor-pointer transition-all duration-200
        ${isOmitted ? "opacity-50" : "hover:border-white/15"}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xl mt-0.5">{TYPE_ICONS[node.type] || "📄"}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge ${typeClass}`}>{node.type.replace("_", " ")}</span>
              {node.is_constraint_protected && (
                <span className="badge" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>
                  🛡 Protected
                </span>
              )}
              {node.status === "REVIEW_REQUIRED" && (
                <span className="badge" style={{ background: "rgba(245,158,11,0.15)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.3)" }}>
                  ⚠ STALE
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-1">{node.title}</h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{node.block_label}</p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className={`text-sm font-bold mono ${compressionColor}`}>
            {node.final_compression === "CONSTRAINT_ONLY" ? "C-ONLY" : node.final_compression}
          </div>
          <div className="text-xs text-[var(--text-muted)] mono">{node.tokens_used} tokens</div>
        </div>
      </div>

      {/* Dual weight bars */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">Retrieval</span>
            <span className="mono text-[var(--text-secondary)]">{node.retrieval_weight.toFixed(2)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${node.retrieval_weight * 100}%`,
                background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">Injection</span>
            <span className="mono text-[var(--text-secondary)]">{node.injection_weight.toFixed(2)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${node.injection_weight * 100}%`,
                background: "linear-gradient(90deg, #06b6d4, #3b82f6)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Distance + compression info */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-muted)]">
            Distance: <span className="mono text-[var(--text-secondary)]">{node.distance}</span>
          </span>
          <span className="text-[var(--text-muted)]">
            Zone: <span className="mono text-[var(--text-secondary)]">{node.zone ?? "—"}</span>
          </span>
          {node.was_compressed && (
            <span className="text-amber-400">
              {node.initial_compression} → {node.final_compression}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2 animate-fade-in">
          {/* Reason */}
          <div className="text-xs text-[var(--text-muted)] italic bg-white/3 rounded-lg p-2">
            {node.include_reason}
          </div>

          {node.decision_trace?.length > 0 && (
            <div className="text-xs text-[var(--text-secondary)] bg-white/3 rounded-lg p-2 border border-white/5">
              <div className="text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                Decision trace
              </div>
              <ul className="space-y-1">
                {node.decision_trace.map((step, idx) => (
                  <li key={idx}>- {step}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Token sizes */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: "Full", val: node.tokens_full, color: "text-emerald-400" },
              { label: "Compressed", val: node.tokens_compressed, color: "text-blue-400" },
              { label: "C-Only", val: node.tokens_constraint_only, color: "text-amber-400" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white/3 rounded p-2 text-center">
                <div className={`mono font-semibold ${color}`}>{val}t</div>
                <div className="text-[var(--text-muted)] mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Content used */}
          {node.content_used && (
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed bg-white/3 rounded-lg p-3 border border-white/5">
              <div className="text-[var(--text-muted)] mb-1 uppercase text-xs tracking-wider">Content injected:</div>
              {node.content_used}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
