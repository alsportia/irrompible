import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { langFromRequest, textsFor } from "@/lib/i18n/texts";

// Detalle de un ejercicio: nombre, instrucciones y medios, en el idioma pedido.
// Solo se pide por id; el texto llega ya traducido desde i18n_texts.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = parseInt(req.headers.get("x-user-id") ?? "");
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const exerciseId = parseInt((await params).id);
  if (!exerciseId) return NextResponse.json({ error: "Ejercicio inválido" }, { status: 400 });

  const ex = await DB.get<{ id: number; name: string; is_global: number; users_id: number | null; gif_url: string | null; image_url: string | null; image_data: string | null }>(
    `SELECT free_exercises_id AS id, name, is_global, users_id, gif_url, image_url, image_data
     FROM free_exercises WHERE free_exercises_id = ?`,
    [exerciseId]
  );
  if (!ex || (!ex.is_global && ex.users_id !== uid)) {
    return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
  }

  const lang = langFromRequest(req);
  const names = await textsFor("exercise", [ex.id], "name", lang);
  const instructions = await textsFor("exercise", [ex.id], "instructions", lang);
  return NextResponse.json({
    id: ex.id,
    name: names.get(ex.id) ?? ex.name,
    instructions: instructions.get(ex.id) ?? null,
    // GIF animado para el detalle; la imagen fija queda para la lista
    gif_url: ex.is_global ? ex.gif_url : null,
    image_url: ex.image_url ?? ex.image_data ?? null,
    // Atribución obligatoria de los medios del dataset (Gym visual)
    attribution: ex.is_global ? "© Gym visual — https://gymvisual.com/" : null,
  });
}
