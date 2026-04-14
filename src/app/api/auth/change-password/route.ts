import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { DB } from '@/lib/db';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));

  if (!currentPassword) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }
  if (newPassword === undefined || newPassword === null) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }

  const user = await DB.get<{ password_hash: string | null }>(
    'SELECT password_hash FROM users WHERE users_id = ?', [userId]
  );
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  if (!user.password_hash) {
    return NextResponse.json({ error: 'Esta cuenta no tiene contraseña configurada' }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 401 });

  const hash = await bcrypt.hash(newPassword, 10);
  await DB.run('UPDATE users SET password_hash = ? WHERE users_id = ?', [hash, userId]);

  return NextResponse.json({ ok: true });
}
