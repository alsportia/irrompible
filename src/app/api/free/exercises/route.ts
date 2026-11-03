import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export interface FreeExercise {
  id: number;
  name: string;
  measure_type: "reps" | "time";
  body_part: string | null;
  is_global: number;
}

// Ejercicios globales (dataset) + los propios del usuario
export async function GET(req: NextRequest) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const rows = await DB.query<FreeExercise>(
    `SELECT free_exercises_id as id, name, measure_type, body_part, is_global
     FROM free_exercises
     WHERE is_global = 1 OR users_id = ?
     ORDER BY is_global DESC, name COLLATE NOCASE ASC`,
    [uid]
  );
  return NextResponse.json(rows);
}

// Crea un ejercicio propio del usuario
export async function POST(req: NextRequest) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  // Siempre se pueden registrar repeticiones y tiempo, así que el tipo de medida no se elige
  const result = await DB.run(
    `INSERT INTO free_exercises (name, measure_type, is_global, users_id) VALUES (?, 'reps', 0, ?)`,
    [name, uid]
  );
  return NextResponse.json({ id: result.id, name }, { status: 201 });
}
