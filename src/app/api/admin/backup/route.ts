import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const dbPath = path.join(process.cwd(), 'data', 'unbreakable.db');

  if (!fs.existsSync(dbPath)) {
    return NextResponse.json({ error: 'Database not found' }, { status: 404 });
  }

  const file = fs.readFileSync(dbPath);
  const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="unbreakable-backup-${date}.db"`,
    },
  });
}
