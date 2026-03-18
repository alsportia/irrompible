import { NextRequest, NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const user = await DB.get<{ id: number }>('SELECT id FROM users WHERE id = ?', [userId]);

  if (user) {
    return NextResponse.json({ valid: true }, { status: 200 });
  }

  return NextResponse.json({ valid: false }, { status: 401 });
}
