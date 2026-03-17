import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json([]);

  const rows = await DB.query<{ date: string; session_id: string; feeling_label: string | null; feeling_score: number | null }>(
    `SELECT completed_at as date, session_id, feeling_label, feeling_score
     FROM workout_logs
     WHERE user_id = ? AND completed_at IS NOT NULL
     ORDER BY completed_at DESC`,
    [userId]
  );
  return NextResponse.json(rows);
}
