import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const uid = parseInt(userId);
  if (!uid) return NextResponse.json({ error: "userId inválido" }, { status: 400 });

  // Resumen general
  const summary = await DB.get<{
    total_workouts: number;
    total_duration_s: number;
    avg_duration_s: number;
    first_workout: string | null;
    last_workout: string | null;
    avg_feeling: number | null;
  }>(`
    SELECT
      COUNT(*) as total_workouts,
      COALESCE(SUM(duration), 0) as total_duration_s,
      COALESCE(AVG(duration), 0) as avg_duration_s,
      MIN(completed_at) as first_workout,
      MAX(completed_at) as last_workout,
      AVG(fl.score) as avg_feeling
    FROM workout_logs wl
    LEFT JOIN feeling_levels fl ON wl.feeling_levels_id = fl.feeling_levels_id
    WHERE wl.users_id = ? AND wl.completed_at IS NOT NULL
  `, [uid]);

  // Entrenamientos por programa
  const byProgram = await DB.query<{
    program_name: string;
    count: number;
    total_duration_s: number;
  }>(`
    SELECT p.name as program_name, COUNT(*) as count,
           COALESCE(SUM(wl.duration), 0) as total_duration_s
    FROM workout_logs wl
    JOIN sessions s ON wl.sessions_id = s.sessions_id
    JOIN programs p ON s.programs_id = p.programs_id
    WHERE wl.users_id = ? AND wl.completed_at IS NOT NULL
    GROUP BY p.programs_id
    ORDER BY count DESC
  `, [uid]);

  // Músculos trabajados (frecuencia)
  const muscleRows = await DB.query<{ muscles: string | null }>(`
    SELECT DISTINCT e.muscles
    FROM workout_sets ws
    JOIN workout_logs wl ON ws.workout_logs_id = wl.workout_logs_id
    JOIN exercises e ON ws.exercises_id = e.exercises_id
    WHERE wl.users_id = ? AND wl.completed_at IS NOT NULL AND e.muscles IS NOT NULL
  `, [uid]);

  const muscleCount: Record<string, number> = {};
  for (const row of muscleRows) {
    if (!row.muscles) continue;
    try {
      const arr: string[] = JSON.parse(row.muscles);
      for (const m of arr) {
        const key = m.trim().toLowerCase();
        muscleCount[key] = (muscleCount[key] ?? 0) + 1;
      }
    } catch {}
  }
  const muscles = Object.entries(muscleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

  // Peso máximo por ejercicio (top 15 con más peso)
  const maxWeights = await DB.query<{
    exercise_name: string;
    max_weight: number;
    last_date: string;
  }>(`
    SELECT e.name as exercise_name,
           MAX(ws.weight) as max_weight,
           MAX(wl.completed_at) as last_date
    FROM workout_sets ws
    JOIN workout_logs wl ON ws.workout_logs_id = wl.workout_logs_id
    JOIN exercises e ON ws.exercises_id = e.exercises_id
    WHERE wl.users_id = ? AND ws.weight > 0 AND wl.completed_at IS NOT NULL
    GROUP BY ws.exercises_id
    ORDER BY max_weight DESC
    LIMIT 15
  `, [uid]);

  // Historial de entrenamientos (últimos 30)
  const history = await DB.query<{
    workout_logs_id: number;
    completed_at: string;
    duration: number | null;
    session_name: string;
    session_code: string;
    program_name: string;
    feeling_label: string | null;
    feeling_score: number | null;
    energy_label: string | null;
    sets_done: number;
  }>(`
    SELECT wl.workout_logs_id, wl.completed_at, wl.duration,
           s.name as session_name, s.session_code,
           p.name as program_name,
           fl.label as feeling_label, fl.score as feeling_score,
           el.label as energy_label,
           COUNT(ws.workout_sets_id) as sets_done
    FROM workout_logs wl
    JOIN sessions s ON wl.sessions_id = s.sessions_id
    JOIN programs p ON s.programs_id = p.programs_id
    LEFT JOIN feeling_levels fl ON wl.feeling_levels_id = fl.feeling_levels_id
    LEFT JOIN energy_levels el ON wl.energy_levels_id = el.energy_levels_id
    LEFT JOIN workout_sets ws ON ws.workout_logs_id = wl.workout_logs_id
    WHERE wl.users_id = ? AND wl.completed_at IS NOT NULL
    GROUP BY wl.workout_logs_id
    ORDER BY wl.completed_at DESC
    LIMIT 30
  `, [uid]);

  // Racha actual (días consecutivos con entrenamiento)
  const allDates = await DB.query<{ day: string }>(`
    SELECT DISTINCT date(completed_at) as day
    FROM workout_logs
    WHERE users_id = ? AND completed_at IS NOT NULL
    ORDER BY day DESC
  `, [uid]);

  let streak = 0;
  if (allDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let cursor = new Date(today);
    for (const { day } of allDates) {
      const d = new Date(day + 'T00:00:00');
      const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
      if (diff === 0 || diff === 1) { streak++; cursor = d; }
      else break;
    }
  }

  // Entrenamientos por día de la semana
  const byWeekday = await DB.query<{ weekday: number; count: number }>(`
    SELECT CAST(strftime('%w', completed_at) AS INTEGER) as weekday, COUNT(*) as count
    FROM workout_logs
    WHERE users_id = ? AND completed_at IS NOT NULL
    GROUP BY weekday
  `, [uid]);

  return NextResponse.json({
    summary,
    byProgram,
    muscles,
    maxWeights,
    history,
    streak,
    byWeekday,
  });
}
