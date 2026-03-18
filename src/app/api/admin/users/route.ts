import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const users = await DB.query('SELECT id, name, email, role FROM users ORDER BY name ASC');
  return NextResponse.json(users);
}
