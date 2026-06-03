"use client";

interface Props {
  budget: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

const PRESETS = [2000, 3000, 4000, 6000, 8000];

export default function BudgetSlider({ budget, onChange, disabled }: Props) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Budget Slider
        </h3>
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
          <span className="text-xs text-[var(--text-muted)]">Budget:</span>
          <span className="mono font-bold text-[var(--text-primary)]">{budget.toLocaleString()}</span>
          <span className="text-xs text-[var(--text-muted)]">tokens</span>
        </div>
      </div>

      <input
        type="range"
        min={1000}
        max={8000}
        step={100}
        value={budget}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full mb-4"
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #8b5cf6 ${((budget - 1000) / 7000) * 100}%, rgba(255,255,255,0.1) ${((budget - 1000) / 7000) * 100}%)`,
        }}
      />

      {/* Preset buttons */}
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            disabled={disabled}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${budget === p
                ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/50"
                : "bg-white/5 text-[var(--text-muted)] border border-white/8 hover:bg-white/10 hover:text-[var(--text-primary)]"
              }`}
          >
            {(p / 1000).toFixed(0)}k
          </button>
        ))}
      </div>

      <div className="mt-3 text-xs text-[var(--text-muted)] flex justify-between">
        <span>1,000 (tight)</span>
        <span>↕ drag to watch compression adapt</span>
        <span>8,000 (spacious)</span>
      </div>
    </div>
  );
}
