import { useMemo, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import type { TestResult } from "../App";

interface StatisticsViewProps {
  results: TestResult[];
}

const COLORS = {
  base: "#ef4444",
  pruned: "#14b8a6",
  securityGain: "#3b82f6",
};

const METHOD_COLORS = [
  "#14b8a6",
  "#3b82f6",
  "#a855f7",
  "#f97316",
  "#eab308",
  "#ef4444",
];

export default function StatisticsView({ results }: StatisticsViewProps) {
  const modelOptions = getUniqueOptions(results, "modelName");
  const methodOptions = getUniqueOptions(results, "pruningMethodName");
  const attackOptions = getUniqueOptions(results, "attackName");

  const [modelFilter, setModelFilter] = useState<string>(modelOptions[0] ?? "");
  const [methodFilter, setMethodFilter] = useState<string>(methodOptions[0] ?? "");
  const [attackFilter, setAttackFilter] = useState<string>("all");

  const detailedResults = useMemo(() => {
    return results.filter((result) => {
      const modelOk = result.modelName === modelFilter;
      const methodOk = result.pruningMethodName === methodFilter;
      const attackOk = attackFilter === "all" || result.attackName === attackFilter;

      return modelOk && methodOk && attackOk;
    });
  }, [results, modelFilter, methodFilter, attackFilter]);

  const baseResults = detailedResults.filter((result) => result.variant === "normal");
  const prunedResults = detailedResults.filter((result) => result.variant === "pruned");

  const baseASR = calculateASR(baseResults);
  const prunedASR = calculateASR(prunedResults);
  const securityGain = baseASR - prunedASR;

  const baseVsPrunedData = [
    { name: "Base", ASR: round(baseASR) },
    { name: "Pruned", ASR: round(prunedASR) },
  ];

  const prunedByPercentageData = buildPrunedASRByPercentage(detailedResults);
  const attackBreakdownData = buildGroupedASRData(detailedResults, "attackName");

  const globalModelCharts = buildGlobalModelCharts(results);

  if (results.length === 0) {
    return (
      <div className="rounded-3xl border border-[#2dd4bf]/20 bg-[#081b20]/75 p-8 text-center text-[#94a3b8]">
        Nema statistike. Pokreni eksperiment prvo.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#2dd4bf]/20 bg-[#081b20]/75 p-5 shadow-2xl shadow-black/30">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2dd4bf]">
            Detailed analysis
          </p>

          <h2 className="mt-2 text-xl font-bold text-[#f8fafc]">
            Analiza jednog modela i jedne metode
          </h2>

          <p className="mt-2 text-sm text-[#94a3b8]">
            Rezultati se prikazuju za odabrani model i metodu prunanja.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FilterSelect
            label="Model"
            value={modelFilter}
            onChange={setModelFilter}
            options={modelOptions}
            includeAll={false}
          />

          <FilterSelect
            label="Pruning method"
            value={methodFilter}
            onChange={setMethodFilter}
            options={methodOptions}
            includeAll={false}
          />

          <FilterSelect
            label="Attack"
            value={attackFilter}
            onChange={setAttackFilter}
            options={attackOptions}
            includeAll
          />
        </div>
      </section>

      {detailedResults.length === 0 ? (
        <div className="rounded-3xl border border-[#2dd4bf]/20 bg-[#081b20]/75 p-8 text-center text-[#94a3b8]">
          Nema rezultata za odabranu kombinaciju.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard title="Total runs" value={`${baseResults.length}`} />
            <StatCard title="Base ASR" value={`${round(baseASR)}%`} />
            <StatCard title="Pruned ASR" value={`${round(prunedASR)}%`} />
            <StatCard title="Security gain" value={`${round(securityGain)}%`} />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard
              title="Base vs Pruned ASR"
              description="Usporedba prije i poslije prunanja."
            >
              <ResponsiveContainer width="100%" height={310}>
                <BarChart data={baseVsPrunedData} barCategoryGap="55%">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, "ASR"]} />
                  <Bar dataKey="ASR" fill={COLORS.pruned} barSize={58} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Pruned ASR by pruning percentage"
              description="ASR za svaki testirani postotak prunanja."
            >
              {prunedByPercentageData.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={310}>
                  <BarChart data={prunedByPercentageData} barCategoryGap="45%">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.35} />

                    <XAxis
                      dataKey="pruningAmount"
                      tickFormatter={(value) => `${value}%`}
                    />

                    <YAxis domain={[0, 100]} />

                    <Tooltip
                      formatter={(value) => [`${value}%`, "Pruned ASR"]}
                      labelFormatter={(label) => `Pruning amount: ${label}%`}
                    />

                    <Bar dataKey="prunedASR" fill="#a855f7" barSize={52} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <div className="xl:col-span-2">
              <ChartCard
                title="ASR by attack"
                description="Usporedba napada za odabrani model i metodu."
              >
                {attackBreakdownData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={attackBreakdownData} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.35} />

                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-12}
                        textAnchor="end"
                        height={75}
                      />

                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />

                      <Bar
                        dataKey="baseASR"
                        name="Base ASR"
                        fill={COLORS.base}
                        barSize={30}
                      />

                      <Bar
                        dataKey="prunedASR"
                        name="Pruned ASR"
                        fill={COLORS.pruned}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </section>
        </>
      )}

      <section className="rounded-3xl border border-[#2dd4bf]/20 bg-[#081b20]/75 p-5 shadow-2xl shadow-black/30">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2dd4bf]">
            Global comparison
          </p>

          <h2 className="mt-2 text-xl font-bold text-[#f8fafc]">
            Globalna usporedba po modelima
          </h2>

          <p className="mt-2 text-sm text-[#94a3b8]">
            Svaki model ima zaseban graf. Na X-osi je postotak prunanja, a boje
            predstavljaju metode prunanja.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {globalModelCharts.map((chart) => (
            <ChartCard
              key={chart.modelName}
              title={`${chart.modelName} — Pruned ASR by method and pruning percentage`}
              description="Niži ASR znači bolju otpornost na napade."
            >
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={chart.rows} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.35} />

                  <XAxis
                    dataKey="pruningAmount"
                    tickFormatter={(value) => `${value}%`}
                  />

                  <YAxis domain={[0, 100]} />

                  <Tooltip
                    formatter={(value) => [`${value}%`, "ASR"]}
                    labelFormatter={(label) => `Pruning amount: ${label}%`}
                  />

                  <Legend />

                  {chart.methods.map((method, index) => (
                    <Bar
                      key={method}
                      dataKey={method}
                      name={method}
                      fill={METHOD_COLORS[index % METHOD_COLORS.length]}
                      barSize={34}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ))}

          {globalModelCharts.map((chart) => (
            <ChartCard
              key={`${chart.modelName}-gain`}
              title={`${chart.modelName} — Security gain by method and pruning percentage`}
              description="Viša vrijednost znači veće smanjenje uspješnosti napada."
            >
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={chart.gainRows} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.35} />

                  <XAxis
                    dataKey="pruningAmount"
                    tickFormatter={(value) => `${value}%`}
                  />

                  <YAxis />

                  <Tooltip
                    formatter={(value) => [`${value}%`, "Security gain"]}
                    labelFormatter={(label) => `Pruning amount: ${label}%`}
                  />

                  <Legend />

                  {chart.methods.map((method, index) => (
                    <Bar
                      key={method}
                      dataKey={method}
                      name={method}
                      fill={METHOD_COLORS[index % METHOD_COLORS.length]}
                      barSize={34}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ))}
        </div>
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  includeAll,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  includeAll: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#5eead4]">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full cursor-pointer rounded-xl border border-[#2dd4bf]/25 bg-[#0f172a] px-4 py-3 text-sm font-semibold text-[#f8fafc] outline-none transition-all duration-200 hover:border-[#2dd4bf]/50 focus:border-[#2dd4bf]"
      >
        {includeAll && <option value="all">All</option>}

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#2dd4bf]/20 bg-[#081b20]/75 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
        {title}
      </p>

      <p className="mt-2 break-words text-2xl font-bold text-[#f8fafc]">
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#2dd4bf]/20 bg-[#081b20]/75 p-5 shadow-2xl shadow-black/30">
      <h2 className="text-lg font-bold text-[#f8fafc]">{title}</h2>

      {description && (
        <p className="mt-2 mb-4 text-sm text-[#94a3b8]">{description}</p>
      )}

      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-[#334155] bg-[#0f172a]/70 text-sm text-[#94a3b8]">
      Nema dovoljno podataka za ovaj graf.
    </div>
  );
}

function calculateASR(results: TestResult[]) {
  if (results.length === 0) return 0;

  const successful = results.filter((result) => result.attackSuccess).length;

  return (successful / results.length) * 100;
}

function buildPrunedASRByPercentage(results: TestResult[]) {
  const groups = new Map<number, TestResult[]>();

  for (const result of results) {
    if (result.variant !== "pruned") continue;

    const group = groups.get(result.pruningAmount) || [];
    group.push(result);
    groups.set(result.pruningAmount, group);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([pruningAmount, group]) => ({
      pruningAmount,
      prunedASR: round(calculateASR(group)),
    }));
}

function buildGroupedASRData(
  results: TestResult[],
  groupKey: "modelName" | "attackName"
) {
  const groups = new Map<
    string,
    {
      base: TestResult[];
      pruned: TestResult[];
    }
  >();

  for (const result of results) {
    const name = result[groupKey];

    const group = groups.get(name) || {
      base: [],
      pruned: [],
    };

    if (result.variant === "normal") {
      group.base.push(result);
    } else {
      group.pruned.push(result);
    }

    groups.set(name, group);
  }

  return Array.from(groups.entries()).map(([name, group]) => ({
    name,
    baseASR: round(calculateASR(group.base)),
    prunedASR: round(calculateASR(group.pruned)),
  }));
}

function buildGlobalModelCharts(results: TestResult[]) {
  const modelNames = getUniqueOptions(results, "modelName");

  return modelNames.map((modelName) => {
    const modelResults = results.filter((result) => result.modelName === modelName);

    const methods = getUniqueOptions(modelResults, "pruningMethodName");

    const pruningAmounts = Array.from(
      new Set(
        modelResults
          .filter((result) => result.variant === "pruned")
          .map((result) => result.pruningAmount)
      )
    ).sort((a, b) => a - b);

    const rows = pruningAmounts.map((amount) => {
      const row: Record<string, string | number> = {
        pruningAmount: amount,
      };

      for (const method of methods) {
        const methodResults = modelResults.filter(
          (result) =>
            result.variant === "pruned" &&
            result.pruningAmount === amount &&
            result.pruningMethodName === method
        );

        row[method] = round(calculateASR(methodResults));
      }

      return row;
    });

    const gainRows = pruningAmounts.map((amount) => {
      const row: Record<string, string | number> = {
        pruningAmount: amount,
      };

      for (const method of methods) {
        const baseGroup = modelResults.filter(
          (result) =>
            result.variant === "normal" &&
            result.pruningMethodName === method
        );

        const prunedGroup = modelResults.filter(
          (result) =>
            result.variant === "pruned" &&
            result.pruningAmount === amount &&
            result.pruningMethodName === method
        );

        row[method] = round(calculateASR(baseGroup) - calculateASR(prunedGroup));
      }

      return row;
    });

    return {
      modelName,
      methods,
      rows,
      gainRows,
    };
  });
}

function getUniqueOptions<T extends keyof TestResult>(
  results: TestResult[],
  key: T
) {
  return Array.from(
    new Set(results.map((result) => String(result[key])).filter(Boolean))
  );
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}