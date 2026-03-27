import { NextRequest, NextResponse } from 'next/server';
import { DB } from './db';

interface UserRow {
  id: number;
  role: string;
}

export async function requireAdmin(
  req: NextRequest
): Promise<{ id: number; role: string } | NextResponse> {
  const userId = req.headers.get('x-user-id');

  if (!userId || userId.trim() === '') {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const user = await DB.get<UserRow>('SELECT users_id as id, role FROM users WHERE users_id = ?', [userId]);

  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  return { id: user.id, role: user.role };
}
