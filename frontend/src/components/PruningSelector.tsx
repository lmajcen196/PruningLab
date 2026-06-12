import { Info, Scissors } from "lucide-react";
import type { PruningMethod } from "../types";
import pruningMethods from "./pruningMethods";

interface Props {
  selectedPruningMethod: PruningMethod;
  setSelectedPruningMethod: (method: PruningMethod) => void;
  pruningAmount: number;
  setPruningAmount: (value: number) => void;
  maxPruningAmount: number;
  attackNeuronCount: number | null;
  selectedPrunedNeuronCount: number | null;
  selectedModelName: string;
  isExecuting: boolean;
  onInfoClick: (title: string, body: string, refs: string[]) => void;
}

function PruningSelector({
  selectedPruningMethod,
  setSelectedPruningMethod,
  pruningAmount,
  setPruningAmount,
  maxPruningAmount,
  attackNeuronCount,
  selectedPrunedNeuronCount,
  selectedModelName,
  isExecuting,
  onInfoClick,
}: Props) {
  const isActivationBased = selectedPruningMethod.id === "activation_based";
  const isMagnitudeBased = selectedPruningMethod.id === "magnitude_based";
  const isNoPruning = selectedPruningMethod.id === "none";

  const hasAttackNeuronCount = isActivationBased && attackNeuronCount !== null;

  const pruningLabel = isActivationBased
    ? "Postotak prunanja (% attack neurona)"
    : isMagnitudeBased
      ? "Postotak prunanja (% težina modela)"
      : "Postotak prunanja";

  const pruningDescription = isActivationBased
    ? "0–100% pronađenih attack neurona"
    : isMagnitudeBased
      ? "0–30% svih odabranih težina modela"
      : "Pruning nije aktivan";

  return (
    <div className="rounded-2xl border border-[#14b8a6]/25 bg-gradient-to-br from-[#092821]/95 via-[#10212b]/95 to-[#111827]/95 p-5 shadow-xl shadow-black/20 transition-all duration-300 hover:border-[#14b8a6]/45">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#14b8a6]/30 bg-[#14b8a6]/10 text-[#14b8a6]">
            <Scissors className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5eead4]">
              Pruning
            </p>

            <h3 className="text-lg font-bold text-[#f8fafc]">
              Pruning Method
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onInfoClick(
              selectedPruningMethod.name,
              selectedPruningMethod.longDescription ||
                selectedPruningMethod.description,
              selectedPruningMethod.references ?? []
            )
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#14b8a6]/35 bg-[#14b8a6]/10 text-[#14b8a6] transition-all duration-200 hover:bg-[#14b8a6]/20 hover:border-[#14b8a6]/60"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>

      <select
        value={selectedPruningMethod.id}
        disabled={isExecuting}
        onChange={(e) => {
          const method = pruningMethods.find((m) => m.id === e.target.value);

          if (method) {
            setSelectedPruningMethod(method);
          }
        }}
        className="mb-4 w-full rounded-xl border-2 border-[#14b8a6]/35 bg-[#252532] px-4 py-3 text-base font-semibold text-[#f8fafc] outline-none transition-all duration-200 hover:border-[#14b8a6]/60 focus:border-[#14b8a6]"
      >
        {pruningMethods.map((method) => (
          <option key={method.id} value={method.id}>
            {method.name}
          </option>
        ))}
      </select>

      <div className="mb-4 rounded-xl border border-[#14b8a6]/20 bg-[#14b8a6]/10 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-1 h-4 w-4 shrink-0 text-[#14b8a6]" />

          <p className="text-sm leading-relaxed text-[#cbd5e1]">
            {selectedPruningMethod.description}
          </p>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 ${
          isActivationBased ? "sm:grid-cols-2" : "sm:grid-cols-1"
        }`}
      >
        {isActivationBased && (
          <div className="rounded-xl border border-[#334155] bg-[#020617]/45 p-4">
            <p className="text-sm font-semibold text-[#f8fafc]">
              Attack neurons
            </p>

            {hasAttackNeuronCount ? (
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-1 2xl:grid-cols-2">
                <div className="rounded-xl border border-[#334155] bg-[#020617]/55 p-3">
                  <p className="mb-1 text-xs text-[#94a3b8]">
                    Model
                  </p>

                  <p className="font-semibold text-[#f8fafc]">
                    {selectedModelName}
                  </p>
                </div>

                <div className="rounded-xl border border-[#14b8a6]/30 bg-[#042f2e]/45 p-3">
                  <p className="mb-1 text-xs text-[#94a3b8]">
                    Detected
                  </p>

                  <p className="text-2xl font-bold text-[#14b8a6]">
                    {attackNeuronCount}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-[#94a3b8]">
                Za ovaj model nije pronađen activation score file. Odaberi
                model za koji postoje attack neuroni.
              </p>
            )}
          </div>
        )}

        <div className="rounded-xl border border-[#334155] bg-[#020617]/45 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#f8fafc]">
                {pruningLabel}
              </p>

              <p className="text-xs text-[#94a3b8]">
                {pruningDescription}
              </p>
            </div>

            <div className="rounded-lg border border-[#14b8a6]/25 bg-[#14b8a6]/10 px-3 py-1">
              <span className="text-lg font-bold text-[#14b8a6]">
                {pruningAmount.toFixed(0)}%
              </span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={maxPruningAmount}
            step="1"
            value={pruningAmount}
            onChange={(e) => setPruningAmount(Number(e.target.value))}
            disabled={isExecuting || isNoPruning}
            className="w-full accent-[#14b8a6]"
          />

          <div className="mt-1 flex justify-between text-xs text-[#64748b]">
            <span>0%</span>
            <span>{maxPruningAmount}%</span>
          </div>

          <div className="mt-3 rounded-xl border border-[#14b8a6]/20 bg-[#042f2e]/35 p-3 text-sm leading-relaxed text-[#cbd5e1]">
            {isActivationBased && hasAttackNeuronCount && (
              <span>
                Pruna se približno{" "}
                <span className="font-bold text-[#14b8a6]">
                  {selectedPrunedNeuronCount}
                </span>{" "}
                od {attackNeuronCount} attack neurona.
              </span>
            )}

            {isActivationBased && !hasAttackNeuronCount && (
              <span>
                Odaberi model za koji postoji activation_scores JSON.
              </span>
            )}

            {isMagnitudeBased && (
              <span>
                Pruna se{" "}
                <span className="font-bold text-[#14b8a6]">
                  {pruningAmount.toFixed(0)}%
                </span>{" "}
                težina modela s najmanjom apsolutnom vrijednošću.
              </span>
            )}

            {isNoPruning && <span>Pruning nije uključen.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PruningSelector;