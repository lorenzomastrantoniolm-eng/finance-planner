"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Loader2,
  PiggyBank,
  Save,
  Wallet,
} from "lucide-react";


type Budget = {
  category: string;
  planned_amount: number;
};

type ActualByCategory = Record<string, number>;

type RecurringTransaction = {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  day: number;
  category: string;
  active: boolean;
};

const euro = (value: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);

const now = new Date();
const initialMonth = new Date(
  now.getFullYear(),
  now.getMonth(),
  1
);

const defaultCategories = [
  "Alimentazione",
  "Auto",
  "Tempo libero",
  "Shopping",
  "Vacanze",
  "Altro",
];

export default function PianoMensilePage() {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [income, setIncome] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState(0);

  const [actualIncome, setActualIncome] = useState(0);
  const [actualExpenses, setActualExpenses] = useState(0);
  const [actualSavings, setActualSavings] = useState(0);
  const [isClosed, setIsClosed] = useState(false);

  const [categoryBudgets, setCategoryBudgets] = useState<Budget[]>(
    defaultCategories.map((category) => ({
      category,
      planned_amount: 0,
    }))
  );

  const [actualByCategory, setActualByCategory] =
    useState<ActualByCategory>({});

  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const month = currentMonth.toISOString().slice(0, 7);

  const monthLabel = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(currentMonth);

  function changeMonth(offset: number) {
    setCurrentMonth((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  }

  useEffect(() => {
    async function loadPlan() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/monthly-plan?month=${month}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Impossibile caricare il piano.");
        }

        const data = await response.json();

        if (data.plan) {
          setIncome(Number(data.plan.expected_income) || 0);
          setSavingsGoal(Number(data.plan.savings_goal) || 0);
          setActualIncome(Number(data.actual?.income) || 0);
          setActualExpenses(Number(data.actual?.expenses) || 0);
          setActualSavings(Number(data.actual?.savings) || 0);
          setActualByCategory(data.actual?.byCategory ?? {});
          setIsClosed(Boolean(data.plan.is_closed));
        }

        if (data.budgets?.length) {
          setCategoryBudgets(
            defaultCategories.map((category) => {
              const existing = data.budgets.find(
                (budget: Budget) => budget.category === category
              );

              return {
                category,
                planned_amount: existing
                  ? Number(existing.planned_amount)
                  : 0,
              };
            })
          );
        }

        const recurringResponse = await fetch(
          "/api/recurring",
          {
            credentials: "include",
          }
        );

        if (recurringResponse.ok) {
          const recurringData = await recurringResponse.json();
          setRecurringTransactions(recurringData.transactions ?? []);
        }
      } catch (err) {
        console.error(err);
        setError("Si è verificato un errore durante il caricamento.");
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [month]);

  const fixedExpenses = recurringTransactions
    .filter(
      (item) =>
        item.type === "expense" && item.active
    )
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const variableBudget = useMemo(
    () =>
      categoryBudgets.reduce(
        (sum, category) =>
          sum + Number(category.planned_amount || 0),
        0
      ),
    [categoryBudgets]
  );

  const totalPlanned = fixedExpenses + variableBudget;
  const remaining = income - totalPlanned;
  const afterSavings = remaining - savingsGoal;

  const savingsRate =
    income > 0 ? (savingsGoal / income) * 100 : 0;

  const incomeDifference = actualIncome - income;
  const expensesDifference = totalPlanned - actualExpenses;
  const savingsDifference = actualSavings - savingsGoal;

  function updateBudget(index: number, value: string) {
    setSaved(false);

    setCategoryBudgets((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              planned_amount: Number(value) || 0,
            }
          : item
      )
    );
  }

  async function savePlan() {
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const response = await fetch("/api/monthly-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          month,
          expected_income: income,
          savings_goal: savingsGoal,
          planned_fixed_expenses: fixedExpenses,
          is_closed: isClosed,
          budgets: categoryBudgets,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Errore durante il salvataggio."
        );
      }

      setSaved(true);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante il salvataggio."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-50">

        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 size={18} className="animate-spin" />
            Caricamento piano...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <header className="mb-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">
                  Pianificazione finanziaria
                </p>

                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
                  Piano mensile
                </h1>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                <button
                  onClick={() => changeMonth(-1)}
                  className="rounded-lg p-1 hover:bg-zinc-100"
                >
                  <ArrowLeft size={17} />
                </button>

                <span className="min-w-32 text-center text-sm font-medium capitalize">
                  {monthLabel}
                </span>

                <button
                  onClick={() => changeMonth(1)}
                  className="rounded-lg p-1 hover:bg-zinc-100"
                >
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm text-zinc-500">
                Imposta il tuo mese prima che inizi. Le spese
                ricorrenti vengono considerate automaticamente e il
                budget disponibile si aggiorna in tempo reale.
              </p>

              <button
                onClick={savePlan}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : saved ? (
                  <Check size={16} />
                ) : (
                  <Save size={16} />
                )}

                {saving
                  ? "Salvataggio..."
                  : saved
                  ? "Salvato"
                  : "Salva piano"}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Summary
              label="Entrate previste"
              value={euro(income)}
              icon={<Wallet size={19} />}
            />

            <Summary
              label="Uscite pianificate"
              value={euro(totalPlanned)}
              icon={<Wallet size={19} />}
            />

            <Summary
              label="Risparmio obiettivo"
              value={euro(savingsGoal)}
              icon={<PiggyBank size={19} />}
            />

            <Summary
              label="Disponibile"
              value={euro(remaining)}
              icon={<Check size={19} />}
              negative={remaining < 0}
            />
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-950">
                  Entrate e risparmio
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Definisci quanto prevedi di ricevere e quanto vuoi
                  mettere da parte.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <NumberField
                  label="Entrate previste"
                  value={income}
                  onChange={(value) => {
                    setIncome(value);
                    setSaved(false);
                  }}
                />

                <NumberField
                  label="Obiettivo di risparmio"
                  value={savingsGoal}
                  onChange={(value) => {
                    setSavingsGoal(value);
                    setSaved(false);
                  }}
                />
              </div>

              <div className="mt-6 rounded-xl bg-zinc-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Tasso di risparmio
                  </span>

                  <span className="text-sm font-semibold">
                    {savingsRate.toFixed(1)}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-zinc-900 transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(savingsRate, 0),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-950">
                  Spese fisse
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Importate automaticamente dalle spese ricorrenti.
                </p>
              </div>

              {recurringTransactions.length === 0 ? (
                <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  Nessuna spesa ricorrente configurata.
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringTransactions
                    .filter(
                      (transaction) =>
                        transaction.type === "expense" &&
                        transaction.active
                    )
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-100 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {transaction.name}
                          </p>

                          <p className="text-xs text-zinc-500">
                            {transaction.category} · giorno{" "}
                            {transaction.day}
                          </p>
                        </div>

                        <span className="text-sm font-semibold">
                          {euro(Number(transaction.amount))}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
                <span className="text-sm font-medium">
                  Totale fisso
                </span>

                <span className="text-lg font-semibold">
                  {euro(fixedExpenses)}
                </span>
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">
                  Consuntivo del mese
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Inserisci i risultati effettivi e confrontali con il piano.
                </p>
              </div>

              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                isClosed
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  isClosed ? "bg-white" : "bg-zinc-400"
                }`} />
                {isClosed ? "Mese chiuso" : "Mese aperto"}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-sm font-medium text-zinc-500">
                  Entrate effettive
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">
                  {euro(actualIncome)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Calcolate dai movimenti del mese
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-sm font-medium text-zinc-500">
                  Uscite effettive
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">
                  {euro(actualExpenses)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Calcolate dai movimenti del mese
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-sm font-medium text-zinc-500">
                  Risparmio effettivo
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">
                  {euro(actualSavings)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Entrate meno uscite
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <DifferenceCard
                label="Differenza entrate"
                value={incomeDifference}
                positive={incomeDifference >= 0}
              />

              <DifferenceCard
                label="Differenza uscite"
                value={expensesDifference}
                positive={expensesDifference >= 0}
              />

              <DifferenceCard
                label="Differenza risparmio"
                value={savingsDifference}
                positive={savingsDifference >= 0}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  Stato del mese
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Chiudi il mese quando hai completato il consuntivo.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsClosed((current) => !current);
                  setSaved(false);
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  isClosed
                    ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    : "bg-zinc-950 text-white hover:bg-zinc-800"
                }`}
              >
                {isClosed ? "Riapri mese" : "Chiudi mese"}
              </button>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">
                  Budget variabile
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Confronta quanto avevi previsto con quanto hai realmente speso.
                </p>
              </div>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs font-medium text-zinc-500">
                  Budget pianificato
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {euro(variableBudget)}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs font-medium text-zinc-500">
                  Speso effettivamente
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {euro(
                    categoryBudgets.reduce(
                      (sum, category) =>
                        sum + Number(actualByCategory[category.category] ?? 0),
                      0
                    )
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs font-medium text-zinc-500">
                  Residuo budget
                </p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    variableBudget -
                      categoryBudgets.reduce(
                        (sum, category) =>
                          sum +
                          Number(
                            actualByCategory[category.category] ?? 0
                          ),
                        0
                      ) <
                    0
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {euro(
                    variableBudget -
                      categoryBudgets.reduce(
                        (sum, category) =>
                          sum +
                          Number(
                            actualByCategory[category.category] ?? 0
                          ),
                        0
                      )
                  )}
                </p>
              </div>
            </div>

            <div className="divide-y divide-zinc-100">
              {categoryBudgets.map((category, index) => {
                const planned = Number(category.planned_amount) || 0;
                const actual =
                  Number(actualByCategory[category.category] ?? 0);

                const remaining = planned - actual;

                const usage =
                  planned > 0
                    ? (actual / planned) * 100
                    : actual > 0
                      ? 100
                      : 0;

                const progressWidth = Math.min(Math.max(usage, 0), 100);

                const status =
                  planned === 0 && actual === 0
                    ? "neutral"
                    : usage > 100
                      ? "danger"
                      : usage >= 75
                        ? "warning"
                        : "success";

                const statusClass =
                  status === "danger"
                    ? "text-red-600"
                    : status === "warning"
                      ? "text-amber-600"
                      : status === "success"
                        ? "text-emerald-600"
                        : "text-zinc-500";

                const barClass =
                  status === "danger"
                    ? "bg-red-500"
                    : status === "warning"
                      ? "bg-amber-500"
                      : "bg-zinc-800";

                return (
                  <div
                    key={category.category}
                    className="py-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="min-w-40 lg:w-40">
                        <p className="text-sm font-medium">
                          {category.category}
                        </p>

                        <p className={`mt-1 text-xs font-medium ${statusClass}`}>
                          {planned === 0
                            ? actual > 0
                              ? "Nessun budget"
                              : "Nessuna spesa"
                            : `${usage.toFixed(0)}% utilizzato`}
                        </p>
                      </div>

                      <div className="flex-1">
                        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                          <span>
                            Speso {euro(actual)}
                          </span>

                          <span>
                            Budget {euro(planned)}
                          </span>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={`h-full rounded-full transition-all ${barClass}`}
                            style={{
                              width: `${progressWidth}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 lg:w-72">
                        <div>
                          <p className="mb-1 text-xs text-zinc-500">
                            Budget
                          </p>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={
                                category.planned_amount === 0
                                  ? ""
                                  : category.planned_amount
                              }
                              onChange={(event) =>
                                updateBudget(
                                  index,
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pr-8 text-right text-sm outline-none transition focus:border-zinc-500"
                            />

                            <span className="pointer-events-none absolute right-3 top-2 text-sm text-zinc-400">
                              €
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="mb-1 text-xs text-zinc-500">
                            Residuo
                          </p>

                          <div
                            className={`rounded-xl border px-3 py-2 text-right text-sm font-semibold ${
                              remaining < 0
                                ? "border-red-200 bg-red-50 text-red-600"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700"
                            }`}
                          >
                            {euro(remaining)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 border-t border-zinc-200 pt-5">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Totale budget variabile
                </span>

                <span className="text-xl font-semibold">
                  {euro(variableBudget)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-zinc-500">
                  Totale effettivo
                </span>

                <span
                  className={`font-semibold ${
                    categoryBudgets.reduce(
                      (sum, category) =>
                        sum +
                        Number(
                          actualByCategory[category.category] ?? 0
                        ),
                      0
                    ) > variableBudget
                      ? "text-red-600"
                      : "text-zinc-700"
                  }`}
                >
                  {euro(
                    categoryBudgets.reduce(
                      (sum, category) =>
                        sum +
                        Number(
                          actualByCategory[category.category] ?? 0
                        ),
                      0
                    )
                  )}
                </span>
              </div>
            </div>
          </section>

          <section
            className={`mt-6 rounded-2xl border p-6 ${
              afterSavings < 0
                ? "border-red-200 bg-red-50"
                : "border-zinc-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-4">
              {afterSavings < 0 ? (
                <CircleAlert
                  className="mt-0.5 text-red-500"
                  size={21}
                />
              ) : (
                <Check
                  className="mt-0.5 text-zinc-700"
                  size={21}
                />
              )}

              <div>
                <h2 className="font-semibold">
                  {afterSavings < 0
                    ? "Il piano non è sostenibile"
                    : "Il piano è in equilibrio"}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {afterSavings < 0
                    ? `Per raggiungere il tuo obiettivo di risparmio stai pianificando ${euro(
                        Math.abs(afterSavings)
                      )} in più rispetto alle entrate disponibili.`
                    : `Dopo tutte le spese pianificate e l'obiettivo di risparmio ti rimangono ${euro(
                        afterSavings
                      )} disponibili.`}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function DifferenceCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive: boolean;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4">
      <p className="text-xs font-medium text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-semibold ${
          positive
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        {value >= 0 ? "+" : ""}
        {euro(value)}
      </p>
    </div>
  );
}

function Summary({
  label,
  value,
  icon,
  negative = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500">
          {label}
        </span>

        <div className="rounded-xl bg-zinc-100 p-2 text-zinc-600">
          {icon}
        </div>
      </div>

      <div
        className={`text-2xl font-semibold tracking-tight ${
          negative
            ? "text-red-600"
            : "text-zinc-950"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>

      <div className="relative">
        <input
          type="number"
          min="0"
          step="50"
          value={value === 0 ? "" : value}
          onChange={(event) =>
            onChange(Number(event.target.value) || 0)
          }
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-9 text-lg font-medium outline-none transition focus:border-zinc-500"
        />

        <span className="pointer-events-none absolute right-4 top-3.5 text-sm text-zinc-400">
          €
        </span>
      </div>
    </label>
  );
}
