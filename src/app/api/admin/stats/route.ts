import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  // Totales globales
  const totals = await DB.get<{
    total_workouts: number;
    active_users: number;
    total_duration_s: number;
    avg_duration_s: number;
  }>(`
    SELECT COUNT(*) as total_workouts,
           COUNT(DISTINCT users_id) as active_users,
           COALESCE(SUM(duration), 0) as total_duration_s,
           COALESCE(AVG(duration), 0) as avg_duration_s
    FROM workout_logs
    WHERE completed_at IS NOT NULL
  `);

  // Ranking de usuarios por entrenamientos
  const userRanking = await DB.query<{
    users_id: number;
    name: string;
    email: string;
    total_workouts: number;
    total_duration_s: number;
    last_workout: string | null;
    avg_feeling: number | null;
  }>(`
    SELECT u.users_id, u.name, u.email,
           COUNT(wl.workout_logs_id) as total_workouts,
           COALESCE(SUM(wl.duration), 0) as total_duration_s,
           MAX(wl.completed_at) as last_workout,
           AVG(fl.score) as avg_feeling
    FROM users u
    LEFT JOIN workout_logs wl ON wl.users_id = u.users_id AND wl.completed_at IS NOT NULL
    LEFT JOIN feeling_levels fl ON wl.feeling_levels_id = fl.feeling_levels_id
    WHERE u.status = 'active'
    GROUP BY u.users_id
    ORDER BY total_workouts DESC
  `);

  // Programas más usados
  const topPrograms = await DB.query<{ program_name: string; count: number }>(`
    SELECT p.name as program_name, COUNT(*) as count
    FROM workout_logs wl
    JOIN sessions s ON wl.sessions_id = s.sessions_id
    JOIN programs p ON s.programs_id = p.programs_id
    WHERE wl.completed_at IS NOT NULL
    GROUP BY p.programs_id
    ORDER BY count DESC
  `);

  // Actividad por semana (últimas 12 semanas)
  const weeklyActivity = await DB.query<{ week: string; count: number }>(`
    SELECT strftime('%Y-W%W', completed_at) as week, COUNT(*) as count
    FROM workout_logs
    WHERE completed_at IS NOT NULL
      AND completed_at >= date('now', '-84 days')
    GROUP BY week
    ORDER BY week ASC
  `);

  return NextResponse.json({ totals, userRanking, topPrograms, weeklyActivity });
}
