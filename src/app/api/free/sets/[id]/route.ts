import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Solo se pueden modificar o borrar las series del propio usuario
async function ownSet(id: number, uid: number) {
  return DB.get<{ free_sets_id: number; free_exercises_id: number }>(
    `SELECT free_sets_id, free_exercises_id FROM free_sets WHERE free_sets_id = ? AND users_id = ?`,
    [id, uid]
  );
}

function parseSetBody(b: Record<string, unknown> | null) {
  const weight = Number(b?.weightKg) || 0;
  const reps = b?.reps != null && b.reps !== "" ? parseInt(String(b.reps)) : null;
  const duration = b?.durationSeconds != null && b.durationSeconds !== "" ? parseInt(String(b.durationSeconds)) : null;
  const notes = typeof b?.notes === "string" && b.notes.trim() ? b.notes.trim() : null;
  const sessionDate = /^\d{4}-\d{2}-\d{2}$/.test(String(b?.sessionDate ?? "")) ? String(b?.sessionDate) : null;
  const sessionTime = /^\d{2}:\d{2}$/.test(String(b?.sessionTime ?? "")) ? String(b?.sessionTime) : null;
  // Epley: 1RM estimado solo si hay peso y repeticiones
  const oneRm = weight > 0 && reps && reps > 0 ? Math.round(weight * (1 + reps / 30) * 10) / 10 : null;
  return { weight, reps, duration, notes, sessionDate, sessionTime, oneRm };
}

// Modifica una serie propia
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const setId = parseInt((await params).id);
  if (!setId || !(await ownSet(setId, uid))) {
    return NextResponse.json({ error: "Serie no encontrada" }, { status: 404 });
  }

  const b = await req.json().catch(() => null);
  const v = parseSetBody(b);
  if (!v.sessionDate || !v.sessionTime) {
    return NextResponse.json({ error: "Fecha y hora obligatorias" }, { status: 400 });
  }

  await DB.run(
    `UPDATE free_sets
     SET session_date = ?, session_time = ?, weight_kg = ?, reps = ?, duration_seconds = ?, one_rm = ?, notes = ?
     WHERE free_sets_id = ? AND users_id = ?`,
    [v.sessionDate, v.sessionTime, v.weight, v.reps, v.duration, v.oneRm, v.notes, setId, uid]
  );
  return NextResponse.json({ ok: true, one_rm: v.oneRm });
}

// Borra una serie propia
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const setId = parseInt((await params).id);
  if (!setId || !(await ownSet(setId, uid))) {
    return NextResponse.json({ error: "Serie no encontrada" }, { status: 404 });
  }

  await DB.run(`DELETE FROM free_sets WHERE free_sets_id = ? AND users_id = ?`, [setId, uid]);
  return NextResponse.json({ ok: true });
}
