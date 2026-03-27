import { NextRequest, NextResponse } from "next/server";
import { DB } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/exercises?search=&page=&limit=
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(2000, parseInt(searchParams.get("limit") ?? "50"));
  const offset = (page - 1) * limit;

  const where = search ? "WHERE e.name LIKE ?" : "";
  const params = search ? [`%${search}%`, limit, offset] : [limit, offset];

  const exercises = await DB.query(
    `SELECT e.exercises_id as id, e.name, e.video_url, e.video_url_yt, e.description, e.muscles, e.joints,
            e.easier_exercises_id as easier_id, easy.name as easier_name,
            e.harder_exercises_id as harder_id, hard.name as harder_name
     FROM exercises e
     LEFT JOIN exercises easy ON e.easier_exercises_id = easy.exercises_id
     LEFT JOIN exercises hard ON e.harder_exercises_id = hard.exercises_id
     ${where}
     ORDER BY e.name COLLATE NOCASE
     LIMIT ? OFFSET ?`,
    params
  );

  const [{ total }] = await DB.query<{ total: number }>(
    `SELECT COUNT(*) as total FROM exercises ${where}`,
    search ? [`%${search}%`] : []
  );

  return NextResponse.json({ exercises, total, page, limit });
}

// POST /api/admin/exercises
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name, video_url, video_url_yt, description, muscles, joints, easier_id, harder_id } = body;

  if (!name?.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const result = await DB.run(
    `INSERT INTO exercises (name, video_url, video_url_yt, description, muscles, joints, easier_exercises_id, harder_exercises_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name.trim(), video_url || null, video_url_yt || null, description || null,
     muscles || null, joints || null, easier_id || null, harder_id || null]
  );

  return NextResponse.json({ id: result.id }, { status: 201 });
}
