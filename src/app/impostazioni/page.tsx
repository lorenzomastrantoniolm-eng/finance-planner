"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  User,
  Wallet,
  CalendarDays,
  Database,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LOCAL_USER_ID } from "@/lib/finance/constants";

export default function ImpostazioniPage() {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [firstDay, setFirstDay] = useState("Lunedì");
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedFirstDay = localStorage.getItem("finance_first_day");
    const savedCurrency = localStorage.getItem("finance_currency");

    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", LOCAL_USER_ID)
        .maybeSingle();

      if (data?.full_name) {
        setName(data.full_name);
      }
    }

    loadProfile().then(() => {
      if (savedFirstDay) setFirstDay(savedFirstDay);
      if (savedCurrency) setCurrency(savedCurrency);
    });
  }, [supabase]);

  async function saveSettings() {
    setSaving(true);

    localStorage.setItem("finance_first_day", firstDay);
    localStorage.setItem("finance_currency", currency);

    await supabase.from("profiles").upsert({
      id: LOCAL_USER_ID,
      full_name: name.trim(),
    });

    setSaving(false);
  }


  return (
    <main className="min-h-screen bg-zinc-50 p-6 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
            <Settings size={20} />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Impostazioni
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Personalizza il tuo Finance Planner.
          </p>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <User size={19} className="text-zinc-700" />
              <div>
                <h2 className="font-semibold text-zinc-950">Profilo</h2>
                <p className="text-sm text-zinc-500">
                  Le informazioni personali del tuo account.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Nome
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Il tuo nome"
                className="w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-400 focus:bg-white"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Wallet size={19} className="text-zinc-700" />
              <div>
                <h2 className="font-semibold text-zinc-950">Finanze</h2>
                <p className="text-sm text-zinc-500">
                  Impostazioni utilizzate nei tuoi piani mensili.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Valuta
                </label>

                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-zinc-400"
                >
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">Dollaro ($)</option>
                  <option value="GBP">Sterlina (£)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Primo giorno della settimana
                </label>

                <select
                  value={firstDay}
                  onChange={(event) => setFirstDay(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-zinc-400"
                >
                  <option>Lunedì</option>
                  <option>Domenica</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <CalendarDays size={19} className="text-zinc-700" />
              <div>
                <h2 className="font-semibold text-zinc-950">Piano mensile</h2>
                <p className="text-sm text-zinc-500">
                  Il piano mensile utilizza queste preferenze per la gestione
                  del calendario.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
              Le categorie di spesa vengono gestite direttamente all&apos;interno
              del piano mensile.
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Database size={19} className="text-zinc-700" />
              <div>
                <h2 className="font-semibold text-zinc-950">Dati</h2>
                <p className="text-sm text-zinc-500">
                  Gestione ed esportazione dei tuoi dati finanziari.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
              Esportazione dati e backup saranno disponibili in una prossima
              versione.
            </div>
          </section>

          <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-zinc-950">Account</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Esci dal tuo account Finance Planner.
            </p>

          </section>
        </div>
      </div>
    </main>
  );
}
