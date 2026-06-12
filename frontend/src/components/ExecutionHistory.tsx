import type { Prompt } from "../types";

interface ExecutionHistoryProps {
  title: string;
  prompts: Prompt[];
  isExecuting: boolean;
  onCancel: () => void;
  variant: "normal" | "pruned";
}

export default function ExecutionHistory({
  title,
  prompts,
  isExecuting,
  onCancel,
  variant,
}: ExecutionHistoryProps) {
  return (
    <div className="rounded-3xl border border-[#2dd4bf]/20 bg-[#081b20]/75 p-5 shadow-2xl shadow-black/30">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
            {variant === "normal" ? "Base model" : "Pruned model"}
          </p>

          <h2 className="text-xl font-bold text-[#f8fafc]">
            {title}
          </h2>
        </div>

        {isExecuting && (
          <button
            onClick={onCancel}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/30"
          >
            Cancel
          </button>
        )}
      </div>

      {prompts.length === 0 ? (
        <div className="rounded-2xl border border-[#334155] bg-[#0f172a]/70 p-6 text-center text-sm text-[#94a3b8]">
          No executions yet.
        </div>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="rounded-2xl border border-[#334155] bg-[#0f172a]/70 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-xs text-[#94a3b8]">
                  {prompt.timestamp}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    prompt.attackSuccess
                      ? "bg-red-500/20 text-red-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {prompt.attackSuccess
                    ? "Attack succeeded"
                    : "Attack blocked"}
                </span>
              </div>

              <p className="mb-3 text-sm font-semibold text-[#e2e8f0]">
                Model output
              </p>

              <div className="whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-sm leading-relaxed text-[#cbd5e1]">
                {prompt.scriptOutput || "Waiting for output..."}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}