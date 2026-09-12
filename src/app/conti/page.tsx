"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
  initial_balance: number;
};

const accountTypes = [
  "Conto corrente",
  "Carta",
  "Conto deposito",
  "Contanti",
  "Altro",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function getIcon(type: string) {
  if (type === "Carta") return CreditCard;
  if (type === "Contanti") return Wallet;
  return Landmark;
}

export default function ContiPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("Conto corrente");
  const [initialBalance, setInitialBalance] = useState("");

  async function loadAccounts() {
    setLoading(true);

    const response = await fetch("/api/accounts");
    const data = await response.json();

    if (response.ok) {
      setAccounts(data.accounts ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccounts();
  }, []);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + Number(account.balance), 0),
    [accounts]
  );

  function resetForm() {
    setName("");
    setType("Conto corrente");
    setInitialBalance("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setType(account.type);
    setInitialBalance(String(account.initial_balance ?? account.balance));
    setShowForm(true);
  }

  async function saveAccount() {
    const numericBalance = Number(initialBalance.replace(",", "."));

    if (!name.trim() || !Number.isFinite(numericBalance)) return;

    setSaving(true);

    const response = await fetch("/api/accounts", {
      method: editingId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(editingId ? { id: editingId } : {}),
        name,
        type,
        initial_balance: numericBalance,
      }),
    });

    if (response.ok) {
      await loadAccounts();
      resetForm();
    }

    setSaving(false);
  }

  async function deleteAccount(id: string) {
    if (!window.confirm("Vuoi eliminare questo conto?")) return;

    const response = await fetch(`/api/accounts?id=${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setAccounts((current) =>
        current.filter((account) => account.id !== id)
      );
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-500">
              Patrimonio
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Conti
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Gestisci i tuoi conti e tieni sotto controllo la liquidità.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Plus size={17} />
            Nuovo conto
          </button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div
            className={`rounded-2xl border p-5 ${
              totalBalance >= 0
                ? "border-zinc-200 bg-white"
                : "border-red-200 bg-red-50/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                Totale disponibilità
              </span>

              <div
                className={`rounded-xl p-2 ${
                  totalBalance >= 0
                    ? "bg-zinc-100"
                    : "bg-red-100"
                }`}
              >
                <Landmark
                  size={18}
                  className={
                    totalBalance >= 0
                      ? "text-zinc-600"
                      : "text-red-600"
                  }
                />
              </div>
            </div>

            <p
              className={`mt-4 text-3xl font-semibold tracking-tight ${
                totalBalance >= 0
                  ? "text-zinc-950"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(totalBalance)}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Saldo complessivo di tutti i conti
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                Conti attivi
              </span>
              <div className="rounded-xl bg-zinc-100 p-2">
                <Wallet size={18} className="text-zinc-600" />
              </div>
            </div>

            <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
              {accounts.length}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Conti e strumenti finanziari
            </p>
          </div>
        </div>

        {showForm && (
          <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-zinc-950">
                  {editingId ? "Modifica conto" : "Nuovo conto"}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Inserisci il saldo disponibile al momento della registrazione.
                </p>
              </div>

              <button
                onClick={resetForm}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600">
                  Nome
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Es. Conto principale"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600">
                  Tipo
                </label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                >
                  {accountTypes.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600">
                  Saldo iniziale
                </label>
                <input
                  value={initialBalance}
                  onChange={(event) => setInitialBalance(event.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={saveAccount}
                disabled={saving}
                className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving
                  ? "Salvataggio..."
                  : editingId
                    ? "Salva modifiche"
                    : "Aggiungi conto"}
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-950">
              I tuoi conti
            </h2>
            <span className="text-xs text-zinc-400">
              {accounts.length} {accounts.length === 1 ? "conto" : "conti"}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
              Caricamento...
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
              <Landmark className="mx-auto text-zinc-300" size={34} />
              <h3 className="mt-4 font-medium text-zinc-900">
                Nessun conto
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Aggiungi il primo conto per iniziare a monitorare la
                tua liquidità.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => {
                const Icon = getIcon(account.type);
                const percentage =
                  totalBalance > 0
                    ? (Number(account.balance) / totalBalance) * 100
                    : 0;

                return (
                  <div
                    key={account.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-zinc-100 p-2.5">
                          <Icon size={19} className="text-zinc-600" />
                        </div>

                        <div>
                          <h3 className="font-medium text-zinc-950">
                            {account.name}
                          </h3>
                          <p className="text-xs text-zinc-500">
                            {account.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(account)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                          title="Modifica"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          onClick={() => deleteAccount(account.id)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                          title="Elimina"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p
                        className={`text-2xl font-semibold tracking-tight ${
                          Number(account.balance) >= 0
                            ? "text-zinc-950"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(Number(account.balance))}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-zinc-500">
                          Iniziale {formatCurrency(Number(account.initial_balance))}
                        </span>

                        {(() => {
                          const difference =
                            Number(account.balance) -
                            Number(account.initial_balance);

                          return (
                            <span
                              className={
                                difference >= 0
                                  ? "font-medium text-emerald-600"
                                  : "font-medium text-red-600"
                              }
                            >
                              {difference >= 0 ? "+" : ""}
                              {formatCurrency(difference)}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex justify-between text-xs text-zinc-500">
                          <span>Incidenza</span>
                          <span>{percentage.toFixed(1)}%</span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-zinc-900 transition-all"
                            style={{
                              width: `${Math.min(Math.max(percentage, 0), 100)}%`,
                            }}
                          />
                        </div>
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
