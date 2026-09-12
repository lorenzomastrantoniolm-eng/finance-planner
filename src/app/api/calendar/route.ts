import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonthRange } from "@/lib/finance/month";
import {
  calculateMonthlyActuals,
  calculateBudgetRemaining,
} from "@/lib/finance/calculations";

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
  }).format(new Date());
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401 }
    );
  }

  const month = request.nextUrl.searchParams.get("month");

  if (!month) {
    return NextResponse.json(
      { error: "Parametro month mancante" },
      { status: 400 }
    );
  }

  const range = getMonthRange(month);

  if (!range) {
    return NextResponse.json(
      { error: "Parametro month non valido" },
      { status: 400 }
    );
  }

  const {
    start: startDate,
    end: nextMonth,
    year,
    monthNumber,
  } = range;

  const daysInMonth = new Date(
    year,
    monthNumber,
    0
  ).getDate();

  const todayKey = getTodayKey();
  const currentMonth = todayKey.slice(0, 7);

  const isCurrentMonth = month === currentMonth;
  const isFutureMonth = month > currentMonth;
  const isPastMonth = month < currentMonth;

  const [
    transactionsResult,
    recurringResult,
    accountsResult,
    budgetsResult,
    previousTransactionsResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, user_id, account_id, date, description, amount, type, category, notes"
      )
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", nextMonth)
      .order("date", { ascending: true }),

    supabase
      .from("recurring_transactions")
      .select(
        "id, name, amount, type, day, category, active"
      )
      .eq("user_id", user.id)
      .eq("active", true)
      .order("day", { ascending: true }),

    supabase
      .from("accounts")
      .select("id, initial_balance")
      .eq("user_id", user.id),

    supabase
      .from("budgets")
      .select("category, planned_amount")
      .eq("user_id", user.id)
      .eq("month", startDate),

    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .lt("date", startDate),
  ]);

  if (transactionsResult.error) {
    return NextResponse.json(
      { error: transactionsResult.error.message },
      { status: 500 }
    );
  }

  if (recurringResult.error) {
    return NextResponse.json(
      { error: recurringResult.error.message },
      { status: 500 }
    );
  }

  if (accountsResult.error) {
    return NextResponse.json(
      { error: accountsResult.error.message },
      { status: 500 }
    );
  }

  if (budgetsResult.error) {
    return NextResponse.json(
      { error: budgetsResult.error.message },
      { status: 500 }
    );
  }

  if (previousTransactionsResult.error) {
    return NextResponse.json(
      { error: previousTransactionsResult.error.message },
      { status: 500 }
    );
  }

  const transactions = transactionsResult.data ?? [];
  const recurring = recurringResult.data ?? [];
  const accounts = accountsResult.data ?? [];
  const budgets = budgetsResult.data ?? [];
  const previousTransactions =
    previousTransactionsResult.data ?? [];

  /*
   * SALDO INIZIALE
   */

  const initialBalances = accounts.reduce(
    (sum, account) =>
      sum + Number(account.initial_balance ?? 0),
    0
  );

  const previousActuals = calculateMonthlyActuals(
    previousTransactions.map((transaction) => ({
      id: "",
      user_id: user.id,
      account_id: "",
      date: "",
      description: "",
      amount: transaction.amount,
      type: transaction.type,
      category: "",
    }))
  );

  const startingBalance =
    initialBalances + previousActuals.savings;

  /*
   * MOVIMENTI REALI DEL MESE
   */

  const actuals = calculateMonthlyActuals(
    transactions
  );

  const actualIncome = actuals.income;
  const actualExpenses = actuals.expenses;

  const actualBalance =
    startingBalance +
    actuals.savings;

  /*
   * BUDGET VARIABILE
   */

  const variableBudget = budgets.reduce(
    (sum, item) =>
      sum + Number(item.planned_amount ?? 0),
    0
  );

  const budgetCategories = new Set(
    budgets.map((budget) => budget.category)
  );

  const actualVariableExpenses = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        budgetCategories.has(transaction.category)
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0
    );

  /*
   * IMPORTANTE:
   * il valore può essere negativo.
   *
   * Esempio:
   * budget €500
   * speso €650
   * residuo = -€150
   *
   * Prima questo dato veniva trasformato in €0,
   * nascondendo l'overspending.
   */

  const remainingVariableBudget =
    calculateBudgetRemaining(
      variableBudget,
      actualVariableExpenses
    );

  /*
   * MOVIMENTI PER GIORNO
   */

  const actualByDay: Record<
    string,
    {
      income: number;
      expenses: number;
      net: number;
    }
  > = {};

  transactions.forEach((transaction) => {
    const date = transaction.date;
    const amount = Number(transaction.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      return;
    }

    if (!actualByDay[date]) {
      actualByDay[date] = {
        income: 0,
        expenses: 0,
        net: 0,
      };
    }

    if (transaction.type === "income") {
      actualByDay[date].income += amount;
      actualByDay[date].net += amount;
    } else {
      actualByDay[date].expenses += amount;
      actualByDay[date].net -= amount;
    }
  });

  /*
   * RICORRENTI FUTURI
   *
   * Per evitare il doppio conteggio, un ricorrente
   * non viene previsto se esiste già un movimento
   * dello stesso giorno con:
   * - stesso tipo
   * - stesso importo
   * - stessa categoria
   *
   * Non possiamo avere un riferimento diretto
   * recurring_transaction_id nella tabella transactions,
   * quindi utilizziamo questo matching conservativo.
   */

  const recurringFutureByDay: Record<
    number,
    {
      income: number;
      expenses: number;
    }
  > = {};

  recurring.forEach((item) => {
    const day = Math.min(
      Math.max(Number(item.day), 1),
      daysInMonth
    );

    const recurringDate =
      `${month}-${String(day).padStart(2, "0")}`;

    let shouldForecast = false;

    if (isFutureMonth) {
      shouldForecast = true;
    } else if (isCurrentMonth) {
      shouldForecast = recurringDate >= todayKey;
    }

    if (!shouldForecast) {
      return;
    }

    const alreadyRecorded = transactions.some(
      (transaction) =>
        transaction.date === recurringDate &&
        transaction.type === item.type &&
        transaction.category === item.category &&
        Math.abs(
          Number(transaction.amount) -
            Number(item.amount)
        ) < 0.01
    );

    if (alreadyRecorded) {
      return;
    }

    if (!recurringFutureByDay[day]) {
      recurringFutureByDay[day] = {
        income: 0,
        expenses: 0,
      };
    }

    if (item.type === "income") {
      recurringFutureByDay[day].income += Number(
        item.amount
      );
    } else {
      recurringFutureByDay[day].expenses += Number(
        item.amount
      );
    }
  });

  const futureRecurringIncome = Object.values(
    recurringFutureByDay
  ).reduce(
    (sum, item) => sum + item.income,
    0
  );

  const futureRecurringExpenses = Object.values(
    recurringFutureByDay
  ).reduce(
    (sum, item) => sum + item.expenses,
    0
  );

  /*
   * PREVISIONE FINALE
   */

  let projectedEndBalance = actualBalance;

  if (isCurrentMonth) {
    /*
     * Se siamo già in overspending, non esiste
     * "budget residuo" da sottrarre una seconda volta.
     *
     * L'overspending è già incluso nei movimenti reali.
     */
    const futureVariableBudget = Math.max(
      0,
      remainingVariableBudget
    );

    projectedEndBalance =
      actualBalance +
      futureRecurringIncome -
      futureRecurringExpenses -
      futureVariableBudget;
  } else if (isFutureMonth) {
    projectedEndBalance =
      startingBalance +
      futureRecurringIncome -
      futureRecurringExpenses -
      variableBudget;
  }

  /*
   * FORECAST GIORNALIERO
   */

  const forecastDays = [];

  let runningActualBalance = startingBalance;
  let runningForecastBalance = startingBalance;

  const futureDays: number[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date =
      `${month}-${String(day).padStart(2, "0")}`;

    const isFutureDay =
      isFutureMonth ||
      (isCurrentMonth && date >= todayKey);

    if (isFutureDay) {
      futureDays.push(day);
    }
  }

  const futureVariableBudget = Math.max(
    0,
    remainingVariableBudget
  );

  const variableBudgetPerFutureDay =
    futureDays.length > 0
      ? futureVariableBudget / futureDays.length
      : 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date =
      `${month}-${String(day).padStart(2, "0")}`;

    const actual = actualByDay[date] ?? {
      income: 0,
      expenses: 0,
      net: 0,
    };

    runningActualBalance += actual.net;

    runningForecastBalance +=
      actual.income - actual.expenses;

    const futureRecurring =
      recurringFutureByDay[day] ?? {
        income: 0,
        expenses: 0,
      };

    const isFutureDay =
      isFutureMonth ||
      (isCurrentMonth && date >= todayKey);

    if (isFutureDay) {
      runningForecastBalance +=
        futureRecurring.income -
        futureRecurring.expenses;

      runningForecastBalance -=
        variableBudgetPerFutureDay;
    }

    if (isPastMonth) {
      runningForecastBalance =
        runningActualBalance;
    }

    forecastDays.push({
      date,
      actualBalance: runningActualBalance,
      forecastBalance: runningForecastBalance,
      actualIncome: actual.income,
      actualExpenses: actual.expenses,
      recurringIncome:
        futureRecurring.income,
      recurringExpenses:
        futureRecurring.expenses,
    });
  }

  if (forecastDays.length > 0) {
    forecastDays[
      forecastDays.length - 1
    ].forecastBalance = projectedEndBalance;
  }

  /*
   * TOTALI RICORRENTI ATTIVI
   */

  const recurringIncome = recurring
    .filter((item) => item.type === "income")
    .reduce(
      (sum, item) =>
        sum + Number(item.amount),
      0
    );

  const recurringExpenses = recurring
    .filter((item) => item.type === "expense")
    .reduce(
      (sum, item) =>
        sum + Number(item.amount),
      0
    );

  return NextResponse.json({
    month,
    transactions,
    recurring,

    startingBalance,

    summary: {
      actualIncome,
      actualExpenses,
      actualBalance,

      recurringIncome,
      recurringExpenses,

      futureRecurringIncome,
      futureRecurringExpenses,

      recurringBalance:
        recurringIncome -
        recurringExpenses,

      variableBudget,
      actualVariableExpenses,
      remainingVariableBudget,

      projectedEndBalance,
    },

    forecastDays,
  });
}
