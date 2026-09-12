import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonthRange } from "@/lib/finance/month";
import {
  calculateMonthlyActuals,
  calculatePlannedExpenses,
  calculateSavingsRate,
} from "@/lib/finance/calculations";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const monthRange = month ? getMonthRange(month) : null;

  if (!month || !monthRange) {
    return NextResponse.json(
      { error: "Mese non valido" },
      { status: 400 }
    );
  }

  const [
    { data: plan, error: planError },
    { data: budgets, error: budgetsError },
    { data: recurring, error: recurringError },
    { data: history, error: historyError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from("monthly_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", `${month}-01`)
      .maybeSingle(),

    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", `${month}-01`)
      .order("category"),

    supabase
      .from("recurring_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("day", { ascending: true }),

    supabase
      .from("monthly_plans")
      .select(
        "month, expected_income, savings_goal, planned_fixed_expenses, is_closed"
      )
      .eq("user_id", user.id)
      .order("month", { ascending: true }),

    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", `${month}-01`)
      .lt("date", monthRange.endExclusive)
      .order("date", { ascending: true }),
  ]);

  if (planError) {
    return NextResponse.json(
      { error: planError.message },
      { status: 500 }
    );
  }

  if (budgetsError) {
    return NextResponse.json(
      { error: budgetsError.message },
      { status: 500 }
    );
  }

  if (recurringError) {
    return NextResponse.json(
      { error: recurringError.message },
      { status: 500 }
    );
  }

  if (historyError) {
    return NextResponse.json(
      { error: historyError.message },
      { status: 500 }
    );
  }

  if (transactionsError) {
    return NextResponse.json(
      { error: transactionsError.message },
      { status: 500 }
    );
  }

  const fixedExpenses = (recurring ?? [])
    .filter((item) => item.type === "expense")
    .reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

  const variableBudget = (budgets ?? []).reduce(
    (sum, item) => sum + Number(item.planned_amount),
    0
  );

  const income = Number(plan?.expected_income ?? 0);
  const savingsGoal = Number(plan?.savings_goal ?? 0);

  const totalExpenses = calculatePlannedExpenses(
    fixedExpenses,
    variableBudget
  );

  const available = income - totalExpenses;
  const afterSavings = available - savingsGoal;

  const savingsRate = calculateSavingsRate(
    income,
    savingsGoal
  );

  const actuals = calculateMonthlyActuals(
    transactions ?? []
  );

  const chartHistory = await Promise.all(
    (history ?? []).map(async (item) => {
      const itemMonth = String(item.month).slice(0, 7);

      const { data: monthTransactions } = await supabase
        .from("transactions")
        .select(
          "id, user_id, account_id, date, description, amount, type, category, notes"
        )
        .eq("user_id", user.id)
        .gte("date", `${itemMonth}-01`)
        .lt("date", getMonthRange(itemMonth)!.endExclusive);

      const monthActuals = calculateMonthlyActuals(
        (monthTransactions ?? []) as never
      );

      const plannedFixedExpenses =
        Number(item.planned_fixed_expenses ?? 0);

      const { data: monthBudgets } = await supabase
        .from("budgets")
        .select("planned_amount")
        .eq("user_id", user.id)
        .eq("month", `${itemMonth}-01`);

      const plannedVariableExpenses =
        (monthBudgets ?? []).reduce(
          (sum, budget) =>
            sum + Number(budget.planned_amount ?? 0),
          0
        );

      const plannedExpenses = calculatePlannedExpenses(
        plannedFixedExpenses,
        plannedVariableExpenses
      );

      const isClosed = Boolean(item.is_closed);

      return {
        month: item.month,

        income: isClosed
          ? monthActuals.income
          : Number(item.expected_income ?? 0),

        expenses: isClosed
          ? monthActuals.expenses
          : plannedExpenses,

        savings: isClosed
          ? monthActuals.savings
          : Number(item.savings_goal ?? 0),

        plannedIncome: Number(item.expected_income ?? 0),
        plannedExpenses,
        plannedSavings: Number(item.savings_goal ?? 0),

        actualIncome: monthActuals.income,
        actualExpenses: monthActuals.expenses,
        actualSavings: monthActuals.savings,

        isClosed,
      };
    })
  );

  return NextResponse.json({
    plan,
    budgets: budgets ?? [],
    recurring: recurring ?? [],

    summary: {
      income,
      fixedExpenses,
      variableBudget,
      totalExpenses,
      savingsGoal,
      available,
      afterSavings,
      savingsRate,

      actualIncome: actuals.income,
      actualExpenses: actuals.expenses,
      actualSavings: actuals.savings,
      actualSavingsRate: calculateSavingsRate(
        actuals.income,
        actuals.savings
      ),
      actualByCategory: actuals.byCategory,
    },

    history: chartHistory,
  });
}
