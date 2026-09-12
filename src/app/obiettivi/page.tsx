"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Edit3,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) return "Nessuna scadenza";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
};

function getMonthsRemaining(targetDate: string | null) {
  if (!targetDate) return null;

  const today = new Date();
  const target = new Date(`${targetDate}T00:00:00`);

  const months =
    (target.getFullYear() - today.getFullYear()) * 12 +
    (target.getMonth() - today.getMonth());

  return Math.max(months, 0);
}

export default function ObiettiviPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const loadGoals = async () => {
    try {
      const response = await fetch("/api/goals");

      if (!response.ok) {
        throw new Error("Errore nel caricamento");
      }

      const data = await response.json();
      setGoals(data.goals ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGoals();
  }, []);

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setTargetDate("");
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setTargetDate("");
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setName(goal.name);
    setTargetAmount(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
    setTargetDate(goal.target_date ?? "");
    setShowForm(true);
  };

  const saveGoal = async () => {
    if (!name.trim()) return;

    const target = Number(targetAmount);
    const current = Number(currentAmount || 0);

    if (!Number.isFinite(target) || target <= 0) return;
    if (!Number.isFinite(current) || current < 0) return;
    if (current > target) return;

    setSaving(true);

    try {
      const response = await fetch("/api/goals", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: name.trim(),
          target_amount: target,
          current_amount: current,
          target_date: targetDate || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Errore");
      }

      await loadGoals();
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!window.confirm("Vuoi eliminare questo obiettivo?")) return;

    try {
      const response = await fetch(`/api/goals?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Errore nell'eliminazione");
      }

      setGoals((current) => current.filter((goal) => goal.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const summary = useMemo(() => {
    const target = goals.reduce(
      (sum, goal) => sum + Number(goal.target_amount),
      0
    );

    const saved = goals.reduce(
      (sum, goal) => sum + Number(goal.current_amount),
      0
    );

    const remaining = Math.max(target - saved, 0);
    const progress = target > 0 ? Math.min((saved / target) * 100, 100) : 0;

    return {
      target,
      saved,
      remaining,
      progress,
    };
  }, [goals]);

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
              Obiettivi
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Trasforma i tuoi progetti in obiettivi finanziari concreti.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Plus size={17} />
            Nuovo obiettivo
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-zinc-100 p-2.5">
                <Target size={18} className="text-zinc-700" />
              </div>
              <span className="text-xs font-medium text-zinc-400">
                Totale
              </span>
            </div>

            <p className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950">
              {goals.length}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              {goals.length === 1 ? "obiettivo attivo" : "obiettivi attivi"}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-emerald-50 p-2.5">
                <Check size={18} className="text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-zinc-400">
                Accumulato
              </span>
            </div>

            <p className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950">
              {formatCurrency(summary.saved)}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              su {formatCurrency(summary.target)} complessivi
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-zinc-100 p-2.5">
                <Target size={18} className="text-zinc-700" />
              </div>
              <span className="text-xs font-medium text-zinc-400">
                Avanzamento
              </span>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="text-3xl font-semibold tracking-tight text-zinc-950">
                {summary.progress.toFixed(0)}%
              </p>
              <p className="text-xs text-zinc-500">
                {formatCurrency(summary.remaining)} mancanti
              </p>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-950 transition-all"
                style={{ width: `${summary.progress}%` }}
              />
            </div>
          </div>
        </div>

        {showForm && (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-zinc-950">
                  {editingId ? "Modifica obiettivo" : "Nuovo obiettivo"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Definisci quanto vuoi raggiungere e entro quando.
                </p>
              </div>

              <button
                onClick={resetForm}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-zinc-600">
                  Nome
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Es. Vacanza"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-600">
                  Importo obiettivo
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetAmount}
                  onChange={(event) => setTargetAmount(event.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-600">
                  Già accumulato
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentAmount}
                  onChange={(event) => setCurrentAmount(event.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-600">
                  Data obiettivo
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Annulla
              </button>

              <button
                onClick={saveGoal}
                disabled={saving}
                className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving
                  ? "Salvataggio..."
                  : editingId
                    ? "Salva modifiche"
                    : "Crea obiettivo"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
              Caricamento obiettivi...
            </div>
          ) : goals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
              <Target className="mx-auto text-zinc-400" size={28} />
              <h2 className="mt-4 font-semibold text-zinc-900">
                Nessun obiettivo
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                Crea il tuo primo obiettivo per iniziare a monitorare i
                progressi dei tuoi progetti.
              </p>

              <button
                onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                <Plus size={17} />
                Crea obiettivo
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((goal) => {
                const target = Number(goal.target_amount);
                const current = Number(goal.current_amount);
                const remaining = Math.max(target - current, 0);
                const progress =
                  target > 0 ? Math.min((current / target) * 100, 100) : 0;

                const months = getMonthsRemaining(goal.target_date);
                const monthlyRequired =
                  months && months > 0 ? remaining / months : null;

                const completed = current >= target;

                return (
                  <div
                    key={goal.id}
                    className={`rounded-2xl border bg-white p-6 transition ${
                      completed
                        ? "border-emerald-200"
                        : "border-zinc-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate font-semibold text-zinc-950">
                            {goal.name}
                          </h2>

                          {completed && (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                              Raggiunto
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                          <CalendarDays size={14} />
                          {goal.target_date
                            ? `Obiettivo ${formatDate(goal.target_date)}`
                            : "Nessuna scadenza"}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => openEdit(goal)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                          title="Modifica"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-7 flex items-end justify-between gap-4">
                      <div>
                        <p
                          className={`text-3xl font-semibold tracking-tight ${
                            completed
                              ? "text-emerald-600"
                              : "text-zinc-950"
                          }`}
                        >
                          {formatCurrency(current)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          di {formatCurrency(target)}
                        </p>
                      </div>

                      <p
                        className={`text-sm font-semibold ${
                          completed
                            ? "text-emerald-600"
                            : "text-zinc-700"
                        }`}
                      >
                        {progress.toFixed(0)}%
                      </p>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          completed ? "bg-emerald-500" : "bg-zinc-950"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-zinc-50 p-3.5">
                        <p className="text-xs text-zinc-500">
                          {completed ? "Stato" : "Ancora da accumulare"}
                        </p>
                        <p
                          className={`mt-1 text-sm font-semibold ${
                            completed
                              ? "text-emerald-600"
                              : "text-zinc-900"
                          }`}
                        >
                          {completed
                            ? "Obiettivo raggiunto"
                            : formatCurrency(remaining)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-3.5">
                        <p className="text-xs text-zinc-500">
                          Accantonamento mensile
                        </p>
                        <p className="mt-1 text-sm font-semibold text-zinc-900">
                          {completed
                            ? "—"
                            : monthlyRequired !== null
                              ? formatCurrency(monthlyRequired)
                              : "—"}
                        </p>
                      </div>
                    </div>

                    {!completed && months !== null && (
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-3.5 py-3">
                        <span className="text-xs text-zinc-500">
                          Tempo rimanente
                        </span>
                        <span className="text-xs font-medium text-zinc-800">
                          {months <= 0
                            ? "Scadenza raggiunta"
                            : months === 1
                              ? "1 mese"
                              : `${months} mesi`}
                        </span>
                      </div>
                    )}
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
