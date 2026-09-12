import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LOCAL_USER_ID } from "@/lib/finance/constants";

async function getUser() {
  const supabase = await createClient();

  const user = { id: LOCAL_USER_ID };

  return { supabase, user };
}

function isValidDate(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
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
    .from("financial_goals")
    .select("*")
    .eq("user_id", LOCAL_USER_ID)
    .order("target_date", {
      ascending: true,
      nullsFirst: false,
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    goals: data ?? [],
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
      { error: "JSON non valido." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null
  ) {
    return NextResponse.json(
      { error: "Dati non validi." },
      { status: 400 }
    );
  }

  const {
    name,
    target_amount,
    current_amount,
    target_date,
  } = body as Record<string, unknown>;

  const goalName =
    typeof name === "string"
      ? name.trim()
      : "";

  const target = Number(target_amount);
  const current = Number(current_amount ?? 0);

  if (
    !goalName ||
    !Number.isFinite(target) ||
    target <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "Inserisci un nome e un importo obiettivo valido.",
      },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(current) ||
    current < 0
  ) {
    return NextResponse.json(
      {
        error:
          "L'importo già accumulato non è valido.",
      },
      { status: 400 }
    );
  }

  if (current > target) {
    return NextResponse.json(
      {
        error:
          "L'importo già accumulato non può superare l'obiettivo.",
      },
      { status: 400 }
    );
  }

  if (
    target_date !== undefined &&
    target_date !== null &&
    target_date !== ""
  ) {
    if (!isValidDate(target_date)) {
      return NextResponse.json(
        {
          error:
            "La data obiettivo non è valida.",
        },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("financial_goals")
    .insert({
      user_id: LOCAL_USER_ID,
      name: goalName,
      target_amount: target,
      current_amount: current,
      target_date:
        target_date === ""
          ? null
          : target_date ?? null,
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
    goal: data,
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
      { error: "JSON non valido." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null
  ) {
    return NextResponse.json(
      { error: "Dati non validi." },
      { status: 400 }
    );
  }

  const {
    id,
    name,
    target_amount,
    current_amount,
    target_date,
  } = body as Record<string, unknown>;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    return NextResponse.json(
      { error: "ID mancante." },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } =
    await supabase
      .from("financial_goals")
      .select("target_amount, current_amount")
      .eq("id", id)
      .eq("user_id", LOCAL_USER_ID)
      .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Obiettivo non trovato." },
      { status: 404 }
    );
  }

  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Il nome dell'obiettivo è obbligatorio.",
        },
        { status: 400 }
      );
    }

    updates.name = name.trim();
  }

  if (target_amount !== undefined) {
    const target = Number(target_amount);

    if (
      !Number.isFinite(target) ||
      target <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "L'importo obiettivo non è valido.",
        },
        { status: 400 }
      );
    }

    updates.target_amount = target;
  }

  if (current_amount !== undefined) {
    const current = Number(current_amount);

    if (
      !Number.isFinite(current) ||
      current < 0
    ) {
      return NextResponse.json(
        {
          error:
            "L'importo accumulato non è valido.",
        },
        { status: 400 }
      );
    }

    updates.current_amount = current;
  }

  if (target_date !== undefined) {
    if (
      target_date !== null &&
      target_date !== "" &&
      !isValidDate(target_date)
    ) {
      return NextResponse.json(
        {
          error:
            "La data obiettivo non è valida.",
        },
        { status: 400 }
      );
    }

    updates.target_date =
      target_date === ""
        ? null
        : target_date;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      {
        error:
          "Nessun campo da modificare.",
      },
      { status: 400 }
    );
  }

  const finalTarget =
    updates.target_amount !== undefined
      ? Number(updates.target_amount)
      : Number(existing.target_amount);

  const finalCurrent =
    updates.current_amount !== undefined
      ? Number(updates.current_amount)
      : Number(existing.current_amount);

  if (finalCurrent > finalTarget) {
    return NextResponse.json(
      {
        error:
          "L'importo accumulato non può superare l'obiettivo.",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("financial_goals")
    .update(updates)
    .eq("id", id)
    .eq("user_id", LOCAL_USER_ID)
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
    goal: data,
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
      { error: "ID mancante." },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } =
    await supabase
      .from("financial_goals")
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

  if (!existing) {
    return NextResponse.json(
      { error: "Obiettivo non trovato." },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("financial_goals")
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
