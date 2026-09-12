import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ACCOUNT_TYPES = [
  "conto_corrente",
  "carta",
  "contanti",
  "risparmio",
  "altro",
] as const;

type AccountType = (typeof ACCOUNT_TYPES)[number];

async function getUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

function parseAmount(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  return Number(String(value ?? "0").replace(",", "."));
}

function isValidType(value: string): value is AccountType {
  return ACCOUNT_TYPES.includes(value as AccountType);
}

async function parseBody(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET() {
  const { supabase, user } = await getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401 }
    );
  }

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const accountIds = (accounts ?? []).map((account) => account.id);

  let transactions: {
    account_id: string;
    amount: number;
    type: "income" | "expense";
  }[] = [];

  if (accountIds.length > 0) {
    const { data, error: transactionsError } = await supabase
      .from("transactions")
      .select("account_id, amount, type")
      .eq("user_id", user.id)
      .in("account_id", accountIds);

    if (transactionsError) {
      return NextResponse.json(
        { error: transactionsError.message },
        { status: 500 }
      );
    }

    transactions = data ?? [];
  }

  const enrichedAccounts = (accounts ?? []).map((account) => {
    const initialBalance = Number(
      account.initial_balance ?? account.balance ?? 0
    );

    const accountTransactions = transactions.filter(
      (transaction) => transaction.account_id === account.id
    );

    const income = accountTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const expenses = accountTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const currentBalance = initialBalance + income - expenses;

    return {
      ...account,
      initial_balance: initialBalance,
      income,
      expenses,
      balance: currentBalance,
    };
  });

  return NextResponse.json({
    accounts: enrichedAccounts,
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401 }
    );
  }

  const body = await parseBody(request);

  if (!body) {
    return NextResponse.json(
      { error: "JSON non valido" },
      { status: 400 }
    );
  }

  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "").trim();
  const initialBalance = parseAmount(
    body.initial_balance ?? body.balance ?? 0
  );

  if (!name) {
    return NextResponse.json(
      { error: "Il nome è obbligatorio" },
      { status: 400 }
    );
  }

  if (!isValidType(type)) {
    return NextResponse.json(
      { error: "Tipo di conto non valido" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(initialBalance)) {
    return NextResponse.json(
      { error: "Saldo non valido" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name,
      type,
      initial_balance: initialBalance,
      balance: initialBalance,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    account: data,
  });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401 }
    );
  }

  const body = await parseBody(request);

  if (!body) {
    return NextResponse.json(
      { error: "JSON non valido" },
      { status: 400 }
    );
  }

  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "").trim();
  const initialBalance = parseAmount(
    body.initial_balance ?? body.balance ?? 0
  );

  if (!id) {
    return NextResponse.json(
      { error: "ID mancante" },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json(
      { error: "Il nome è obbligatorio" },
      { status: 400 }
    );
  }

  if (!isValidType(type)) {
    return NextResponse.json(
      { error: "Tipo di conto non valido" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(initialBalance)) {
    return NextResponse.json(
      { error: "Saldo non valido" },
      { status: 400 }
    );
  }

  const { data: existingAccount, error: existingError } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  if (!existingAccount) {
    return NextResponse.json(
      { error: "Conto non trovato" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("accounts")
    .update({
      name,
      type,
      initial_balance: initialBalance,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    account: data,
  });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "ID mancante" },
      { status: 400 }
    );
  }

  const { data: existingAccount, error: existingError } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  if (!existingAccount) {
    return NextResponse.json(
      { error: "Conto non trovato" },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}
