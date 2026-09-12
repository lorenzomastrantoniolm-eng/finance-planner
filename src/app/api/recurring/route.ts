import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

function isValidAmount(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) && amount > 0;
}

function isValidDay(value: unknown) {
  const day = Number(value);

  return (
    Number.isInteger(day) &&
    day >= 1 &&
    day <= 31
  );
}

function isValidType(value: unknown) {
  return value === "income" || value === "expense";
}

function isValidText(value: unknown) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

export async function GET() {
  const { supabase, user } = await getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("day", { ascending: true });

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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON non valido" },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null
  ) {
    return NextResponse.json(
      { error: "Dati non validi" },
      { status: 400 }
    );
  }

  const {
    name,
    amount,
    type,
    day,
    category,
  } = body as Record<string, unknown>;

  if (
    !isValidText(name) ||
    !isValidAmount(amount) ||
    !isValidType(type) ||
    !isValidDay(day) ||
    !isValidText(category)
  ) {
    return NextResponse.json(
      { error: "Dati non validi" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("recurring_transactions")
    .insert({
      user_id: user.id,
      name: String(name).trim(),
      amount: Number(amount),
      type,
      day: Number(day),
      category: String(category).trim(),
      active: true,
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
    success: true,
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON non valido" },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null
  ) {
    return NextResponse.json(
      { error: "Dati non validi" },
      { status: 400 }
    );
  }

  const {
    id,
    name,
    amount,
    type,
    day,
    category,
    active,
  } = body as Record<string, unknown>;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    return NextResponse.json(
      { error: "ID mancante" },
      { status: 400 }
    );
  }

  /*
   * Verifica preventiva dell'esistenza e proprietà
   * del ricorrente.
   */

  const { data: existing, error: existingError } =
    await supabase
      .from("recurring_transactions")
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

  if (!existing) {
    return NextResponse.json(
      { error: "Ricorrente non trovato" },
      { status: 404 }
    );
  }

  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    if (!isValidText(name)) {
      return NextResponse.json(
        { error: "Nome non valido" },
        { status: 400 }
      );
    }

    updates.name = String(name).trim();
  }

  if (amount !== undefined) {
    if (!isValidAmount(amount)) {
      return NextResponse.json(
        { error: "Importo non valido" },
        { status: 400 }
      );
    }

    updates.amount = Number(amount);
  }

  if (type !== undefined) {
    if (!isValidType(type)) {
      return NextResponse.json(
        { error: "Tipo non valido" },
        { status: 400 }
      );
    }

    updates.type = type;
  }

  if (day !== undefined) {
    if (!isValidDay(day)) {
      return NextResponse.json(
        { error: "Giorno non valido" },
        { status: 400 }
      );
    }

    updates.day = Number(day);
  }

  if (category !== undefined) {
    if (!isValidText(category)) {
      return NextResponse.json(
        { error: "Categoria non valida" },
        { status: 400 }
      );
    }

    updates.category = String(category).trim();
  }

  if (active !== undefined) {
    const parsedActive = parseBoolean(active);

    if (parsedActive === null) {
      return NextResponse.json(
        { error: "Valore active non valido" },
        { status: 400 }
      );
    }

    updates.active = parsedActive;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Nessun campo da modificare" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("recurring_transactions")
    .update(updates)
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
    success: true,
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
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID mancante" },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } =
    await supabase
      .from("recurring_transactions")
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

  if (!existing) {
    return NextResponse.json(
      { error: "Ricorrente non trovato" },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("recurring_transactions")
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
