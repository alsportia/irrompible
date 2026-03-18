import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { role } = await req.json();
  if (role !== 'admin' && role !== 'user') {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  const { id } = await params;
  const result = await DB.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  if (result.changes === 0) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const user = await DB.get('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
  return NextResponse.json(user);
}
