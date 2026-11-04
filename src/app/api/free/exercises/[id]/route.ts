import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

async function loadExercise(id: number) {
  return DB.get<{ is_global: number; users_id: number | null }>(
    `SELECT is_global, users_id FROM free_exercises WHERE free_exercises_id = ?`,
    [id]
  );
}

// Oculta o muestra un ejercicio (globales y propios). Ocultar no borra nada.
// Para propios también se pueden cambiar zona, equipo e imagen.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const exerciseId = parseInt((await params).id);
  if (!exerciseId) return NextResponse.json({ error: "Ejercicio inválido" }, { status: 400 });

  const ex = await loadExercise(exerciseId);
  if (!ex) return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
  if (!ex.is_global && ex.users_id !== uid) {
    return NextResponse.json({ error: "Solo puedes editar tus propios ejercicios" }, { status: 403 });
  }

  const b = await req.json().catch(() => null);
  if (typeof b?.hidden === "boolean") {
    await DB.run(`UPDATE free_exercises SET hidden = ? WHERE free_exercises_id = ?`, [b.hidden ? 1 : 0, exerciseId]);
  }

  // Datos de ejercicio propio: solo si el ejercicio no es global
  if (!ex.is_global) {
    const bodyPart = typeof b?.bodyPart === "string" && b.bodyPart ? b.bodyPart : null;
    const equipment = typeof b?.equipment === "string" && b.equipment ? b.equipment : null;
    const imageData = typeof b?.imageData === "string" && b.imageData.startsWith("data:image/") ? b.imageData : undefined;
    if (b && ("bodyPart" in b || "equipment" in b)) {
      await DB.run(`UPDATE free_exercises SET body_part = ?, equipment = ? WHERE free_exercises_id = ?`, [bodyPart, equipment, exerciseId]);
    }
    if (imageData !== undefined) {
      if (imageData.length > 150_000) return NextResponse.json({ error: "La imagen es demasiado grande" }, { status: 413 });
      await DB.run(`UPDATE free_exercises SET image_data = ? WHERE free_exercises_id = ?`, [imageData, exerciseId]);
    }
  }
  return NextResponse.json({ ok: true });
}

// Borra un ejercicio propio del usuario y sus series. Los ejercicios globales no se pueden borrar.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const exerciseId = parseInt((await params).id);
  if (!exerciseId) return NextResponse.json({ error: "Ejercicio inválido" }, { status: 400 });

  const ex = await loadExercise(exerciseId);
  if (!ex) return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
  if (ex.is_global || ex.users_id !== uid) {
    return NextResponse.json({ error: "Solo puedes borrar tus propios ejercicios" }, { status: 403 });
  }

  // Primero las series (la FK no tiene ON DELETE CASCADE hacia el ejercicio)
  await DB.run(`DELETE FROM free_sets WHERE users_id = ? AND free_exercises_id = ?`, [uid, exerciseId]);
  await DB.run(`DELETE FROM free_exercises WHERE free_exercises_id = ? AND users_id = ?`, [exerciseId, uid]);
  return NextResponse.json({ ok: true });
}
