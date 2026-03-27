import { NextRequest, NextResponse } from "next/server";
import { DB } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// PATCH /api/admin/exercises/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { name, video_url, video_url_yt, description, muscles, joints, easier_id, harder_id } = body;

  if (!name?.trim()) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  await DB.run(
    `UPDATE exercises SET name=?, video_url=?, video_url_yt=?, description=?, muscles=?, joints=?, easier_exercises_id=?, harder_exercises_id=?
     WHERE exercises_id=?`,
    [name.trim(), video_url || null, video_url_yt || null, description || null,
     muscles || null, joints || null, easier_id || null, harder_id || null, id]
  );

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/exercises/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // Check if used in any session
  const [usage] = await DB.query<{ count: number }>(
    "SELECT COUNT(*) as count FROM set_exercises WHERE exercises_id = ?", [id]
  );
  if (usage.count > 0) {
    return NextResponse.json(
      { error: `Este ejercicio está en uso en ${usage.count} sets de sesiones y no se puede eliminar` },
      { status: 409 }
    );
  }

  await DB.run("DELETE FROM exercises WHERE exercises_id = ?", [id]);
  return NextResponse.json({ ok: true });
}
