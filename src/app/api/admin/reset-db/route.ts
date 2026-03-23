import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const dbPath = path.join(process.cwd(), 'data', 'unbreakable.db');
  const seedPath = path.join(process.cwd(), 'seed.db');

  if (!fs.existsSync(seedPath)) {
    return NextResponse.json({ error: 'seed.db no encontrado' }, { status: 404 });
  }

  // 1. Return backup as base64 so the client can download it
  let backupBase64: string | null = null;
  let backupFilename = '';
  if (fs.existsSync(dbPath)) {
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    backupFilename = `unbreakable-backup-${date}.db`;
    backupBase64 = fs.readFileSync(dbPath).toString('base64');
  }

  // 2. Close DB connection, replace with seed, reopen
  DB.close();
  fs.copyFileSync(seedPath, dbPath);

  // Force reinit on next request
  DB.getInstance();

  return NextResponse.json({ ok: true, backupBase64, backupFilename });
}
