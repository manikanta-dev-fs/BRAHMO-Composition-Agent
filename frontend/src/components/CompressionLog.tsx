"use client";
import { CompressionLogEntry } from "@/lib/api";

interface Props {
  log: CompressionLogEntry[];
  iterations: number;
}

const LEVEL_COLOR: Record<string, string> = {
  FULL: "text-emerald-400",
  COMPRESSED: "text-blue-400",
  CONSTRAINT_ONLY: "text-amber-400",
  OMIT: "text-gray-500",
};

const TYPE_ICON: Record<string, string> = {
  DECISION: "📋",
  FACT: "📌",
  ANTI_PATTERN: "⚠️",
  CONSTRAINT: "🔒",
};

export default function CompressionLog({ log, iterations }: Props) {
  const initial = log[0];
  const passes  = log.slice(1);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Iterative Compression Log
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">
            {iterations} pass{iterations !== 1 ? "es" : ""}
          </span>
          {iterations > 0 ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
              Compression applied
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              No compression needed
            </span>
          )}
        </div>
      </div>

      {/* Initial state */}
      {initial && (
        <div className="mb-3 bg-white/3 rounded-lg px-4 py-3 border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">0</span>
              <span className="font-semibold text-[var(--text-primary)]">Initial State</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[var(--text-muted)]">Context: <span className="mono text-[var(--text-primary)]">{initial.context_tokens.toLocaleString()}</span></span>
              <span className="text-[var(--text-muted)]">Total: <span className="mono font-bold text-[var(--text-primary)]">{initial.total_tokens.toLocaleString()}</span></span>
              {initial.over_budget && (
                <span className="text-red-400 font-semibold">⚠ Over budget</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compression passes */}
      {passes.length > 0 ? (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {passes.map((entry, idx) => {
            const fromColor = LEVEL_COLOR[entry.from_level || ""] || "text-gray-400";
            const toColor   = LEVEL_COLOR[entry.to_level   || ""] || "text-gray-400";

            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/2 border border-white/5 text-xs hover:bg-white/4 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-white/8 text-[var(--text-muted)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {entry.pass}
                  </span>
                  <span className="text-lg flex-shrink-0">
                    {TYPE_ICON[entry.node_type || ""] || "📄"}
                  </span>
                  <span className="text-[var(--text-primary)] font-medium truncate">
                    {entry.node_title}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`mono font-semibold ${fromColor}`}>
                      {entry.from_level === "CONSTRAINT_ONLY" ? "C-ONLY" : entry.from_level}
                    </span>
                    <span className="text-[var(--text-muted)]">→</span>
                    <span className={`mono font-semibold ${toColor}`}>
                      {entry.to_level === "CONSTRAINT_ONLY" ? "C-ONLY" : entry.to_level}
                    </span>
                  </div>
                  <span className="text-emerald-400 mono font-semibold w-16 text-right">
                    -{entry.tokens_saved}t
                  </span>
                  <span
                    className={`w-12 text-right ${
                      entry.over_budget ? "text-red-400" : "text-emerald-400"
                    } mono`}
                  >
                    {entry.total_tokens.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-[var(--text-muted)] text-sm">
          <div className="text-3xl mb-2">✅</div>
          All nodes fit within budget without compression
        </div>
      )}

      {/* Final state summary */}
      {passes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">
              Total tokens saved:{" "}
              <span className="mono font-bold text-emerald-400">
                {passes.reduce((acc, e) => acc + e.tokens_saved, 0).toLocaleString()} tokens
              </span>
            </span>
            <span className="text-[var(--text-muted)]">
              Final total:{" "}
              <span className="mono font-bold text-[var(--text-primary)]">
                {passes[passes.length - 1]?.total_tokens.toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
