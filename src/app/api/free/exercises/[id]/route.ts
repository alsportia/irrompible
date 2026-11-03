import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Borra un ejercicio propio del usuario y sus series. Los ejercicios globales no se pueden borrar.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const exerciseId = parseInt(id);
  if (!exerciseId) return NextResponse.json({ error: "Ejercicio inválido" }, { status: 400 });

  const ex = await DB.get<{ is_global: number; users_id: number | null }>(
    `SELECT is_global, users_id FROM free_exercises WHERE free_exercises_id = ?`,
    [exerciseId]
  );
  if (!ex) return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
  if (ex.is_global || ex.users_id !== uid) {
    return NextResponse.json({ error: "Solo puedes borrar tus propios ejercicios" }, { status: 403 });
  }

  // Primero las series (la FK no tiene ON DELETE CASCADE hacia el ejercicio)
  await DB.run(`DELETE FROM free_sets WHERE users_id = ? AND free_exercises_id = ?`, [uid, exerciseId]);
  await DB.run(`DELETE FROM free_exercises WHERE free_exercises_id = ? AND users_id = ?`, [exerciseId, uid]);
  return NextResponse.json({ ok: true });
}
