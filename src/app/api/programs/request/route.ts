import { NextRequest, NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { programId } = await req.json().catch(() => ({}));
  if (!programId) return NextResponse.json({ error: 'programId requerido' }, { status: 400 });

  // Verify user exists and is active
  const user = await DB.get<{ users_id: number; status: string }>(
    'SELECT users_id, status FROM users WHERE users_id = ?', [userId]
  );
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  if (user.status !== 'active') return NextResponse.json({ error: 'Cuenta no activa' }, { status: 403 });

  // Verify program exists
  const program = await DB.get<{ programs_id: number; name: string }>(
    'SELECT programs_id, name FROM programs WHERE programs_id = ?', [programId]
  );
  if (!program) return NextResponse.json({ error: 'Programa no encontrado' }, { status: 404 });

  // Check if already assigned
  const existing = await DB.get(
    'SELECT 1 FROM user_programs WHERE users_id = ? AND programs_id = ?',
    [userId, programId]
  );
  if (existing) return NextResponse.json({ error: 'Ya tienes acceso a este programa' }, { status: 409 });

  // Insert request — admin will see it in user management
  await DB.run(
    'INSERT OR IGNORE INTO user_programs (users_id, programs_id) VALUES (?, ?)',
    [userId, programId]
  );

  return NextResponse.json({ ok: true, programName: program.name });
}
