import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json([]);

  const rows = await DB.query<{
    date: string;
    sessions_id: number;
    session_code: string;
    session_name: string;
    program_name: string;
    feeling_label: string | null;
    feeling_score: number | null;
    energy_label: string | null;
    duration: number | null;
  }>(
    `SELECT wl.completed_at as date, wl.sessions_id, wl.duration,
            s.session_code, s.name as session_name,
            p.name as program_name,
            fl.label as feeling_label, fl.score as feeling_score,
            el.label as energy_label
     FROM workout_logs wl
     JOIN sessions s ON wl.sessions_id = s.sessions_id
     JOIN programs p ON s.programs_id = p.programs_id
     LEFT JOIN feeling_levels fl ON wl.feeling_levels_id = fl.feeling_levels_id
     LEFT JOIN energy_levels el ON wl.energy_levels_id = el.energy_levels_id
     WHERE wl.users_id = ? AND wl.completed_at IS NOT NULL
     ORDER BY wl.completed_at DESC`,
    [userId]
  );
  return NextResponse.json(rows);
}
