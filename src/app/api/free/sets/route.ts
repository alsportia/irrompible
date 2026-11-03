import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export interface FreeSet {
  id: number;
  free_exercises_id: number;
  exercise_name: string;
  session_date: string;
  session_time: string | null;
  set_number: number;
  weight_kg: number;
  reps: number | null;
  duration_seconds: number | null;
  one_rm: number | null;
  notes: string | null;
}


// Últimas series del usuario, opcionalmente de un solo ejercicio
export async function GET(req: NextRequest) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const exerciseId = parseInt(req.nextUrl.searchParams.get("exerciseId") ?? "");
  const rows = await DB.query<FreeSet>(
    `SELECT fs.free_sets_id as id, fs.free_exercises_id, ex.name as exercise_name,
            fs.session_date, fs.session_time, fs.set_number, fs.weight_kg, fs.reps,
            fs.duration_seconds, fs.one_rm, fs.notes
     FROM free_sets fs
     JOIN free_exercises ex ON ex.free_exercises_id = fs.free_exercises_id
     WHERE fs.users_id = ? AND (? IS NULL OR fs.free_exercises_id = ?)
     ORDER BY fs.session_date DESC, fs.session_time DESC, fs.free_sets_id DESC`,
    [uid, exerciseId || null, exerciseId || null]
  );
  return NextResponse.json(rows);
}

// Registra una serie
export async function POST(req: NextRequest) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const exerciseId = parseInt(b?.exerciseId);
  if (!exerciseId) return NextResponse.json({ error: "Ejercicio obligatorio" }, { status: 400 });

  // El ejercicio tiene que ser global o del propio usuario
  const ex = await DB.get<{ measure_type: string }>(
    `SELECT measure_type FROM free_exercises WHERE free_exercises_id = ? AND (is_global = 1 OR users_id = ?)`,
    [exerciseId, uid]
  );
  if (!ex) return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });

  const weight = Number(b?.weightKg) || 0;
  const reps = b?.reps != null && b.reps !== "" ? parseInt(b.reps) : null;
  const duration = b?.durationSeconds != null && b.durationSeconds !== "" ? parseInt(b.durationSeconds) : null;
  const notes = typeof b?.notes === "string" && b.notes.trim() ? b.notes.trim() : null;
  // Fecha y hora vienen del formulario (por defecto, la actual del usuario)
  const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(b?.sessionDate ?? "")
    ? b.sessionDate
    : new Date().toISOString().slice(0, 10);
  const sessionTime = /^\d{2}:\d{2}$/.test(b?.sessionTime ?? "")
    ? b.sessionTime
    : new Date().toTimeString().slice(0, 5);

  // Epley: 1RM estimado solo si hay peso y repeticiones
  const oneRm = weight > 0 && reps && reps > 0 ? Math.round(weight * (1 + reps / 30) * 10) / 10 : null;

  const countRow = await DB.get<{ n: number }>(
    `SELECT COUNT(*) as n FROM free_sets WHERE users_id = ? AND free_exercises_id = ? AND session_date = ?`,
    [uid, exerciseId, sessionDate]
  );
  const setNumber = Number(countRow?.n ?? 0) + 1;

  const result = await DB.run(
    `INSERT INTO free_sets (users_id, free_exercises_id, session_date, session_time, set_number, weight_kg, reps, duration_seconds, one_rm, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uid, exerciseId, sessionDate, sessionTime, setNumber, weight, reps, duration, oneRm, notes]
  );
  return NextResponse.json({ id: result.id, set_number: setNumber, one_rm: oneRm }, { status: 201 });
}
