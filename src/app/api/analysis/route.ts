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
  const period = searchParams.get("period") ?? "12";

  if (!["6", "12", "all"].includes(period)) {
    return NextResponse.json(
      { error: "Periodo non valido" },
      { status: 400 }
    );
  }

  const [
    { data: plans, error: plansError },
    { data: budgets, error: budgetsError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from("monthly_plans")
      .select(
        "month, expected_income, savings_goal, planned_fixed_expenses, is_closed"
      )
      .eq("user_id", user.id)
      .order("month", { ascending: true }),

    supabase
      .from("budgets")
      .select("month, category, planned_amount")
      .eq("user_id", user.id)
      .order("month", { ascending: true }),

    supabase
      .from("transactions")
      .select(
        "id, user_id, account_id, date, description, amount, type, category, notes"
      )
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
  ]);

  if (plansError) {
    return NextResponse.json(
      { error: plansError.message },
      { status: 500 }
    );
  }

  if (budgetsError) {
    return NextResponse.json(
      { error: budgetsError.message },
      { status: 500 }
    );
  }

  if (transactionsError) {
    return NextResponse.json(
      { error: transactionsError.message },
      { status: 500 }
    );
  }

  const allPlans = plans ?? [];
  const allBudgets = budgets ?? [];
  const allTransactions = transactions ?? [];

  let filteredPlans = allPlans;

  if (period !== "all") {
    const months = Number(period);
    filteredPlans = allPlans.slice(-months);
  }

  const monthsWithData = filteredPlans.flatMap((plan) => {
    const month = String(plan.month).slice(0, 7);
    const monthRange = getMonthRange(month);

    if (!monthRange) {
      return [];
    }

    const { start, end } = monthRange;

    const monthTransactions = allTransactions.filter(
      (transaction) =>
        transaction.date >= start &&
        transaction.date < end
    );

    const monthBudgets = allBudgets.filter(
      (budget) =>
        String(budget.month).slice(0, 7) === month
    );

    const actuals = calculateMonthlyActuals(
      monthTransactions
    );

    const plannedFixedExpenses =
      Number(plan.planned_fixed_expenses ?? 0);

    const plannedVariableExpenses =
      monthBudgets.reduce(
        (sum, budget) =>
          sum + Number(budget.planned_amount ?? 0),
        0
      );

    const plannedExpenses = calculatePlannedExpenses(
      plannedFixedExpenses,
      plannedVariableExpenses
    );

    const plannedIncome =
      Number(plan.expected_income ?? 0);

    const plannedSavings =
      Number(plan.savings_goal ?? 0);

    const isClosed = Boolean(plan.is_closed);

    return {
      month: plan.month,
      isClosed,

      plannedIncome,
      plannedFixedExpenses,
      plannedVariableExpenses,
      plannedExpenses,
      plannedSavings,

      actualIncome: actuals.income,
      actualExpenses: actuals.expenses,
      actualSavings: actuals.savings,
      actualByCategory: actuals.byCategory,

      income: isClosed
        ? actuals.income
        : plannedIncome,

      expenses: isClosed
        ? actuals.expenses
        : plannedExpenses,

      savings: isClosed
        ? actuals.savings
        : plannedSavings,

      budgets: monthBudgets.map((budget) => ({
        category: budget.category,
        plannedAmount: Number(
          budget.planned_amount ?? 0
        ),
        actualAmount:
          actuals.byCategory[budget.category] ?? 0,
      })),
    };
  });

  const totalPlannedIncome = monthsWithData.reduce(
    (sum, item) => sum + item.plannedIncome,
    0
  );

  const totalPlannedExpenses = monthsWithData.reduce(
    (sum, item) => sum + item.plannedExpenses,
    0
  );

  const totalPlannedSavings = monthsWithData.reduce(
    (sum, item) => sum + item.plannedSavings,
    0
  );

  const totalActualIncome = monthsWithData.reduce(
    (sum, item) => sum + item.actualIncome,
    0
  );

  const totalActualExpenses = monthsWithData.reduce(
    (sum, item) => sum + item.actualExpenses,
    0
  );

  const totalActualSavings = monthsWithData.reduce(
    (sum, item) => sum + item.actualSavings,
    0
  );

  const totalIncome = monthsWithData.reduce(
    (sum, item) => sum + item.income,
    0
  );

  const totalExpenses = monthsWithData.reduce(
    (sum, item) => sum + item.expenses,
    0
  );

  const totalSavings = monthsWithData.reduce(
    (sum, item) => sum + item.savings,
    0
  );

  const monthCount = monthsWithData.length;

  const averageIncome =
    monthCount > 0
      ? totalIncome / monthCount
      : 0;

  const averageExpenses =
    monthCount > 0
      ? totalExpenses / monthCount
      : 0;

  const averageSavings =
    monthCount > 0
      ? totalSavings / monthCount
      : 0;

  const savingsRate = calculateSavingsRate(
    totalIncome,
    totalSavings
  );

  const plannedSavingsRate = calculateSavingsRate(
    totalPlannedIncome,
    totalPlannedSavings
  );

  const actualSavingsRate = calculateSavingsRate(
    totalActualIncome,
    totalActualSavings
  );

  const categoryTotals = new Map<
    string,
    {
      plannedAmount: number;
      actualAmount: number;
    }
  >();

  monthsWithData.forEach((month) => {
    month.budgets.forEach((budget) => {
      const current =
        categoryTotals.get(budget.category) ?? {
          plannedAmount: 0,
          actualAmount: 0,
        };

      current.plannedAmount += budget.plannedAmount;
      current.actualAmount += budget.actualAmount;

      categoryTotals.set(
        budget.category,
        current
      );
    });
  });

  const allCategories = new Set(
    categoryTotals.keys()
  );

  monthsWithData.forEach((month) => {
    Object.keys(
      month.actualByCategory ?? {}
    ).forEach((category) => {
      allCategories.add(category);
    });
  });

  const categories = Array.from(allCategories)
    .map((category) => {
      const totals =
        categoryTotals.get(category) ?? {
          plannedAmount: 0,
          actualAmount: 0,
        };

      const actualAmount =
        monthsWithData.reduce(
          (sum, month) =>
            sum +
            Number(
              month.actualByCategory?.[category] ?? 0
            ),
          0
        );

      return {
        category,
        amount: actualAmount,
        plannedAmount: totals.plannedAmount,
        actualAmount,
        difference:
          actualAmount - totals.plannedAmount,
        percentage:
          totals.plannedAmount > 0
            ? (actualAmount / totals.plannedAmount) * 100
            : 0,
      };
    })
    .sort((a, b) => b.actualAmount - a.actualAmount);

  const latest =
    monthsWithData.at(-1) ?? null;

  const previous =
    monthsWithData.length > 1
      ? monthsWithData.at(-2)
      : null;

  const comparison =
    latest && previous
      ? {
          income:
            latest.income - previous.income,
          expenses:
            latest.expenses - previous.expenses,
          savings:
            latest.savings - previous.savings,
        }
      : null;

  return NextResponse.json({
    period,
    months: monthsWithData,

    summary: {
      monthCount,

      totalIncome,
      totalExpenses,
      totalSavings,

      averageIncome,
      averageExpenses,
      averageSavings,

      savingsRate,

      totalPlannedIncome,
      totalPlannedExpenses,
      totalPlannedSavings,
      plannedSavingsRate,

      totalActualIncome,
      totalActualExpenses,
      totalActualSavings,
      actualSavingsRate,

      closedMonths: monthsWithData.filter(
        (item) => item.isClosed
      ).length,
    },

    categories,
    comparison,
  });
}
