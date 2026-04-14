import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { name, email, password } = await req.json();

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 });
  }

  const conflict = await DB.get(
    'SELECT users_id FROM users WHERE email = ? AND users_id != ?',
    [email.trim().toLowerCase(), id]
  );
  if (conflict) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 });
  }

  if (password !== undefined && password !== '') {
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }
    const hash = await bcrypt.hash(password, 10);
    await DB.run(
      'UPDATE users SET name = ?, email = ?, password_hash = ? WHERE users_id = ?',
      [name.trim(), email.trim().toLowerCase(), hash, id]
    );
  } else {
    await DB.run(
      'UPDATE users SET name = ?, email = ? WHERE users_id = ?',
      [name.trim(), email.trim().toLowerCase(), id]
    );
  }

  const user = await DB.get('SELECT users_id as id, name, email, role FROM users WHERE users_id = ?', [id]);
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const adminId = (auth as { id: number }).id;
  if (String(adminId) === String(id)) {
    return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 });
  }

  await DB.run('DELETE FROM users WHERE users_id = ?', [id]);
  return NextResponse.json({ ok: true });
}
