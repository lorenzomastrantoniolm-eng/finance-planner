export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type RecurringTransaction = {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  day: number;
  category: string;
  active: boolean;
};

export type Budget = {
  category: string;
  planned: number;
};

export type MonthlyPlan = {
  month: string;
  income: number;
  fixedExpenses: number;
  variableBudget: number;
  savingsGoal: number;
};
