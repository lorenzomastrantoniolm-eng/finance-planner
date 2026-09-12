import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonthRange } from "@/lib/finance/month";
import { calculateMonthlyActuals } from "@/lib/finance/calculations";

function isValidAmount(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) && amount >= 0;
}

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

  if (!month) {
    return NextResponse.json(
      { error: "Mese non specificato" },
      { status: 400 }
    );
  }

  const range = getMonthRange(month);

  if (!range) {
    return NextResponse.json(
      { error: "Mese non valido" },
      { status: 400 }
    );
  }

  const [
    { data: plan, error: planError },
    { data: budgets, error: budgetsError },
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
      .from("transactions")
      .select("amount, type, category, date")
      .eq("user_id", user.id)
      .gte("date", range.start)
      .lt("date", range.end)
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

  if (transactionsError) {
    return NextResponse.json(
      { error: transactionsError.message },
      { status: 500 }
    );
  }

  const monthlyTransactions = transactions ?? [];

  const actual = calculateMonthlyActuals(
    monthlyTransactions as never
  );

  const calculatedPlan = plan
    ? {
        ...plan,
        actual_income: actual.income,
        actual_expenses: actual.expenses,
        actual_savings: actual.savings,
      }
    : null;

  return NextResponse.json({
    plan: calculatedPlan,
    budgets: budgets ?? [],
    transactions: monthlyTransactions,
    actual: {
      income: actual.income,
      expenses: actual.expenses,
      savings: actual.savings,
      byCategory: actual.byCategory,
    },
  });
}

export async function POST(request: Request) {
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

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body della richiesta non valido." },
      { status: 400 }
    );
  }

  const {
    month,
    expected_income,
    savings_goal,
    is_closed,
    planned_fixed_expenses,
    budgets,
  } = body;

  if (
    typeof month !== "string" ||
    !getMonthRange(month)
  ) {
    return NextResponse.json(
      { error: "Mese non valido." },
      { status: 400 }
    );
  }

  if (!isValidAmount(expected_income)) {
    return NextResponse.json(
      { error: "L'entrata prevista non è valida." },
      { status: 400 }
    );
  }

  if (!isValidAmount(savings_goal)) {
    return NextResponse.json(
      { error: "L'obiettivo di risparmio non è valido." },
      { status: 400 }
    );
  }

  if (!isValidAmount(planned_fixed_expenses)) {
    return NextResponse.json(
      { error: "Le spese fisse pianificate non sono valide." },
      { status: 400 }
    );
  }

  if (
    is_closed !== undefined &&
    typeof is_closed !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Stato del mese non valido." },
      { status: 400 }
    );
  }

  if (budgets !== undefined && !Array.isArray(budgets)) {
    return NextResponse.json(
      { error: "Budget non validi." },
      { status: 400 }
    );
  }

  if (Array.isArray(budgets)) {
    for (const budget of budgets) {
      if (
        !budget ||
        typeof budget !== "object" ||
        typeof budget.category !== "string" ||
        !budget.category.trim() ||
        !isValidAmount(budget.planned_amount)
      ) {
        return NextResponse.json(
          { error: "Uno dei budget non è valido." },
          { status: 400 }
        );
      }
    }
  }

  const { data: existing, error: existingError } =
    await supabase
      .from("monthly_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", `${month}-01`)
      .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  const requestedClosed =
    is_closed !== undefined
      ? is_closed
      : Boolean(existing?.is_closed);

  /*
   * Un mese chiuso non può essere modificato.
   *
   * L'unica operazione consentita è la riapertura.
   * Dopo la riapertura il frontend potrà salvare normalmente
   * il piano aggiornato.
   */
  if (existing?.is_closed && requestedClosed === true) {
    return NextResponse.json(
      {
        error:
          "Il mese è chiuso. Riaprilo prima di modificare il piano.",
      },
      { status: 409 }
    );
  }

  if (existing?.is_closed && requestedClosed === false) {
    const { data: reopenedPlan, error: reopenError } =
      await supabase
        .from("monthly_plans")
        .update({
          is_closed: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("user_id", user.id)
        .select()
        .single();

    if (reopenError) {
      return NextResponse.json(
        { error: reopenError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: reopenedPlan,
      reopened: true,
    });
  }

  const { data: plan, error: planError } =
    await supabase
      .from("monthly_plans")
      .upsert(
        {
          user_id: user.id,
          month,
          expected_income: Number(expected_income),
          savings_goal: Number(savings_goal),
          planned_fixed_expenses:
            Number(planned_fixed_expenses),
          is_closed: requestedClosed,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,month",
        }
      )
      .select()
      .single();

  if (planError) {
    return NextResponse.json(
      { error: planError.message },
      { status: 500 }
    );
  }

  if (Array.isArray(budgets)) {
    const categories = budgets.map((budget) =>
      String(budget.category).trim()
    );

    if (categories.length === 0) {
      const { error: deleteAllError } = await supabase
        .from("budgets")
        .delete()
        .eq("user_id", user.id)
        .eq("month", `${month}-01`);

      if (deleteAllError) {
        return NextResponse.json(
          { error: deleteAllError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: deleteOldError } = await supabase
        .from("budgets")
        .delete()
        .eq("user_id", user.id)
        .eq("month", `${month}-01`)
        .not("category", "in", `(${categories.join(",")})`);

      if (deleteOldError) {
        return NextResponse.json(
          { error: deleteOldError.message },
          { status: 500 }
        );
      }

      if (budgets.length > 0) {
        const budgetRows = budgets.map((budget) => ({
          user_id: user.id,
          month,
          category: String(budget.category).trim(),
          planned_amount: Number(budget.planned_amount),
        }));

        const { error: budgetsError } = await supabase
          .from("budgets")
          .upsert(budgetRows, {
            onConflict: "user_id,month,category",
          });

        if (budgetsError) {
          return NextResponse.json(
            { error: budgetsError.message },
            { status: 500 }
          );
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    plan,
  });
}
