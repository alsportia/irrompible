import { NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function GET() {
  const programs = await DB.query<{ id: number; name: string }>(
    'SELECT programs_id as id, name FROM programs ORDER BY name ASC'
  );
  return NextResponse.json(programs);
}
