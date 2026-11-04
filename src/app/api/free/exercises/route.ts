import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { langFromRequest, textsFor } from "@/lib/i18n/texts";

export interface FreeExercise {
  id: number;
  name: string;
  measure_type: "reps" | "time";
  body_part: string | null;
  equipment: string | null;
  is_global: number;
  hidden: number;
  image_url: string | null;
  image_data: string | null;
}

// Ejercicios globales (dataset) + los propios del usuario.
// El nombre llega ya en el idioma pedido. Por defecto se omiten los ocultos; con ?all=1 se devuelven todos (editor).
export async function GET(req: NextRequest) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const all = req.nextUrl.searchParams.get("all") === "1";
  const lang = langFromRequest(req);
  const rows = await DB.query<FreeExercise>(
    `SELECT free_exercises_id as id, name, measure_type, body_part, equipment,
            is_global, hidden, image_url, image_data
     FROM free_exercises
     WHERE (is_global = 1 OR users_id = ?) AND (? = 1 OR hidden = 0)
     ORDER BY is_global DESC, name COLLATE NOCASE ASC`,
    [uid, all ? 1 : 0]
  );

  // Propios sin traducción conservan su nombre; globales usan la tabla
  const ids = rows.map(r => r.id);
  const names = await textsFor("exercise", ids, "name", lang);
  // El editor necesita los dos idiomas por separado para poder corregirlos
  const esNames = all ? await textsFor("exercise", ids, "name", "es") : null;
  const enNames = all ? await textsFor("exercise", ids, "name", "en") : null;
  return NextResponse.json(rows.map(r => ({
    ...r,
    name: r.is_global ? (names.get(r.id) ?? r.name) : r.name,
    ...(all ? { name_es: esNames?.get(r.id) ?? null, name_en: enNames?.get(r.id) ?? null } : {}),
  })));
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
