import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export interface CalendarDay {
  session_date: string;
  exercise_id: number;
  exercise_name: string;
  sets: number;
}

// Meses con entrenamiento de un año (?year=YYYY), para resaltarlos en el selector
export async function GET(req: NextRequest) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const year = req.nextUrl.searchParams.get("year");
  if (year) {
    if (!/^\d{4}$/.test(year)) return NextResponse.json({ error: "Año inválido (YYYY)" }, { status: 400 });
    const months = await DB.query<{ month: string }>(
      `SELECT DISTINCT substr(session_date, 1, 7) AS month
       FROM free_sets WHERE users_id = ? AND substr(session_date, 1, 4) = ?
       ORDER BY month ASC`,
      [uid, year]
    );
    return NextResponse.json(months.map(m => m.month));
  }

  // Días con entrenamiento de un mes (YYYY-MM), con los ejercicios de cada día
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Mes inválido (YYYY-MM)" }, { status: 400 });
  }

  const rows = await DB.query<CalendarDay>(
    `SELECT fs.session_date, fs.free_exercises_id AS exercise_id, x.name AS exercise_name, COUNT(*) AS sets
     FROM free_sets fs
     JOIN free_exercises x ON x.free_exercises_id = fs.free_exercises_id
     WHERE fs.users_id = ? AND substr(fs.session_date, 1, 7) = ?
     GROUP BY fs.session_date, fs.free_exercises_id
     ORDER BY fs.session_date ASC, x.name COLLATE NOCASE ASC`,
    [uid, month]
  );
  return NextResponse.json(rows);
}
