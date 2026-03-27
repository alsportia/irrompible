import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const programs = await DB.query(
    `SELECT p.programs_id as id, p.name FROM programs p
     INNER JOIN user_programs up ON up.programs_id = p.programs_id
     WHERE up.users_id = ?
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

  await DB.run('DELETE FROM user_programs WHERE users_id = ?', [id]);

  for (const programId of programIds) {
    await DB.run('INSERT INTO user_programs (users_id, programs_id) VALUES (?, ?)', [id, programId]);
  }

  const programs = await DB.query(
    `SELECT p.programs_id as id, p.name FROM programs p
     INNER JOIN user_programs up ON up.programs_id = p.programs_id
     WHERE up.users_id = ?
     ORDER BY p.name ASC`,
    [id]
  );
  return NextResponse.json(programs);
}
