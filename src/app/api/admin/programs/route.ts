import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';

const VALID_BLOCK_TYPES = ['normal', 'circuit', 'superset', 'super_series', 'tabata', 'interval_repetitions_with_pause', 'interval_repetitions', 'to_the_one', 'spartan_race', 'paleo_run'];

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

    // Validate blocks
    if (Array.isArray(sessions)) {
      for (const ses of sessions) {
        for (const block of (ses.blocks ?? [])) {
          if (!Number.isInteger(block.num_sets) || block.num_sets < 1) {
            return NextResponse.json({ error: 'num_sets debe ser un entero >= 1' }, { status: 400 });
          }
          if (block.block_type && !VALID_BLOCK_TYPES.includes(block.block_type)) {
            return NextResponse.json({ error: `block_type inválido. Valores aceptados: ${VALID_BLOCK_TYPES.join(', ')}` }, { status: 400 });
          }
        }
      }
    }

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

        if (Array.isArray(ses.blocks)) {
          for (const block of ses.blocks) {
            const setResult = await DB.run(
              'INSERT INTO sets (session_id, description, block_label, block_type, num_sets, block_order) VALUES (?,?,?,?,?,?)',
              [sessionId, block.description || null, block.block_label || null, block.block_type || 'normal', block.num_sets || 1, block.block_order || 1]
            );
            const setId = setResult.id;
            if (Array.isArray(block.exercises)) {
              for (const ex of block.exercises) {
                await DB.run(
                  'INSERT INTO set_exercises (set_id, ex_id, ex_order, reps, tiempo_ej) VALUES (?,?,?,?,?)',
                  [setId, ex.ex_id, ex.ex_order || 1, ex.reps || null, ex.tiempo_ej || null]
                );
              }
            }
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
