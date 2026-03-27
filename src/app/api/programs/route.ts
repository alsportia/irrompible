import { NextRequest, NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const programs = await DB.query<{ id: number; name: string; description: string | null; image_url: string | null }>(
    `SELECT p.programs_id as id, p.name, p.description, p.image_url FROM programs p INNER JOIN user_programs up ON p.programs_id = up.programs_id WHERE up.users_id = ?`,
    [userId]
  );

  return NextResponse.json(programs, { status: 200 });
}
