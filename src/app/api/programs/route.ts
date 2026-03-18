import { NextRequest, NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const programs = await DB.query<{ id: number; name: string }>(
    `SELECT p.id, p.name FROM programs p INNER JOIN user_programs up ON p.id = up.program_id WHERE up.user_id = ?`,
    [userId]
  );

  return NextResponse.json(programs, { status: 200 });
}
