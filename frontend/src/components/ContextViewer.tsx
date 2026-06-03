"use client";

interface Props {
  contextString: string;
  onClose: () => void;
}

export default function ContextViewer({ contextString, onClose }: Props) {
  const copy = () => {
    navigator.clipboard.writeText(contextString);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col glass-card border border-white/15 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Final Context String
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Ready for system-level injection into the AI
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
            >
              Copy
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[var(--text-secondary)] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
            {contextString}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/8 text-xs text-[var(--text-muted)]">
          {contextString.length.toLocaleString()} characters · {contextString.split("\n").length} lines
        </div>
      </div>
    </div>
  );
}
