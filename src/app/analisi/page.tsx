"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Loader2,
  PiggyBank,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


type MonthData = {
  month: string;
  isClosed: boolean;
  plannedIncome: number;
  plannedFixedExpenses: number;
  plannedVariableExpenses: number;
  plannedExpenses: number;
  plannedSavings: number;
  actualIncome: number;
  actualExpenses: number;
  actualSavings: number;
  income: number;
  expenses: number;
  savings: number;
  budgets: {
    category: string;
    plannedAmount: number;
  }[];
};

type AnalysisData = {
  period: string;
  months: MonthData[];
  summary: {
    monthCount: number;
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    averageIncome: number;
    averageExpenses: number;
    averageSavings: number;
    savingsRate: number;
    totalPlannedIncome: number;
    totalPlannedExpenses: number;
    totalPlannedSavings: number;
    plannedSavingsRate: number;
    totalActualIncome: number;
    totalActualExpenses: number;
    totalActualSavings: number;
    actualSavingsRate: number;
    closedMonths: number;
  };
  categories: {
    category: string;
    amount: number;
    percentage: number;
    plannedAmount: number;
    actualAmount: number;
    difference: number;
  }[];
  comparison: {
    income: number;
    expenses: number;
    savings: number;
  } | null;
};

const euro = (value: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

const percent = (value: number) =>
  new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
  }).format(value) + "%";

const monthLabel = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));

const shortMonth = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    month: "short",
  }).format(new Date(value));

export default function AnalisiPage() {
  const [period, setPeriod] = useState("12");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalysis() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/analysis?period=${period}`,
          {
            credentials: "include",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Impossibile caricare l'analisi."
          );
        }

        setData(result);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Errore durante il caricamento."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAnalysis();
  }, [period]);

  const chartData = useMemo(
    () =>
      (data?.months ?? []).map((item) => ({
        ...item,
        label: shortMonth(item.month),
      })),
    [data]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <div className="flex min-h-screen">

          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <Loader2 className="animate-spin" size={18} />
              Caricamento analisi...
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <div className="flex min-h-screen">

          <div className="flex flex-1 items-center justify-center px-6">
            <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-red-600">
                {error || "Nessun dato disponibile."}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { summary, categories, comparison } = data;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="flex min-h-screen">

        <div className="flex-1">
          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Analisi finanziaria
                </p>

                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
                  Analisi
                </h1>

                <p className="mt-2 text-sm text-zinc-500">
                  Comprendi come stanno evolvendo entrate, spese e risparmio.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
                <CalendarRange size={16} className="ml-2 text-zinc-400" />

                {[
                  ["6", "6 mesi"],
                  ["12", "12 mesi"],
                  ["all", "Tutto"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setPeriod(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                      period === value
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-500 hover:bg-zinc-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </header>

            <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<Wallet size={18} />}
                label="Entrate medie"
                value={euro(summary.averageIncome)}
              />

              <MetricCard
                icon={<ArrowDownRight size={18} />}
                label="Uscite medie"
                value={euro(summary.averageExpenses)}
              />

              <MetricCard
                icon={<PiggyBank size={18} />}
                label="Risparmio medio"
                value={euro(summary.averageSavings)}
              />

              <MetricCard
                icon={<BarChart3 size={18} />}
                label="Tasso di risparmio"
                value={percent(summary.savingsRate)}
              />
            </section>

            {comparison && (
              <section className="mt-4 grid gap-4 md:grid-cols-3">
                <ComparisonCard
                  label="Entrate vs mese precedente"
                  value={comparison.income}
                  positive={comparison.income >= 0}
                />

                <ComparisonCard
                  label="Uscite vs mese precedente"
                  value={comparison.expenses}
                  positive={comparison.expenses <= 0}
                />

                <ComparisonCard
                  label="Risparmio vs mese precedente"
                  value={comparison.savings}
                  positive={comparison.savings >= 0}
                />
              </section>
            )}

            <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-950">
                  Andamento mensile
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  I mesi chiusi mostrano i risultati effettivi. Gli altri mostrano il piano.
                </p>
              </div>

              <div className="h-[360px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 10,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                      />

                      <YAxis
                        tickFormatter={(value) =>
                          new Intl.NumberFormat("it-IT", {
                            notation: "compact",
                            maximumFractionDigits: 1,
                          }).format(value) + " €"
                        }
                        axisLine={false}
                        tickLine={false}
                        width={65}
                      />

                      <Tooltip
                        formatter={(value, name) => [
                          euro(Number(value)),
                          name === "income"
                            ? "Entrate"
                            : name === "expenses"
                            ? "Uscite"
                            : "Risparmio",
                        ]}
                        labelFormatter={(value) => {
                          const item = chartData.find(
                            (entry) => entry.label === String(value)
                          );

                          return monthLabel(
                            item?.month ?? String(value)
                          );
                        }}
                      />

                      <Legend />

                      <Line
                        type="monotone"
                        dataKey="income"
                        name="Entrate"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />

                      <Line
                        type="monotone"
                        dataKey="expenses"
                        name="Uscite"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />

                      <Line
                        type="monotone"
                        dataKey="savings"
                        name="Risparmio"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="Non ci sono ancora dati sufficienti per creare lo storico." />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
  <div className="mb-6">
    <h2 className="text-lg font-semibold text-zinc-950">
      Budget per categoria
    </h2>
    <p className="mt-1 text-sm text-zinc-500">
      Confronto tra quanto avevi previsto e quanto hai realmente speso.
    </p>
  </div>

  {categories.length === 0 ? (
    <div className="rounded-xl bg-zinc-50 p-6 text-center">
      <p className="text-sm text-zinc-500">
        Nessun dato disponibile per questo periodo.
      </p>
    </div>
  ) : (
    <div className="space-y-6">
      {categories.map((item) => {
        const usage =
          item.plannedAmount > 0
            ? (item.actualAmount / item.plannedAmount) * 100
            : 0;

        const isOverBudget =
          item.plannedAmount > 0 &&
          item.actualAmount > item.plannedAmount;

        const progressWidth = Math.min(
          Math.max(usage, 0),
          100
        );

        return (
          <div key={item.category}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-950">
                  {item.category}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {item.plannedAmount > 0
                    ? `${Math.round(usage)}% del budget utilizzato`
                    : "Nessun budget pianificato"}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className={`text-sm font-semibold ${
                    isOverBudget
                      ? "text-red-600"
                      : "text-zinc-950"
                  }`}
                >
                  {euro(item.actualAmount)}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  su {euro(item.plannedAmount)}
                </p>
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverBudget
                    ? "bg-red-500"
                    : "bg-zinc-900"
                }`}
                style={{
                  width: `${progressWidth}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                Piano {euro(item.plannedAmount)}
              </span>

              <span
                className={
                  item.difference <= 0
                    ? "font-medium text-emerald-600"
                    : "font-medium text-red-600"
                }
              >
                {item.difference <= 0
                  ? `Sotto budget ${euro(Math.abs(item.difference))}`
                  : `Oltre budget ${euro(Math.abs(item.difference))}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>

            <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950">
                Riepilogo periodo
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {summary.monthCount}{" "}
                {summary.monthCount === 1
                  ? "mese analizzato"
                  : "mesi analizzati"}
                {" · "}
                {summary.closedMonths}{" "}
                {summary.closedMonths === 1
                  ? "mese chiuso"
                  : "mesi chiusi"}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <SummaryBlock
                  label="Entrate totali"
                  value={euro(summary.totalIncome)}
                />

                <SummaryBlock
                  label="Uscite totali"
                  value={euro(summary.totalExpenses)}
                />

                <SummaryBlock
                  label="Risparmio totale"
                  value={euro(summary.totalSavings)}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-400">
        {icon}

        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function ComparisonCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive: boolean;
}) {
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-zinc-500">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <Icon
          size={17}
          className={
            positive
              ? "text-emerald-600"
              : "text-red-600"
          }
        />

        <span
          className={`text-lg font-semibold ${
            positive
              ? "text-emerald-600"
              : "text-red-600"
          }`}
        >
          {value >= 0 ? "+" : ""}
          {euro(value)}
        </span>
      </div>
    </div>
  );
}


function SummaryBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4/60">
      <p className="text-xs font-medium text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-xl bg-zinc-50 px-6 text-center text-sm text-zinc-500/60">
      {text}
    </div>
  );
}
