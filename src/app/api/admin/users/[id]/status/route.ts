import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { status } = await req.json();

  if (status !== 'active' && status !== 'rejected') {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  if (status === 'rejected') {
    // Remove program assignments and delete user
    await DB.run('DELETE FROM user_programs WHERE user_id = ?', [id]);
    await DB.run('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ ok: true, deleted: true });
  }

  await DB.run("UPDATE users SET status = 'active' WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
