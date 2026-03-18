import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { name, email } = await req.json();

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 });
  }

  const conflict = await DB.get(
    'SELECT id FROM users WHERE email = ? AND id != ?',
    [email.trim().toLowerCase(), id]
  );
  if (conflict) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 });
  }

  await DB.run(
    'UPDATE users SET name = ?, email = ? WHERE id = ?',
    [name.trim(), email.trim().toLowerCase(), id]
  );
  const user = await DB.get('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // Prevent self-deletion
  const adminId = (auth as { id: number }).id;
  if (String(adminId) === String(id)) {
    return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 });
  }

  await DB.run('DELETE FROM users WHERE id = ?', [id]);
  return NextResponse.json({ ok: true });
}
