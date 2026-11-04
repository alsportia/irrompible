import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export interface FreeExercise {
  id: number;
  name: string;
  name_es: string | null;
  measure_type: "reps" | "time";
  body_part: string | null;
  equipment: string | null;
  is_global: number;
  hidden: number;
  image_url: string | null;
  image_data: string | null;
}

// Ejercicios globales (dataset) + los propios del usuario.
// Por defecto se omiten los ocultos; con ?all=1 se devuelven todos (para el editor).
export async function GET(req: NextRequest) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const all = req.nextUrl.searchParams.get("all") === "1";
  const rows = await DB.query<FreeExercise>(
    `SELECT free_exercises_id as id, name, name_es, measure_type, body_part, equipment,
            is_global, hidden, image_url, image_data
     FROM free_exercises
     WHERE (is_global = 1 OR users_id = ?) AND (? = 1 OR hidden = 0)
     ORDER BY is_global DESC, name COLLATE NOCASE ASC`,
    [uid, all ? 1 : 0]
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
