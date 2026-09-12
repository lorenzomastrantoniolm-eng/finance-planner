"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type Account = {
  id: string;
  name: string;
  type: string;
};

type Transaction = {
  id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  notes: string | null;
  accounts: Account | null;
};

const categories = [
  "Stipendio",
  "Casa",
  "Alimentari",
  "Trasporti",
  "Ristoranti",
  "Shopping",
  "Sport",
  "Salute",
  "Tempo libero",
  "Viaggi",
  "Abbonamenti",
  "Bollette",
  "Altro",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function MovimentiPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [type, setType] = useState<"expense" | "income">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Altro");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");

  const [filterType, setFilterType] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);

    const [transactionsResponse, accountsResponse] = await Promise.all([
      fetch("/api/transactions"),
      fetch("/api/accounts"),
    ]);

    const transactionsData = await transactionsResponse.json();
    const accountsData = await accountsResponse.json();

    if (transactionsResponse.ok) {
      setTransactions(transactionsData.transactions ?? []);
    }

    if (accountsResponse.ok) {
      const loadedAccounts = accountsData.accounts ?? [];
      setAccounts(loadedAccounts);

      if (!accountId && loadedAccounts.length > 0) {
        setAccountId(loadedAccounts[0].id);
      }
    }

    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (filterType !== "all" && transaction.type !== filterType) {
        return false;
      }

      if (
        filterAccount !== "all" &&
        transaction.account_id !== filterAccount
      ) {
        return false;
      }

      if (
        filterCategory !== "all" &&
        transaction.category !== filterCategory
      ) {
        return false;
      }

      return true;
    });
  }, [transactions, filterType, filterAccount, filterCategory]);

  const totalIncome = useMemo(
    () =>
      filteredTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [filteredTransactions]
  );

  const totalExpenses = useMemo(
    () =>
      filteredTransactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [filteredTransactions]
  );

  const periodBalance = totalIncome - totalExpenses;

  function resetForm() {
    setEditingId(null);
    setType("expense");
    setDescription("");
    setAmount("");
    setCategory("Altro");
    setNotes("");
    setDate(new Date().toISOString().slice(0, 10));

    if (accounts.length > 0) {
      setAccountId(accounts[0].id);
    }

    setShowForm(false);
  }

  function startEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setType(transaction.type);
    setDescription(transaction.description);
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setAccountId(transaction.account_id);
    setDate(transaction.date);
    setNotes(transaction.notes ?? "");
    setShowForm(true);
  }

  async function saveTransaction() {
    const numericAmount = Number(amount.replace(",", "."));

    if (
      !description.trim() ||
      !accountId ||
      !category ||
      !date ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return;
    }

    setSaving(true);

    const response = await fetch("/api/transactions", {
      method: editingId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(editingId ? { id: editingId } : {}),
        account_id: accountId,
        description,
        type,
        category,
        date,
        amount: numericAmount,
        notes,
      }),
    });

    if (response.ok) {
      await loadData();
      resetForm();
    }

    setSaving(false);
  }

  async function deleteTransaction(id: string) {
    if (!window.confirm("Vuoi eliminare questo movimento?")) return;

    const response = await fetch(`/api/transactions?id=${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== id)
      );
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-500">
              Gestione finanziaria
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Movimenti
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Registra entrate e uscite e tieni sotto controllo i tuoi conti.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            disabled={accounts.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={17} />
            Nuovo movimento
          </button>
        </div>

        {accounts.length === 0 && !loading && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Devi prima creare almeno un conto nella sezione{" "}
            <strong>Conti</strong>.
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">Entrate</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
              {formatCurrency(totalIncome)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">Uscite</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
              {formatCurrency(totalExpenses)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">Saldo periodo</p>
            <p
              className={`mt-3 text-2xl font-semibold tracking-tight ${
                periodBalance >= 0
                  ? "text-zinc-950"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(periodBalance)}
            </p>
          </div>
        </div>

        {showForm && (
          <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-zinc-950">
                  {editingId ? "Modifica movimento" : "Nuovo movimento"}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Inserisci i dati del movimento.
                </p>
              </div>

              <button
                onClick={resetForm}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 flex rounded-xl bg-zinc-100 p-1">
              <button
                onClick={() => setType("expense")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  type === "expense"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500"
                }`}
              >
                Uscita
              </button>

              <button
                onClick={() => setType("income")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  type === "income"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500"
                }`}
              >
                Entrata
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600">
                  Descrizione
                </label>
                <input
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Es. Spesa supermercato"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600">
                  Importo
                </label>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600">
                  Conto
                </label>
                <select
                  value={accountId}
                  onChange={(event) =>
                    setAccountId(event.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="mb-2 block text-xs font-medium text-zinc-600">
                  Note
                </label>
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Note opzionali"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={saveTransaction}
                disabled={saving || accounts.length === 0}
                className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving
                  ? "Salvataggio..."
                  : editingId
                    ? "Salva modifiche"
                    : "Aggiungi movimento"}
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:flex-row">
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
          >
            <option value="all">Tutti i movimenti</option>
            <option value="income">Entrate</option>
            <option value="expense">Uscite</option>
          </select>

          <select
            value={filterAccount}
            onChange={(event) =>
              setFilterAccount(event.target.value)
            }
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
          >
            <option value="all">Tutti i conti</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(event) =>
              setFilterCategory(event.target.value)
            }
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
          >
            <option value="all">Tutte le categorie</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {loading ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              Caricamento...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-medium text-zinc-900">
                Nessun movimento
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                I movimenti registrati compariranno qui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filteredTransactions.map((transaction) => {
                const isIncome = transaction.type === "income";

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-zinc-50"
                  >
                    <div
                      className={`rounded-xl p-2.5 ${
                        isIncome
                          ? "bg-zinc-100"
                          : "bg-zinc-100"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft
                          size={18}
                          className="text-zinc-700"
                        />
                      ) : (
                        <ArrowUpRight
                          size={18}
                          className="text-zinc-700"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <p className="truncate text-sm font-medium text-zinc-950">
                          {transaction.description}
                        </p>

                        <span className="w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
                          {transaction.category}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-zinc-400">
                        <span>{formatDate(transaction.date)}</span>
                        <span>•</span>
                        <span>
                          {transaction.accounts?.name ?? "Conto"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          isIncome
                            ? "text-zinc-950"
                            : "text-zinc-700"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(Number(transaction.amount))}
                      </p>

                      <div className="mt-1 flex justify-end gap-1">
                        <button
                          onClick={() => startEdit(transaction)}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                          title="Modifica"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          onClick={() =>
                            deleteTransaction(transaction.id)
                          }
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                          title="Elimina"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
