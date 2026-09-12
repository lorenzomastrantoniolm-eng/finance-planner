import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LOCAL_USER_ID } from "@/lib/finance/constants";

async function getUser() {
  const supabase = await createClient();

  const user = { id: LOCAL_USER_ID };

  return { supabase, user };
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidType(value: string): value is "income" | "expense" {
  return value === "income" || value === "expense";
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

function parseAmount(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  return Number(String(value ?? "").replace(",", "."));
}

function parseTransactionData(body: Record<string, unknown>) {
  const accountId = String(body.account_id ?? "").trim();
  const description = String(body.description ?? "").trim();
  const type = String(body.type ?? "").trim();
  const category = String(body.category ?? "").trim();
  const date = String(body.date ?? "").trim();
  const amount = parseAmount(body.amount);

  return {
    accountId,
    description,
    type,
    category,
    date,
    amount,
    notes:
      body.notes === null || body.notes === undefined
        ? null
        : String(body.notes).trim() || null,
  };
}

function validateTransactionData(data: {
  accountId: string;
  description: string;
  type: string;
  category: string;
  date: string;
  amount: number;
}) {
  if (!data.accountId) {
    return "Il conto è obbligatorio";
  }

  if (!data.description) {
    return "La descrizione è obbligatoria";
  }

  if (!isValidType(data.type)) {
    return "Tipo di movimento non valido";
  }

  if (!data.category) {
    return "La categoria è obbligatoria";
  }

  if (!isValidDate(data.date)) {
    return "La data non è valida";
  }

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    return "L'importo deve essere maggiore di zero";
  }

  return null;
}

export async function GET(request: Request) {
  const { supabase, user } = await getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type");
  const accountId = searchParams.get("account_id");
  const category = searchParams.get("category");

  let query = supabase
    .from("transactions")
    .select(`
      *,
      accounts (
        id,
        name,
        type
      )
    `)
    .eq("user_id", LOCAL_USER_ID)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (type === "income" || type === "expense") {
    query = query.eq("type", type);
  }

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    transactions: data ?? [],
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

  const transaction = parseTransactionData(body);
  const validationError = validateTransactionData(transaction);

  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 }
    );
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", transaction.accountId)
    .eq("user_id", LOCAL_USER_ID)
    .maybeSingle();

  if (accountError) {
    return NextResponse.json(
      { error: accountError.message },
      { status: 500 }
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Conto non trovato" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: LOCAL_USER_ID,
      account_id: transaction.accountId,
      description: transaction.description,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      amount: transaction.amount,
      notes: transaction.notes,
    })
    .select(`
      *,
      accounts (
        id,
        name,
        type
      )
    `)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    transaction: data,
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

  if (!id) {
    return NextResponse.json(
      { error: "ID mancante" },
      { status: 400 }
    );
  }

  const transaction = parseTransactionData(body);
  const validationError = validateTransactionData(transaction);

  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 }
    );
  }

  const { data: existingTransaction, error: existingError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", LOCAL_USER_ID)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  if (!existingTransaction) {
    return NextResponse.json(
      { error: "Movimento non trovato" },
      { status: 404 }
    );
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", transaction.accountId)
    .eq("user_id", LOCAL_USER_ID)
    .maybeSingle();

  if (accountError) {
    return NextResponse.json(
      { error: accountError.message },
      { status: 500 }
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Conto non trovato" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({
      account_id: transaction.accountId,
      description: transaction.description,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      amount: transaction.amount,
      notes: transaction.notes,
    })
    .eq("id", id)
    .eq("user_id", LOCAL_USER_ID)
    .select(`
      *,
      accounts (
        id,
        name,
        type
      )
    `)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    transaction: data,
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

  const { data: existingTransaction, error: existingError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", LOCAL_USER_ID)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  if (!existingTransaction) {
    return NextResponse.json(
      { error: "Movimento non trovato" },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", LOCAL_USER_ID);

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
