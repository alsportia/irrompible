import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export interface FreeProgressRow {
  session_date: string;
  best_one_rm: number | null;
  max_weight: number;
  sets: number;
  total_reps: number | null;
}

// Progreso de un ejercicio del usuario: una fila por día
export async function GET(req: NextRequest) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const exerciseId = parseInt(req.nextUrl.searchParams.get("exerciseId") ?? "");
  if (!exerciseId) return NextResponse.json({ error: "Ejercicio obligatorio" }, { status: 400 });

  const rows = await DB.query<FreeProgressRow>(
    `SELECT session_date,
            MAX(one_rm) as best_one_rm,
            MAX(weight_kg) as max_weight,
            COUNT(*) as sets,
            SUM(reps) as total_reps
     FROM free_sets
     WHERE users_id = ? AND free_exercises_id = ?
     GROUP BY session_date
     ORDER BY session_date ASC`,
    [uid, exerciseId]
  );
  return NextResponse.json(rows);
}
