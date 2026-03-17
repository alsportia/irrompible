import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const users = await DB.query("SELECT id, name FROM users ORDER BY name ASC");
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  try {
    const res = await DB.run("INSERT INTO users (name) VALUES (?)", [name.trim()]);
    return NextResponse.json({ id: res.id, name: name.trim() });
  } catch {
    return NextResponse.json({ error: 'El usuario ya existe' }, { status: 409 });
  }
}
