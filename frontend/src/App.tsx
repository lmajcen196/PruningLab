"use client";

import "./App.css";
import { useEffect, useState } from "react";
import type React from "react";
import { Sprout, FlaskConical, BarChart3, Cpu } from "lucide-react";

import type { Attack, Model, Prompt, PruningMethod } from "./types";

import attacks from "./components/attacks";
import models from "./components/models";
import pruningMethods from "./components/pruningMethods";

import AttackSelector from "./components/AttackSelector";
import PruningSelector from "./components/PruningSelector";
import ExecutionHistory from "./components/ExecutionHistory";
import PromptInput from "./components/PromptInput";
import InfoModal from "./components/InfoModal";
import StatisticsView from "./components/StatisticsView";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const USE_MOCK_WHEN_NO_BACKEND = false;

const ATTACK_NEURON_COUNTS: Record<string, Record<string, number>> = {
  "mistral-7b-instruct": {
    activation_based: 20,
  },
  // Update these counts after generating activation_scores JSON files.
  "llama-3-8b-instruct": {
    activation_based: 1713,
  },
  "gemma-2-9b-instruct": {
    activation_based: 366,
  },
};

const ACTIVATION_SUPPORTED_MODELS = Object.keys(ATTACK_NEURON_COUNTS);

export type TestResult = {
  id: string;
  prompt: string;
  timestamp: string;
  modelId: string;
  modelName: string;
  attackId: string;
  attackName: string;
  pruningMethodId: string;
  pruningMethodName: string;
  pruningAmount: number;
  variant: "normal" | "pruned";
  attackSuccess: boolean;
  isBlocked: boolean;
  accuracy: number;
  modelSizeMb: number;
};

function parseOutput(raw: string) {
  let attackSuccess = false;
  let isBlocked = false;

  const cleanedLines = raw.split("\n").filter((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("[ATTACK_SUCCESS]")) {
      attackSuccess =
        trimmed.replace("[ATTACK_SUCCESS]", "").trim() === "true";
      return false;
    }

    if (trimmed.startsWith("Blocked input")) {
      isBlocked = true;
    }

    if (trimmed.startsWith("[PROGRESS]")) {
      return false;
    }

    return true;
  });

  return {
    output: cleanedLines.join("\n").trim(),
    attackSuccess,
    isBlocked,
  };
}

function App() {
  const [selectedPruningMethod, setSelectedPruningMethod] =
    useState<PruningMethod>(
      pruningMethods.find((method) => method.id === "activation_based") ||
        pruningMethods[0]
    );

  const [selectedModel, setSelectedModel] = useState<Model>(
    models.find((model) => model.id === "mistral-7b-instruct") || models[0]
  );

  const [selectedAttack, setSelectedAttack] = useState<Attack>(
    attacks.find((attack) => attack.id === "none") || attacks[0]
  );

  const [pruningAmount, setPruningAmount] = useState(50);
  const [experimentCount, setExperimentCount] = useState(1);
  const [message, setMessage] = useState("");

  const [normalPrompts, setNormalPrompts] = useState<Prompt[]>([]);
  const [prunedPrompts, setPrunedPrompts] = useState<Prompt[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState("");
  const [infoBody, setInfoBody] = useState("");
  const [infoRefs, setInfoRefs] = useState<string[]>([]);

  const [abortControllers, setAbortControllers] = useState<AbortController[]>(
    []
  );

  const [isExecuting, setIsExecuting] = useState(false);
  const [activeView, setActiveView] = useState<"tester" | "statistics">(
    "tester"
  );

  const isActivationBased =
    selectedPruningMethod.id === "activation_based";

  const isMagnitudeBased =
    selectedPruningMethod.id === "magnitude_based";

  const maxPruningAmount = isMagnitudeBased ? 30 : 100;

  const availableModels = isActivationBased
    ? models.filter((model) =>
        ACTIVATION_SUPPORTED_MODELS.includes(model.id)
      )
    : models;

  const attackNeuronCount =
    ATTACK_NEURON_COUNTS[selectedModel.id]?.[selectedPruningMethod.id] ?? null;

  const selectedPrunedNeuronCount =
    attackNeuronCount === null
      ? null
      : Math.round((attackNeuronCount * pruningAmount) / 100);

  useEffect(() => {
    if (
      isActivationBased &&
      !availableModels.some((model) => model.id === selectedModel.id)
    ) {
      const firstSupportedModel = availableModels[0];

      if (firstSupportedModel) {
        setSelectedModel(firstSupportedModel);
      }
    }
  }, [isActivationBased, availableModels, selectedModel.id]);

  useEffect(() => {
    if (pruningAmount > maxPruningAmount) {
      setPruningAmount(maxPruningAmount);
    }
  }, [pruningAmount, maxPruningAmount]);

  const handleCancel = async () => {
    abortControllers.forEach((controller) => controller.abort());
    setAbortControllers([]);
    setIsExecuting(false);
  };

  const handleInfoClick = (title: string, body: string, refs: string[]) => {
    setInfoTitle(title);
    setInfoBody(body);
    setInfoRefs(refs);
    setInfoModalOpen(true);
  };

  const updatePromptById = (
    setHistory: React.Dispatch<React.SetStateAction<Prompt[]>>,
    promptId: string,
    updates: Partial<Prompt>
  ) => {
    setHistory((prev) =>
      prev.map((prompt) =>
        prompt.id === promptId ? { ...prompt, ...updates } : prompt
      )
    );
  };

  const createResult = ({
    prompt,
    model,
    attack,
    pruningMethod,
    pruningAmount,
    variant,
    attackSuccess,
    isBlocked,
  }: {
    prompt: string;
    model: Model;
    attack: Attack;
    pruningMethod: PruningMethod;
    pruningAmount: number;
    variant: "normal" | "pruned";
    attackSuccess: boolean;
    isBlocked: boolean;
  }): TestResult => {
    const accuracy = variant === "normal" ? 92.4 : 89.7;
    const modelSizeMb = variant === "normal" ? 498 : 351;

    return {
      id: crypto.randomUUID(),
      prompt,
      timestamp: new Date().toLocaleString(),
      modelId: model.id,
      modelName: model.name,
      attackId: attack.id,
      attackName: attack.name,
      pruningMethodId: pruningMethod.id,
      pruningMethodName: pruningMethod.name,
      pruningAmount,
      variant,
      attackSuccess,
      isBlocked,
      accuracy,
      modelSizeMb,
    };
  };

  const runMockExperiment = async ({
    normalPromptId,
    prunedPromptId,
    currentMessage,
    currentPruningAmount,
    currentModel,
    currentAttack,
    currentPruningMethod,
    experimentIndex,
  }: {
    normalPromptId: string;
    prunedPromptId: string;
    currentMessage: string;
    currentPruningAmount: number;
    currentModel: Model;
    currentAttack: Attack;
    currentPruningMethod: PruningMethod;
    experimentIndex: number;
  }) => {
    updatePromptById(setNormalPrompts, normalPromptId, {
      scriptOutput: "Running mock base model...",
      progress: 50,
    });

    updatePromptById(setPrunedPrompts, prunedPromptId, {
      scriptOutput: "Running mock pruned model...",
      progress: 50,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const baseAttackSuccess = experimentIndex % 4 !== 0;
    const prunedAttackSuccess = experimentIndex % 4 === 0;

    const baseOutput = baseAttackSuccess
      ? "Mock base model response: attack succeeded. The model complied with the jailbreak prompt."
      : "Mock base model response: I cannot assist with that request.";

    const prunedOutput = prunedAttackSuccess
      ? "Mock pruned model response: attack still succeeded. The model complied."
      : "Mock pruned model response: I’m sorry, but I can’t help with that request.";

    updatePromptById(setNormalPrompts, normalPromptId, {
      scriptOutput: baseOutput,
      progress: 100,
      attackSuccess: baseAttackSuccess,
      isBlocked: !baseAttackSuccess,
    });

    updatePromptById(setPrunedPrompts, prunedPromptId, {
      scriptOutput: prunedOutput,
      progress: 100,
      attackSuccess: prunedAttackSuccess,
      isBlocked: !prunedAttackSuccess,
    });

    setTestResults((prev) => [
      ...prev,
      createResult({
        prompt: currentMessage,
        model: currentModel,
        attack: currentAttack,
        pruningMethod: currentPruningMethod,
        pruningAmount: 0,
        variant: "normal",
        attackSuccess: baseAttackSuccess,
        isBlocked: !baseAttackSuccess,
      }),
      createResult({
        prompt: currentMessage,
        model: currentModel,
        attack: currentAttack,
        pruningMethod: currentPruningMethod,
        pruningAmount: currentPruningAmount,
        variant: "pruned",
        attackSuccess: prunedAttackSuccess,
        isBlocked: !prunedAttackSuccess,
      }),
    ]);
  };

  const runSingleExperiment = async ({
    normalPromptId,
    prunedPromptId,
    currentMessage,
    currentPruningAmount,
    currentModel,
    currentAttack,
    currentPruningMethod,
    controller,
    experimentIndex,
  }: {
    normalPromptId: string;
    prunedPromptId: string;
    currentMessage: string;
    currentPruningAmount: number;
    currentModel: Model;
    currentAttack: Attack;
    currentPruningMethod: PruningMethod;
    controller: AbortController;
    experimentIndex: number;
  }) => {
    if (USE_MOCK_WHEN_NO_BACKEND) {
      await runMockExperiment({
        normalPromptId,
        prunedPromptId,
        currentMessage,
        currentPruningAmount,
        currentModel,
        currentAttack,
        currentPruningMethod,
        experimentIndex,
      });
      return;
    }

    try {
      updatePromptById(setNormalPrompts, normalPromptId, {
        scriptOutput: "Running base model...",
        progress: 20,
      });

      updatePromptById(setPrunedPrompts, prunedPromptId, {
        scriptOutput: "Waiting for base model to finish...",
        progress: 5,
      });

      const response = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentMessage,
          pruning_method: currentPruningMethod.id,
          pruning_percent: currentPruningAmount,
          attack: currentAttack.id === "none" ? null : currentAttack.id,
          model: currentModel.id,
          max_new_tokens: 100,
          temperature: 0.1,
          num_experiments: 1,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();

        updatePromptById(setNormalPrompts, normalPromptId, {
          scriptOutput: `HTTP ${response.status}: ${errorText}`,
          progress: 100,
        });

        updatePromptById(setPrunedPrompts, prunedPromptId, {
          scriptOutput: `HTTP ${response.status}: ${errorText}`,
          progress: 100,
        });

        return;
      }

      const data = await response.json();
      const result = data.results?.[0];

      if (!result) {
        throw new Error("Backend response does not contain results[0].");
      }

      const baseMetrics = result.base_metrics;
      const prunedMetrics = result.pruned_metrics;

      updatePromptById(setNormalPrompts, normalPromptId, {
        scriptOutput: result.base_response || "",
        progress: 100,
        attackSuccess: Boolean(baseMetrics?.complied),
        isBlocked: !Boolean(baseMetrics?.complied),
      });

      updatePromptById(setPrunedPrompts, prunedPromptId, {
        scriptOutput: result.pruned_response || "",
        progress: 100,
        attackSuccess: Boolean(prunedMetrics?.complied),
        isBlocked: !Boolean(prunedMetrics?.complied),
      });

      setTestResults((prev) => [
        ...prev,
        createResult({
          prompt: currentMessage,
          model: currentModel,
          attack: currentAttack,
          pruningMethod: currentPruningMethod,
          pruningAmount: 0,
          variant: "normal",
          attackSuccess: Boolean(baseMetrics?.complied),
          isBlocked: !Boolean(baseMetrics?.complied),
        }),
        createResult({
          prompt: currentMessage,
          model: currentModel,
          attack: currentAttack,
          pruningMethod: currentPruningMethod,
          pruningAmount: currentPruningAmount,
          variant: "pruned",
          attackSuccess: Boolean(prunedMetrics?.complied),
          isBlocked: !Boolean(prunedMetrics?.complied),
        }),
      ]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        updatePromptById(setNormalPrompts, normalPromptId, {
          scriptOutput: "Manually canceled",
          progress: 0,
        });

        updatePromptById(setPrunedPrompts, prunedPromptId, {
          scriptOutput: "Manually canceled",
          progress: 0,
        });
      } else {
        updatePromptById(setNormalPrompts, normalPromptId, {
          scriptOutput: `Error: ${String(err)}`,
          progress: 0,
        });

        updatePromptById(setPrunedPrompts, prunedPromptId, {
          scriptOutput: `Error: ${String(err)}`,
          progress: 0,
        });
      }
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
  
    const currentMessage = message;
    const currentPruningAmount = pruningAmount;
    const currentModel = selectedModel;
    const currentAttack = selectedAttack;
    const currentPruningMethod = selectedPruningMethod;
    const currentExperimentCount = Math.max(1, Math.min(50, experimentCount));
  
    setMessage("");
    setIsExecuting(true);
    setNormalPrompts([]);
    setPrunedPrompts([]);
  
    const controller = new AbortController();
    setAbortControllers([controller]);
  
    const promptPairs: {
      normalPromptId: string;
      prunedPromptId: string;
    }[] = [];
  
    for (let i = 1; i <= currentExperimentCount; i++) {
      const normalPromptId = crypto.randomUUID();
      const prunedPromptId = crypto.randomUUID();
  
      promptPairs.push({ normalPromptId, prunedPromptId });
  
      const displayText =
        currentExperimentCount === 1
          ? currentMessage
          : `[Experiment ${i}/${currentExperimentCount}] ${currentMessage}`;
  
      const basePrompt = {
        text: displayText,
        timestamp: new Date().toLocaleTimeString(),
        attack: currentAttack,
        pruningMethod: currentPruningMethod,
        model: currentModel,
        scriptOutput: "Waiting for backend job...",
        progress: 5,
        isBlocked: false,
        attackSuccess: false,
        gpuInfo: "",
      };
  
      setNormalPrompts((prev) => [
        {
          ...basePrompt,
          id: normalPromptId,
          pruningAmount: 0,
        },
        ...prev,
      ]);
  
      setPrunedPrompts((prev) => [
        {
          ...basePrompt,
          id: prunedPromptId,
          pruningAmount: currentPruningAmount,
        },
        ...prev,
      ]);
    }
  
    try {
      const startResponse = await fetch(`${API_URL}/generate-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: currentMessage,
          pruning_method: currentPruningMethod.id,
          pruning_percent: currentPruningAmount,
          attack: currentAttack.id === "none" ? null : currentAttack.id,
          model: currentModel.id,
          max_new_tokens: 100,
          temperature: 0.1,
          num_experiments: currentExperimentCount,
        }),
      });
  
      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`HTTP ${startResponse.status}: ${errorText}`);
      }
  
      const startData = await startResponse.json();
      const jobId = startData.job_id;
  
      if (!jobId) {
        throw new Error("Backend did not return job_id.");
      }
  
      for (const pair of promptPairs) {
        updatePromptById(setNormalPrompts, pair.normalPromptId, {
          scriptOutput: `Job started: ${jobId}`,
          progress: 15,
        });
  
        updatePromptById(setPrunedPrompts, pair.prunedPromptId, {
          scriptOutput: `Job started: ${jobId}`,
          progress: 15,
        });
      }
  
      let status = "queued";
  
      while (!["completed", "failed", "cancelled"].includes(status)) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
  
        const statusResponse = await fetch(
          `${API_URL}/experiment-status/${jobId}`,
          {
            method: "GET",
            signal: controller.signal,
          }
        );
  
        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          throw new Error(`Status HTTP ${statusResponse.status}: ${errorText}`);
        }
  
        const statusData = await statusResponse.json();
        status = statusData.status;
  
        const progress =
          status === "queued" ? 20 : status === "running" ? 55 : 90;
  
        for (const pair of promptPairs) {
          updatePromptById(setNormalPrompts, pair.normalPromptId, {
            scriptOutput: `Experiment job is ${status}...`,
            progress,
          });
  
          updatePromptById(setPrunedPrompts, pair.prunedPromptId, {
            scriptOutput: `Experiment job is ${status}...`,
            progress,
          });
        }
  
        if (status === "failed") {
          throw new Error(statusData.error || "Backend job failed.");
        }
  
        if (status === "cancelled") {
          throw new Error("Experiment was cancelled.");
        }
      }
  
      const resultResponse = await fetch(
        `${API_URL}/experiment-result/${jobId}`,
        {
          method: "GET",
          signal: controller.signal,
        }
      );
  
      if (!resultResponse.ok) {
        const errorText = await resultResponse.text();
        throw new Error(`Result HTTP ${resultResponse.status}: ${errorText}`);
      }
  
      const resultData = await resultResponse.json();
      const data = resultData.result;
  
      if (!data || !data.results || !Array.isArray(data.results)) {
        throw new Error("Backend response does not contain results.");
      }
  
      data.results.forEach((result: any, index: number) => {
        const pair = promptPairs[index];
  
        if (!pair) return;
  
        const baseMetrics = result.base_metrics;
        const prunedMetrics = result.pruned_metrics;
  
        updatePromptById(setNormalPrompts, pair.normalPromptId, {
          scriptOutput: result.base_response || "",
          progress: 100,
          attackSuccess: Boolean(baseMetrics?.complied),
          isBlocked: !Boolean(baseMetrics?.complied),
        });
  
        updatePromptById(setPrunedPrompts, pair.prunedPromptId, {
          scriptOutput: result.pruned_response || "",
          progress: 100,
          attackSuccess: Boolean(prunedMetrics?.complied),
          isBlocked: !Boolean(prunedMetrics?.complied),
        });
  
        setTestResults((prev) => [
          ...prev,
          createResult({
            prompt: currentMessage,
            model: currentModel,
            attack: currentAttack,
            pruningMethod: currentPruningMethod,
            pruningAmount: 0,
            variant: "normal",
            attackSuccess: Boolean(baseMetrics?.complied),
            isBlocked: !Boolean(baseMetrics?.complied),
          }),
          createResult({
            prompt: currentMessage,
            model: currentModel,
            attack: currentAttack,
            pruningMethod: currentPruningMethod,
            pruningAmount: currentPruningAmount,
            variant: "pruned",
            attackSuccess: Boolean(prunedMetrics?.complied),
            isBlocked: !Boolean(prunedMetrics?.complied),
          }),
        ]);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
  
      for (const pair of promptPairs) {
        updatePromptById(setNormalPrompts, pair.normalPromptId, {
          scriptOutput: `Error: ${errorMessage}`,
          progress: 0,
        });
  
        updatePromptById(setPrunedPrompts, pair.prunedPromptId, {
          scriptOutput: `Error: ${errorMessage}`,
          progress: 0,
        });
      }
    } finally {
      setIsExecuting(false);
      setAbortControllers([]);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#071a1a] via-[#102a2a] to-[#0f172a] p-3 md:p-5">
      <div className="max-w-[1450px] mx-auto">
        <header className="mb-6 relative">
          <div className="absolute right-0 top-0 flex gap-2">
            <button
              onClick={() => setActiveView("tester")}
              className={`p-2.5 rounded-lg border transition-all duration-200 ${
                activeView === "tester"
                  ? "bg-[#14b8a6]/20 border-[#14b8a6] text-[#14b8a6]"
                  : "bg-[#10212b]/80 border-[#264653] text-[#9ca3af] hover:border-[#14b8a6]/50 hover:text-[#14b8a6]"
              }`}
              title="Tester"
            >
              <FlaskConical className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveView("statistics")}
              className={`p-2.5 rounded-lg border transition-all duration-200 ${
                activeView === "statistics"
                  ? "bg-[#14b8a6]/20 border-[#14b8a6] text-[#14b8a6]"
                  : "bg-[#10212b]/80 border-[#264653] text-[#9ca3af] hover:border-[#14b8a6]/50 hover:text-[#14b8a6]"
              }`}
              title="Statistics"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sprout className="text-[#14b8a6] w-8 h-8" />

              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#ecfeff] to-[#99f6e4] bg-clip-text text-transparent">
                PruningLab
              </h1>
            </div>

            <p className="text-[#cbd5e1] text-sm max-w-2xl mx-auto leading-relaxed">
              {activeView === "tester"
                ? "Testiranje otpornosti prunanih AI modela na jailbreak napade"
                : "Statistika uspješnosti napada nad različitim modelima i metodama prunanja"}
            </p>
          </div>
        </header>

        {activeView === "tester" ? (
          <main className="flex flex-col gap-5">
            <section className="w-full rounded-3xl border border-[#2dd4bf]/20 bg-[#081b20]/75 shadow-2xl shadow-black/30 p-4 md:p-6">
              <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#2dd4bf]">
                    Experiment setup
                  </p>

                  <h2 className="mt-2 text-xl md:text-2xl font-bold text-[#f8fafc]">
                    Konfiguracija prunanja i testiranja
                  </h2>
                </div>

                <p className="max-w-2xl text-sm leading-relaxed text-[#94a3b8] lg:text-right">
                  Odaberi model, metodu prunanja, postotak prunanja, napad i
                  broj eksperimenata. Base i prunani model pokreću se
                  sekvencijalno kako GPU memorija ne bi bila preopterećena.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 xl:items-start">
                <div className="xl:col-span-5">
                  <PruningSelector
                    selectedPruningMethod={selectedPruningMethod}
                    setSelectedPruningMethod={setSelectedPruningMethod}
                    pruningAmount={pruningAmount}
                    setPruningAmount={setPruningAmount}
                    maxPruningAmount={maxPruningAmount}
                    attackNeuronCount={attackNeuronCount}
                    selectedPrunedNeuronCount={selectedPrunedNeuronCount}
                    selectedModelName={selectedModel.name}
                    isExecuting={isExecuting}
                    onInfoClick={handleInfoClick}
                  />
                </div>

                <div className="xl:col-span-7 flex flex-col gap-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <ModelSelector
                      selectedModel={selectedModel}
                      setSelectedModel={setSelectedModel}
                      availableModels={availableModels}
                      isExecuting={isExecuting}
                    />

                    <AttackSelector
                      selectedAttack={selectedAttack}
                      setSelectedAttack={setSelectedAttack}
                      onInfoClick={handleInfoClick}
                    />
                  </div>

                  <PromptInput
                    message={message}
                    setMessage={setMessage}
                    experimentCount={experimentCount}
                    setExperimentCount={setExperimentCount}
                    isExecuting={isExecuting}
                    onSend={handleSend}
                  />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <ExecutionHistory
                title="Obični model output"
                prompts={normalPrompts}
                isExecuting={isExecuting}
                onCancel={handleCancel}
                variant="normal"
              />

              <ExecutionHistory
                title="Prunani model output"
                prompts={prunedPrompts}
                isExecuting={isExecuting}
                onCancel={handleCancel}
                variant="pruned"
              />
            </section>
          </main>
        ) : (
          <div className="min-h-[calc(100vh-160px)]">
            <StatisticsView results={testResults} />
          </div>
        )}
      </div>

      <InfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title={infoTitle}
        body={infoBody}
        references={infoRefs}
      />
    </div>
  );
}

function ModelSelector({
  selectedModel,
  setSelectedModel,
  availableModels,
  isExecuting,
}: {
  selectedModel: Model;
  setSelectedModel: (model: Model) => void;
  availableModels: Model[];
  isExecuting: boolean;
}) {
  return (
    <div className="h-full rounded-2xl border border-[#3b82f6]/25 bg-gradient-to-br from-[#101827]/90 via-[#171923]/90 to-[#111827]/90 p-5 shadow-xl shadow-black/20 transition-all duration-300 hover:border-[#3b82f6]/45">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]">
          <Cpu className="h-5 w-5" />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#93c5fd]">
            Model
          </p>

          <h2 className="text-lg font-bold text-[#f8fafc]">
            Language Model
          </h2>
        </div>
      </div>

      <select
        value={selectedModel.id}
        disabled={isExecuting}
        onChange={(e) => {
          const model = availableModels.find((m) => m.id === e.target.value);

          if (model) {
            setSelectedModel(model);
          }
        }}
        className="mb-4 w-full cursor-pointer appearance-none rounded-xl border-2 border-[#3b82f6]/35 bg-[#252532] px-4 py-3 pr-10 text-base font-semibold text-[#f8fafc] outline-none transition-all duration-200 hover:border-[#3b82f6]/60 focus:border-[#3b82f6]"
      >
        {availableModels.map((model) => (
          <option key={model.id} value={model.id} className="bg-[#252532]">
            {model.name}
          </option>
        ))}
      </select>

      <div className="rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/10 p-4">
        <p className="text-sm leading-relaxed text-[#cbd5e1]">
          {selectedModel.description}
        </p>
      </div>
    </div>
  );
}

export default App;