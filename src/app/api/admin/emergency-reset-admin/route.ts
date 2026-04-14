import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { DB } from '@/lib/db';

// TEMPORARY emergency endpoint — DELETE after use
// Usage: POST /api/admin/emergency-reset-admin
// Body: { "secret": "<EMERGENCY_SECRET env var>", "email": "alberto", "password": "nueva_clave" }

export async function POST(req: NextRequest) {
  const secret = process.env.EMERGENCY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Endpoint no disponible' }, { status: 404 });
  }

  const { secret: provided, email, password } = await req.json().catch(() => ({}));

  if (provided !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!email || !password) {
    return NextResponse.json({ error: 'email y password requeridos' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  // Update existing user or create new admin
  const existing = await DB.get<{ users_id: number }>(
    'SELECT users_id FROM users WHERE email = ?', [email]
  );

  if (existing) {
    await DB.run(
      "UPDATE users SET password_hash = ?, role = 'admin', status = 'active' WHERE users_id = ?",
      [hash, existing.users_id]
    );
    return NextResponse.json({ ok: true, action: 'updated', users_id: existing.users_id });
  } else {
    const result = await DB.run(
      "INSERT INTO users (name, email, role, status, password_hash) VALUES (?, ?, 'admin', 'active', ?)",
      [email, email, hash]
    );
    return NextResponse.json({ ok: true, action: 'created', users_id: result.id });
  }
}
