import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const users = await DB.query('SELECT users_id as id, name, email, role, status FROM users ORDER BY name ASC');
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { name, email, password } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  const existing = await DB.get('SELECT users_id FROM users WHERE email = ?', [email.trim()]);
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  await DB.run(
    "INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, 'user', ?)",
    [name.trim(), email.trim().toLowerCase(), hash]
  );
  const user = await DB.get('SELECT users_id as id, name, email, role FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  return NextResponse.json(user, { status: 201 });
}
