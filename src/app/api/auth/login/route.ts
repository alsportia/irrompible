import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { DB } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || typeof email !== 'string' || email.trim() === '') {
    return NextResponse.json({ error: 'Introduce tu email' }, { status: 400 });
  }
  if (typeof password !== 'string') {
    return NextResponse.json({ error: 'Contraseña inválida' }, { status: 400 });
  }

  const user = await DB.get<{ id: number; name: string; email: string; role: string; status: string; password_hash: string | null }>(
    'SELECT users_id as id, name, email, role, status, password_hash FROM users WHERE email = ?',
    [email.trim().toLowerCase()]
  );

  if (!user) {
    return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
  }

  if (user.status === 'pending') {
    return NextResponse.json({ error: 'Tu cuenta está pendiente de aprobación por el administrador' }, { status: 403 });
  }

  if (!user.password_hash) {
    return NextResponse.json({ error: 'Esta cuenta no tiene contraseña configurada. Contacta con el administrador.' }, { status: 403 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
  }

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}
