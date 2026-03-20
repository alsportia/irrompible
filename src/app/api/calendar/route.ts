import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json([]);

  const rows = await DB.query<{
    date: string;
    session_id: number;
    session_code: string;
    session_name: string;
    feeling_label: string | null;
    feeling_score: number | null;
  }>(
    `SELECT wl.completed_at as date, wl.session_id,
            s.session_code, s.name as session_name,
            fl.label as feeling_label, fl.score as feeling_score
     FROM workout_logs wl
     JOIN sessions s ON wl.session_id = s.id
     LEFT JOIN feeling_levels fl ON wl.feeling_level_id = fl.id
     WHERE wl.user_id = ? AND wl.completed_at IS NOT NULL
     ORDER BY wl.completed_at DESC`,
    [userId]
  );
  return NextResponse.json(rows);
}
