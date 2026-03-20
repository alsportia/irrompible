import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const dbPath = path.join(process.cwd(), 'data', 'unbreakable.db');

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.db')) {
      return NextResponse.json({ error: 'File must be a .db file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate it's a SQLite file (magic bytes: 53 51 4C 69 74 65)
    if (buffer.slice(0, 6).toString() !== 'SQLite') {
      return NextResponse.json({ error: 'Invalid SQLite file' }, { status: 400 });
    }

    // Close current DB connection before replacing the file
    DB.close();

    // Backup current DB before overwriting
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.copyFileSync(dbPath, `${dbPath}.pre-restore-${timestamp}`);

    // Write the restored DB
    fs.writeFileSync(dbPath, buffer);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Restore error:', err);
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 });
  }
}
