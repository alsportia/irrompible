import { NextRequest, NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const user = await DB.get<{ id: number; name: string; email: string; role: string; status: string }>(
    'SELECT users_id as id, name, email, role, status FROM users WHERE users_id = ?',
    [userId]
  );

  if (!user) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  if (user.status !== 'active') {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({ valid: true, user }, { status: 200 });
}
