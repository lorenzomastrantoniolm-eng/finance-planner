export type FinanceTransaction = {
  id: string;
  user_id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number | string;
  type: "income" | "expense";
  category: string;
  notes?: string | null;
};

export type MonthlyActuals = {
  income: number;
  expenses: number;
  savings: number;
  byCategory: Record<string, number>;
};

export function calculateMonthlyActuals(
  transactions: FinanceTransaction[]
): MonthlyActuals {
  const byCategory: Record<string, number> = {};

  let income = 0;
  let expenses = 0;

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      continue;
    }

    if (transaction.type === "income") {
      income += amount;
      continue;
    }

    expenses += amount;

    const category = transaction.category?.trim() || "Altro";

    byCategory[category] =
      (byCategory[category] ?? 0) + amount;
  }

  return {
    income,
    expenses,
    savings: income - expenses,
    byCategory,
  };
}

export function calculatePlannedExpenses(
  fixedExpenses: number,
  variableBudget: number
): number {
  return Math.max(0, fixedExpenses) + Math.max(0, variableBudget);
}

export function calculateSavingsRate(
  income: number,
  savings: number
): number {
  return income > 0 ? (savings / income) * 100 : 0;
}

export function calculateBudgetRemaining(
  planned: number,
  actual: number
): number {
  return planned - actual;
}
