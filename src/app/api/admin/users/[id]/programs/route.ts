import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const programs = await DB.query(
    `SELECT p.id, p.name FROM programs p
     INNER JOIN user_programs up ON up.program_id = p.id
     WHERE up.user_id = ?
     ORDER BY p.name ASC`,
    [id]
  );
  return NextResponse.json(programs);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { programIds } = await req.json() as { programIds: number[] };

  await DB.run('DELETE FROM user_programs WHERE user_id = ?', [id]);

  for (const programId of programIds) {
    await DB.run('INSERT INTO user_programs (user_id, program_id) VALUES (?, ?)', [id, programId]);
  }

  const programs = await DB.query(
    `SELECT p.id, p.name FROM programs p
     INNER JOIN user_programs up ON up.program_id = p.id
     WHERE up.user_id = ?
     ORDER BY p.name ASC`,
    [id]
  );
  return NextResponse.json(programs);
}
