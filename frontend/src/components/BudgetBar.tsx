"use client";
import { TokenStats } from "@/lib/api";

interface Props {
  stats: TokenStats;
}

export default function BudgetBar({ stats }: Props) {
  const { system_prompt_tokens, context_tokens, user_reserve_tokens, budget, total, remaining, over_budget } = stats;

  const systemPct  = (system_prompt_tokens / budget) * 100;
  const contextPct = (context_tokens / budget) * 100;
  const userPct    = (user_reserve_tokens / budget) * 100;
  const totalPct   = (total / budget) * 100;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Token Budget Visualization
        </h3>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${
            over_budget
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {over_budget ? "⚠ OVER BUDGET" : "✓ WITHIN BUDGET"}
        </span>
      </div>

      {/* Main stacked bar */}
      <div className="relative h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 mb-4">
        <div
          className="absolute top-0 left-0 h-full budget-system transition-all duration-700 ease-out"
          style={{ width: `${systemPct}%` }}
        />
        <div
          className="absolute top-0 h-full budget-context transition-all duration-700 ease-out"
          style={{ left: `${systemPct}%`, width: `${contextPct}%` }}
        />
        <div
          className="absolute top-0 h-full budget-user transition-all duration-700 ease-out"
          style={{ left: `${systemPct + contextPct}%`, width: `${userPct}%` }}
        />
        {/* Budget ceiling line */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white/40 z-10"
          style={{ left: "100%" }}
        />
        {/* Over-budget red flash */}
        {over_budget && (
          <div
            className="absolute top-0 h-full bg-red-500/30 z-10"
            style={{ left: "100%", width: `${totalPct - 100}%` }}
          />
        )}
      </div>

      {/* Three-source legend */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm budget-system flex-shrink-0" />
            <span className="text-[var(--text-secondary)]">System Prompt</span>
          </div>
          <span className="mono font-semibold text-[var(--text-primary)] ml-5">
            {system_prompt_tokens.toLocaleString()} tk
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm budget-context flex-shrink-0" />
            <span className="text-[var(--text-secondary)]">Context</span>
          </div>
          <span className="mono font-semibold text-[var(--text-primary)] ml-5">
            {context_tokens.toLocaleString()} tk
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm budget-user flex-shrink-0" />
            <span className="text-[var(--text-secondary)]">User Reserve</span>
          </div>
          <span className="mono font-semibold text-[var(--text-primary)] ml-5">
            {user_reserve_tokens.toLocaleString()} tk
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-sm flex-shrink-0 ${
                over_budget ? "bg-red-500" : "bg-white/10"
              }`}
            />
            <span className="text-[var(--text-secondary)]">
              {over_budget ? "Over" : "Remaining"}
            </span>
          </div>
          <span
            className={`mono font-semibold ml-5 ${
              over_budget ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {Math.abs(remaining).toLocaleString()} tk
          </span>
        </div>
      </div>

      {/* Total bar */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-[var(--text-muted)]">Total </span>
            <span className="mono font-bold text-[var(--text-primary)]">{total.toLocaleString()}</span>
            <span className="text-[var(--text-muted)]"> / {budget.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Used </span>
            <span
              className={`mono font-bold ${
                over_budget ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {Math.min(totalPct, 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          Budget ceiling: <span className="mono text-white/60">{budget.toLocaleString()} tokens</span>
        </div>
      </div>
    </div>
  );
}
