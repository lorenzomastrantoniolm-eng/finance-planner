import { Budget, MonthlyPlan, RecurringTransaction } from "./types";

export const monthlyPlan: MonthlyPlan = {
  month: "Settembre 2026",
  income: 3200,
  fixedExpenses: 1250,
  variableBudget: 1350,
  savingsGoal: 600,
};

export const recurringTransactions: RecurringTransaction[] = [
  {
    id: "1",
    name: "Stipendio",
    amount: 3200,
    type: "income",
    day: 10,
    category: "Stipendio",
    active: true,
  },
  {
    id: "2",
    name: "Mutuo",
    amount: 850,
    type: "expense",
    day: 16,
    category: "Casa",
    active: true,
  },
  {
    id: "3",
    name: "Assicurazione auto",
    amount: 48,
    type: "expense",
    day: 20,
    category: "Auto",
    active: true,
  },
  {
    id: "4",
    name: "Netflix",
    amount: 17.99,
    type: "expense",
    day: 22,
    category: "Abbonamenti",
    active: true,
  },
  {
    id: "5",
    name: "Palestra",
    amount: 45,
    type: "expense",
    day: 25,
    category: "Sport",
    active: true,
  },
];

export const budgets: Budget[] = [
  { category: "Alimentazione", planned: 400 },
  { category: "Auto", planned: 300 },
  { category: "Tempo libero", planned: 200 },
  { category: "Shopping", planned: 200 },
  { category: "Vacanze", planned: 150 },
  { category: "Altro", planned: 100 },
];

export const monthlyHistory = [
  { month: "Apr", income: 3150, expenses: 2480 },
  { month: "Mag", income: 3150, expenses: 2710 },
  { month: "Giu", income: 3200, expenses: 2580 },
  { month: "Lug", income: 3200, expenses: 2810 },
  { month: "Ago", income: 3200, expenses: 2490 },
  { month: "Set", income: 3200, expenses: 2600 },
];
