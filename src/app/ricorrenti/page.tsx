"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react";


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
  }).format(value);

const categories = [
  "Stipendio",
  "Casa",
  "Auto",
  "Abbonamenti",
  "Sport",
  "Alimentazione",
  "Finanziamenti",
  "Assicurazioni",
  "Altro",
];

const emptyForm = {
  name: "",
  amount: "",
  type: "expense" as "income" | "expense",
  day: "1",
  category: "Altro",
};

export default function RicorrentiPage() {
  const [transactions, setTransactions] = useState<
    RecurringTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/recurring", {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossibile caricare le ricorrenze."
        );
      }

      setTransactions(data.transactions ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante il caricamento."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTransactions();
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEdit(transaction: RecurringTransaction) {
    setEditingId(transaction.id);

    setForm({
      name: transaction.name,
      amount: String(transaction.amount),
      type: transaction.type,
      day: String(transaction.day),
      category: transaction.category,
    });

    setShowForm(true);
    setError("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveTransaction() {
    try {
      setSaving(true);
      setError("");

      const payload = {
        name: form.name,
        amount: Number(form.amount),
        type: form.type,
        day: Number(form.day),
        category: form.category,
      };

      const response = await fetch("/api/recurring", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(
          editingId
            ? { id: editingId, ...payload }
            : payload
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Errore durante il salvataggio."
        );
      }

      closeForm();
      await loadTransactions();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante il salvataggio."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(transaction: RecurringTransaction) {
    try {
      setError("");

      const response = await fetch("/api/recurring", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: transaction.id,
          active: !transaction.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Errore durante l'aggiornamento."
        );
      }

      await loadTransactions();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante l'aggiornamento."
      );
    }
  }

  async function deleteTransaction(id: string) {
    const confirmed = window.confirm(
      "Vuoi eliminare questa voce ricorrente?"
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(
        `/api/recurring?id=${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Errore durante l'eliminazione."
        );
      }

      await loadTransactions();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore durante l'eliminazione."
      );
    }
  }

  const activeTransactions = transactions.filter(
    (item) => item.active
  );

  const monthlyIncome = activeTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const monthlyExpenses = activeTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-50">

        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 size={18} className="animate-spin" />
            Caricamento ricorrenti...
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
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Movimenti automatici
                </p>

                <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                  Ricorrenti
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                  Gestisci entrate e uscite che si ripetono ogni
                  mese. Verranno considerate automaticamente nel
                  piano finanziario.
                </p>
              </div>

              <button
                onClick={openNew}
                className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                <Plus size={17} />
                Nuova ricorrenza
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="Entrate ricorrenti"
              value={euro(monthlyIncome)}
              icon={<ArrowUpRight size={19} />}
            />

            <SummaryCard
              label="Uscite ricorrenti"
              value={euro(monthlyExpenses)}
              icon={<ArrowDownRight size={19} />}
            />

            <SummaryCard
              label="Saldo ricorrente"
              value={euro(monthlyIncome - monthlyExpenses)}
              icon={<Repeat size={19} />}
              negative={
                monthlyIncome - monthlyExpenses < 0
              }
            />
          </section>

          {showForm && (
            <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {editingId
                      ? "Modifica ricorrenza"
                      : "Nuova ricorrenza"}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Inserisci i dati del movimento mensile.
                  </p>
                </div>

                <button
                  onClick={closeForm}
                  className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
                <Field
                  label="Nome"
                  value={form.name}
                  placeholder="Es. Mutuo"
                  onChange={(value) =>
                    setForm({ ...form, name: value })
                  }
                />

                <Field
                  label="Importo"
                  value={form.amount}
                  placeholder="0"
                  type="number"
                  onChange={(value) =>
                    setForm({ ...form, amount: value })
                  }
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Tipo
                  </span>

                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        type: event.target.value as
                          | "income"
                          | "expense",
                      })
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-zinc-500"
                  >
                    <option value="expense">Uscita</option>
                    <option value="income">Entrata</option>
                  </select>
                </label>

                <Field
                  label="Giorno"
                  value={form.day}
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1"
                  onChange={(value) =>
                    setForm({ ...form, day: value })
                  }
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Categoria
                  </span>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-zinc-500"
                  >
                    {categories.map((category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeForm}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50"
                >
                  Annulla
                </button>

                <button
                  onClick={saveTransaction}
                  disabled={
                    saving ||
                    !form.name.trim() ||
                    Number(form.amount) <= 0
                  }
                  className="flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {editingId
                    ? "Salva modifiche"
                    : "Aggiungi"}
                </button>
              </div>
            </section>
          )}

          <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">
                    Movimenti ricorrenti
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Entrate e uscite automatiche considerate ogni mese.
                  </p>
                </div>

                <span className="hidden rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 sm:inline-flex">
                  {activeTransactions.length} attivi
                </span>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                {transactions.length === 0
                  ? "Nessuna ricorrenza configurata."
                  : `${transactions.length} ${
                      transactions.length === 1
                        ? "movimento"
                        : "movimenti"
                    } configurati.`}
              </p>
            </div>

            {transactions.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Repeat
                  size={32}
                  className="mx-auto text-zinc-300"
                />

                <p className="mt-4 font-medium">
                  Nessuna ricorrenza
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Aggiungi il primo movimento mensile.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={`flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between ${
                      !transaction.active
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          transaction.type === "income"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <ArrowUpRight size={19} />
                        ) : (
                          <ArrowDownRight size={19} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-950">
                          {transaction.name}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-zinc-500">
                            {transaction.category}
                          </span>

                          <span className="text-zinc-300">•</span>

                          <span className="font-medium text-zinc-700">
                            Giorno {transaction.day}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-5 lg:justify-end">
                      <span
                        className={`text-base font-semibold tracking-tight ${
                          transaction.type === "income"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {euro(Number(transaction.amount))}
                      </span>

                      <button
                        onClick={() =>
                          toggleActive(transaction)
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          transaction.active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        }`}
                      >
                        {transaction.active ? "Attiva" : "Disattivata"}
                      </button>

                      <button
                        onClick={() =>
                          openEdit(transaction)
                        }
                        className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
                        title="Modifica"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        onClick={() =>
                          deleteTransaction(transaction.id)
                        }
                        className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Elimina"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
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
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        negative
          ? "border-red-200"
          : "border-zinc-200"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500">
          {label}
        </span>

        <div
          className={`rounded-xl p-2 ${
            negative
              ? "bg-red-50 text-red-600"
              : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {icon}
        </div>
      </div>

      <div
        className={`text-3xl font-semibold tracking-tight ${
          negative ? "text-red-600" : "text-zinc-950"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  type = "text",
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">
        {label}
      </span>

      <input
        type={type}
        min={min ?? (type === "number" ? "0" : undefined)}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-zinc-500"
      />
    </label>
  );
}
