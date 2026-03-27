import { NextRequest, NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { name, email, programIds } = await req.json().catch(() => ({}));

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 });
  }

  const existing = await DB.get('SELECT users_id, status FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (existing) {
    const msg = (existing as { status: string }).status === 'pending'
      ? 'Ya existe una solicitud pendiente con ese email'
      : 'Ya existe una cuenta con ese email';
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  await DB.run(
    "INSERT INTO users (name, email, role, status) VALUES (?, ?, 'user', 'pending')",
    [name.trim(), email.trim().toLowerCase()]
  );

  const user = await DB.get<{ users_id: number }>(
    'SELECT users_id FROM users WHERE email = ?',
    [email.trim().toLowerCase()]
  );

  // Store requested programs (will be confirmed by admin on approval)
  if (user && Array.isArray(programIds) && programIds.length > 0) {
    for (const pid of programIds) {
      await DB.run(
        'INSERT OR IGNORE INTO user_programs (users_id, programs_id) VALUES (?, ?)',
        [user.users_id, pid]
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
