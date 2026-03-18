import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const users = await DB.query("SELECT id, name, email, role FROM users ORDER BY name ASC");
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { name, email } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  try {
    const res = await DB.run(
      "INSERT INTO users (name, email, role) VALUES (?, ?, 'user')",
      [name.trim(), email?.trim() ?? null]
    );
    return NextResponse.json({ id: res.id, name: name.trim(), email: email?.trim() ?? null, role: 'user' });
  } catch {
    return NextResponse.json({ error: 'El usuario ya existe' }, { status: 409 });
  }
}
