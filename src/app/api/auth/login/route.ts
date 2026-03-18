import { NextRequest, NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email } = body;

  if (!email || typeof email !== 'string' || email.trim() === '') {
    return NextResponse.json({ error: 'Introduce tu email' }, { status: 400 });
  }

  const user = await DB.get<{ id: number; name: string; email: string; role: string }>(
    'SELECT id, name, email, role FROM users WHERE email = ?',
    [email.trim()]
  );

  if (!user) {
    return NextResponse.json({ error: 'Email no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}
