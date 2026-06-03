"use client";

import { useState, useCallback } from "react";
import { compose, ComposeResult } from "@/lib/api";
import BudgetBar from "@/components/BudgetBar";
import BlockPanel from "@/components/BlockPanel";
import NodeCard from "@/components/NodeCard";
import CompressionLog from "@/components/CompressionLog";
import BudgetSlider from "@/components/BudgetSlider";
import ContextViewer from "@/components/ContextViewer";

const USERS = [
  { id: "U-VIKRAM", label: "Dr. Vikram — HOD, Orthopaedics" },
  { id: "U-PRIYA",  label: "Nurse Priya — Ortho Ward" },
];

const PATIENTS = [
  { id: "PAT-RAJAN", label: "Mr. Rajan (68M) — Cardiac stent, AF on Warfarin, Knee OA" },
  { id: "PAT-PADMA", label: "Mrs. Padma (62F) — Type 2 DM, Hypertension" },
];

const TYPE_COLORS: Record<string, string> = {
  FULL: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  COMPRESSED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  CONSTRAINT_ONLY: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  OMIT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function Home() {
  const [userId,    setUserId]    = useState("U-VIKRAM");
  const [patientId, setPatientId] = useState("PAT-RAJAN");
  const [budget,    setBudget]    = useState(4000);
  const [result,    setResult]    = useState<ComposeResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [showCtx,   setShowCtx]   = useState(false);
  const [activeTab, setActiveTab] = useState<"blocks" | "nodes" | "log">("blocks");
  const [nodeFilter, setNodeFilter] = useState<string>("ALL");

  const handleCompose = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await compose(userId, patientId, budget);
      setResult(data);
      setActiveTab("blocks");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userId, patientId, budget]);

  const filteredNodes = result?.node_details.filter((n) => {
    if (nodeFilter === "ALL") return n.type !== "STATIC";
    if (nodeFilter === "OMITTED") return n.final_compression === "OMIT";
    if (nodeFilter === "PROTECTED") return n.is_constraint_protected;
    return n.type === nodeFilter;
  }) ?? [];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="border-b border-white/6 sticky top-0 z-40 backdrop-blur-xl" style={{ background: "rgba(10,13,20,0.9)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              🧠
            </div>
            <div>
              <h1 className="text-base font-bold gradient-text">BRAHMO Composition Agent</h1>
              <p className="text-xs text-[var(--text-muted)]">
                Token Budget + 8-Block Assembly + Iterative Compression
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-[var(--text-secondary)] hover:border-white/20 hover:text-white transition-all"
            >
              API Docs ↗
            </a>
            {result && (
              <button
                onClick={() => setShowCtx(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-indigo-500/40 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all"
              >
                View Context String
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Control Panel ───────────────────────────────────── */}
        <div className="glass-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* User selector */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                User / Clinician
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
              >
                {USERS.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </div>

            {/* Patient selector */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                Patient
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500/50 transition-colors"
              >
                {PATIENTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Compose button */}
            <div className="flex items-end">
              <button
                onClick={handleCompose}
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 relative overflow-hidden"
                style={{
                  background: loading
                    ? "rgba(99,102,241,0.3)"
                    : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white",
                  border: "1px solid rgba(99,102,241,0.4)",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Composing...
                  </span>
                ) : (
                  "⚡ Compose Context"
                )}
              </button>
            </div>
          </div>

          {/* Budget info row */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-6 text-xs text-[var(--text-muted)]">
            <span>Token Budget: <span className="mono text-[var(--text-secondary)]">{budget.toLocaleString()}</span></span>
            <span>System Prompt Reserve: <span className="mono text-[var(--text-secondary)]">~800</span></span>
            <span>User Message Reserve: <span className="mono text-[var(--text-secondary)]">200</span></span>
            <span>Available for context: <span className="mono text-indigo-300">{(budget - 800 - 200).toLocaleString()}</span></span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* Budget Slider — always visible */}
        <BudgetSlider budget={budget} onChange={setBudget} disabled={loading} />

        {/* ── Results ─────────────────────────────────────────── */}
        {result && (
          <div className="space-y-6 animate-fade-in">

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Nodes", value: result.total_nodes, icon: "📦", color: "text-indigo-300" },
                { label: "Included", value: result.nodes_included, icon: "✅", color: "text-emerald-300" },
                { label: "Omitted", value: result.nodes_omitted, icon: "❌", color: "text-gray-400" },
                { label: "Constraints Protected", value: result.constraints_protected, icon: "🛡", color: "text-red-300" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="glass-card p-4 text-center">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className={`text-2xl font-bold mono ${color}`}>{value}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Compression summary pills */}
            <div className="glass-card p-5">
              <h3 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Compression Summary · {result.iterations} iteration{result.iterations !== 1 ? "s" : ""} to fit budget
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.compression_summary).map(([level, count]) => (
                  <span key={level} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${TYPE_COLORS[level] || ""}`}>
                    {count} × {level === "CONSTRAINT_ONLY" ? "CONSTRAINT-ONLY" : level}
                  </span>
                ))}
                {result.constraints_protected > 0 && (
                  <span className="px-3 py-1.5 rounded-lg border text-xs font-semibold bg-red-500/10 text-red-300 border-red-500/20">
                    🛡 {result.constraints_protected} CONSTRAINTs always FULL
                  </span>
                )}
              </div>
            </div>

            {/* Budget warning */}
            {result.budget_warning && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-300">
                ⚠️ {result.budget_warning}
              </div>
            )}

            {/* Token Budget Bar */}
            <BudgetBar stats={result.token_stats} />

            {/* Tabs */}
            <div className="flex gap-2">
              {(["blocks", "nodes", "log"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent hover:border-white/10"
                  }`}
                >
                  {tab === "blocks" && "🏗 8-Block Structure"}
                  {tab === "nodes"  && "📋 All Nodes"}
                  {tab === "log"    && "📈 Compression Log"}
                </button>
              ))}
            </div>

            {/* Tab: 8-Block Structure */}
            {activeTab === "blocks" && (
              <BlockPanel blocks={result.block_breakdown} nodes={result.node_details} />
            )}

            {/* Tab: All Nodes */}
            {activeTab === "nodes" && (
              <div className="space-y-4">
                {/* Filter bar */}
                <div className="flex flex-wrap gap-2">
                  {["ALL", "CONSTRAINT", "DECISION", "ANTI_PATTERN", "FACT", "OMITTED", "PROTECTED"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setNodeFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        nodeFilter === f
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                          : "text-[var(--text-muted)] border-white/8 hover:border-white/15 hover:text-white"
                      }`}
                    >
                      {f} ({
                        f === "ALL" ? result.node_details.filter(n => n.type !== "STATIC").length
                        : f === "OMITTED" ? result.node_details.filter(n => n.final_compression === "OMIT").length
                        : f === "PROTECTED" ? result.node_details.filter(n => n.is_constraint_protected).length
                        : result.node_details.filter(n => n.type === f).length
                      })
                    </button>
                  ))}
                </div>

                <div className="grid gap-3">
                  {filteredNodes.map((node) => (
                    <NodeCard key={node.id} node={node} />
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Compression Log */}
            {activeTab === "log" && (
              <CompressionLog log={result.compression_log} iterations={result.iterations} />
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(99,102,241,0.2)" }}>
              🧠
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Ready to Compose</h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md leading-relaxed">
              Select a clinician and patient, then click{" "}
              <span className="text-indigo-300 font-medium">Compose Context</span> to transform
              28 candidate nodes into a structured, token-efficient context string.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-[var(--text-muted)]">
              <div className="glass-card p-3">
                <div className="text-lg mb-1">📊</div>
                <div className="font-medium text-[var(--text-secondary)]">3-Source Counting</div>
                <div className="mt-1">System + Context + User</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-lg mb-1">🏗</div>
                <div className="font-medium text-[var(--text-secondary)]">8 Blocks</div>
                <div className="mt-1">Fixed priority order</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-lg mb-1">🔒</div>
                <div className="font-medium text-[var(--text-secondary)]">CONSTRAINT Shield</div>
                <div className="mt-1">Never compressed</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Context string modal */}
      {showCtx && result && (
        <ContextViewer contextString={result.context_string} onClose={() => setShowCtx(false)} />
      )}
    </div>
  );
}
