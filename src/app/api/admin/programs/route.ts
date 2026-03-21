import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const programs = await DB.query(`
    SELECT p.id, p.name, p.description, p.image_url,
           COUNT(s.id) as session_count
    FROM programs p
    LEFT JOIN sessions s ON s.program_id = p.id
    GROUP BY p.id ORDER BY p.name ASC
  `);
  return NextResponse.json(programs);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { name, description, image_url, sessions } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre obligatorio' }, { status: 400 });

    const existing = await DB.get('SELECT id FROM programs WHERE name = ?', [name.trim()]);
    if (existing) return NextResponse.json({ error: 'Ya existe un programa con ese nombre' }, { status: 409 });

    const slug = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const progResult = await DB.run('INSERT INTO programs (name, description, image_url) VALUES (?,?,?)', [name.trim(), description || null, image_url || null]);
    const programId = progResult.id;

    if (Array.isArray(sessions)) {
      for (const ses of sessions) {
        const num = ses.numero_sesion || 1;
        let sessionCode = `${slug}_s${num}`;
        const existingCode = await DB.get('SELECT id FROM sessions WHERE session_code = ?', [sessionCode]);
        if (existingCode) sessionCode = `${slug}_s${num}_${programId}`;
        const sesResult = await DB.run('INSERT INTO sessions (session_code, name, program_id) VALUES (?,?,?)', [sessionCode, ses.nombre_sesion || null, programId]);
        const sessionId = sesResult.id;
        if (Array.isArray(ses.exercises)) {
          for (const ex of ses.exercises) {
            await DB.run(
              'INSERT INTO session_exercises (session_id, block, block_type, set_number, ex_id, ex_order, reps, tiempo_ej) VALUES (?,?,?,?,?,?,?,?)',
              [sessionId, ex.bloque || null, ex.tipo_bloque || 'normal', ex.set_number || 1, ex.ex_id, ex.ex_order || 1, ex.reps || null, ex.tiempo_ej || null]
            );
          }
        }
      }
    }

    return NextResponse.json({ programId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
