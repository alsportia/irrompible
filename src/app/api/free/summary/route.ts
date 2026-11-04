import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export interface FreeExerciseSummary {
  id: number;
  name: string;
  image_url: string | null;
  is_global: number;
  last_date: string;
  last_time: string | null;
  last_reps: number | null;
  last_weight_kg: number;
  last_duration_seconds: number | null;
  last_one_rm: number | null;
  day_one_rm: number | null;
}

// Ejercicios con al menos una serie del usuario, con su último entrenamiento.
// El 1RM del día es el mejor del último día con series, igual que en la gráfica.
export async function GET(req: NextRequest) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const rows = await DB.query<FreeExerciseSummary>(
    `SELECT x.free_exercises_id AS id, x.name, x.image_url, x.is_global,
            last.session_date AS last_date, last.session_time AS last_time,
            last.reps AS last_reps, last.weight_kg AS last_weight_kg,
            last.duration_seconds AS last_duration_seconds, last.one_rm AS last_one_rm,
            (SELECT MAX(one_rm) FROM free_sets d
              WHERE d.users_id = ? AND d.free_exercises_id = x.free_exercises_id
                AND d.session_date = last.session_date) AS day_one_rm
     FROM free_exercises x
     JOIN free_sets last ON last.free_sets_id = (
       SELECT s.free_sets_id FROM free_sets s
       WHERE s.users_id = ? AND s.free_exercises_id = x.free_exercises_id
       ORDER BY s.session_date DESC, s.session_time DESC, s.free_sets_id DESC
       LIMIT 1
     )
     WHERE x.is_global = 1 OR x.users_id = ?
     ORDER BY last.session_date DESC, last.session_time DESC`,
    [uid, uid, uid]
  );
  return NextResponse.json(rows);
}
